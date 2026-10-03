// JAM_INVADERS engine: a Space Invaders-style shooter. Pure logic in a fixed 224x256 field
// (the arcade's pixel grid) so the view can scale it to any window. Time is in seconds.

export const FIELD_W = 224;
export const FIELD_H = 256;

export type Bitmap = string[];
const bm = (s: string): Bitmap => s.trim().split('\n').map((r) => r.trim());

// Two animation frames per invader type, plus the player's tower and the rogue AP (UFO).
export const SPRITES = {
  squid: [
    bm(`
...XX...
..XXXX..
.XXXXXX.
XX.XX.XX
XXXXXXXX
..X..X..
.X.XX.X.
X.X..X.X`),
    bm(`
...XX...
..XXXX..
.XXXXXX.
XX.XX.XX
XXXXXXXX
.X.XX.X.
X......X
.X....X.`),
  ],
  crab: [
    bm(`
..X.....X..
...X...X...
..XXXXXXX..
.XX.XXX.XX.
XXXXXXXXXXX
X.XXXXXXX.X
X.X.....X.X
...XX.XX...`),
    bm(`
..X.....X..
X..X...X..X
X.XXXXXXX.X
XXX.XXX.XXX
XXXXXXXXXXX
.XXXXXXXXX.
..X.....X..
.X.......X.`),
  ],
  octopus: [
    bm(`
....XXXX....
.XXXXXXXXXX.
XXXXXXXXXXXX
XXX..XX..XXX
XXXXXXXXXXXX
...XX..XX...
..XX.XX.XX..
XX........XX`),
    bm(`
....XXXX....
.XXXXXXXXXX.
XXXXXXXXXXXX
XXX..XX..XXX
XXXXXXXXXXXX
..XXX..XXX..
.XX..XX..XX.
..XX....XX..`),
  ],
  player: [
    bm(`
......X......
.....XXX.....
.....XXX.....
.XXXXXXXXXXX.
XXXXXXXXXXXXX
XXXXXXXXXXXXX
XXXXXXXXXXXXX
XXXXXXXXXXXXX`),
  ],
  ufo: [
    bm(`
.....XXXXXX.....
...XXXXXXXXXX...
..XXXXXXXXXXXX..
.XX.XX.XX.XX.XX.
XXXXXXXXXXXXXXXX
..XXX..XX..XXX..
...X........X...`),
  ],
} as const;

export type InvaderKind = 'squid' | 'crab' | 'octopus';
const ROW_KIND: InvaderKind[] = ['squid', 'crab', 'crab', 'octopus', 'octopus'];
const POINTS: Record<InvaderKind, number> = { squid: 30, crab: 20, octopus: 10 };
const SIZE: Record<InvaderKind, { w: number; h: number }> = {
  squid: { w: 8, h: 8 }, crab: { w: 11, h: 8 }, octopus: { w: 12, h: 8 },
};

export const COLS = 11;
export const ROWS = 5;
const CELL_X = 16;
const CELL_Y = 16;
const PLAYER_Y = 232;
const PLAYER_W = 13;
const PLAYER_SPEED = 95;
const SHOT_SPEED = 230;
const BOMB_SPEED = 85;
const SHIELD_W = 22;
const SHIELD_H = 16;
const SHIELD_Y = 196;
const UFO_Y = 34;
const EXTRA_LIFE_AT = 1500;

export interface Invader { row: number; col: number; kind: InvaderKind; alive: boolean }
export interface Shot { x: number; y: number }
export interface Bomb extends Shot { phase: number }
export interface Ufo { x: number; dir: 1 | -1; points: number }
export type GameEvent =
  | { type: 'shoot' }
  | { type: 'kill'; x: number; y: number; kind: InvaderKind; points: number }
  | { type: 'ufo'; x: number; y: number; points: number }
  | { type: 'hit'; x: number; y: number } // player destroyed
  | { type: 'wave'; wave: number }
  | { type: 'extra' }
  | { type: 'over' }
  | { type: 'march' };
export interface Input { left: boolean; right: boolean; fire: boolean }

const makeShield = (): Uint8Array => {
  const g = new Uint8Array(SHIELD_W * SHIELD_H);
  for (let y = 0; y < SHIELD_H; y++)
    for (let x = 0; x < SHIELD_W; x++) {
      const corner = y < 4 && (x < 4 - y || x >= SHIELD_W - (4 - y)); // chamfered top
      const hole = y >= 11 && x >= 7 && x < 15; // arch at the bottom
      if (!corner && !hole) g[y * SHIELD_W + x] = 1;
    }
  return g;
};

export class Invaders {
  rng: () => number;
  invaders: Invader[] = [];
  /** top-left of the formation grid */
  fx = 0;
  fy = 0;
  dir: 1 | -1 = 1;
  frame = 0;
  private moveTimer = 0;
  shields: Uint8Array[] = [];
  playerX = FIELD_W / 2;
  shot: Shot | null = null;
  bombs: Bomb[] = [];
  ufo: Ufo | null = null;
  private ufoTimer = 15;
  private bombTimer = 1;
  score = 0;
  lives = 3;
  wave = 1;
  alive = true;
  /** >0 while the tower is exploding / respawning */
  respawn = 0;
  /** seconds of invulnerability after a respawn */
  invuln = 0;
  private extraGiven = false;
  events: GameEvent[] = [];

  constructor(rng: () => number = Math.random) {
    this.rng = rng;
    this.newWave();
  }

  private newWave() {
    this.invaders = [];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) this.invaders.push({ row: r, col: c, kind: ROW_KIND[r], alive: true });
    this.fx = 12;
    // later waves start lower, like the arcade
    this.fy = 52 + Math.min(this.wave - 1, 5) * 8;
    this.dir = 1;
    this.moveTimer = 0;
    this.bombs = [];
    this.shot = null;
    this.shields = [0, 1, 2, 3].map(makeShield);
  }

  get aliveCount() { return this.invaders.reduce((n, i) => n + (i.alive ? 1 : 0), 0); }

  /** pixel box of an invader in field coordinates */
  box(i: Invader) {
    const s = SIZE[i.kind];
    return { x: this.fx + i.col * CELL_X + (CELL_X - s.w) / 2, y: this.fy + i.row * CELL_Y, w: s.w, h: s.h };
  }

  shieldX(n: number) {
    return 34 + n * 45;
  }
  static readonly SHIELD_W = SHIELD_W;
  static readonly SHIELD_H = SHIELD_H;
  static readonly SHIELD_Y = SHIELD_Y;
  static readonly PLAYER_Y = PLAYER_Y;
  static readonly PLAYER_W = PLAYER_W;
  static readonly UFO_Y = UFO_Y;

  /** seconds between formation steps: faster as it thins out, and on later waves */
  private get stepEvery() {
    return Math.max(0.03, (0.04 + this.aliveCount * 0.0105) * Math.max(0.55, 1 - (this.wave - 1) * 0.08));
  }

  private erode(shieldIdx: number, px: number, py: number, r: number) {
    const sx = this.shieldX(shieldIdx);
    const g = this.shields[shieldIdx];
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y > r * r + 1 && this.rng() < 0.7) continue; // ragged edge
        const lx = Math.floor(px - sx) + x;
        const ly = Math.floor(py - SHIELD_Y) + y;
        if (lx >= 0 && lx < SHIELD_W && ly >= 0 && ly < SHIELD_H) g[ly * SHIELD_W + lx] = 0;
      }
  }

  /** is there shield material at this field point? returns the shield index or -1 */
  private shieldAt(px: number, py: number): number {
    if (py < SHIELD_Y || py >= SHIELD_Y + SHIELD_H) return -1;
    for (let n = 0; n < this.shields.length; n++) {
      const lx = Math.floor(px - this.shieldX(n));
      const ly = Math.floor(py - SHIELD_Y);
      if (lx >= 0 && lx < SHIELD_W && ly >= 0 && ly < SHIELD_H && this.shields[n][ly * SHIELD_W + lx]) return n;
    }
    return -1;
  }

  update(dtRaw: number, input: Input) {
    if (!this.alive) return;
    let dt = Math.min(dtRaw, 0.1);
    while (dt > 0 && this.alive) {
      const h = Math.min(dt, 1 / 90);
      this.tick(h, input);
      dt -= h;
    }
  }

  private tick(dt: number, input: Input) {
    // ---- player
    if (this.respawn > 0) {
      this.respawn -= dt;
      if (this.respawn <= 0) {
        this.respawn = 0;
        this.invuln = 1.6;
        this.playerX = FIELD_W / 2;
      }
    } else {
      this.invuln = Math.max(0, this.invuln - dt);
      const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      this.playerX = Math.max(PLAYER_W / 2 + 4, Math.min(FIELD_W - PLAYER_W / 2 - 4, this.playerX + dx * PLAYER_SPEED * dt));
      if (input.fire && !this.shot) {
        this.shot = { x: this.playerX, y: PLAYER_Y - 2 };
        this.events.push({ type: 'shoot' });
      }
    }

    // ---- player shot
    if (this.shot) {
      let left = SHOT_SPEED * dt;
      while (left > 0 && this.shot) {
        const step = Math.min(1, left);
        left -= step;
        this.shot.y -= step;
        if (this.resolveShot()) this.shot = null;
        else if (this.shot.y < 20) this.shot = null;
      }
    }

    // ---- formation
    this.moveTimer += dt;
    while (this.moveTimer >= this.stepEvery && this.aliveCount > 0) {
      this.moveTimer -= this.stepEvery;
      this.stepFormation();
    }

    // ---- bombs
    this.bombTimer -= dt;
    const maxBombs = Math.min(3 + Math.floor(this.wave / 2), 6);
    if (this.bombTimer <= 0 && this.bombs.length < maxBombs && this.aliveCount > 0) {
      this.dropBomb();
      this.bombTimer = (0.35 + this.rng() * 0.9) * Math.max(0.4, 1 - (this.wave - 1) * 0.08);
    }
    for (const b of this.bombs) {
      let left = BOMB_SPEED * dt;
      while (left > 0 && b.y < FIELD_H) {
        const step = Math.min(1, left);
        left -= step;
        b.y += step;
        const s = this.shieldAt(b.x, b.y + 2);
        if (s >= 0) { this.erode(s, b.x, b.y + 2, 3); b.y = FIELD_H + 1; break; }
      }
      b.phase += dt * 12;
    }
    this.bombs = this.bombs.filter((b) => b.y <= FIELD_H);
    this.bombsVsPlayer();

    // ---- ufo
    if (this.ufo) {
      this.ufo.x += this.ufo.dir * 38 * dt;
      if (this.ufo.x < -20 || this.ufo.x > FIELD_W + 20) this.ufo = null;
    } else if (this.aliveCount > 7) {
      this.ufoTimer -= dt;
      if (this.ufoTimer <= 0) {
        const dir: 1 | -1 = this.rng() < 0.5 ? 1 : -1;
        const pts = [50, 100, 100, 150, 300][Math.floor(this.rng() * 5)];
        this.ufo = { x: dir === 1 ? -16 : FIELD_W + 16, dir, points: pts };
        this.ufoTimer = 18 + this.rng() * 14;
      }
    }

    // ---- wave cleared?
    if (this.aliveCount === 0 && this.alive) {
      this.wave++;
      this.events.push({ type: 'wave', wave: this.wave });
      this.newWave();
    }
  }

  private stepFormation() {
    const alive = this.invaders.filter((i) => i.alive);
    let minX = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const i of alive) {
      const b = this.box(i);
      minX = Math.min(minX, b.x);
      maxX = Math.max(maxX, b.x + b.w);
      maxY = Math.max(maxY, b.y + b.h);
    }
    const stepPx = 2;
    const hitEdge = (this.dir === 1 && maxX + stepPx > FIELD_W - 6) || (this.dir === -1 && minX - stepPx < 6);
    if (hitEdge) {
      this.dir = (this.dir * -1) as 1 | -1;
      this.fy += 8;
    } else this.fx += this.dir * stepPx;
    this.frame ^= 1;
    this.events.push({ type: 'march' });

    // invaders chew through the shields as they descend
    for (const i of alive) {
      const b = this.box(i);
      if (b.y + b.h >= SHIELD_Y) {
        for (let n = 0; n < this.shields.length; n++) {
          const sx = this.shieldX(n);
          if (b.x < sx + SHIELD_W && b.x + b.w > sx) {
            const g = this.shields[n];
            for (let y = 0; y < SHIELD_H; y++)
              for (let x = 0; x < SHIELD_W; x++) {
                const px = sx + x, py = SHIELD_Y + y;
                if (px >= b.x && px < b.x + b.w && py >= b.y && py < b.y + b.h) g[y * SHIELD_W + x] = 0;
              }
          }
        }
      }
    }
    // reached the tower's row: the mesh is overrun
    if (maxY + 2 >= PLAYER_Y) this.gameOver();
  }

  private dropBomb() {
    // only the lowest invader in a column can fire, preferring columns near the player
    const bottoms = new Map<number, Invader>();
    for (const i of this.invaders) if (i.alive) {
      const cur = bottoms.get(i.col);
      if (!cur || i.row > cur.row) bottoms.set(i.col, i);
    }
    const cands = [...bottoms.values()];
    if (!cands.length) return;
    let pick = cands[Math.floor(this.rng() * cands.length)];
    if (this.rng() < 0.4) {
      pick = cands.reduce((a, b) => (Math.abs(this.box(b).x - this.playerX) < Math.abs(this.box(a).x - this.playerX) ? b : a));
    }
    const b = this.box(pick);
    this.bombs.push({ x: b.x + b.w / 2, y: b.y + b.h, phase: 0 });
  }

  /** returns true if the shot was consumed */
  private resolveShot(): boolean {
    const s = this.shot!;
    // shields
    const sh = this.shieldAt(s.x, s.y);
    if (sh >= 0) { this.erode(sh, s.x, s.y, 2); return true; }
    // ufo
    if (this.ufo && s.y <= UFO_Y + 7 && s.y >= UFO_Y && Math.abs(s.x - this.ufo.x) < 8) {
      this.score += this.ufo.points;
      this.events.push({ type: 'ufo', x: this.ufo.x, y: UFO_Y, points: this.ufo.points });
      this.ufo = null;
      this.checkExtra();
      return true;
    }
    // bombs (a shot can cancel a bomb)
    const bi = this.bombs.findIndex((b) => Math.abs(b.x - s.x) < 3 && Math.abs(b.y - s.y) < 5);
    if (bi >= 0) { this.bombs.splice(bi, 1); return true; }
    // invaders
    for (const i of this.invaders) {
      if (!i.alive) continue;
      const b = this.box(i);
      if (s.x >= b.x && s.x <= b.x + b.w && s.y >= b.y && s.y <= b.y + b.h) {
        i.alive = false;
        const points = POINTS[i.kind];
        this.score += points;
        this.events.push({ type: 'kill', x: b.x + b.w / 2, y: b.y + b.h / 2, kind: i.kind, points });
        this.checkExtra();
        return true;
      }
    }
    return false;
  }

  private checkExtra() {
    if (!this.extraGiven && this.score >= EXTRA_LIFE_AT) {
      this.extraGiven = true;
      this.lives = Math.min(5, this.lives + 1);
      this.events.push({ type: 'extra' });
    }
  }

  private bombsVsPlayer() {
    if (this.respawn > 0 || this.invuln > 0) return;
    const hit = this.bombs.findIndex(
      (b) => b.y + 3 >= PLAYER_Y && b.y <= PLAYER_Y + 8 && Math.abs(b.x - this.playerX) < PLAYER_W / 2,
    );
    if (hit < 0) return;
    this.bombs.splice(hit, 1);
    this.events.push({ type: 'hit', x: this.playerX, y: PLAYER_Y + 4 });
    this.lives--;
    this.shot = null;
    if (this.lives <= 0) this.gameOver();
    else this.respawn = 1.2;
  }

  private gameOver() {
    this.alive = false;
    this.events.push({ type: 'over' });
  }

  drain(): GameEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }
}
