/**
 * Generate-task workbench: stage rail on the left, the current stage artifact in
 * the center and the package context (conversation, results, versions, sources)
 * on the right. Below 1080px the context panel becomes a drawer so no feature is
 * lost on narrow screens.
 */
import { Drawer, Message } from '@arco-design/web-react';
import React, { useMemo, useState } from 'react';
import type {
  EvidossierSnapshot,
  PackageVersion,
  PackageWorkspace,
  Stage,
  StageArtifactPayload,
} from '../../domain/types';
import { resolveMaterialReference, getLatestArtifactForStage } from '../../data/selectors';
import { useEvidossier } from '../../data/EvidossierProvider';
import { EmptyState, useEvidT } from '../../design/primitives';
import { StageRail } from '../../components/StageRail';
import { ContextPanel } from './ContextPanel';
import { StageWorkspace, type StageInputRef } from './StageWorkspace';
import { getPopupMount } from './packageSupport';

type GenerateWorkbenchProps = {
  snapshot: EvidossierSnapshot;
  workspace: PackageWorkspace;
  draftBaseVersion?: PackageVersion;
  highlightedVersionId?: string;
  canSubmit: boolean;
  onSubmit: () => void;
  onContinueEditing: (baseVersionId?: string) => void;
};

const pickDefaultStage = (stages: Stage[], conflictArtifactStageId?: string): Stage | undefined => {
  if (conflictArtifactStageId) {
    const conflictStage = stages.find((stage) => stage.id === conflictArtifactStageId);
    if (conflictStage) return conflictStage;
  }
  const active = stages.find(
    (stage) =>
      stage.status === 'running' ||
      stage.status === 'awaiting_confirmation' ||
      stage.status === 'needs_review' ||
      stage.status === 'failed'
  );
  if (active) return active;
  for (let index = stages.length - 1; index >= 0; index -= 1) {
    if (stages[index].status === 'completed' && stages[index].currentArtifactId) return stages[index];
  }
  for (let index = stages.length - 1; index >= 0; index -= 1) {
    if (stages[index].status === 'completed') return stages[index];
  }
  return stages[0];
};

export const GenerateWorkbench: React.FC<GenerateWorkbenchProps> = ({
  snapshot,
  workspace,
  draftBaseVersion,
  highlightedVersionId,
  canSubmit,
  onSubmit,
  onContinueEditing,
}) => {
  const t = useEvidT();
  const { actions } = useEvidossier();
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const pkg = workspace.pkg;
  const stages = workspace.stages;
  const conflictStageId = pkg.currentDraft?.conflict
    ? workspace.artifacts.find((item) => item.id === pkg.currentDraft?.conflict?.userArtifactId)?.stageId
    : undefined;
  const defaultStage = useMemo(() => pickDefaultStage(stages, conflictStageId), [stages, conflictStageId]);
  const activeStage = stages.find((stage) => stage.id === activeStageId) ?? defaultStage;

  const artifact = activeStage ? getLatestArtifactForStage(snapshot, activeStage) : undefined;

  const inputRefs: StageInputRef[] = useMemo(() => {
    if (!activeStage) return [];
    return activeStage.inputRefs.map((ref) => {
      const resolved = resolveMaterialReference(snapshot, ref);
      return { ref, available: resolved.available };
    });
  }, [activeStage, snapshot]);

  const readOnly = pkg.status === 'delivered' && !pkg.currentDraft;
  const draft = pkg.currentDraft;
  const nextStage = activeStage ? stages.find((stage) => stage.order === activeStage.order + 1) : undefined;
  const allStagesCompleted = stages.length > 0 && stages.every((stage) => stage.status === 'completed');
  const hasVersion = workspace.versions.length > 0;
  const execution = workspace.execution;
  const failure =
    execution?.failure && activeStage && execution.failure.failedStageKey === activeStage.key
      ? execution.failure
      : undefined;

  const saveArtifact = async (artifactId: string, payload: StageArtifactPayload, summary: string): Promise<boolean> => {
    const result = await actions.editArtifact({ packageId: pkg.id, artifactId, payload, summary });
    if (result) {
      Message.success(t('evidossierPackage.stage.saveDone'));
      return true;
    }
    return false;
  };

  const confirmArtifact = async (artifactId: string): Promise<boolean> => {
    const confirmed = await actions.confirmArtifact(pkg.id, artifactId);
    if (confirmed) Message.success(t('evidossierPackage.stage.confirmDone'));
    return confirmed;
  };

  const retryStage = async (): Promise<boolean> => {
    const retried = await actions.retryStage(pkg.id);
    if (retried) Message.success(t('evidossierPackage.stage.retryDone'));
    return retried;
  };

  const selectStage = (stage: Stage): void => setActiveStageId(stage.id);

  const openStageByKey = (stageKey: string): void => {
    const target = stages.find((stage) => stage.key === stageKey);
    if (target) setActiveStageId(target.id);
    setDrawerOpen(false);
  };

  return (
    <div className='evd-workspace evd-pkg-workspace'>
      <StageRail
        pkg={pkg}
        stages={stages}
        activeStageKey={activeStage?.key}
        onSelectStage={selectStage}
        className='evd-pkg-rail'
      />

      <div className='evd-workspace__center'>
        {activeStage ? (
          <StageWorkspace
            stage={activeStage}
            stages={stages}
            artifact={artifact}
            inputRefs={inputRefs}
            readOnly={readOnly}
            isDraftStage={activeStage.key === 'draft'}
            draft={draft}
            draftBaseVersion={draftBaseVersion}
            nextStage={nextStage}
            allStagesCompleted={allStagesCompleted}
            hasVersion={hasVersion}
            canSubmit={canSubmit}
            failure={failure}
            onSaveArtifact={saveArtifact}
            onConfirmArtifact={confirmArtifact}
            onRetryStage={retryStage}
            onOpenSubmit={onSubmit}
            onOpenContext={() => setDrawerOpen(true)}
          />
        ) : (
          <div className='evd-center'>
            <EmptyState
              title={t('evidossierPackage.stage.noStages')}
              text={t('evidossierPackage.stage.noStagesText')}
              center
            />
          </div>
        )}
      </div>

      <aside className='evd-context evd-pkg-context'>
        <ContextPanel
          workspace={workspace}
          variant='panel'
          onOpenStage={openStageByKey}
          onContinueEditing={onContinueEditing}
          highlightedVersionId={highlightedVersionId}
        />
      </aside>

      <Drawer
        className='evd-pkg-drawer'
        width={380}
        title={t('evidossierPackage.panel.title')}
        visible={drawerOpen}
        onCancel={() => setDrawerOpen(false)}
        footer={null}
        getPopupContainer={getPopupMount}
      >
        <ContextPanel
          workspace={workspace}
          variant='drawer'
          onOpenStage={openStageByKey}
          onContinueEditing={onContinueEditing}
          highlightedVersionId={highlightedVersionId}
        />
      </Drawer>
    </div>
  );
};
