import type { System } from '../system';

/**
 * Systems run in this order every tick. Empty until Phase 1 systems land
 * (needs, jobs, movement, seasons, death, ...).
 */
export const defaultSystems: readonly System[] = [];
