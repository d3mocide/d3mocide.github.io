import { useState, useEffect } from 'react';
import { useOSStore } from '@/store/useOSStore';
import { useSoundFX } from '@/hooks/useSoundFX';
import { useIP } from '@/hooks/useIP';
import StartMenu from './StartMenu';

import { useSimulatedCPU } from '@/hooks/useSimulatedCPU';

const BARS = '▁▂▃▄▅▆▇█';
const cpuBar = (pct: number) => BARS[Math.min(BARS.length - 1, Math.floor((pct / 100) * BARS.length))];

const QUICK = [
  { id: 'terminal', title: 'D3_TERM v2.0', label: 'TERM', tone: 'text-neon-blue border-neon-blue/30 hover:bg-neon-blue/10' },
  { id: 'projects', title: 'PROJECT_EXPLORER', label: 'PROJ', tone: 'text-neon-pink border-neon-pink/30 hover:bg-neon-pink/10' },
  { id: 'flasher', title: 'WEB_FLASHER', label: 'FLASH', tone: 'text-neon-green border-neon-green/30 hover:bg-neon-green/10' },
];

// Status-line style taskbar: square, hairline, monospace chips.
const Taskbar = () => {
  const { windows, activeWindowId, focusWindow, openWindow } = useOSStore();
  const { playClick } = useSoundFX();
  const { ip } = useIP();
  const cpu = useSimulatedCPU();
  const [time, setTime] = useState(new Date());
  const [isStartOpen, setIsStartOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 h-11 bg-bg-panel/95 border-t border-neon-green/30 z-50 flex items-center px-2 gap-2 select-none font-mono text-xs">
      <StartMenu isOpen={isStartOpen} onClose={() => setIsStartOpen(false)} />

      {/* Start */}
      <button
        className={`h-7 px-3 border rounded-[3px] font-bold tracking-widest transition-colors outline-none ${
          isStartOpen
            ? 'bg-neon-green text-black border-neon-green'
            : 'text-neon-green border-neon-green/50 hover:bg-neon-green/10'
        }`}
        onClick={() => { playClick(); setIsStartOpen(!isStartOpen); }}
      >
        [ START ]
      </button>

      {/* Quick launch */}
      <div className="hidden sm:flex items-center gap-1">
        {QUICK.map((q) => (
          <button
            key={q.id}
            title={q.title}
            onClick={() => { playClick(); openWindow(q.id, q.title); }}
            className={`h-7 px-2 border rounded-[3px] tracking-wider transition-colors ${q.tone}`}
          >
            {q.label}
          </button>
        ))}
      </div>

      <span aria-hidden className="text-neon-green/30">│</span>

      {/* Open windows */}
      <div className="flex-1 flex items-center gap-1 overflow-x-auto">
        {windows.filter((w) => w.isOpen).map((win) => {
          const focused = !win.isMinimized && activeWindowId === win.id;
          return (
            <button
              key={win.id}
              onClick={() => { playClick(); focusWindow(win.id); }}
              className={`h-7 px-2 border rounded-[3px] min-w-[96px] max-w-[190px] truncate text-left transition-colors ${
                focused
                  ? 'bg-neon-green/15 border-neon-green/60 text-neon-green'
                  : win.isMinimized
                    ? 'border-white/10 text-gray-600 hover:text-gray-300 hover:border-white/30'
                    : 'border-white/20 text-gray-400 hover:text-white'
              }`}
            >
              <span aria-hidden>{focused ? '▸' : win.isMinimized ? '·' : '▹'}</span> {win.title}
            </button>
          );
        })}
      </div>

      {/* System tray */}
      <div className="flex items-center gap-3 pl-2 border-l border-neon-green/30 text-neon-green">
        <span className="hidden md:inline text-gray-400">NET <span className="text-neon-blue">{ip}</span></span>
        <span className="hidden md:inline text-gray-400">CPU <span className="text-neon-green">{cpuBar(cpu)}</span> {cpu}%</span>
        <span className="text-neon-yellow">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
};

export default Taskbar;
