/**
 * Package-level status notices: the attention banner (what the user must do now)
 * and the P008 draft-conflict comparison. Both are shared by the three task
 * kinds because the state machine is shared.
 */
import { Button } from '@arco-design/web-react';
import React, { useState } from 'react';
import type { PackageWorkspace } from '../../domain/types';
import type { DraftConflictResolution } from '../../data/repository';
import { Banner, StatusTag, ToneTag, formatDateTime, useEvidT } from '../../design/primitives';
import { IconWarning } from '../../design/icons';
import { summarizeArtifact } from './ArtifactEditors';

type AttentionBannerProps = {
  workspace: PackageWorkspace;
  onRetry: () => Promise<boolean>;
  onResume: () => Promise<boolean>;
  onScrollToConflict: () => void;
  /** Review/comparison workbenches show their own candidate banner. */
  suppressAwaiting?: boolean;
};

export const AttentionBanner: React.FC<AttentionBannerProps> = ({
  workspace,
  onRetry,
  onResume,
  onScrollToConflict,
  suppressAwaiting,
}) => {
  const t = useEvidT();
  const [busy, setBusy] = useState<'retry' | 'resume' | null>(null);
  const pkg = workspace.pkg;
  const conflict = pkg.currentDraft?.conflict;
  const execution = workspace.execution;

  if (conflict) {
    return (
      <Banner
        tone='error'
        title={t('evidossierPackage.notice.conflictTitle')}
        actions={
          <Button size='small' onClick={onScrollToConflict}>
            {t('evidossierPackage.notice.handleConflict')}
          </Button>
        }
      >
        {conflict.message || t('evidossierPackage.notice.conflictText')}
      </Banner>
    );
  }

  if (pkg.status === 'failed') {
    return (
      <Banner
        tone='error'
        title={t('evidossierPackage.notice.failedTitle')}
        actions={
          <Button
            size='small'
            type='primary'
            loading={busy === 'retry'}
            onClick={() => {
              setBusy('retry');
              void onRetry().finally(() => setBusy(null));
            }}
          >
            {t('evidossierPackage.stage.retryStage')}
          </Button>
        }
      >
        <p className='evd-mb-0'>{pkg.attentionNote ?? t('evidossierPackage.notice.failedText')}</p>
        {execution?.failure ? (
          <>
            <p className='evd-mb-0'>{execution.failure.reason}</p>
            <p className='evd-mb-0 evd-caption'>{execution.failure.preservedNote}</p>
          </>
        ) : null}
      </Banner>
    );
  }

  if (pkg.status === 'paused') {
    return (
      <Banner
        tone='warning'
        title={t('evidossierPackage.notice.pausedTitle')}
        actions={
          <Button
            size='small'
            type='primary'
            loading={busy === 'resume'}
            onClick={() => {
              setBusy('resume');
              void onResume().finally(() => setBusy(null));
            }}
          >
            {t('evidossierCommon.action.resume')}
          </Button>
        }
      >
        {pkg.attentionNote ?? execution?.pausedNote ?? t('evidossierPackage.notice.pausedText')}
      </Banner>
    );
  }

  if (pkg.status === 'awaiting_user' && pkg.attentionNote && !suppressAwaiting) {
    return (
      <Banner tone='warning' title={t('evidossierPackage.notice.awaitingTitle')}>
        {pkg.attentionNote}
      </Banner>
    );
  }

  if (pkg.status === 'pending_supplement') {
    return (
      <Banner tone='warning' title={t('evidossierPackage.notice.pendingSupplementTitle')}>
        {pkg.attentionNote ?? t('evidossierPackage.notice.pendingSupplementText')}
      </Banner>
    );
  }

  return null;
};

type ConflictPanelProps = {
  workspace: PackageWorkspace;
  resolving: DraftConflictResolution | null;
  onResolve: (resolution: DraftConflictResolution) => void;
};

const ConflictArtifactColumn: React.FC<{
  title: string;
  artifactId: string;
  workspace: PackageWorkspace;
}> = ({ title, artifactId, workspace }) => {
  const t = useEvidT();
  const artifact = workspace.artifacts.find((item) => item.id === artifactId);
  const lines = artifact ? summarizeArtifact(artifact).slice(0, 8) : [];
  return (
    <div className='evd-pkg-conflict__col'>
      <div className='evd-pkg-conflict__colhead'>
        <span className='evd-h3'>{title}</span>
        {artifact ? (
          <>
            <ToneTag>{t('evidossierPackage.artifact.revisionTag', { revision: artifact.revision })}</ToneTag>
            <StatusTag kind='artifact' value={artifact.status} />
          </>
        ) : null}
      </div>
      {artifact ? (
        <>
          <p className='evd-caption' style={{ margin: '0 0 6px' }}>
            {artifact.summary} · {formatDateTime(artifact.updatedAt)}
          </p>
          <ul className='evd-pkg-conflict__lines'>
            {lines.map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ul>
          {artifact.kind === 'outline' ? (
            <p className='evd-caption' style={{ margin: '6px 0 0' }}>
              {t('evidossierPackage.conflict.outlineHint')}
            </p>
          ) : null}
        </>
      ) : (
        <p className='evd-caption evd-mb-0'>{t('evidossierPackage.status.unavailable')}</p>
      )}
    </div>
  );
};

export const ConflictPanel: React.FC<ConflictPanelProps> = ({ workspace, resolving, onResolve }) => {
  const t = useEvidT();
  const conflict = workspace.pkg.currentDraft?.conflict;
  if (!conflict) return null;
  const bothAvailable =
    workspace.artifacts.some((item) => item.id === conflict.userArtifactId) &&
    workspace.artifacts.some((item) => item.id === conflict.candidateArtifactId);

  return (
    <div className='evd-pkg-conflict' id='evd-pkg-conflict'>
      <div className='evd-pkg-conflict__head'>
        <span style={{ color: 'var(--evd-error)', marginTop: 2 }}>
          <IconWarning size={16} />
        </span>
        <div className='evd-flex-1'>
          <p className='evd-banner__title'>{t('evidossierPackage.conflict.title')}</p>
          <p className='evd-caption' style={{ margin: '2px 0 0' }}>
            {conflict.message} · {formatDateTime(conflict.detectedAt)}
          </p>
          <p className='evd-caption' style={{ margin: '2px 0 0' }}>
            {t('evidossierPackage.conflict.text')}
          </p>
        </div>
      </div>
      <div className='evd-pkg-conflict__grid'>
        <ConflictArtifactColumn
          title={t('evidossierPackage.conflict.userSide')}
          artifactId={conflict.userArtifactId}
          workspace={workspace}
        />
        <ConflictArtifactColumn
          title={t('evidossierPackage.conflict.candidateSide')}
          artifactId={conflict.candidateArtifactId}
          workspace={workspace}
        />
      </div>
      <div className='evd-pkg-conflict__actions'>
        <Button
          type='primary'
          loading={resolving === 'keep_user'}
          disabled={!bothAvailable}
          onClick={() => onResolve('keep_user')}
        >
          {t('evidossierCommon.action.keepMine')}
        </Button>
        <Button
          loading={resolving === 'keep_candidate'}
          disabled={!bothAvailable}
          onClick={() => onResolve('keep_candidate')}
        >
          {t('evidossierCommon.action.keepCandidate')}
        </Button>
        <Button loading={resolving === 'rerun'} disabled={!bothAvailable} onClick={() => onResolve('rerun')}>
          {t('evidossierCommon.action.rerun')}
        </Button>
        <span className='evd-caption'>{t('evidossierPackage.conflict.blockSubmitHint')}</span>
      </div>
    </div>
  );
};
