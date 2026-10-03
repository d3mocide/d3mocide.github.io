import { useRef } from 'react';
import Draggable, { type DraggableEvent } from 'react-draggable';
import { m, AnimatePresence } from 'framer-motion';
import { Resizable } from 're-resizable';
import { useOSStore } from '@/store/useOSStore';
import { useSoundFX } from '@/hooks/useSoundFX';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useViewport } from '@/hooks/useViewport';
import CyberFrame from '@/components/CyberFrame';

export const TASKBAR_H = 44;
const SNAP_EDGE = 6;

interface WindowFrameProps {
  id: string;
  title: string;
  children: React.ReactNode;
  initialPos?: { x: number; y: number };
  defaultSize?: { width: number | string; height: number | string };
  minSize?: { width: number; height: number };
}

const pointerOf = (e: DraggableEvent) => {
  const t = 'changedTouches' in e ? e.changedTouches[0] : (e as MouseEvent);
  return { x: t.clientX, y: t.clientY };
};

const WindowFrame = ({
    id,
    title,
    children,
    initialPos = { x: 50, y: 50 },
    defaultSize = { width: 600, height: 400 },
    minSize = { width: 320, height: 200 }
}: WindowFrameProps) => {
  const { windows, activeWindowId, closeWindow, minimizeWindow, focusWindow, windowGeometry, setWindowGeometry, setSnapHint } = useOSStore();
  const { playClick, playHover } = useSoundFX();
  const windowState = windows.find((w) => w.id === id);
  const nodeRef = useRef(null); // Fix for strict mode in draggable
  const isMobile = useIsMobile();
  const vp = useViewport();

  if (!windowState || !windowState.isOpen || windowState.isMinimized) return null;
  // On mobile, apps run one at a time, full-screen — only the focused window renders.
  // The rest stay tracked in the store so the taskbar can still switch between them.
  if (isMobile && windowState.id !== activeWindowId) return null;

  const isActive = activeWindowId === id;
  const areaH = vp.h - TASKBAR_H;

  // Saved geometry wins over the defaults; clamp so a layout saved on a bigger screen still fits.
  const saved = windowGeometry[id];
  const num = (v: number | string, fallback: number) => (typeof v === 'number' ? v : fallback);
  const w = Math.min(saved?.w ?? num(defaultSize.width, 600), vp.w);
  const h = Math.min(saved?.h ?? num(defaultSize.height, 400), areaH);
  const x = Math.max(0, Math.min(saved?.x ?? initialPos.x, vp.w - Math.min(w, vp.w)));
  const y = Math.max(0, Math.min(saved?.y ?? initialPos.y, areaH - 40));
  const maximized = !!saved?.maximized && !isMobile;

  const toggleMaximize = () => setWindowGeometry(id, { x, y, w, h, maximized: !maximized });

  const snapFor = (px: number, py: number): 'left' | 'right' | 'max' | null =>
    py <= SNAP_EDGE ? 'max' : px <= SNAP_EDGE ? 'left' : px >= vp.w - SNAP_EDGE ? 'right' : null;

  const frameBody = (
    <CyberFrame className="h-full w-full" active={isActive}>
      {/* Title bar */}
      <div
        onDoubleClick={isMobile ? undefined : toggleMaximize}
        className={`window-handle flex justify-between items-center px-3 py-1.5 max-md:py-1 border-b select-none font-mono text-xs uppercase tracking-[0.2em] ${isActive ? 'bg-neon-green/10 border-neon-green/40 text-neon-green' : 'bg-white/[0.02] border-white/10 text-gray-500'} ${isMobile || maximized ? '' : 'cursor-grab active:cursor-grabbing'}`}
      >
          <span className="truncate">
            <span aria-hidden className={isActive ? 'text-neon-green' : 'text-gray-600'}>▌</span> {title}
          </span>
          <span className="flex items-center space-x-1 shrink-0">
            <button
                aria-label={isMobile ? 'Home' : 'Minimize'}
                onClick={() => { playClick(); minimizeWindow(id); }}
                onMouseEnter={playHover}
                className="px-1.5 max-md:px-3 max-md:py-1.5 hover:bg-neon-green/20 hover:text-white transition-colors"
            >
                {isMobile ? '[⌂]' : '[_]'}
            </button>
            {!isMobile && (
              <button
                  aria-label={maximized ? 'Restore' : 'Maximize'}
                  onClick={() => { playClick(); toggleMaximize(); }}
                  onMouseEnter={playHover}
                  className="px-1.5 hover:bg-neon-green/20 hover:text-white transition-colors"
              >
                  {maximized ? '[▫]' : '[□]'}
              </button>
            )}
            <button
                aria-label="Close"
                onClick={() => { playClick(); closeWindow(id); }}
                onMouseEnter={playHover}
                className="px-1.5 max-md:px-3 max-md:py-1.5 text-neon-red hover:bg-neon-red/20 hover:text-white transition-colors"
            >
                [×]
            </button>
          </span>
      </div>

      {/* Content */}
      <div className="p-4 max-md:p-3 flex-1 h-full min-h-0 overflow-auto text-gray-300 font-mono text-sm scrollbar-thin scrollbar-thumb-neon-green/50 scrollbar-track-transparent">
          {children}
      </div>
    </CyberFrame>
  );

  if (isMobile) {
    return (
      <div
        data-os-ui
        className="fixed inset-x-0 top-0 p-2"
        style={{ zIndex: windowState.zIndex, pointerEvents: 'auto', bottom: 'var(--taskbar-h)', paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
      >
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
      position={maximized ? { x: 0, y: 0 } : { x, y }}
      disabled={maximized}
      onStart={() => { focusWindow(id); }}
      onMouseDown={() => { focusWindow(id); }}
      onDrag={(e) => { const p = pointerOf(e); setSnapHint(snapFor(p.x, p.y)); }}
      onStop={(e, d) => {
        setSnapHint(null);
        const p = pointerOf(e);
        const snap = snapFor(p.x, p.y);
        if (snap === 'max') setWindowGeometry(id, { x: d.x, y: d.y, w, h, maximized: true });
        else if (snap === 'left') setWindowGeometry(id, { x: 0, y: 0, w: Math.floor(vp.w / 2), h: areaH, maximized: false });
        else if (snap === 'right') setWindowGeometry(id, { x: Math.ceil(vp.w / 2), y: 0, w: Math.floor(vp.w / 2), h: areaH, maximized: false });
        else setWindowGeometry(id, { x: d.x, y: d.y, w, h });
      }}
      nodeRef={nodeRef}
      bounds="parent"
    >
      <div
        ref={nodeRef}
        data-os-ui
        className="absolute"
        style={{ zIndex: windowState.zIndex, pointerEvents: 'auto' }}
      >
        <AnimatePresence>
          <m.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Resizable
                size={maximized ? { width: vp.w, height: areaH } : { width: w, height: h }}
                minWidth={Math.min(minSize.width, vp.w)}
                minHeight={minSize.height}
                className="flex flex-col"
                enable={{ right: !maximized, bottom: !maximized, bottomRight: !maximized }}
                onResizeStop={(_e, _dir, _ref, d) => setWindowGeometry(id, { x, y, w: w + d.width, h: h + d.height })}
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
