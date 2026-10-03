import { useRef } from 'react';
import Draggable from 'react-draggable';
import { m, AnimatePresence } from 'framer-motion';
import { Resizable } from 're-resizable';
import { useOSStore } from '@/store/useOSStore';
import { useSoundFX } from '@/hooks/useSoundFX';
import { useIsMobile } from '@/hooks/useIsMobile';
import CyberFrame from '@/components/CyberFrame';

interface WindowFrameProps {
  id: string;
  title: string;
  children: React.ReactNode;
  initialPos?: { x: number; y: number };
  defaultSize?: { width: number | string; height: number | string };
  minSize?: { width: number; height: number };
}

const WindowFrame = ({ 
    id, 
    title, 
    children, 
    initialPos = { x: 50, y: 50 },
    defaultSize = { width: 600, height: 400 },
    minSize = { width: 320, height: 200 }
}: WindowFrameProps) => {
  const { windows, activeWindowId, closeWindow, minimizeWindow, focusWindow } = useOSStore();
  const { playClick, playHover } = useSoundFX();
  const windowState = windows.find((w) => w.id === id);
  const nodeRef = useRef(null); // Fix for strict mode in draggable
  const isMobile = useIsMobile();

  if (!windowState || !windowState.isOpen || windowState.isMinimized) return null;
  // On mobile, apps run one at a time, full-screen — only the focused window renders.
  // The rest stay tracked in the store so the taskbar can still switch between them.
  if (isMobile && windowState.id !== activeWindowId) return null;

  const isActive = activeWindowId === id;

  const frameBody = (
    <CyberFrame className="h-full w-full" active={isActive}>
      {/* Title bar */}
      <div className={`window-handle flex justify-between items-center px-3 py-1.5 border-b select-none font-mono text-xs uppercase tracking-[0.2em] ${isActive ? 'bg-neon-green/10 border-neon-green/40 text-neon-green' : 'bg-white/[0.02] border-white/10 text-gray-500'} ${isMobile ? '' : 'cursor-grab active:cursor-grabbing'}`}>
          <span className="truncate">
            <span aria-hidden className={isActive ? 'text-neon-green' : 'text-gray-600'}>▌</span> {title}
          </span>
          <span className="flex items-center space-x-1 shrink-0">
            <button
                aria-label="Minimize"
                onClick={() => { playClick(); minimizeWindow(id); }}
                onMouseEnter={playHover}
                className="px-1.5 hover:bg-neon-green/20 hover:text-white transition-colors"
            >
                [_]
            </button>
            <button
                aria-label="Close"
                onClick={() => { playClick(); closeWindow(id); }}
                onMouseEnter={playHover}
                className="px-1.5 text-neon-red hover:bg-neon-red/20 hover:text-white transition-colors"
            >
                [×]
            </button>
          </span>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 h-full overflow-auto text-gray-300 font-mono text-sm scrollbar-thin scrollbar-thumb-neon-green/50 scrollbar-track-transparent">
          {children}
      </div>
    </CyberFrame>
  );

  if (isMobile) {
    return (
      <div className="fixed inset-0 pb-20 p-2" style={{ zIndex: windowState.zIndex }}>
        <AnimatePresence>
          <m.div
            className="h-full w-full flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {frameBody}
          </m.div>
        </AnimatePresence>
      </div>
    );
  }

  return (
    <Draggable
      handle=".window-handle"
      defaultPosition={initialPos}
      onMouseDown={() => { focusWindow(id); }}
      nodeRef={nodeRef}
      bounds="parent"
    >
      <div
        ref={nodeRef}
        className="absolute"
        style={{ zIndex: windowState.zIndex }}
      >
        <AnimatePresence>
          <m.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Resizable
                defaultSize={defaultSize}
                minWidth={minSize.width}
                minHeight={minSize.height}
                className="flex flex-col"
                handleClasses={{
                    bottomRight: "cursor-se-resize z-50",
                    right: "cursor-e-resize z-50",
                    bottom: "cursor-s-resize z-50"
                }}
            >
                {frameBody}
            </Resizable>
          </m.div>
        </AnimatePresence>
      </div>
    </Draggable>
  );
};

export default WindowFrame;
