/**
 * Data shaping for the independent review workbench.
 *
 * The workbench never derives review content from presentation state: coverage,
 * findings and the report always come from the stage artifacts of the package,
 * and the reviewed document comes from the exact target version. Missing or
 * unreadable inputs keep an explicit state so the UI never pretends to read
 * content that it cannot read.
 */
import type {
  ArtifactPackage,
  ComparisonReportPayload,
  CoveragePayload,
  DifferencesPayload,
  EvidDocument,
  EvidossierSnapshot,
  FindingSeverity,
  FindingStatus,
  FindingsPayload,
  Material,
  MaterialParseStatus,
  MaterialUsage,
  MaterialVersion,
  PackageVersion,
  ReviewFinding,
  ReviewReportPayload,
  Stage,
  StageArtifact,
  StageArtifactKind,
} from '../../domain/types';
import { resolveMaterialReference } from '../../data/selectors';

type ReviewTargetInfo = {
  label: string;
  version?: PackageVersion;
  material?: Material;
  materialVersion?: MaterialVersion;
  document?: EvidDocument;
  available: boolean;
};

/** Latest revision of one artifact kind (the stage keeps older revisions). */
export const findLatestArtifact = (artifacts: StageArtifact[], kind: StageArtifactKind): StageArtifact | undefined =>
  artifacts
    .filter((artifact) => artifact.kind === kind)
    .toSorted((a, b) => b.revision - a.revision || b.updatedAt.localeCompare(a.updatedAt))[0];

export const latestReviewArtifact = (artifacts: StageArtifact[]): StageArtifact | undefined =>
  findLatestArtifact(artifacts, 'review_report');

export const coveragePayloadOf = (artifact?: StageArtifact): CoveragePayload | undefined => {
  if (!artifact || artifact.payload.type !== 'coverage_plan') return undefined;
  return artifact.payload;
};

export const findingsPayloadOf = (artifact?: StageArtifact): FindingsPayload | undefined => {
  if (!artifact || artifact.payload.type !== 'findings') return undefined;
  return artifact.payload;
};

export const reviewReportPayloadOf = (artifact?: StageArtifact): ReviewReportPayload | undefined => {
  if (!artifact || artifact.payload.type !== 'review_report') return undefined;
  return artifact.payload;
};

export const mappingPayloadOf = (
  artifact?: StageArtifact
): Extract<StageArtifact['payload'], { type: 'mapping' }> | undefined => {
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
/* Reviewed target                                                             */
/* -------------------------------------------------------------------------- */

export type ReviewTargetStateKind =
  | 'ok'
  | 'missing_target'
  | 'source_unavailable'
  | 'document_unreadable'
  | 'parse_failed'
  | 'pending_parse'
  | 'partial_parse';

export type ReviewTargetState = {
  kind: ReviewTargetStateKind;
  label: string;
  sourceKind: 'package_version' | 'material_version' | 'none';
  document?: EvidDocument;
  packageVersion?: PackageVersion;
  material?: Material;
  materialVersion?: MaterialVersion;
};

const materialTargetKind = (version: MaterialVersion): ReviewTargetStateKind => {
  if (version.document) return 'ok';
  switch (version.parseStatus) {
    case 'failed':
      return 'parse_failed';
    case 'pending':
    case 'parsing':
      return 'pending_parse';
    case 'partial':
      return 'partial_parse';
    default:
      return 'document_unreadable';
  }
};

export const describeReviewTarget = (pkg: ArtifactPackage, info: ReviewTargetInfo | undefined): ReviewTargetState => {
  const target = pkg.reviewTarget;
  if (!target) return { kind: 'missing_target', label: '', sourceKind: 'none' };
  if (!info) {
    return { kind: 'source_unavailable', label: '', sourceKind: target.kind };
  }
  if (target.kind === 'package_version') {
    if (!info.version) {
      return { kind: 'source_unavailable', label: info.label, sourceKind: 'package_version' };
    }
    const document = info.version.deliverable.document;
    return {
      kind: document ? 'ok' : 'document_unreadable',
      label: info.label,
      sourceKind: 'package_version',
      document,
      packageVersion: info.version,
    };
  }
  if (!info.materialVersion) {
    return { kind: 'source_unavailable', label: info.label, sourceKind: 'material_version' };
  }
  return {
    kind: materialTargetKind(info.materialVersion),
    label: info.label,
    sourceKind: 'material_version',
    document: info.materialVersion.document,
    material: info.material,
    materialVersion: info.materialVersion,
  };
};

/* -------------------------------------------------------------------------- */
/* Review basis                                                                */
/* -------------------------------------------------------------------------- */

export type ReviewBasisEntry = {
  materialName: string;
  versionNumber: number;
  role: MaterialUsage;
  parseStatus?: MaterialParseStatus;
  document?: EvidDocument;
  readable: boolean;
};

/**
 * Material usages that can act as review evidence. Templates and writing
 * references are package inputs but are never judging basis.
 */
const REVIEW_BASIS_ROLES: ReadonlySet<MaterialUsage> = new Set<MaterialUsage>([
  'requirement',
  'review_basis',
  'fact',
  'case',
  'pending',
]);

/**
 * The basis is the material set the stage results were actually produced from.
 * When no artifact exists yet we fall back to the package materials so the
 * panel still explains what the review is supposed to read.
 */
export const buildReviewBasis = (
  snapshot: EvidossierSnapshot,
  artifacts: StageArtifact[],
  fallbackMaterials: Material[],
  excludedMaterialId?: string
): ReviewBasisEntry[] => {
  const seen = new Set<string>();
  const entries: ReviewBasisEntry[] = [];
  const ordered = artifacts.toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  for (const artifact of ordered) {
    for (const ref of artifact.basedOn) {
      if (excludedMaterialId && ref.materialId === excludedMaterialId) continue;
      if (!REVIEW_BASIS_ROLES.has(ref.role)) continue;
      const key = `${ref.materialId}:${ref.materialVersionId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const resolved = resolveMaterialReference(snapshot, ref);
      const version = resolved.version;
      entries.push({
        materialName: resolved.material?.name ?? ref.materialName,
        versionNumber: version?.version ?? ref.versionNumber,
        role: ref.role,
        parseStatus: version?.parseStatus,
        document: version?.document,
        readable: Boolean(version?.document),
      });
    }
  }
  if (entries.length > 0) return entries;

  for (const material of fallbackMaterials) {
    if (excludedMaterialId && material.id === excludedMaterialId) continue;
    if (!REVIEW_BASIS_ROLES.has(material.usage)) continue;
    const version = material.versions.find((item) => item.id === material.currentVersionId) ?? material.versions[0];
    entries.push({
      materialName: material.name,
      versionNumber: version?.version ?? 1,
      role: material.usage,
      parseStatus: version?.parseStatus,
      document: version?.document,
      readable: Boolean(version?.document),
    });
  }
  return entries;
};

export const findMaterialDocument = (
  snapshot: EvidossierSnapshot,
  documentId: string
): { material: Material; version: MaterialVersion; document: EvidDocument } | undefined => {
  for (const material of snapshot.materials) {
    for (const version of material.versions) {
      if (version.document?.id === documentId) return { material, version, document: version.document };
    }
  }
  return undefined;
};

/* -------------------------------------------------------------------------- */
/* Coverage / findings                                                         */
/* -------------------------------------------------------------------------- */

export type CoverageCounts = {
  total: number;
  checked: number;
  unchecked: number;
  uncheckable: number;
  notApplicable: number;
};

export const coverageCounts = (payload?: CoveragePayload): CoverageCounts => {
  const items = payload?.items ?? [];
  const count = (status: string) => items.filter((item) => item.status === status).length;
  return {
    total: items.length,
    checked: count('checked'),
    unchecked: count('unchecked'),
    uncheckable: count('uncheckable'),
    notApplicable: count('not_applicable'),
  };
};

const SEVERITY_ORDER: Record<FindingSeverity, number> = { high: 0, medium: 1, low: 2, info: 3 };

export const sortFindings = (findings: ReviewFinding[]): ReviewFinding[] =>
  [...findings].toSorted(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.code.localeCompare(b.code)
  );

export const filterFindings = (
  findings: ReviewFinding[],
  severity: 'all' | FindingSeverity,
  status: 'all' | FindingStatus,
  keyword: string
): ReviewFinding[] => {
  const query = keyword.trim().toLowerCase();
  return findings.filter((finding) => {
    if (severity !== 'all' && finding.severity !== severity) return false;
    if (status !== 'all' && finding.status !== status) return false;
    if (!query) return true;
    return (
      finding.code.toLowerCase().includes(query) ||
      finding.title.toLowerCase().includes(query) ||
      finding.description.toLowerCase().includes(query)
    );
  });
};

export type FindingSeverityCounts = {
  high: number;
  medium: number;
  low: number;
  info: number;
  uncertain: number;
};

export const findingSeverityCounts = (findings: ReviewFinding[]): FindingSeverityCounts => {
  const count = (severity: FindingSeverity) => findings.filter((finding) => finding.severity === severity).length;
  return {
    high: count('high'),
    medium: count('medium'),
    low: count('low'),
    info: count('info'),
    uncertain: findings.filter((finding) => finding.status === 'uncertain').length,
  };
};

/* -------------------------------------------------------------------------- */
/* Stages / versions                                                           */
/* -------------------------------------------------------------------------- */

/** The stage whose candidate result currently blocks the run. */
export const blockingStageOf = (stages: Stage[]): Stage | undefined =>
  stages.find((stage) => stage.status === 'awaiting_confirmation') ??
  stages.find((stage) => stage.status === 'needs_review');

export const activeStageOf = (stages: Stage[]): Stage | undefined =>
  stages.find((stage) => stage.status === 'running') ?? blockingStageOf(stages);

export const artifactForStage = (artifacts: StageArtifact[], stage: Stage): StageArtifact | undefined => {
  if (stage.currentArtifactId) {
    const current = artifacts.find((artifact) => artifact.id === stage.currentArtifactId);
    if (current) return current;
  }
  return [...artifacts]
    .filter((artifact) => artifact.stageId === stage.id)
    .toSorted((a, b) => b.revision - a.revision || b.updatedAt.localeCompare(a.updatedAt))[0];
};

export const reportVersionOf = (
  versions: PackageVersion[],
  kind: 'review_report' | 'comparison_report'
): PackageVersion | undefined => {
  const ordered = [...versions].toSorted((a, b) => b.versionNumber - a.versionNumber);
  return ordered.find((version) => version.deliverable.kind === kind);
};

export const artifactHistoryOf = (artifacts: StageArtifact[], kinds: StageArtifactKind[]): StageArtifact[] =>
  artifacts
    .filter((artifact) => kinds.includes(artifact.kind))
    .toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt));
