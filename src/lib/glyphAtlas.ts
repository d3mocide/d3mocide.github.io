// Pre-rendered glyph sheets for the ASCII canvases. Every glyph is drawn once per colour,
// then each frame is just cheap drawImage blits.

export type Tone = 'green' | 'gray' | 'pink' | 'blue' | 'yellow';
export const TONES: Tone[] = ['green', 'gray', 'pink', 'blue', 'yellow'];

export const RAMP = ' .:-=+*#%@';
export const NOISE = '01<>[]{}/\\|$%#&*+=?!';
const ALNUM = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const SYMBOLS = '_-.:/()@~·,;^"\'';
export const CHARSET = Array.from(new Set([...(RAMP + NOISE + ALNUM + SYMBOLS)])).join('');

const INDEX = new Map<string, number>();
[...CHARSET].forEach((c, i) => INDEX.set(c, i));

export const FONT = '"JetBrains Mono", ui-monospace, Menlo, monospace';

export interface Palette {
  green: string;
  gray: string;
  pink: string;
  blue: string;
  yellow: string;
}

export const makePalette = (primaryHex: string): Palette => ({
  green: primaryHex,
  gray: '#aab5ab',
  pink: '#ff0055',
  blue: '#00B8FF',
  yellow: '#FCEE0C',
});

export type Atlas = Record<Tone, HTMLCanvasElement>;

export const buildAtlas = (cw: number, ch: number, dpr: number, palette: Palette): Atlas => {
  const tw = Math.ceil(cw * dpr);
  const th = Math.ceil(ch * dpr);
  const fs = ch * 0.78;
  const out = {} as Atlas;
  TONES.forEach((tone) => {
    const a = document.createElement('canvas');
    a.width = tw * CHARSET.length;
    a.height = th;
    const c = a.getContext('2d')!;
    c.scale(dpr, dpr);
    c.font = `${fs}px ${FONT}`;
    c.textBaseline = 'middle';
    c.textAlign = 'center';
    c.fillStyle = palette[tone];
    [...CHARSET].forEach((g, i) => c.fillText(g, (i * tw) / dpr + cw / 2, ch / 2 + 1));
    out[tone] = a;
  });
  return out;
};

export type Put = (glyph: string, col: number, row: number, tone: Tone, alpha: number) => void;

/** Returns a `put` that blits one glyph into cell (col,row) of the given context. */
export const makePainter = (
  ctx: CanvasRenderingContext2D,
  atlas: Atlas,
  cw: number,
  ch: number,
  dpr: number,
  cols: number,
  rows: number,
): Put => {
  const tw = Math.ceil(cw * dpr);
  const th = Math.ceil(ch * dpr);
  return (glyph, col, row, tone, alpha) => {
    const idx = INDEX.get(glyph);
    if (idx === undefined || col < 0 || row < 0 || col >= cols || row >= rows) return;
    ctx.globalAlpha = alpha;
    ctx.drawImage(atlas[tone], idx * tw, 0, tw, th, Math.round(col * cw * dpr), Math.round(row * ch * dpr), tw, th);
  };
};
