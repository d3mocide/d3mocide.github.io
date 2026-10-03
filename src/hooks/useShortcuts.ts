import { useEffect } from 'react';
import { useOSStore } from '@/store/useOSStore';
import { APPS } from '@/lib/apps';
import { TASKBAR_H } from '@/components/os/WindowFrame';

/**
 * Global keyboard shortcuts (matched on physical key codes so Mac's Option-key characters don't matter):
 *   Alt+T/P/F/M/A/S  open an app        Alt+1..9  focus the nth open window
 *   Alt+[  /  Alt+]   previous / next window
 *   Alt+W close       Alt+N minimize    Alt+Enter maximize / restore the focused window
 *   Alt+D show desktop / restore        Alt+←/→ snap the focused window to the left / right half
 */
export const useShortcuts = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const st = useOSStore.getState();
      const open = st.windows.filter((w) => w.isOpen);
      const active = st.activeWindowId;

      const app = APPS.find((a) => a.code === e.code);
      if (app) {
        e.preventDefault();
        st.openWindow(app.id, app.title);
        return;
      }
      if (/^Digit[1-9]$/.test(e.code)) {
        const w = open[Number(e.code.slice(5)) - 1];
        if (w) { e.preventDefault(); st.focusWindow(w.id); }
        return;
      }
      if (e.code === 'BracketLeft' || e.code === 'BracketRight') {
        if (!open.length) return;
        e.preventDefault();
        const i = open.findIndex((w) => w.id === active);
        const step = e.code === 'BracketRight' ? 1 : -1;
        st.focusWindow(open[(i + step + open.length) % open.length].id);
        return;
      }
      if (e.code === 'KeyD') { e.preventDefault(); st.toggleDesktop(); return; }
      if (!active) return;
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        e.preventDefault();
        const w = window.innerWidth;
        const h = window.innerHeight - TASKBAR_H;
        const left = e.code === 'ArrowLeft';
        st.setWindowGeometry(active, { x: left ? 0 : Math.ceil(w / 2), y: 0, w: Math.floor(w / 2), h, maximized: false });
        return;
      }
      if (e.code === 'KeyW') { e.preventDefault(); st.closeWindow(active); }
      else if (e.code === 'KeyN') { e.preventDefault(); st.minimizeWindow(active); }
      else if (e.code === 'Enter') {
        e.preventDefault();
        const g = st.windowGeometry[active];
        st.setWindowGeometry(active, { maximized: !g?.maximized });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
};
