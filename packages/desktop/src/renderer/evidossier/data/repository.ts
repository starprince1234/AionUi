/**
 * Evidossier data access boundary.
 *
 * Pages never read the demo snapshot directly from storage; they talk to a
 * repository that will be swapped for an HTTP adapter once AionCore exposes the
 * business API. The mock adapter in `mockRepository.ts` implements this same
 * interface, so page code does not change when the real backend arrives.
 *
 * None of these endpoints exist in AionCore today. See docs/current.md.
 */
import type {
  AddMaterialInput,
  ArtifactPackage,
  CreatePackageInput,
  EditArtifactInput,
  EvidossierSnapshot,
  Material,
  PackageVersion,
  Project,
  StageArtifact,
  StartComparisonInput,
  StartReviewInput,
  StartRevisionFromDifferencesInput,
  StartRevisionFromFindingsInput,
  SubmitVersionInput,
} from '../domain/types';

export type TickResult = {
  /** True when the snapshot changed and the UI should re-read it. */
  changed: boolean;
  /** True when at least one simulated execution is still running. */
  running: boolean;
};

export type DraftConflictResolution = 'keep_user' | 'keep_candidate' | 'rerun';

export type EvidossierRepository = {
  /** Full authoritative read. The UI treats the result as read-only. */
  getSnapshot(): Promise<EvidossierSnapshot>;

  /** Demo-only: discard local changes and restore the seed scenario. */
  resetDemo(): Promise<EvidossierSnapshot>;

  /** Advance simulated executions. Real adapter will poll run state instead. */
  tick(): Promise<TickResult>;

  createProject(input: { name: string; description: string }): Promise<Project>;
  renameProject(projectId: string, name: string): Promise<Project>;

  addMaterial(input: AddMaterialInput): Promise<Material>;
  addMaterialVersion(materialId: string): Promise<Material>;
  removeMaterial(materialId: string): Promise<void>;
  /** Demo-only: mark a locally chosen file as parsed/failed to explore states. */
  setMaterialParseOutcome(materialId: string, outcome: 'parsed' | 'failed'): Promise<Material>;

  createPackage(input: CreatePackageInput): Promise<ArtifactPackage>;
  startReview(input: StartReviewInput): Promise<ArtifactPackage>;
  startComparison(input: StartComparisonInput): Promise<ArtifactPackage>;
  startRevisionFromFindings(input: StartRevisionFromFindingsInput): Promise<ArtifactPackage>;
  startRevisionFromDifferences(input: StartRevisionFromDifferencesInput): Promise<ArtifactPackage>;
  renamePackage(packageId: string, title: string): Promise<void>;

  /** Create a working draft in the same package, based on an exact formal version. */
  continueEditing(packageId: string, baseVersionId: string): Promise<void>;

  sendMessage(packageId: string, text: string): Promise<void>;

  /** Confirm a candidate stage artifact; unlocks the next stage. */
  confirmArtifact(packageId: string, artifactId: string): Promise<void>;
  /** Save an edited stage artifact as a new revision (never overwrites history). */
  editArtifact(input: EditArtifactInput): Promise<StageArtifact>;

  pauseExecution(packageId: string): Promise<void>;
  resumeExecution(packageId: string): Promise<void>;
  retryStage(packageId: string): Promise<void>;
  /** Demo-only: force the current simulated stage to fail. */
  simulateFailure(packageId: string): Promise<void>;
  resolveDraftConflict(packageId: string, resolution: DraftConflictResolution): Promise<void>;

  /** Freeze the current draft/stage results into an immutable package version. */
  submitVersion(input: SubmitVersionInput): Promise<PackageVersion>;
};

/** localStorage key for the demo snapshot. */
export const DEMO_STORAGE_KEY = 'evidossier.demo.snapshot.v1';
