import { useEffect, useMemo, useRef } from 'react';
import { useOSStore } from '@/store/useOSStore';
import { usePinnedRepos } from '@/hooks/usePinnedRepos';
import { buildMesh, drawMesh, hitTest, layoutMesh, MeshSim, type MeshLayout } from '@/lib/mesh';
import { buildAtlas, makePainter, makePalette, RAMP, NOISE, type Tone } from '@/lib/glyphAtlas';
import { getPrimaryHex } from '@/lib/theme';

// Living ASCII backdrop. A rolling plasma is mapped onto a density ramp of characters and a
// mesh network (the pinned repos as named nodes) hums on top of it: packets hop along links,
// nodes pulse and report a simulated signal strength. The pointer leaves a wake, clicks send a
// shockwave, and clicking a node opens it in the Mesh Map.

const FRAME_MS = 1000 / 30;
const MATRIX_CHARS = '0123456789ABCDEF<>[]{}/\\|$%#&*+=?!';

const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const AsciiField = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useOSStore((s) => s.theme);
  const reduceMotion = useOSStore((s) => s.reduceMotion);
  const { repos } = usePinnedRepos();
  const mesh = useMemo(() => buildMesh(repos), [repos]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const sim = new MeshSim(mesh);
    let layout: MeshLayout | null = null;
    let atlas: ReturnType<typeof buildAtlas> | null = null;
    let put: ReturnType<typeof makePainter> | null = null;
    let w = 0, h = 0, dpr = 1, cw = 10, ch = 18, cols = 0, rows = 0;
    let raf = 0, last = 0, frameMs = reduceMotion ? 1000 / 6 : FRAME_MS, slowEma = 0;
    let hover = -1;
    let drops: number[] = [];
    const pointer = { x: -9999, y: -9999 };
    const waves: { x: number; y: number; born: number; tone: Tone }[] = [];

    const rebuild = () => {
      atlas = buildAtlas(cw, ch, dpr, makePalette(getPrimaryHex()));
      put = makePainter(ctx, atlas, cw, ch, dpr, cols, rows);
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      cw = w < 640 ? 8 : 10;
      ch = w < 640 ? 15 : 18;
      cols = Math.ceil(w / cw);
      rows = Math.ceil(h / ch);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      layout = layoutMesh(mesh, cols, rows);
      drops = Array.from({ length: cols }, () => Math.floor(Math.random() * rows));
      rebuild();
      draw(performance.now());
    };

    const drawMatrix = (now: number) => {
      if (!put) return;
      const k = useOSStore.getState().fieldIntensity / 100;
      for (let i = 0; i < cols; i++) {
        drops[i] += 0.5 + hash(i) * 0.6;
        if (drops[i] - 18 > rows && Math.random() > 0.97) drops[i] = -Math.floor(Math.random() * 12);
        const head = Math.floor(drops[i]);
        for (let t = 0; t < 18; t++) {
          const row = head - t;
          if (row < 0 || row >= rows) continue;
          const g = MATRIX_CHARS[Math.floor(hash(i * 13 + row * 7 + Math.floor(now / 90)) * MATRIX_CHARS.length)];
          put(g, i, row, t === 0 ? 'gray' : 'green', (t === 0 ? 0.95 : 0.7 * (1 - t / 18)) * Math.max(0.35, k));
        }
      }
    };

    const draw = (now: number) => {
      if (!put || !layout) return;
      const st = useOSStore.getState();
      const k = st.fieldIntensity / 100;
      const t = reduceMotion ? 0 : now / 1000;
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (k <= 0) return;

      if (st.matrixUntil > Date.now()) {
        drawMatrix(now);
        ctx.globalAlpha = 1;
        return;
      }

      const pc = pointer.x / cw;
      const pr = pointer.y / ch;
      for (let j = 0; j < rows; j++) {
        const ny = j / rows;
        for (let i = 0; i < cols; i++) {
          const nx = i / cols;
          let v =
            0.5 +
            0.26 * Math.sin(nx * 9 + t * 0.5 + Math.sin(ny * 4 + t * 0.3) * 1.8) +
            0.24 * Math.sin(ny * 11 - t * 0.4 + nx * 3);
          v *= 0.25 + 0.75 * ny;

          const dx = i - pc;
          const dy = (j - pr) * 1.8;
          const d2 = dx * dx + dy * dy;
          let tone: Tone = v > 0.5 ? 'green' : 'gray';
          if (d2 < 130) {
            v += (1 - d2 / 130) * 0.7;
            tone = 'green';
          }
          for (const wv of waves) {
            const age = (now - wv.born) / 1000;
            const band = Math.abs(Math.hypot(i - wv.x, (j - wv.y) * 1.8) - age * 38);
            if (band < 2.2) {
              v += (1 - band / 2.2) * (1 - age / 1.4) * 0.9;
              tone = wv.tone;
            }
          }

          v = Math.max(0, Math.min(0.999, v));
          const idx = Math.floor(v * RAMP.length);
          if (idx === 0) continue;
          const rnd = hash(i * 31.7 + j * 17.3 + Math.floor(t * 3));
          if (v > 0.7 && rnd > 0.985) {
            put(NOISE[Math.floor(hash(i + j * 7 + Math.floor(t * 6)) * NOISE.length)], i, j, rnd > 0.993 ? 'pink' : 'blue', 0.6 * k);
            continue;
          }
          // plasma stays quieter than the mesh so nodes and labels read clearly
          put(RAMP[idx], i, j, tone, (0.06 + 0.3 * v) * k);
        }
      }

      sim.step(now, layout, reduceMotion ? 0 : 1);
      drawMesh(put, mesh, layout, sim, {
        alpha: Math.max(0.35, k),
        hover: st.isBooting ? -1 : hover,
        selected: st.isBooting ? -1 : mesh.nodes.findIndex((n) => n.id === st.selectedNode),
        now,
      });

      for (let n = waves.length - 1; n >= 0; n--) if (now - waves[n].born > 1400) waves.splice(n, 1);
      ctx.globalAlpha = 1;
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < frameMs) return;
      last = now;
      const t0 = performance.now();
      draw(now);
      // back off the frame rate if drawing is too slow for this device
      slowEma = slowEma * 0.9 + (performance.now() - t0) * 0.1;
      if (!reduceMotion) {
        if (slowEma > 20) frameMs = 1000 / 15;
        else if (slowEma > 12) frameMs = 1000 / 20;
      }
    };

    const overUI = (e: PointerEvent) => (e.target as HTMLElement | null)?.closest?.('[data-os-ui]') != null;

    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      const booting = useOSStore.getState().isBooting;
      hover = !booting && layout && !overUI(e) ? hitTest(mesh, layout, Math.floor(e.clientX / cw), Math.floor(e.clientY / ch)) : -1;
      document.body.style.cursor = hover >= 0 ? 'pointer' : '';
    };

    const onDown = (e: PointerEvent) => {
      if (overUI(e)) return;
      const st = useOSStore.getState();
      if (!st.isBooting && layout) {
        const hit = hitTest(mesh, layout, Math.floor(e.clientX / cw), Math.floor(e.clientY / ch));
        if (hit >= 0) {
          st.selectNode(mesh.nodes[hit].id);
          st.openWindow('mesh', 'MESH_MAP');
        }
      }
      waves.push({ x: e.clientX / cw, y: e.clientY / ch, born: performance.now(), tone: Math.random() > 0.5 ? 'pink' : 'blue' });
    };

    resize();
    window.addEventListener('resize', resize);
    document.fonts?.ready.then(() => {
      rebuild();
      draw(performance.now());
    });
    // reduced motion: the field holds still (and redraws slowly) but nodes stay hoverable/clickable
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerdown', onDown);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.cursor = '';
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [mesh, theme, reduceMotion]);

  return <canvas ref={canvasRef} aria-hidden="true" className="fixed inset-0 w-full h-full z-0 pointer-events-none" />;
};

export default AsciiField;
