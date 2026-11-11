/**
 * Center column of the generate workbench: the current stage, the artifact it
 * produces, and the explicit confirmation/edit actions for that artifact.
 *
 * The stage is the unit of work here — the conversation never replaces it. All
 * copy is i18n-keyed; simulated artifacts are labelled as demo output.
 */
import { Button, Modal, Tooltip } from '@arco-design/web-react';
import React, { useEffect, useState } from 'react';
import type {
  ExecutionFailure,
  MaterialReference,
  PackageVersion,
  Stage,
  StageArtifact,
  StageArtifactPayload,
  WorkDraft,
} from '../../domain/types';
import {
  Banner,
  DemoTag,
  EmptyState,
  LoadingBlock,
  StatusTag,
  ToneTag,
  formatDateTime,
  useEvidT,
} from '../../design/primitives';
import { IconEdit, IconRetry, IconSidebar } from '../../design/icons';
import { ArtifactEditor, artifactKindLabelKey, isArtifactEditable } from './ArtifactEditors';
import { getPopupMount } from './packageSupport';

export type StageInputRef = { ref: MaterialReference; available: boolean };

type StageWorkspaceProps = {
  stage: Stage;
  stages: Stage[];
  artifact?: StageArtifact;
  inputRefs: StageInputRef[];
  readOnly: boolean;
  isDraftStage: boolean;
  draft?: WorkDraft;
  draftBaseVersion?: PackageVersion;
  nextStage?: Stage;
  allStagesCompleted: boolean;
  hasVersion: boolean;
  canSubmit: boolean;
  failure?: ExecutionFailure;
  onSaveArtifact: (artifactId: string, payload: StageArtifactPayload, summary: string) => Promise<boolean>;
  onConfirmArtifact: (artifactId: string) => Promise<boolean>;
  onRetryStage: () => Promise<boolean>;
  onOpenSubmit: () => void;
  onOpenContext: () => void;
};

export const StageWorkspace: React.FC<StageWorkspaceProps> = ({
  stage,
  stages,
  artifact,
  inputRefs,
  readOnly,
  isDraftStage,
  draft,
  draftBaseVersion,
  nextStage,
  allStagesCompleted,
  hasVersion,
  canSubmit,
  failure,
  onSaveArtifact,
  onConfirmArtifact,
  onRetryStage,
  onOpenSubmit,
  onOpenContext,
}) => {
  const t = useEvidT();
  const [editing, setEditing] = useState(false);
  const [draftPayload, setDraftPayload] = useState<StageArtifactPayload | undefined>(undefined);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    setEditing(false);
    setDraftPayload(undefined);
    setConfirmOpen(false);
  }, [artifact?.id, artifact?.revision]);

  const artifactReadOnly = readOnly || artifact?.status === 'superseded';
  const canEdit = Boolean(
    artifact && !artifactReadOnly && isArtifactEditable(artifact.kind) && artifact.status !== 'failed'
  );
  const needsEdit = editing && Boolean(draftPayload);

  const startEdit = (): void => {
    if (!artifact) return;
    setDraftPayload(structuredClone(artifact.payload));
    setEditing(true);
  };

  const cancelEdit = (): void => {
    setEditing(false);
    setDraftPayload(undefined);
  };

  const saveEdit = async (): Promise<void> => {
    if (!artifact || !draftPayload) return;
    setSaving(true);
    const kindLabel = t(artifactKindLabelKey(artifact.kind));
    const summary = t('evidossierPackage.artifact.editSummary', { kind: kindLabel });
    const saved = await onSaveArtifact(artifact.id, draftPayload, summary);
    setSaving(false);
    if (saved) {
      setEditing(false);
      setDraftPayload(undefined);
    }
  };

  const askConfirm = (): void => setConfirmOpen(true);

  const confirmArtifact = async (): Promise<void> => {
    if (!artifact) return;
    setConfirming(true);
    const confirmed = await onConfirmArtifact(artifact.id);
    setConfirming(false);
    if (confirmed) setConfirmOpen(false);
  };

  const retry = async (): Promise<void> => {
    setRetrying(true);
    await onRetryStage();
    setRetrying(false);
  };

  const renderNoArtifact = (): React.ReactNode => {
    if (stage.status === 'running') {
      return (
        <div className='evd-pkg-editor'>
          <LoadingBlock label={t('evidossierPackage.stage.runningTitle')} />
        </div>
      );
    }
    if (stage.status === 'failed') {
      return (
        <div className='evd-pkg-editor'>
          <Banner
            tone='error'
            title={t('evidossierPackage.stage.failedTitle')}
            actions={
              <Button
                size='small'
                type='primary'
                icon={<IconRetry size={14} />}
                loading={retrying}
                onClick={() => void retry()}
              >
                {t('evidossierPackage.stage.retryStage')}
              </Button>
            }
          >
            {failure?.reason ?? stage.statusNote ?? t('evidossierPackage.stage.failedUnknown')}
            {failure?.preservedNote ? <p className='evd-mb-0'>{failure.preservedNote}</p> : null}
          </Banner>
        </div>
      );
    }
    if (stage.status === 'awaiting_confirmation' || stage.status === 'needs_review') {
      return (
        <div className='evd-pkg-editor'>
          <EmptyState
            title={t('evidossierPackage.stage.awaitingTitle')}
            text={stage.statusNote ?? t('evidossierPackage.stage.awaitingText')}
            center
          />
        </div>
      );
    }
    if (stage.status === 'completed') {
      return (
        <div className='evd-pkg-editor'>
          <EmptyState
            title={t('evidossierPackage.stage.completedNoArtifact')}
            text={t('evidossierPackage.stage.completedNoArtifactText')}
            center
          />
        </div>
      );
    }
    return (
      <div className='evd-pkg-editor'>
        <EmptyState
          title={t('evidossierPackage.stage.notStartedTitle')}
          text={t('evidossierPackage.stage.notStartedText')}
          center
        />
      </div>
    );
  };

  const renderNextHint = (): React.ReactNode => {
    if (!artifact || artifact.status !== 'confirmed') return null;
    if (nextStage) {
      return (
        <p className='evd-caption evd-mb-0'>
          {t('evidossierPackage.stage.nextStageHint', { name: t(nextStage.titleKey) })}
        </p>
      );
    }
    if (allStagesCompleted && !hasVersion) return null;
    return null;
  };

  return (
    <div
      className='evd-pkg-center'
      style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: '1 1 auto' }}
    >
      <header className='evd-pkg-stageheader'>
        <div className='evd-row evd-row--between' style={{ alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <div className='evd-row' style={{ flexWrap: 'wrap' }}>
              <span className='evd-caption'>
                {t('evidossierPackage.stage.stageIndex', { index: stage.order, total: stages.length })}
              </span>
              <h2 className='evd-h2'>{t(stage.titleKey)}</h2>
              <StatusTag kind='stage' value={stage.status} />
              {failure ? <ToneTag tone='red'>{t('evidossierPackage.status.failed')}</ToneTag> : null}
            </div>
            <p className='evd-pkg-stageheader__desc'>{stage.descriptionKey ? t(stage.descriptionKey) : ''}</p>
          </div>
          <Button className='evd-pkg-narrow-only' size='small' icon={<IconSidebar size={14} />} onClick={onOpenContext}>
            {t('evidossierPackage.panel.openDrawer')}
          </Button>
        </div>
        <div className='evd-pkg-inputs'>
          <span className='evd-caption'>{t('evidossierPackage.stage.inputs')}</span>
          {inputRefs.length === 0 ? (
            <span className='evd-caption evd-subtle'>{t('evidossierPackage.stage.noInputs')}</span>
          ) : (
            inputRefs.map(({ ref, available }) => (
              <Tooltip
                key={ref.id}
                getPopupContainer={getPopupMount}
                content={
                  available
                    ? `${t(`evidossierCommon.materialUsage.${ref.role}`)} · ${t('evidossierCommon.common.versionNo', { number: ref.versionNumber })}`
                    : t('evidossierPackage.stage.inputUnavailable')
                }
              >
                <ToneTag tone={available ? 'neutral' : 'red'}>
                  {ref.materialName}
                  <span className='evd-caption' style={{ marginLeft: 6 }}>
                    v{ref.versionNumber}
                  </span>
                  {!available ? (
                    <span style={{ marginLeft: 4 }}>{t('evidossierPackage.status.unavailable')}</span>
                  ) : null}
                </ToneTag>
              </Tooltip>
            ))
          )}
        </div>
      </header>

      <div className='evd-pkg-scroll'>
        {draft && isDraftStage ? (
          <Banner tone='info' className='evd-mb-16' title={t('evidossierPackage.draft.workingDraftTitle')}>
            <p className='evd-mb-0'>
              {draftBaseVersion
                ? t('evidossierPackage.draft.workingDraftBase', { label: draftBaseVersion.label })
                : t('evidossierPackage.draft.workingDraftNoBase')}
            </p>
            <p className='evd-mb-0'>{t('evidossierPackage.draft.workingDraftHint')}</p>
            <p className='evd-mb-0 evd-caption'>
              {draft.changeNote} · {formatDateTime(draft.updatedAt)}
            </p>
          </Banner>
        ) : null}

        {stage.status === 'needs_review' ? (
          <Banner tone='warning' className='evd-mb-16' title={t('evidossierPackage.stage.needsReviewTitle')}>
            {stage.statusNote ?? t('evidossierPackage.stage.needsReviewText')}
          </Banner>
        ) : null}

        {failure && stage.status !== 'failed' ? (
          <Banner tone='error' className='evd-mb-16' title={t('evidossierPackage.stage.failedTitle')}>
            {failure.reason}
          </Banner>
        ) : null}

        {artifact ? (
          <>
            <div className='evd-pkg-artifact-bar'>
              <div className='evd-pkg-artifact-bar__meta'>
                <span className='evd-h3'>{t(artifactKindLabelKey(artifact.kind))}</span>
                <ToneTag>{t('evidossierPackage.artifact.revisionTag', { revision: artifact.revision })}</ToneTag>
                <StatusTag kind='artifact' value={artifact.status} />
                <DemoTag>{t('evidossierCommon.common.simulated')}</DemoTag>
                <span className='evd-caption'>
                  {formatDateTime(artifact.updatedAt)} · {artifact.updatedBy.displayName}
                </span>
              </div>
              <div className='evd-pkg-artifact-bar__actions'>
                {needsEdit ? (
                  <>
                    <Button size='small' type='primary' loading={saving} onClick={() => void saveEdit()}>
                      {t('evidossierPackage.stage.saveRevision')}
                    </Button>
                    <Button size='small' onClick={cancelEdit} disabled={saving}>
                      {t('evidossierCommon.action.cancel')}
                    </Button>
                  </>
                ) : (
                  <>
                    {canEdit ? (
                      <Button size='small' icon={<IconEdit size={14} />} onClick={startEdit}>
                        {t('evidossierCommon.action.edit')}
                      </Button>
                    ) : null}
                    {!readOnly && (artifact.status === 'pending_confirmation' || artifact.status === 'candidate') ? (
                      <Button size='small' type='primary' onClick={askConfirm}>
                        {t('evidossierCommon.action.confirmAndContinue')}
                      </Button>
                    ) : null}
                  </>
                )}
              </div>
            </div>
            {artifactReadOnly && !editing ? (
              <p className='evd-caption evd-mb-8'>
                {readOnly ? t('evidossierPackage.stage.readOnlyHint') : t('evidossierPackage.stage.supersededHint')}
              </p>
            ) : null}
            {!readOnly && artifact.status === 'confirmed' ? renderNextHint() : null}
            <p className='evd-caption evd-mb-8'>{artifact.summary}</p>
            <ArtifactEditor
              artifact={artifact}
              editing={needsEdit}
              payload={draftPayload ?? artifact.payload}
              onChange={setDraftPayload}
            />
          </>
        ) : (
          renderNoArtifact()
        )}

        {artifact && stage.status === 'failed' ? (
          <div className='evd-mt-16'>
            <Banner
              tone='error'
              title={t('evidossierPackage.stage.failedTitle')}
              actions={
                <Button
                  size='small'
                  type='primary'
                  icon={<IconRetry size={14} />}
                  loading={retrying}
                  onClick={() => void retry()}
                >
                  {t('evidossierPackage.stage.retryStage')}
                </Button>
              }
            >
              {failure?.reason ?? stage.statusNote ?? t('evidossierPackage.stage.failedUnknown')}
            </Banner>
          </div>
        ) : null}

        {allStagesCompleted && !hasVersion && canSubmit ? (
          <div className='evd-mt-24'>
            <Banner
              tone='success'
              title={t('evidossierPackage.stage.readyToSubmitTitle')}
              actions={
                <Button size='small' type='primary' onClick={onOpenSubmit}>
                  {t('evidossierCommon.action.submitVersion')}
                </Button>
              }
            >
              {t('evidossierPackage.stage.readyToSubmitText')}
            </Banner>
          </div>
        ) : null}
      </div>

      <Modal
        title={t('evidossierPackage.stage.confirmTitle')}
        visible={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onOk={() => void confirmArtifact()}
        confirmLoading={confirming}
        okText={t('evidossierCommon.action.confirmAndContinue')}
        cancelText={t('evidossierCommon.action.cancel')}
        getPopupContainer={getPopupMount}
      >
        <p className='evd-body'>{t('evidossierPackage.stage.confirmText')}</p>
        <div className='evd-pkg-dialog-section'>
          <p className='evd-pkg-dialog-section__title'>{t('evidossierPackage.stage.confirmInputs')}</p>
          {inputRefs.length === 0 ? (
            <p className='evd-caption evd-mb-0'>{t('evidossierPackage.stage.noInputs')}</p>
          ) : (
            <ul className='evd-pkg-dialog-list'>
              {inputRefs.map(({ ref, available }) => (
                <li key={ref.id}>
                  {ref.materialName}（v{ref.versionNumber}）
                  {available ? '' : ` · ${t('evidossierPackage.status.unavailable')}`}
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className='evd-pkg-dialog-hint'>{t('evidossierCommon.common.prototypeNotice')}</p>
      </Modal>
    </div>
  );
};
