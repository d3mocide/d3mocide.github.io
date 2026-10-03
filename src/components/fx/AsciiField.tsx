import { useEffect, useRef } from 'react';

// Living ASCII backdrop. A rolling plasma is mapped onto a density ramp of characters,
// the pointer pushes a glowing wake through it, clicks send out a shockwave ring, and
// every few seconds a word (MESH, LORA, 0xDEAD...) drifts across a row and decodes.

const RAMP = ' .:-=+*#%@';
const WORDS = ['d3FRAG', 'MESH', 'LORA', 'RF', 'SIGINT', 'FIRMWARE', 'NODE_07', '0xDEADBEEF', 'PING', 'ROOT', '1337', 'UPLINK', 'SYN/ACK'];
const NOISE = '01<>[]{}/\\|$%#&*+=?!';
const COLORS = { green: '#00ff41', gray: '#aab5ab', pink: '#ff0055', blue: '#00B8FF', yellow: '#FCEE0C' } as const;
type Tone = keyof typeof COLORS;
const CHARSET = RAMP + NOISE + 'dFRAGMESHLOPIUNTDB_/7x';
const FRAME_MS = 1000 / 30;
const FONT = '"JetBrains Mono", ui-monospace, Menlo, monospace';

interface Word {
  text: string;
  row: number;
  x: number;
  speed: number;
  born: number;
  tone: Tone;
}

const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const AsciiField = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let cw = 10; // cell width, css px
    let ch = 18; // cell height, css px
    let cols = 0;
    let rows = 0;
    let raf = 0;
    let last = 0;
    let nextWord = 0;
    let atlas: Record<Tone, HTMLCanvasElement> | null = null;
    const glyphIndex = new Map<string, number>();
    [...CHARSET].forEach((c, i) => glyphIndex.set(c, i));
    const words: Word[] = [];
    const pointer = { x: -9999, y: -9999 };
    const waves: { x: number; y: number; born: number; tone: Tone }[] = [];

    // pre-render every glyph once per colour so each frame is just cheap blits
    const buildAtlas = () => {
      const fs = ch * 0.78;
      const built = {} as Record<Tone, HTMLCanvasElement>;
      (Object.keys(COLORS) as Tone[]).forEach((tone) => {
        const a = document.createElement('canvas');
        a.width = Math.ceil(cw * dpr) * CHARSET.length;
        a.height = Math.ceil(ch * dpr);
        const c = a.getContext('2d')!;
        c.scale(dpr, dpr);
        c.font = `${fs}px ${FONT}`;
        c.textBaseline = 'middle';
        c.textAlign = 'center';
        c.fillStyle = COLORS[tone];
        [...CHARSET].forEach((g, i) => c.fillText(g, (i * Math.ceil(cw * dpr)) / dpr + cw / 2, ch / 2 + 1));
        built[tone] = a;
      });
      atlas = built;
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
      buildAtlas();
      draw(performance.now());
    };

    const put = (g: string, col: number, row: number, tone: Tone, alpha: number) => {
      const idx = glyphIndex.get(g);
      if (idx === undefined || !atlas || col < 0 || row < 0 || col >= cols || row >= rows) return;
      const tw = Math.ceil(cw * dpr);
      ctx.globalAlpha = alpha;
      ctx.drawImage(atlas[tone], idx * tw, 0, tw, Math.ceil(ch * dpr), Math.round(col * cw * dpr), Math.round(row * ch * dpr), tw, Math.ceil(ch * dpr));
    };

    const draw = (now: number) => {
      const t = reduceMotion ? 0 : now / 1000;
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const pc = pointer.x / cw;
      const pr = pointer.y / ch;

      for (let j = 0; j < rows; j++) {
        const ny = j / rows;
        for (let i = 0; i < cols; i++) {
          const nx = i / cols;
          // plasma, fading toward the top so the logo area stays calm
          let v =
            0.5 +
            0.26 * Math.sin(nx * 9 + t * 0.5 + Math.sin(ny * 4 + t * 0.3) * 1.8) +
            0.24 * Math.sin(ny * 11 - t * 0.4 + nx * 3);
          v *= 0.25 + 0.75 * ny;

          // pointer wake
          const dx = i - pc;
          const dy = (j - pr) * 1.8;
          const d2 = dx * dx + dy * dy;
          let tone: Tone = v > 0.5 ? 'green' : 'gray';
          if (d2 < 130) {
            v += (1 - d2 / 130) * 0.7;
            tone = 'green';
          }

          // click shockwaves
          for (const wv of waves) {
            const age = (now - wv.born) / 1000;
            const radius = age * 38;
            const dist = Math.hypot(i - wv.x, (j - wv.y) * 1.8);
            const band = Math.abs(dist - radius);
            if (band < 2.2) {
              v += (1 - band / 2.2) * (1 - age / 1.4) * 0.9;
              tone = wv.tone;
            }
          }

          v = Math.max(0, Math.min(0.999, v));
          const k = Math.floor(v * RAMP.length);
          if (k === 0) continue;

          // rare accent glyphs flickering inside bright areas
          const rnd = hash(i * 31.7 + j * 17.3 + Math.floor(t * 3));
          if (v > 0.7 && rnd > 0.985) {
            put(NOISE[Math.floor(hash(i + j * 7 + Math.floor(t * 6)) * NOISE.length)], i, j, rnd > 0.993 ? 'pink' : 'blue', 0.6);
            continue;
          }
          put(RAMP[k], i, j, tone, 0.07 + 0.38 * v);
        }
      }

      // drifting words
      for (let n = words.length - 1; n >= 0; n--) {
        const wd = words[n];
        const age = (now - wd.born) / 1000;
        const x = wd.x + age * wd.speed;
        if (x > cols + 12 || age > 14) {
          words.splice(n, 1);
          continue;
        }
        const fade = Math.min(1, age / 0.6, (14 - age) / 1.5);
        [...wd.text].forEach((c, idx) => {
          const resolved = age * 14 > idx + 2;
          const g = resolved ? c : NOISE[Math.floor(hash(idx + n * 5 + Math.floor(now / 70)) * NOISE.length)];
          put(g, Math.floor(x) + idx, wd.row, resolved ? wd.tone : 'gray', 0.85 * fade);
        });
      }
      for (let n = waves.length - 1; n >= 0; n--) if (now - waves[n].born > 1400) waves.splice(n, 1);
      ctx.globalAlpha = 1;
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < FRAME_MS) return;
      last = now;
      if (now > nextWord && words.length < 3) {
        nextWord = now + 2500 + Math.random() * 4000;
        const tones: Tone[] = ['green', 'blue', 'pink', 'yellow', 'green'];
        words.push({
          text: WORDS[Math.floor(Math.random() * WORDS.length)],
          row: Math.floor(rows * (0.12 + Math.random() * 0.8)),
          x: -8,
          speed: 5 + Math.random() * 7,
          born: now,
          tone: tones[Math.floor(Math.random() * tones.length)],
        });
      }
      draw(now);
    };

    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    };
    const onDown = (e: PointerEvent) => {
      waves.push({ x: e.clientX / cw, y: e.clientY / ch, born: performance.now(), tone: Math.random() > 0.5 ? 'pink' : 'blue' });
    };

    resize();
    window.addEventListener('resize', resize);
    // webfont may land after the first atlas build; rebuild once it's ready
    document.fonts?.ready.then(() => {
      buildAtlas();
      draw(performance.now());
    });
    if (!reduceMotion) {
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerdown', onDown);
      raf = requestAnimationFrame(loop);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="fixed inset-0 w-full h-full z-0 pointer-events-none" />;
};

export default AsciiField;
