/**
 * Shared delivery package header: breadcrumbs, package identity, the exact
 * version in force and the actions that move the package forward. The three
 * task kinds share this header; only the primary action and the body differ.
 */
import { Button, Dropdown, Tooltip } from '@arco-design/web-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PackageVersion, PackageWorkspace } from '../../domain/types';
import { DemoTag, MonoId, PageHeader, StatusTag, ToneTag, formatDateTime, useEvidT } from '../../design/primitives';
import { IconChevronDown, IconEdit, IconGraph, IconMore } from '../../design/icons';
import { getPopupMount } from './packageSupport';

export type DemoAction = 'pause' | 'resume' | 'retry' | 'simulateFailure';

type PackageHeaderProps = {
  workspace: PackageWorkspace;
  canSubmit: boolean;
  submitLabel: string;
  submitBlockedReason?: string;
  draftBaseVersion?: PackageVersion;
  onRename: () => void;
  onContinueEditing: (baseVersionId?: string) => void;
  onSubmit: () => void;
  onDemoAction: (action: DemoAction) => void;
};

type DemoItem = {
  key: DemoAction;
  label: string;
  enabled: boolean;
  reason: string;
};

export const PackageHeader: React.FC<PackageHeaderProps> = ({
  workspace,
  canSubmit,
  submitLabel,
  submitBlockedReason,
  draftBaseVersion,
  onRename,
  onContinueEditing,
  onSubmit,
  onDemoAction,
}) => {
  const t = useEvidT();
  const navigate = useNavigate();
  const [demoOpen, setDemoOpen] = useState(false);

  const { pkg, project, task, currentVersion, execution, stages } = workspace;
  const kind = task.kind;
  const isDelivered = pkg.status === 'delivered';
  const draft = pkg.currentDraft;

  const running = execution?.status === 'running';
  const paused = execution?.status === 'paused';
  const hasFailedStage = stages.some((stage) => stage.status === 'failed');

  const demoItems: DemoItem[] = [
    {
      key: 'pause',
      label: t('evidossierPackage.header.demoPause'),
      enabled: running,
      reason: t('evidossierPackage.header.demoPauseReason'),
    },
    {
      key: 'resume',
      label: t('evidossierPackage.header.demoResume'),
      enabled: paused,
      reason: t('evidossierPackage.header.demoResumeReason'),
    },
    {
      key: 'retry',
      label: t('evidossierPackage.header.demoRetry'),
      enabled: hasFailedStage,
      reason: t('evidossierPackage.header.demoRetryReason'),
    },
    {
      key: 'simulateFailure',
      label: t('evidossierPackage.header.demoFailure'),
      enabled: running,
      reason: t('evidossierPackage.header.demoFailureReason'),
    },
  ];

  const demoMenu = (
    <div className='evd-pkg-demo-menu'>
      <p className='evd-caption evd-pkg-demo-menu__hint'>{t('evidossierPackage.header.demoHint')}</p>
      {demoItems.map((item) => (
        <div className='evd-pkg-demo-menu__item' key={item.key}>
          <Tooltip content={item.reason} disabled={item.enabled} getPopupContainer={getPopupMount}>
            <span className='evd-pkg-demo-menu__wrap'>
              <Button
                type='text'
                size='small'
                disabled={!item.enabled}
                onClick={() => {
                  setDemoOpen(false);
                  onDemoAction(item.key);
                }}
              >
                {item.label}
              </Button>
            </span>
          </Tooltip>
        </div>
      ))}
    </div>
  );

  const renderPrimary = (): React.ReactNode => {
    if (canSubmit) {
      return (
        <Button type='primary' onClick={onSubmit}>
          {submitLabel}
        </Button>
      );
    }
    if (isDelivered) {
      if (kind === 'generate') {
        return (
          <Button type='primary' onClick={() => onContinueEditing()}>
            {t('evidossierCommon.action.continueEdit')}
          </Button>
        );
      }
      if (currentVersion) {
        return (
          <Button
            type='primary'
            onClick={() => navigate(`/evidossier/packages/${pkg.id}/versions/${currentVersion.id}`)}
          >
            {t('evidossierPackage.header.viewReportVersion')}
          </Button>
        );
      }
      return null;
    }
    return (
      <Tooltip
        content={submitBlockedReason ?? t('evidossierPackage.header.submitNotReady')}
        getPopupContainer={getPopupMount}
      >
        <span>
          <Button type='primary' disabled>
            {submitLabel}
          </Button>
        </span>
      </Tooltip>
    );
  };

  return (
    <PageHeader
      crumbs={[
        { label: t('evidossierCommon.nav.home'), onClick: () => navigate('/evidossier') },
        { label: project.name, onClick: () => navigate(`/evidossier/projects/${project.id}`) },
        { label: pkg.code },
      ]}
      title={
        <span className='evd-pkg-title-row'>
          <span>{pkg.title}</span>
          <MonoId>{pkg.code}</MonoId>
          <ToneTag tone='neutral'>{t(`evidossierCommon.taskKind.${kind}`)}</ToneTag>
          <StatusTag kind='package' value={pkg.status} dot />
          <DemoTag>{t('evidossierCommon.demo.chip')}</DemoTag>
        </span>
      }
      description={task.goal}
      meta={
        <div className='evd-pkg-meta'>
          <span className='evd-pkg-meta__item'>
            {t('evidossierPackage.header.project')} <strong>{project.name}</strong>
            <span className='evd-subtle'>{project.code}</span>
          </span>
          <span className='evd-pkg-meta__item'>
            {t('evidossierCommon.common.currentVersion')}{' '}
            {currentVersion ? (
              <span className='evd-version evd-version--current'>{currentVersion.label}</span>
            ) : (
              <span className='evd-subtle'>{t('evidossierPackage.header.noVersion')}</span>
            )}
          </span>
          {draft ? (
            <span className='evd-pkg-meta__item'>
              <ToneTag tone='yellow'>{t('evidossierCommon.common.workingDraft')}</ToneTag>
              {draftBaseVersion ? (
                <span className='evd-version evd-version--readonly'>{draftBaseVersion.label}</span>
              ) : null}
            </span>
          ) : null}
          <span className='evd-pkg-meta__item'>
            {t('evidossierCommon.common.updatedAt')} {formatDateTime(pkg.updatedAt)}
          </span>
          {pkg.attentionNote ? (
            <span className='evd-pkg-meta__item evd-truncate' style={{ maxWidth: 520 }}>
              {pkg.attentionNote}
            </span>
          ) : null}
        </div>
      }
      actions={
        <>
          <Button size='small' icon={<IconEdit size={14} />} onClick={onRename}>
            {t('evidossierCommon.action.rename')}
          </Button>
          <Button
            size='small'
            icon={<IconGraph size={14} />}
            onClick={() => navigate(`/evidossier/projects/${project.id}/graph`)}
          >
            {t('evidossierCommon.nav.graph')}
          </Button>
          <Dropdown
            droplist={demoMenu}
            trigger='click'
            position='br'
            popupVisible={demoOpen}
            onVisibleChange={setDemoOpen}
            getPopupContainer={getPopupMount}
          >
            <Button size='small' icon={<IconMore size={14} />}>
              {t('evidossierPackage.header.demoControls')} <IconChevronDown size={12} />
            </Button>
          </Dropdown>
          {renderPrimary()}
        </>
      }
    />
  );
};
