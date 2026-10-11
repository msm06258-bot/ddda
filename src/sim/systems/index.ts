import type { System } from '../system';
import { healthSystem } from './health';
import { jobSelectionSystem, jobWorkSystem } from './jobs';
import { moodSystem } from './mood';
import { movementSystem } from './movement';
import { needsSystem } from './needs';
import { seasonsSystem } from './seasons';
import { stockpileSystem } from './stockpile';
import { warmthSystem } from './warmth';

/** Systems run in this order every tick. */
export const defaultSystems: readonly System[] = [
  seasonsSystem,
  needsSystem,
  warmthSystem,
  stockpileSystem,
  moodSystem,
  healthSystem,
  jobSelectionSystem,
  movementSystem,
  jobWorkSystem,
];
