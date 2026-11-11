/**
 * Project overview tab: project-level numbers, task entries, packages waiting
 * for the user, recent packages, material overview and relation summary.
 */
import { Button } from '@arco-design/web-react';
import { useNavigate } from 'react-router-dom';
import React from 'react';
import { useEvidossier } from '../../data/EvidossierProvider';
import {
  getPackage,
  getProjectRelations,
  listProjectMaterials,
  listProjectPackages,
  packageNeedsUser,
} from '../../data/selectors';
import type { Project } from '../../domain/types';
import { IconCompare, IconGenerate, IconGraph, IconReview } from '../../design/icons';
import { EmptyState, LoadingBlock, Section, Stats, StatusTag, ToneTag, useEvidT } from '../../design/primitives';
import { PackageRow } from './PackageRow';
import { createTaskPath, packagePath, TASK_KINDS } from './packageInfo';

const TASK_ICONS: Record<string, React.ReactNode> = {
  generate: <IconGenerate size={14} />,
  review: <IconReview size={14} />,
  compare: <IconCompare size={14} />,
};

export const ProjectOverview: React.FC<{
  project: Project;
  onOpenTab: (tab: string) => void;
}> = ({ project, onOpenTab }) => {
  const t = useEvidT();
  const navigate = useNavigate();
  const { snapshot } = useEvidossier();

  if (!snapshot) {
    return <LoadingBlock />;
  }

  const packages = listProjectPackages(snapshot, project.id);
  const attention = packages.filter(packageNeedsUser);
  const materials = listProjectMaterials(snapshot, project.id);
  const relations = getProjectRelations(snapshot, project.id);
  const incoming = relations.filter(
    (relation) => getPackage(snapshot, relation.target.packageId)?.projectId === project.id
  ).length;
  const outgoing = relations.filter(
    (relation) => getPackage(snapshot, relation.source.packageId)?.projectId === project.id
  ).length;
  const versions = snapshot.versions.filter((version) => version.projectId === project.id);

  return (
    <>
      <div className='evd-mb-24'>
        <Stats
          items={[
            { label: t('evidossierProjects.project.stats.packages'), value: packages.length },
            { label: t('evidossierProjects.project.stats.materials'), value: materials.length },
            { label: t('evidossierProjects.project.stats.attention'), value: attention.length },
            { label: t('evidossierProjects.project.stats.versions'), value: versions.length },
          ]}
        />
      </div>

      <Section title={t('evidossierProjects.project.taskbarTitle')} hint={t('evidossierProjects.project.taskbarHint')}>
        <div className='evd-proj-taskbar'>
          {TASK_KINDS.map((kind) => (
            <Button key={kind} icon={TASK_ICONS[kind]} onClick={() => navigate(createTaskPath(kind, project.id))}>
              {t(`evidossierCommon.taskKind.${kind}`)}
            </Button>
          ))}
        </div>
      </Section>

      <Section title={t('evidossierProjects.project.attentionTitle')}>
        {attention.length === 0 ? (
          <div className='evd-card'>
            <EmptyState
              title={t('evidossierProjects.project.attentionEmptyTitle')}
              text={t('evidossierProjects.project.attentionEmptyText')}
            />
          </div>
        ) : (
          <div className='evd-card'>
            {attention.map((pkg) => (
              <PackageRow
                key={pkg.id}
                pkg={pkg}
                snapshot={snapshot}
                showAttentionNote
                onOpen={() => navigate(packagePath(pkg.id))}
              />
            ))}
          </div>
        )}
      </Section>

      <Section
        title={t('evidossierProjects.project.recentPackagesTitle')}
        actions={
          <Button type='text' onClick={() => onOpenTab('packages')}>
            {t('evidossierCommon.action.viewAll')}
          </Button>
        }
      >
        {packages.length === 0 ? (
          <EmptyState
            title={t('evidossierProjects.project.recentPackagesEmptyTitle')}
            text={t('evidossierProjects.project.recentPackagesEmptyText')}
            actions={
              <Button onClick={() => navigate(createTaskPath('generate', project.id))}>
                {t('evidossierProjects.project.createPackage')}
              </Button>
            }
          />
        ) : (
          <div className='evd-card'>
            {packages.slice(0, 6).map((pkg) => (
              <PackageRow key={pkg.id} pkg={pkg} snapshot={snapshot} onOpen={() => navigate(packagePath(pkg.id))} />
            ))}
          </div>
        )}
      </Section>

      <Section
        title={t('evidossierProjects.project.materialsTitle')}
        hint={t('evidossierProjects.project.materialsHint', { count: materials.length })}
        actions={
          <Button type='text' onClick={() => onOpenTab('materials')}>
            {t('evidossierProjects.project.openMaterials')}
          </Button>
        }
      >
        {materials.length === 0 ? (
          <EmptyState
            title={t('evidossierProjects.project.materialsEmptyTitle')}
            text={t('evidossierProjects.project.materialsEmptyText')}
            actions={<Button onClick={() => onOpenTab('materials')}>{t('evidossierCommon.action.addMaterial')}</Button>}
          />
        ) : (
          <div className='evd-card'>
            {materials.slice(0, 5).map((material) => {
              const current = material.versions.find((version) => version.id === material.currentVersionId);
              return (
                <div className='evd-proj-material-row' key={material.id}>
                  <div className='evd-proj-material-row__main'>
                    <span className='evd-list__title evd-truncate'>{material.name}</span>
                    <span className='evd-list__text evd-truncate'>
                      {t(`evidossierCommon.materialKind.${material.kind}`)} ·{' '}
                      {t(`evidossierCommon.materialUsage.${material.usage}`)}
                    </span>
                  </div>
                  <ToneTag tone='neutral'>{t(`evidossierCommon.materialOrigin.${material.origin}`)}</ToneTag>
                  {current ? (
                    <span className='evd-version'>
                      {t('evidossierProjects.materials.versionSingle', { number: current.version })}
                    </span>
                  ) : null}
                  {current ? <StatusTag kind='parse' value={current.parseStatus} /> : null}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section
        title={t('evidossierProjects.project.relationsTitle')}
        hint={t('evidossierProjects.project.relationsHint')}
      >
        <div className='evd-proj-relation-grid evd-mb-16'>
          <div className='evd-proj-mini'>
            <div className='evd-proj-mini__label'>{t('evidossierProjects.project.relationsTitle')}</div>
            <div className='evd-proj-mini__value'>{relations.length}</div>
          </div>
          <div className='evd-proj-mini'>
            <div className='evd-proj-mini__label'>{t('evidossierProjects.project.relationIncoming')}</div>
            <div className='evd-proj-mini__value'>{incoming}</div>
          </div>
          <div className='evd-proj-mini'>
            <div className='evd-proj-mini__label'>{t('evidossierProjects.project.relationOutgoing')}</div>
            <div className='evd-proj-mini__value'>{outgoing}</div>
          </div>
        </div>
        {relations.length === 0 ? (
          <EmptyState
            title={t('evidossierProjects.project.relationsEmptyTitle')}
            text={t('evidossierProjects.project.relationsEmptyText')}
            actions={
              <Button icon={<IconGraph size={14} />} onClick={() => onOpenTab('graph')}>
                {t('evidossierProjects.project.openGraph')}
              </Button>
            }
          />
        ) : (
          <div className='evd-row' style={{ gap: 8, flexWrap: 'wrap' }}>
            <span className='evd-caption'>
              {t('evidossierProjects.project.relationsCount', { count: relations.length })}
            </span>
            <Button size='small' icon={<IconGraph size={14} />} onClick={() => onOpenTab('graph')}>
              {t('evidossierProjects.project.openGraph')}
            </Button>
          </div>
        )}
      </Section>
    </>
  );
};
