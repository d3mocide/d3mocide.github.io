import { useEffect, useRef } from 'react';
import { useOSStore, THEMES } from '@/store/useOSStore';
import { APPS } from '@/lib/apps';
import { toneText } from '@/components/ascii/tone';

interface ContextMenuProps {
  at: { x: number; y: number } | null;
  onClose: () => void;
}

const MENU_W = 220;

// Right-click menu for the bare desktop: launch apps, switch theme, tidy up.
const ContextMenu = ({ at, onClose }: ContextMenuProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { openWindow, theme, setTheme, scanlines, setScanlines, resetLayout, toggleDesktop, triggerMatrix } = useOSStore();

  useEffect(() => {
    if (!at) return;
    const away = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) onClose(); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    window.addEventListener('blur', onClose);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
      window.removeEventListener('blur', onClose);
      window.removeEventListener('resize', onClose);
    };
  }, [at, onClose]);

  if (!at) return null;

  const run = (fn: () => void) => () => { fn(); onClose(); };
  const itemH = 28;
  const approxH = (APPS.length + 6) * itemH + 80;
  const left = Math.min(at.x, window.innerWidth - MENU_W - 4);
  const top = Math.max(4, Math.min(at.y, window.innerHeight - approxH - 50));

  const row = 'w-full flex items-center gap-2 px-3 h-7 text-left text-xs text-gray-300 hover:bg-neon-green/10 hover:text-white transition-colors';

  return (
    <div
      ref={ref}
      data-os-ui
      role="menu"
      aria-label="Desktop"
      onContextMenu={(e) => e.preventDefault()}
      className="fixed z-[60] bg-bg-panel border border-neon-green/40 rounded-[3px] shadow-[0_12px_40px_rgba(0,0,0,0.7)] font-mono py-1"
      style={{ left, top, width: MENU_W }}
    >
      {APPS.map((a) => (
        <button key={a.id} role="menuitem" className={row} onClick={run(() => openWindow(a.id, a.title))}>
          <span aria-hidden className={`w-3 ${toneText[a.tone]}`}>▸</span>
          <span className="flex-1">{a.label}</span>
          <span className="text-gray-600">Alt+{a.key}</span>
        </button>
      ))}
      <div role="separator" className="my-1 border-t border-neon-green/20" />
      <div className="flex items-center gap-1 px-3 h-7 text-xs text-gray-500">
        <span className="mr-1">theme</span>
        {THEMES.map((t) => (
          <button
            key={t}
            role="menuitemradio"
            aria-checked={theme === t}
            onClick={run(() => setTheme(t))}
            className={`px-1 ${theme === t ? 'text-neon-green' : 'text-gray-500 hover:text-white'}`}
          >
            {theme === t ? `[${t}]` : t}
          </button>
        ))}
      </div>
      <button role="menuitemcheckbox" aria-checked={scanlines} className={row} onClick={run(() => setScanlines(!scanlines))}>
        <span aria-hidden className="w-3 text-gray-500">{scanlines ? 'x' : ' '}</span>Scanlines
      </button>
      <div role="separator" className="my-1 border-t border-neon-green/20" />
      <button role="menuitem" className={row} onClick={run(toggleDesktop)}>
        <span className="flex-1">Show desktop</span><span className="text-gray-600">Alt+D</span>
      </button>
      <button role="menuitem" className={row} onClick={run(resetLayout)}>Reset window layout</button>
      <button role="menuitem" className={row} onClick={run(() => triggerMatrix())}>Take the red pill</button>
    </div>
  );
};

export default ContextMenu;
