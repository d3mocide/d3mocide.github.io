import { useEffect, useRef } from 'react';

// Slow, drifting dot-matrix "terrain" that replaces the matrix rain. Dots swell and
// brighten along rolling bands, react to the pointer, and a few rare crests pick up
// the pink/blue accents from the palette.

const BG = '#050505';
const FRAME_MS = 1000 / 30;

const DotField = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0;
    let h = 0;
    let pitch = 22;
    let raf = 0;
    let last = 0;
    const pointer = { x: -9999, y: -9999 };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      pitch = w < 640 ? 18 : 22;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(performance.now());
    };

    const draw = (now: number) => {
      const t = reduceMotion ? 0 : now / 1000;
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, w, h);

      const cols = Math.ceil(w / pitch) + 1;
      const rows = Math.ceil(h / pitch) + 1;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const x = i * pitch;
          const y = j * pitch;
          const nx = i / cols;
          const ny = j / rows;

          // rolling bands, brighter toward the bottom like ground fading into sky
          let v =
            0.5 +
            0.25 * Math.sin(nx * 7 + t * 0.35 + Math.sin(ny * 3 + t * 0.2) * 1.6) +
            0.25 * Math.sin(ny * 9 - t * 0.28 + nx * 2.5);
          v = v * (0.45 + 0.55 * ny);

          // pointer ripple
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 22500) v += (1 - d2 / 22500) * 0.55;

          v = Math.max(0, Math.min(1, v));
          const r = pitch * (0.06 + 0.3 * v * v);

          let color: string;
          const a = 0.06 + 0.5 * v * v * v;
          const tint = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
          const rare = tint - Math.floor(tint);
          if (v > 0.72 && rare > 0.965) color = `rgba(255,0,85,${a + 0.2})`;
          else if (v > 0.72 && rare > 0.93) color = `rgba(0,184,255,${a + 0.2})`;
          else if (v > 0.55) color = `rgba(0,255,65,${a})`;
          else color = `rgba(170,185,175,${a * 0.9})`;

          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, 6.2832);
          ctx.fill();
        }
      }
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < FRAME_MS) return;
      last = now;
      draw(now);
    };

    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    };

    resize();
    window.addEventListener('resize', resize);
    if (!reduceMotion) {
      window.addEventListener('pointermove', onMove);
      raf = requestAnimationFrame(loop);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="fixed inset-0 w-full h-full z-0 pointer-events-none" />;
};

export default DotField;
