import { content } from '../../data/content';
import type { EntityId, GameState, JobKind, SkillId, Stockpile, TerrainId, TilePos } from '../../data/schemas';
import { getComponent } from '../entities';
import { currentSeason } from '../environment';
import { isWalkable, terrainAt } from '../map';
import { livingPawns } from '../pawnQueries';
import type { Rng } from '../rng';
import { campCenter, manhattan } from '../structures';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** 0.5 when a need just crosses its threshold, rising to 1.2 at zero; 0 above the threshold. */
export function urgency(value: number, threshold: number): number {
  if (value >= threshold) return 0;
  return 0.5 + (0.7 * (threshold - value)) / threshold;
}

export function skillFactor(level: number): number {
  const { skillFactorMin, skillFactorMax } = content.balance.work;
  return skillFactorMin + ((skillFactorMax - skillFactorMin) * level) / 20;
}

export function pawnSkillFactor(state: GameState, pawnId: EntityId, skill: SkillId | null): number {
  if (skill === null) return 1;
  return skillFactor(getComponent(state, 'pawn', pawnId)?.skills[skill] ?? 0);
}

/** Work speed: skill times a mood factor (sad pawns work slower). */
export function workSpeed(state: GameState, pawnId: EntityId, kind: JobKind): number {
  const { moodSpeedMin, moodSpeedRange } = content.balance.work;
  const mood = getComponent(state, 'mood', pawnId)?.value ?? 0.5;
  return pawnSkillFactor(state, pawnId, content.jobs[kind].skill) * (moodSpeedMin + moodSpeedRange * mood);
}

export function edibleFood(state: GameState): number {
  return state.resources.food + state.resources.meals;
}

/** 0.05..1: how badly the band needs more food, relative to a seasonal stock target. */
export function foodDemand(state: GameState): number {
  const f = content.balance.food;
  const pawns = Math.max(1, livingPawns(state).length);
  const days = edibleFood(state) / (pawns * f.eatenPerPawnPerDay);
  const target = currentSeason(state.tick) === 'autumn' ? f.autumnTargetStockDays : f.targetStockDays;
  return clamp(1.2 - days / target, 0.05, 1);
}

export function woodDemand(state: GameState): number {
  const w = content.balance.work;
  const target = currentSeason(state.tick) === 'autumn' ? w.autumnTargetWood : w.targetWood;
  return clamp(1 - state.resources.wood / target, 0, 1);
}

export function addResources(state: GameState, amounts: Partial<Stockpile>, scale = 1): GameState {
  const resources = { ...state.resources };
  for (const [r, n] of Object.entries(amounts)) resources[r as keyof Stockpile] += (n ?? 0) * scale;
  return { ...state, resources };
}

/** Other pawns' jobs of the given kinds (for reservations). */
export function otherJobs(state: GameState, pawnId: EntityId, kinds: readonly JobKind[]) {
  return livingPawns(state)
    .filter((id) => id !== pawnId)
    .map((id) => getComponent(state, 'job', id))
    .filter((j) => j !== undefined && kinds.includes(j.kind));
}

const tileKey = (p: TilePos) => `${p.x},${p.y}`;

export function reservedTiles(state: GameState, pawnId: EntityId, kinds: readonly JobKind[]): Set<string> {
  return new Set(
    otherJobs(state, pawnId, kinds)
      .map((j) => j!.targetTile)
      .filter((t) => t !== null)
      .map(tileKey),
  );
}

export function countJobsOnEntity(state: GameState, pawnId: EntityId, kind: JobKind, entity: EntityId): number {
  return otherJobs(state, pawnId, [kind]).filter((j) => j!.targetEntity === entity).length;
}

/**
 * Best tile near `from`, where a tile's score is value / (1 + 0.05 * manhattanDistance).
 * Searches outward ring by ring and stops once no farther tile could beat the best found,
 * given that value never exceeds maxValue. Ties go to the first tile found (deterministic).
 */
export function bestTileNear(
  state: GameState,
  from: TilePos,
  value: (pos: TilePos, terrain: TerrainId) => number | null,
  reserved: Set<string>,
  maxValue: number,
): TilePos | null {
  const { width, height } = state.map;
  const maxRadius = Math.max(width, height);
  let best: TilePos | null = null;
  let bestScore = -Infinity;
  const consider = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const pos = { x, y };
    if (reserved.has(tileKey(pos))) return;
    const v = value(pos, terrainAt(state.map, x, y)!);
    if (v === null) return;
    const sc = v / (1 + manhattan(from, pos) * 0.05);
    if (sc > bestScore) {
      best = pos;
      bestScore = sc;
    }
  };

  for (let r = 0; r <= maxRadius; r++) {
    // Every tile on Chebyshev ring r is at least r steps away.
    if (best !== null && maxValue / (1 + r * 0.05) <= bestScore) break;
    if (r === 0) {
      consider(from.x, from.y);
      continue;
    }
    for (let d = -r; d <= r; d++) {
      consider(from.x + d, from.y - r);
      consider(from.x + d, from.y + r);
    }
    for (let d = -r + 1; d <= r - 1; d++) {
      consider(from.x - r, from.y + d);
      consider(from.x + r, from.y + d);
    }
  }
  return best;
}

/** A free walkable tile around the camp hearth, so gathered pawns don't stack on one tile. */
export function spotNearCamp(state: GameState, pawnId: EntityId, rng: Rng, radius = 2): TilePos {
  const center = campCenter(state);
  const taken = new Set(
    livingPawns(state)
      .filter((id) => id !== pawnId)
      .map((id) => getComponent(state, 'job', id)?.targetTile)
      .filter((t) => t != null)
      .map((t) => tileKey(t!)),
  );
  const free: TilePos[] = [];
  for (let y = center.y - radius; y <= center.y + radius; y++) {
    for (let x = center.x - radius; x <= center.x + radius; x++) {
      if ((x !== center.x || y !== center.y) && isWalkable(state.map, x, y) && !taken.has(`${x},${y}`)) {
        free.push({ x, y });
      }
    }
  }
  return free.length > 0 ? rng.pick(free) : center;
}

export function distanceFromPawn(state: GameState, pawnId: EntityId, pos: TilePos): number {
  const p = getComponent(state, 'position', pawnId);
  return p ? manhattan(p, pos) : 0;
}
