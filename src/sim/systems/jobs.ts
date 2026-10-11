import { content } from '../../data/content';
import { JobKind, type EntityId, type GameState, type Job } from '../../data/schemas';
import { getComponent, removeComponent, setComponent } from '../entities';
import { isNight } from '../environment';
import { edibleFood, pawnSkillFactor, workSpeed } from '../jobs/common';
import { jobHandlers, NEED_JOBS } from '../jobs/registry';
import type { JobTarget } from '../jobs/types';
import { isMoving, startMoveTo } from '../movement';
import { livingPawns } from '../pawnQueries';
import type { Rng } from '../rng';
import { isHearthLit } from '../structures';
import type { System } from '../system';

export type ScoredJob = { kind: JobKind; target: JobTarget; score: number };

const NIGHT_WORK_FACTOR = 0.5;

/** Every available job for a pawn with its utility score, best first. */
export function scoreJobs(state: GameState, pawnId: EntityId, rng: Rng): ScoredJob[] {
  const w = content.balance.work;
  const pos = getComponent(state, 'position', pawnId);
  if (!pos) return [];
  const night = isNight(state.tick);
  const out: ScoredJob[] = [];

  for (const kind of JobKind.options) {
    const def = content.jobs[kind];
    const handler = jobHandlers[kind];
    const u = handler.utility(state, pawnId);
    if (u <= 0) continue;
    const target = handler.findTarget(state, pawnId, rng);
    if (!target) continue;
    const isWork = !NEED_JOBS.includes(kind) && kind !== 'idle' && kind !== 'bury';
    const distance = Math.abs(target.targetTile.x - pos.x) + Math.abs(target.targetTile.y - pos.y);
    const score =
      def.baseUtility * u * pawnSkillFactor(state, pawnId, def.skill) * (isWork && night ? NIGHT_WORK_FACTOR : 1) -
      distance * w.distancePenaltyPerTile +
      rng.range(-w.noise, w.noise);
    out.push({ kind, target, score });
  }
  return out.sort((a, b) => b.score - a.score);
}

/** Assigns the best reachable job and starts the walk there. Returns state unchanged if nothing fits. */
export function assignJob(state: GameState, pawnId: EntityId, rng: Rng): GameState {
  for (const candidate of scoreJobs(state, pawnId, rng)) {
    const moved = startMoveTo(state, pawnId, candidate.target.targetTile);
    if (!moved) continue;
    const job: Job = {
      kind: candidate.kind,
      targetTile: candidate.target.targetTile,
      targetEntity: candidate.target.targetEntity,
      progress: 0,
      startedTick: state.tick,
    };
    return setComponent(moved, 'job', pawnId, job);
  }
  return state;
}

/** Why a job in progress should be dropped, or null to keep going. */
export function abandonReason(state: GameState, pawnId: EntityId, job: Job): string | null {
  if (state.tick - job.startedTick > content.jobs[job.kind].maxTicks) return 'timeout';
  if (jobHandlers[job.kind].stillValid?.(state, pawnId, job) === false) return 'invalid';
  if (NEED_JOBS.includes(job.kind)) return null;
  const needs = getComponent(state, 'needs', pawnId);
  if (!needs) return null;
  const critical = content.balance.needs.critical;
  if (needs.hunger < critical && edibleFood(state) >= 1) return 'hungry';
  if (needs.warmth < critical * 2 && isHearthLit(state)) return 'cold';
  if (needs.rest < critical / 2) return 'exhausted';
  return null;
}

function clearJob(state: GameState, id: EntityId): GameState {
  return removeComponent(removeComponent(state, 'job', id), 'movement', id);
}

/** Drops stale or interrupted jobs and gives idle pawns a new one. */
export const jobSelectionSystem: System = (state, ctx) => {
  let s = state;
  for (const id of livingPawns(state)) {
    const job = getComponent(s, 'job', id);
    if (job && abandonReason(s, id, job) !== null) s = clearJob(s, id);
    if (!getComponent(s, 'job', id)) s = assignJob(s, id, ctx.rng);
  }
  return s;
};

function maybeGainSkill(state: GameState, id: EntityId, job: Job, rng: Rng): GameState {
  const skill = content.jobs[job.kind].skill;
  const pawn = getComponent(state, 'pawn', id);
  if (!skill || !pawn || pawn.skills[skill] >= 20 || !rng.chance(content.balance.work.skillGainChance)) return state;
  return setComponent(state, 'pawn', id, { ...pawn, skills: { ...pawn.skills, [skill]: pawn.skills[skill] + 1 } });
}

/** Pawns standing at their job target do one tick of work; finished jobs are cleared. */
export const jobWorkSystem: System = (state, ctx) => {
  let s = state;
  for (const id of livingPawns(state)) {
    const job = getComponent(s, 'job', id);
    const pos = getComponent(s, 'position', id);
    if (!job || !pos || isMoving(s, id)) continue;

    if (!job.targetTile || pos.x !== job.targetTile.x || pos.y !== job.targetTile.y) {
      const retried = job.targetTile ? startMoveTo(s, id, job.targetTile) : null;
      s = retried && isMoving(retried, id) ? retried : clearJob(s, id);
      continue;
    }

    const handler = jobHandlers[job.kind];
    const speed = workSpeed(s, id, job.kind);
    if (handler.work) {
      const r = handler.work(s, id, job, ctx, speed);
      s = r.done ? clearJob(maybeGainSkill(r.state, id, r.job, ctx.rng), id) : setComponent(r.state, 'job', id, r.job);
      continue;
    }

    const progress = Math.min(1, job.progress + speed / Math.max(1, content.jobs[job.kind].workTicks));
    if (progress < 1) {
      s = setComponent(s, 'job', id, { ...job, progress });
      continue;
    }
    s = handler.complete ? handler.complete(s, id, job, ctx, speed) : s;
    s = clearJob(maybeGainSkill(s, id, job, ctx.rng), id);
  }
  return s;
};
