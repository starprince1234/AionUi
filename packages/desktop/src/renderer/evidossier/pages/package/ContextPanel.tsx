/**
 * Right-hand context panel of the generate workbench.
 *
 * Four fixed tabs keep the package-level context out of the artifact area:
 * conversation, every stage result (including superseded revisions), the formal
 * version history and the semantic source relations. The same component is
 * reused inside the narrow-screen drawer.
 */
import { Button } from '@arco-design/web-react';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PackageRelation, PackageWorkspace, VersionRef } from '../../domain/types';
import { getVersion } from '../../data/selectors';
import { useEvidossier } from '../../data/EvidossierProvider';
import { ConversationPanel } from '../../components/ConversationPanel';
import { EmptyState, RowButton, StatusTag, ToneTag, formatDateTime, useEvidT } from '../../design/primitives';
import { IconArrowRight, IconChevronRight, IconGraph } from '../../design/icons';
import { artifactKindLabelKey } from './ArtifactEditors';

type ContextTab = 'conversation' | 'artifacts' | 'versions' | 'relations';

type ContextPanelProps = {
  workspace: PackageWorkspace;
  variant: 'panel' | 'drawer';
  onOpenStage: (stageKey: string) => void;
  onContinueEditing: (baseVersionId: string) => void;
  highlightedVersionId?: string;
};

type RelationSectionProps = {
  title: string;
  relations: PackageRelation[];
  incoming: boolean;
  onOpenVersion: (versionId: string, packageId: string) => void;
  historyAvailable: (versionId: string) => boolean;
};

const RelationRow: React.FC<{
  relation: PackageRelation;
  incoming: boolean;
  onOpenVersion: (versionId: string, packageId: string) => void;
  historyAvailable: (versionId: string) => boolean;
}> = ({ relation, incoming, onOpenVersion, historyAvailable }) => {
  const t = useEvidT();
  const other: VersionRef = incoming ? relation.source : relation.target;
  const available = historyAvailable(other.versionId);
  return (
    <RowButton
      className='evd-listlink'
      disabled={!available}
      onClick={() => onOpenVersion(other.versionId, other.packageId)}
      title={available ? t('evidossierCommon.action.openVersion') : t('evidossierPackage.status.unavailable')}
    >
      <div className='evd-pkg-listrow__main'>
        <span className='evd-pkg-listrow__title'>
          {other.packageCode} · {other.packageTitle}
        </span>
        <span className='evd-pkg-relation-sentence'>
          <span className='evd-version'>{relation.source.versionLabel}</span>
          <IconArrowRight size={12} />
          <span className='evd-version'>{relation.target.versionLabel}</span>
          <ToneTag tone='outline'>{t(`evidossierCommon.relation.${relation.type}`)}</ToneTag>
        </span>
        <span className='evd-pkg-listrow__sub'>
          {t(`evidossierCommon.taskKind.${other.taskKind}`)} · {formatDateTime(relation.createdAt)}
        </span>
        {relation.scopeNote ? <span className='evd-pkg-listrow__sub'>{relation.scopeNote}</span> : null}
        {!available ? (
          <span className='evd-pkg-listrow__sub'>
            <ToneTag tone='red'>{t('evidossierPackage.status.unavailable')}</ToneTag>
          </span>
        ) : null}
      </div>
      <span className='evd-pkg-listrow__side'>
        <IconChevronRight size={12} />
      </span>
    </RowButton>
  );
};

const RelationSection: React.FC<RelationSectionProps> = ({
  title,
  relations,
  incoming,
  onOpenVersion,
  historyAvailable,
}) => {
  const t = useEvidT();
  return (
    <section className='evd-pkg-panel-section'>
      <p className='evd-pkg-panel-section__title'>{title}</p>
      {relations.length === 0 ? (
        <p className='evd-caption evd-mb-0'>{t('evidossierPackage.panel.noRelations')}</p>
      ) : (
        relations.map((relation) => (
          <RelationRow
            key={relation.id}
            relation={relation}
            incoming={incoming}
            onOpenVersion={onOpenVersion}
            historyAvailable={historyAvailable}
          />
        ))
      )}
    </section>
  );
};

export const ContextPanel: React.FC<ContextPanelProps> = ({
  workspace,
  variant,
  onOpenStage,
  onContinueEditing,
  highlightedVersionId,
}) => {
  const t = useEvidT();
  const navigate = useNavigate();
  const { snapshot, actions } = useEvidossier();
  const [tab, setTab] = useState<ContextTab>('conversation');

  const pkg = workspace.pkg;
  const versions = workspace.versions;
  const latestVersion = versions.length > 0 ? versions[versions.length - 1] : undefined;
  const relations = useMemo(
    () => [...workspace.incomingRelations, ...workspace.outgoingRelations],
    [workspace.incomingRelations, workspace.outgoingRelations]
  );

  const tabs: Array<{ key: ContextTab; label: string; count: number }> = [
    { key: 'conversation', label: t('evidossierPackage.panel.tabConversation'), count: workspace.messages.length },
    { key: 'artifacts', label: t('evidossierPackage.panel.tabArtifacts'), count: workspace.artifacts.length },
    { key: 'versions', label: t('evidossierPackage.panel.tabVersions'), count: versions.length },
    { key: 'relations', label: t('evidossierPackage.panel.tabRelations'), count: relations.length },
  ];

  const historyAvailable = (versionId: string): boolean => Boolean(snapshot && getVersion(snapshot, versionId));

  const openVersion = (versionId: string, packageId: string): void => {
    navigate(`/evidossier/packages/${packageId}/versions/${versionId}`);
  };

  const renderConversation = (): React.ReactNode => (
    <div className='evd-pkg-panel-conv'>
      <ConversationPanel
        messages={workspace.messages}
        onSend={(text) => actions.sendMessage(pkg.id, text)}
        executionRunning={workspace.execution?.status === 'running'}
        placeholder={t('evidossierPackage.panel.conversationPlaceholder')}
        emptyTitle={t('evidossierPackage.panel.conversationEmptyTitle')}
        emptyText={t('evidossierPackage.panel.conversationEmptyText')}
        compact
      />
    </div>
  );

  const renderArtifacts = (): React.ReactNode => (
    <div className='evd-pkg-panel-scroll'>
      {workspace.artifacts.length === 0 ? (
        <EmptyState
          title={t('evidossierPackage.panel.artifactsEmptyTitle')}
          text={t('evidossierPackage.panel.artifactsEmptyText')}
        />
      ) : (
        workspace.artifacts.map((artifact) => {
          const stage = workspace.stages.find((item) => item.id === artifact.stageId);
          return (
            <RowButton
              key={artifact.id}
              className='evd-listlink'
              disabled={!stage}
              onClick={() => (stage ? onOpenStage(stage.key) : undefined)}
              title={stage ? t(stage.titleKey) : t('evidossierPackage.status.unavailable')}
            >
              <div className='evd-pkg-listrow__main'>
                <span className='evd-pkg-listrow__title'>{t(artifactKindLabelKey(artifact.kind))}</span>
                <span className='evd-pkg-listrow__sub'>
                  {stage ? t(stage.titleKey) : t('evidossierPackage.status.unavailable')} ·{' '}
                  {formatDateTime(artifact.updatedAt)}
                </span>
                <span className='evd-pkg-listrow__sub'>{artifact.summary}</span>
              </div>
              <span className='evd-pkg-listrow__side'>
                <ToneTag>{t('evidossierPackage.artifact.revisionTag', { revision: artifact.revision })}</ToneTag>
                <StatusTag kind='artifact' value={artifact.status} />
              </span>
            </RowButton>
          );
        })
      )}
    </div>
  );

  const renderVersions = (): React.ReactNode => (
    <div className='evd-pkg-panel-scroll'>
      {versions.length === 0 ? (
        <EmptyState
          title={t('evidossierPackage.panel.versionsEmptyTitle')}
          text={t('evidossierPackage.panel.versionsEmptyText')}
        />
      ) : (
        versions
          .slice()
          .reverse()
          .map((version) => {
            const baseVersion = version.baseVersionId
              ? versions.find((candidate) => candidate.id === version.baseVersionId)
              : undefined;
            const isNew = version.id === highlightedVersionId;
            return (
              <RowButton
                key={version.id}
                className={`evd-listlink${isNew ? ' evd-pkg-version-row--new' : ''}`}
                onClick={() => openVersion(version.id, version.packageId)}
                title={t('evidossierCommon.action.openVersion')}
              >
                <div className='evd-pkg-listrow__main'>
                  <span className='evd-pkg-listrow__title'>
                    <span className={`evd-version${version.id === latestVersion?.id ? ' evd-version--current' : ''}`}>
                      {version.label}
                    </span>
                    {version.id === latestVersion?.id ? (
                      <span style={{ marginLeft: 8 }}>
                        <ToneTag tone='blue'>{t('evidossierCommon.common.current')}</ToneTag>
                      </span>
                    ) : null}
                    {version.id === highlightedVersionId ? (
                      <span style={{ marginLeft: 8 }}>
                        <ToneTag tone='green'>{t('evidossierPackage.panel.newVersion')}</ToneTag>
                      </span>
                    ) : null}
                  </span>
                  <span className='evd-pkg-listrow__sub'>
                    {formatDateTime(version.createdAt)} · {version.changeNote}
                  </span>
                  {baseVersion ? (
                    <span className='evd-pkg-listrow__sub'>
                      {t('evidossierPackage.panel.basedOnVersion', { label: baseVersion.label })}
                    </span>
                  ) : null}
                </div>
                <span className='evd-pkg-listrow__side'>
                  <StatusTag kind='version' value={version.status} />
                </span>
              </RowButton>
            );
          })
      )}
      {latestVersion ? (
        <div className='evd-mt-16'>
          <Button
            size='small'
            type='primary'
            onClick={() => onContinueEditing(latestVersion.id)}
            title={t('evidossierCommon.action.continueEdit')}
          >
            {t('evidossierPackage.panel.continueFromLatest')}
          </Button>
        </div>
      ) : null}
    </div>
  );

  const renderRelations = (): React.ReactNode => (
    <div className='evd-pkg-panel-scroll'>
      <RelationSection
        title={t('evidossierCommon.relation.incoming')}
        relations={workspace.incomingRelations}
        incoming
        onOpenVersion={openVersion}
        historyAvailable={historyAvailable}
      />
      <RelationSection
        title={t('evidossierCommon.relation.outgoing')}
        relations={workspace.outgoingRelations}
        incoming={false}
        onOpenVersion={openVersion}
        historyAvailable={historyAvailable}
      />
      <Button
        size='small'
        className='evd-mt-16'
        icon={<IconGraph size={14} />}
        onClick={() => navigate(`/evidossier/projects/${pkg.projectId}/graph`)}
      >
        {t('evidossierCommon.relation.viewGraph')}
      </Button>
    </div>
  );

  return (
    <div className={`evd-pkg-ctx${variant === 'drawer' ? ' evd-pkg-ctx--drawer' : ''}`}>
      <div className='evd-panel-tabs evd-pkg-panel-tabs'>
        {tabs.map((item) => (
          <RowButton
            key={item.key}
            className='evd-panel-tab'
            active={tab === item.key}
            onClick={() => setTab(item.key)}
            ariaLabel={item.label}
          >
            <span>{item.label}</span>
            <span className='evd-pkg-tab-count'>{item.count}</span>
          </RowButton>
        ))}
      </div>
      <div className='evd-pkg-panel-body'>
        {tab === 'conversation' ? renderConversation() : null}
        {tab === 'artifacts' ? renderArtifacts() : null}
        {tab === 'versions' ? renderVersions() : null}
        {tab === 'relations' ? renderRelations() : null}
      </div>
    </div>
  );
};

export type { ContextTab };
export type { ContextPanelProps };
