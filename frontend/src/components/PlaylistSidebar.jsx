import { useState } from 'react';
import CreatePlaylistModal from './CreatePlaylistModal';

const API_BASE = '/api';

export default function PlaylistSidebar({
  playlists,
  activeId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [renaming, setRenaming] = useState(null); // playlist object being renamed
  const [hoveredId, setHoveredId] = useState(null);

  const handleCreate = async (name) => {
    const res = await fetch(`${API_BASE}/playlists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error(`Server error (${res.status}): Unable to parse response.`);
    }
    if (!res.ok) throw new Error(data?.error || `Server error (${res.status})`);
    onCreate(data.playlist);
  };

  const handleRename = async (name) => {
    const res = await fetch(`${API_BASE}/playlists/${renaming.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error(`Server error (${res.status}): Unable to parse response.`);
    }
    if (!res.ok) throw new Error(data?.error || `Server error (${res.status})`);
    onRename(data.playlist);
    setRenaming(null);
  };

  const handleDelete = async (playlist) => {
    if (!window.confirm(`Delete "${playlist.name}"? This cannot be undone.`)) return;
    const res = await fetch(`${API_BASE}/playlists/${playlist.id}`, { method: 'DELETE' });
    if (!res.ok) {
      let data;
      try { data = await res.json(); } catch { /* ignore */ }
      alert(data?.error || `Failed to delete playlist (${res.status})`);
      return;
    }
    onDelete(playlist.id);
  };

  return (
    <>
      <aside className="glass-card flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-5 pb-3 flex items-center justify-between flex-shrink-0 border-b border-white/5">
          <div>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-widest">Playlists</h2>
            <p className="text-[10px] text-muted/40 mt-0.5">{playlists.length} collection{playlists.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            id="new-playlist-btn"
            onClick={() => setShowCreate(true)}
            title="Create new playlist"
            className="w-8 h-8 rounded-xl bg-accent/20 hover:bg-accent/40 text-accent hover:text-white flex items-center justify-center transition-all duration-150 flex-shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M19 13H13v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
          </button>
        </div>

        {/* Playlist list */}
        <div className="flex-1 overflow-y-auto py-2 px-2">
          {playlists.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 px-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-muted/40">
                  <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18A2.49 2.49 0 0 0 16 14c-1.38 0-2.5 1.12-2.5 2.5S14.62 19 16 19s2.5-1.12 2.5-2.5V8h3V6h-4.5z" />
                </svg>
              </div>
              <p className="text-muted/50 text-xs leading-relaxed">
                No playlists yet.<br />Click <span className="text-accent font-medium">+</span> to create one.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-1">
              {playlists.map((pl) => {
                const isActive = pl.id === activeId;
                const isHovered = pl.id === hoveredId;
                return (
                  <li
                    key={pl.id}
                    id={`playlist-${pl.id}`}
                    className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 glass-item
                      ${isActive ? 'playlist-item-active' : 'hover:bg-white/5 border-transparent'}`}
                    onClick={() => onSelect(pl)}
                    onMouseEnter={() => setHoveredId(pl.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    {/* Icon */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200
                      ${isActive ? 'bg-accent/30' : 'bg-white/6 group-hover:bg-white/10'}`}>
                      <svg viewBox="0 0 24 24" fill="currentColor"
                        className={`w-3.5 h-3.5 ${isActive ? 'text-accent' : 'text-muted'}`}>
                        <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18A2.49 2.49 0 0 0 16 14c-1.38 0-2.5 1.12-2.5 2.5S14.62 19 16 19s2.5-1.12 2.5-2.5V8h3V6h-4.5z" />
                      </svg>
                    </div>

                    {/* Name + count */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate leading-tight
                        ${isActive ? 'text-accent' : 'text-white/90'}`}
                        title={pl.name}
                      >
                        {pl.name}
                      </p>
                      <p className="text-[10px] text-muted/50 mt-0.5">
                        {pl.songs.length} {pl.songs.length === 1 ? 'track' : 'tracks'}
                      </p>
                    </div>

                    {/* Action buttons — visible on hover */}
                    <div className={`flex items-center gap-1 transition-opacity duration-150 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setRenaming(pl); }}
                        title="Rename"
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-muted/60 hover:text-blue-400 hover:bg-blue-400/10 transition-all duration-150"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(pl); }}
                        title="Delete playlist"
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-muted/60 hover:text-red-400 hover:bg-red-400/10 transition-all duration-150"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                        </svg>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Create modal */}
      {showCreate && (
        <CreatePlaylistModal
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
        />
      )}

      {/* Rename modal */}
      {renaming && (
        <CreatePlaylistModal
          initialName={renaming.name}
          onClose={() => setRenaming(null)}
          onSave={handleRename}
        />
      )}
    </>
  );
}
