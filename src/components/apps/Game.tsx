import { useCallback, useEffect, useRef, useState } from 'react';
import { useOSStore } from '@/store/useOSStore';
import { useSoundFX } from '@/hooks/useSoundFX';
import { getPrimaryHex } from '@/lib/theme';
import { PacketLoss, type Dir } from '@/lib/packetLoss';
import { TextButton } from '@/components/ascii/primitives';

// PACKET_LOSS: you are a packet routing through the mesh. Grab gateway nodes (*) to extend the
// route, dodge jammers (they flicker ░ before they go live as X). The edges wrap. Swipe, d-pad,
// arrow keys or WASD.

const BEST_KEY = 'd3os.packetloss.best';
const FONT = '"JetBrains Mono", ui-monospace, Menlo, monospace';
const PINK = '#ff0055';
const YELLOW = '#FCEE0C';
const RED = '#FF003C';
const SWIPE_PX = 22;

const readBest = () => { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; } };
const writeBest = (n: number) => { try { localStorage.setItem(BEST_KEY, String(n)); } catch { /* storage unavailable */ } };

type Phase = 'ready' | 'playing' | 'paused' | 'over';

const KEY_DIR: Record<string, Dir> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
};

const pad = (n: number, w = 4) => String(n).padStart(w, '0');

const Game = () => {
  const theme = useOSStore((s) => s.theme);
  const isActive = useOSStore((s) => s.activeWindowId === 'game');
  const { playClick, playKeystroke, playError } = useSoundFX();

  const rootRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<PacketLoss | null>(null);
  const phaseRef = useRef<Phase>('ready');
  const sfx = useRef({ playKeystroke, playError });
  sfx.current = { playKeystroke, playError };

  const [phase, setPhaseState] = useState<Phase>('ready');
  const [hud, setHud] = useState({ score: 0, len: 3, jam: 0 });
  const [best, setBest] = useState(readBest);
  const [fresh, setFresh] = useState(false); // last run set a new best

  const setPhase = useCallback((p: Phase) => { phaseRef.current = p; setPhaseState(p); }, []);

  /** Pick a grid that suits the playfield's shape (phones get a tall one). */
  const newGame = useCallback(() => {
    const box = boxRef.current;
    const W = box?.clientWidth || 360;
    const H = box?.clientHeight || 360;
    const cols = Math.max(12, Math.min(28, Math.floor(W / 22)));
    const rows = Math.max(10, Math.min(30, Math.floor(H / 22)));
    gameRef.current = new PacketLoss(cols, rows);
    setHud({ score: 0, len: 3, jam: 0 });
    setFresh(false);
  }, []);

  const start = useCallback(() => {
    newGame();
    setPhase('playing');
  }, [newGame, setPhase]);

  const turn = useCallback((d: Dir) => {
    if (phaseRef.current === 'ready' || phaseRef.current === 'over') return;
    if (phaseRef.current === 'paused') setPhase('playing');
    gameRef.current?.turn(d);
  }, [setPhase]);

  const togglePause = useCallback(() => {
    if (phaseRef.current === 'playing') setPhase('paused');
    else if (phaseRef.current === 'paused') setPhase('playing');
  }, [setPhase]);

  // Window lost focus (or tab hidden): never let the packet die while you're elsewhere.
  useEffect(() => {
    if (!isActive && phaseRef.current === 'playing') setPhase('paused');
  }, [isActive, setPhase]);
  useEffect(() => {
    const onHide = () => { if (document.hidden && phaseRef.current === 'playing') setPhase('paused'); };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [setPhase]);

  // Take keyboard focus from whatever had it (e.g. the terminal prompt) when this window comes forward.
  useEffect(() => {
    if (isActive) rootRef.current?.focus({ preventScroll: true });
  }, [isActive]);

  // Keyboard
  useEffect(() => {
    if (!isActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const d = KEY_DIR[e.code];
      if (d) { e.preventDefault(); turn(d); return; }
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (phaseRef.current === 'ready' || phaseRef.current === 'over') start();
        else togglePause();
      } else if (e.code === 'KeyP') togglePause();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isActive, turn, start, togglePause]);

  // Swipe on the playfield
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    let sx = 0, sy = 0, active = false;
    const down = (e: PointerEvent) => { sx = e.clientX; sy = e.clientY; active = true; };
    const move = (e: PointerEvent) => {
      if (!active) return;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return;
      turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
      sx = e.clientX; sy = e.clientY; // allow chained swipes without lifting
    };
    const up = () => { active = false; };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [turn]);

  // Loop + render
  useEffect(() => {
    const canvas = canvasRef.current;
    const box = boxRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !box || !ctx) return;
    if (!gameRef.current) newGame();

    const GREEN = getPrimaryHex();
    let raf = 0, last = performance.now(), acc = 0, deadAt = 0, eatAt = -1e9;
    let W = 0, H = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = box.clientWidth;
      H = box.clientHeight;
      canvas.width = Math.max(1, Math.floor(W * dpr));
      canvas.height = Math.max(1, Math.floor(H * dpr));
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(box);
    resize();

    const draw = (now: number) => {
      const g = gameRef.current!;
      const cell = Math.max(8, Math.floor(Math.min(W / g.cols, H / g.rows)));
      const ox = Math.floor((W - cell * g.cols) / 2);
      const oy = Math.floor((H - cell * g.rows) / 2);
      ctx.clearRect(0, 0, W, H);

      // playfield: dotted grid + border
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      for (let y = 0; y < g.rows; y++)
        for (let x = 0; x < g.cols; x++) ctx.fillRect(ox + x * cell + cell / 2 - 0.5, oy + y * cell + cell / 2 - 0.5, 1.5, 1.5);
      ctx.strokeStyle = GREEN;
      ctx.globalAlpha = 0.35;
      ctx.strokeRect(ox - 0.5, oy - 0.5, cell * g.cols + 1, cell * g.rows + 1);
      ctx.globalAlpha = 1;

      ctx.font = `bold ${Math.floor(cell * 0.85)}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const glyph = (ch: string, x: number, y: number, color: string, alpha = 1) => {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fillText(ch, ox + x * cell + cell / 2, oy + y * cell + cell / 2 + 1);
      };

      // jammers: flicker while arming, solid when live
      for (const j of g.jammers) {
        if (j.arming > 0) glyph('░', j.x, j.y, PINK, Math.floor(now / (j.arming < 5 ? 90 : 180)) % 2 ? 0.9 : 0.3);
        else {
          ctx.shadowColor = RED;
          ctx.shadowBlur = 8;
          glyph('X', j.x, j.y, RED);
          ctx.shadowBlur = 0;
        }
      }

      // gateway node (a ring ripples out when you catch one)
      const pulse = 0.65 + 0.35 * Math.sin(now / 160);
      glyph('*', g.food.x, g.food.y, YELLOW, pulse);
      const ring = (now - eatAt) / 450;
      if (ring >= 0 && ring < 1) {
        const hd = g.snake[0];
        ctx.globalAlpha = 1 - ring;
        ctx.strokeStyle = YELLOW;
        ctx.beginPath();
        ctx.arc(ox + hd.x * cell + cell / 2, oy + hd.y * cell + cell / 2, cell * (0.6 + ring * 2.2), 0, Math.PI * 2);
        ctx.stroke();
      }

      // route: head first, fading toward the tail
      const n = g.snake.length;
      for (let i = n - 1; i >= 0; i--) {
        const s = g.snake[i];
        if (i === 0) glyph('@', s.x, s.y, g.alive ? '#ffffff' : RED);
        else glyph('o', s.x, s.y, GREEN, 0.35 + 0.65 * (1 - i / n));
      }
      ctx.globalAlpha = 1;

      // death flash
      if (!g.alive && deadAt) {
        const f = Math.max(0, 1 - (now - deadAt) / 500);
        if (f > 0) { ctx.fillStyle = `rgba(255,0,60,${0.35 * f})`; ctx.fillRect(0, 0, W, H); }
      }
    };

    const frame = (now: number) => {
      const g = gameRef.current!;
      const dt = Math.min(100, now - last);
      last = now;

      if (phaseRef.current === 'playing') {
        acc += dt;
        while (acc >= g.interval && g.alive) {
          acc -= g.interval;
          const r = g.step();
          if (r === 'eat') { sfx.current.playKeystroke(); eatAt = now; }
          if (r === 'dead') break;
        }
        if (g.alive) {
          setHud((h) => (h.score === g.score && h.len === g.snake.length && h.jam === g.jammers.length ? h : { score: g.score, len: g.snake.length, jam: g.jammers.length }));
        } else {
          deadAt = now;
          sfx.current.playError();
          setHud({ score: g.score, len: g.snake.length, jam: g.jammers.length });
          const prev = readBest();
          if (g.score > prev) { writeBest(g.score); setBest(g.score); setFresh(true); }
          setPhase('over');
        }
      } else acc = 0;

      draw(now);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
    // theme change re-reads the phosphor colour
  }, [newGame, setPhase, theme]);

  const dpad = (d: Dir, label: string, area: string) => (
    <button
      type="button"
      aria-label={d}
      onPointerDown={(e) => { e.preventDefault(); turn(d); }}
      className={`${area} h-12 w-14 border border-neon-green/40 rounded-[3px] text-neon-green text-lg active:bg-neon-green/25 select-none`}
    >
      {label}
    </button>
  );

  return (
    <div ref={rootRef} tabIndex={-1} className="h-full flex flex-col gap-2 select-none font-mono outline-none">
      {/* HUD */}
      <div className="flex items-center justify-between text-xs shrink-0">
        <span className="text-neon-green">SCORE <span className="text-white">{pad(hud.score)}</span></span>
        <span className="text-gray-500">LEN <span className="text-gray-300">{pad(hud.len, 2)}</span> · JAM <span className="text-neon-red">{pad(hud.jam, 2)}</span></span>
        <span className="text-neon-yellow">BEST {pad(best)}</span>
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

      {/* Playfield */}
      <div ref={boxRef} className="relative flex-1 min-h-0">
        <canvas ref={canvasRef} className="absolute inset-0 touch-none" aria-label="PACKET_LOSS playfield" />

        {phase !== 'playing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-bg-panel/90 text-center px-4">
            {phase === 'ready' && (
              <>
                <h2 className="text-neon-pink text-base tracking-[0.25em] border border-neon-pink/60 px-4 py-1.5">PACKET_LOSS</h2>
                <p className="text-xs text-gray-400 max-w-[34ch] leading-relaxed">
                  Route your packet through the mesh. Grab <span className="text-neon-yellow">*</span> gateways to extend the route.
                  A <span className="text-neon-pink">░</span> flicker means a jammer is coming online — then it's <span className="text-neon-red">X</span>. Edges wrap.
                </p>
              </>
            )}
            {phase === 'paused' && <p className="text-neon-yellow tracking-[0.3em] text-sm">PAUSED</p>}
            {phase === 'over' && (
              <>
                <p className="text-neon-red tracking-[0.3em] text-sm">PACKET LOST</p>
                <p className="text-xs text-gray-300">score <span className="text-white">{pad(hud.score)}</span> · route length {hud.len}</p>
                {fresh && <p className="text-neon-yellow text-xs animate-pulse">★ NEW BEST ★</p>}
              </>
            )}
            <TextButton
              boxed
              tone={phase === 'over' ? 'red' : 'green'}
              onClick={() => { playClick(); if (phase === 'paused') setPhase('playing'); else start(); }}
            >
              {phase === 'ready' ? 'START' : phase === 'paused' ? 'RESUME' : 'RETRY'}
            </TextButton>
            <p className="text-[10px] text-gray-600">swipe / d-pad / arrows / WASD · space pauses</p>
          </div>
        )}
      </div>

      {/* D-pad, touch screens only */}
      <div className="hidden [@media(pointer:coarse)]:grid grid-cols-3 grid-rows-2 gap-1 justify-center justify-items-center shrink-0 pb-1" style={{ gridTemplateColumns: 'repeat(3, 3.5rem)' }}>
        {dpad('up', '▲', 'col-start-2 row-start-1')}
        {dpad('left', '◀', 'col-start-1 row-start-2')}
        {dpad('down', '▼', 'col-start-2 row-start-2')}
        {dpad('right', '▶', 'col-start-3 row-start-2')}
      </div>
    </div>
  );
};

export default Game;
