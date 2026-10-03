import { useEffect, useRef } from 'react';
import { LOGO_ART, NETWORKS_ART } from '@/lib/asciiArt';

// Block-letter wordmark rendered as real text. Characters start as noise and decode
// left-to-right; afterwards a bright scan sweeps across and rows occasionally glitch
// sideways in pink or blue.

const CANVAS_H = 270;
const MAX_FS = 17;
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
    const netCols = NETWORKS_ART[0].length;
    // NETWORKS uses the same font, scaled so its width matches the logo's
    const netScale = Math.min(1, logoCols / netCols);
    let w = 0;
    let fs = MAX_FS;
    let raf = 0;

    interface Metrics { fs: number; cw: number; lh: number; ascent: number }
    const measure = (size: number): Metrics => {
      ctx.font = `${size}px ${FONT}`;
      const m = ctx.measureText('█');
      const ascent = m.fontBoundingBoxAscent ?? size * 0.95;
      return { fs: size, cw: m.width, ascent, lh: ascent + (m.fontBoundingBoxDescent ?? size * 0.3) };
    };
    const blockHeight = (size: number) => {
      const a = measure(size);
      const b = measure(size * netScale);
      return LOGO_ART.length * a.lh + (showNetworks ? a.lh * 0.8 + NETWORKS_ART.length * b.lh : 0);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.min(window.innerWidth - 24, 760);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${CANVAS_H}px`;
      canvas.width = w * dpr;
      canvas.height = CANVAS_H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // fit the logo columns (font advance ~0.6em), then shrink further if the block is too tall
      fs = Math.min(MAX_FS, w / (logoCols * 0.6));
      const hgt = blockHeight(fs);
      if (hgt > CANVAS_H) fs *= CANVAS_H / hgt;
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
      { cw, lh, ascent }: Metrics,
    ) => {
      const cols = art[0].length;
      const glitchRow = glitch && !reduceMotion && t % 4.5 > 4.3 && t > DECODE_S + 1 ? Math.floor(hash(Math.floor(t / 4.5)) * art.length) : -1;
      const shift = hash(Math.floor(t / 4.5) + 9) > 0.5 ? 2 : -2;
      const gColor = hash(Math.floor(t / 4.5) + 4) > 0.5 ? PINK : BLUE;
      const sweep = reduceMotion ? -99 : ((t - DECODE_S) % 6) * 28 - 10; // moving highlight column

      art.forEach((line, row) => {
        for (let col = 0; col < line.length; col++) {
          const ch = line[col];
          if (ch === ' ') continue;
          const id = seed + row * 100 + col;
          const resolveAt = delay + (col / cols) * 0.9 + hash(id) * 0.35;
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
      ctx.textBaseline = 'alphabetic';

      const m1 = measure(fs);
      const m2 = measure(fs * netScale);
      const gap = showNetworks ? m1.lh * 0.8 : 0;
      const total = LOGO_ART.length * m1.lh + (showNetworks ? gap + NETWORKS_ART.length * m2.lh : 0);
      const top = Math.max(0, (CANVAS_H - total) / 2);

      ctx.font = `${m1.fs}px ${FONT}`;
      drawArt(LOGO_ART, (w - logoCols * m1.cw) / 2, top, t, 0, 0, () => WHITE, true, m1);

      if (showNetworks) {
        const netY = top + LOGO_ART.length * m1.lh + gap;
        const netX = (w - netCols * m2.cw) / 2;
        ctx.font = `${m2.fs}px ${FONT}`;
        drawArt(NETWORKS_ART, netX, netY, t, 5000, 0.9, () => GREEN, false, m2);
        // blinking block cursor after the last letter
        if (t > DECODE_S + 0.9 && Math.floor(t * 1.8) % 2 === 0) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = GREEN;
          ctx.fillRect(netX + netCols * m2.cw + m2.cw, netY + (NETWORKS_ART.length - 1) * m2.lh, m2.cw * 1.2, m2.lh);
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
