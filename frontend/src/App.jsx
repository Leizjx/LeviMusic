import { useState, useRef, useCallback, useEffect } from 'react';
import PlaylistSidebar from './components/PlaylistSidebar';
import AddSongForm from './components/AddSongForm';
import Player from './components/Player';
import SongQueue from './components/SongQueue';
import Toast from './components/Toast';

const API_BASE = '/api';

export default function App() {
  // ── Playlist state ────────────────────────────────────────────────────────
  const [playlists, setPlaylists] = useState([]);        // all playlists
  const [activePlaylistId, setActivePlaylistId] = useState(null); // selected playlist

  // ── Player state ──────────────────────────────────────────────────────────
  const [currentIndex, setCurrentIndex] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [toast, setToast] = useState(null);
  const audioRef = useRef(null);

  // ── Derived ───────────────────────────────────────────────────────────────
  const activePlaylist = playlists.find((p) => p.id === activePlaylistId) || null;
  const activeSongs = activePlaylist?.songs || [];
  const currentSong = currentIndex !== null ? activeSongs[currentIndex] : null;

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Load playlists on mount ───────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/playlists`)
      .then((r) => {
        if (!r.ok) throw new Error(`Server returned status ${r.status}`);
        return r.json();
      })
      .then(({ playlists: list }) => {
        setPlaylists(list || []);
        if (list && list.length > 0) setActivePlaylistId(list[0].id);
      })
      .catch((err) => {
        console.error('[load playlists]', err);
        showToast('Failed to load playlists from server.', 'error');
      });
  }, [showToast]);

  // ── Playlist CRUD callbacks ───────────────────────────────────────────────
  const handlePlaylistCreate = useCallback((newPlaylist) => {
    setPlaylists((prev) => [...prev, newPlaylist]);
    setActivePlaylistId(newPlaylist.id);
    setCurrentIndex(null);
    setIsPlaying(false);
    showToast(`Playlist "${newPlaylist.name}" created!`, 'success');
  }, [showToast]);

  const handlePlaylistRename = useCallback((updated) => {
    setPlaylists((prev) => prev.map((p) => p.id === updated.id ? updated : p));
    showToast('Playlist renamed.', 'info');
  }, [showToast]);

  const handlePlaylistDelete = useCallback((deletedId) => {
    setPlaylists((prev) => {
      const next = prev.filter((p) => p.id !== deletedId);
      if (activePlaylistId === deletedId) {
        const newActive = next[0] ?? null;
        setActivePlaylistId(newActive?.id ?? null);
        setCurrentIndex(null);
        setIsPlaying(false);
      }
      return next;
    });
    showToast('Playlist deleted.', 'info');
  }, [activePlaylistId, showToast]);

  const handlePlaylistSelect = useCallback((pl) => {
    if (pl.id === activePlaylistId) return;
    setActivePlaylistId(pl.id);
    setCurrentIndex(null);
    setIsPlaying(false);
  }, [activePlaylistId]);

  // ── Song CRUD callbacks ───────────────────────────────────────────────────
  const handleSongAdded = useCallback((song, updatedPlaylist) => {
    setPlaylists((prev) => prev.map((p) => p.id === updatedPlaylist.id ? updatedPlaylist : p));
    showToast(`"${song.title.slice(0, 40)}…" added!`, 'success');
    // Auto-play first song
    if (activePlaylistId === updatedPlaylist.id && currentIndex === null) {
      setCurrentIndex(updatedPlaylist.songs.length - 1);
      setIsPlaying(true);
    }
  }, [activePlaylistId, currentIndex, showToast]);

  const handleDeleteSong = useCallback(async (videoId) => {
    if (!activePlaylist) return;
    const idx = activeSongs.findIndex((s) => s.videoId === videoId);
    try {
      const res = await fetch(`${API_BASE}/playlists/${activePlaylistId}/songs/${videoId}`, {
        method: 'DELETE',
      });
      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server error (${res.status}): Unable to parse response.`);
      }
      if (!res.ok) throw new Error(data?.error || `Server error (${res.status})`);
      setPlaylists((prev) => prev.map((p) => p.id === data.playlist.id ? data.playlist : p));

      // Adjust player index
      if (currentIndex !== null) {
        if (idx < currentIndex) {
          setCurrentIndex((ci) => ci - 1);
        } else if (idx === currentIndex) {
          const newSongs = data.playlist.songs;
          if (newSongs.length === 0) { setCurrentIndex(null); setIsPlaying(false); }
          else { setCurrentIndex(Math.min(idx, newSongs.length - 1)); setIsPlaying(true); }
        }
      }
      showToast('Song removed.', 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }, [activePlaylist, activeSongs, activePlaylistId, currentIndex, showToast]);

  const handleCopyToPlaylist = useCallback(async (song, targetPlaylistId) => {
    try {
      const res = await fetch(
        `${API_BASE}/playlists/${activePlaylistId}/songs/${song.videoId}/copy`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetPlaylistId }),
        }
      );
      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server error (${res.status}): Unable to parse response.`);
      }
      if (!res.ok) throw new Error(data?.error || `Server error (${res.status})`);
      setPlaylists((prev) => prev.map((p) => p.id === data.playlist.id ? data.playlist : p));
      const target = playlists.find((p) => p.id === targetPlaylistId);
      showToast(`Added to "${target?.name}"!`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }, [activePlaylistId, playlists, showToast]);

  // ── Playback controls ─────────────────────────────────────────────────────
  const handleSelectSong = useCallback((idx) => {
    setCurrentIndex(idx);
    setIsPlaying(true);
  }, []);

  const handleNext = useCallback(() => {
    if (!activeSongs.length) return;
    setCurrentIndex((prev) => prev === null ? 0 : (prev + 1) % activeSongs.length);
    setIsPlaying(true);
  }, [activeSongs.length]);

  const handlePrev = useCallback(() => {
    if (!activeSongs.length) return;
    setCurrentIndex((prev) => prev === null ? 0 : (prev - 1 + activeSongs.length) % activeSongs.length);
    setIsPlaying(true);
  }, [activeSongs.length]);

  const handleTogglePlay = useCallback(() => setIsPlaying((p) => !p), []);

  return (
    <div className="min-h-screen bg-[#0d0d1a] flex flex-col">
      {/* ── Background blobs ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-accent/10 blur-[120px]" />
        <div className="absolute top-1/3 -left-40 w-80 h-80 rounded-full bg-purple-600/8 blur-[100px]" />
        <div className="absolute -bottom-20 right-1/3 w-64 h-64 rounded-full bg-accent/6 blur-[80px]" />
      </div>

      {/* ── Header ── */}
      <header className="relative z-10 px-6 pt-6 pb-3">
        <div className="max-w-[1400px] mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-accent-light flex items-center justify-center shadow-lg shadow-accent/30">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4.5 h-4.5 text-white">
              <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">LeviMusic</h1>
            <p className="text-[10px] text-muted font-medium">Personal Streaming</p>
          </div>
          <div className="ml-auto flex items-center gap-3 text-xs text-muted">
            {activePlaylist && (
              <span className="flex items-center gap-1.5 bg-white/5 border border-white/8 rounded-full px-3 py-1">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-accent">
                  <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18A2.49 2.49 0 0 0 16 14c-1.38 0-2.5 1.12-2.5 2.5S14.62 19 16 19s2.5-1.12 2.5-2.5V8h3V6h-4.5z" />
                </svg>
                {activePlaylist.name}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {playlists.length} {playlists.length === 1 ? 'playlist' : 'playlists'}
            </span>
          </div>
        </div>
      </header>

      {/* ── 3-column main layout ── */}
      <main className="relative z-10 flex-1 px-4 pb-6 max-w-[1400px] mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr_360px] gap-4 h-full">

          {/* ── Col 1: Playlist sidebar ── */}
          <div className="md:h-[calc(100vh-7rem)] md:sticky md:top-4">
            <PlaylistSidebar
              playlists={playlists}
              activeId={activePlaylistId}
              onSelect={handlePlaylistSelect}
              onCreate={handlePlaylistCreate}
              onRename={handlePlaylistRename}
              onDelete={handlePlaylistDelete}
            />
          </div>

          {/* ── Col 2: Add form + Player ── */}
          <div className="flex flex-col gap-4">
            <AddSongForm
              playlists={playlists}
              activePlaylistId={activePlaylistId}
              onSongAdded={handleSongAdded}
              onNeedPlaylist={() => showToast('Create a playlist first!', 'info')}
            />
            <Player
              audioRef={audioRef}
              song={currentSong}
              isPlaying={isPlaying}
              onTogglePlay={handleTogglePlay}
              onNext={handleNext}
              onPrev={handlePrev}
              onEnded={handleNext}
              hasPrev={activeSongs.length > 1}
              hasNext={activeSongs.length > 1}
            />
          </div>

          {/* ── Col 3: Song queue ── */}
          <div className="md:h-[calc(100vh-7rem)] md:sticky md:top-4">
            <SongQueue
              playlist={activePlaylist}
              playlists={playlists}
              currentIndex={currentIndex}
              isPlaying={isPlaying}
              onSelect={handleSelectSong}
              onDelete={handleDeleteSong}
              onCopyToPlaylist={handleCopyToPlaylist}
            />
          </div>
        </div>
      </main>

      {/* ── Toast ── */}
      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} />}
    </div>
  );
}
