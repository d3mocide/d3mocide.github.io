import { useCallback, useEffect, useRef, useState } from 'react';
import { useOSStore } from '@/store/useOSStore';
import { useSoundFX } from '@/hooks/useSoundFX';
import { getPrimaryHex } from '@/lib/theme';
import { TextButton } from '@/components/ascii/primitives';
import { FIELD_H, FIELD_W, Invaders as Engine, SPRITES, type Bitmap, type Input, type InvaderKind } from '@/lib/invaders';

// JAM_INVADERS: Space Invaders with the d3FRAG mesh as the backdrop. You're the last gateway
// tower; rogue jammers are marching on the network. Move with ←/→ (or A/D), fire with Space.
// On a phone: hold the ◀ ▶ pads and the FIRE button.

const HI_KEY = 'd3os.invaders.hi';
const PINK = '#ff0055';
const BLUE = '#00B8FF';
const YELLOW = '#FCEE0C';
const RED = '#FF003C';
const MARCH_NOTES = [110, 98, 87, 82];

const readHi = () => { try { return Number(localStorage.getItem(HI_KEY)) || 0; } catch { return 0; } };
const writeHi = (n: number) => { try { localStorage.setItem(HI_KEY, String(n)); } catch { /* storage unavailable */ } };
const pad = (n: number, w = 5) => String(n).padStart(w, '0');

type Phase = 'ready' | 'playing' | 'paused' | 'over';
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string }
interface Pop { x: number; y: number; text: string; life: number; color: string }

/** Bake a bitmap into an offscreen canvas once, so each frame is a single drawImage. */
const bake = (bits: Bitmap, color: string) => {
  const c = document.createElement('canvas');
  c.width = bits[0].length;
  c.height = bits.length;
  const x = c.getContext('2d')!;
  x.fillStyle = color;
  bits.forEach((row, y) => [...row].forEach((ch, i) => { if (ch === 'X') x.fillRect(i, y, 1, 1); }));
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
  const [hud, setHud] = useState({ score: 0, lives: 3, wave: 1 });
  const [hi, setHi] = useState(readHi);
  const [fresh, setFresh] = useState(false);

  const setPhase = useCallback((p: Phase) => { phaseRef.current = p; setPhaseState(p); }, []);

  const start = useCallback(() => {
    gameRef.current = new Engine();
    input.current = { left: false, right: false, fire: false };
    setHud({ score: 0, lives: 3, wave: 1 });
    setFresh(false);
    setPhase('playing');
  }, [setPhase]);

  const togglePause = useCallback(() => {
    input.current = { left: false, right: false, fire: false };
    if (phaseRef.current === 'playing') setPhase('paused');
    else if (phaseRef.current === 'paused') setPhase('playing');
  }, [setPhase]);

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
        case 'Enter':
          if (!down) return;
          if (phaseRef.current === 'ready' || phaseRef.current === 'over') start(); else togglePause();
          break;
        case 'KeyP': case 'Escape':
          if (down) togglePause();
          break;
        case 'ArrowUp': case 'ArrowDown': break; // swallow page scroll below
        default: return;
      }
      e.preventDefault();
    };
    const dn = (e: KeyboardEvent) => set(e, true);
    const up = (e: KeyboardEvent) => set(e, false);
    window.addEventListener('keydown', dn);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up); };
  }, [isActive, start, togglePause]);

  // Loop + render
  useEffect(() => {
    const canvas = canvasRef.current;
    const box = boxRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !box || !ctx) return;
    if (!gameRef.current) gameRef.current = new Engine();

    const PRIMARY = getPrimaryHex();
    const tint: Record<InvaderKind, string> = { squid: PINK, crab: BLUE, octopus: YELLOW };
    const art = {
      squid: SPRITES.squid.map((b) => bake(b, tint.squid)),
      crab: SPRITES.crab.map((b) => bake(b, tint.crab)),
      octopus: SPRITES.octopus.map((b) => bake(b, tint.octopus)),
      player: bake(SPRITES.player[0], PRIMARY),
      hurt: bake(SPRITES.player[0], RED),
      ufo: bake(SPRITES.ufo[0], RED),
    };
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
          case 'shoot': sfx.current.playTone(900, 0.07, 'square'); break;
          case 'kill':
            sfx.current.playTone(220, 0.1, 'sawtooth');
            burst(e.x, e.y, tint[e.kind], 10);
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
          case 'extra': pops.push({ x: FIELD_W / 2, y: FIELD_H - 40, text: '+1 TOWER', life: 1.4, color: YELLOW }); sfx.current.playTone(660, 0.2, 'triangle'); break;
          case 'over': break;
        }
      }
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
      ctx.imageSmoothingEnabled = false;

      // frame + ground line
      ctx.strokeStyle = PRIMARY;
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 1 / s;
      ctx.strokeRect(0.5, 0.5, FIELD_W - 1, FIELD_H - 1);
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = PRIMARY;
      ctx.fillRect(4, 244, FIELD_W - 8, 1);
      ctx.globalAlpha = 1;

      // shields
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

      // invaders
      for (const i of g.invaders) {
        if (!i.alive) continue;
        const b = g.box(i);
        ctx.drawImage(art[i.kind][g.frame], Math.round(b.x), Math.round(b.y));
      }

      // ufo
      if (g.ufo) ctx.drawImage(art.ufo, Math.round(g.ufo.x - 8), Engine.UFO_Y);

      // player (blinks while invulnerable, hidden while exploding)
      if (g.respawn <= 0 && g.alive && (g.invuln <= 0 || Math.floor(now / 90) % 2 === 0))
        ctx.drawImage(art.player, Math.round(g.playerX - Engine.PLAYER_W / 2), Engine.PLAYER_Y);

      // shot + bombs
      ctx.fillStyle = '#ffffff';
      if (g.shot) ctx.fillRect(Math.round(g.shot.x), Math.round(g.shot.y) - 2, 1, 5);
      for (const b of g.bombs) {
        const z = Math.floor(b.phase) % 2;
        ctx.fillStyle = '#ffffff';
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
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
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
        const sig = `${g.score}|${g.lives}|${g.wave}`;
        if (sig !== hudSig) { hudSig = sig; setHud({ score: g.score, lives: g.lives, wave: g.wave }); }
        if (!g.alive) {
          setHud({ score: g.score, lives: 0, wave: g.wave });
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
    // theme change re-bakes sprites in the new phosphor colour
  }, [setPhase, theme]);

  // Hold-to-act touch pads
  const pad4 = (key: keyof Input, label: string, extra = '') => (
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

      <div ref={boxRef} className="relative flex-1 min-h-0">
        <canvas ref={canvasRef} className="absolute inset-0 touch-none" aria-label="JAM_INVADERS playfield" />

        {phase !== 'playing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-bg-panel/90 text-center px-4">
            {phase === 'ready' && (
              <>
                <h2 className="text-neon-red text-base tracking-[0.25em] border border-neon-red/60 px-4 py-1.5">JAM_INVADERS</h2>
                <p className="text-xs text-gray-400 max-w-[36ch] leading-relaxed">
                  Rogue jammers are marching on the mesh. You're the last gateway tower — hold the line.
                  Shoot the <span className="text-neon-red">rogue AP</span> for a bonus; hide behind the <span className="text-neon-green">firewalls</span> (they erode).
                </p>
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
            <p className="text-[10px] text-gray-600">←/→ or A/D move · space fires · P pauses</p>
          </div>
        )}
      </div>

      {/* Touch pads */}
      <div className="hidden [@media(pointer:coarse)]:grid grid-cols-[1fr_1.4fr_1fr] gap-2 shrink-0 pb-1">
        {pad4('left', '◀')}
        {pad4('fire', 'FIRE', 'font-bold tracking-widest text-neon-red border-neon-red/50 active:bg-neon-red/25')}
        {pad4('right', '▶')}
      </div>
    </div>
  );
};

export default Invaders;
