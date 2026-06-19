export default function Playlist({ playlist, currentIndex, isPlaying, onSelect, onDelete }) {
  if (playlist.length === 0) {
    return (
      <div className="glass-card h-full flex flex-col items-center justify-center gap-3 p-8 text-center min-h-[200px]">
        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-muted">
            <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18A2.49 2.49 0 0 0 16 14c-1.38 0-2.5 1.12-2.5 2.5S14.62 19 16 19s2.5-1.12 2.5-2.5V8h3V6h-4.5z" />
          </svg>
        </div>
        <div>
          <p className="text-white font-medium text-sm">Queue is empty</p>
          <p className="text-muted text-xs mt-1">Songs you add will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between flex-shrink-0">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-widest">
          Queue
        </h2>
        <span className="text-xs font-medium text-muted/60 bg-white/5 px-2.5 py-1 rounded-full">
          {playlist.length} {playlist.length === 1 ? 'track' : 'tracks'}
        </span>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto">
        <ul className="divide-y divide-white/4" id="playlist-queue">
          {playlist.map((song, idx) => {
            const isActive = idx === currentIndex;
            const isCurrentlyPlaying = isActive && isPlaying;

            return (
              <li
                key={song.videoId}
                className={`group flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200 ${
                  isActive
                    ? 'bg-accent/10 hover:bg-accent/15'
                    : 'hover:bg-white/5'
                }`}
                onClick={() => onSelect(idx)}
                id={`playlist-item-${song.videoId}`}
              >
                {/* Track number / playing indicator */}
                <div className="w-6 flex-shrink-0 flex items-center justify-center">
                  {isCurrentlyPlaying ? (
                    <div className="flex items-end gap-[2px] h-[14px]">
                      <div className="wave-bar !w-[2px]" />
                      <div className="wave-bar !w-[2px]" />
                      <div className="wave-bar !w-[2px]" />
                    </div>
                  ) : (
                    <span className={`text-xs font-medium ${isActive ? 'text-accent' : 'text-muted/50 group-hover:hidden'}`}>
                      {idx + 1}
                    </span>
                  )}
                  {!isCurrentlyPlaying && (
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className={`w-3.5 h-3.5 ${isActive ? 'text-accent' : 'text-white'} hidden group-hover:block`}
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </div>

                {/* Thumbnail */}
                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 shadow-md">
                  <img
                    src={song.thumbnail}
                    alt={song.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = `https://img.youtube.com/vi/${song.videoId}/hqdefault.jpg`;
                    }}
                    loading="lazy"
                  />
                </div>

                {/* Title & artist */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium leading-tight truncate ${
                      isActive ? 'text-accent' : 'text-white'
                    }`}
                    title={song.title}
                  >
                    {song.title}
                  </p>
                  <p className="text-xs text-muted/70 truncate mt-0.5">{song.artist}</p>
                </div>

                {/* Duration + delete */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-muted/50 tabular-nums hidden sm:block">
                    {song.duration}
                  </span>
                  <button
                    id={`delete-${song.videoId}`}
                    onClick={(e) => { e.stopPropagation(); onDelete(song.videoId); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted/40 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all duration-150"
                    title="Remove from queue"
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
