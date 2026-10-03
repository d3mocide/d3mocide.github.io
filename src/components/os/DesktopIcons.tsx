import { useState } from 'react';
import { useOSStore } from '@/store/useOSStore';
import { useSoundFX } from '@/hooks/useSoundFX';
import { toneText } from '@/components/ascii/tone';
import { APPS } from '@/lib/apps';

const coarse = () => window.matchMedia?.('(pointer: coarse)').matches;

// ASCII-art launchers. Double-click (or tap / Enter) to open.
const DesktopIcons = () => {
  const openWindow = useOSStore((s) => s.openWindow);
  const { playClick } = useSoundFX();
  const [picked, setPicked] = useState<string | null>(null);

  const open = (id: string, title: string) => {
    playClick();
    openWindow(id, title);
  };

  return (
    <nav aria-label="Desktop" data-os-ui className="absolute left-3 top-3 flex flex-col gap-2 select-none">
      {APPS.map((app) => (
        <button
          key={app.id}
          type="button"
          title={`${app.title} (Alt+${app.key})`}
          onClick={() => (coarse() ? open(app.id, app.title) : setPicked(app.id))}
          onDoubleClick={() => open(app.id, app.title)}
          onKeyDown={(e) => { if (e.key === 'Enter') open(app.id, app.title); }}
          onBlur={() => setPicked((p) => (p === app.id ? null : p))}
          className={`w-20 py-1 rounded-[3px] border text-center font-mono transition-colors ${
            picked === app.id ? 'border-neon-green/60 bg-neon-green/10' : 'border-transparent hover:border-white/15 hover:bg-white/[0.03]'
          }`}
        >
          <pre aria-hidden className={`text-[10px] leading-[1.15] ${toneText[app.tone]}`}>{app.art.join('\n')}</pre>
          <span className="block mt-1 text-[10px] text-gray-300 truncate">{app.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default DesktopIcons;
