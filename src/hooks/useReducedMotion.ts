import { useOSStore } from '@/store/useOSStore';

/** True when animations should be minimal: follows the OS setting until the user overrides it in System Config. */
export const useReducedMotion = () => useOSStore((s) => s.reduceMotion);
