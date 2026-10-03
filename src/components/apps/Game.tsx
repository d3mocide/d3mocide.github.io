import { useCallback, useEffect, useRef, useState } from 'react';
import { useOSStore } from '@/store/useOSStore';
import { useSoundFX } from '@/hooks/useSoundFX';
import { getPrimaryHex } from '@/lib/theme';
import { PacketLoss, type Dir, type EffectKind, type MysteryOutcome } from '@/lib/packetLoss';
import { TextButton } from '@/components/ascii/primitives';

// PACKET_LOSS: Snake II, but you're a packet routing through a mesh. Grab gateway nodes (*) to
// extend the route, race the timed $ bonus, gamble on ? mystery packets, dodge jammers (they
// flicker ░ before going live as X) and, from level 2, firewalls. Swipe, d-pad, arrows or WASD.
// The [LCD] switch re-skins everything as a green-screen Nokia.

const BEST_KEY = 'd3os.packetloss.best';
const SKIN_KEY = 'd3os.packetloss.skin';
const FONT = '"JetBrains Mono", ui-monospace, Menlo, monospace';
const PINK = '#ff0055';
const YELLOW = '#FCEE0C';
const RED = '#FF003C';
const SWIPE_PX = 22;

const readBest = () => { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; } };
const writeBest = (n: number) => { try { localStorage.setItem(BEST_KEY, String(n)); } catch { /* storage unavailable */ } };

type Skin = 'modern' | 'lcd';
const readSkin = (): Skin => { try { return localStorage.getItem(SKIN_KEY) === 'lcd' ? 'lcd' : 'modern'; } catch { return 'modern'; } };
const LCD_BG = '#a9bb8a';
const LCD_INK = '#27341c';
const MAGENTA = '#c77dff';

const EFFECT_LABEL: Record<EffectKind, string> = { turbo: 'TURBO', slow: 'SLOW-MO', ghost: 'GHOST', double: 'x2 SCORE', reverse: 'REVERSED' };
const MYSTERY_LABEL: Record<MysteryOutcome, string> = { ...EFFECT_LABEL, shrink: 'ROUTE TRIMMED' };
const EFFECT_TONE: Record<EffectKind, string> = { turbo: 'text-neon-yellow', slow: 'text-neon-blue', ghost: 'text-gray-300', double: 'text-neon-green', reverse: 'text-neon-red' };

interface Toast { text: string; x: number; y: number; born: number; color: string }

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
  const sfx = useRef({ playKeystroke, playError, playClick });
  sfx.current = { playKeystroke, playError, playClick };

  const [phase, setPhaseState] = useState<Phase>('ready');
  const [hud, setHud] = useState<{ score: number; len: number; jam: number; level: number; fx: EffectKind | null; fxLeft: number }>({ score: 0, len: 3, jam: 0, level: 1, fx: null, fxLeft: 0 });
  const [skin, setSkinState] = useState<Skin>(readSkin);
  const skinRef = useRef<Skin>(skin);
  skinRef.current = skin;
  const [best, setBest] = useState(readBest);
  const [fresh, setFresh] = useState(false); // last run set a new best

  const toggleSkin = () => {
    const next: Skin = skin === 'lcd' ? 'modern' : 'lcd';
    setSkinState(next);
    try { localStorage.setItem(SKIN_KEY, next); } catch { /* storage unavailable */ }
  };

  const setPhase = useCallback((p: Phase) => { phaseRef.current = p; setPhaseState(p); }, []);

  /** Pick a grid that suits the playfield's shape (phones get a tall one). */
  const newGame = useCallback(() => {
    const box = boxRef.current;
    const W = box?.clientWidth || 360;
    const H = box?.clientHeight || 360;
    const cols = Math.max(12, Math.min(28, Math.floor(W / 22)));
    const rows = Math.max(10, Math.min(30, Math.floor(H / 22)));
    gameRef.current = new PacketLoss(cols, rows);
    setHud({ score: 0, len: 3, jam: 0, level: 1, fx: null, fxLeft: 0 });
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
    let toasts: Toast[] = [];
    let levelAt = -1e9;

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
      const lcd = skinRef.current === 'lcd';
      const cell = Math.max(8, Math.floor(Math.min(W / g.cols, H / g.rows)));
      const ox = Math.floor((W - cell * g.cols) / 2);
      const oy = Math.floor((H - cell * g.rows) / 2);
      const cx = (x: number) => ox + x * cell + cell / 2;
      const cy = (y: number) => oy + y * cell + cell / 2;
      const ink = lcd ? LCD_INK : GREEN;
      const ghost = g.effect?.kind === 'ghost';
      ctx.clearRect(0, 0, W, H);

      if (lcd) {
        ctx.fillStyle = LCD_BG;
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = LCD_INK;
        ctx.lineWidth = 2;
        ctx.strokeRect(ox - 2, oy - 2, cell * g.cols + 4, cell * g.rows + 4);
        ctx.lineWidth = 1;
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        for (let y = 0; y < g.rows; y++)
          for (let x = 0; x < g.cols; x++) ctx.fillRect(cx(x) - 0.5, cy(y) - 0.5, 1.5, 1.5);
        ctx.strokeStyle = GREEN;
        ctx.globalAlpha = 0.35;
        ctx.strokeRect(ox - 0.5, oy - 0.5, cell * g.cols + 1, cell * g.rows + 1);
        ctx.globalAlpha = 1;
      }

      ctx.font = `bold ${Math.floor(cell * 0.85)}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const glyph = (ch: string, x: number, y: number, color: string, alpha = 1) => {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fillText(ch, cx(x), cy(y) + 1);
        ctx.globalAlpha = 1;
      };
      const block = (x: number, y: number, inset: number, alpha = 1) => {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = ink;
        ctx.fillRect(ox + x * cell + inset, oy + y * cell + inset, cell - inset * 2, cell - inset * 2);
        ctx.globalAlpha = 1;
      };

      // firewalls
      for (const w of g.walls) {
        if (lcd) block(w.x, w.y, 1);
        else {
          ctx.fillStyle = 'rgba(255,0,85,0.16)';
          ctx.fillRect(ox + w.x * cell + 1, oy + w.y * cell + 1, cell - 2, cell - 2);
          glyph('#', w.x, w.y, PINK, 0.85);
        }
      }

      // jammers: flicker while arming, solid when live
      for (const j of g.jammers) {
        const live = j.arming <= 0;
        const on = live || Math.floor(now / (j.arming < 5 ? 90 : 180)) % 2 === 0;
        if (lcd) {
          if (!on) continue;
          ctx.strokeStyle = LCD_INK;
          ctx.lineWidth = live ? 3 : 1.5;
          ctx.beginPath();
          ctx.moveTo(ox + j.x * cell + 3, oy + j.y * cell + 3);
          ctx.lineTo(ox + (j.x + 1) * cell - 3, oy + (j.y + 1) * cell - 3);
          ctx.moveTo(ox + (j.x + 1) * cell - 3, oy + j.y * cell + 3);
          ctx.lineTo(ox + j.x * cell + 3, oy + (j.y + 1) * cell - 3);
          ctx.stroke();
          ctx.lineWidth = 1;
        } else if (live) {
          ctx.shadowColor = RED;
          ctx.shadowBlur = 8;
          glyph('X', j.x, j.y, RED);
          ctx.shadowBlur = 0;
        } else glyph('░', j.x, j.y, PINK, on ? 0.9 : 0.3);
      }

      // gateway node
      const pulse = 0.65 + 0.35 * Math.sin(now / 160);
      if (lcd) {
        // Nokia-style plus-shaped pixel food
        const f = g.food;
        const px = cell / 3;
        for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]] as const)
        {
          ctx.fillStyle = ink;
          ctx.fillRect(ox + f.x * cell + dx * px + 0.5, oy + f.y * cell + dy * px + 0.5, px - 1, px - 1);
        }
      } else glyph('*', g.food.x, g.food.y, YELLOW, pulse);

      // timed $ bonus (blinks as it runs out) and ? mystery packet
      if (g.bonus) {
        const urgent = g.bonus.left < 10;
        if (!urgent || Math.floor(now / 120) % 2 === 0) glyph('$', g.bonus.x, g.bonus.y, lcd ? ink : YELLOW);
        // shrinking timer bar under the board
        ctx.fillStyle = lcd ? ink : YELLOW;
        ctx.fillRect(ox, oy + cell * g.rows + 6, cell * g.cols * (g.bonus.left / g.bonus.total), 3);
      }
      if (g.mystery) {
        const urgent = g.mystery.left < 15;
        if (!urgent || Math.floor(now / 150) % 2 === 0) glyph('?', g.mystery.x, g.mystery.y, lcd ? ink : MAGENTA, 0.6 + 0.4 * Math.sin(now / 110));
      }

      // catch ripple
      const ring = (now - eatAt) / 450;
      if (ring >= 0 && ring < 1 && !lcd) {
        const hd = g.snake[0];
        ctx.globalAlpha = 1 - ring;
        ctx.strokeStyle = YELLOW;
        ctx.beginPath();
        ctx.arc(cx(hd.x), cy(hd.y), cell * (0.6 + ring * 2.2), 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // route: head first, fading toward the tail (ghost = see-through)
      const n = g.snake.length;
      const bodyAlpha = ghost ? 0.4 : 1;
      for (let i = n - 1; i >= 0; i--) {
        const s = g.snake[i];
        if (lcd) {
          block(s.x, s.y, i === 0 ? 1 : 2, ghost ? 0.45 : 1);
          if (i === 0 && g.alive) { // eye
            ctx.fillStyle = LCD_BG;
            ctx.fillRect(cx(s.x) - 1.5, cy(s.y) - 1.5, 3, 3);
          }
        } else if (i === 0) glyph('@', s.x, s.y, g.alive ? '#ffffff' : RED, ghost ? 0.6 : 1);
        else glyph('o', s.x, s.y, GREEN, (0.35 + 0.65 * (1 - i / n)) * bodyAlpha);
      }

      // floating toasts
      toasts = toasts.filter((t) => now - t.born < 1100);
      ctx.font = `bold ${Math.max(11, Math.floor(cell * 0.7))}px ${FONT}`;
      for (const t of toasts) {
        const k = (now - t.born) / 1100;
        ctx.globalAlpha = 1 - k * k;
        ctx.fillStyle = lcd ? LCD_INK : t.color;
        const tx = Math.max(ox + 40, Math.min(ox + cell * g.cols - 40, t.x));
        ctx.fillText(t.text, tx, t.y - k * cell * 2);
      }
      ctx.globalAlpha = 1;

      // level banner
      const lv = (now - levelAt) / 1600;
      if (lv >= 0 && lv < 1) {
        ctx.globalAlpha = lv < 0.7 ? 1 : 1 - (lv - 0.7) / 0.3;
        ctx.font = `bold ${Math.floor(cell * 1.5)}px ${FONT}`;
        ctx.fillStyle = lcd ? LCD_INK : PINK;
        ctx.fillText(`LEVEL ${g.level}`, W / 2, H / 2);
        ctx.globalAlpha = 1;
      }

      // death flash
      if (!g.alive && deadAt) {
        const f = Math.max(0, 1 - (now - deadAt) / 500);
        if (f > 0) { ctx.fillStyle = `rgba(255,0,60,${0.35 * f})`; ctx.fillRect(0, 0, W, H); }
      }
    };

    const toast = (g: PacketLoss, text: string, color: string, now: number) => {
      const hd = g.snake[0];
      const cell = Math.max(8, Math.floor(Math.min(W / g.cols, H / g.rows)));
      toasts.push({ text, color, born: now, x: Math.floor((W - cell * g.cols) / 2) + hd.x * cell + cell / 2, y: Math.floor((H - cell * g.rows) / 2) + hd.y * cell });
    };

    const snapshot = (g: PacketLoss) => ({
      score: g.score, len: g.snake.length, jam: g.jammers.length, level: g.level,
      fx: g.effect?.kind ?? null, fxLeft: g.effect?.left ?? 0,
    });

    const frame = (now: number) => {
      const g = gameRef.current!;
      const dt = Math.min(100, now - last);
      last = now;

      if (phaseRef.current === 'playing') {
        acc += dt;
        while (acc >= g.interval && g.alive) {
          acc -= g.interval;
          const r = g.step();
          if (r === 'eat') { sfx.current.playKeystroke(); eatAt = now; if (g.lastGain >= 16) toast(g, `+${g.lastGain}`, YELLOW, now); }
          else if (r === 'bonus') { sfx.current.playClick(); eatAt = now; toast(g, `$ +${g.lastGain}`, YELLOW, now); }
          else if (r === 'mystery') { sfx.current.playClick(); toast(g, g.lastMystery ? MYSTERY_LABEL[g.lastMystery] : '?', MAGENTA, now); }
          else if (r === 'level') { sfx.current.playClick(); levelAt = now; eatAt = now; }
          if (r === 'dead') break;
        }
        const snap = snapshot(g);
        if (g.alive) {
          setHud((h) => (h.score === snap.score && h.len === snap.len && h.jam === snap.jam && h.level === snap.level && h.fx === snap.fx && h.fxLeft === snap.fxLeft ? h : snap));
        } else {
          deadAt = now;
          sfx.current.playError();
          setHud(snap);
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
        <span className="text-neon-pink">LV <span className="text-white">{hud.level}</span></span>
        <span className="text-neon-yellow">BEST {pad(best)}</span>
        <button
          type="button"
          onClick={() => { playClick(); toggleSkin(); }}
          className="text-gray-400 hover:text-white px-1"
          aria-label="Toggle LCD skin"
          aria-pressed={skin === 'lcd'}
        >
          [{skin === 'lcd' ? 'LCD' : 'LED'}]
        </button>
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

      {/* Status line: route stats and the active mystery effect */}
      <div className="flex items-center justify-between text-[11px] shrink-0 h-4 -mt-1 text-gray-500">
        <span>LEN {pad(hud.len, 2)} · JAM <span className="text-neon-red">{pad(hud.jam, 2)}</span></span>
        {hud.fx && <span className={`${EFFECT_TONE[hud.fx]} animate-pulse`}>▸ {EFFECT_LABEL[hud.fx]} {hud.fxLeft}</span>}
      </div>

      {/* Playfield */}
      <div ref={boxRef} className="relative flex-1 min-h-0">
        <canvas ref={canvasRef} className="absolute inset-0 touch-none" aria-label="PACKET_LOSS playfield" />

        {phase !== 'playing' && (
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-4 ${skin === 'lcd' ? '' : 'bg-bg-panel/90'}`}
            style={skin === 'lcd' ? { background: `${LCD_BG}f2`, color: LCD_INK } : undefined}
          >
            {phase === 'ready' && (
              <>
                <h2 className="text-neon-pink text-base tracking-[0.25em] border border-neon-pink/60 px-4 py-1.5">PACKET_LOSS</h2>
                <ul className="text-xs text-gray-400 max-w-[38ch] leading-relaxed text-left space-y-1" style={skin === 'lcd' ? { color: LCD_INK } : undefined}>
                  <li><span className="text-neon-yellow">*</span> gateway — grab it to extend the route</li>
                  <li><span className="text-neon-yellow">$</span> bonus — pays big, but it's timed</li>
                  <li><span style={{ color: MAGENTA }}>?</span> mystery — turbo, slow-mo, ghost, x2, reversed controls or a trim</li>
                  <li><span className="text-neon-pink">░</span> → <span className="text-neon-red">X</span> jammer — flickers, then goes live</li>
                  <li><span className="text-neon-pink">#</span> firewall — appears from level 2</li>
                </ul>
              </>
            )}
            {phase === 'paused' && <p className="text-neon-yellow tracking-[0.3em] text-sm">PAUSED</p>}
            {phase === 'over' && (
              <>
                <p className="text-neon-red tracking-[0.3em] text-sm">PACKET LOST</p>
                <p className="text-xs">score <span className="font-bold">{pad(hud.score)}</span> · level {hud.level} · route {hud.len}</p>
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
            <p className="text-[10px] opacity-60">swipe / d-pad / arrows / WASD · space pauses</p>
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
