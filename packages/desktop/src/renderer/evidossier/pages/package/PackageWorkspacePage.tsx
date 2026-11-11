/**
 * Delivery package workbench page (`/evidossier/packages/:packageId`).
 *
 * The page owns the package-level shell: header, execution state, attention
 * notices, draft-conflict handling and the submission dialogs. The body switches
 * between the generate workbench (owned here) and the review/comparison
 * workbenches (owned by the workspaces agent, loaded lazily).
 */
import { Button, Message } from '@arco-design/web-react';
import React, { Suspense, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { PackageWorkspace, PackageVersion } from '../../domain/types';
import type { DraftConflictResolution } from '../../data/repository';
import { buildPackageWorkspace } from '../../data/selectors';
import { useEvidossier } from '../../data/EvidossierProvider';
import { ExecutionBar } from '../../components/StageRail';
import { Banner, EmptyState, LoadingBlock, PageHeader, useEvidT } from '../../design/primitives';
import { PackageHeader, type DemoAction } from './PackageHeader';
import { AttentionBanner, ConflictPanel } from './PackageStatusNotices';
import { GenerateWorkbench } from './GenerateWorkbench';
import { ContinueEditingDialog, RenamePackageDialog, SubmitVersionDialog } from './PackageDialogs';
import './packageWorkspace.css';

const ReviewWorkbench = React.lazy(() => import('../review/ReviewWorkbench'));
const CompareWorkbench = React.lazy(() => import('../compare/CompareWorkbench'));

type SubmitValues = { changeNote: string; unfinishedNote?: string };

const PackageWorkspacePage: React.FC = () => {
  const t = useEvidT();
  const navigate = useNavigate();
  const { packageId = '' } = useParams<{ packageId: string }>();
  const { snapshot, loading, actions } = useEvidossier();

  const [renameOpen, setRenameOpen] = useState(false);
  const [continueOpen, setContinueOpen] = useState(false);
  const [continueBaseVersionId, setContinueBaseVersionId] = useState<string | undefined>(undefined);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [resolving, setResolving] = useState<DraftConflictResolution | null>(null);
  const [highlightVersionId, setHighlightVersionId] = useState<string | undefined>(undefined);

  useEffect(() => {
    setRenameOpen(false);
    setContinueOpen(false);
    setContinueBaseVersionId(undefined);
    setSubmitOpen(false);
    setResolving(null);
    setHighlightVersionId(undefined);
  }, [packageId]);

  if (loading || !snapshot) {
    return (
      <div className='evd-pkg-page'>
        <LoadingBlock label={t('evidossierCommon.common.loadingWorkspace')} />
      </div>
    );
  }

  const workspace: PackageWorkspace | undefined = buildPackageWorkspace(snapshot, packageId);
  if (!workspace) {
    return (
      <div className='evd-page'>
        <PageHeader
          crumbs={[{ label: t('evidossierCommon.nav.home'), onClick: () => navigate('/evidossier') }]}
          title={t('evidossierPackage.workspace.notFoundTitle')}
          description={t('evidossierPackage.workspace.notFoundText')}
          actions={
            <Button type='primary' onClick={() => navigate('/evidossier')}>
              {t('evidossierPackage.workspace.backToWorkspace')}
            </Button>
          }
        />
        <EmptyState
          title={t('evidossierCommon.common.notFound')}
          text={t('evidossierPackage.workspace.notFoundText')}
          center
          actions={
            <Button onClick={() => navigate('/evidossier/projects')}>
              {t('evidossierPackage.workspace.backToProjects')}
            </Button>
          }
        />
      </div>
    );
  }

  const { pkg, stages, artifacts, execution, currentVersion } = workspace;
  const kind = pkg.task.kind;
  const conflict = pkg.currentDraft?.conflict;
  const draftBaseVersion = pkg.currentDraft?.baseVersionId
    ? snapshot.versions.find((version) => version.id === pkg.currentDraft?.baseVersionId)
    : undefined;
  const isDelivered = pkg.status === 'delivered';
  const allStagesCompleted = stages.length > 0 && stages.every((stage) => stage.status === 'completed');
  const reportArtifact = artifacts
    .filter((artifact) => artifact.kind === 'review_report' || artifact.kind === 'comparison_report')
    .sort((a, b) => b.revision - a.revision)[0];
  const reportConfirmed = reportArtifact?.status === 'confirmed';
  const canSubmit = !conflict && !isDelivered && (kind === 'generate' ? allStagesCompleted : Boolean(reportConfirmed));
  const submitLabel =
    kind === 'generate' ? t('evidossierPackage.header.submitVersion') : t('evidossierPackage.header.submitReport');
  const submitBlockedReason = conflict
    ? t('evidossierPackage.header.blockedConflict')
    : kind === 'generate'
      ? t('evidossierPackage.header.blockedStages')
      : t('evidossierPackage.header.blockedReport');

  const rename = async (title: string): Promise<boolean> => {
    const ok = await actions.renamePackage(pkg.id, title);
    if (ok) {
      Message.success(t('evidossierPackage.rename.done'));
      setRenameOpen(false);
    }
    return ok;
  };

  const continueEditing = async (baseVersionId: string): Promise<boolean> => {
    const ok = await actions.continueEditing(pkg.id, baseVersionId);
    if (ok) {
      Message.success(t('evidossierPackage.continueEdit.done'));
      setContinueOpen(false);
    }
    return ok;
  };

  const submitVersion = async (values: SubmitValues): Promise<PackageVersion | undefined> => {
    const version = await actions.submitVersion({
      packageId: pkg.id,
      changeNote: values.changeNote,
      unfinishedNote: values.unfinishedNote,
    });
    if (version) {
      Message.success(t('evidossierPackage.submit.done', { label: version.label }));
      setSubmitOpen(false);
      setHighlightVersionId(version.id);
    }
    return version;
  };

  const resolveConflict = async (resolution: DraftConflictResolution): Promise<void> => {
    setResolving(resolution);
    const ok = await actions.resolveDraftConflict(pkg.id, resolution);
    setResolving(null);
    if (ok) Message.success(t('evidossierPackage.conflict.resolvedDone'));
  };

  const runDemoAction = async (action: DemoAction): Promise<void> => {
    const label = t(`evidossierPackage.header.demoLabel.${action}`);
    const ok = await (action === 'pause'
      ? actions.pauseExecution(pkg.id)
      : action === 'resume'
        ? actions.resumeExecution(pkg.id)
        : action === 'retry'
          ? actions.retryStage(pkg.id)
          : actions.simulateFailure(pkg.id));
    if (ok) Message.success(t('evidossierPackage.header.demoDone', { action: label }));
  };

  const retryStage = async (): Promise<boolean> => {
    const ok = await actions.retryStage(pkg.id);
    if (ok) Message.success(t('evidossierPackage.stage.retryDone'));
    return ok;
  };

  const resumeExecution = async (): Promise<boolean> => {
    const ok = await actions.resumeExecution(pkg.id);
    if (ok) {
      Message.success(
        t('evidossierPackage.header.demoDone', { action: t('evidossierPackage.header.demoLabel.resume') })
      );
    }
    return ok;
  };

  const scrollToConflict = (): void => {
    const node = typeof document === 'undefined' ? null : document.getElementById('evd-pkg-conflict');
    node?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const openContinueEditing = (baseVersionId?: string): void => {
    setContinueBaseVersionId(baseVersionId);
    setContinueOpen(true);
  };

  return (
    <div className='evd-pkg-page'>
      <div className='evd-pkg-page__head'>
        <PackageHeader
          workspace={workspace}
          canSubmit={canSubmit}
          submitLabel={submitLabel}
          submitBlockedReason={submitBlockedReason}
          draftBaseVersion={draftBaseVersion}
          onRename={() => setRenameOpen(true)}
          onContinueEditing={openContinueEditing}
          onSubmit={() => setSubmitOpen(true)}
          onDemoAction={(action) => void runDemoAction(action)}
        />
        <div className='evd-pkg-page__notices'>
          {execution ? <ExecutionBar pkg={pkg} execution={execution} /> : null}
          <AttentionBanner
            workspace={workspace}
            onRetry={retryStage}
            onResume={resumeExecution}
            onScrollToConflict={scrollToConflict}
            suppressAwaiting={kind !== 'generate'}
          />
          {highlightVersionId && currentVersion?.id === highlightVersionId ? (
            <Banner
              tone='success'
              title={t('evidossierPackage.submit.newVersionTitle', { label: currentVersion.label })}
              actions={
                <Button
                  size='small'
                  type='primary'
                  onClick={() => navigate(`/evidossier/packages/${pkg.id}/versions/${currentVersion.id}`)}
                >
                  {t('evidossierCommon.action.openVersion')}
                </Button>
              }
            >
              {t('evidossierPackage.submit.newVersionText')}
            </Banner>
          ) : null}
        </div>
      </div>

      <div className='evd-pkg-page__body'>
        {conflict ? (
          <div className='evd-pkg-conflictwrap'>
            <ConflictPanel
              workspace={workspace}
              resolving={resolving}
              onResolve={(resolution) => void resolveConflict(resolution)}
            />
          </div>
        ) : null}

        {kind === 'generate' ? (
          <GenerateWorkbench
            snapshot={snapshot}
            workspace={workspace}
            draftBaseVersion={draftBaseVersion}
            highlightedVersionId={highlightVersionId}
            canSubmit={canSubmit}
            onSubmit={() => setSubmitOpen(true)}
            onContinueEditing={openContinueEditing}
          />
        ) : (
          <div className='evd-pkg-cbody'>
            <Suspense fallback={<LoadingBlock label={t('evidossierCommon.common.loadingWorkspace')} />}>
              {kind === 'review' ? (
                <ReviewWorkbench workspace={workspace} />
              ) : (
                <CompareWorkbench workspace={workspace} />
              )}
            </Suspense>
          </div>
        )}
      </div>

      <RenamePackageDialog
        visible={renameOpen}
        currentTitle={pkg.title}
        onCancel={() => setRenameOpen(false)}
        onConfirm={rename}
      />
      <ContinueEditingDialog
        visible={continueOpen}
        workspace={workspace}
        defaultBaseVersionId={continueBaseVersionId}
        onCancel={() => setContinueOpen(false)}
        onConfirm={continueEditing}
      />
      <SubmitVersionDialog
        visible={submitOpen}
        workspace={workspace}
        onCancel={() => setSubmitOpen(false)}
        onSubmit={submitVersion}
      />
    </div>
  );
};

export default PackageWorkspacePage;
