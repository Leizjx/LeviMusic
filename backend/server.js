require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { execFile, spawn } = require('child_process');
const { promisify } = require('util');
const { createClient } = require('@supabase/supabase-js');

const execFileAsync = promisify(execFile);
const app = express();
const PORT = process.env.PORT || 3001;

// ─── Supabase client ──────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// ─── yt-dlp helpers ───────────────────────────────────────────────────────────
async function runYtDlp(args) {
  try {
    const { stdout } = await execFileAsync('yt-dlp', args, { maxBuffer: 10 * 1024 * 1024 });
    return stdout;
  } catch {
    const { stdout } = await execFileAsync('python', ['-m', 'yt_dlp', ...args], {
      maxBuffer: 10 * 1024 * 1024,
    });
    return stdout;
  }
}

function spawnYtDlp(args) {
  try {
    return spawn('yt-dlp', args, { windowsHide: true });
  } catch {
    return spawn('python', ['-m', 'yt_dlp', ...args], { windowsHide: true });
  }
}

// ─── Shared helpers ───────────────────────────────────────────────────────────
function extractVideoId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) return parsed.pathname.slice(1).split('?')[0];
    if (parsed.hostname.includes('youtube.com')) return parsed.searchParams.get('v');
    return null;
  } catch { return null; }
}

function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

// ─── DB helpers ───────────────────────────────────────────────────────────────
// Fetch a playlist with its songs ordered by added_at
async function getPlaylistWithSongs(playlistId) {
  const { data: playlist, error: pErr } = await supabase
    .from('playlists')
    .select('*')
    .eq('id', playlistId)
    .single();
  if (pErr) throw pErr;

  const { data: songs, error: sErr } = await supabase
    .from('songs')
    .select('*')
    .eq('playlist_id', playlistId)
    .order('added_at', { ascending: true });
  if (sErr) throw sErr;

  return { ...playlist, songs: songs || [] };
}

// ════════════════════════════════════════════════════════════════════════════
//  PLAYLIST ROUTES
// ════════════════════════════════════════════════════════════════════════════

// GET /api/playlists — all playlists with their songs
app.get('/api/playlists', async (req, res) => {
  try {
    const { data: playlists, error } = await supabase
      .from('playlists')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;

    // Fetch songs for each playlist
    const withSongs = await Promise.all(
      (playlists || []).map(async (pl) => {
        const { data: songs } = await supabase
          .from('songs')
          .select('*')
          .eq('playlist_id', pl.id)
          .order('added_at', { ascending: true });
        return { ...pl, songs: songs || [] };
      })
    );

    res.json({ playlists: withSongs });
  } catch (err) {
    console.error('[GET /playlists]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/playlists — create playlist
app.post('/api/playlists', async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Playlist name is required.' });

  try {
    const { data, error } = await supabase
      .from('playlists')
      .insert({ name: name.trim() })
      .select()
      .single();
    if (error) throw error;

    console.log(`[+playlist] "${data.name}" (${data.id})`);
    res.status(201).json({ playlist: { ...data, songs: [] } });
  } catch (err) {
    console.error('[POST /playlists]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/playlists/:id — rename
app.patch('/api/playlists/:id', async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required.' });

  try {
    const { data, error } = await supabase
      .from('playlists')
      .update({ name: name.trim() })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Playlist not found.' });

    const playlist = await getPlaylistWithSongs(data.id);
    res.json({ playlist });
  } catch (err) {
    console.error('[PATCH /playlists]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/playlists/:id — delete (songs cascade via FK)
app.delete('/api/playlists/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('playlists')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /playlists]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  SONG ROUTES
// ════════════════════════════════════════════════════════════════════════════

// POST /api/playlists/:id/songs — add YouTube song to playlist
app.post('/api/playlists/:id/songs', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'YouTube URL is required.' });

  const videoId = extractVideoId(url);
  if (!videoId) return res.status(400).json({ error: 'Invalid YouTube URL.' });

  // Check playlist exists
  const { data: pl, error: plErr } = await supabase
    .from('playlists')
    .select('id')
    .eq('id', req.params.id)
    .single();
  if (plErr || !pl) return res.status(404).json({ error: 'Playlist not found.' });

  // Check duplicate
  const { data: existing } = await supabase
    .from('songs')
    .select('id')
    .eq('playlist_id', req.params.id)
    .eq('video_id', videoId)
    .maybeSingle();
  if (existing) return res.status(409).json({ error: 'Song already in this playlist.' });

  try {
    const raw = await runYtDlp([
      '--dump-json', '--no-playlist', '--no-warnings', '--quiet',
      `https://www.youtube.com/watch?v=${videoId}`,
    ]);
    const info = JSON.parse(raw);

    const songRow = {
      playlist_id: req.params.id,
      video_id: videoId,
      title: info.title || 'Unknown Title',
      artist: info.uploader || info.channel || 'Unknown Artist',
      thumbnail: info.thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      duration: formatDuration(info.duration),
      duration_seconds: info.duration || 0,
    };

    const { data: saved, error: insertErr } = await supabase
      .from('songs')
      .insert(songRow)
      .select()
      .single();
    if (insertErr) throw insertErr;

    // Map DB snake_case → frontend camelCase
    const song = dbSongToClient(saved);
    const playlist = await getPlaylistWithSongs(req.params.id);
    playlist.songs = playlist.songs.map(dbSongToClient);

    console.log(`[+song] "${song.title}" → playlist ${req.params.id}`);
    res.status(201).json({ song, playlist });
  } catch (err) {
    console.error('[POST /songs]', err.message);
    res.status(500).json({ error: 'Failed to fetch video info. The video may be unavailable or private.' });
  }
});

// DELETE /api/playlists/:id/songs/:videoId
app.delete('/api/playlists/:id/songs/:videoId', async (req, res) => {
  try {
    const { error } = await supabase
      .from('songs')
      .delete()
      .eq('playlist_id', req.params.id)
      .eq('video_id', req.params.videoId);
    if (error) throw error;

    const playlist = await getPlaylistWithSongs(req.params.id);
    playlist.songs = playlist.songs.map(dbSongToClient);
    res.json({ success: true, playlist });
  } catch (err) {
    console.error('[DELETE /songs]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/playlists/:id/songs/:videoId/copy — copy song to another playlist
app.post('/api/playlists/:id/songs/:videoId/copy', async (req, res) => {
  const { targetPlaylistId } = req.body;

  try {
    // Get source song
    const { data: song, error: sErr } = await supabase
      .from('songs')
      .select('*')
      .eq('playlist_id', req.params.id)
      .eq('video_id', req.params.videoId)
      .single();
    if (sErr || !song) return res.status(404).json({ error: 'Song not found.' });

    // Check duplicate in target
    const { data: dup } = await supabase
      .from('songs')
      .select('id')
      .eq('playlist_id', targetPlaylistId)
      .eq('video_id', req.params.videoId)
      .maybeSingle();
    if (dup) return res.status(409).json({ error: 'Song already in target playlist.' });

    const { error: insertErr } = await supabase
      .from('songs')
      .insert({
        playlist_id: targetPlaylistId,
        video_id: song.video_id,
        title: song.title,
        artist: song.artist,
        thumbnail: song.thumbnail,
        duration: song.duration,
        duration_seconds: song.duration_seconds,
      });
    if (insertErr) throw insertErr;

    const playlist = await getPlaylistWithSongs(targetPlaylistId);
    playlist.songs = playlist.songs.map(dbSongToClient);
    res.json({ success: true, playlist });
  } catch (err) {
    console.error('[COPY /song]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Map DB row (snake_case) to frontend format (camelCase) ──────────────────
function dbSongToClient(row) {
  return {
    videoId: row.video_id,
    title: row.title,
    artist: row.artist,
    thumbnail: row.thumbnail,
    duration: row.duration,
    durationSeconds: row.duration_seconds,
    addedAt: new Date(row.added_at).getTime(),
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  STREAM
// ════════════════════════════════════════════════════════════════════════════

app.get('/api/stream/:videoId', (req, res) => {
  const { videoId } = req.params;
  if (!/^[\w-]{11}$/.test(videoId)) return res.status(400).json({ error: 'Invalid video ID.' });

  console.log(`[stream] ${videoId}`);

  const ytArgs = [
    '--no-warnings', '--quiet',
    '-f', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio/best',
    '-o', '-',
    '--no-playlist',
    `https://www.youtube.com/watch?v=${videoId}`,
  ];

  res.setHeader('Content-Type', 'audio/webm');
  res.setHeader('Accept-Ranges', 'none');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Transfer-Encoding', 'chunked');

  const ytProc = spawnYtDlp(ytArgs);
  ytProc.stdout.pipe(res);
  ytProc.stderr.on('data', (d) => {
    const msg = d.toString().trim();
    if (msg) console.error(`[yt-dlp] ${msg}`);
  });
  ytProc.on('close', () => { if (!res.writableEnded) res.end(); });
  req.on('close', () => ytProc.kill('SIGTERM'));
  res.on('error', () => ytProc.kill('SIGTERM'));
});

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  const { count } = await supabase.from('playlists').select('*', { count: 'exact', head: true });
  res.json({ status: 'ok', db: 'supabase', playlists: count ?? 0 });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🎵 LeviMusic  →  http://localhost:${PORT}`);
  console.log(`   DB      : Supabase (${process.env.SUPABASE_URL})`);
  console.log(`   Stream  : GET  /api/stream/:videoId`);
  console.log(`   Add     : POST /api/playlists/:id/songs\n`);
});
