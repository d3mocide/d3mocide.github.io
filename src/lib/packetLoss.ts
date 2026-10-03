// PACKET_LOSS engine: snake on a wrapping grid, themed as a packet routing through a mesh.
// Pure logic (no DOM) so the view stays thin and the rules are easy to test.

export type Dir = 'up' | 'down' | 'left' | 'right';
export interface Cell { x: number; y: number }
export interface Jammer extends Cell {
  /** ticks left before it turns lethal; until then it only warns */
  arming: number;
}
export type StepResult = 'move' | 'eat' | 'dead';

const VEC: Record<Dir, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

export const ARM_TICKS = 14;
const JAMMER_EVERY = 3; // nodes collected per new jammer
const MAX_JAMMERS = 14;
const MIN_INTERVAL = 70;
const START_INTERVAL = 150;

export class PacketLoss {
  readonly cols: number;
  readonly rows: number;
  /** head first */
  snake: Cell[];
  dir: Dir = 'right';
  queue: Dir[] = [];
  food: Cell = { x: 0, y: 0 };
  foodAge = 0;
  jammers: Jammer[] = [];
  score = 0;
  eaten = 0;
  /** points awarded by the last eat, for the view's popup */
  lastGain = 0;
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

  /** ms between ticks: speeds up as the route grows */
  get interval() {
    return Math.max(MIN_INTERVAL, START_INTERVAL - this.eaten * 3);
  }

  turn(d: Dir) {
    const last = this.queue.length ? this.queue[this.queue.length - 1] : this.dir;
    if (d === last || d === OPPOSITE[last] || this.queue.length >= 2) return;
    this.queue.push(d);
  }

  private wrap(c: Cell): Cell {
    return { x: (c.x + this.cols) % this.cols, y: (c.y + this.rows) % this.rows };
  }

  private occupied(x: number, y: number) {
    return (
      this.snake.some((s) => s.x === x && s.y === y) ||
      this.jammers.some((j) => j.x === x && j.y === y) ||
      (this.food.x === x && this.food.y === y)
    );
  }

  private freeCell(ok: (c: Cell) => boolean = () => true): Cell | null {
    const free: Cell[] = [];
    for (let y = 0; y < this.rows; y++)
      for (let x = 0; x < this.cols; x++) if (!this.occupied(x, y) && ok({ x, y })) free.push({ x, y });
    return free.length ? free[Math.floor(this.rng() * free.length)] : null;
  }

  private placeFood() {
    // park the old food off-grid so freeCell doesn't treat it as occupied
    this.food = { x: -1, y: -1 };
    const c = this.freeCell();
    if (!c) {
      this.alive = false; // board is full: the mesh is complete
      return;
    }
    this.food = c;
    this.foodAge = 0;
  }

  private placeJammer() {
    const head = this.snake[0];
    const dist = (c: Cell) => {
      const dx = Math.abs(c.x - head.x);
      const dy = Math.abs(c.y - head.y);
      return Math.min(dx, this.cols - dx) + Math.min(dy, this.rows - dy);
    };
    // keep a fair distance from the head so a new jammer can't spawn in your face
    const c = this.freeCell((p) => dist(p) >= 6);
    if (!c) return;
    this.jammers.push({ ...c, arming: ARM_TICKS });
    if (this.jammers.length > MAX_JAMMERS) this.jammers.shift();
  }

  step(): StepResult {
    if (!this.alive) return 'dead';
    if (this.queue.length) this.dir = this.queue.shift()!;
    const v = VEC[this.dir];
    const head = this.wrap({ x: this.snake[0].x + v.x, y: this.snake[0].y + v.y });
    const eating = head.x === this.food.x && head.y === this.food.y;

    // the tail cell frees up this tick unless we're growing
    const body = eating ? this.snake : this.snake.slice(0, -1);
    const hitSelf = body.some((s) => s.x === head.x && s.y === head.y);
    const hitJam = this.jammers.some((j) => j.arming <= 0 && j.x === head.x && j.y === head.y);
    if (hitSelf || hitJam) {
      this.alive = false;
      return 'dead';
    }

    this.snake.unshift(head);
    if (!eating) this.snake.pop();

    for (const j of this.jammers) if (j.arming > 0) j.arming--;
    this.foodAge++;

    if (eating) {
      this.eaten++;
      // a faster catch pays a signal bonus of up to +10
      this.lastGain = 10 + Math.max(0, 10 - Math.floor(this.foodAge / 2));
      this.score += this.lastGain;
      // a jammer that was still warning under the new head is cleared
      this.jammers = this.jammers.filter((j) => !(j.x === head.x && j.y === head.y));
      this.placeFood();
      if (this.eaten % JAMMER_EVERY === 0) this.placeJammer();
      return this.alive ? 'eat' : 'dead';
    }
    return 'move';
  }
}
