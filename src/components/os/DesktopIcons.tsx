import { useState } from 'react';
import { useOSStore } from '@/store/useOSStore';
import { useSoundFX } from '@/hooks/useSoundFX';
import { toneText } from '@/components/ascii/tone';
import { APPS } from '@/lib/apps';
import { useIsMobile } from '@/hooks/useIsMobile';

const coarse = () => window.matchMedia?.('(pointer: coarse)').matches;

// ASCII-art launchers. Double-click (or tap / Enter) to open.
const DesktopIcons = () => {
  const openWindow = useOSStore((s) => s.openWindow);
  const { playClick } = useSoundFX();
  const [picked, setPicked] = useState<string | null>(null);
  const isMobile = useIsMobile();
  // phone: the launcher is the home screen — it steps aside while an app is on screen
  const appOnScreen = useOSStore((s) => {
    const w = s.windows.find((x) => x.id === s.activeWindowId);
    return !!w && w.isOpen && !w.isMinimized;
  });

  const open = (id: string, title: string) => {
    playClick();
    openWindow(id, title);
  };

  if (isMobile && appOnScreen) return null;

  return (
    <nav
      aria-label="Desktop"
      data-os-ui
      className={
        isMobile
          // phone: launcher grid in the thumb zone, just above the taskbar
          ? 'absolute inset-x-0 bottom-[var(--taskbar-h)] z-10 grid grid-cols-4 gap-1 px-2 pb-3 pt-6 select-none bg-gradient-to-t from-bg-void/90 via-bg-void/60 to-transparent'
          : 'absolute left-3 top-3 flex flex-col flex-wrap gap-2 content-start max-h-[calc(100dvh-var(--taskbar-h)-1.5rem)] select-none'
      }
    >
      {APPS.map((app) => (
        <button
          key={app.id}
          type="button"
          title={`${app.title} (Alt+${app.key})`}
          onClick={() => (coarse() ? open(app.id, app.title) : setPicked(app.id))}
          onDoubleClick={() => open(app.id, app.title)}
          onKeyDown={(e) => { if (e.key === 'Enter') open(app.id, app.title); }}
          onBlur={() => setPicked((p) => (p === app.id ? null : p))}
          className={`${isMobile ? 'w-full py-2 active:bg-neon-green/15' : 'w-20 py-1'} rounded-[3px] border text-center font-mono transition-colors ${
            picked === app.id ? 'border-neon-green/60 bg-neon-green/10' : 'border-transparent hover:border-white/15 hover:bg-white/[0.03]'
          }`}
        >
          <pre aria-hidden className={`${isMobile ? 'text-[11px]' : 'text-[10px]'} leading-[1.15] inline-block text-left ${toneText[app.tone]}`}>{app.art.join('\n')}</pre>
          <span className={`block mt-1 truncate ${isMobile ? 'text-[11px]' : 'text-[10px]'} text-gray-300`}>{app.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default DesktopIcons;
