/**
 * Read-only detail side panel for the artifact graph.
 *
 * Shows the exact package / version behind a node, or every relation aggregated
 * into an edge. All business actions are navigation only; nothing here mutates
 * the graph or a delivered version.
 */
import { Button, Tooltip } from '@arco-design/web-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { edgeRelationTypes, getRelationsForEdge } from '../../domain/graph';
import type { EvidossierSnapshot, GraphEdge, GraphNode } from '../../domain/types';
import { formatDate, formatDateTime, MetaList, StatusTag, ToneTag } from '../../design/primitives';
import { IconClose, IconExternal } from '../../design/icons';
import { getPackage, getRelationsForPackage, getVersion } from '../../data/selectors';
import type { GraphBranchAction } from './GraphView';

/** Keep Arco portals inside `.evd-root` so Carbon tokens and overrides apply. */
const getPopupMount = (): HTMLElement => (document.querySelector('.evd-root') as HTMLElement | null) ?? document.body;

export type GraphDetailPanelProps = {
  snapshot: EvidossierSnapshot;
  node?: GraphNode;
  edge?: GraphEdge;
  onClose: () => void;
  onTogglePackage: (packageId: string) => void;
  onOpenPackage: (packageId: string) => void;
  onOpenVersion: (packageId: string, versionId: string) => void;
  onCreateBranch: (node: GraphNode, action: GraphBranchAction) => void;
};

export const GraphDetailPanel: React.FC<GraphDetailPanelProps> = ({
  snapshot,
  node,
  edge,
  onClose,
  onTogglePackage,
  onOpenPackage,
  onOpenVersion,
  onCreateBranch,
}) => {
  const { t } = useTranslation();

  if (!node && !edge) {
    return (
      <div className='evd-graph-details'>
        <div className='evd-graph-details__head'>
          <span className='evd-h4'>{t('evidossierGraph.details.title')}</span>
          <Button
            size='mini'
            type='text'
            icon={<IconClose size={14} />}
            aria-label={t('evidossierGraph.details.close')}
            onClick={onClose}
          />
        </div>
        <div className='evd-graph-details__body'>
          <p className='evd-graph-details__hint-title'>{t('evidossierGraph.details.emptyTitle')}</p>
          <p className='evd-caption evd-graph-details__hint-text'>{t('evidossierGraph.details.emptyText')}</p>
          <ul className='evd-graph-details__hint-list'>
            <li>{t('evidossierGraph.details.hintDirection')}</li>
            <li>{t('evidossierGraph.details.hintReadonly')}</li>
            <li>{t('evidossierGraph.details.hintExpand')}</li>
          </ul>
        </div>
      </div>
    );
  }

  if (edge) {
    const relations = getRelationsForEdge(snapshot, edge);
    const primary = relations[0];
    const types = edgeRelationTypes(edge);
    const sourceVersion = primary ? getVersion(snapshot, primary.source.versionId) : undefined;
    const targetVersion = primary ? getVersion(snapshot, primary.target.versionId) : undefined;
    const sourcePackage = primary ? getPackage(snapshot, primary.source.packageId) : undefined;
    const targetPackage = primary ? getPackage(snapshot, primary.target.packageId) : undefined;
    const sourceLabel = primary
      ? `${primary.source.packageCode} · ${primary.source.versionLabel}`
      : edge.sourceVersionId;
    const targetLabel = primary
      ? `${primary.target.packageCode} · ${primary.target.versionLabel}`
      : edge.targetVersionId;
    return (
      <div className='evd-graph-details'>
        <div className='evd-graph-details__head'>
          <span className='evd-h4'>{t('evidossierGraph.details.edgeTitle')}</span>
          <Button
            size='mini'
            type='text'
            icon={<IconClose size={14} />}
            aria-label={t('evidossierGraph.details.close')}
            onClick={onClose}
          />
        </div>
        <div className='evd-graph-details__body'>
          <div className='evd-row evd-graph-details__tags'>
            {types.map((type) => (
              <ToneTag key={type} tone='blue'>
                {t(`evidossierCommon.relation.${type}`)}
              </ToneTag>
            ))}
          </div>
          <MetaList
            items={[
              { label: t('evidossierGraph.details.source'), value: sourceLabel },
              { label: t('evidossierGraph.details.target'), value: targetLabel },
              {
                label: t('evidossierGraph.details.relationCount'),
                value: String(relations.length),
              },
              ...(primary?.scopeNote
                ? [{ label: t('evidossierCommon.relation.scope'), value: primary.scopeNote }]
                : []),
              ...(primary?.createdAt
                ? [{ label: t('evidossierCommon.relation.createdAt'), value: formatDateTime(primary.createdAt) }]
                : []),
            ]}
          />

          <div className='evd-graph-details__actions'>
            <Button
              size='small'
              type='primary'
              icon={<IconExternal size={14} />}
              disabled={!sourceVersion}
              onClick={() => primary && onOpenVersion(primary.source.packageId, primary.source.versionId)}
            >
              {t('evidossierGraph.details.openSource')}
            </Button>
            {!sourceVersion && sourcePackage ? (
              <Button size='small' onClick={() => primary && onOpenPackage(primary.source.packageId)}>
                {t('evidossierGraph.details.openSourcePackage')}
              </Button>
            ) : null}
            <Button
              size='small'
              icon={<IconExternal size={14} />}
              disabled={!targetVersion}
              onClick={() => primary && onOpenVersion(primary.target.packageId, primary.target.versionId)}
            >
              {t('evidossierGraph.details.openTarget')}
            </Button>
            {!targetVersion && targetPackage ? (
              <Button size='small' onClick={() => primary && onOpenPackage(primary.target.packageId)}>
                {t('evidossierGraph.details.openTargetPackage')}
              </Button>
            ) : null}
          </div>
          {!sourceVersion || !targetVersion ? (
            <p className='evd-caption evd-graph-details__note'>{t('evidossierGraph.details.endpointUnavailable')}</p>
          ) : null}

          {relations.length > 1 ? (
            <div className='evd-graph-details__sub'>
              <p className='evd-caption evd-graph-details__sub-title'>
                {t('evidossierGraph.details.aggregatedRelations', { count: relations.length })}
              </p>
              <ul className='evd-graph-details__relation-list'>
                {relations.map((relation) => (
                  <li key={relation.id} className='evd-graph-details__relation-item'>
                    <span className='evd-graph-details__relation-type'>
                      {t(`evidossierCommon.relation.${relation.type}`)}
                    </span>
                    <span className='evd-caption'>
                      {relation.source.versionLabel} → {relation.target.versionLabel}
                    </span>
                    {relation.comparisonRole ? (
                      <span className='evd-tag evd-tag--outline'>
                        {t(`evidossierCommon.comparisonRole.${relation.comparisonRole}`)}
                      </span>
                    ) : null}
                    {relation.scopeNote ? <span className='evd-caption'>{relation.scopeNote}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className='evd-caption evd-graph-details__note'>{t('evidossierGraph.details.edgeNote')}</p>
        </div>
      </div>
    );
  }

  const selected = node as GraphNode;
  const pkg = getPackage(snapshot, selected.packageId);
  if (!pkg) {
    return (
      <div className='evd-graph-details'>
        <div className='evd-graph-details__head'>
          <span className='evd-h4'>{t('evidossierGraph.details.title')}</span>
          <Button
            size='mini'
            type='text'
            icon={<IconClose size={14} />}
            aria-label={t('evidossierGraph.details.close')}
            onClick={onClose}
          />
        </div>
        <div className='evd-graph-details__body'>
          <p className='evd-caption'>{t('evidossierGraph.details.unavailable')}</p>
        </div>
      </div>
    );
  }

  const packageVersions = snapshot.versions
    .filter((version) => version.packageId === pkg.id)
    .sort((a, b) => a.versionNumber - b.versionNumber);
  const latestVersion = packageVersions[packageVersions.length - 1];
  const relations = getRelationsForPackage(snapshot, pkg.id);
  const relationCount = relations.incoming.length + relations.outgoing.length;
  const project = snapshot.projects.find((candidate) => candidate.id === pkg.projectId);

  if (selected.nodeType === 'version') {
    const version = getVersion(snapshot, selected.versionId);
    const baseVersion = version?.baseVersionId ? getVersion(snapshot, version.baseVersionId) : undefined;
    const versionRelations = snapshot.relations.filter(
      (relation) => relation.source.versionId === selected.versionId || relation.target.versionId === selected.versionId
    );
    return (
      <div className='evd-graph-details'>
        <div className='evd-graph-details__head'>
          <span className='evd-h4'>{t('evidossierGraph.details.versionTitle')}</span>
          <Button
            size='mini'
            type='text'
            icon={<IconClose size={14} />}
            aria-label={t('evidossierGraph.details.close')}
            onClick={onClose}
          />
        </div>
        <div className='evd-graph-details__body'>
          <div className='evd-graph-details__title-row'>
            <span className='evd-graph-details__title evd-mono'>{selected.versionLabel}</span>
            {version ? <StatusTag kind='version' value={version.status} /> : null}
            {selected.isCurrent ? <ToneTag tone='blue'>{t('evidossierGraph.details.current')}</ToneTag> : null}
          </div>
          <p className='evd-caption evd-graph-details__subtitle'>
            {pkg.code} · {pkg.title}
          </p>
          <MetaList
            items={[
              {
                label: t('evidossierGraph.details.taskKind'),
                value: t(`evidossierCommon.taskKind.${pkg.task.kind}`),
              },
              ...(version
                ? [
                    { label: t('evidossierGraph.details.submittedAt'), value: formatDateTime(version.createdAt) },
                    { label: t('evidossierGraph.details.submittedBy'), value: version.createdBy.displayName },
                    { label: t('evidossierGraph.details.changeNote'), value: version.changeNote },
                    {
                      label: t('evidossierGraph.details.baseVersion'),
                      value: baseVersion?.label ?? t('evidossierGraph.details.none'),
                    },
                  ]
                : [{ label: t('evidossierGraph.details.status'), value: t('evidossierGraph.details.unavailable') }]),
              {
                label: t('evidossierGraph.details.relationCount'),
                value: String(versionRelations.length),
              },
              { label: t('evidossierGraph.details.project'), value: project?.name ?? pkg.projectId },
            ]}
          />
          <div className='evd-graph-details__actions'>
            <Button
              size='small'
              type='primary'
              icon={<IconExternal size={14} />}
              onClick={() => onOpenVersion(pkg.id, selected.versionId)}
            >
              {t('evidossierGraph.details.openVersion')}
            </Button>
            <Button size='small' onClick={() => onOpenPackage(pkg.id)}>
              {t('evidossierGraph.details.openPackage')}
            </Button>
            {pkg.task.kind === 'generate' ? (
              <Button size='small' onClick={() => onCreateBranch(selected, 'revise')}>
                {t('evidossierGraph.create.revise')}
              </Button>
            ) : null}
            <Button size='small' onClick={() => onCreateBranch(selected, 'review')}>
              {t('evidossierGraph.create.review')}
            </Button>
            <Button size='small' onClick={() => onCreateBranch(selected, 'compare')}>
              {t('evidossierGraph.create.compare')}
            </Button>
          </div>
          <p className='evd-caption evd-graph-details__note'>{t('evidossierGraph.details.branchHint')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className='evd-graph-details'>
      <div className='evd-graph-details__head'>
        <span className='evd-h4'>{t('evidossierGraph.details.packageTitle')}</span>
        <Button
          size='mini'
          type='text'
          icon={<IconClose size={14} />}
          aria-label={t('evidossierGraph.details.close')}
          onClick={onClose}
        />
      </div>
      <div className='evd-graph-details__body'>
        <div className='evd-graph-details__title-row'>
          <span className='evd-graph-details__title evd-mono'>{pkg.code}</span>
          <StatusTag kind='package' value={pkg.status} />
          <ToneTag tone='outline'>{t(`evidossierCommon.taskKind.${pkg.task.kind}Short`)}</ToneTag>
        </div>
        <p className='evd-graph-details__subtitle'>{pkg.title}</p>
        <MetaList
          items={[
            { label: t('evidossierGraph.details.project'), value: project?.name ?? pkg.projectId },
            {
              label: t('evidossierGraph.details.currentVersion'),
              value: latestVersion?.label ?? t('evidossierGraph.details.noVersion'),
            },
            { label: t('evidossierGraph.details.versionCount'), value: String(packageVersions.length) },
            { label: t('evidossierGraph.details.updatedAt'), value: formatDateTime(pkg.updatedAt) },
            { label: t('evidossierGraph.details.relationCount'), value: String(relationCount) },
            {
              label: t('evidossierGraph.details.lastSubmitted'),
              value: latestVersion ? formatDate(latestVersion.createdAt) : t('evidossierGraph.details.none'),
            },
          ]}
        />
        <div className='evd-graph-details__actions'>
          <Button size='small' type='primary' icon={<IconExternal size={14} />} onClick={() => onOpenPackage(pkg.id)}>
            {t('evidossierGraph.details.openPackage')}
          </Button>
          <Tooltip
            getPopupContainer={getPopupMount}
            content={
              packageVersions.length === 0
                ? t('evidossierGraph.node.noVersionsHint')
                : t('evidossierGraph.node.expandVersions')
            }
          >
            <Button size='small' disabled={packageVersions.length === 0} onClick={() => onTogglePackage(pkg.id)}>
              {t('evidossierGraph.node.expandVersions')}
            </Button>
          </Tooltip>
        </div>
        {packageVersions.length === 0 ? (
          <p className='evd-caption evd-graph-details__note'>{t('evidossierGraph.node.noVersionsHint')}</p>
        ) : null}
      </div>
    </div>
  );
};

export default GraphDetailPanel;
