import type { EntityId, GameState, Job, TilePos } from '../../data/schemas';
import type { Rng } from '../rng';
import type { SystemContext } from '../system';

export type JobTarget = { targetTile: TilePos; targetEntity: EntityId | null };

export type WorkResult = { state: GameState; job: Job; done: boolean };

/**
 * Behavior for one JobKind. Tunable numbers live in content/jobs.json and balance.json;
 * handlers hold the logic that can't be expressed as data.
 */
export type JobHandler = {
  /** Desirability multiplier (0 = unavailable/unwanted). Skill, distance and night are applied by the selector. */
  utility(state: GameState, pawnId: EntityId): number;
  /** Proposes where to do the job, or null if nowhere is available. */
  findTarget(state: GameState, pawnId: EntityId, rng: Rng): JobTarget | null;
  /** Whether a job in progress should continue. Defaults to true. */
  stillValid?(state: GameState, pawnId: EntityId, job: Job): boolean;
  /**
   * One tick of work at the target. If omitted, the job runs for its data-defined workTicks
   * (scaled by work speed) and then calls `complete`.
   */
  work?(state: GameState, pawnId: EntityId, job: Job, ctx: SystemContext, speed: number): WorkResult;
  /** Applied once when a fixed-duration job finishes. */
  complete?(state: GameState, pawnId: EntityId, job: Job, ctx: SystemContext, speed: number): GameState;
};
