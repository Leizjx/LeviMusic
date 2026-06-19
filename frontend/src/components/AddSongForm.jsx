import { useState, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export default function AddSongForm({ playlists, activePlaylistId, onSongAdded, onNeedPlaylist }) {
  const [url, setUrl] = useState('');
  const [targetId, setTargetId] = useState(activePlaylistId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  // Keep target in sync when active playlist changes externally
  if (activePlaylistId && targetId !== activePlaylistId && !playlists.find(p => p.id === targetId)) {
    setTargetId(activePlaylistId);
  }

  const isValidYouTubeUrl = (val) =>
    /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]+/.test(val.trim());

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const trimmed = url.trim();
    if (!trimmed) return;

    if (!isValidYouTubeUrl(trimmed)) {
      setError('Please enter a valid YouTube URL.');
      inputRef.current?.focus();
      return;
    }

    if (!targetId) {
      setError('Please select or create a playlist first.');
      onNeedPlaylist?.();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/playlists/${targetId}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });
      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server error (${res.status}): Unable to parse response.`);
      }
      if (!res.ok) throw new Error(data?.error || `Server error (${res.status})`);
      onSongAdded(data.song, data.playlist);
      setUrl('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text);
    } catch { /* clipboard unavailable */ }
  };

  const noPlaylists = playlists.length === 0;

  return (
    <div className="glass-card p-5 animate-fade-in">
      <h2 className="text-xs font-semibold text-muted uppercase tracking-widest mb-4">Add a Track</h2>

      {noPlaylists && (
        <div className="mb-3 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          Create a playlist first before adding songs.
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5" id="add-song-form">
        {/* Playlist selector */}
        {playlists.length > 0 && (
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-muted/60 flex-shrink-0">
              <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18A2.49 2.49 0 0 0 16 14c-1.38 0-2.5 1.12-2.5 2.5S14.62 19 16 19s2.5-1.12 2.5-2.5V8h3V6h-4.5z" />
            </svg>
            <select
              id="playlist-selector"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-accent/50 transition-all duration-150 cursor-pointer"
            >
              {playlists.map((pl) => (
                <option key={pl.id} value={pl.id} className="bg-[#1a1a2e] text-white">
                  {pl.name} ({pl.songs.length})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* URL input row */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
              </svg>
            </div>
            <input
              ref={inputRef}
              id="youtube-url-input"
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(''); }}
              placeholder="https://youtube.com/watch?v=..."
              disabled={loading || noPlaylists}
              autoComplete="off"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-muted focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 transition-all duration-200 disabled:opacity-40"
            />
          </div>

          {/* Paste */}
          <button
            type="button"
            onClick={handlePaste}
            disabled={noPlaylists}
            title="Paste from clipboard"
            className="px-3 rounded-xl bg-white/5 border border-white/10 text-muted hover:text-white hover:border-white/20 transition-all duration-200 flex-shrink-0 disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M19 2h-4.18C14.4.84 13.3 0 12 0c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 18H5V4h2v3h10V4h2v16z" />
            </svg>
          </button>

          {/* Add */}
          <button
            id="add-song-button"
            type="submit"
            disabled={loading || !url.trim() || noPlaylists}
            className="btn-glow px-5 py-3 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-light disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 flex-shrink-0 shadow-lg shadow-accent/25"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Adding…
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M19 13H13v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                </svg>
                Add
              </>
            )}
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-400 flex items-center gap-1 animate-slide-up">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
