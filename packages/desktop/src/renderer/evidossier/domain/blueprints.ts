/**
 * Task blueprints: the fixed stage skeleton of each business loop.
 *
 * Both the demo seed and the simulated execution engine build stages from here
 * so the three workbenches always agree on stage order, naming and the stage
 * artifact each step produces. Real backend orchestration will own this
 * definition later; the frontend only renders it.
 */
import type { StageArtifactKind, TaskKind } from './types';

export type StageBlueprint = {
  key: string;
  /** i18n key for the stage title (evidossierCommon module). */
  titleKey: string;
  /** i18n key for the stage description (evidossierCommon module). */
  descriptionKey: string;
  /** Stage artifact produced by this stage, when it produces one. */
  artifactKind?: StageArtifactKind;
  /** Artifact title i18n key base, resolved as evidossierCommon.artifactKind.* */
  artifactTitleKey?: string;
  /** Stages that need explicit user confirmation before the run continues. */
  requiresConfirmation: boolean;
};

const generateStage = (
  key: string,
  title: string,
  description: string,
  artifactKind?: StageArtifactKind,
  requiresConfirmation = true
): StageBlueprint => ({
  key,
  titleKey: `evidossierCommon.stageName.generate.${title}`,
  descriptionKey: `evidossierCommon.stageDescription.generate.${description}`,
  artifactKind,
  artifactTitleKey: artifactKind ? `evidossierCommon.artifactKind.${artifactKind}` : undefined,
  requiresConfirmation,
});

const reviewStage = (
  key: string,
  title: string,
  description: string,
  artifactKind?: StageArtifactKind,
  requiresConfirmation = true
): StageBlueprint => ({
  key,
  titleKey: `evidossierCommon.stageName.review.${title}`,
  descriptionKey: `evidossierCommon.stageDescription.review.${description}`,
  artifactKind,
  artifactTitleKey: artifactKind ? `evidossierCommon.artifactKind.${artifactKind}` : undefined,
  requiresConfirmation,
});

const compareStage = (
  key: string,
  title: string,
  description: string,
  artifactKind?: StageArtifactKind,
  requiresConfirmation = true
): StageBlueprint => ({
  key,
  titleKey: `evidossierCommon.stageName.compare.${title}`,
  descriptionKey: `evidossierCommon.stageDescription.compare.${description}`,
  artifactKind,
  artifactTitleKey: artifactKind ? `evidossierCommon.artifactKind.${artifactKind}` : undefined,
  requiresConfirmation,
});

export const GENERATE_BLUEPRINT: StageBlueprint[] = [
  generateStage('goal', 'goal', 'goal'),
  generateStage('facts', 'facts', 'facts', 'fact_list'),
  generateStage('retrieval', 'retrieval', 'retrieval', undefined, false),
  generateStage('plan', 'plan', 'plan', 'outline'),
  generateStage('draft', 'draft', 'draft', 'draft'),
  generateStage('validation', 'validation', 'validation', 'validation'),
  generateStage('delivery', 'delivery', 'delivery', undefined, false),
];

export const REVIEW_BLUEPRINT: StageBlueprint[] = [
  reviewStage('scope', 'scope', 'scope'),
  reviewStage('basis', 'basis', 'basis'),
  reviewStage('coverage', 'coverage', 'coverage', 'coverage_plan'),
  reviewStage('inspection', 'inspection', 'inspection', 'findings'),
  reviewStage('recheck', 'recheck', 'recheck', undefined),
  reviewStage('report', 'report', 'report', 'review_report'),
];

export const COMPARE_BLUEPRINT: StageBlueprint[] = [
  compareStage('versions', 'versions', 'versions'),
  compareStage('mapping', 'mapping', 'mapping', 'mapping'),
  compareStage('extraction', 'extraction', 'extraction', 'differences'),
  compareStage('explanation', 'explanation', 'explanation'),
  compareStage('recheck', 'recheck', 'recheck'),
  compareStage('report', 'report', 'report', 'comparison_report'),
];

export const STAGE_BLUEPRINTS: Record<TaskKind, StageBlueprint[]> = {
  generate: GENERATE_BLUEPRINT,
  review: REVIEW_BLUEPRINT,
  compare: COMPARE_BLUEPRINT,
};

export const getBlueprint = (kind: TaskKind): StageBlueprint[] => STAGE_BLUEPRINTS[kind];
