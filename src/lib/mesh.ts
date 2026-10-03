import type { PinnedRepo } from '@/hooks/usePinnedRepos';
import type { Put, Tone } from '@/lib/glyphAtlas';

// The d3FRAG mesh: pinned repos become named nodes, the rest are anonymous relays.
// Positions are normalised (0..1) so the same network can be drawn on the full-screen
// background and inside the Mesh Map window. Telemetry (RSSI, packets) is simulated.

export interface MeshNode {
  id: string;
  label: string;
  x: number;
  y: number;
  kind: 'repo' | 'relay';
  repo?: PinnedRepo;
}

export interface MeshLink {
  a: number;
  b: number;
}

export interface Mesh {
  nodes: MeshNode[];
  links: MeshLink[];
}

// Slots around the edges first, then a few inner ones. Kept clear of the left-hand desktop icons and the centred logo.
const SLOTS: [number, number][] = [
  [0.2, 0.14], [0.42, 0.07], [0.68, 0.12], [0.9, 0.2], [0.93, 0.5], [0.88, 0.8],
  [0.64, 0.9], [0.4, 0.86], [0.2, 0.84], [0.17, 0.55], [0.22, 0.34], [0.8, 0.38],
];
const REPO_SLOT_ORDER = [1, 4, 6, 8, 2, 5, 9, 11];

const dist = (a: MeshNode, b: MeshNode) => Math.hypot((a.x - b.x) * 1.7, a.y - b.y);

export const buildMesh = (repos: PinnedRepo[]): Mesh => {
  const visible = repos.filter((r) => !r.isArchived).slice(0, REPO_SLOT_ORDER.length);
  const nodes: MeshNode[] = SLOTS.map(([x, y], i) => ({ id: `relay-${i}`, label: '', x, y, kind: 'relay' as const }));

  visible.forEach((repo, k) => {
    const slot = REPO_SLOT_ORDER[k];
    nodes[slot] = { id: repo.id, label: repo.name, x: SLOTS[slot][0], y: SLOTS[slot][1], kind: 'repo', repo };
  });
  let relay = 1;
  nodes.forEach((n) => {
    if (n.kind === 'relay') n.label = `N-${String(relay++).padStart(2, '0')}`;
  });

  // ring of links around the centre + a chord from each node to its nearest unlinked neighbour
  const order = nodes.map((_, i) => i).sort((i, j) => {
    const ang = (n: MeshNode) => Math.atan2(n.y - 0.5, (n.x - 0.5) * 1.7);
    return ang(nodes[i]) - ang(nodes[j]);
  });
  const key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  const seen = new Set<string>();
  const links: MeshLink[] = [];
  const add = (a: number, b: number) => {
    if (a === b || seen.has(key(a, b))) return;
    seen.add(key(a, b));
    links.push({ a, b });
  };
  order.forEach((idx, k) => add(idx, order[(k + 1) % order.length]));
  nodes.forEach((n, i) => {
    const near = nodes
      .map((m, j) => ({ j, d: dist(n, m) }))
      .filter(({ j }) => j !== i && !seen.has(key(i, j)))
      .sort((p, q) => p.d - q.d)[0];
    if (near && near.d < 0.42) add(i, near.j);
  });
  return { nodes, links };
};

// ---------------------------------------------------------------- grid layout + drawing

interface Cell {
  col: number;
  row: number;
  glyph: string;
}

export interface MeshLayout {
  cols: number;
  rows: number;
  cells: { col: number; row: number }[]; // node centres
  paths: Cell[][]; // per link, cells from a -> b
  labelCols: number[]; // first column of each node's label
  labelRight: boolean[];
}

const trim = (s: string) => (s.length > 15 ? s.slice(0, 14) + '…' : s);
export const nodeLabel = (n: MeshNode) => trim(n.label);

export const layoutMesh = (mesh: Mesh, cols: number, rows: number): MeshLayout => {
  const cells = mesh.nodes.map((n) => ({
    col: Math.max(3, Math.min(cols - 4, Math.round(n.x * cols))),
    row: Math.max(1, Math.min(rows - 3, Math.round(n.y * rows))),
  }));
  const paths = mesh.links.map(({ a, b }) => {
    const out: Cell[] = [];
    let { col: x, row: y } = cells[a];
    const { col: x1, row: y1 } = cells[b];
    const dx = Math.abs(x1 - x);
    const dy = Math.abs(y1 - y);
    const sx = x < x1 ? 1 : -1;
    const sy = y < y1 ? 1 : -1;
    let err = dx - dy;
    for (let guard = 0; guard < 4000; guard++) {
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      let mx = false;
      let my = false;
      if (e2 > -dy) { err -= dy; x += sx; mx = true; }
      if (e2 < dx) { err += dx; y += sy; my = true; }
      const glyph = mx && my ? (sx === sy ? '\\' : '/') : mx ? '-' : '|';
      out.push({ col: x, row: y, glyph });
    }
    return out;
  });
  const labelRight = mesh.nodes.map((n) => n.x < 0.75);
  const labelCols = mesh.nodes.map((n, i) => {
    const len = nodeLabel(n).length;
    return labelRight[i] ? cells[i].col + 3 : cells[i].col - 2 - len;
  });
  return { cols, rows, cells, paths, labelCols, labelRight };
};

export interface Packet {
  link: number;
  t: number; // 0..1 along the path
  dir: 1 | -1;
  tone: Tone;
  speed: number; // cells per second
}

/** Tiny simulation: packets hopping along links, nodes pulsing on arrival, drifting RSSI. */
export class MeshSim {
  packets: Packet[] = [];
  pulseUntil: number[];
  rssi: number[];
  private nextSpawn = 0;
  private nextRssi = 0;
  private last = 0;

  constructor(private mesh: Mesh) {
    this.pulseUntil = mesh.nodes.map(() => 0);
    this.rssi = mesh.nodes.map((_, i) => -95 - ((i * 7) % 28));
  }

  step(now: number, layout: MeshLayout, rate = 1) {
    const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 0;
    this.last = now;
    if (now > this.nextSpawn && this.packets.length < 7 && this.mesh.links.length) {
      this.nextSpawn = now + (450 + Math.random() * 900) / Math.max(0.3, rate);
      const link = Math.floor(Math.random() * this.mesh.links.length);
      const tones: Tone[] = ['pink', 'blue', 'yellow', 'green', 'green'];
      this.packets.push({ link, t: 0, dir: Math.random() > 0.5 ? 1 : -1, tone: tones[Math.floor(Math.random() * tones.length)], speed: 14 + Math.random() * 14 });
    }
    for (let n = this.packets.length - 1; n >= 0; n--) {
      const p = this.packets[n];
      const len = Math.max(1, layout.paths[p.link]?.length ?? 1);
      p.t += (p.speed * dt) / len;
      if (p.t >= 1) {
        const l = this.mesh.links[p.link];
        this.pulseUntil[p.dir === 1 ? l.b : l.a] = now + 450;
        this.packets.splice(n, 1);
      }
    }
    if (now > this.nextRssi) {
      this.nextRssi = now + 1400;
      this.rssi = this.rssi.map((v) => Math.max(-125, Math.min(-82, v + Math.round((Math.random() - 0.5) * 6))));
    }
  }
}

export interface DrawOpts {
  alpha: number; // overall intensity 0..1
  hover: number; // hovered node index or -1
  selected: number; // selected node index or -1
  now: number;
  /** 'hot' = only label the hovered/selected node (used when the map is too narrow for every label) */
  labels?: 'all' | 'hot';
}

const nodeTone = (n: MeshNode): Tone => (n.kind === 'repo' ? (n.repo?.flashable ? 'green' : 'blue') : 'gray');

export const drawMesh = (put: Put, mesh: Mesh, layout: MeshLayout, sim: MeshSim, o: DrawOpts) => {
  const active = new Set<number>();
  [o.hover, o.selected].forEach((i) => {
    if (i >= 0) mesh.links.forEach((l, k) => (l.a === i || l.b === i) && active.add(k));
  });

  // keep link characters out of label text (and the node glyphs)
  const blocked = new Set<string>();
  mesh.nodes.forEach((n, i) => {
    const c = layout.cells[i];
    const len = nodeLabel(n).length;
    for (let col = layout.labelCols[i] - 1; col <= layout.labelCols[i] + len; col++) {
      blocked.add(`${col},${c.row}`);
      blocked.add(`${col},${c.row + 1}`);
    }
    for (let col = c.col - 2; col <= c.col + 2; col++) blocked.add(`${col},${c.row}`);
  });

  layout.paths.forEach((path, k) => {
    const lit = active.has(k);
    path.forEach((c, idx) => {
      if (idx < 2 || idx > path.length - 3) return; // leave room around nodes
      if (blocked.has(`${c.col},${c.row}`)) return;
      put(c.glyph, c.col, c.row, lit ? 'green' : 'gray', (lit ? 0.5 : 0.17) * o.alpha);
    });
  });

  sim.packets.forEach((p) => {
    const path = layout.paths[p.link];
    if (!path || path.length < 5) return;
    const at = (t: number) => path[Math.max(2, Math.min(path.length - 3, Math.floor((p.dir === 1 ? t : 1 - t) * (path.length - 1))))];
    const head = at(p.t);
    put('*', head.col, head.row, p.tone, Math.min(1, 0.95 * o.alpha + 0.2));
    const tail = at(Math.max(0, p.t - 0.05));
    put('·', tail.col, tail.row, p.tone, 0.5 * o.alpha);
  });

  mesh.nodes.forEach((n, i) => {
    const c = layout.cells[i];
    const hot = i === o.hover || i === o.selected;
    const pulse = o.now < sim.pulseUntil[i];
    const tone: Tone = hot ? 'green' : nodeTone(n);
    const a = Math.min(1, (hot ? 1 : n.kind === 'repo' ? 0.78 : 0.4) * o.alpha + (hot ? 0 : 0.08));
    const [l, m, r] = hot ? ['[', '@', ']'] : n.kind === 'repo' ? ['(', '@', ')'] : ['(', 'o', ')'];
    put(l, c.col - 1, c.row, tone, a);
    put(m, c.col, c.row, pulse ? 'yellow' : tone, Math.min(1, a + (pulse ? 0.3 : 0)));
    put(r, c.col + 1, c.row, tone, a);
    if (pulse) {
      put('+', c.col, c.row - 1, 'yellow', 0.7 * o.alpha);
      put('+', c.col, c.row + 1, 'yellow', 0.7 * o.alpha);
    }

    if (o.labels === 'hot' && !hot) return;
    const label = nodeLabel(n);
    const startCol = layout.labelCols[i];
    [...label].forEach((ch, k) => put(ch, startCol + k, c.row, hot ? 'green' : n.kind === 'repo' ? 'gray' : 'gray', hot ? 1 : (n.kind === 'repo' ? 0.75 : 0.35) * o.alpha + 0.05));
    if (n.kind === 'repo' || hot) {
      const sig = `${sim.rssi[i]}dBm`;
      const sc = layout.labelRight[i] ? startCol : startCol + label.length - sig.length;
      [...sig].forEach((ch, k) => put(ch, sc + k, c.row + 1, 'blue', (hot ? 0.8 : 0.4) * o.alpha));
    }
  });
};

/** Index of the node under (col,row), counting the node glyph and its label, or -1. */
export const hitTest = (mesh: Mesh, layout: MeshLayout, col: number, row: number, withLabels = true): number => {
  for (let i = 0; i < mesh.nodes.length; i++) {
    const c = layout.cells[i];
    if (row !== c.row) continue;
    const len = nodeLabel(mesh.nodes[i]).length;
    const from = withLabels ? Math.min(c.col - 1, layout.labelCols[i]) : c.col - 1;
    const to = withLabels ? Math.max(c.col + 1, layout.labelCols[i] + len - 1) : c.col + 1;
    if (col >= from && col <= to) return i;
  }
  return -1;
};
