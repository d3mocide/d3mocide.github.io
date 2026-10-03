import { useCallback, useEffect, useRef, useState } from 'react';
import { useOSStore } from '@/store/useOSStore';
import { useSoundFX } from '@/hooks/useSoundFX';
import { getPrimaryHex } from '@/lib/theme';
import { TextButton } from '@/components/ascii/primitives';
import { BANDS, FIELD_H, FIELD_W, GLYPHS, Invaders as Engine, type Band, type Input, type InvaderKind } from '@/lib/invaders';

// JAM_INVADERS: defend the mesh from a wave of jammers, with a radio twist. Every jammer sits on
// one of three real LoRa bands and you can only be tuned to one: your shots pass straight
// through anything on another channel. Stay on a channel to build a LOCK multiplier; retuning
// or missing breaks it.
//   ←/→ or A/D move · Space fires · 1/2/3 (or ↑/↓, Q/E) tune · P pauses

const HI_KEY = 'd3os.invaders.hi';
const BAND_COLOR = ['#00B8FF', '#FCEE0C', '#ff0055'] as const;
const RED = '#FF003C';
const MARCH_NOTES = [110, 98, 87, 82];
const TUNE_TONES = [440, 587, 784];

const readHi = () => { try { return Number(localStorage.getItem(HI_KEY)) || 0; } catch { return 0; } };
const writeHi = (n: number) => { try { localStorage.setItem(HI_KEY, String(n)); } catch { /* storage unavailable */ } };
const pad = (n: number, w = 5) => String(n).padStart(w, '0');
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

type Phase = 'ready' | 'playing' | 'paused' | 'over';
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string }
interface Pop { x: number; y: number; text: string; life: number; color: string }

const FONT = '"JetBrains Mono", ui-monospace, Menlo, monospace';
const SCALE = 4; // sprites are baked at 4x and scaled down for a crisp glow

/** Bake a text sprite (one string per line) into an offscreen canvas, w x h field units. */
const bakeText = (lines: readonly string[], color: string, w: number, h: number, fontPx: number) => {
  const c = document.createElement('canvas');
  c.width = w * SCALE;
  c.height = h * SCALE;
  const x = c.getContext('2d')!;
  x.font = `bold ${fontPx * SCALE}px ${FONT}`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillStyle = color;
  x.shadowColor = color;
  x.shadowBlur = 6;
  const lh = c.height / lines.length;
  lines.forEach((l, i) => x.fillText(l, c.width / 2, lh * (i + 0.5)));
  return c;
};

const Invaders = () => {
  const theme = useOSStore((s) => s.theme);
  const isActive = useOSStore((s) => s.activeWindowId === 'invaders');
  const { playClick, playError, playTone } = useSoundFX();

  const rootRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Engine | null>(null);
  const phaseRef = useRef<Phase>('ready');
  const input = useRef<Input>({ left: false, right: false, fire: false });
  const sfx = useRef({ playTone, playError, playClick });
  sfx.current = { playTone, playError, playClick };

  const [phase, setPhaseState] = useState<Phase>('ready');
  const [hud, setHud] = useState({ score: 0, lives: 3, wave: 1, band: 1 as Band, combo: 0, mult: 1 });
  const [hi, setHi] = useState(readHi);
  const [fresh, setFresh] = useState(false);

  const setPhase = useCallback((p: Phase) => { phaseRef.current = p; setPhaseState(p); }, []);

  const start = useCallback(() => {
    gameRef.current = new Engine();
    input.current = { left: false, right: false, fire: false };
    setHud({ score: 0, lives: 3, wave: 1, band: 1, combo: 0, mult: 1 });
    setFresh(false);
    setPhase('playing');
  }, [setPhase]);

  const togglePause = useCallback(() => {
    input.current = { left: false, right: false, fire: false };
    if (phaseRef.current === 'playing') setPhase('paused');
    else if (phaseRef.current === 'paused') setPhase('playing');
  }, [setPhase]);

  const tune = useCallback((b: Band) => { if (phaseRef.current === 'playing') gameRef.current?.setBand(b); }, []);
  const cycle = useCallback((d: 1 | -1) => { if (phaseRef.current === 'playing') gameRef.current?.cycleBand(d); }, []);

  // Pause when the window loses focus / tab hidden; take keyboard focus when brought forward.
  useEffect(() => {
    if (!isActive && phaseRef.current === 'playing') setPhase('paused');
    if (isActive) rootRef.current?.focus({ preventScroll: true });
    if (!isActive) input.current = { left: false, right: false, fire: false };
  }, [isActive, setPhase]);
  useEffect(() => {
    const onHide = () => { if (document.hidden && phaseRef.current === 'playing') setPhase('paused'); };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [setPhase]);

  // Keyboard
  useEffect(() => {
    if (!isActive) return;
    const set = (e: KeyboardEvent, down: boolean) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      switch (e.code) {
        case 'ArrowLeft': case 'KeyA': input.current.left = down; break;
        case 'ArrowRight': case 'KeyD': input.current.right = down; break;
        case 'Space':
          if (phaseRef.current === 'ready' || phaseRef.current === 'over') { if (down) start(); }
          else input.current.fire = down;
          break;
        case 'Digit1': case 'Digit2': case 'Digit3':
          if (down) tune((Number(e.code.slice(5)) - 1) as Band);
          break;
        case 'ArrowUp': case 'KeyE': if (down) cycle(1); break;
        case 'ArrowDown': case 'KeyQ': if (down) cycle(-1); break;
        case 'Enter':
          if (!down) return;
          if (phaseRef.current === 'ready' || phaseRef.current === 'over') start(); else togglePause();
          break;
        case 'KeyP': case 'Escape':
          if (down) togglePause();
          break;
        default: return;
      }
      e.preventDefault();
    };
    const dn = (e: KeyboardEvent) => set(e, true);
    const up = (e: KeyboardEvent) => set(e, false);
    window.addEventListener('keydown', dn);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up); };
  }, [isActive, start, togglePause, tune, cycle]);

  // Loop + render
  useEffect(() => {
    const canvas = canvasRef.current;
    const box = boxRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !box || !ctx) return;
    if (!gameRef.current) gameRef.current = new Engine();

    const PRIMARY = getPrimaryHex();
    type Sprites = Record<InvaderKind, HTMLCanvasElement[][]>; // [band][frame]
    let art: Sprites;
    let ufoArt: HTMLCanvasElement;
    const bakeAll = () => {
      const kinds: InvaderKind[] = ['squid', 'crab', 'octopus'];
      art = {} as Sprites;
      for (const k of kinds) art[k] = BAND_COLOR.map((col) => GLYPHS[k].map((lines) => bakeText(lines, col, 13, 12, 7)));
      ufoArt = bakeText(GLYPHS.ufo[0], RED, 26, 9, 8);
    };
    bakeAll();
    document.fonts?.ready.then(bakeAll); // re-bake once the real mono font has loaded

    let W = 0, H = 0, dpr = 1;
    let raf = 0, last = performance.now();
    let particles: Particle[] = [];
    let pops: Pop[] = [];
    let march = 0;
    let shake = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = box.clientWidth;
      H = box.clientHeight;
      canvas.width = Math.max(1, Math.floor(W * dpr));
      canvas.height = Math.max(1, Math.floor(H * dpr));
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(box);
    resize();

    const burst = (x: number, y: number, color: string, n: number) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = 15 + Math.random() * 45;
        particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.35 + Math.random() * 0.4, color });
      }
    };

    const handle = (g: Engine) => {
      for (const e of g.drain()) {
        switch (e.type) {
          case 'shoot': sfx.current.playTone(700 + g.band * 160, 0.07, 'square'); break;
          case 'tune': sfx.current.playTone(TUNE_TONES[e.band], 0.09, 'triangle'); break;
          case 'kill':
            sfx.current.playTone(180 + g.combo * 12, 0.1, 'sawtooth');
            burst(e.x, e.y, BAND_COLOR[e.band], 10);
            pops.push({ x: e.x, y: e.y, text: e.mult > 1 ? `+${e.points} x${e.mult}` : `+${e.points}`, life: 0.8, color: BAND_COLOR[e.band] });
            break;
          case 'unlock':
            sfx.current.playTone(90, 0.18, 'sawtooth');
            pops.push({ x: g.playerX, y: 210, text: 'LOCK LOST', life: 0.9, color: RED });
            break;
          case 'ufo':
            sfx.current.playTone(1400, 0.25, 'triangle');
            burst(e.x, e.y, RED, 18);
            pops.push({ x: e.x, y: e.y, text: String(e.points), life: 1.1, color: RED });
            break;
          case 'hit':
            sfx.current.playError();
            burst(e.x, e.y, PRIMARY, 26);
            shake = 0.35;
            break;
          case 'march': sfx.current.playTone(MARCH_NOTES[march++ % 4], 0.05, 'square'); break;
          case 'wave': pops.push({ x: FIELD_W / 2, y: FIELD_H / 2 - 30, text: `WAVE ${e.wave}`, life: 1.6, color: PRIMARY }); break;
          case 'extra': pops.push({ x: FIELD_W / 2, y: FIELD_H - 40, text: '+1 TOWER', life: 1.4, color: '#FCEE0C' }); sfx.current.playTone(660, 0.2, 'triangle'); break;
          case 'over': break;
        }
      }
    };

    const drawSpectrum = (g: Engine, now: number) => {
      // analyzer along the floor: noise grows as the jammers descend, one peak per LoRa band
      const noise = 2 + Math.max(0, g.fy - 52) / 14;
      const bars = 56;
      const bw = (FIELD_W - 8) / bars;
      for (let i = 0; i < bars; i++) {
        const x = 4 + i * bw;
        let h = noise * (0.4 + hash(i * 3.1 + Math.floor(now / 90)) * 0.9);
        let color = PRIMARY;
        let alpha = 0.14;
        BAND_COLOR.forEach((col, b) => {
          const centre = bars * (0.2 + b * 0.3);
          const d = Math.abs(i - centre);
          if (d < 3.2) {
            const tuned = g.band === b;
            h += (tuned ? 26 : 9) * (1 - d / 3.2) * (0.75 + 0.25 * Math.sin(now / 120 + b));
            color = col;
            alpha = tuned ? 0.5 : 0.2;
          }
        });
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fillRect(x, 244 - h, bw - 0.8, h);
      }
      ctx.globalAlpha = 1;
    };

    const draw = (g: Engine, now: number, dt: number) => {
      const s = Math.min(W / FIELD_W, H / FIELD_H);
      const ox = (W - FIELD_W * s) / 2;
      const oy = (H - FIELD_H * s) / 2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const sx = shake > 0 ? (Math.random() - 0.5) * 3 : 0;
      shake = Math.max(0, shake - dt);
      ctx.setTransform(dpr * s, 0, 0, dpr * s, (ox + sx) * dpr, oy * dpr);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // frame, spectrum + ground line
      ctx.strokeStyle = PRIMARY;
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 1 / s;
      ctx.strokeRect(0.5, 0.5, FIELD_W - 1, FIELD_H - 1);
      ctx.globalAlpha = 1;
      drawSpectrum(g, now);
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = PRIMARY;
      ctx.fillRect(4, 244, FIELD_W - 8, 1);
      ctx.globalAlpha = 1;

      // firewalls
      ctx.fillStyle = PRIMARY;
      g.shields.forEach((sh, n) => {
        const x0 = g.shieldX(n);
        for (let y = 0; y < Engine.SHIELD_H; y++) {
          let run = -1;
          for (let x = 0; x <= Engine.SHIELD_W; x++) {
            const on = x < Engine.SHIELD_W && sh[y * Engine.SHIELD_W + x] === 1;
            if (on && run < 0) run = x;
            else if (!on && run >= 0) { ctx.fillRect(x0 + run, Engine.SHIELD_Y + y, x - run, 1); run = -1; }
          }
        }
      });

      // jammers: on-band ones are bright, others fade back so the targets read at a glance
      for (const i of g.invaders) {
        if (!i.alive) continue;
        const b = g.box(i);
        ctx.globalAlpha = i.band === g.band ? 1 : 0.38;
        ctx.drawImage(art[i.kind][i.band][g.frame], b.x, b.y, b.w, b.h);
      }
      ctx.globalAlpha = 1;

      // rogue AP (wideband: always hittable)
      if (g.ufo) ctx.drawImage(ufoArt, g.ufo.x - 13, Engine.UFO_Y - 1, 26, 9);

      // gateway tower, tinted to the tuned band; blinks while invulnerable
      if (g.respawn <= 0 && g.alive && (g.invuln <= 0 || Math.floor(now / 90) % 2 === 0)) {
        const col = g.tuning > 0 ? '#ffffff' : BAND_COLOR[g.band];
        const px = Math.round(g.playerX);
        const y = Engine.PLAYER_Y;
        ctx.fillStyle = col;
        ctx.fillRect(px - 6, y + 9, 13, 3); // base
        ctx.fillRect(px - 4, y + 6, 9, 3);
        ctx.fillRect(px - 1, y + 1, 3, 6); // mast
        ctx.fillRect(px, y - 2, 1, 3); // antenna
        ctx.strokeStyle = col;
        ctx.lineWidth = 0.8;
        for (const r of [3.5, 6]) {
          ctx.globalAlpha = 0.25 + 0.55 * Math.max(0, Math.sin(now / 140 - r));
          ctx.beginPath();
          ctx.arc(px + 0.5, y - 1, r, Math.PI * 1.15, Math.PI * 1.85);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      // your packet: a short sine burst in the tuned band's colour
      if (g.shot) {
        ctx.strokeStyle = BAND_COLOR[g.shot.band];
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let k = 0; k <= 8; k++) {
          const yy = g.shot.y + 4 - k;
          const xx = g.shot.x + Math.sin(k * 1.6 + now / 40) * 1.4;
          if (k === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
        }
        ctx.stroke();
      }
      // jammer noise: ragged red static
      ctx.fillStyle = RED;
      for (const b of g.bombs) {
        const z = Math.floor(b.phase) % 2;
        ctx.fillRect(Math.round(b.x) - 1 + z, Math.round(b.y), 1, 2);
        ctx.fillRect(Math.round(b.x) - z, Math.round(b.y) + 2, 1, 2);
        ctx.fillRect(Math.round(b.x) - 1 + z, Math.round(b.y) + 4, 1, 2);
      }

      // particles + popups
      for (const p of particles) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2.5));
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 1.5, 1.5);
      }
      particles = particles.filter((p) => p.life > 0);
      ctx.globalAlpha = 1;
      ctx.font = `bold 8px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      for (const p of pops) {
        p.life -= dt;
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, p.x, p.y - (1.2 - Math.min(1.2, p.life)) * 10);
      }
      pops = pops.filter((p) => p.life > 0);
      ctx.globalAlpha = 1;
    };

    let hudSig = '';
    const frame = (now: number) => {
      const g = gameRef.current!;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;

      if (phaseRef.current === 'playing') {
        g.update(dt, input.current);
        handle(g);
        const sig = `${g.score}|${g.lives}|${g.wave}|${g.band}|${g.combo}`;
        if (sig !== hudSig) { hudSig = sig; setHud({ score: g.score, lives: g.lives, wave: g.wave, band: g.band, combo: g.combo, mult: g.mult }); }
        if (!g.alive) {
          setHud({ score: g.score, lives: 0, wave: g.wave, band: g.band, combo: 0, mult: 1 });
          const prev = readHi();
          if (g.score > prev) { writeHi(g.score); setHi(g.score); setFresh(true); }
          setPhase('over');
        }
      }
      draw(g, now, phaseRef.current === 'playing' ? dt : 0);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
    // theme change re-reads the phosphor colour
  }, [setPhase, theme]);

  // Hold-to-act touch pads
  const hold = (key: keyof Input, label: string, extra = '') => (
    <button
      type="button"
      aria-label={key}
      onPointerDown={(e) => { e.preventDefault(); (e.target as HTMLElement).setPointerCapture?.(e.pointerId); if (phaseRef.current === 'playing') input.current[key] = true; }}
      onPointerUp={() => { input.current[key] = false; }}
      onPointerCancel={() => { input.current[key] = false; }}
      onLostPointerCapture={() => { input.current[key] = false; }}
      className={`h-14 border border-neon-green/40 rounded-[3px] text-neon-green text-lg active:bg-neon-green/25 select-none touch-none ${extra}`}
    >
      {label}
    </button>
  );

  return (
    <div ref={rootRef} tabIndex={-1} className="h-full flex flex-col gap-2 select-none font-mono outline-none">
      <div className="flex items-center justify-between text-xs shrink-0">
        <span className="text-neon-green">SCORE <span className="text-white">{pad(hud.score)}</span></span>
        <span className="text-neon-yellow">HI {pad(hi)}</span>
        <span className="text-neon-pink">WAVE <span className="text-white">{hud.wave}</span></span>
        <span className="text-neon-green" aria-label={`${hud.lives} towers left`}>{hud.lives > 0 ? '▲'.repeat(hud.lives) : '—'}</span>
        <button
          type="button"
          onClick={() => { playClick(); togglePause(); }}
          disabled={phase === 'ready' || phase === 'over'}
          className="text-gray-400 hover:text-white disabled:opacity-30 px-1"
          aria-label={phase === 'paused' ? 'Resume' : 'Pause'}
        >
          [{phase === 'paused' ? '▶' : 'II'}]
        </button>
      </div>

      {/* Radio: pick the channel to attack, watch the lock streak */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="flex gap-1" role="radiogroup" aria-label="Band">
          {BANDS.map((b, i) => {
            const on = hud.band === i;
            return (
              <button
                key={b.mhz}
                type="button"
                role="radio"
                aria-checked={on}
                onPointerDown={(e) => { e.preventDefault(); tune(i as Band); }}
                className="h-9 md:h-7 px-2.5 border rounded-[3px] text-xs font-bold tracking-wider transition-colors"
                style={{
                  color: on ? '#050505' : BAND_COLOR[i],
                  background: on ? BAND_COLOR[i] : 'transparent',
                  borderColor: `${BAND_COLOR[i]}${on ? '' : '66'}`,
                }}
              >
                {b.mhz}
              </button>
            );
          })}
        </div>
        <div className="text-[11px] text-right leading-tight">
          <span className="text-gray-500">LOCK </span>
          <span style={{ color: BAND_COLOR[hud.band] }}>{'▮'.repeat(hud.combo % 4)}<span className="text-gray-700">{'▯'.repeat(3 - (hud.combo % 4))}</span></span>
          <span className={`ml-1 font-bold ${hud.mult > 1 ? 'text-white' : 'text-gray-500'}`}>x{hud.mult}</span>
        </div>
      </div>

      <div ref={boxRef} className="relative flex-1 min-h-0">
        <canvas ref={canvasRef} className="absolute inset-0 touch-none" aria-label="JAM_INVADERS playfield" />

        {phase !== 'playing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-bg-panel/90 text-center px-4">
            {phase === 'ready' && (
              <>
                <h2 className="text-neon-red text-base tracking-[0.25em] border border-neon-red/60 px-4 py-1.5">JAM_INVADERS</h2>
                <ul className="text-xs text-gray-400 max-w-[40ch] leading-relaxed text-left space-y-1">
                  <li>Jammers sit on <span style={{ color: BAND_COLOR[0] }}>433</span> / <span style={{ color: BAND_COLOR[1] }}>868</span> / <span style={{ color: BAND_COLOR[2] }}>915</span> MHz. Your packets only hit the band you're tuned to — everything else is invisible to them.</li>
                  <li>Stay on a channel to build a <span className="text-white">LOCK</span> (x2 after 4 kills, up to x4). Retuning, missing or getting hit breaks it.</li>
                  <li>The <span className="text-neon-red">rogue AP</span> is wideband — always hittable. Firewalls erode.</li>
                </ul>
              </>
            )}
            {phase === 'paused' && <p className="text-neon-yellow tracking-[0.3em] text-sm">PAUSED</p>}
            {phase === 'over' && (
              <>
                <p className="text-neon-red tracking-[0.3em] text-sm">MESH OVERRUN</p>
                <p className="text-xs text-gray-300">score <span className="text-white">{pad(hud.score)}</span> · reached wave {hud.wave}</p>
                {fresh && <p className="text-neon-yellow text-xs animate-pulse">★ NEW HI-SCORE ★</p>}
              </>
            )}
            <TextButton
              boxed
              tone={phase === 'over' ? 'red' : 'green'}
              onClick={() => { playClick(); if (phase === 'paused') setPhase('playing'); else start(); }}
            >
              {phase === 'ready' ? 'START' : phase === 'paused' ? 'RESUME' : 'RETRY'}
            </TextButton>
            <p className="text-[10px] text-gray-600">←/→ move · space fires · 1/2/3 tune · P pauses</p>
          </div>
        )}
      </div>

      {/* Touch pads */}
      <div className="hidden [@media(pointer:coarse)]:grid grid-cols-[1fr_1.4fr_1fr] gap-2 shrink-0 pb-1">
        {hold('left', '◀')}
        {hold('fire', 'FIRE', 'font-bold tracking-widest text-neon-red border-neon-red/50 active:bg-neon-red/25')}
        {hold('right', '▶')}
      </div>
    </div>
  );
};

export default Invaders;
