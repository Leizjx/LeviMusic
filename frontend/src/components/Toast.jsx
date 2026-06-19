import { useEffect, useState } from 'react';

const ICONS = {
  success: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-emerald-400">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-red-400">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-400">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
    </svg>
  ),
};

export default function Toast({ message, type = 'info' }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 3200);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl glass-card shadow-2xl text-sm font-medium text-white max-w-xs"
      style={{ animation: 'toastIn 0.3s ease-out forwards', transform: 'translateX(-50%)' }}
      role="status"
      aria-live="polite"
    >
      {ICONS[type]}
      <span className="truncate">{message}</span>
    </div>
  );
}
