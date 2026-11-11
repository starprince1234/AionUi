/**
 * Pure selectors over the normalized Evidossier snapshot.
 *
 * Pages use these instead of reaching into arrays so that the future backend
 * adapter only has to supply the same snapshot shape.
 */
import type {
  ArtifactPackage,
  ConversationMessage,
  EvidDocument,
  EvidossierSnapshot,
  Material,
  MaterialReference,
  MaterialVersion,
  PackageRelation,
  PackageVersion,
  PackageWorkspace,
  Project,
  Stage,
  StageArtifact,
  VersionRef,
} from '../domain/types';

export const getProject = (snapshot: EvidossierSnapshot, projectId: string): Project | undefined =>
  snapshot.projects.find((project) => project.id === projectId);

export const listProjectPackages = (snapshot: EvidossierSnapshot, projectId: string): ArtifactPackage[] =>
  snapshot.packages.filter((pkg) => pkg.projectId === projectId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

export const listProjectMaterials = (snapshot: EvidossierSnapshot, projectId: string): Material[] =>
  snapshot.materials
    .filter((material) => material.projectId === projectId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

export const listRecentPackages = (snapshot: EvidossierSnapshot, limit = 6): ArtifactPackage[] =>
  [...snapshot.packages].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, limit);

export const packageNeedsUser = (pkg: ArtifactPackage): boolean =>
  pkg.status === 'awaiting_user' ||
  pkg.status === 'paused' ||
  pkg.status === 'failed' ||
  pkg.status === 'pending_supplement' ||
  Boolean(pkg.currentDraft?.conflict);

export const listAttentionPackages = (snapshot: EvidossierSnapshot): ArtifactPackage[] =>
  snapshot.packages.filter(packageNeedsUser).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

export const getPackage = (snapshot: EvidossierSnapshot, packageId: string): ArtifactPackage | undefined =>
  snapshot.packages.find((pkg) => pkg.id === packageId);

export const getVersion = (snapshot: EvidossierSnapshot, versionId: string): PackageVersion | undefined =>
  snapshot.versions.find((version) => version.id === versionId);

export const getVersionRef = (snapshot: EvidossierSnapshot, versionId: string): VersionRef | undefined => {
  const version = getVersion(snapshot, versionId);
  if (!version) return undefined;
  const pkg = getPackage(snapshot, version.packageId);
  if (!pkg) return undefined;
  return {
    packageId: pkg.id,
    versionId: version.id,
    packageCode: pkg.code,
    packageTitle: pkg.title,
    versionLabel: version.label,
    versionNumber: version.versionNumber,
    taskKind: pkg.task.kind,
  };
};

export const getProjectVersions = (snapshot: EvidossierSnapshot, projectId: string): PackageVersion[] =>
  snapshot.versions.filter((version) => version.projectId === projectId);

export const getMaterial = (snapshot: EvidossierSnapshot, materialId: string): Material | undefined =>
  snapshot.materials.find((material) => material.id === materialId);

export const getMaterialVersion = (
  snapshot: EvidossierSnapshot,
  materialVersionId: string
): { material: Material; version: MaterialVersion } | undefined => {
  for (const material of snapshot.materials) {
    const version = material.versions.find((item) => item.id === materialVersionId);
    if (version) return { material, version };
  }
  return undefined;
};

export const resolveMaterialReference = (
  snapshot: EvidossierSnapshot,
  reference: MaterialReference
): { material?: Material; version?: MaterialVersion; available: boolean } => {
  const found = getMaterialVersion(snapshot, reference.materialVersionId);
  return {
    material: found?.material ?? getMaterial(snapshot, reference.materialId),
    version: found?.version,
    available: Boolean(found),
  };
};

export const getPackageVersionDocument = (version: PackageVersion | undefined): EvidDocument | undefined =>
  version?.deliverable.document;

export const getStages = (snapshot: EvidossierSnapshot, packageId: string): Stage[] =>
  snapshot.stages.filter((stage) => stage.packageId === packageId).sort((a, b) => a.order - b.order);

export const getArtifacts = (snapshot: EvidossierSnapshot, packageId: string): StageArtifact[] =>
  snapshot.artifacts
    .filter((artifact) => artifact.packageId === packageId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

export const getLatestArtifactForStage = (snapshot: EvidossierSnapshot, stage: Stage): StageArtifact | undefined => {
  if (stage.currentArtifactId) {
    const current = snapshot.artifacts.find((artifact) => artifact.id === stage.currentArtifactId);
    if (current) return current;
  }
  return snapshot.artifacts
    .filter((artifact) => artifact.stageId === stage.id)
    .sort((a, b) => b.revision - a.revision)[0];
};

export const getMessages = (snapshot: EvidossierSnapshot, packageId: string): ConversationMessage[] => {
  const pkg = getPackage(snapshot, packageId);
  if (!pkg) return [];
  const conversation = snapshot.conversations.find((item) => item.id === pkg.primaryConversationId);
  if (!conversation) return [];
  const byId = new Map(snapshot.messages.map((message) => [message.id, message]));
  return conversation.messageIds
    .map((id) => byId.get(id))
    .filter((message): message is ConversationMessage => Boolean(message))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
};

export const getRelationsForPackage = (
  snapshot: EvidossierSnapshot,
  packageId: string
): { incoming: PackageRelation[]; outgoing: PackageRelation[] } => {
  const incoming = snapshot.relations.filter((relation) => relation.target.packageId === packageId);
  const outgoing = snapshot.relations.filter((relation) => relation.source.packageId === packageId);
  return { incoming, outgoing };
};

export const getProjectRelations = (snapshot: EvidossierSnapshot, projectId: string): PackageRelation[] =>
  snapshot.relations.filter(
    (relation) =>
      snapshot.packages.find((pkg) => pkg.id === relation.target.packageId)?.projectId === projectId ||
      snapshot.packages.find((pkg) => pkg.id === relation.source.packageId)?.projectId === projectId
  );

export const buildPackageWorkspace = (
  snapshot: EvidossierSnapshot,
  packageId: string
): PackageWorkspace | undefined => {
  const pkg = getPackage(snapshot, packageId);
  if (!pkg) return undefined;
  const project = getProject(snapshot, pkg.projectId);
  if (!project) return undefined;
  const versions = snapshot.versions
    .filter((version) => version.packageId === pkg.id)
    .sort((a, b) => a.versionNumber - b.versionNumber);
  const relations = getRelationsForPackage(snapshot, pkg.id);
  const materialIds = new Set<string>();
  for (const version of versions) for (const input of version.inputs) materialIds.add(input.materialId);
  for (const artifact of snapshot.artifacts.filter((item) => item.packageId === pkg.id)) {
    for (const input of artifact.basedOn) materialIds.add(input.materialId);
  }
  if (pkg.reviewTarget?.kind === 'material_version') materialIds.add(pkg.reviewTarget.materialId);
  const materials = snapshot.materials.filter((material) => materialIds.has(material.id));
  const conversation = snapshot.conversations.find((item) => item.id === pkg.primaryConversationId);
  return {
    pkg,
    project,
    task: pkg.task,
    stages: getStages(snapshot, pkg.id),
    artifacts: getArtifacts(snapshot, pkg.id),
    versions,
    currentVersion: versions[versions.length - 1],
    conversation,
    messages: getMessages(snapshot, pkg.id),
    execution: snapshot.executions.find((execution) => execution.id === pkg.executionId),
    incomingRelations: relations.incoming,
    outgoingRelations: relations.outgoing,
    materials,
  };
};

/** Resolve the document/version a review package is inspecting. */
export const getReviewTargetInfo = (
  snapshot: EvidossierSnapshot,
  pkg: ArtifactPackage
):
  | {
      label: string;
      version?: PackageVersion;
      material?: Material;
      materialVersion?: MaterialVersion;
      document?: EvidDocument;
      available: boolean;
    }
  | undefined => {
  const target = pkg.reviewTarget;
  if (!target) return undefined;
  if (target.kind === 'package_version') {
    const version = getVersion(snapshot, target.versionId);
    return {
      label: version?.label ?? target.versionLabel,
      version,
      document: version?.deliverable.document,
      available: Boolean(version),
    };
  }
  const found = getMaterialVersion(snapshot, target.materialVersionId);
  return {
    label: found ? `${found.material.name}（版本 ${found.version.version}）` : target.materialName,
    material: found?.material,
    materialVersion: found?.version,
    document: found?.version.document,
    available: Boolean(found?.version.document),
  };
};

export const getPackageDeliverableDocument = (
  snapshot: EvidossierSnapshot,
  pkg: ArtifactPackage
): EvidDocument | undefined => {
  const versions = snapshot.versions
    .filter((version) => version.packageId === pkg.id)
    .sort((a, b) => b.versionNumber - a.versionNumber);
  return versions[0]?.deliverable.document;
};

export const countPackageVersions = (snapshot: EvidossierSnapshot, packageId: string): number =>
  snapshot.versions.filter((version) => version.packageId === packageId).length;

export type ComparisonInputView = {
  version: PackageVersion;
  role: 'baseline' | 'target' | 'additional';
  document?: EvidDocument;
};

export const getComparisonInputs = (snapshot: EvidossierSnapshot, pkg: ArtifactPackage): ComparisonInputView[] =>
  (pkg.comparisonInputs ?? [])
    .map((input): ComparisonInputView | undefined => {
      const version = getVersion(snapshot, input.versionId);
      if (!version) return undefined;
      return { version, role: input.role, document: version.deliverable.document };
    })
    .filter((item): item is ComparisonInputView => item !== undefined);
