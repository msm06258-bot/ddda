import type { JobKind } from '../../data/schemas';
import { eat, idle, performRitual, rest, socialize, warmUp } from './needJobs';
import type { JobHandler } from './types';
import { build, bury, chopWood, cook, forage, hunt, quarry } from './workJobs';

export const jobHandlers: Record<JobKind, JobHandler> = {
  idle,
  eat,
  rest,
  warmUp,
  socialize,
  performRitual,
  forage,
  hunt,
  cook,
  chopWood,
  quarry,
  build,
  bury,
};

/** Jobs that satisfy a pawn's own needs; never interrupted for other needs. */
export const NEED_JOBS: readonly JobKind[] = ['eat', 'rest', 'warmUp', 'socialize', 'performRitual'];
