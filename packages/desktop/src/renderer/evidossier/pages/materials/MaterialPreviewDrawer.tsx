/**
 * Material preview drawer.
 *
 * Shows material metadata, the parse status and — only when the current
 * version really is readable — the structured document. Failed, pending and
 * parsing versions never render content; instead they explain why.
 */
import { Button, Drawer, Message } from '@arco-design/web-react';
import React from 'react';
import { DocumentView } from '../../components/DocumentView';
import { useEvidossier } from '../../data/EvidossierProvider';
import { getPackage } from '../../data/selectors';
import type { Material } from '../../domain/types';
import {
  Banner,
  MetaList,
  Section,
  StatusTag,
  ToneTag,
  formatBytes,
  formatDateTime,
  useEvidT,
} from '../../design/primitives';
import { currentVersionOf, isReadableVersion } from './materialMeta';

type UnreadableNotice = { tone: 'error' | 'warning'; title: string; text: string };

export const MaterialPreviewDrawer: React.FC<{
  material: Material | null;
  onClose: () => void;
}> = ({ material, onClose }) => {
  const t = useEvidT();
  const { snapshot, actions } = useEvidossier();
  const version = material ? currentVersionOf(material) : undefined;
  const readable = isReadableVersion(version);
  const versions = material ? material.versions.toSorted((a, b) => b.version - a.version) : [];
  const generatedBy =
    snapshot && material?.generatedByPackageId ? getPackage(snapshot, material.generatedByPackageId) : undefined;

  const handleSimulate = async (outcome: 'parsed' | 'failed'): Promise<void> => {
    if (!material) return;
    const updated = await actions.setMaterialParseOutcome(material.id, outcome);
    if (updated) {
      Message.success(
        outcome === 'parsed'
          ? t('evidossierProjects.materials.drawer.simulateParsedDone')
          : t('evidossierProjects.materials.drawer.simulateFailedDone')
      );
    }
  };

  const unreadableNotice = ((): UnreadableNotice | null => {
    if (!version) return null;
    switch (version.parseStatus) {
      case 'failed':
        return {
          tone: 'error',
          title: t('evidossierProjects.materials.drawer.failedTitle'),
          text: t('evidossierProjects.materials.drawer.failedText'),
        };
      case 'parsing':
        return {
          tone: 'warning',
          title: t('evidossierProjects.materials.drawer.pendingTitle'),
          text: t('evidossierProjects.materials.drawer.parsingText'),
        };
      case 'pending':
        return {
          tone: 'warning',
          title: t('evidossierProjects.materials.drawer.pendingTitle'),
          text: t('evidossierProjects.materials.drawer.pendingText'),
        };
      default:
        return {
          tone: 'warning',
          title: t('evidossierProjects.materials.drawer.pendingTitle'),
          text: t('evidossierProjects.materials.drawer.noDocumentText'),
        };
    }
  })();

  return (
    <Drawer
      title={material ? material.name : t('evidossierProjects.materials.drawer.title')}
      visible={material !== null}
      onCancel={onClose}
      width={720}
      unmountOnExit
      footer={
        <div className='evd-row' style={{ justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>{t('evidossierProjects.materials.drawer.close')}</Button>
        </div>
      }
    >
      {material ? (
        <div className='evd-stack evd-stack--lg'>
          <MetaList
            items={[
              {
                label: t('evidossierProjects.materials.drawer.metaKind'),
                value: t(`evidossierCommon.materialKind.${material.kind}`),
              },
              {
                label: t('evidossierProjects.materials.drawer.metaUsage'),
                value: t(`evidossierCommon.materialUsage.${material.usage}`),
              },
              {
                label: t('evidossierProjects.materials.drawer.metaOrigin'),
                value: (
                  <ToneTag tone={material.origin === 'generated' ? 'blue' : 'neutral'}>
                    {t(`evidossierCommon.materialOrigin.${material.origin}`)}
                  </ToneTag>
                ),
              },
              {
                label: t('evidossierProjects.materials.drawer.metaVersion'),
                value: version
                  ? t('evidossierProjects.materials.versionSingle', { number: version.version })
                  : t('evidossierCommon.common.none'),
              },
              {
                label: t('evidossierProjects.materials.drawer.metaFileName'),
                value: version?.fileName ?? material.name,
              },
              {
                label: t('evidossierProjects.materials.drawer.metaSize'),
                value: version ? formatBytes(version.sizeBytes) : t('evidossierCommon.common.unknown'),
              },
              {
                label: t('evidossierProjects.materials.drawer.metaAdded'),
                value: formatDateTime(material.addedAt),
              },
              {
                label: t('evidossierProjects.materials.drawer.metaUpdated'),
                value: formatDateTime(material.updatedAt),
              },
              ...(generatedBy
                ? [
                    {
                      label: t('evidossierCommon.common.createdBy'),
                      value: `${generatedBy.code} · ${generatedBy.title}`,
                    },
                  ]
                : []),
            ]}
          />

          <div>
            <div className='evd-label evd-mb-8'>{t('evidossierProjects.materials.drawer.metaUsageNote')}</div>
            <p className='evd-body evd-mb-0'>
              {material.usageNote ?? t('evidossierProjects.materials.drawer.noUsageNote')}
            </p>
          </div>

          <Section title={t('evidossierProjects.materials.drawer.parseTitle')}>
            <div className='evd-row' style={{ gap: 8, flexWrap: 'wrap' }}>
              {version ? <StatusTag kind='parse' value={version.parseStatus} /> : null}
              {version?.parseNote ? <span className='evd-body evd-muted'>{version.parseNote}</span> : null}
            </div>
            {readable && version?.parseStatus === 'partial' ? (
              <Banner tone='warning' title={t('evidossierProjects.materials.drawer.partialTitle')} className='evd-mt-8'>
                {t('evidossierProjects.materials.drawer.partialText')}
              </Banner>
            ) : null}
            {!readable && unreadableNotice ? (
              <Banner tone={unreadableNotice.tone} title={unreadableNotice.title} className='evd-mt-8'>
                {unreadableNotice.text}
              </Banner>
            ) : null}
          </Section>

          {readable && version?.document ? (
            <div className='evd-card evd-proj-drawer__doc'>
              <DocumentView document={version.document} />
            </div>
          ) : null}

          <Section title={t('evidossierProjects.materials.drawer.versionHistory')}>
            <div className='evd-card'>
              {versions.map((item) => (
                <div className='evd-proj-version-row' key={item.id}>
                  <span className='evd-version'>
                    {t('evidossierProjects.materials.versionSingle', { number: item.version })}
                  </span>
                  <span className='evd-caption evd-truncate'>
                    {item.fileName} · {formatBytes(item.sizeBytes)} · {formatDateTime(item.addedAt)}
                  </span>
                  {item.id === material.currentVersionId ? (
                    <ToneTag tone='blue'>{t('evidossierProjects.materials.drawer.current')}</ToneTag>
                  ) : null}
                  <StatusTag kind='parse' value={item.parseStatus} />
                </div>
              ))}
            </div>
          </Section>

          <Section
            title={t('evidossierProjects.materials.drawer.simulateTitle')}
            hint={t('evidossierProjects.materials.drawer.simulateHint')}
          >
            <div className='evd-row' style={{ gap: 8, flexWrap: 'wrap' }}>
              <Button
                size='small'
                onClick={() => void handleSimulate('parsed')}
                disabled={Boolean(version?.parseStatus === 'parsed' && version.document)}
              >
                {t('evidossierProjects.materials.drawer.simulateParsed')}
              </Button>
              <Button
                size='small'
                status='danger'
                onClick={() => void handleSimulate('failed')}
                disabled={version?.parseStatus === 'failed'}
              >
                {t('evidossierProjects.materials.drawer.simulateFailed')}
              </Button>
            </div>
          </Section>
        </div>
      ) : null}
    </Drawer>
  );
};
