import { useEffect, useRef } from 'react';
import { layoutText } from '@/lib/dotFont';

// Dot-matrix wordmark. Dots start scattered and dim, then snap into place; afterwards
// they shimmer, and every few seconds one row slips sideways in pink or blue.

const GREEN = '#00ff41';
const WHITE = '#e5e5e5';
const PINK = '#ff0055';
const BLUE = '#00B8FF';
const CANVAS_H = 220;
const ASSEMBLE_S = 1.6;

const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

interface DotLogoProps {
  showNetworks?: boolean;
}

const DotLogo = ({ showNetworks = true }: DotLogoProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const logo = layoutText('d3FRAG', 1);
    const net = layoutText('NETWORKS', 2);
    const start = performance.now();
    let w = 0;
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.min(window.innerWidth - 32, 720);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${CANVAS_H}px`;
      canvas.width = w * dpr;
      canvas.height = CANVAS_H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const dot = (x: number, y: number, r: number, color: string, alpha: number) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 6.2832);
      ctx.fill();
    };

    const draw = (now: number) => {
      const t = reduceMotion ? 99 : (now - start) / 1000;
      ctx.clearRect(0, 0, w, CANVAS_H);

      const p = Math.min(18, w / (logo.cols + 4));
      const np = showNetworks ? p * 0.42 : 0;
      const gap = showNetworks ? p * 1.3 : 0;
      const blockH = logo.rows * p + (showNetworks ? gap + net.rows * np : 0);
      const top = (CANVAS_H - blockH) / 2;

      // which logo row is glitching right now (if any)
      const slot = Math.floor(t / 4);
      const inGlitch = !reduceMotion && t % 4 > 3.82 && t > ASSEMBLE_S + 1;
      const glitchRow = inGlitch ? Math.floor(hash(slot) * logo.rows) : -1;
      const glitchShift = hash(slot + 9) > 0.5 ? 1 : -1;
      const glitchColor = hash(slot + 4) > 0.5 ? PINK : BLUE;

      const block = (
        cells: typeof logo.cells,
        cols: number,
        rows: number,
        pitch: number,
        x0: number,
        y0: number,
        baseColor: (glyph: number) => string,
        seed: number,
        glitch: boolean,
      ) => {
        const r0 = pitch * 0.4;
        // faint ghost grid behind the letters
        for (let row = 0; row < rows; row++)
          for (let col = 0; col < cols; col++)
            dot(x0 + col * pitch, y0 + row * pitch, pitch * 0.09, '#9aa59c', 0.1);

        cells.forEach((c, k) => {
          const id = seed + k;
          const delay = hash(id) * 0.8;
          const prog = Math.max(0, Math.min(1, (t - delay) / (ASSEMBLE_S - 0.8)));
          const ease = 1 - Math.pow(1 - prog, 3);
          const scatter = (1 - ease) * pitch * 6;
          let col = c.col;
          let color = baseColor(c.glyph);
          if (glitch && c.row === glitchRow) {
            col += glitchShift;
            color = glitchColor;
          }
          const fleck = hash(id + 0.5);
          if (fleck > 0.97) color = PINK;
          else if (fleck > 0.94) color = BLUE;

          const x = x0 + col * pitch + (hash(id + 1) - 0.5) * scatter;
          const y = y0 + c.row * pitch + (hash(id + 2) - 0.5) * scatter;
          const shimmer = 0.92 + 0.08 * Math.sin(t * 2.2 + hash(id + 3) * 6.28);
          dot(x, y, r0 * (0.35 + 0.65 * ease) * shimmer, color, 0.15 + 0.85 * ease);
        });
      };

      const logoW = (logo.cols - 1) * p;
      block(logo.cells, logo.cols, logo.rows, p, (w - logoW) / 2, top, (g) => (g < 2 ? GREEN : WHITE), 0, true);

      if (showNetworks) {
        const netW = (net.cols - 1) * np;
        block(net.cells, net.cols, net.rows, np, (w - netW) / 2, top + logo.rows * p + gap, () => GREEN, 1000, false);
      }
      ctx.globalAlpha = 1;
    };

    const loop = (now: number) => {
      draw(now);
      raf = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener('resize', resize);
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

export default DotLogo;
