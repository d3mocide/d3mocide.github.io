import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeId = 'green' | 'amber' | 'ice' | 'white';
export const THEMES: ThemeId[] = ['green', 'amber', 'ice', 'white'];

/** Saved window placement. `maximized` windows ignore x/y/w/h until restored. */
export interface WindowGeometry {
  x: number;
  y: number;
  w: number;
  h: number;
  maximized?: boolean;
}

const BOOT_KEY = 'd3os.booted';
const safeStorage = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
  del: (k: string) => { try { localStorage.removeItem(k); } catch { /* storage unavailable */ } },
};
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export interface WindowState {
  id: string;
  title: string;
  isOpen: boolean;
  isMinimized: boolean;
  zIndex: number;
  content?: React.ReactNode; 
  data?: any;
}

interface OSState {
  // Appearance / behaviour (persisted)
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  scanlines: boolean;
  setScanlines: (on: boolean) => void;
  /** 0-100; 0 turns the ASCII background off */
  fieldIntensity: number;
  setFieldIntensity: (v: number) => void;
  reduceMotion: boolean;
  setReduceMotion: (on: boolean) => void;
  /** transient: briefly swap the background for matrix rain (terminal easter egg) */
  matrixUntil: number;
  triggerMatrix: (ms?: number) => void;
  /** id of the mesh node the user last picked on the background / map */
  selectedNode: string | null;
  selectNode: (id: string | null) => void;

  /** transient: edge-snap preview while dragging a window */
  snapHint: 'left' | 'right' | 'max' | null;
  setSnapHint: (hint: 'left' | 'right' | 'max' | null) => void;
  resetLayout: () => void;
  windowGeometry: Record<string, WindowGeometry>;
  setWindowGeometry: (id: string, geo: Partial<WindowGeometry>) => void;

  isBooting: boolean;
  setBooting: (status: boolean) => void;
  isShutDown: boolean;
  setShutDown: (status: boolean) => void;
  
  // Sound settings
  volume: number; // 0-100
  isMuted: boolean;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  
  // Individual sound effect toggles
  soundEnabled: {
    click: boolean;
    hover: boolean;
    keypress: boolean;
    error: boolean;
  };
  toggleSound: (type: 'click' | 'hover' | 'keypress' | 'error') => void;
  
  windows: WindowState[];
  activeWindowId: string | null;

  openWindow: (id: string, title: string, data?: any) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  /** drop focus so the desktop / launcher shows (windows stay open) */
  showDesktop: () => void;
  /** minimize every window, or bring back the ones the last call hid */
  toggleDesktop: () => void;
}

// windows hidden by the last toggleDesktop, so a second call can restore exactly those
let peeked: string[] = [];

export const useOSStore = create<OSState>()(persist((set) => ({
  theme: 'green',
  setTheme: (theme) => set({ theme }),
  scanlines: true,
  setScanlines: (scanlines) => set({ scanlines }),
  fieldIntensity: 70,
  setFieldIntensity: (fieldIntensity) => set({ fieldIntensity }),
  reduceMotion: prefersReducedMotion(),
  setReduceMotion: (reduceMotion) => set({ reduceMotion }),
  matrixUntil: 0,
  triggerMatrix: (ms = 12000) => set({ matrixUntil: Date.now() + ms }),
  selectedNode: null,
  selectNode: (selectedNode) => set({ selectedNode }),

  snapHint: null,
  setSnapHint: (snapHint) => set({ snapHint }),
  resetLayout: () => set({ windowGeometry: {} }),
  windowGeometry: {},
  setWindowGeometry: (id, geo) => set((state) => ({
    windowGeometry: { ...state.windowGeometry, [id]: { ...(state.windowGeometry[id] ?? { x: 100, y: 100, w: 600, h: 400 }), ...geo } },
  })),

  // First visit (or after shutdown) shows the boot sequence; repeat visits go straight to the desktop.
  isBooting: !safeStorage.get(BOOT_KEY),
  setBooting: (status) => {
    if (status) safeStorage.del(BOOT_KEY);
    else safeStorage.set(BOOT_KEY, '1');
    set({ isBooting: status });
  },
  isShutDown: false,
  setShutDown: (status) => {
    if (status) safeStorage.del(BOOT_KEY);
    set({ isShutDown: status });
  },

  // Sound settings
  volume: 25,
  isMuted: false,
  setVolume: (volume) => set({ volume }),
  setMuted: (muted) => set({ isMuted: muted }),

  // Individual sound effect toggles
  soundEnabled: {
    click: true,
    hover: true,
    keypress: true,
    error: true,
  },
  toggleSound: (type) => set((state) => ({
    soundEnabled: {
      ...state.soundEnabled,
      [type]: !state.soundEnabled[type],
    },
  })),

  windows: [],
  activeWindowId: null,

  openWindow: (id, title, data) => set((state) => {
    const maxZ = Math.max(...state.windows.map(w => w.zIndex), 0);
    
    // If exists, just open and focus (update data if provided)
    const existing = state.windows.find(w => w.id === id);
    if (existing) {
      return {
        windows: state.windows.map(w => w.id === id ? { ...w, isOpen: true, isMinimized: false, zIndex: maxZ + 1, data: data || w.data } : w),
        activeWindowId: id
      };
    }
    // Create new - ensure it's on top
    return {
      windows: [...state.windows, { id, title, isOpen: true, isMinimized: false, zIndex: maxZ + 1, data }],
      activeWindowId: id
    };
  }),

  closeWindow: (id) => set((state) => ({
    windows: state.windows.map(w => w.id === id ? { ...w, isOpen: false } : w)
  })),

  minimizeWindow: (id) => set((state) => ({
    windows: state.windows.map(w => w.id === id ? { ...w, isMinimized: true } : w),
    activeWindowId: null // Clear focus
  })),

  showDesktop: () => set({ activeWindowId: null }),

  toggleDesktop: () => set((state) => {
    const visible = state.windows.filter((w) => w.isOpen && !w.isMinimized);
    if (visible.length) {
      peeked = visible.map((w) => w.id);
      return { windows: state.windows.map((w) => (peeked.includes(w.id) ? { ...w, isMinimized: true } : w)), activeWindowId: null };
    }
    const back = state.windows.filter((w) => w.isOpen && peeked.includes(w.id));
    if (!back.length) return {};
    const top = back.reduce((a, b) => (b.zIndex > a.zIndex ? b : a));
    return { windows: state.windows.map((w) => (back.includes(w) ? { ...w, isMinimized: false } : w)), activeWindowId: top.id };
  }),

  focusWindow: (id) => set((state) => {
    const maxZ = Math.max(...state.windows.map(w => w.zIndex), 0);
    return {
      windows: state.windows.map(w => w.id === id ? { ...w, zIndex: maxZ + 1, isMinimized: false } : w),
      activeWindowId: id
    };
  }),
}), {
  name: 'd3os.settings',
  version: 1,
  partialize: (state) => ({
    theme: state.theme,
    scanlines: state.scanlines,
    fieldIntensity: state.fieldIntensity,
    reduceMotion: state.reduceMotion,
    volume: state.volume,
    isMuted: state.isMuted,
    soundEnabled: state.soundEnabled,
    windowGeometry: state.windowGeometry,
  }),
}));
