/**
 * Project packages tab: a filterable table of every package in the project.
 *
 * Filters are front-end only; the table always renders from the snapshot.
 */
import { Button, Input, Select } from '@arco-design/web-react';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEvidossier } from '../../data/EvidossierProvider';
import { listProjectPackages } from '../../data/selectors';
import type { PackageStatus, TaskKind } from '../../domain/types';
import { IconSearch } from '../../design/icons';
import { EmptyState, LoadingBlock, StatusTag, ToneTag, formatDate, useEvidT } from '../../design/primitives';
import {
  PACKAGE_STATUSES,
  TASK_KINDS,
  countPackageRelations,
  createTaskPath,
  latestVersionForPackage,
  packagePath,
} from './packageInfo';

type KindFilter = 'all' | TaskKind;
type StatusFilter = 'all' | PackageStatus;

export const ProjectPackagesTab: React.FC<{ projectId: string }> = ({ projectId }) => {
  const t = useEvidT();
  const navigate = useNavigate();
  const { snapshot } = useEvidossier();
  const [kind, setKind] = useState<KindFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  const packages = useMemo(() => (snapshot ? listProjectPackages(snapshot, projectId) : []), [snapshot, projectId]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return packages.filter((pkg) => {
      if (kind !== 'all' && pkg.task.kind !== kind) return false;
      if (status !== 'all' && pkg.status !== status) return false;
      if (!query) return true;
      return pkg.title.toLowerCase().includes(query) || pkg.code.toLowerCase().includes(query);
    });
  }, [packages, kind, status, search]);

  if (!snapshot) {
    return <LoadingBlock />;
  }

  const hasFilters = kind !== 'all' || status !== 'all' || search.trim() !== '';
  const resetFilters = (): void => {
    setKind('all');
    setStatus('all');
    setSearch('');
  };

  if (packages.length === 0) {
    return (
      <EmptyState
        title={t('evidossierProjects.packagesTab.emptyTitle')}
        text={t('evidossierProjects.packagesTab.emptyText')}
        actions={
          <>
            {TASK_KINDS.map((taskKind) => (
              <Button key={taskKind} onClick={() => navigate(createTaskPath(taskKind, projectId))}>
                {t(`evidossierCommon.taskKind.${taskKind}`)}
              </Button>
            ))}
          </>
        }
      />
    );
  }

  const kindOptions = [
    { label: t('evidossierProjects.packagesTab.allKinds'), value: 'all' },
    ...TASK_KINDS.map((taskKind) => ({
      label: t(`evidossierCommon.taskKind.${taskKind}`),
      value: taskKind,
    })),
  ];
  const statusOptions = [
    { label: t('evidossierProjects.packagesTab.allStatuses'), value: 'all' },
    ...PACKAGE_STATUSES.map((packageStatus) => ({
      label: t(`evidossierCommon.status.package.${packageStatus}`),
      value: packageStatus,
    })),
  ];

  return (
    <>
      <div className='evd-proj-filters evd-mb-16'>
        <Select
          style={{ width: 168 }}
          value={kind}
          options={kindOptions}
          onChange={(value) => setKind(value as KindFilter)}
          aria-label={t('evidossierProjects.packagesTab.kindFilter')}
        />
        <Select
          style={{ width: 168 }}
          value={status}
          options={statusOptions}
          onChange={(value) => setStatus(value as StatusFilter)}
          aria-label={t('evidossierProjects.packagesTab.statusFilter')}
        />
        <Input
          style={{ width: 280, maxWidth: '100%' }}
          prefix={<IconSearch size={14} />}
          allowClear
          value={search}
          onChange={(value) => setSearch(value)}
          placeholder={t('evidossierProjects.packagesTab.searchPlaceholder')}
          aria-label={t('evidossierProjects.packagesTab.searchPlaceholder')}
        />
        <span className='evd-caption'>
          {t('evidossierProjects.packagesTab.count', { visible: filtered.length, total: packages.length })}
        </span>
        {hasFilters ? (
          <Button size='small' type='text' onClick={resetFilters}>
            {t('evidossierProjects.packagesTab.resetFilters')}
          </Button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={t('evidossierProjects.packagesTab.noMatchTitle')}
          text={t('evidossierProjects.packagesTab.noMatchText')}
          actions={<Button onClick={resetFilters}>{t('evidossierProjects.packagesTab.resetFilters')}</Button>}
        />
      ) : (
        <div className='evd-table-wrap'>
          <table className='evd-table evd-proj-table'>
            <thead>
              <tr>
                <th>{t('evidossierProjects.packagesTab.columns.code')}</th>
                <th>{t('evidossierProjects.packagesTab.columns.title')}</th>
                <th>{t('evidossierProjects.packagesTab.columns.kind')}</th>
                <th>{t('evidossierProjects.packagesTab.columns.status')}</th>
                <th>{t('evidossierProjects.packagesTab.columns.version')}</th>
                <th>{t('evidossierProjects.packagesTab.columns.updated')}</th>
                <th>{t('evidossierProjects.packagesTab.columns.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((pkg) => {
                const latest = latestVersionForPackage(snapshot, pkg.id);
                return (
                  <tr key={pkg.id}>
                    <td className='evd-table__num'>{pkg.code}</td>
                    <td>
                      <div className='evd-proj-cell-main'>
                        <span className='evd-list__title evd-truncate'>{pkg.title}</span>
                        <span className='evd-list__text evd-truncate'>
                          {pkg.task.goal} ·{' '}
                          {t('evidossierProjects.packagesTab.relationsCount', {
                            count: countPackageRelations(snapshot, pkg.id),
                          })}
                        </span>
                      </div>
                    </td>
                    <td>
                      <ToneTag tone='neutral'>{t(`evidossierCommon.taskKind.${pkg.task.kind}`)}</ToneTag>
                    </td>
                    <td>
                      <StatusTag kind='package' value={pkg.status} />
                    </td>
                    <td>
                      {latest ? (
                        <span className='evd-version'>{latest.label}</span>
                      ) : (
                        <span className='evd-caption evd-subtle evd-nowrap'>
                          {t('evidossierProjects.packagesTab.noVersion')}
                        </span>
                      )}
                    </td>
                    <td className='evd-caption evd-nowrap'>{formatDate(pkg.updatedAt)}</td>
                    <td>
                      <div className='evd-proj-actions'>
                        <Button size='small' type='text' onClick={() => navigate(packagePath(pkg.id))}>
                          {t('evidossierCommon.action.open')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};
