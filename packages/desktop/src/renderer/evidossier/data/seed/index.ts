/**
 * Demo seed entry point.
 *
 * `createSeedState()` builds a complete, internally consistent snapshot of the
 * demo workspace on every call. No module level object is reused between calls,
 * so the repository can safely treat the returned state as its own.
 */
import type { EvidossierSnapshot } from '../../domain/types';
import { createProjects } from './projects';
import { createMaterials } from './materials';
import { currentUser } from './users';
import {
  createP001Artifacts,
  createP001Conversation,
  createP001Execution,
  createP001Messages,
  createP001Package,
  createP001Stages,
  createP001Versions,
  createP003Artifacts,
  createP003Conversation,
  createP003Execution,
  createP003Messages,
  createP003Package,
  createP003Stages,
  createP003Versions,
} from './packagesGenerate';
import {
  createP006Artifacts,
  createP006Conversation,
  createP006Execution,
  createP006Messages,
  createP006Package,
  createP006Stages,
  createP007Artifacts,
  createP007Conversation,
  createP007Execution,
  createP007Messages,
  createP007Package,
  createP007Stages,
  createP008Artifacts,
  createP008Conversation,
  createP008Execution,
  createP008Messages,
  createP008Package,
  createP008Stages,
} from './packagesGenerateStates';
import {
  createP002Artifacts,
  createP002Conversation,
  createP002Execution,
  createP002Messages,
  createP002Package,
  createP002Stages,
  createP002Versions,
  createP005Artifacts,
  createP005Conversation,
  createP005Execution,
  createP005Messages,
  createP005Package,
  createP005Stages,
  createP005Versions,
} from './packagesReview';
import {
  createP004Artifacts,
  createP004Conversation,
  createP004Execution,
  createP004Messages,
  createP004Package,
  createP004Stages,
  createP004Versions,
} from './packagesCompare';
import { createRelations } from './relations';

export const SEED_SCHEMA_VERSION = 1;

export const createSeedState = (): EvidossierSnapshot => ({
  demo: {
    isDemo: true,
    schemaVersion: SEED_SCHEMA_VERSION,
    seededAt: '2026-11-10T18:00:00+08:00',
  },
  currentUser: currentUser(),
  projects: createProjects(),
  materials: createMaterials(),
  packages: [
    createP001Package(),
    createP002Package(),
    createP003Package(),
    createP004Package(),
    createP005Package(),
    createP006Package(),
    createP007Package(),
    createP008Package(),
  ],
  versions: [
    ...createP001Versions(),
    ...createP002Versions(),
    ...createP003Versions(),
    ...createP004Versions(),
    ...createP005Versions(),
  ],
  relations: createRelations(),
  conversations: [
    createP001Conversation(),
    createP002Conversation(),
    createP003Conversation(),
    createP004Conversation(),
    createP005Conversation(),
    createP006Conversation(),
    createP007Conversation(),
    createP008Conversation(),
  ],
  messages: [
    ...createP001Messages(),
    ...createP002Messages(),
    ...createP003Messages(),
    ...createP004Messages(),
    ...createP005Messages(),
    ...createP006Messages(),
    ...createP007Messages(),
    ...createP008Messages(),
  ],
  executions: [
    createP001Execution(),
    createP002Execution(),
    createP003Execution(),
    createP004Execution(),
    createP005Execution(),
    createP006Execution(),
    createP007Execution(),
    createP008Execution(),
  ],
  stages: [
    ...createP001Stages(),
    ...createP002Stages(),
    ...createP003Stages(),
    ...createP004Stages(),
    ...createP005Stages(),
    ...createP006Stages(),
    ...createP007Stages(),
    ...createP008Stages(),
  ],
  artifacts: [
    ...createP001Artifacts(),
    ...createP002Artifacts(),
    ...createP003Artifacts(),
    ...createP004Artifacts(),
    ...createP005Artifacts(),
    ...createP006Artifacts(),
    ...createP007Artifacts(),
    ...createP008Artifacts(),
  ],
});
