import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function CreatePlaylistModal({ onClose, onSave, initialName = '' }) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  // Auto-focus on open
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Please enter a playlist name.'); return; }
    setLoading(true);
    try {
      await onSave(name.trim());
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save playlist.');
    } finally {
      setLoading(false);
    }
  };

  const isRename = Boolean(initialName);

  return createPortal(
    /* Backdrop */
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-enter"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal card */}
      <div
        className="modal-enter w-full max-w-sm mx-4 p-6 flex flex-col gap-5 shadow-2xl rounded-2xl border border-white/10"
        style={{ background: 'rgba(22, 22, 46, 0.97)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/20 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4.5 h-4.5 text-accent">
                <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18A2.49 2.49 0 0 0 16 14c-1.38 0-2.5 1.12-2.5 2.5S14.62 19 16 19s2.5-1.12 2.5-2.5V8h3V6h-4.5z" />
              </svg>
            </div>
            <h2 className="text-white font-bold text-base">
              {isRename ? 'Rename Playlist' : 'New Playlist'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-muted hover:text-white hover:bg-white/8 flex items-center justify-center transition-all duration-150"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <input
              ref={inputRef}
              id="playlist-name-input"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="e.g. Chill Vibes, Workout, K-Pop..."
              maxLength={50}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-muted focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 transition-all duration-200"
            />
            {error && (
              <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 flex-shrink-0">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                {error}
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted border border-white/10 hover:border-white/20 hover:text-white transition-all duration-150"
            >
              Cancel
            </button>
            <button
              id="create-playlist-submit"
              type="submit"
              disabled={loading || !name.trim()}
              className="btn-glow flex-1 py-2.5 rounded-xl text-sm font-semibold bg-accent text-white hover:bg-accent-light disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-accent/25"
            >
              {loading ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="3" />
                  <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : isRename ? 'Rename' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
