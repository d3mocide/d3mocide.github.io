import { useEffect, useRef } from 'react';
import { LOGO_ART, LOGO_ACCENT_COLS, NETWORKS_ART } from '@/lib/asciiArt';

// Block-letter wordmark rendered as real text. Characters start as noise and decode
// left-to-right; afterwards a bright scan sweeps across and rows occasionally glitch
// sideways in pink or blue.

const CANVAS_H = 250;
const MAX_FS = 18;
const DECODE_S = 1.4;
const FONT = '"JetBrains Mono", ui-monospace, Menlo, monospace';
const NOISE = '01<>[]{}/\\|$%#&*+=?!░▒▓';
const GREEN = '#00ff41';
const WHITE = '#e5e5e5';
const PINK = '#ff0055';
const BLUE = '#00B8FF';
const FLASH = '#ffffff';

const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

interface AsciiLogoProps {
  showNetworks?: boolean;
}

const AsciiLogo = ({ showNetworks = true }: AsciiLogoProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const logoCols = LOGO_ART[0].length;
    const start = performance.now();
    let w = 0;
    let fs = MAX_FS;
    let cw = 0;
    let lh = 0;
    let ascent = 0;
    let raf = 0;

    const measure = () => {
      ctx.font = `${fs}px ${FONT}`;
      const m = ctx.measureText('█');
      cw = m.width;
      ascent = m.fontBoundingBoxAscent ?? fs * 0.95;
      lh = (m.fontBoundingBoxAscent ?? fs * 0.95) + (m.fontBoundingBoxDescent ?? fs * 0.3);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.min(window.innerWidth - 24, 760);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${CANVAS_H}px`;
      canvas.width = w * dpr;
      canvas.height = CANVAS_H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // fit the 49-column logo (font advance ~0.6em), then shrink further if the block is too tall
      fs = Math.min(MAX_FS, w / (logoCols * 0.6));
      measure();
      const rowsTotal = LOGO_ART.length + (showNetworks ? NETWORKS_ART.length + 1 : 0);
      if (rowsTotal * lh > CANVAS_H) {
        fs *= CANVAS_H / (rowsTotal * lh);
        measure();
      }
    };

    const drawArt = (
      art: string[],
      x0: number,
      y0: number,
      t: number,
      seed: number,
      delay: number,
      color: (col: number) => string,
      glitch: boolean,
    ) => {
      const glitchRow = glitch && !reduceMotion && t % 4.5 > 4.3 && t > DECODE_S + 1 ? Math.floor(hash(Math.floor(t / 4.5)) * art.length) : -1;
      const shift = hash(Math.floor(t / 4.5) + 9) > 0.5 ? 2 : -2;
      const gColor = hash(Math.floor(t / 4.5) + 4) > 0.5 ? PINK : BLUE;
      const sweep = reduceMotion ? -99 : ((t - DECODE_S) % 6) * 28 - 10; // moving highlight column

      art.forEach((line, row) => {
        for (let col = 0; col < line.length; col++) {
          const ch = line[col];
          if (ch === ' ') continue;
          const id = seed + row * 100 + col;
          const resolveAt = delay + (col / logoCols) * 0.9 + hash(id) * 0.35;
          let g = ch;
          let fill = color(col);
          let alpha = ch === '█' ? 1 : 0.62; // shadow strokes sit back a little
          if (t < resolveAt) {
            g = NOISE[Math.floor(hash(id + Math.floor(t * 18)) * NOISE.length)];
            fill = GREEN;
            alpha = 0.35;
          } else if (t < resolveAt + 0.12) {
            fill = FLASH;
            alpha = 1;
          } else if (Math.abs(col - sweep) < 2.5) {
            fill = FLASH;
            alpha = 1;
          }
          let x = x0 + col * cw;
          if (row === glitchRow) {
            x += shift * cw;
            fill = gColor;
            alpha = 1;
          }
          ctx.globalAlpha = alpha;
          ctx.fillStyle = fill;
          if (g === '█') ctx.fillRect(Math.floor(x), y0 + row * lh, Math.ceil(cw) + 0.5, lh + 0.5);
          else ctx.fillText(g, x, y0 + row * lh + ascent);
        }
      });
    };

    const draw = (now: number) => {
      const t = reduceMotion ? 99 : (now - start) / 1000;
      ctx.clearRect(0, 0, w, CANVAS_H);
      ctx.font = `${fs}px ${FONT}`;
      ctx.textBaseline = 'alphabetic';

      const rowsTotal = LOGO_ART.length + (showNetworks ? NETWORKS_ART.length + 1 : 0);
      const top = Math.max(0, (CANVAS_H - rowsTotal * lh) / 2);
      const logoX = (w - logoCols * cw) / 2;
      drawArt(LOGO_ART, logoX, top, t, 0, 0, (col) => (col < LOGO_ACCENT_COLS ? GREEN : WHITE), true);

      if (showNetworks) {
        const netCols = NETWORKS_ART[0].length;
        const netY = top + (LOGO_ART.length + 1) * lh;
        const netX = (w - netCols * cw) / 2;
        drawArt(NETWORKS_ART, netX, netY, t, 5000, 0.9, () => GREEN, false);
        // blinking block cursor
        if (t > DECODE_S + 0.9 && Math.floor(t * 1.8) % 2 === 0) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = GREEN;
          ctx.fillText('█', netX + netCols * cw + cw, netY + NETWORKS_ART.length * lh - lh + ascent);
        }
      }
      ctx.globalAlpha = 1;
    };

    const loop = (now: number) => {
      draw(now);
      raf = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener('resize', resize);
    document.fonts?.ready.then(() => {
      resize();
      if (reduceMotion) draw(performance.now());
    });
    if (reduceMotion) draw(performance.now());
    else raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [showNetworks]);

  return (
    <>
      <h1 className="sr-only">d3FRAG {showNetworks ? 'Networks' : ''}</h1>
      <canvas ref={canvasRef} aria-hidden="true" />
    </>
  );
};

export default AsciiLogo;
