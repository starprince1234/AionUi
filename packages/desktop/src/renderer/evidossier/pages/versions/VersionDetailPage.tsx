/**
 * Read-only package version snapshot (`/evidossier/packages/:packageId/versions/:versionId`).
 *
 * Delivered versions are immutable: this page only reads the frozen snapshot
 * (deliverable, inputs, stage artifacts, confirmations, relations). The one
 * mutating action is "continue editing", which creates a new working draft in
 * the same package and navigates to the package workspace.
 */
import { Button, Message, Modal } from '@arco-design/web-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { DocumentView } from '../../components/DocumentView';
import { useEvidossier } from '../../data/EvidossierProvider';
import { getPackage, getProject, getVersion, resolveMaterialReference } from '../../data/selectors';
import type { PackageRelation, VersionedArtifactRef } from '../../domain/types';
import {
  Banner,
  DemoTag,
  EmptyState,
  formatDateTime,
  LoadingBlock,
  MetaList,
  PageHeader,
  Section,
  StatusTag,
  TabStrip,
  ToneTag,
} from '../../design/primitives';
import { IconDownload, IconGraph, IconLock } from '../../design/icons';
import VersionArtifactSummary from './VersionArtifactSummary';
import './versionDetail.css';

type TabKey = 'deliverable' | 'inputs' | 'artifacts' | 'confirmations' | 'relations';

/** Keep Arco portals inside `.evd-root` so Carbon tokens and overrides apply. */
const getPopupMount = (): HTMLElement => (document.querySelector('.evd-root') as HTMLElement | null) ?? document.body;

const VersionDetailPage: React.FC = () => {
  const params = useParams<{ packageId?: string; versionId?: string }>();
  const location = useLocation();
  // The Evidossier shell may render the page outside a parameterized route, so
  // derive the ids from the location path and only fall back to `useParams`.
  const pathMatch = location.pathname.match(/\/packages\/([^/]+)\/versions\/([^/]+)/);
  const packageId = params.packageId ?? pathMatch?.[1] ?? '';
  const versionId = params.versionId ?? pathMatch?.[2] ?? '';
  const { snapshot, actions } = useEvidossier();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [tab, setTab] = useState<TabKey>('deliverable');
  const [continueOpen, setContinueOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [expandedArtifactId, setExpandedArtifactId] = useState<string | undefined>(undefined);

  if (!snapshot) return <LoadingBlock />;

  const pkg = getPackage(snapshot, packageId);
  const version = pkg ? getVersion(snapshot, versionId) : undefined;

  if (!pkg || !version || version.packageId !== pkg.id) {
    return (
      <div className='evd-main__scroll'>
        <div className='evd-page'>
          <EmptyState
            title={t('evidossierGraph.versionPage.notFoundTitle')}
            text={t('evidossierGraph.versionPage.notFoundText')}
            actions={
              <>
                <Button type='primary' onClick={() => navigate(`/evidossier/packages/${packageId}`)}>
                  {t('evidossierGraph.versionPage.backToPackage')}
                </Button>
                <Button onClick={() => navigate('/evidossier/projects')}>
                  {t('evidossierGraph.versionPage.backToProjects')}
                </Button>
              </>
            }
          />
        </div>
      </div>
    );
  }

  const project = getProject(snapshot, pkg.projectId);
  const packageVersions = snapshot.versions
    .filter((candidate) => candidate.packageId === pkg.id)
    .sort((a, b) => a.versionNumber - b.versionNumber);
  const latestVersion = packageVersions[packageVersions.length - 1];
  const isLatest = latestVersion?.id === version.id;
  const baseVersion = version.baseVersionId ? getVersion(snapshot, version.baseVersionId) : undefined;
  const incomingRelations = snapshot.relations.filter((relation) => relation.target.versionId === version.id);
  const outgoingRelations = snapshot.relations.filter((relation) => relation.source.versionId === version.id);
  const isGenerate = pkg.task.kind === 'generate';

  const reviewUrl = `/evidossier/new/review?projectId=${encodeURIComponent(pkg.projectId)}&reviewVersionId=${encodeURIComponent(
    version.id
  )}`;
  const compareUrl = `/evidossier/new/compare?projectId=${encodeURIComponent(
    pkg.projectId
  )}&baselineVersionId=${encodeURIComponent(version.id)}`;
  const graphUrl = `/evidossier/projects/${pkg.projectId}/graph`;

  const unavailableInputs = version.inputs.filter(
    (reference) => !resolveMaterialReference(snapshot, reference).available
  ).length;

  const handleContinueEditing = async (): Promise<void> => {
    setBusy(true);
    const ok = await actions.continueEditing(pkg.id, version.id);
    setBusy(false);
    if (!ok) return;
    setContinueOpen(false);
    Message.success(t('evidossierGraph.versionPage.continueEditDone', { label: version.label }));
    navigate(`/evidossier/packages/${pkg.id}`);
  };

  const handleDownload = (): void => {
    Message.info(t('evidossierGraph.versionPage.deliverable.downloadDemo'));
  };

  const renderRelationRow = (relation: PackageRelation, direction: 'incoming' | 'outgoing'): React.ReactNode => {
    const counterpart = direction === 'incoming' ? relation.source : relation.target;
    const counterpartVersion = getVersion(snapshot, counterpart.versionId);
    const counterpartPackage = getPackage(snapshot, counterpart.packageId);
    return (
      <li key={relation.id} className='evd-list__item evd-ver-relation'>
        <div className='evd-list__main'>
          <div className='evd-row evd-ver-relation__head'>
            <ToneTag tone='blue'>{t(`evidossierCommon.relation.${relation.type}`)}</ToneTag>
            <span className='evd-body evd-truncate'>
              {counterpart.packageCode} · {counterpart.versionLabel}
            </span>
            {relation.comparisonRole ? (
              <span className='evd-tag evd-tag--outline'>
                {t(`evidossierCommon.comparisonRole.${relation.comparisonRole}`)}
              </span>
            ) : null}
          </div>
          <div className='evd-caption'>{counterpart.packageTitle}</div>
          {relation.scopeNote ? (
            <div className='evd-caption'>
              {t('evidossierGraph.versionPage.relations.scopePrefix')}: {relation.scopeNote}
            </div>
          ) : null}
          <div className='evd-caption'>{formatDateTime(relation.createdAt)}</div>
        </div>
        <div className='evd-ver-relation__action'>
          {counterpartVersion ? (
            <Button
              size='small'
              onClick={() =>
                navigate(`/evidossier/packages/${counterpart.packageId}/versions/${counterpart.versionId}`)
              }
            >
              {t('evidossierGraph.versionPage.relations.openCounterpart')}
            </Button>
          ) : counterpartPackage ? (
            <Button size='small' onClick={() => navigate(`/evidossier/packages/${counterpart.packageId}`)}>
              {t('evidossierGraph.versionPage.relations.openCounterpartPackage')}
            </Button>
          ) : (
            <ToneTag tone='red'>{t('evidossierGraph.versionPage.relations.unavailable')}</ToneTag>
          )}
        </div>
      </li>
    );
  };

  const renderArtifact = (reference: VersionedArtifactRef): React.ReactNode => {
    const artifact = snapshot.artifacts.find((candidate) => candidate.id === reference.artifactId);
    const expanded = expandedArtifactId === reference.artifactId;
    const superseded = artifact?.status === 'superseded';
    return (
      <div key={reference.artifactId} className='evd-ver-artifact'>
        <div className='evd-ver-artifact__head'>
          <div className='evd-ver-artifact__titles'>
            <span className='evd-h4'>{reference.title}</span>
            <span className='evd-caption'>
              {t(`evidossierCommon.artifactKind.${reference.kind}`)} ·{' '}
              {t('evidossierGraph.versionPage.artifacts.revision', { revision: reference.revision })}
            </span>
          </div>
          <div className='evd-row'>
            {artifact ? (
              <StatusTag kind='artifact' value={artifact.status} />
            ) : (
              <ToneTag tone='outline'>{t('evidossierGraph.versionPage.artifacts.snapshotRef')}</ToneTag>
            )}
            <Button
              size='mini'
              onClick={() => setExpandedArtifactId(expanded ? undefined : reference.artifactId)}
              aria-expanded={expanded}
            >
              {expanded
                ? t('evidossierGraph.versionPage.artifacts.collapse')
                : t('evidossierGraph.versionPage.artifacts.expand')}
            </Button>
          </div>
        </div>
        {expanded ? (
          artifact ? (
            <div className='evd-ver-artifact__body'>
              <p className='evd-caption evd-ver-artifact__summary'>{artifact.summary}</p>
              <VersionArtifactSummary artifact={artifact} />
              {superseded ? (
                <p className='evd-caption evd-ver-artifact__note'>
                  {t('evidossierGraph.versionPage.artifacts.supersededNote')}
                </p>
              ) : null}
            </div>
          ) : (
            <p className='evd-caption evd-ver-artifact__body'>
              {t('evidossierGraph.versionPage.artifacts.notAvailable')}
            </p>
          )
        ) : null}
      </div>
    );
  };

  const tabItems = [
    { key: 'deliverable', label: t('evidossierGraph.versionPage.tabs.deliverable') },
    { key: 'inputs', label: t('evidossierGraph.versionPage.tabs.inputs'), count: version.inputs.length },
    { key: 'artifacts', label: t('evidossierGraph.versionPage.tabs.artifacts'), count: version.artifacts.length },
    {
      key: 'confirmations',
      label: t('evidossierGraph.versionPage.tabs.confirmations'),
      count: version.confirmations.length,
    },
    {
      key: 'relations',
      label: t('evidossierGraph.versionPage.tabs.relations'),
      count: incomingRelations.length + outgoingRelations.length,
    },
  ];

  return (
    <div className='evd-main__scroll'>
      <div className='evd-page evd-ver-page'>
        <PageHeader
          crumbs={[
            { label: t('evidossierCommon.nav.home'), onClick: () => navigate('/evidossier') },
            {
              label: project?.name ?? t('evidossierGraph.versionPage.projectFallback'),
              onClick: () => navigate(`/evidossier/projects/${pkg.projectId}`),
            },
            {
              label: `${pkg.code} · ${pkg.title}`,
              onClick: () => navigate(`/evidossier/packages/${pkg.id}`),
            },
            { label: version.label },
          ]}
          title={
            <span className='evd-ver-title'>
              <span className='evd-mono evd-ver-title__label'>{version.label}</span>
              <StatusTag kind='version' value={version.status} />
              <ToneTag tone='outline'>{t(`evidossierCommon.taskKind.${pkg.task.kind}Short`)}</ToneTag>
            </span>
          }
          description={version.changeNote}
          meta={
            <MetaList
              items={[
                { label: t('evidossierGraph.versionPage.meta.submittedAt'), value: formatDateTime(version.createdAt) },
                { label: t('evidossierGraph.versionPage.meta.submittedBy'), value: version.createdBy.displayName },
                {
                  label: t('evidossierGraph.versionPage.meta.baseVersion'),
                  value: baseVersion ? (
                    <Button
                      type='text'
                      size='mini'
                      className='evd-btn-reset evd-link'
                      onClick={() =>
                        navigate(`/evidossier/packages/${baseVersion.packageId}/versions/${baseVersion.id}`)
                      }
                    >
                      {baseVersion.label}
                    </Button>
                  ) : (
                    t('evidossierGraph.versionPage.meta.none')
                  ),
                },
                { label: t('evidossierGraph.versionPage.meta.project'), value: project?.name ?? pkg.projectId },
                {
                  label: t('evidossierGraph.versionPage.meta.package'),
                  value: (
                    <Button
                      type='text'
                      size='mini'
                      className='evd-btn-reset evd-link'
                      onClick={() => navigate(`/evidossier/packages/${pkg.id}`)}
                    >
                      {pkg.code}
                    </Button>
                  ),
                },
                {
                  label: t('evidossierGraph.versionPage.meta.latest'),
                  value: latestVersion ? latestVersion.label : t('evidossierGraph.versionPage.meta.none'),
                },
              ]}
            />
          }
          actions={
            <>
              {isGenerate ? (
                <Button type='primary' icon={<IconLock size={14} />} onClick={() => setContinueOpen(true)}>
                  {t('evidossierGraph.versionPage.actions.continueEdit')}
                </Button>
              ) : null}
              <Button onClick={() => navigate(reviewUrl)}>
                {t('evidossierGraph.versionPage.actions.startReview')}
              </Button>
              <Button onClick={() => navigate(compareUrl)}>{t('evidossierGraph.versionPage.actions.compare')}</Button>
            </>
          }
        />

        <Banner
          tone={version.status === 'partial' ? 'warning' : 'info'}
          title={
            version.status === 'partial'
              ? t('evidossierGraph.versionPage.readonly.partialTitle')
              : t('evidossierGraph.versionPage.readonly.title')
          }
          className='evd-ver-banner'
        >
          <p className='evd-ver-banner__text'>
            {version.status === 'partial'
              ? t('evidossierGraph.versionPage.readonly.partialText')
              : t('evidossierGraph.versionPage.readonly.text')}
          </p>
          {!isLatest && latestVersion ? (
            <p className='evd-caption'>
              {t('evidossierGraph.versionPage.readonly.historicalHint', { latest: latestVersion.label })}
            </p>
          ) : null}
        </Banner>

        <TabStrip
          items={tabItems}
          value={tab}
          onChange={(key: string) => setTab(key as TabKey)}
          ariaLabel={t('evidossierGraph.versionPage.tabs.aria')}
          className='evd-ver-tabs'
        />

        {tab === 'deliverable' ? (
          <Section
            title={t('evidossierGraph.versionPage.deliverable.title')}
            hint={t('evidossierGraph.versionPage.deliverable.hint')}
            actions={
              <>
                <DemoTag />
                <Button size='small' icon={<IconDownload size={14} />} onClick={handleDownload}>
                  {t('evidossierGraph.versionPage.deliverable.download')}
                </Button>
              </>
            }
          >
            <MetaList
              items={[
                { label: t('evidossierGraph.versionPage.deliverable.fileName'), value: version.deliverable.fileName },
                {
                  label: t('evidossierGraph.versionPage.deliverable.formatLabel'),
                  value: t(`evidossierGraph.versionPage.deliverable.format.${version.deliverable.format}`),
                },
                {
                  label: t('evidossierGraph.versionPage.deliverable.kindLabel'),
                  value: t(`evidossierGraph.versionPage.deliverable.kind.${version.deliverable.kind}`),
                },
                {
                  label: t('evidossierGraph.versionPage.deliverable.pages'),
                  value:
                    typeof version.deliverable.pageCount === 'number'
                      ? String(version.deliverable.pageCount)
                      : t('evidossierGraph.versionPage.meta.none'),
                },
              ]}
            />
            {version.deliverable.simulatedFile ? (
              <Banner tone='info' className='evd-mt-16'>
                {t('evidossierGraph.versionPage.deliverable.simulated')}
              </Banner>
            ) : null}
            <div className='evd-ver-doc evd-mt-16'>
              {version.deliverable.document ? (
                <DocumentView
                  document={version.deliverable.document}
                  title={version.deliverable.title}
                  titleSuffix={t('evidossierGraph.versionPage.deliverable.readonlySuffix')}
                />
              ) : (
                <EmptyState
                  title={t('evidossierGraph.versionPage.deliverable.noDocumentTitle')}
                  text={t('evidossierGraph.versionPage.deliverable.noDocumentText')}
                />
              )}
            </div>
          </Section>
        ) : null}

        {tab === 'inputs' ? (
          <Section
            title={t('evidossierGraph.versionPage.inputs.title')}
            hint={t('evidossierGraph.versionPage.inputs.hint')}
          >
            {version.inputs.length === 0 ? (
              <EmptyState
                title={t('evidossierGraph.versionPage.inputs.emptyTitle')}
                text={t('evidossierGraph.versionPage.inputs.emptyText')}
              />
            ) : (
              <>
                <div className='evd-table-wrap'>
                  <table className='evd-table evd-table--compact'>
                    <thead>
                      <tr>
                        <th>{t('evidossierGraph.versionPage.inputs.material')}</th>
                        <th>{t('evidossierGraph.versionPage.inputs.version')}</th>
                        <th>{t('evidossierGraph.versionPage.inputs.usage')}</th>
                        <th>{t('evidossierGraph.versionPage.inputs.availability')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {version.inputs.map((reference) => {
                        const resolved = resolveMaterialReference(snapshot, reference);
                        return (
                          <tr key={reference.id}>
                            <td>
                              <div className='evd-ver-input__name'>{reference.materialName}</div>
                              {reference.note ? <div className='evd-caption'>{reference.note}</div> : null}
                            </td>
                            <td className='evd-table__num'>v{reference.versionNumber}</td>
                            <td>{t(`evidossierCommon.materialUsage.${reference.role}`)}</td>
                            <td>
                              {resolved.available ? (
                                <div className='evd-row evd-ver-input__availability'>
                                  <StatusTag kind='parse' value={resolved.version?.parseStatus ?? 'pending'} />
                                  {resolved.version && !resolved.version.document ? (
                                    <span className='evd-caption'>
                                      {t('evidossierGraph.versionPage.inputs.noReadableBody')}
                                    </span>
                                  ) : null}
                                </div>
                              ) : (
                                <ToneTag tone='red'>{t('evidossierGraph.versionPage.inputs.unavailable')}</ToneTag>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {unavailableInputs > 0 ? (
                  <Banner tone='warning' className='evd-mt-16'>
                    {t('evidossierGraph.versionPage.inputs.unavailableNote', { count: unavailableInputs })}
                  </Banner>
                ) : null}
              </>
            )}
          </Section>
        ) : null}

        {tab === 'artifacts' ? (
          <Section
            title={t('evidossierGraph.versionPage.artifacts.title')}
            hint={t('evidossierGraph.versionPage.artifacts.hint')}
          >
            {version.artifacts.length === 0 ? (
              <EmptyState
                title={t('evidossierGraph.versionPage.artifacts.emptyTitle')}
                text={t('evidossierGraph.versionPage.artifacts.emptyText')}
              />
            ) : (
              <div className='evd-ver-artifacts'>{version.artifacts.map(renderArtifact)}</div>
            )}
          </Section>
        ) : null}

        {tab === 'confirmations' ? (
          <Section
            title={t('evidossierGraph.versionPage.confirmations.title')}
            hint={t('evidossierGraph.versionPage.confirmations.hint')}
          >
            {version.confirmations.length === 0 ? (
              <EmptyState
                title={t('evidossierGraph.versionPage.confirmations.emptyTitle')}
                text={t('evidossierGraph.versionPage.confirmations.emptyText')}
              />
            ) : (
              <ul className='evd-list evd-ver-confirmations'>
                {version.confirmations.map((confirmation) => (
                  <li key={confirmation.id} className='evd-list__item'>
                    <div className='evd-list__main'>
                      <div className='evd-list__title'>{confirmation.label}</div>
                      <div className='evd-caption'>
                        {t('evidossierCommon.confirmation.by', {
                          name: confirmation.confirmedBy.displayName,
                        })}{' '}
                        · {formatDateTime(confirmation.confirmedAt)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        ) : null}

        {tab === 'relations' ? (
          <Section
            title={t('evidossierGraph.versionPage.relations.title')}
            hint={t('evidossierGraph.versionPage.relations.hint')}
            actions={
              <Button size='small' icon={<IconGraph size={14} />} onClick={() => navigate(graphUrl)}>
                {t('evidossierGraph.versionPage.relations.viewGraph')}
              </Button>
            }
          >
            {incomingRelations.length === 0 && outgoingRelations.length === 0 ? (
              <EmptyState
                title={t('evidossierGraph.versionPage.relations.emptyTitle')}
                text={t('evidossierGraph.versionPage.relations.emptyText')}
              />
            ) : (
              <>
                <h3 className='evd-h4 evd-ver-relations__heading'>{t('evidossierCommon.relation.incoming')}</h3>
                {incomingRelations.length > 0 ? (
                  <ul className='evd-list'>
                    {incomingRelations.map((relation) => renderRelationRow(relation, 'incoming'))}
                  </ul>
                ) : (
                  <p className='evd-caption'>{t('evidossierGraph.versionPage.relations.noneIncoming')}</p>
                )}
                <h3 className='evd-h4 evd-ver-relations__heading evd-mt-24'>
                  {t('evidossierCommon.relation.outgoing')}
                </h3>
                {outgoingRelations.length > 0 ? (
                  <ul className='evd-list'>
                    {outgoingRelations.map((relation) => renderRelationRow(relation, 'outgoing'))}
                  </ul>
                ) : (
                  <p className='evd-caption'>{t('evidossierGraph.versionPage.relations.noneOutgoing')}</p>
                )}
              </>
            )}
          </Section>
        ) : null}
      </div>

      <Modal
        title={t('evidossierGraph.versionPage.continueEdit.title')}
        visible={continueOpen}
        confirmLoading={busy}
        okText={t('evidossierGraph.versionPage.actions.continueEdit')}
        cancelText={t('evidossierCommon.action.cancel')}
        getPopupContainer={getPopupMount}
        onCancel={() => setContinueOpen(false)}
        onOk={() => {
          void handleContinueEditing();
        }}
      >
        <p className='evd-body evd-mb-16'>
          {t('evidossierGraph.versionPage.continueEdit.text', { code: pkg.code, label: version.label })}
        </p>
        {!isLatest && latestVersion ? (
          <Banner tone='warning'>
            {t('evidossierGraph.versionPage.continueEdit.historyHint', {
              label: version.label,
              latest: latestVersion.label,
            })}
          </Banner>
        ) : null}
        <p className='evd-caption evd-mt-16'>{t('evidossierCommon.common.readOnlyHint')}</p>
      </Modal>
    </div>
  );
};

export default VersionDetailPage;
