/**
 * One clickable package row shared by the workbench home and the project pages.
 *
 * Rows render as Arco buttons so the whole line is a real keyboard-reachable
 * action; the Carbon list styling comes from `evd-listlink`.
 */
import React from 'react';
import type { ArtifactPackage, EvidossierSnapshot } from '../../domain/types';
import { formatDateTime, RowButton, StatusTag, ToneTag, useEvidT } from '../../design/primitives';
import { latestVersionForPackage } from './packageInfo';

export const PackageRow: React.FC<{
  pkg: ArtifactPackage;
  snapshot: EvidossierSnapshot;
  projectName?: string;
  showAttentionNote?: boolean;
  onOpen: () => void;
}> = ({ pkg, snapshot, projectName, showAttentionNote, onOpen }) => {
  const t = useEvidT();
  const latest = latestVersionForPackage(snapshot, pkg.id);
  const taskKind = t(`evidossierCommon.taskKind.${pkg.task.kind}`);
  const secondary = [projectName, taskKind, showAttentionNote ? pkg.attentionNote : undefined]
    .filter((part): part is string => Boolean(part))
    .join(' · ');

  return (
    <RowButton className='evd-listlink' onClick={onOpen} ariaLabel={`${pkg.code} ${pkg.title}`}>
      <span className='evd-mono evd-muted' style={{ flex: '0 0 64px', paddingTop: 2 }}>
        {pkg.code}
      </span>
      <span className='evd-proj-rowmain'>
        <span className='evd-list__title evd-truncate'>{pkg.title}</span>
        <span className='evd-list__text evd-truncate'>{secondary}</span>
      </span>
      <span className='evd-row evd-proj-rowmeta'>
        <ToneTag tone='neutral'>{taskKind}</ToneTag>
        {latest ? (
          <span className='evd-version evd-proj-version-slot'>{latest.label}</span>
        ) : (
          <span className='evd-caption evd-subtle evd-nowrap evd-proj-version-slot'>
            {t('evidossierProjects.packagesTab.noVersion')}
          </span>
        )}
        <StatusTag kind='package' value={pkg.status} />
        <span className='evd-caption evd-nowrap'>{formatDateTime(pkg.updatedAt)}</span>
        <span className='evd-link evd-nowrap'>{t('evidossierProjects.labels.open')}</span>
      </span>
    </RowButton>
  );
};
