import { useEffect, lazy, Suspense } from 'react';
import { useOSStore } from '@/store/useOSStore';
import WindowFrame from './WindowFrame';
import Taskbar from './Taskbar';

// Lazy load applications for better performance
const Terminal = lazy(() => import('@/components/apps/Terminal'));
const ProjectExplorer = lazy(() => import('@/components/apps/ProjectExplorer'));
const Browser = lazy(() => import('@/components/apps/Browser'));
const Settings = lazy(() => import('@/components/apps/Settings'));
const WebFlasher = lazy(() => import('@/components/apps/WebFlasher'));

// Content mapping
const WindowContent = ({ id }: { id: string }) => {
  const { windows } = useOSStore();
  const win = windows.find(w => w.id === id);
  const data = win?.data || {};

  if (id === 'terminal') return <Terminal />;
  if (id === 'projects') return <ProjectExplorer />;
  if (id === 'settings') return <Settings />;
  if (id === 'flasher') return <WebFlasher highlightId={data.projectId} />;
  
  if (id.startsWith('browser_') || data.type === 'browser') {
      return <Browser initialUrl={data.url} />;
  }

  if (id === 'menu') return <div className="p-4 space-y-2"><button className="block hover:text-neon-green">&gt; Settings</button><button className="block hover:text-neon-red text-neon-red">&gt; Shutdown</button></div>;
  
  return <div className="p-4 text-red-500">Content Not Found: {id}</div>;
};

const Desktop = () => {
    const { windows, openWindow } = useOSStore();
    
    const getWindowConfig = (id: string, data: any) => {
        if (id === 'terminal') return { defaultSize: { width: 650, height: 400 } };
        if (id === 'projects') return { defaultSize: { width: 800, height: 500 } };
        if (id === 'settings') return { defaultSize: { width: 450, height: 600 } };
        if (id === 'flasher') return { defaultSize: { width: 800, height: 560 } };
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
        <div className="relative w-full h-screen overflow-hidden">
            
            {/* Window Layer */}
            <div className="absolute inset-0 z-0 pointer-events-auto">
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

            {/* Taskbar Layer */}
            <Taskbar />
        </div>
    );
};

export default Desktop;
