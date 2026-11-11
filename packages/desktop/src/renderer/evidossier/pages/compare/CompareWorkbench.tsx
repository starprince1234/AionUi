/**
 * Version comparison workbench (task kind `compare`).
 *
 * Two exact input versions are shown side by side; differences and section
 * correspondence come from read-only stage artifacts. Selecting a difference
 * locates both sides, and the only state-changing actions are confirming the
 * current candidate result, submitting the report and starting a bounded
 * revision task from selected differences.
 */
import { Button, Drawer, Input, Message, Modal, Popconfirm, Select, Tooltip } from '@arco-design/web-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DocumentView, type BlockHighlight } from '../../components/DocumentView';
import { useEvidossier } from '../../data/EvidossierProvider';
import { getPackage } from '../../data/selectors';
import type { ComparisonDifference, PackageWorkspace } from '../../domain/types';
import {
  Banner,
  EmptyState,
  LoadingBlock,
  MetaList,
  Stats,
  StatusTag,
  TabStrip,
  ToneTag,
  formatDateTime,
  useEvidT,
} from '../../design/primitives';
import { IconArrowRight, IconExternal, IconList, IconSidebar } from '../../design/icons';
import { CompareReportPane, DifferenceDetailPane, DifferencesPane, MappingPane } from './ComparePanels';
import {
  buildCompareInputs,
  buildRevisionBaseOptions,
  compareArtifactKinds,
  comparisonReportPayloadOf,
  differenceAtBaseBlock,
  differenceAtTargetBlock,
  differenceKindCounts,
  differencesPayloadOf,
  documentStateOf,
  filterDifferences,
  findLatestArtifact,
  findMappingForDifference,
  inputOfRole,
  mappingPayloadOf,
  reportVersionOf,
  sortDifferences,
  type CompareInput,
} from './compareHelpers';
import './CompareWorkbench.css';

const DIFFERENCE_STAT_KEYS: Array<'added' | 'removed' | 'modified' | 'moved' | 'uncertain'> = [
  'added',
  'removed',
  'modified',
  'moved',
  'uncertain',
];

/** Keep Arco portals inside `.evd-root` so Carbon tokens and overrides apply. */
const getPopupMount = (): Element =>
  (typeof document === 'undefined' ? null : document.querySelector('.evd-root')) ?? document.body;

const CompareWorkbench: React.FC<{ workspace: PackageWorkspace }> = ({ workspace }) => {
  const t = useEvidT();
  const navigate = useNavigate();
  const { snapshot, actions } = useEvidossier();
  const { pkg, task, stages, artifacts, versions, execution } = workspace;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const [narrow, setNarrow] = useState(false);
  const [rightTab, setRightTab] = useState<'detail' | 'mapping' | 'report'>('detail');
  const [kinds, setKinds] = useState<ComparisonDifference['kind'][]>([
    'added',
    'removed',
    'modified',
    'moved',
    'uncertain',
  ]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [baseBlockId, setBaseBlockId] = useState<string>();
  const [targetBlockId, setTargetBlockId] = useState<string>();
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [unfinishedNote, setUnfinishedNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [transferBaseVersionId, setTransferBaseVersionId] = useState<string>();
  const [transferScope, setTransferScope] = useState('');
  const [transferTitle, setTransferTitle] = useState('');
  const [transferError, setTransferError] = useState<string>();
  const [transferSubmitting, setTransferSubmitting] = useState(false);

  useEffect(() => {
    const element = rootRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setNarrow(width > 0 && width < 1120);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const inputs = useMemo(
    () => (snapshot ? buildCompareInputs(snapshot, pkg.comparisonInputs) : []),
    [snapshot, pkg.comparisonInputs]
  );
  const baseline = useMemo(() => inputOfRole(inputs, 'baseline'), [inputs]);
  const target = useMemo(() => inputOfRole(inputs, 'target'), [inputs]);
  const additionalInputs = useMemo(() => inputs.filter((input) => input.role === 'additional'), [inputs]);
  const baselineDoc = baseline?.document;
  const targetDoc = target?.document;
  const baselineState = documentStateOf(baseline);
  const targetState = documentStateOf(target);

  const mappingArtifact = useMemo(() => findLatestArtifact(artifacts, 'mapping'), [artifacts]);
  const differencesArtifact = useMemo(() => findLatestArtifact(artifacts, 'differences'), [artifacts]);
  const reportArtifact = useMemo(() => findLatestArtifact(artifacts, 'comparison_report'), [artifacts]);
  const mapping = useMemo(() => mappingPayloadOf(mappingArtifact), [mappingArtifact]);
  const differencesPayload = useMemo(() => differencesPayloadOf(differencesArtifact), [differencesArtifact]);
  const report = useMemo(() => comparisonReportPayloadOf(reportArtifact), [reportArtifact]);

  const allDifferences = useMemo(() => sortDifferences(differencesPayload?.differences ?? []), [differencesPayload]);
  const visibleDifferences = useMemo(() => filterDifferences(allDifferences, kinds), [allDifferences, kinds]);
  const activeDifference = useMemo(
    () => allDifferences.find((difference) => difference.id === activeId),
    [allDifferences, activeId]
  );
  const activeMapping = useMemo(
    () => (activeDifference ? findMappingForDifference(mapping?.mappings ?? [], activeDifference) : undefined),
    [mapping, activeDifference]
  );

  const awaitingStage = useMemo(() => stages.find((stage) => stage.status === 'awaiting_confirmation'), [stages]);
  const needsReviewStage = useMemo(() => stages.find((stage) => stage.status === 'needs_review'), [stages]);
  const bannerStage = awaitingStage ?? needsReviewStage;
  const bannerArtifact = useMemo(() => {
    if (!bannerStage) return undefined;
    if (bannerStage.currentArtifactId) {
      const current = artifacts.find((artifact) => artifact.id === bannerStage.currentArtifactId);
      if (current) return current;
    }
    return [...artifacts]
      .filter((artifact) => artifact.stageId === bannerStage.id)
      .toSorted((a, b) => b.revision - a.revision)[0];
  }, [artifacts, bannerStage]);
  const runningStage = useMemo(
    () => stages.find((stage) => stage.status === 'running') ?? bannerStage,
    [stages, bannerStage]
  );

  const delivered = pkg.status === 'delivered';
  const reportVersion = useMemo(() => reportVersionOf(versions), [versions]);
  const reportDocument = reportVersion?.deliverable.document;

  const scopeNote = useMemo(
    () =>
      task.goal ||
      workspace.incomingRelations.find((relation) => relation.type === 'compared')?.scopeNote ||
      pkg.pendingRelations?.find((relation) => relation.type === 'compared')?.scopeNote,
    [task.goal, workspace.incomingRelations, pkg.pendingRelations]
  );

  const revisionOptions = useMemo(
    () => (snapshot ? buildRevisionBaseOptions(snapshot, pkg.projectId) : []),
    [snapshot, pkg.projectId]
  );

  const submitDisabledReason = useMemo(() => {
    if (delivered) return t('evidossierReview.shared.submitDisabledDelivered');
    if (!reportArtifact) return t('evidossierReview.shared.submitDisabledNoReport');
    if (reportArtifact.status !== 'confirmed') return t('evidossierReview.shared.submitDisabledUnconfirmed');
    return undefined;
  }, [delivered, reportArtifact, t]);

  const transferBlockedReason = useMemo(() => {
    if (!reportVersion) return t('evidossierReview.compare.differences.blockedNoReport');
    if (selectedIds.length === 0) return t('evidossierReview.compare.differences.blockedNone');
    return undefined;
  }, [reportVersion, selectedIds.length, t]);

  useEffect(() => {
    if (activeId) return;
    const first = visibleDifferences[0];
    if (first) setActiveId(first.id);
  }, [visibleDifferences, activeId]);

  const highlightBase = useMemo(() => {
    const map: Record<string, BlockHighlight> = {};
    if (!baselineDoc) return map;
    for (const difference of visibleDifferences) {
      const location = difference.baseLocation;
      if (location && location.documentId === baselineDoc.id) map[location.blockId] = 'target';
    }
    return map;
  }, [visibleDifferences, baselineDoc]);

  const highlightTarget = useMemo(() => {
    const map: Record<string, BlockHighlight> = {};
    if (!targetDoc) return map;
    for (const difference of visibleDifferences) {
      const location = difference.targetLocation;
      if (location && location.documentId === targetDoc.id) map[location.blockId] = 'added';
    }
    return map;
  }, [visibleDifferences, targetDoc]);

  const selectDifference = useCallback(
    (difference: ComparisonDifference) => {
      setActiveId(difference.id);
      setBaseBlockId(difference.baseLocation?.blockId);
      setTargetBlockId(difference.targetLocation?.blockId);
      setRightTab('detail');
      if (narrow) {
        setLeftOpen(false);
        setRightOpen(true);
      }
    },
    [narrow]
  );

  const handleBaseBlockClick = useCallback(
    (blockId: string) => {
      const matched =
        differenceAtBaseBlock(visibleDifferences, blockId) ?? differenceAtBaseBlock(allDifferences, blockId);
      if (matched) selectDifference(matched);
    },
    [visibleDifferences, allDifferences, selectDifference]
  );

  const handleTargetBlockClick = useCallback(
    (blockId: string) => {
      const matched =
        differenceAtTargetBlock(visibleDifferences, blockId) ?? differenceAtTargetBlock(allDifferences, blockId);
      if (matched) selectDifference(matched);
    },
    [visibleDifferences, allDifferences, selectDifference]
  );

  const toggleKind = useCallback((kind: ComparisonDifference['kind']) => {
    setKinds((prev) => (prev.includes(kind) ? prev.filter((item) => item !== kind) : [...prev, kind]));
  }, []);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }, []);

  const toggleAll = useCallback(
    (checked: boolean) => {
      setSelectedIds(checked ? visibleDifferences.map((difference) => difference.id) : []);
    },
    [visibleDifferences]
  );

  const focusArtifact = useCallback(
    (artifactId?: string) => {
      if (!artifactId) return;
      const artifact = artifacts.find((item) => item.id === artifactId);
      if (!artifact) return;
      if (artifact.kind === 'differences') {
        if (narrow) {
          setRightOpen(false);
          setLeftOpen(true);
        }
        return;
      }
      setRightTab(artifact.kind === 'mapping' ? 'mapping' : 'report');
      if (narrow) {
        setLeftOpen(false);
        setRightOpen(true);
      }
    },
    [artifacts, narrow]
  );

  const confirmStage = useCallback(async () => {
    if (!bannerArtifact) return;
    setConfirming(true);
    const ok = await actions.confirmArtifact(pkg.id, bannerArtifact.id);
    setConfirming(false);
    if (ok) Message.success(t('evidossierReview.shared.awaitingConfirmed'));
  }, [actions, bannerArtifact, pkg.id, t]);

  const submitReport = useCallback(async () => {
    setSubmitting(true);
    const version = await actions.submitVersion({
      packageId: pkg.id,
      changeNote: t('evidossierReview.compare.report.changeNote'),
      unfinishedNote: unfinishedNote.trim() || undefined,
    });
    setSubmitting(false);
    if (version) {
      setSubmitOpen(false);
      setUnfinishedNote('');
      Message.success(t('evidossierReview.shared.submitSuccess', { label: version.label }));
    }
  }, [actions, pkg.id, unfinishedNote, t]);

  const openReportVersion = useCallback(() => {
    if (!reportVersion) return;
    navigate(`/evidossier/packages/${pkg.id}/versions/${reportVersion.id}`);
  }, [navigate, pkg.id, reportVersion]);

  const openTransfer = useCallback(() => {
    const fallbackBase =
      revisionOptions.find((option) => option.value === target?.version?.id)?.value ?? revisionOptions[0]?.value;
    setTransferBaseVersionId(fallbackBase);
    setTransferTitle(t('evidossierReview.compare.transfer.titleDefault', { code: pkg.code }));
    setTransferScope('');
    setTransferError(undefined);
    setTransferOpen(true);
  }, [revisionOptions, target, pkg.code, t]);

  const submitTransfer = useCallback(async () => {
    if (!reportVersion) return;
    if (!transferTitle.trim()) {
      setTransferError(t('evidossierReview.compare.transfer.titleRequired'));
      return;
    }
    if (!transferScope.trim()) {
      setTransferError(t('evidossierReview.compare.transfer.scopeRequired'));
      return;
    }
    if (!transferBaseVersionId) return;
    setTransferSubmitting(true);
    const created = await actions.startRevisionFromDifferences({
      projectId: pkg.projectId,
      comparisonPackageId: pkg.id,
      comparisonVersionId: reportVersion.id,
      baseVersionId: transferBaseVersionId,
      differenceIds: selectedIds,
      title: transferTitle.trim(),
      scopeNote: transferScope.trim(),
    });
    setTransferSubmitting(false);
    if (created) {
      setTransferOpen(false);
      Message.success(t('evidossierReview.compare.transfer.success', { label: created.code }));
      navigate(`/evidossier/packages/${created.id}`);
    } else {
      setTransferError(t('evidossierReview.compare.transfer.failed'));
    }
  }, [
    actions,
    pkg.id,
    pkg.projectId,
    reportVersion,
    selectedIds,
    transferBaseVersionId,
    transferScope,
    transferTitle,
    t,
    navigate,
  ]);

  if (!snapshot) return <LoadingBlock />;

  const selectedCodes = selectedIds
    .map((id) => allDifferences.find((difference) => difference.id === id)?.code)
    .filter((code): code is string => Boolean(code));
  const kindCounts = differenceKindCounts(allDifferences);
  const unresolvedCount = allDifferences.filter(
    (difference) => difference.kind === 'uncertain' || difference.confidence === 'uncertain'
  ).length;
  const zeroDifferences = Boolean(differencesArtifact) && allDifferences.length === 0;

  const differencesFooter = (
    <>
      <div className='evd-row evd-row--between'>
        <span className='evd-caption'>
          {t('evidossierReview.compare.differences.selectedCount', { count: selectedIds.length })}
        </span>
        {transferBlockedReason ? (
          <Tooltip content={transferBlockedReason} getPopupContainer={getPopupMount}>
            <span>
              <Button size='small' type='primary' disabled>
                {t('evidossierReview.compare.differences.createRevision')}
              </Button>
            </span>
          </Tooltip>
        ) : (
          <Button size='small' type='primary' onClick={openTransfer}>
            {t('evidossierReview.compare.differences.createRevision')}
          </Button>
        )}
      </div>
      <p className='evd-caption'>{transferBlockedReason ?? t('evidossierReview.compare.differences.footerHint')}</p>
    </>
  );

  const differencesPane = (
    <DifferencesPane
      differences={visibleDifferences}
      totalCount={allDifferences.length}
      hasArtifact={Boolean(differencesArtifact)}
      kinds={kinds}
      onToggleKind={toggleKind}
      differencesPayload={differencesPayload}
      report={report}
      stage={runningStage}
      selectedIds={selectedIds}
      activeId={activeId}
      onToggleSelected={toggleSelected}
      onToggleAll={toggleAll}
      onActivate={selectDifference}
      footer={differencesFooter}
    />
  );

  const rightTabs = (
    <TabStrip
      items={[
        { key: 'detail', label: t('evidossierReview.compare.tabs.detail') },
        { key: 'mapping', label: t('evidossierReview.compare.tabs.mapping'), count: mapping?.mappings.length },
        { key: 'report', label: t('evidossierReview.compare.tabs.report') },
      ]}
      value={rightTab}
      onChange={(key) => setRightTab(key === 'mapping' ? 'mapping' : key === 'report' ? 'report' : 'detail')}
      ariaLabel={t('evidossierReview.compare.workbench.openDetail')}
    />
  );

  const detailPane = (
    <DifferenceDetailPane
      difference={activeDifference}
      mapping={activeMapping}
      onLocateBase={() => {
        if (activeDifference?.baseLocation?.blockId) setBaseBlockId(activeDifference.baseLocation.blockId);
      }}
      onLocateTarget={() => {
        if (activeDifference?.targetLocation?.blockId) setTargetBlockId(activeDifference.targetLocation.blockId);
      }}
    />
  );

  const mappingPane = <MappingPane payload={mapping} stage={runningStage} />;

  const reportPane = (
    <CompareReportPane
      payload={report}
      artifactHistory={[...artifacts]
        .filter((artifact) => compareArtifactKinds.includes(artifact.kind))
        .toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt))}
      reportVersion={reportVersion}
      delivered={delivered}
      onViewFull={() => setReportOpen(true)}
      onOpenVersion={openReportVersion}
    />
  );

  const renderDocPane = (
    input: CompareInput | undefined,
    role: 'baseline' | 'target',
    document: typeof baselineDoc,
    highlight: Record<string, BlockHighlight>,
    activeBlock: string | undefined,
    onBlockClick: (blockId: string) => void
  ) => {
    const state = role === 'baseline' ? baselineState : targetState;
    const roleLabel = t(`evidossierCommon.comparisonRole.${role}`);
    const pkgTitle = input?.version ? getPackage(snapshot, input.version.packageId)?.title : undefined;
    return (
      <div className='evd-cmp-docpane'>
        <div className='evd-cmp-docpane__head'>
          <div className='evd-cmp-docpane__title'>
            <ToneTag tone={role === 'baseline' ? 'blue' : 'green'}>{roleLabel}</ToneTag>
            {input?.version ? (
              <>
                <span className='evd-caption'>{input.version.label}</span>
                <span className='evd-caption evd-truncate'>{pkgTitle ?? document?.title ?? ''}</span>
              </>
            ) : (
              <span className='evd-caption'>
                {t(
                  role === 'baseline'
                    ? 'evidossierReview.compare.workbench.baselineUnavailable'
                    : 'evidossierReview.compare.workbench.targetUnavailable'
                )}
              </span>
            )}
          </div>
          <div className='evd-cmp-docpane__meta'>
            {input?.version ? (
              <span className='evd-caption'>
                {t('evidossierReview.compare.workbench.submittedAt', { date: formatDateTime(input.version.createdAt) })}
              </span>
            ) : null}
            {input?.version ? (
              <Button
                size='mini'
                type='text'
                icon={<IconExternal size={12} />}
                onClick={() =>
                  navigate(`/evidossier/packages/${input.version?.packageId}/versions/${input.version?.id}`)
                }
              >
                {t('evidossierReview.compare.workbench.openVersion')}
              </Button>
            ) : null}
          </div>
        </div>
        <div className='evd-cmp-docpane__body'>
          {document ? (
            <DocumentView
              document={document}
              activeBlockId={activeBlock}
              highlight={highlight}
              onBlockClick={onBlockClick}
            />
          ) : (
            <div className='evd-cmp-docpane__empty'>
              <EmptyState
                title={
                  state === 'document_missing'
                    ? t('evidossierReview.compare.docs.unreadableTitle')
                    : t('evidossierReview.compare.docs.unavailableTitle')
                }
                text={
                  state === 'document_missing'
                    ? t('evidossierReview.compare.docs.unreadableText')
                    : t('evidossierReview.compare.docs.unavailableText')
                }
                center
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className='evd-cmp' ref={rootRef}>
      <header className='evd-cmp__top'>
        <div className='evd-cmp__top-main'>
          <div className='evd-cmp__inputs'>
            <div className='evd-cmp__input'>
              <div className='evd-cmp__input-role'>
                <ToneTag tone='blue'>{t('evidossierCommon.comparisonRole.baseline')}</ToneTag>
              </div>
              <div className='evd-cmp__input-body'>
                {baseline?.version ? (
                  <>
                    <span className='evd-cmp__input-title'>
                      {getPackage(snapshot, baseline.version.packageId)?.code} ·{' '}
                      {getPackage(snapshot, baseline.version.packageId)?.title}
                    </span>
                    <span className='evd-caption'>
                      {baseline.version.label} · {baseline.version.deliverable.title}
                    </span>
                  </>
                ) : (
                  <span className='evd-caption'>{t('evidossierReview.compare.workbench.baselineUnavailable')}</span>
                )}
              </div>
            </div>
            <span className='evd-cmp__arrow' aria-hidden>
              <IconArrowRight size={16} />
            </span>
            <div className='evd-cmp__input'>
              <div className='evd-cmp__input-role'>
                <ToneTag tone='green'>{t('evidossierCommon.comparisonRole.target')}</ToneTag>
              </div>
              <div className='evd-cmp__input-body'>
                {target?.version ? (
                  <>
                    <span className='evd-cmp__input-title'>
                      {getPackage(snapshot, target.version.packageId)?.code} ·{' '}
                      {getPackage(snapshot, target.version.packageId)?.title}
                    </span>
                    <span className='evd-caption'>
                      {target.version.label} · {target.version.deliverable.title}
                    </span>
                  </>
                ) : (
                  <span className='evd-caption'>{t('evidossierReview.compare.workbench.targetUnavailable')}</span>
                )}
              </div>
            </div>
            {additionalInputs.map((input) => (
              <div className='evd-cmp__input' key={input.versionId}>
                <div className='evd-cmp__input-role'>
                  <ToneTag tone='neutral'>{t('evidossierCommon.comparisonRole.additional')}</ToneTag>
                </div>
                <div className='evd-cmp__input-body'>
                  <span className='evd-caption'>{input.version?.label ?? input.versionId}</span>
                </div>
              </div>
            ))}
          </div>
          <div className='evd-cmp__metaline'>
            <span className='evd-caption'>
              {t('evidossierReview.compare.workbench.scopeLabel')}:{' '}
              {scopeNote || t('evidossierReview.compare.workbench.scopeMissing')}
            </span>
            <span className='evd-caption'>{t('evidossierReview.compare.workbench.changeNotDefect')}</span>
          </div>
          <div className='evd-cmp__stages' aria-label={t('evidossierReview.compare.workbench.stagesLabel')}>
            {stages.map((stage) => (
              <span
                key={stage.id}
                className={
                  stage.status === 'running' || stage.status === 'awaiting_confirmation'
                    ? 'evd-cmp__stage evd-cmp__stage--current'
                    : 'evd-cmp__stage'
                }
              >
                <span className='evd-cmp__stage-index' aria-hidden>
                  {stage.order}
                </span>
                <span className='evd-cmp__stage-name'>{t(stage.titleKey)}</span>
                <StatusTag kind='stage' value={stage.status} />
              </span>
            ))}
          </div>
        </div>
        <div className='evd-cmp__actions'>
          {narrow ? (
            <>
              <Button size='small' icon={<IconList size={14} />} onClick={() => setLeftOpen(true)}>
                {t('evidossierReview.compare.workbench.openList')}
              </Button>
              <Button size='small' icon={<IconSidebar size={14} />} onClick={() => setRightOpen(true)}>
                {t('evidossierReview.compare.workbench.openDetail')}
              </Button>
            </>
          ) : null}
          {delivered ? (
            reportVersion ? (
              <Button size='small' icon={<IconExternal size={14} />} onClick={openReportVersion}>
                {t('evidossierReview.compare.report.openVersion')}
              </Button>
            ) : (
              <ToneTag tone='green'>{t('evidossierReview.compare.workbench.comparisonEnded')}</ToneTag>
            )
          ) : submitDisabledReason ? (
            <Tooltip content={submitDisabledReason} getPopupContainer={getPopupMount}>
              <span>
                <Button size='small' type='primary' disabled>
                  {t('evidossierReview.shared.submit')}
                </Button>
              </span>
            </Tooltip>
          ) : (
            <Button size='small' type='primary' onClick={() => setSubmitOpen(true)}>
              {t('evidossierReview.shared.submit')}
            </Button>
          )}
        </div>
      </header>

      {delivered ? (
        <div className='evd-cmp__notify'>
          <Banner
            tone='success'
            title={t('evidossierReview.shared.deliveredTitle', { label: reportVersion?.label ?? pkg.code })}
            actions={
              reportVersion ? (
                <Button size='small' onClick={openReportVersion}>
                  {t('evidossierReview.compare.report.openVersion')}
                </Button>
              ) : undefined
            }
          >
            {t('evidossierReview.compare.workbench.comparisonEndedText')}
          </Banner>
        </div>
      ) : null}

      {!delivered && !baseline?.version ? (
        <div className='evd-cmp__notify'>
          <Banner tone='warning' title={t('evidossierReview.compare.workbench.noInputsTitle')}>
            {t('evidossierReview.compare.workbench.noInputsText')}
          </Banner>
        </div>
      ) : null}

      {bannerStage ? (
        <div className='evd-cmp__notify'>
          {awaitingStage ? (
            <Banner
              tone='warning'
              title={t('evidossierReview.shared.awaitingTitle', { stage: t(bannerStage.titleKey) })}
              actions={
                <>
                  <Button size='small' onClick={() => focusArtifact(bannerArtifact?.id)} disabled={!bannerArtifact}>
                    {t('evidossierReview.shared.awaitingView')}
                  </Button>
                  <Popconfirm
                    title={t('evidossierReview.shared.awaitingConfirmTitle')}
                    content={t('evidossierReview.shared.awaitingConfirmHelp')}
                    okText={t('evidossierReview.shared.awaitingConfirm')}
                    cancelText={t('evidossierReview.shared.cancel')}
                    onOk={() => void confirmStage()}
                    disabled={!bannerArtifact}
                    getPopupContainer={getPopupMount}
                  >
                    <Button size='small' type='primary' loading={confirming} disabled={!bannerArtifact}>
                      {t('evidossierReview.shared.awaitingConfirm')}
                    </Button>
                  </Popconfirm>
                </>
              }
            >
              {bannerArtifact
                ? t('evidossierReview.shared.awaitingSummary', { summary: bannerArtifact.summary })
                : t('evidossierReview.shared.awaitingNoArtifact')}
            </Banner>
          ) : (
            <Banner
              tone='warning'
              title={t('evidossierReview.shared.needsReviewTitle', { stage: t(bannerStage.titleKey) })}
              actions={
                <Button size='small' onClick={() => focusArtifact(bannerArtifact?.id)} disabled={!bannerArtifact}>
                  {t('evidossierReview.shared.awaitingView')}
                </Button>
              }
            >
              {t('evidossierReview.shared.needsReviewHelp')}
            </Banner>
          )}
        </div>
      ) : null}

      {execution && execution.status !== 'completed' && execution.status !== 'idle' ? (
        <div className='evd-cmp__exec'>
          <StatusTag kind='execution' value={execution.status} dot />
          <span className='evd-caption evd-cmp__exec-activity'>{execution.activity}</span>
          {execution.pausedNote ? (
            <span className='evd-caption'>
              {t('evidossierReview.shared.executionPaused', { note: execution.pausedNote })}
            </span>
          ) : null}
          {execution.failure ? (
            <span className='evd-caption evd-cmp__exec-failure'>
              {t('evidossierReview.shared.executionFailed', { note: execution.failure.reason })}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className='evd-cmp__body'>
        {!narrow ? (
          <aside className='evd-cmp__left'>
            <div className='evd-cmp__lefthead'>
              <span className='evd-h4'>{t('evidossierReview.compare.tabs.differences')}</span>
              <span className='evd-caption'>
                {t('evidossierReview.compare.filters.count', { count: allDifferences.length })}
              </span>
            </div>
            {differencesPane}
          </aside>
        ) : null}

        <section className='evd-cmp__center'>
          <div className='evd-cmp__docstrip'>
            <span className='evd-caption'>
              {activeDifference
                ? t('evidossierReview.compare.docs.activeHint', { code: activeDifference.code })
                : t('evidossierReview.compare.docs.noActive')}
            </span>
            {activeDifference ? (
              <span className='evd-cmp__docstrip-tags'>
                <StatusTag kind='diff' value={activeDifference.kind} />
                <StatusTag kind='mapping' value={activeDifference.confidence} />
              </span>
            ) : null}
            <span className='evd-caption evd-cmp__docstrip-note'>
              {t('evidossierReview.compare.differences.uncertainNote')}
            </span>
          </div>

          {zeroDifferences ? (
            <div className='evd-cmp__bannerwrap'>
              <Banner tone='info' title={t('evidossierReview.compare.differences.zeroTitle')}>
                {t('evidossierReview.compare.differences.zeroText')}
                {differencesPayload?.scopeNote ? (
                  <span className='evd-cmp__block-caption'>
                    {t('evidossierReview.compare.differences.zeroScope', { scope: differencesPayload.scopeNote })}
                  </span>
                ) : null}
              </Banner>
            </div>
          ) : null}

          <div className='evd-cmp__docs'>
            {renderDocPane(baseline, 'baseline', baselineDoc, highlightBase, baseBlockId, handleBaseBlockClick)}
            {renderDocPane(target, 'target', targetDoc, highlightTarget, targetBlockId, handleTargetBlockClick)}
          </div>
        </section>

        {!narrow ? (
          <aside className='evd-cmp__right'>
            {rightTabs}
            <div className='evd-cmp__right-body'>
              {rightTab === 'detail' ? detailPane : rightTab === 'mapping' ? mappingPane : reportPane}
            </div>
          </aside>
        ) : null}
      </div>

      <Drawer
        visible={leftOpen}
        getPopupContainer={getPopupMount}
        placement='left'
        width={360}
        footer={null}
        bodyStyle={{ padding: 0 }}
        onCancel={() => setLeftOpen(false)}
        title={t('evidossierReview.compare.workbench.openList')}
      >
        <div className='evd-cmp__drawer'>{differencesPane}</div>
      </Drawer>

      <Drawer
        visible={rightOpen}
        getPopupContainer={getPopupMount}
        placement='right'
        width={400}
        footer={null}
        bodyStyle={{ padding: 0 }}
        onCancel={() => setRightOpen(false)}
        title={t('evidossierReview.compare.workbench.openDetail')}
      >
        <div className='evd-cmp__drawer'>
          {rightTabs}
          <div className='evd-cmp__right-body'>
            {rightTab === 'detail' ? detailPane : rightTab === 'mapping' ? mappingPane : reportPane}
          </div>
        </div>
      </Drawer>

      <Modal
        title={t('evidossierReview.shared.submit')}
        visible={submitOpen}
        getPopupContainer={getPopupMount}
        onCancel={() => setSubmitOpen(false)}
        onOk={() => void submitReport()}
        confirmLoading={submitting}
        okText={t('evidossierReview.shared.submitOk')}
        cancelText={t('evidossierReview.shared.cancel')}
        style={{ width: 680 }}
      >
        <p className='evd-body'>{t('evidossierReview.shared.submitModalIntro')}</p>
        <div className='evd-cmp__modalblock'>
          <MetaList
            items={[
              {
                label: t('evidossierReview.compare.transfer.comparedVersions'),
                value: `${baseline?.version?.label ?? '—'} → ${target?.version?.label ?? '—'}`,
              },
              {
                label: t('evidossierReview.compare.workbench.scopeLabel'),
                value: scopeNote || t('evidossierReview.compare.workbench.scopeMissing'),
              },
              {
                label: t('evidossierReview.compare.report.submitStats'),
                value: t('evidossierReview.compare.filters.count', { count: allDifferences.length }),
              },
              { label: t('evidossierReview.compare.report.submitUncertain'), value: String(unresolvedCount) },
            ]}
          />
        </div>
        <div className='evd-cmp__modalblock'>
          <p className='evd-label'>{t('evidossierReview.compare.report.differenceStats')}</p>
          <Stats
            items={DIFFERENCE_STAT_KEYS.map((key) => ({
              label: t(`evidossierCommon.status.diff.${key}`),
              value: report?.differenceStats[key] ?? kindCounts[key],
            }))}
          />
        </div>
        <div className='evd-cmp__modalblock'>
          <p className='evd-label'>{t('evidossierReview.compare.report.limitations')}</p>
          <ul className='evd-cmp__bullets'>
            {(report?.limitations ?? []).map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
        <div className='evd-cmp__modalblock'>
          <p className='evd-label'>{t('evidossierReview.shared.submitUnfinished')}</p>
          <Input.TextArea
            value={unfinishedNote}
            onChange={setUnfinishedNote}
            placeholder={t('evidossierReview.shared.submitUnfinishedPlaceholder')}
            autoSize={{ minRows: 2, maxRows: 4 }}
          />
        </div>
      </Modal>

      <Modal
        title={t('evidossierReview.compare.transfer.title')}
        visible={transferOpen}
        getPopupContainer={getPopupMount}
        onCancel={() => setTransferOpen(false)}
        onOk={() => void submitTransfer()}
        confirmLoading={transferSubmitting}
        okText={t('evidossierReview.compare.transfer.confirm')}
        cancelText={t('evidossierReview.shared.cancel')}
        style={{ width: 660 }}
      >
        <p className='evd-body'>{t('evidossierReview.compare.transfer.intro')}</p>
        <div className='evd-cmp__modalblock'>
          <MetaList
            items={[
              {
                label: t('evidossierReview.compare.transfer.comparedVersions'),
                value: `${baseline?.version?.label ?? '—'} → ${target?.version?.label ?? '—'}`,
              },
              { label: t('evidossierReview.compare.transfer.reportVersion'), value: reportVersion?.label ?? '—' },
              {
                label: t('evidossierReview.compare.transfer.selectedCount', { count: selectedIds.length }),
                value: selectedCodes.join(', '),
              },
            ]}
          />
        </div>
        <div className='evd-cmp__modalblock'>
          <p className='evd-label'>{t('evidossierReview.compare.transfer.baseVersion')}</p>
          <Select
            getPopupContainer={getPopupMount}
            value={transferBaseVersionId}
            onChange={(value) => setTransferBaseVersionId(typeof value === 'string' ? value : undefined)}
            options={revisionOptions}
            style={{ width: '100%' }}
            placeholder={t('evidossierReview.compare.transfer.baseVersion')}
          />
          <p className='evd-caption evd-mt-8'>{t('evidossierReview.compare.transfer.baseVersionHelp')}</p>
        </div>
        <div className='evd-cmp__modalblock'>
          <p className='evd-label'>{t('evidossierReview.compare.transfer.titleLabel')}</p>
          <Input value={transferTitle} onChange={setTransferTitle} />
        </div>
        <div className='evd-cmp__modalblock'>
          <p className='evd-label'>{t('evidossierReview.compare.transfer.scopeLabel')}</p>
          <Input.TextArea
            value={transferScope}
            onChange={setTransferScope}
            placeholder={t('evidossierReview.compare.transfer.scopePlaceholder')}
            autoSize={{ minRows: 3, maxRows: 6 }}
          />
        </div>
        {transferError ? (
          <Banner tone='error' className='evd-mt-8'>
            {transferError}
          </Banner>
        ) : null}
        <p className='evd-caption evd-mt-8'>{t('evidossierReview.compare.transfer.cancelNoRelation')}</p>
      </Modal>

      <Modal
        title={t('evidossierReview.compare.report.fullTitle')}
        visible={reportOpen}
        getPopupContainer={getPopupMount}
        onCancel={() => setReportOpen(false)}
        footer={
          <div className='evd-row' style={{ justifyContent: 'flex-end', gap: 8 }}>
            {reportVersion ? (
              <Button
                onClick={() => {
                  setReportOpen(false);
                  openReportVersion();
                }}
              >
                {t('evidossierReview.compare.report.openVersion')}
              </Button>
            ) : null}
            <Button type='primary' onClick={() => setReportOpen(false)}>
              {t('evidossierReview.shared.close')}
            </Button>
          </div>
        }
        style={{ width: 900 }}
      >
        {reportDocument ? (
          <div className='evd-cmp__reportmodal'>
            <DocumentView document={reportDocument} />
          </div>
        ) : (
          <div className='evd-cmp__pane-pad'>
            <p className='evd-caption'>{t('evidossierReview.compare.report.fullFallback')}</p>
            {report ? <p className='evd-body evd-mt-8'>{report.summary}</p> : null}
            {report ? (
              <ul className='evd-cmp__bullets evd-mt-8'>
                {report.limitations.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CompareWorkbench;
