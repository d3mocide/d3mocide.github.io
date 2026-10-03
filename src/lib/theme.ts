/** Current primary colour as [r, g, b], read from the active theme's CSS variable. */
export const getPrimaryRgb = (): [number, number, number] => {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--c-primary').trim();
  const parts = raw.split(/\s+/).map(Number);
  return parts.length === 3 && parts.every((n) => !Number.isNaN(n)) ? (parts as [number, number, number]) : [0, 255, 65];
};

export const getPrimaryHex = () => {
  const [r, g, b] = getPrimaryRgb();
  return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
};
