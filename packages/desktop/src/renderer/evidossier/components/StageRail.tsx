/**
 * Shared stage navigation and execution status bar for the three workbenches.
 * The rail answers "where is this task now, what is already done, and what
 * needs my decision" without turning the conversation into the task ledger.
 */
import { Button, Popconfirm, Tooltip } from '@arco-design/web-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ArtifactPackage, ExecutionRun, Stage } from '../domain/types';
import { useEvidossier } from '../data/EvidossierProvider';
import { StatusTag, RowButton } from '../design/primitives';
import { IconPause, IconPlay, IconRetry, IconWarning } from '../design/icons';

const stageStateTone = (status: Stage['status']): 'neutral' | 'blue' | 'green' | 'yellow' | 'red' | 'outline' => {
  switch (status) {
    case 'running':
      return 'blue';
    case 'awaiting_confirmation':
    case 'needs_review':
      return 'yellow';
    case 'completed':
      return 'green';
    case 'failed':
      return 'red';
    default:
      return 'outline';
  }
};

const stageIndexLabel = (status: Stage['status'], order: number): string => {
  if (status === 'completed') return '✓';
  if (status === 'failed') return '!';
  return String(order);
};

export const StageRail: React.FC<{
  pkg: ArtifactPackage;
  stages: Stage[];
  activeStageKey?: string;
  onSelectStage: (stage: Stage) => void;
  className?: string;
}> = ({ pkg, stages, activeStageKey, onSelectStage, className }) => {
  const { t } = useTranslation();
  const current = stages.find((stage) => stage.status === 'running' || stage.status === 'awaiting_confirmation');
  const completed = stages.filter((stage) => stage.status === 'completed').length;

  return (
    <div
      className={['evd-stagerail', className].filter(Boolean).join(' ')}
      aria-label={t('evidossierCommon.common.status')}
    >
      <div className='evd-stagerail__head'>
        <div className='evd-row evd-row--between'>
          <span className='evd-h4'>{t('evidossierCommon.common.stageResults')}</span>
          <span className='evd-caption'>
            {completed}/{stages.length}
          </span>
        </div>
        <div className='evd-caption evd-mt-8'>
          {current
            ? t(
                current.status === 'awaiting_confirmation'
                  ? 'evidossierCommon.status.stage.awaiting_confirmation'
                  : 'evidossierCommon.status.stage.running'
              )
            : pkg.status === 'delivered'
              ? t('evidossierCommon.status.package.delivered')
              : t('evidossierCommon.common.pending')}
        </div>
      </div>
      <div role='tablist' aria-label={t('evidossierCommon.common.stageResults')}>
        {stages.map((stage) => {
          const active = stage.key === activeStageKey;
          const disabled = stage.status === 'not_started';
          return (
            <RowButton
              key={stage.id}
              className='evd-stage'
              active={active}
              disabled={disabled}
              ariaLabel={t(stage.titleKey)}
              onClick={() => onSelectStage(stage)}
              title={disabled ? t('evidossierCommon.common.pending') : t(stage.titleKey)}
            >
              <span className='evd-stage__index'>{stageIndexLabel(stage.status, stage.order)}</span>
              <span className='evd-stage__body'>
                <span className='evd-stage__title'>{t(stage.titleKey)}</span>
                <span className='evd-stage__meta'>{stage.statusNote ?? t(stage.descriptionKey)}</span>
                <span className='evd-stage__state'>
                  <span className={`evd-tag evd-tag--${stageStateTone(stage.status)}`}>
                    {t(`evidossierCommon.status.stage.${stage.status}`)}
                  </span>
                </span>
              </span>
            </RowButton>
          );
        })}
      </div>
    </div>
  );
};

export const ExecutionBar: React.FC<{
  pkg: ArtifactPackage;
  execution?: ExecutionRun;
  compact?: boolean;
}> = ({ pkg, execution, compact }) => {
  const { t } = useTranslation();
  const { actions } = useEvidossier();
  if (!execution) return null;

  const running = execution.status === 'running';
  const paused = execution.status === 'paused';
  const failed = execution.status === 'failed';

  return (
    <div
      className='evd-row'
      style={{
        gap: 12,
        padding: compact ? '8px 12px' : '10px 16px',
        border: '1px solid var(--evd-hairline)',
        borderLeft: `3px solid ${
          failed
            ? 'var(--evd-error)'
            : running
              ? 'var(--evd-blue)'
              : paused
                ? 'var(--evd-warning)'
                : 'var(--evd-hairline)'
        }`,
        background: failed ? 'var(--evd-error-bg)' : 'var(--evd-canvas)',
        flexWrap: 'wrap',
      }}
      role='status'
    >
      <StatusTag kind='execution' value={execution.status} dot />
      <span className='evd-body evd-flex-1' style={{ minWidth: 160 }}>
        {execution.activity}
      </span>
      {execution.pausedNote ? <span className='evd-caption'>{execution.pausedNote}</span> : null}
      {execution.failure ? (
        <Tooltip content={execution.failure.reason}>
          <span className='evd-caption' style={{ color: 'var(--evd-error)' }}>
            <IconWarning size={12} /> {execution.failure.preservedNote}
          </span>
        </Tooltip>
      ) : null}
      <span className='evd-row' style={{ gap: 6 }}>
        {running ? (
          <Button size='small' icon={<IconPause size={14} />} onClick={() => void actions.pauseExecution(pkg.id)}>
            {t('evidossierCommon.action.pause')}
          </Button>
        ) : null}
        {paused ? (
          <Button
            size='small'
            type='primary'
            icon={<IconPlay size={14} />}
            onClick={() => void actions.resumeExecution(pkg.id)}
          >
            {t('evidossierCommon.action.resume')}
          </Button>
        ) : null}
        {failed ? (
          <>
            <Popconfirm
              title={t('evidossierCommon.action.retry')}
              content={t('evidossierCommon.common.prototypeNotice')}
              onOk={() => void actions.retryStage(pkg.id)}
            >
              <Button size='small' type='primary' icon={<IconRetry size={14} />}>
                {t('evidossierCommon.action.retry')}
              </Button>
            </Popconfirm>
          </>
        ) : null}
        {running ? (
          <Button
            size='small'
            type='text'
            onClick={() => void actions.simulateFailure(pkg.id)}
            title={t('evidossierCommon.demo.chip')}
          >
            {t('evidossierCommon.common.simulated')}失败
          </Button>
        ) : null}
      </span>
    </div>
  );
};
