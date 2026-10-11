import { content } from '../data/content';
import type { TileMap, TilePos } from '../data/schemas';
import { isWalkable, terrainAt } from './map';

const DIRS: ReadonlyArray<readonly [number, number]> = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

/** Minimal binary min-heap of [priority, value] keyed on priority; ties broken by insertion order. */
class MinHeap {
  private items: Array<[number, number, number]> = [];
  private counter = 0;

  get size(): number {
    return this.items.length;
  }

  push(priority: number, value: number): void {
    const items = this.items;
    items.push([priority, this.counter++, value]);
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this.less(i, parent)) break;
      [items[i], items[parent]] = [items[parent]!, items[i]!];
      i = parent;
    }
  }

  pop(): number | undefined {
    const items = this.items;
    if (items.length === 0) return undefined;
    const top = items[0]!;
    const last = items.pop()!;
    if (items.length > 0) {
      items[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let smallest = i;
        if (l < items.length && this.less(l, smallest)) smallest = l;
        if (r < items.length && this.less(r, smallest)) smallest = r;
        if (smallest === i) break;
        [items[i], items[smallest]] = [items[smallest]!, items[i]!];
        i = smallest;
      }
    }
    return top[2];
  }

  private less(a: number, b: number): boolean {
    const x = this.items[a]!;
    const y = this.items[b]!;
    return x[0] < y[0] || (x[0] === y[0] && x[1] < y[1]);
  }
}

export function moveCostAt(map: TileMap, x: number, y: number): number {
  const t = terrainAt(map, x, y);
  return t === undefined ? Infinity : content.terrain[t].moveCost;
}

/**
 * A* over the 4-connected tile grid. Entering a tile costs its terrain moveCost.
 * Returns the path excluding `from` and including `to`, [] if already there, or null if unreachable.
 */
export function findPath(map: TileMap, from: TilePos, to: TilePos): TilePos[] | null {
  if (from.x === to.x && from.y === to.y) return [];
  if (!isWalkable(map, to.x, to.y)) return null;

  const w = map.width;
  const start = from.y * w + from.x;
  const goal = to.y * w + to.x;
  const cost = new Map<number, number>([[start, 0]]);
  const cameFrom = new Map<number, number>();
  const open = new MinHeap();
  const h = (i: number) => Math.abs((i % w) - to.x) + Math.abs(Math.floor(i / w) - to.y);
  open.push(h(start), start);

  while (open.size > 0) {
    const current = open.pop()!;
    if (current === goal) break;
    const cx = current % w;
    const cy = Math.floor(current / w);
    const base = cost.get(current)!;
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!isWalkable(map, nx, ny)) continue;
      const n = ny * w + nx;
      const c = base + moveCostAt(map, nx, ny);
      if (c < (cost.get(n) ?? Infinity)) {
        cost.set(n, c);
        cameFrom.set(n, current);
        open.push(c + h(n), n);
      }
    }
  }

  if (!cameFrom.has(goal)) return null;
  const path: TilePos[] = [];
  for (let i = goal; i !== start; i = cameFrom.get(i)!) path.push({ x: i % w, y: Math.floor(i / w) });
  return path.reverse();
}
