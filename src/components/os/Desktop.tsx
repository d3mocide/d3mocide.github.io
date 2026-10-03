import { useEffect, useState, lazy, Suspense } from 'react';
import { useOSStore } from '@/store/useOSStore';
import WindowFrame from './WindowFrame';
import Taskbar from './Taskbar';
import DesktopIcons from './DesktopIcons';
import ContextMenu from './ContextMenu';
import { useShortcuts } from '@/hooks/useShortcuts';
import { TASKBAR_H } from './WindowFrame';

// Lazy load applications for better performance
const Terminal = lazy(() => import('@/components/apps/Terminal'));
const ProjectExplorer = lazy(() => import('@/components/apps/ProjectExplorer'));
const Browser = lazy(() => import('@/components/apps/Browser'));
const Settings = lazy(() => import('@/components/apps/Settings'));
const WebFlasher = lazy(() => import('@/components/apps/WebFlasher'));
const MeshMap = lazy(() => import('@/components/apps/MeshMap'));
const About = lazy(() => import('@/components/apps/About'));
const Game = lazy(() => import('@/components/apps/Game'));
const Invaders = lazy(() => import('@/components/apps/Invaders'));

// Content mapping
const WindowContent = ({ id }: { id: string }) => {
  const { windows } = useOSStore();
  const win = windows.find(w => w.id === id);
  const data = win?.data || {};

  if (id === 'terminal') return <Terminal />;
  if (id === 'projects') return <ProjectExplorer />;
  if (id === 'settings') return <Settings />;
  if (id === 'flasher') return <WebFlasher highlightId={data.projectId} />;
  if (id === 'mesh') return <MeshMap />;
  if (id === 'about') return <About />;
  if (id === 'game') return <Game />;
  if (id === 'invaders') return <Invaders />;
  
  if (id.startsWith('browser_') || data.type === 'browser') {
      return <Browser initialUrl={data.url} />;
  }

  if (id === 'menu') return <div className="p-4 space-y-2"><button className="block hover:text-neon-green">&gt; Settings</button><button className="block hover:text-neon-red text-neon-red">&gt; Shutdown</button></div>;
  
  return <div className="p-4 text-red-500">Content Not Found: {id}</div>;
};

const Desktop = () => {
    const { windows, openWindow, snapHint } = useOSStore();
    useShortcuts(true);
    const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
    
    const getWindowConfig = (id: string, data: any) => {
        if (id === 'terminal') return { defaultSize: { width: 650, height: 400 } };
        if (id === 'projects') return { defaultSize: { width: 800, height: 500 } };
        if (id === 'settings') return { defaultSize: { width: 450, height: 600 } };
        if (id === 'flasher') return { defaultSize: { width: 800, height: 560 } };
        if (id === 'mesh') return { defaultSize: { width: 880, height: 540 }, minSize: { width: 420, height: 320 } };
        if (id === 'about') return { defaultSize: { width: 560, height: 520 } };
        if (id === 'invaders') return { defaultSize: { width: 460, height: 600 }, minSize: { width: 320, height: 420 } };
        if (id === 'game') return { defaultSize: { width: 480, height: 560 }, minSize: { width: 320, height: 420 } };
        if (id.startsWith('browser_') || data?.type === 'browser') {
            return { defaultSize: { width: 1024, height: 720 }, minSize: { width: 600, height: 400 } };
        }
        return {};
    };

    useEffect(() => {
        // Auto-launch terminal on startup
        if (windows.length === 0) {
            openWindow('terminal', 'D3_TERM v2.0');
        }
    }, [windows, openWindow]);

    return (
        <div
            className="relative w-full h-[100dvh] overflow-hidden"
            onContextMenu={(e) => {
                // only the bare desktop gets the menu; windows, icons and text fields keep the browser's
                if ((e.target as HTMLElement).closest('[data-os-ui], input, textarea')) return;
                e.preventDefault();
                setMenuAt({ x: e.clientX, y: e.clientY });
            }}
        >
            
            {/* Desktop icons sit under the windows (DOM order) */}
            <DesktopIcons />

            {/* Window Layer: click-through, each window re-enables pointer events */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                {windows.map((win) => (
                    <WindowFrame 
                        key={win.id} 
                        id={win.id} 
                        title={win.title}
                        initialPos={{ x: 100 + (windows.indexOf(win) * 30), y: 100 + (windows.indexOf(win) * 20) }}
                        {...getWindowConfig(win.id, win.data)}
                    >
                        <Suspense fallback={
                            <div className="flex items-center justify-center h-full">
                                <div className="text-neon-green text-glow-green font-mono">
                                    <div className="animate-pulse">LOADING...</div>
                                </div>
                            </div>
                        }>
                            <WindowContent id={win.id} />
                        </Suspense>
                    </WindowFrame>
                ))}
            </div>

            {/* Edge-snap preview while dragging a window */}
            {snapHint && (
                <div
                    aria-hidden
                    className="fixed z-[9998] pointer-events-none border border-dashed border-neon-green/70 bg-neon-green/5"
                    style={{
                        top: 0,
                        height: `calc(100vh - ${TASKBAR_H}px)`,
                        left: snapHint === 'right' ? '50%' : 0,
                        width: snapHint === 'max' ? '100%' : '50%',
                    }}
                />
            )}

            {/* Taskbar Layer */}
            <Taskbar />
            <ContextMenu at={menuAt} onClose={() => setMenuAt(null)} />
        </div>
    );
};

export default Desktop;
