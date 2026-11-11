/**
 * Independent review workbench (task kind `review`).
 *
 * Layout: a compact target/stage bar, a coverage + findings list, the reviewed
 * document reader and an evidence/report context panel. All review content is
 * read-only stage output from the simulated execution; the only state-changing
 * actions are confirming the current candidate result, submitting the report as
 * a formal version and starting a bounded revision task from selected findings.
 */
import { Button, Drawer, Input, Message, Modal, Popconfirm, Tooltip } from '@arco-design/web-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DocumentView, type BlockHighlight } from '../../components/DocumentView';
import { useEvidossier } from '../../data/EvidossierProvider';
import { getReviewTargetInfo } from '../../data/selectors';
import type { FindingSeverity, FindingStatus, PackageWorkspace, ReviewFinding } from '../../domain/types';
import {
  Banner,
  EmptyState,
  LoadingBlock,
  MetaList,
  Stats,
  StatusTag,
  TabStrip,
  ToneTag,
  cx,
  formatDateTime,
  useEvidT,
} from '../../design/primitives';
import { IconExternal, IconList, IconSidebar } from '../../design/icons';
import { BasisPane, CoveragePane, DetailPane, FindingsPane, ReportPane } from './ReviewPanels';
import {
  activeStageOf,
  artifactForStage,
  artifactHistoryOf,
  buildReviewBasis,
  coverageCounts,
  coveragePayloadOf,
  describeReviewTarget,
  filterFindings,
  findLatestArtifact,
  findMaterialDocument,
  findingSeverityCounts,
  findingsPayloadOf,
  reportVersionOf,
  reviewReportPayloadOf,
  sortFindings,
  type ReviewTargetStateKind,
} from './reviewHelpers';
import './ReviewWorkbench.css';

const TARGET_REASON: Record<Exclude<ReviewTargetStateKind, 'ok'>, { titleKey: string; textKey: string }> = {
  missing_target: {
    titleKey: 'evidossierReview.review.workbench.missingTarget',
    textKey: 'evidossierReview.review.workbench.missingTargetText',
  },
  source_unavailable: {
    titleKey: 'evidossierReview.review.workbench.sourceUnavailable',
    textKey: 'evidossierReview.review.workbench.sourceUnavailableText',
  },
  document_unreadable: {
    titleKey: 'evidossierReview.review.workbench.documentUnreadable',
    textKey: 'evidossierReview.review.workbench.documentUnreadableText',
  },
  parse_failed: {
    titleKey: 'evidossierReview.review.workbench.parseFailed',
    textKey: 'evidossierReview.review.workbench.parseFailedText',
  },
  pending_parse: {
    titleKey: 'evidossierReview.review.workbench.pendingParse',
    textKey: 'evidossierReview.review.workbench.pendingParseText',
  },
  partial_parse: {
    titleKey: 'evidossierReview.review.workbench.partialParse',
    textKey: 'evidossierReview.review.workbench.partialParseText',
  },
};

const REVIEW_ARTIFACT_KINDS = ['coverage_plan', 'findings', 'review_report'] as const;

/** Keep Arco portals inside `.evd-root` so Carbon tokens and overrides apply. */
const getPopupMount = (): Element =>
  (typeof document === 'undefined' ? null : document.querySelector('.evd-root')) ?? document.body;

const ReviewWorkbench: React.FC<{ workspace: PackageWorkspace }> = ({ workspace }) => {
  const t = useEvidT();
  const navigate = useNavigate();
  const { snapshot, actions } = useEvidossier();
  const { pkg, project, task, stages, artifacts, versions, materials, execution } = workspace;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const [narrow, setNarrow] = useState(false);
  const [leftTab, setLeftTab] = useState<'coverage' | 'findings'>('coverage');
  const [rightTab, setRightTab] = useState<'detail' | 'basis' | 'report'>('detail');
  const [severity, setSeverity] = useState<'all' | FindingSeverity>('all');
  const [status, setStatus] = useState<'all' | FindingStatus>('all');
  const [keyword, setKeyword] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeFindingId, setActiveFindingId] = useState<string>();
  const [activeBlockId, setActiveBlockId] = useState<string>();
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [basisOpen, setBasisOpen] = useState(false);
  const [unfinishedNote, setUnfinishedNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const element = rootRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setNarrow(width > 0 && width < 960);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const targetInfo = useMemo(() => (snapshot ? getReviewTargetInfo(snapshot, pkg) : undefined), [snapshot, pkg]);
  const targetState = useMemo(() => describeReviewTarget(pkg, targetInfo), [pkg, targetInfo]);
  const document = targetState.document;

  const coverageArtifact = useMemo(() => findLatestArtifact(artifacts, 'coverage_plan'), [artifacts]);
  const findingsArtifact = useMemo(() => findLatestArtifact(artifacts, 'findings'), [artifacts]);
  const reportArtifact = useMemo(() => findLatestArtifact(artifacts, 'review_report'), [artifacts]);
  const coverage = useMemo(() => coveragePayloadOf(coverageArtifact), [coverageArtifact]);
  const findingsPayload = useMemo(() => findingsPayloadOf(findingsArtifact), [findingsArtifact]);
  const report = useMemo(() => reviewReportPayloadOf(reportArtifact), [reportArtifact]);

  const allFindings = useMemo(() => sortFindings(findingsPayload?.findings ?? []), [findingsPayload]);
  const findingsById = useMemo(() => new Map(allFindings.map((finding) => [finding.id, finding])), [allFindings]);
  const visibleFindings = useMemo(
    () => filterFindings(allFindings, severity, status, keyword),
    [allFindings, severity, status, keyword]
  );
  const counts = useMemo(() => coverageCounts(coverage), [coverage]);

  const awaitingStage = useMemo(() => stages.find((stage) => stage.status === 'awaiting_confirmation'), [stages]);
  const needsReviewStage = useMemo(() => stages.find((stage) => stage.status === 'needs_review'), [stages]);
  const bannerStage = awaitingStage ?? needsReviewStage;
  const bannerArtifact = useMemo(
    () => (bannerStage ? artifactForStage(artifacts, bannerStage) : undefined),
    [artifacts, bannerStage]
  );
  const runningStage = useMemo(() => activeStageOf(stages), [stages]);

  const delivered = pkg.status === 'delivered';
  const reportVersion = useMemo(() => reportVersionOf(versions, 'review_report'), [versions]);
  const reportDocument = reportVersion?.deliverable.document;

  const scopeNote = useMemo(
    () =>
      workspace.incomingRelations.find((relation) => relation.type === 'reviewed')?.scopeNote ??
      pkg.pendingRelations?.find((relation) => relation.type === 'reviewed')?.scopeNote ??
      coverage?.scopeNote,
    [workspace.incomingRelations, pkg.pendingRelations, coverage]
  );

  const basisEntries = useMemo(
    () =>
      snapshot
        ? buildReviewBasis(
            snapshot,
            artifacts,
            materials,
            pkg.reviewTarget?.kind === 'material_version' ? pkg.reviewTarget.materialId : undefined
          )
        : [],
    [snapshot, artifacts, materials, pkg.reviewTarget]
  );
  const unreadableBasis = useMemo(() => basisEntries.filter((entry) => !entry.readable), [basisEntries]);

  const activeFinding = useMemo(
    () => allFindings.find((finding) => finding.id === activeFindingId) ?? allFindings[0],
    [allFindings, activeFindingId]
  );
  const activeCoverageTitle = useMemo(
    () => coverage?.items.find((item) => item.id === activeFinding?.coverageItemId)?.title,
    [coverage, activeFinding]
  );

  const basisPreview = useMemo(() => {
    const location = activeFinding?.basisLocation;
    if (!location) return undefined;
    if (document && location.documentId === document.id) {
      return { title: targetState.label || document.title, document, blockId: location.blockId };
    }
    if (!snapshot) return undefined;
    const found = findMaterialDocument(snapshot, location.documentId);
    if (!found) return undefined;
    return {
      title: found.material.name,
      document: found.document,
      blockId: location.blockId,
      version: found.version.version,
    };
  }, [activeFinding, document, snapshot, targetState.label]);

  const highlight = useMemo(() => {
    const map: Record<string, BlockHighlight> = {};
    if (!document) return map;
    for (const finding of allFindings) {
      const location = finding.location;
      if (location && location.documentId === document.id) map[location.blockId] = 'target';
    }
    return map;
  }, [allFindings, document]);

  const submitDisabledReason = useMemo(() => {
    if (delivered) return t('evidossierReview.shared.submitDisabledDelivered');
    if (!reportArtifact) return t('evidossierReview.shared.submitDisabledNoReport');
    if (reportArtifact.status !== 'confirmed') return t('evidossierReview.shared.submitDisabledUnconfirmed');
    return undefined;
  }, [delivered, reportArtifact, t]);

  const reportTargetVersionId = targetState.packageVersion?.id;
  const transferBlockedReason = useMemo(() => {
    if (pkg.reviewTarget?.kind !== 'package_version') return t('evidossierReview.review.findings.blockedMaterial');
    if (!reportTargetVersionId) return t('evidossierReview.review.findings.blockedTargetUnavailable');
    if (!reportVersion) return t('evidossierReview.review.findings.blockedNoReport');
    if (selectedIds.length === 0) return t('evidossierReview.review.findings.blockedNone');
    return undefined;
  }, [pkg.reviewTarget, reportTargetVersionId, reportVersion, selectedIds.length, t]);

  const targetReason = targetState.kind === 'ok' ? undefined : TARGET_REASON[targetState.kind];

  const activateFinding = useCallback(
    (finding: ReviewFinding) => {
      setActiveFindingId(finding.id);
      if (finding.location?.blockId) setActiveBlockId(finding.location.blockId);
      setRightTab('detail');
      if (narrow) {
        setLeftOpen(false);
        setRightOpen(true);
      }
    },
    [narrow]
  );

  const handleBlockClick = useCallback(
    (blockId: string) => {
      const matched =
        visibleFindings.find((finding) => finding.location?.blockId === blockId) ??
        allFindings.find((finding) => finding.location?.blockId === blockId);
      if (matched) activateFinding(matched);
    },
    [visibleFindings, allFindings, activateFinding]
  );

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }, []);

  const toggleAll = useCallback(
    (checked: boolean) => {
      setSelectedIds(checked ? visibleFindings.map((finding) => finding.id) : []);
    },
    [visibleFindings]
  );

  const focusArtifact = useCallback(
    (artifactId?: string) => {
      if (!artifactId) return;
      const artifact = artifacts.find((item) => item.id === artifactId);
      if (!artifact) return;
      if (artifact.kind === 'findings') {
        setLeftTab('findings');
        if (narrow) {
          setRightOpen(false);
          setLeftOpen(true);
        }
        return;
      }
      if (artifact.kind === 'coverage_plan') {
        setLeftTab('coverage');
        if (narrow) {
          setRightOpen(false);
          setLeftOpen(true);
        }
        return;
      }
      setRightTab('report');
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
      changeNote: t('evidossierReview.review.report.changeNote'),
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

  const goToRevisionWizard = useCallback(() => {
    if (!reportTargetVersionId || !reportVersion) return;
    setTransferOpen(false);
    const params = new URLSearchParams({
      projectId: pkg.projectId,
      baseVersionId: reportTargetVersionId,
      reviewPackageId: pkg.id,
      reviewVersionId: reportVersion.id,
      findingIds: selectedIds.join(','),
    });
    navigate(`/evidossier/new/generate?${params.toString()}`);
  }, [navigate, pkg.projectId, pkg.id, reportTargetVersionId, reportVersion, selectedIds]);

  if (!snapshot) return <LoadingBlock />;

  const selectedCodes = selectedIds
    .map((id) => findingsById.get(id)?.code)
    .filter((code): code is string => Boolean(code));

  const findingsFooter = (
    <>
      <div className='evd-row evd-row--between'>
        <span className='evd-caption'>
          {t('evidossierReview.review.findings.selectedCount', { count: selectedIds.length })}
        </span>
        {transferBlockedReason ? (
          <Tooltip content={transferBlockedReason} getPopupContainer={getPopupMount}>
            <span>
              <Button size='small' type='primary' disabled>
                {t('evidossierReview.review.findings.createRevision')}
              </Button>
            </span>
          </Tooltip>
        ) : (
          <Button size='small' type='primary' onClick={() => setTransferOpen(true)}>
            {t('evidossierReview.review.findings.createRevision')}
          </Button>
        )}
      </div>
      <p className='evd-caption'>{transferBlockedReason ?? t('evidossierReview.review.findings.footerHint')}</p>
    </>
  );

  const leftTabs = (
    <TabStrip
      items={[
        { key: 'coverage', label: t('evidossierReview.review.tabs.coverage'), count: coverage?.items.length },
        { key: 'findings', label: t('evidossierReview.review.tabs.findings'), count: allFindings.length },
      ]}
      value={leftTab}
      onChange={(key) => setLeftTab(key === 'findings' ? 'findings' : 'coverage')}
      ariaLabel={t('evidossierReview.review.workbench.openList')}
    />
  );

  const rightTabs = (
    <TabStrip
      items={[
        { key: 'detail', label: t('evidossierReview.review.tabs.detail') },
        { key: 'basis', label: t('evidossierReview.review.tabs.basis') },
        { key: 'report', label: t('evidossierReview.review.tabs.report') },
      ]}
      value={rightTab}
      onChange={(key) => setRightTab(key === 'basis' ? 'basis' : key === 'report' ? 'report' : 'detail')}
      ariaLabel={t('evidossierReview.review.workbench.openDetail')}
    />
  );

  const coveragePane = (
    <CoveragePane
      payload={coverage}
      counts={counts}
      stage={runningStage}
      findingsById={findingsById}
      onSelectFinding={activateFinding}
    />
  );

  const findingsPane = (
    <FindingsPane
      findings={visibleFindings}
      totalCount={allFindings.length}
      hasArtifact={Boolean(findingsArtifact)}
      coverage={coverage}
      report={report}
      counts={counts}
      stage={runningStage}
      severity={severity}
      status={status}
      keyword={keyword}
      onSeverityChange={setSeverity}
      onStatusChange={setStatus}
      onKeywordChange={setKeyword}
      selectedIds={selectedIds}
      activeId={activeFindingId}
      onToggleSelected={toggleSelected}
      onToggleAll={toggleAll}
      onActivate={activateFinding}
      footer={findingsFooter}
    />
  );

  const detailPane = (
    <DetailPane
      finding={activeFinding}
      emptyZero={Boolean(findingsArtifact) && allFindings.length === 0}
      coverageTitle={activeCoverageTitle}
      selectedForRevision={activeFinding ? selectedIds.includes(activeFinding.id) : false}
      onToggleSelected={(checked) => {
        if (!activeFinding) return;
        if (checked) setSelectedIds((prev) => (prev.includes(activeFinding.id) ? prev : [...prev, activeFinding.id]));
        else setSelectedIds((prev) => prev.filter((id) => id !== activeFinding.id));
      }}
      onLocate={() => {
        if (activeFinding?.location?.blockId) setActiveBlockId(activeFinding.location.blockId);
      }}
      onViewBasis={() => {
        if (basisPreview) setBasisOpen(true);
      }}
      basisAvailable={Boolean(basisPreview)}
    />
  );

  const basisPane = (
    <BasisPane
      target={targetState}
      purpose={task.goal}
      scopeNote={scopeNote}
      requirements={task.requirements}
      entries={basisEntries}
    />
  );

  const reportPane = (
    <ReportPane
      payload={report}
      artifactHistory={artifactHistoryOf(artifacts, [...REVIEW_ARTIFACT_KINDS])}
      reportVersion={reportVersion}
      delivered={delivered}
      onViewFull={() => setReportOpen(true)}
      onOpenVersion={openReportVersion}
    />
  );

  return (
    <div className='evd-rv' ref={rootRef}>
      <header className='evd-rv__top'>
        <div className='evd-rv__top-main'>
          <div className='evd-rv__targetline'>
            <span className='evd-label'>{t('evidossierReview.review.workbench.targetLabel')}</span>
            <span className='evd-rv__targetname'>
              {targetState.label || t('evidossierReview.review.workbench.missingTarget')}
            </span>
            {targetState.packageVersion ? (
              <span className='evd-version'>{targetState.packageVersion.label}</span>
            ) : null}
            {targetState.materialVersion ? (
              <span className='evd-version'>v{targetState.materialVersion.version}</span>
            ) : null}
            {targetState.materialVersion ? (
              <StatusTag kind='parse' value={targetState.materialVersion.parseStatus} />
            ) : null}
            <StatusTag kind='package' value={pkg.status} />
          </div>
          <div className='evd-rv__metaline'>
            {task.goal ? (
              <span className='evd-caption'>
                {t('evidossierReview.review.workbench.purposeLabel')}: {task.goal}
              </span>
            ) : null}
            <span className='evd-caption'>
              {t('evidossierReview.review.workbench.scopeLabel')}:{' '}
              {scopeNote || t('evidossierReview.review.workbench.scopeMissing')}
            </span>
          </div>
          <div className='evd-rv__stages' aria-label={t('evidossierReview.review.workbench.stagesLabel')}>
            {stages.map((stage) => (
              <span
                key={stage.id}
                className={cx(
                  'evd-rv__stage',
                  (stage.status === 'running' || stage.status === 'awaiting_confirmation') && 'evd-rv__stage--current'
                )}
              >
                <span className='evd-rv__stage-index' aria-hidden>
                  {stage.order}
                </span>
                <span className='evd-rv__stage-name'>{t(stage.titleKey)}</span>
                <StatusTag kind='stage' value={stage.status} />
              </span>
            ))}
          </div>
        </div>
        <div className='evd-rv__actions'>
          {narrow ? (
            <>
              <Button size='small' icon={<IconList size={14} />} onClick={() => setLeftOpen(true)}>
                {t('evidossierReview.review.workbench.openList')}
              </Button>
              <Button size='small' icon={<IconSidebar size={14} />} onClick={() => setRightOpen(true)}>
                {t('evidossierReview.review.workbench.openDetail')}
              </Button>
            </>
          ) : null}
          {delivered ? (
            reportVersion ? (
              <Button size='small' icon={<IconExternal size={14} />} onClick={openReportVersion}>
                {t('evidossierReview.review.report.openVersion')}
              </Button>
            ) : (
              <ToneTag tone='green'>{t('evidossierReview.review.workbench.reviewEnded')}</ToneTag>
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
        <div className='evd-rv__notify'>
          <Banner
            tone='success'
            title={t('evidossierReview.shared.deliveredTitle', { label: reportVersion?.label ?? pkg.code })}
            actions={
              reportVersion ? (
                <Button size='small' onClick={openReportVersion}>
                  {t('evidossierReview.review.report.openVersion')}
                </Button>
              ) : undefined
            }
          >
            {t('evidossierReview.review.workbench.reviewEndedText')}
          </Banner>
        </div>
      ) : null}

      {bannerStage ? (
        <div className='evd-rv__notify'>
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
        <div className='evd-rv__exec'>
          <StatusTag kind='execution' value={execution.status} dot />
          <span className='evd-caption evd-rv__exec-activity'>{execution.activity}</span>
          {execution.pausedNote ? (
            <span className='evd-caption'>
              {t('evidossierReview.shared.executionPaused', { note: execution.pausedNote })}
            </span>
          ) : null}
          {execution.failure ? (
            <span className='evd-caption evd-rv__exec-failure'>
              {t('evidossierReview.shared.executionFailed', { note: execution.failure.reason })}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className='evd-rv__body'>
        {!narrow ? (
          <aside className='evd-rv__left'>
            {leftTabs}
            {leftTab === 'coverage' ? <div className='evd-rv__scroll'>{coveragePane}</div> : findingsPane}
          </aside>
        ) : null}

        <section className='evd-rv__center'>
          <div className='evd-rv__dochead'>
            <div className='evd-rv__dochead-row'>
              <span className='evd-label'>{t('evidossierReview.review.workbench.targetLabel')}</span>
              <span className='evd-h4 evd-truncate'>
                {document?.title ?? (targetState.label || t('evidossierReview.review.workbench.cannotReadTitle'))}
              </span>
              {targetState.packageVersion ? (
                <span className='evd-version'>{targetState.packageVersion.label}</span>
              ) : null}
              {activeFinding?.location ? <ToneTag tone='blue'>{activeFinding.code}</ToneTag> : null}
            </div>
            <div className='evd-caption'>
              {targetState.packageVersion
                ? `${targetState.packageVersion.deliverable.title} · ${formatDateTime(targetState.packageVersion.createdAt)}`
                : targetState.material && targetState.materialVersion
                  ? `${targetState.material.name} · ${t('evidossierReview.review.basis.materialMeta', {
                      version: targetState.materialVersion.version,
                      status: t(`evidossierCommon.status.parse.${targetState.materialVersion.parseStatus}`, {
                        defaultValue: targetState.materialVersion.parseStatus,
                      }),
                    })}`
                  : targetState.label}
            </div>
          </div>

          {targetReason ? (
            <div className='evd-rv__bannerwrap'>
              <Banner tone='warning' title={t(targetReason.titleKey)}>
                {t(targetReason.textKey)}
              </Banner>
            </div>
          ) : null}

          {unreadableBasis.length > 0 ? (
            <div className='evd-rv__bannerwrap'>
              <Banner tone='warning' title={t('evidossierReview.review.workbench.basisUnreadableTitle')}>
                {t('evidossierReview.review.workbench.basisUnreadableText', {
                  names: unreadableBasis.map((entry) => entry.materialName).join(', '),
                })}
              </Banner>
            </div>
          ) : null}

          <div className='evd-rv__docscroll'>
            {document ? (
              <DocumentView
                document={document}
                activeBlockId={activeBlockId}
                highlight={highlight}
                onBlockClick={handleBlockClick}
              />
            ) : (
              <div className='evd-rv__nodoc'>
                <EmptyState
                  title={t('evidossierReview.review.workbench.cannotReadTitle')}
                  text={
                    targetReason
                      ? t(targetReason.textKey)
                      : t('evidossierReview.review.workbench.documentUnreadableText')
                  }
                  actions={
                    <Button size='small' onClick={() => setRightTab('basis')}>
                      {t('evidossierReview.review.tabs.basis')}
                    </Button>
                  }
                />
              </div>
            )}
          </div>
        </section>

        {!narrow ? (
          <aside className='evd-rv__right'>
            {rightTabs}
            <div className='evd-rv__right-body'>
              {rightTab === 'detail' ? detailPane : rightTab === 'basis' ? basisPane : reportPane}
            </div>
          </aside>
        ) : null}
      </div>

      <Drawer
        visible={leftOpen}
        getPopupContainer={getPopupMount}
        placement='left'
        width={340}
        footer={null}
        bodyStyle={{ padding: 0 }}
        onCancel={() => setLeftOpen(false)}
        title={t('evidossierReview.review.workbench.openList')}
      >
        <div className='evd-rv__drawer'>
          {leftTabs}
          {leftTab === 'coverage' ? <div className='evd-rv__scroll'>{coveragePane}</div> : findingsPane}
        </div>
      </Drawer>

      <Drawer
        visible={rightOpen}
        getPopupContainer={getPopupMount}
        placement='right'
        width={400}
        footer={null}
        bodyStyle={{ padding: 0 }}
        onCancel={() => setRightOpen(false)}
        title={t('evidossierReview.review.workbench.openDetail')}
      >
        <div className='evd-rv__drawer'>
          {rightTabs}
          <div className='evd-rv__right-body'>
            {rightTab === 'detail' ? detailPane : rightTab === 'basis' ? basisPane : reportPane}
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
        <div className='evd-rv__modalblock'>
          <MetaList
            items={[
              { label: t('evidossierReview.review.workbench.targetLabel'), value: targetState.label },
              {
                label: t('evidossierReview.review.report.submitExactVersion'),
                value: targetState.packageVersion?.label ?? `v${targetState.materialVersion?.version ?? 1}`,
              },
              {
                label: t('evidossierReview.review.report.submitVersions'),
                value: reportVersion?.label ?? t('evidossierReview.review.report.submitNewVersion'),
              },
            ]}
          />
        </div>
        <div className='evd-rv__modalblock'>
          <p className='evd-label'>{t('evidossierReview.review.report.coverageStats')}</p>
          <Stats
            items={[
              {
                label: t('evidossierReview.review.coverage.statChecked'),
                value: report?.coverageStats.checked ?? counts.checked,
              },
              {
                label: t('evidossierReview.review.coverage.statUnchecked'),
                value: report?.coverageStats.unchecked ?? counts.unchecked,
              },
              {
                label: t('evidossierReview.review.coverage.statUncheckable'),
                value: report?.coverageStats.uncheckable ?? counts.uncheckable,
              },
              {
                label: t('evidossierReview.review.coverage.statNotApplicable'),
                value: report?.coverageStats.notApplicable ?? counts.notApplicable,
              },
            ]}
          />
        </div>
        <div className='evd-rv__modalblock'>
          <p className='evd-label'>{t('evidossierReview.review.report.findingStats')}</p>
          <Stats
            items={[
              {
                label: t('evidossierCommon.status.severity.high'),
                value: report?.findingStats.high ?? findingSeverityCounts(allFindings).high,
              },
              {
                label: t('evidossierCommon.status.severity.medium'),
                value: report?.findingStats.medium ?? findingSeverityCounts(allFindings).medium,
              },
              {
                label: t('evidossierCommon.status.severity.low'),
                value: report?.findingStats.low ?? findingSeverityCounts(allFindings).low,
              },
              {
                label: t('evidossierCommon.status.severity.info'),
                value: report?.findingStats.info ?? findingSeverityCounts(allFindings).info,
              },
              {
                label: t('evidossierCommon.status.finding.uncertain'),
                value: report?.findingStats.uncertain ?? findingSeverityCounts(allFindings).uncertain,
              },
            ]}
          />
        </div>
        <div className='evd-rv__modalblock'>
          <p className='evd-label'>{t('evidossierReview.review.report.limitations')}</p>
          <ul className='evd-rv__bullets'>
            {(report?.limitations ?? []).map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
        <div className='evd-rv__modalblock'>
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
        title={t('evidossierReview.review.transfer.title')}
        visible={transferOpen}
        getPopupContainer={getPopupMount}
        onCancel={() => setTransferOpen(false)}
        onOk={goToRevisionWizard}
        okText={t('evidossierReview.review.transfer.confirm')}
        cancelText={t('evidossierReview.shared.cancel')}
        style={{ width: 620 }}
      >
        <p className='evd-body'>{t('evidossierReview.review.transfer.intro')}</p>
        <div className='evd-rv__modalblock'>
          <MetaList
            items={[
              { label: t('evidossierReview.review.transfer.project'), value: project.name },
              { label: t('evidossierReview.review.transfer.reviewedVersion'), value: targetState.label },
              { label: t('evidossierReview.review.transfer.reportVersion'), value: reportVersion?.label ?? '—' },
              {
                label: t('evidossierReview.review.transfer.selectedCount', { count: selectedIds.length }),
                value: String(selectedIds.length),
              },
              { label: t('evidossierReview.review.transfer.codes'), value: selectedCodes.join(', ') },
            ]}
          />
        </div>
        <Banner tone='info'>{t('evidossierReview.review.transfer.cancelNoRelation')}</Banner>
      </Modal>

      <Modal
        title={t('evidossierReview.review.detail.basisModalTitle', { name: basisPreview?.title ?? '' })}
        visible={basisOpen}
        getPopupContainer={getPopupMount}
        onCancel={() => setBasisOpen(false)}
        footer={
          <div className='evd-row' style={{ justifyContent: 'flex-end' }}>
            <Button onClick={() => setBasisOpen(false)}>{t('evidossierReview.shared.close')}</Button>
          </div>
        }
        style={{ width: 860 }}
      >
        {basisPreview ? (
          <div className='evd-rv__reportmodal'>
            <DocumentView document={basisPreview.document} activeBlockId={basisPreview.blockId} />
          </div>
        ) : (
          <p className='evd-body'>{t('evidossierReview.review.detail.basisUnreadable')}</p>
        )}
      </Modal>

      <Modal
        title={t('evidossierReview.review.report.fullTitle')}
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
                {t('evidossierReview.review.report.openVersion')}
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
          <div className='evd-rv__reportmodal'>
            <DocumentView document={reportDocument} />
          </div>
        ) : (
          <div className='evd-rv__pane-pad'>
            <p className='evd-caption'>{t('evidossierReview.review.report.fullFallback')}</p>
            {report ? <p className='evd-body evd-mt-8'>{report.summary}</p> : null}
            {report ? (
              <ul className='evd-rv__bullets evd-mt-8'>
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

export default ReviewWorkbench;
