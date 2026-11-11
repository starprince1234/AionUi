/**
 * Stage assembly helpers.
 *
 * Every package builds its Stage[] from the shared task blueprints so the demo
 * seed and the simulated execution engine always agree on stage keys, order and
 * i18n keys. Only status/timestamps/artifact pointers are package specific.
 */
import { getBlueprint } from '../../domain/blueprints';
import type { EntityId, MaterialReference, Stage, StageStatus, TaskKind } from '../../domain/types';

/** Derives the stage id from the package id, e.g. pkg-001 + facts -> stage-p001-facts. */
export const seedStageId = (packageId: EntityId, key: string): EntityId => {
  const suffix = packageId.replace(/^pkg-/, 'p');
  return `stage-${suffix}-${key}`;
};

export type StageOverride = {
  status: StageStatus;
  currentArtifactId?: EntityId;
  startedAt?: string;
  completedAt?: string;
  statusNote?: string;
  /** Stage specific inputs; defaults to the package-level input references. */
  inputRefs?: MaterialReference[];
};

export type StageOverrides = Readonly<Record<string, StageOverride>>;

/**
 * Build the full ordered stage list for a package.
 * Unlisted stages stay `not_started` with no artifact and no timestamps.
 */
export const buildStages = (
  packageId: EntityId,
  kind: TaskKind,
  defaultInputRefs: MaterialReference[],
  overrides: StageOverrides
): Stage[] =>
  getBlueprint(kind).map((blueprint, index) => {
    const override: StageOverride | undefined = overrides[blueprint.key];
    const inputRefs: MaterialReference[] =
      override?.inputRefs === undefined
        ? defaultInputRefs.map((ref) => ({ ...ref }))
        : override.inputRefs.map((ref) => ({ ...ref }));
    const stage: Stage = {
      id: seedStageId(packageId, blueprint.key),
      packageId,
      key: blueprint.key,
      order: index + 1,
      titleKey: blueprint.titleKey,
      descriptionKey: blueprint.descriptionKey,
      status: override?.status ?? 'not_started',
      inputRefs,
    };
    if (override?.currentArtifactId !== undefined) {
      stage.currentArtifactId = override.currentArtifactId;
    }
    if (override?.startedAt !== undefined) {
      stage.startedAt = override.startedAt;
    }
    if (override?.completedAt !== undefined) {
      stage.completedAt = override.completedAt;
    }
    if (override?.statusNote !== undefined) {
      stage.statusNote = override.statusNote;
    }
    return stage;
  });
