// 5x7 bitmap glyphs for the dot-matrix logo. Only the letters the brand needs.
// '#' = lit dot, '.' = empty cell.
export const GLYPH_W = 5;
export const GLYPH_H = 7;

const G: Record<string, string[]> = {
  d: ['....#', '....#', '..###', '.#..#', '.#..#', '.#..#', '..###'],
  '3': ['.###.', '#...#', '....#', '..##.', '....#', '#...#', '.###.'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
};

export interface LitCell {
  col: number;
  row: number;
  /** index of the glyph this cell belongs to */
  glyph: number;
}

/** Lay a string out on a cell grid; `gap` = empty columns between glyphs. */
export function layoutText(text: string, gap = 1) {
  const cells: LitCell[] = [];
  let col = 0;
  [...text].forEach((ch, gi) => {
    const glyph = G[ch];
    if (!glyph) return;
    glyph.forEach((line, row) => {
      for (let c = 0; c < GLYPH_W; c++) {
        if (line[c] === '#') cells.push({ col: col + c, row, glyph: gi });
      }
    });
    col += GLYPH_W + gap;
  });
  return { cells, cols: Math.max(0, col - gap), rows: GLYPH_H };
}
