import { useRef, useEffect } from 'react';
import { useOSStore } from '@/store/useOSStore';
import { m, AnimatePresence } from 'framer-motion';

interface StartMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const StartMenu = ({ isOpen, onClose }: StartMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const { openWindow, setBooting, setShutDown } = useOSStore();

  useEffect(() => {
    const handleClickOutside = (event: PointerEvent) => {
      const t = event.target as HTMLElement;
      // the START button toggles the menu itself; closing here too would reopen it on click
      if (t.closest?.('[data-start-btn]')) return;
      if (menuRef.current && !menuRef.current.contains(t)) {
        onClose();
      }
    };

    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) {
      document.addEventListener('pointerdown', handleClickOutside);
      document.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  const handleItemClick = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          ref={menuRef}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          data-os-ui style={{ bottom: 'var(--taskbar-h)' }} className="fixed left-2 max-md:right-2 w-72 max-md:w-auto max-h-[calc(100dvh-var(--taskbar-h)-0.5rem)] overflow-y-auto bg-bg-panel border border-neon-green/40 rounded-[3px] shadow-[0_12px_40px_rgba(0,0,0,0.7)] z-50 overflow-hidden font-mono"
        >
            {/* Header */}
            <div className="px-4 py-3 border-b border-neon-green/30 bg-neon-green/5">
                <div className="text-neon-green text-xs tracking-[0.25em]">d3_OS // SESSION</div>
                <div className="mt-1 text-sm text-white">guest<span className="text-gray-500">@d3frag</span> <span className="text-neon-yellow text-xs">[ADMIN]</span></div>
            </div>

            {/* Application List */}
            <div className="p-2 space-y-1">
                <button 
                    onClick={() => handleItemClick(() => openWindow('terminal', 'D3_TERM v2.0'))}
                    className="w-full flex items-center space-x-3 px-3 py-2 max-md:py-3 text-gray-300 hover:text-white hover:bg-neon-green/10 rounded-[3px] transition-colors group"
                >
                    <span aria-hidden className="w-6 text-neon-blue group-hover:text-white transition-colors">&gt;_</span>
                    <span className="text-sm">Terminal</span>
                </button>
                
                <button 
                  onClick={() => handleItemClick(() => openWindow('projects', 'PROJECT_EXPLORER'))}
                  className="w-full flex items-center space-x-3 px-3 py-2 max-md:py-3 text-gray-300 hover:text-white hover:bg-neon-green/10 rounded-[3px] transition-colors group"
                >
                    <span aria-hidden className="w-6 text-neon-pink group-hover:text-white transition-colors">[#]</span>
                    <span className="text-sm">Projects</span>
                </button>

                <button
                  onClick={() => handleItemClick(() => openWindow('flasher', 'WEB_FLASHER'))}
                  className="w-full flex items-center space-x-3 px-3 py-2 max-md:py-3 text-gray-300 hover:text-white hover:bg-neon-green/10 rounded-[3px] transition-colors group"
                >
                    <span aria-hidden className="w-6 text-neon-green group-hover:text-white transition-colors">[~]</span>
                    <span className="text-sm">Web Flasher</span>
                </button>

                <button
                  onClick={() => handleItemClick(() => openWindow('mesh', 'MESH_MAP'))}
                  className="w-full flex items-center space-x-3 px-3 py-2 max-md:py-3 text-gray-300 hover:text-white hover:bg-neon-green/10 rounded-[3px] transition-colors group"
                >
                    <span aria-hidden className="w-6 text-neon-yellow group-hover:text-white transition-colors">(@)</span>
                    <span className="text-sm">Mesh Map</span>
                </button>

                <button
                  onClick={() => handleItemClick(() => openWindow('about', 'ABOUT'))}
                  className="w-full flex items-center space-x-3 px-3 py-2 max-md:py-3 text-gray-300 hover:text-white hover:bg-neon-green/10 rounded-[3px] transition-colors group"
                >
                    <span aria-hidden className="w-6 text-neon-blue group-hover:text-white transition-colors">[?]</span>
                    <span className="text-sm">About</span>
                </button>

                <button
                  onClick={() => handleItemClick(() => openWindow('game', 'PACKET_LOSS'))}
                  className="w-full flex items-center space-x-3 px-3 py-2 max-md:py-3 text-gray-300 hover:text-white hover:bg-neon-green/10 rounded-[3px] transition-colors group"
                >
                    <span aria-hidden className="w-6 text-neon-pink group-hover:text-white transition-colors">oo@</span>
                    <span className="text-sm">Packet Loss <span className="text-gray-600 text-xs">(game)</span></span>
                </button>

                 <button
                  onClick={() => handleItemClick(() => openWindow('settings', 'SYSTEM_CONFIG'))}
                  className="w-full flex items-center space-x-3 px-3 py-2 max-md:py-3 text-gray-300 hover:text-white hover:bg-neon-green/10 rounded-[3px] transition-colors group"
                >
                    <span aria-hidden className="w-6 text-neon-yellow group-hover:text-white transition-colors">[*]</span>
                    <span className="text-sm">System Config</span>
                </button>
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-neon-green/30 grid grid-cols-2 gap-2">
                 <button 
                  onClick={() => handleItemClick(() => setBooting(true))}
                  className="flex items-center justify-center space-x-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-neon-green/10 rounded-[3px] transition-colors"
                >
                    <span aria-hidden>&lt;-</span>
                    <span className="text-xs">Log Out</span>
                </button>
                 <button 
                  onClick={() => handleItemClick(() => setShutDown(true))}
                  className="flex items-center justify-center space-x-2 px-3 py-2 text-neon-red hover:bg-neon-red/10 rounded-[3px] transition-colors"
                >
                    <span aria-hidden>(!)</span>
                    <span className="text-xs">Shutdown</span>
                </button>
            </div>
        </m.div>
      )}
    </AnimatePresence>
  );
};

export default StartMenu;
