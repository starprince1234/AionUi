/**
 * Data shaping for the version comparison workbench.
 *
 * Exact inputs come from the package's frozen `comparisonInputs`; correspondence
 * and differences come from stage artifacts. Content that cannot be resolved or
 * read keeps an explicit state — the workbench never presents a change as a
 * confirmed fact when its correspondence is uncertain.
 */
import type {
  ComparisonDifference,
  ComparisonReportPayload,
  ComparisonRole,
  DifferencesPayload,
  EvidDocument,
  EvidossierSnapshot,
  MappingConfidence,
  MappingPayload,
  PackageVersion,
  SectionMapping,
  StageArtifact,
  StageArtifactKind,
  TaskKind,
} from '../../domain/types';
import { getPackage, getProjectVersions, getVersion } from '../../data/selectors';

export const DIFFERENCE_KINDS: ComparisonDifference['kind'][] = ['added', 'removed', 'modified', 'moved', 'uncertain'];

export const CONFIDENCE_VALUES: MappingConfidence[] = ['confirmed', 'candidate', 'uncertain', 'none'];

/** Latest revision of one artifact kind. */
export const findLatestArtifact = (artifacts: StageArtifact[], kind: StageArtifactKind): StageArtifact | undefined =>
  artifacts
    .filter((artifact) => artifact.kind === kind)
    .toSorted((a, b) => b.revision - a.revision || b.updatedAt.localeCompare(a.updatedAt))[0];

export const mappingPayloadOf = (artifact?: StageArtifact): MappingPayload | undefined => {
  if (!artifact || artifact.payload.type !== 'mapping') return undefined;
  return artifact.payload;
};

export const differencesPayloadOf = (artifact?: StageArtifact): DifferencesPayload | undefined => {
  if (!artifact || artifact.payload.type !== 'differences') return undefined;
  return artifact.payload;
};

export const comparisonReportPayloadOf = (artifact?: StageArtifact): ComparisonReportPayload | undefined => {
  if (!artifact || artifact.payload.type !== 'comparison_report') return undefined;
  return artifact.payload;
};

/* -------------------------------------------------------------------------- */
/* Exact inputs                                                                */
/* -------------------------------------------------------------------------- */

export type CompareInput = {
  role: ComparisonRole;
  versionId: string;
  version?: PackageVersion;
  document?: EvidDocument;
};

export const buildCompareInputs = (
  snapshot: EvidossierSnapshot,
  comparisonInputs: Array<{ versionId: string; role: ComparisonRole }> | undefined
): CompareInput[] =>
  (comparisonInputs ?? []).map((input) => {
    const version = getVersion(snapshot, input.versionId);
    return {
      role: input.role,
      versionId: input.versionId,
      version,
      document: version?.deliverable.document,
    };
  });

export const inputOfRole = (inputs: CompareInput[], role: ComparisonRole): CompareInput | undefined =>
  inputs.find((input) => input.role === role);

export type CompareDocState = 'ok' | 'version_missing' | 'document_missing';

export const documentStateOf = (input: CompareInput | undefined): CompareDocState => {
  if (!input || !input.version) return 'version_missing';
  return input.document ? 'ok' : 'document_missing';
};

/* -------------------------------------------------------------------------- */
/* Differences & mapping                                                       */
/* -------------------------------------------------------------------------- */

export const sortDifferences = (differences: ComparisonDifference[]): ComparisonDifference[] =>
  [...differences].toSorted((a, b) => a.code.localeCompare(b.code));

export const filterDifferences = (
  differences: ComparisonDifference[],
  kinds: ComparisonDifference['kind'][]
): ComparisonDifference[] => differences.filter((difference) => kinds.includes(difference.kind));

export const differenceKindCounts = (
  differences: ComparisonDifference[]
): Record<ComparisonDifference['kind'], number> => ({
  added: differences.filter((difference) => difference.kind === 'added').length,
  removed: differences.filter((difference) => difference.kind === 'removed').length,
  modified: differences.filter((difference) => difference.kind === 'modified').length,
  moved: differences.filter((difference) => difference.kind === 'moved').length,
  uncertain: differences.filter((difference) => difference.kind === 'uncertain').length,
});

export const findMappingForDifference = (
  mappings: SectionMapping[],
  difference: ComparisonDifference
): SectionMapping | undefined =>
  mappings.find((mapping) => mapping.id === difference.mappingId) ??
  mappings.find(
    (mapping) =>
      Boolean(difference.baseLocation?.blockId) &&
      mapping.baseBlockId === difference.baseLocation?.blockId &&
      (difference.targetLocation?.blockId
        ? mapping.targetBlockId === difference.targetLocation.blockId
        : !mapping.targetBlockId)
  ) ??
  mappings.find(
    (mapping) =>
      Boolean(difference.targetLocation?.blockId) &&
      mapping.targetBlockId === difference.targetLocation?.blockId &&
      !mapping.baseBlockId
  );

export const differenceAtBaseBlock = (
  differences: ComparisonDifference[],
  blockId: string
): ComparisonDifference | undefined => differences.find((difference) => difference.baseLocation?.blockId === blockId);

export const differenceAtTargetBlock = (
  differences: ComparisonDifference[],
  blockId: string
): ComparisonDifference | undefined => differences.find((difference) => difference.targetLocation?.blockId === blockId);

/* -------------------------------------------------------------------------- */
/* Versions / report                                                           */
/* -------------------------------------------------------------------------- */

export const reportVersionOf = (versions: PackageVersion[]): PackageVersion | undefined => {
  const ordered = [...versions].toSorted((a, b) => b.versionNumber - a.versionNumber);
  return ordered.find((version) => version.deliverable.kind === 'comparison_report');
};

export type RevisionBaseOption = {
  value: string;
  label: string;
  taskKind: TaskKind;
};

/**
 * Formal versions a revision task can be authorized to modify. Only generate
 * deliverables are valid bases — a report version cannot be edited.
 */
export const buildRevisionBaseOptions = (snapshot: EvidossierSnapshot, projectId: string): RevisionBaseOption[] =>
  getProjectVersions(snapshot, projectId)
    .filter((version) => {
      const pkg = getPackage(snapshot, version.packageId);
      return pkg?.task.kind === 'generate' && version.deliverable.kind === 'document';
    })
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((version) => {
      const pkg = getPackage(snapshot, version.packageId);
      return {
        value: version.id,
        label: `${version.label} · ${pkg?.title ?? ''}`,
        taskKind: pkg?.task.kind ?? 'generate',
      };
    });

export const compareArtifactKinds: StageArtifactKind[] = ['mapping', 'differences', 'comparison_report'];
