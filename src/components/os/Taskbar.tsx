import { useState, useEffect } from 'react';
import { useOSStore } from '@/store/useOSStore';
import { useSoundFX } from '@/hooks/useSoundFX';
import { Terminal, LayoutGrid, Monitor, Zap } from 'lucide-react';
import { useIP } from '@/hooks/useIP';
import StartMenu from './StartMenu';

import { useSimulatedCPU } from '@/hooks/useSimulatedCPU';

const Taskbar = () => {
  const { windows, focusWindow, openWindow } = useOSStore();
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
    <div className="fixed bottom-4 left-4 right-4 h-14 bg-black/60 border border-white/10 backdrop-blur-md rounded-2xl z-50 flex items-center px-4 justify-between select-none shadow-2xl">
      <StartMenu isOpen={isStartOpen} onClose={() => setIsStartOpen(false)} />
      
      {/* Start / Menu */}
      <div className="flex items-center space-x-4 relative">
        <div className="w-24 h-9 relative flex items-center justify-center"> {/* Container isolation */}
            <button 
            className={`
                absolute inset-0 flex items-center justify-center space-x-2 border rounded transition-colors duration-200 z-50 outline-none
                ${isStartOpen 
                ? 'bg-neon-green/20 text-neon-green border-neon-green/50 shadow-[0_0_15px_rgba(0,255,65,0.3)]' 
                : 'bg-neon-green/10 hover:bg-neon-green/20 text-neon-green border-neon-green/30'}
            `}
            onClick={() => { playClick(); setIsStartOpen(!isStartOpen); }}
            >
            <Monitor size={16} />
            <span className="font-mono font-bold text-sm tracking-widest">START</span>
            </button>
        </div>

        {/* Quick Launch */}
        <div className="h-6 w-px bg-neon-green/20 mx-2" />
        <button 
            className="p-2 text-neon-blue hover:text-white transition-colors"
            title="Terminal"
            onClick={() => { playClick(); openWindow('terminal', 'D3_TERM v2.0'); }}
        >
            <Terminal size={18} />
        </button>
        <button 
            className="p-2 text-neon-pink hover:text-white transition-colors" 
            title="Projects"
            onClick={() => { playClick(); openWindow('projects', 'PROJECT_EXPLORER'); }}
        >
            <LayoutGrid size={18} />
        </button>
        <button
            className="p-2 text-neon-green hover:text-white transition-colors"
            title="Web Flasher"
            onClick={() => { playClick(); openWindow('flasher', 'WEB_FLASHER'); }}
        >
            <Zap size={18} />
        </button>
      </div>

      {/* Active Windows */}
      <div className="flex-1 flex items-center ml-8 space-x-2 overflow-x-auto">
        {windows.filter(w => w.isOpen).map((win) => (
          <button
            key={win.id}
            onClick={() => { playClick(); focusWindow(win.id); }}
            className={`
              flex items-center space-x-2 px-3 py-1.5 border min-w-[120px] max-w-[200px] truncate rounded-sm transition-all
              ${!win.isMinimized 
                ? 'bg-neon-green/10 border-neon-green/40 text-neon-green shadow-[0_0_10px_rgba(0,255,65,0.1)]' 
                : 'bg-transparent border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'}
            `}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            <span className="font-mono text-xs truncate">{win.title}</span>
          </button>
        ))}
      </div>

      {/* System Tray */}
      <div className="flex items-center space-x-4 pl-4 border-l border-neon-green/20 text-xs font-mono text-neon-green">
        <div className="hidden md:block">NET: {ip}</div>
        <div className="hidden md:block">CPU: {cpu}%</div>
        <div className="text-neon-yellow">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      </div>

    </div>
  );
};

export default Taskbar;
