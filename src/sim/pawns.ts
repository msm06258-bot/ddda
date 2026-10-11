import { content } from '../data/content';
import {
  SkillId,
  type EntityId,
  type GameState,
  type KinRelationType,
  type Sex,
  type Skills,
  type TilePos,
} from '../data/schemas';
import { createEntity, entitiesWith, getComponent, setComponent } from './entities';
import type { Rng } from './rng';
import { yearsToTicks } from './time';

export type SpawnPawnOptions = {
  sex: Sex;
  ageYears: number;
  position: TilePos;
  name?: string;
};

const RECIPROCAL: Record<KinRelationType, KinRelationType> = {
  parent: 'child',
  child: 'parent',
  spouse: 'spouse',
  sibling: 'sibling',
};

function randomSkills(rng: Rng): Skills {
  const skills = {} as Skills;
  for (const id of SkillId.options) skills[id] = rng.int(0, 9);
  return skills;
}

function randomTraits(rng: Rng): string[] {
  const pool = Object.keys(content.traits);
  const count = rng.int(1, 3);
  const chosen: string[] = [];
  while (chosen.length < count && chosen.length < pool.length) {
    const t = rng.pick(pool);
    if (!chosen.includes(t)) chosen.push(t);
  }
  return chosen;
}

/** Picks a name for the given sex, preferring names no living pawn already carries. */
function pickName(state: GameState, rng: Rng, sex: Sex): string {
  const taken = new Set(entitiesWith(state, 'pawn').map((id) => getComponent(state, 'pawn', id)?.name));
  const forSex = content.names.filter((n) => n.sex === sex).map((n) => n.name);
  const free = forSex.filter((n) => !taken.has(n));
  return rng.pick(free.length > 0 ? free : forSex);
}

export function spawnPawn(
  state: GameState,
  rng: Rng,
  opts: SpawnPawnOptions,
): { state: GameState; id: EntityId } {
  const created = createEntity(state);
  const id = created.id;
  let s = created.state;

  s = setComponent(s, 'pawn', id, {
    name: opts.name ?? pickName(s, rng, opts.sex),
    sex: opts.sex,
    birthTick: s.tick - yearsToTicks(opts.ageYears) - rng.int(0, yearsToTicks(1)),
    skills: randomSkills(rng),
    traits: randomTraits(rng),
    kin: [],
  });
  s = setComponent(s, 'position', id, { ...opts.position });
  s = setComponent(s, 'needs', id, {
    hunger: rng.range(0.7, 1),
    warmth: rng.range(0.8, 1),
    rest: rng.range(0.7, 1),
    social: rng.range(0.6, 1),
    meaning: rng.range(0.5, 0.9),
  });
  s = setComponent(s, 'mood', id, { value: 0.6, memories: [] });
  s = setComponent(s, 'health', id, { value: 1 });
  s = setComponent(s, 'job', id, {
    kind: 'idle',
    targetTile: null,
    targetEntity: null,
    progress: 0,
    startedTick: s.tick,
  });

  return { state: s, id };
}

/** Records that `target` is `subject`'s <type>, and the reciprocal relation on `target`. */
export function linkKin(
  state: GameState,
  subject: EntityId,
  type: KinRelationType,
  target: EntityId,
): GameState {
  const a = getComponent(state, 'pawn', subject);
  const b = getComponent(state, 'pawn', target);
  if (!a || !b) throw new Error(`linkKin: missing pawn ${subject} or ${target}`);
  let s = setComponent(state, 'pawn', subject, {
    ...a,
    kin: [...a.kin, { type, targetId: target }],
  });
  s = setComponent(s, 'pawn', target, {
    ...b,
    kin: [...b.kin, { type: RECIPROCAL[type], targetId: subject }],
  });
  return s;
}
