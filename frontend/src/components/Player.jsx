import { useEffect, useRef, useState, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

function IconButton({ onClick, title, disabled, children, className = '' }) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

function formatTime(secs) {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function Player({
  audioRef,
  song,
  isPlaying,
  onTogglePlay,
  onNext,
  onPrev,
  onEnded,
  hasPrev,
  hasNext,
}) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [seekOffset, setSeekOffset] = useState(0);
  const seekOffsetRef = useRef(0);
  const progressRef = useRef(null);

  // When streaming via yt-dlp pipe there's no Content-Length, so
  // audio.duration === Infinity. Fall back to the known duration from metadata.
  const effectiveDuration = (duration && isFinite(duration) && duration > 0)
    ? duration
    : (song?.durationSeconds || 0);

  // ── Sync play/pause state with audio element ──────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !song) return;

    const newSrc = `${API_BASE}/stream/${song.videoId}`;
    const getSrcVideoId = (srcUrl) => {
      if (!srcUrl) return null;
      const match = srcUrl.match(/\/api\/stream\/([\w-]+)/);
      return match ? match[1] : null;
    };

    if (getSrcVideoId(audio.src) !== song.videoId) {
      audio.src = newSrc;
      audio.load();
      setIsLoading(true);
      setCurrentTime(0);
      setDuration(0);
      setSeekOffset(0);
      seekOffsetRef.current = 0;
    }

    if (isPlaying) {
      audio.play().catch((err) => {
        if (err.name !== 'AbortError') console.error('Play error:', err);
      });
    } else {
      audio.pause();
    }
  }, [song, isPlaying, audioRef]);

  // ── Volume ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted, audioRef]);

  // ── Audio event listeners ───────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(seekOffsetRef.current + audio.currentTime);
    const onLoadedMetadata = () => {
      // Guard: piped streams report Infinity; keep 0 so we fall back to song.durationSeconds
      const d = audio.duration;
      setDuration(isFinite(d) ? d : 0);
      setIsLoading(false);
    };
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onEnded = () => {
      setIsLoading(false);
      // onEnded callback from parent (autoplay next)
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioRef]);

  // ── Seek ────────────────────────────────────────────────────────────────
  const handleSeek = useCallback((e) => {
    const audio = audioRef.current;
    if (!audio || !effectiveDuration) return;
    const newTime = (e.target.value / 100) * effectiveDuration;
    
    seekOffsetRef.current = newTime;
    setSeekOffset(newTime);
    audio.src = `${API_BASE}/stream/${song.videoId}?start=${Math.floor(newTime)}`;
    audio.load();
    if (isPlaying) {
      audio.play().catch((err) => console.error(err));
    }
    setCurrentTime(newTime);
  }, [audioRef, effectiveDuration, song, isPlaying]);

  const progressPercent = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;

  const EmptyState = () => (
    <div className="glass-card p-8 flex flex-col items-center justify-center gap-4 text-center min-h-[260px] animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-muted">
          <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
        </svg>
      </div>
      <div>
        <p className="text-white font-semibold">No track selected</p>
        <p className="text-muted text-sm mt-1">Add a YouTube URL above to start listening</p>
      </div>
    </div>
  );

  if (!song) return (
    <>
      <EmptyState />
      <audio
        ref={audioRef}
        onEnded={onEnded}
        preload="metadata"
        className="hidden"
        id="main-audio-player"
      />
    </>
  );

  return (
    <div className="glass-card p-6 flex flex-col gap-5 animate-slide-up">
      {/* Song info row */}
      <div className="flex items-center gap-4">
        {/* Album art / vinyl */}
        <div className="relative flex-shrink-0">
          <div className={`w-20 h-20 rounded-2xl overflow-hidden shadow-xl shadow-black/40 ${isPlaying ? 'ring-2 ring-accent ring-offset-2 ring-offset-[#0d0d1a]' : ''} transition-all duration-500`}>
            <img
              src={song.thumbnail}
              alt={song.title}
              className={`w-full h-full object-cover ${isPlaying ? 'vinyl-spin' : 'vinyl-spin paused'}`}
              onError={(e) => {
                e.target.src = `https://img.youtube.com/vi/${song.videoId}/hqdefault.jpg`;
              }}
            />
          </div>
          {/* Now playing pulse */}
          {isPlaying && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center shadow-lg shadow-accent/50">
              <svg viewBox="0 0 24 24" fill="white" className="w-2.5 h-2.5">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          )}
        </div>

        {/* Title / artist */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-base leading-tight truncate" title={song.title}>
            {song.title}
          </p>
          <p className="text-muted text-sm mt-1 truncate">{song.artist}</p>
          <div className="flex items-center gap-2 mt-2">
            {isLoading && isPlaying && (
              <div className="flex items-end gap-[3px] h-[18px]">
                <div className="wave-bar" />
                <div className="wave-bar" />
                <div className="wave-bar" />
                <div className="wave-bar" />
              </div>
            )}
            <span className="text-xs text-muted/60">{song.duration}</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex flex-col gap-1">
        <div className="relative">
          <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent to-accent-light rounded-full transition-all duration-150"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <input
            id="progress-slider"
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progressPercent}
            onChange={handleSeek}
            className="progress-slider absolute inset-0 opacity-0 cursor-pointer"
            style={{ background: `linear-gradient(to right, #e94560 ${progressPercent}%, rgba(255,255,255,0.1) ${progressPercent}%)`, opacity: 1 }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted/60 px-0.5">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(effectiveDuration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Prev */}
        <IconButton
          onClick={onPrev}
          title="Previous"
          disabled={!hasPrev}
          className="w-10 h-10 text-muted hover:text-white hover:bg-white/8"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
          </svg>
        </IconButton>

        {/* Play / Pause */}
        <button
          id="play-pause-button"
          onClick={onTogglePlay}
          className="btn-glow w-14 h-14 rounded-full bg-accent hover:bg-accent-light text-white flex items-center justify-center shadow-xl shadow-accent/40 transition-all duration-200 active:scale-95"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isLoading && isPlaying ? (
            <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="3" />
              <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : isPlaying ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 ml-0.5">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Next */}
        <IconButton
          onClick={onNext}
          title="Next"
          disabled={!hasNext}
          className="w-10 h-10 text-muted hover:text-white hover:bg-white/8"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z" />
          </svg>
        </IconButton>
      </div>

      {/* Volume control */}
      <div className="flex items-center gap-3 pt-1 border-t border-white/5">
        <button
          id="mute-button"
          onClick={() => setIsMuted((m) => !m)}
          className="text-muted hover:text-white transition-colors duration-150 flex-shrink-0"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted || volume === 0 ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0 0 17.73 17L19 18.27 20.27 17 5.27 2 4.27 3zM12 4 9.91 6.09 12 8.18V4z" />
            </svg>
          ) : volume < 0.5 ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M18.5 12A4.5 4.5 0 0 0 16 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
            </svg>
          )}
        </button>
        <input
          id="volume-slider"
          type="range"
          min="0"
          max="1"
          step="0.02"
          value={isMuted ? 0 : volume}
          onChange={(e) => { setVolume(parseFloat(e.target.value)); setIsMuted(false); }}
          className="progress-slider flex-1"
          style={{
            background: `linear-gradient(to right, #e94560 ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.1) ${(isMuted ? 0 : volume) * 100}%)`,
          }}
        />
        <span className="text-xs text-muted/60 w-8 text-right">
          {Math.round((isMuted ? 0 : volume) * 100)}%
        </span>
      </div>

      {/* Hidden HTML5 audio element */}
      <audio
        ref={audioRef}
        onEnded={onEnded}
        preload="metadata"
        className="hidden"
        id="main-audio-player"
      />
    </div>
  );
}
