// PACKET_LOSS engine: Snake-II-style game on a grid, themed as a packet routing through a mesh.
// Pure logic (no DOM) so the view stays thin and the rules are easy to test.
//
// Quirks on top of plain Snake:
//   * levels: every LEVEL_EVERY nodes the board is re-laid with walls ("firewalls")
//   * jammers: telegraphed hazards that go live after ARM_TICKS
//   * bonus `$`: timed, worth a lot, vanishes if you dawdle (the Nokia classic)
//   * mystery `?`: a random effect for a while (turbo, slow-mo, ghost, x2, reverse, shrink)

export type Dir = 'up' | 'down' | 'left' | 'right';
export interface Cell { x: number; y: number }
export interface Jammer extends Cell {
  /** ticks left before it turns lethal; until then it only warns */
  arming: number;
}
export interface Timed extends Cell {
  /** ticks until it disappears */
  left: number;
  total: number;
}
export type EffectKind = 'turbo' | 'slow' | 'ghost' | 'double' | 'reverse';
export interface Effect { kind: EffectKind; left: number }
export type StepResult = 'move' | 'eat' | 'bonus' | 'mystery' | 'level' | 'dead';

const VEC: Record<Dir, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

export const ARM_TICKS = 14;
export const LEVEL_EVERY = 6;
export const EFFECT_TICKS = 40;
const JAMMER_EVERY = 3; // nodes collected per new jammer
const MAX_JAMMERS = 12;
const BONUS_EVERY = 5; // nodes per `$`
const BONUS_TICKS = 30;
const MYSTERY_CHANCE = 0.22; // per node eaten
const MYSTERY_TICKS = 60;
const MIN_INTERVAL = 70;
const START_INTERVAL = 150;
const EFFECTS: EffectKind[] = ['turbo', 'slow', 'ghost', 'double', 'reverse'];
const SHRINK = 'shrink' as const;
export type MysteryOutcome = EffectKind | typeof SHRINK;

export class PacketLoss {
  readonly cols: number;
  readonly rows: number;
  /** head first */
  snake: Cell[];
  dir: Dir = 'right';
  queue: Dir[] = [];
  food: Cell = { x: 0, y: 0 };
  foodAge = 0;
  walls: Cell[] = [];
  jammers: Jammer[] = [];
  bonus: Timed | null = null;
  mystery: Timed | null = null;
  effect: Effect | null = null;
  level = 1;
  score = 0;
  eaten = 0;
  /** points awarded by the last pickup, and what the last mystery did, for the view's popups */
  lastGain = 0;
  lastMystery: MysteryOutcome | null = null;
  alive = true;
  private rng: () => number;

  constructor(cols: number, rows: number, rng: () => number = Math.random) {
    this.cols = cols;
    this.rows = rows;
    this.rng = rng;
    const cy = Math.floor(rows / 2);
    const cx = Math.floor(cols / 2);
    this.snake = [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }];
    this.placeFood();
  }

  /** ms between ticks: speeds up as the route grows, bent by turbo / slow-mo */
  get interval() {
    const base = Math.max(MIN_INTERVAL, START_INTERVAL - this.eaten * 3);
    const k = this.effect?.kind === 'turbo' ? 0.6 : this.effect?.kind === 'slow' ? 1.7 : 1;
    return Math.round(base * k);
  }

  turn(d: Dir) {
    const dd = this.effect?.kind === 'reverse' ? OPPOSITE[d] : d;
    const last = this.queue.length ? this.queue[this.queue.length - 1] : this.dir;
    if (dd === last || dd === OPPOSITE[last] || this.queue.length >= 2) return;
    this.queue.push(dd);
  }

  isWall(x: number, y: number) {
    return this.walls.some((w) => w.x === x && w.y === y);
  }

  private wrap(c: Cell): Cell {
    return { x: (c.x + this.cols) % this.cols, y: (c.y + this.rows) % this.rows };
  }

  private occupied(x: number, y: number) {
    const at = (c: Cell | null) => !!c && c.x === x && c.y === y;
    return (
      this.snake.some((s) => s.x === x && s.y === y) ||
      this.jammers.some((j) => j.x === x && j.y === y) ||
      this.isWall(x, y) ||
      at(this.food) || at(this.bonus) || at(this.mystery)
    );
  }

  /** cells the head can reach without crossing a wall (the board wraps) */
  private reachable(): Set<number> {
    const seen = new Set<number>();
    const key = (x: number, y: number) => y * this.cols + x;
    const stack: Cell[] = [this.snake[0]];
    seen.add(key(this.snake[0].x, this.snake[0].y));
    while (stack.length) {
      const c = stack.pop()!;
      for (const v of Object.values(VEC)) {
        const n = this.wrap({ x: c.x + v.x, y: c.y + v.y });
        const k = key(n.x, n.y);
        if (seen.has(k) || this.isWall(n.x, n.y)) continue;
        seen.add(k);
        stack.push(n);
      }
    }
    return seen;
  }

  private freeCell(ok: (c: Cell) => boolean = () => true): Cell | null {
    const reach = this.reachable();
    const free: Cell[] = [];
    for (let y = 0; y < this.rows; y++)
      for (let x = 0; x < this.cols; x++)
        if (!this.occupied(x, y) && reach.has(y * this.cols + x) && ok({ x, y })) free.push({ x, y });
    return free.length ? free[Math.floor(this.rng() * free.length)] : null;
  }

  private placeFood() {
    this.food = { x: -1, y: -1 }; // park off-grid so it doesn't block its own replacement
    const c = this.freeCell();
    if (!c) {
      this.alive = false; // nowhere left to go: the mesh is complete
      return;
    }
    this.food = c;
    this.foodAge = 0;
  }

  private distToHead(c: Cell) {
    const head = this.snake[0];
    const dx = Math.abs(c.x - head.x);
    const dy = Math.abs(c.y - head.y);
    return Math.min(dx, this.cols - dx) + Math.min(dy, this.rows - dy);
  }

  private placeJammer() {
    // a fair distance from the head so a new jammer can't spawn in your face
    const c = this.freeCell((p) => this.distToHead(p) >= 6);
    if (!c) return;
    this.jammers.push({ ...c, arming: ARM_TICKS });
    if (this.jammers.length > MAX_JAMMERS) this.jammers.shift();
  }

  private spawnTimed(ticks: number): Timed | null {
    const c = this.freeCell((p) => this.distToHead(p) >= 3);
    return c ? { ...c, left: ticks, total: ticks } : null;
  }

  /** Lay out a fresh set of firewalls: short bars away from the head's row. */
  private buildLevel() {
    this.walls = [];
    this.jammers = [];
    this.bonus = null;
    this.mystery = null;
    if (this.level < 2) return;
    const bars = Math.min(2 + this.level, 9);
    const head = this.snake[0];
    for (let b = 0; b < bars; b++) {
      for (let attempt = 0; attempt < 20; attempt++) {
        const horiz = this.rng() < 0.5;
        const len = 3 + Math.floor(this.rng() * 4);
        const sx = Math.floor(this.rng() * this.cols);
        const sy = Math.floor(this.rng() * this.rows);
        const bar: Cell[] = [];
        for (let i = 0; i < len; i++) bar.push({ x: (sx + (horiz ? i : 0)) % this.cols, y: (sy + (horiz ? 0 : i)) % this.rows });
        const clear = bar.every(
          (c) =>
            !this.snake.some((s) => s.x === c.x && s.y === c.y) &&
            !this.isWall(c.x, c.y) &&
            this.distToHead(c) > 3 &&
            Math.abs(c.y - head.y) > 1, // keep the head's row open so you never spawn into a wall
        );
        if (clear) { this.walls.push(...bar); break; }
      }
    }
    // never wall the board into pieces: if the head can't see most of it, drop the level's walls
    const open = this.cols * this.rows - this.walls.length;
    if (this.reachable().size < open) this.walls = [];
  }

  private applyMystery() {
    const pick: MysteryOutcome[] = [...EFFECTS, SHRINK];
    const outcome = pick[Math.floor(this.rng() * pick.length)];
    this.lastMystery = outcome;
    if (outcome === SHRINK) {
      const keep = Math.max(3, this.snake.length - 3);
      this.snake = this.snake.slice(0, keep);
      this.effect = null;
    } else {
      this.effect = { kind: outcome, left: EFFECT_TICKS };
    }
  }

  private gain(base: number) {
    this.lastGain = this.effect?.kind === 'double' ? base * 2 : base;
    this.score += this.lastGain;
  }

  step(): StepResult {
    if (!this.alive) return 'dead';
    if (this.queue.length) this.dir = this.queue.shift()!;
    const v = VEC[this.dir];
    const head = this.wrap({ x: this.snake[0].x + v.x, y: this.snake[0].y + v.y });
    const ghost = this.effect?.kind === 'ghost';
    const eating = head.x === this.food.x && head.y === this.food.y;

    // the tail cell frees up this tick unless we're growing
    const body = eating ? this.snake : this.snake.slice(0, -1);
    const hitSelf = body.some((s) => s.x === head.x && s.y === head.y);
    const hitJam = this.jammers.some((j) => j.arming <= 0 && j.x === head.x && j.y === head.y);
    const hitWall = this.isWall(head.x, head.y);
    // ghost slips through jammers and its own tail, but firewalls still stop it
    if (hitWall || (!ghost && (hitSelf || hitJam))) {
      this.alive = false;
      return 'dead';
    }

    this.snake.unshift(head);
    const hitBonus = !!this.bonus && this.bonus.x === head.x && this.bonus.y === head.y;
    const hitMystery = !!this.mystery && this.mystery.x === head.x && this.mystery.y === head.y;
    if (!eating) this.snake.pop();

    // world ticks
    for (const j of this.jammers) if (j.arming > 0) j.arming--;
    this.foodAge++;
    if (this.bonus && --this.bonus.left <= 0) this.bonus = null;
    if (this.mystery && --this.mystery.left <= 0) this.mystery = null;
    if (this.effect && --this.effect.left <= 0) this.effect = null;

    if (hitBonus) {
      // the sooner you grab it the more it pays
      const frac = this.bonus!.left / this.bonus!.total;
      this.gain(30 + Math.round(frac * 40));
      this.bonus = null;
      return 'bonus';
    }
    if (hitMystery) {
      this.mystery = null;
      this.applyMystery();
      this.gain(15);
      return 'mystery';
    }
    if (eating) {
      this.eaten++;
      // a faster catch pays a signal bonus of up to +10
      this.gain(10 + Math.max(0, 10 - Math.floor(this.foodAge / 2)));
      this.jammers = this.jammers.filter((j) => !(j.x === head.x && j.y === head.y));
      this.placeFood();
      if (!this.alive) return 'dead';
      if (this.eaten % LEVEL_EVERY === 0) {
        this.level++;
        this.buildLevel();
        this.placeFood();
        return this.alive ? 'level' : 'dead';
      }
      if (this.eaten % JAMMER_EVERY === 0) this.placeJammer();
      if (this.eaten % BONUS_EVERY === 0) this.bonus = this.spawnTimed(BONUS_TICKS);
      else if (!this.mystery && this.rng() < MYSTERY_CHANCE) this.mystery = this.spawnTimed(MYSTERY_TICKS);
      return 'eat';
    }
    return 'move';
  }
}
