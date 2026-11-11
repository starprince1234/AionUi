/**
 * Read-only helpers shared by the workspace home and the project pages.
 *
 * Pages never write business objects directly; these helpers only derive
 * presentation data from the normalized snapshot.
 */
import { getRelationsForPackage } from '../../data/selectors';
import type { EvidossierSnapshot, PackageStatus, PackageVersion, Project, TaskKind } from '../../domain/types';

export const TASK_KINDS: readonly TaskKind[] = ['generate', 'review', 'compare'];

export const PACKAGE_STATUSES: readonly PackageStatus[] = [
  'draft',
  'in_progress',
  'awaiting_user',
  'paused',
  'failed',
  'delivered',
  'pending_supplement',
];

/** Highest-numbered formal version of one package, or undefined when it has none. */
export const latestVersionForPackage = (snapshot: EvidossierSnapshot, packageId: string): PackageVersion | undefined =>
  snapshot.versions
    .filter((version) => version.packageId === packageId)
    .reduce<PackageVersion | undefined>(
      (latest, version) => (latest === undefined || version.versionNumber > latest.versionNumber ? version : latest),
      undefined
    );

/** Number of incoming and outgoing artifact relations of one package. */
export const countPackageRelations = (snapshot: EvidossierSnapshot, packageId: string): number => {
  const { incoming, outgoing } = getRelationsForPackage(snapshot, packageId);
  return incoming.length + outgoing.length;
};

export const projectMemberNames = (project: Project): string =>
  project.members.map((member) => member.user.displayName).join(' · ');

/** Navigation target of a package workspace. */
export const packagePath = (packageId: string): string => `/evidossier/packages/${packageId}`;

/** Navigation target of one project tab; the overview is the bare project path. */
export const projectTabPath = (projectId: string, tab: string): string =>
  tab === 'overview' ? `/evidossier/projects/${projectId}` : `/evidossier/projects/${projectId}/${tab}`;

/** Navigation target of the create-task wizard with the project preselected. */
export const createTaskPath = (kind: TaskKind, projectId?: string): string =>
  projectId ? `/evidossier/new/${kind}?projectId=${encodeURIComponent(projectId)}` : `/evidossier/new/${kind}`;
