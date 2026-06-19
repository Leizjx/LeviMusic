import { useState } from 'react';

const API_BASE = '/api';

export default function SongQueue({
  playlist,       // full playlist object { id, name, songs[] }
  playlists,      // all playlists (for copy-to feature)
  currentIndex,
  isPlaying,
  onSelect,
  onDelete,
  onCopyToPlaylist,
}) {
  const [copyMenuFor, setCopyMenuFor] = useState(null); // videoId with open copy menu

  const songs = playlist?.songs || [];
  const otherPlaylists = playlists.filter((p) => p.id !== playlist?.id);

  if (!playlist) {
    return (
      <div className="glass-card h-full flex flex-col items-center justify-center gap-3 p-8 text-center min-h-[200px]">
        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-muted/40">
            <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18A2.49 2.49 0 0 0 16 14c-1.38 0-2.5 1.12-2.5 2.5S14.62 19 16 19s2.5-1.12 2.5-2.5V8h3V6h-4.5z" />
          </svg>
        </div>
        <div>
          <p className="text-white font-medium text-sm">No playlist selected</p>
          <p className="text-muted text-xs mt-1">Create or select a playlist from the sidebar</p>
        </div>
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div className="glass-card h-full flex flex-col overflow-hidden">
        <QueueHeader playlist={playlist} count={0} />
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-muted/40">
              <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
            </svg>
          </div>
          <p className="text-muted text-xs">This playlist is empty.<br />Add songs using the form above.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card flex flex-col h-full overflow-hidden" onClick={() => setCopyMenuFor(null)}>
      <QueueHeader playlist={playlist} count={songs.length} />

      <div className="flex-1 overflow-y-auto">
        <ul className="divide-y divide-white/4" id="song-queue">
          {songs.map((song, idx) => {
            const isActive = idx === currentIndex;
            const isCurrentlyPlaying = isActive && isPlaying;
            const showCopyMenu = copyMenuFor === song.videoId;

            return (
              <li
                key={song.videoId}
                id={`queue-item-${song.videoId}`}
                className={`group relative flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200
                  ${isActive ? 'bg-accent/10 hover:bg-accent/15' : 'hover:bg-white/5'}`}
                onClick={() => onSelect(idx)}
              >
                {/* Track number / now-playing indicator */}
                <div className="w-5 flex-shrink-0 flex items-center justify-center">
                  {isCurrentlyPlaying ? (
                    <div className="flex items-end gap-[2px] h-[14px]">
                      <div className="wave-bar !w-[2px]" />
                      <div className="wave-bar !w-[2px]" />
                      <div className="wave-bar !w-[2px]" />
                    </div>
                  ) : (
                    <>
                      <span className={`text-xs font-medium group-hover:hidden ${isActive ? 'text-accent' : 'text-muted/50'}`}>
                        {idx + 1}
                      </span>
                      <svg viewBox="0 0 24 24" fill="currentColor"
                        className={`w-3.5 h-3.5 hidden group-hover:block ${isActive ? 'text-accent' : 'text-white'}`}>
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </>
                  )}
                </div>

                {/* Thumbnail */}
                <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={song.thumbnail}
                    alt={song.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = `https://img.youtube.com/vi/${song.videoId}/hqdefault.jpg`; }}
                    loading="lazy"
                  />
                </div>

                {/* Title & artist */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-tight truncate ${isActive ? 'text-accent' : 'text-white'}`}
                    title={song.title}>
                    {song.title}
                  </p>
                  <p className="text-xs text-muted/60 truncate mt-0.5">{song.artist}</p>
                </div>

                {/* Duration + actions */}
                <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <span className="text-xs text-muted/40 tabular-nums hidden sm:block mr-1">{song.duration}</span>

                  {/* Copy to playlist button */}
                  {otherPlaylists.length > 0 && (
                    <div className="relative">
                      <button
                        title="Add to another playlist"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCopyMenuFor(showCopyMenu ? null : song.videoId);
                        }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted/30 hover:text-blue-400 hover:bg-blue-400/10 opacity-0 group-hover:opacity-100 transition-all duration-150"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                          <path d="M19 13H13v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                        </svg>
                      </button>

                      {/* Dropdown */}
                      {showCopyMenu && (
                        <div className="absolute right-0 bottom-8 z-20 min-w-[160px] glass-card py-1 shadow-xl">
                          <p className="text-[10px] text-muted/50 uppercase tracking-wider px-3 py-1.5">Add to</p>
                          {otherPlaylists.map((pl) => (
                            <button
                              key={pl.id}
                              onClick={() => { onCopyToPlaylist(song, pl.id); setCopyMenuFor(null); }}
                              className="w-full text-left px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/8 flex items-center gap-2 transition-all duration-100"
                            >
                              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-accent flex-shrink-0">
                                <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18A2.49 2.49 0 0 0 16 14c-1.38 0-2.5 1.12-2.5 2.5S14.62 19 16 19s2.5-1.12 2.5-2.5V8h3V6h-4.5z" />
                              </svg>
                              <span className="truncate">{pl.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Delete */}
                  <button
                    id={`delete-${song.videoId}`}
                    onClick={(e) => { e.stopPropagation(); onDelete(song.videoId); }}
                    title="Remove from playlist"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted/30 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all duration-150"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                    </svg>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function QueueHeader({ playlist, count }) {
  return (
    <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3 flex-shrink-0">
      <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-accent">
          <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18A2.49 2.49 0 0 0 16 14c-1.38 0-2.5 1.12-2.5 2.5S14.62 19 16 19s2.5-1.12 2.5-2.5V8h3V6h-4.5z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-semibold text-white truncate" title={playlist.name}>{playlist.name}</h2>
        <p className="text-[10px] text-muted/50 mt-0.5">{count} {count === 1 ? 'track' : 'tracks'}</p>
      </div>
    </div>
  );
}
