import { useRef, useEffect } from 'react';
import { Power, Settings, Folder, Terminal, User, LogOut } from 'lucide-react';
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
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="fixed bottom-20 left-4 w-72 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
        >
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-white/5">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-neon-green/20 flex items-center justify-center border border-neon-green/30">
                        <User size={20} className="text-neon-green" />
                    </div>
                    <div>
                        <div className="text-white font-medium text-sm">Guest User</div>
                        <div className="text-xs text-neon-green font-mono">ADMINISTRATOR</div>
                    </div>
                </div>
            </div>

            {/* Application List */}
            <div className="p-2 space-y-1">
                <button 
                    onClick={() => handleItemClick(() => openWindow('terminal', 'D3_TERM v2.0'))}
                    className="w-full flex items-center space-x-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors group"
                >
                    <Terminal size={18} className="text-neon-blue group-hover:text-white transition-colors" />
                    <span className="text-sm font-medium">Terminal</span>
                </button>
                
                <button 
                  onClick={() => handleItemClick(() => openWindow('projects', 'PROJECT_EXPLORER'))}
                  className="w-full flex items-center space-x-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors group"
                >
                    <Folder size={18} className="text-neon-pink group-hover:text-white transition-colors" />
                    <span className="text-sm font-medium">Projects</span>
                </button>

                 <button 
                  onClick={() => handleItemClick(() => openWindow('settings', 'SYSTEM_CONFIG'))}
                  className="w-full flex items-center space-x-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors group"
                >
                    <Settings size={18} className="text-neon-yellow group-hover:text-white transition-colors" />
                    <span className="text-sm font-medium">System Config</span>
                </button>
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-white/10 grid grid-cols-2 gap-2">
                 <button 
                  onClick={() => handleItemClick(() => setBooting(true))}
                  className="flex items-center justify-center space-x-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                    <LogOut size={16} />
                    <span className="text-xs font-medium">Log Out</span>
                </button>
                 <button 
                  onClick={() => handleItemClick(() => setShutDown(true))}
                  className="flex items-center justify-center space-x-2 px-3 py-2 text-neon-red hover:bg-neon-red/10 rounded-lg transition-colors"
                >
                    <Power size={16} />
                    <span className="text-xs font-medium">Shutdown</span>
                </button>
            </div>
        </m.div>
      )}
    </AnimatePresence>
  );
};

export default StartMenu;
