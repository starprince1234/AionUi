/**
 * Project materials panel (materials tab).
 *
 * Lists uploaded and stage-generated materials, exposes preview, add-version
 * and delete actions, and keeps the demo parse simulation honest: only the
 * preview drawer can change the local simulated parse state.
 */
import { Button, Dropdown, Input, Menu, Message, Modal, Popconfirm, Select } from '@arco-design/web-react';
import React, { useMemo, useState } from 'react';
import { useEvidossier } from '../../data/EvidossierProvider';
import { getMaterial, getPackage, listProjectMaterials } from '../../data/selectors';
import type { Material, MaterialKind, MaterialUsage } from '../../domain/types';
import { IconClose, IconEye, IconMore, IconPlus, IconSearch } from '../../design/icons';
import { EmptyState, LoadingBlock, StatusTag, ToneTag, formatDateTime, useEvidT } from '../../design/primitives';
import { AddMaterialModal } from './AddMaterialModal';
import { MaterialPreviewDrawer } from './MaterialPreviewDrawer';
import { MATERIAL_KINDS, MATERIAL_USAGES, currentVersionOf } from './materialMeta';
import './materials.css';

type KindFilter = 'all' | MaterialKind;
type UsageFilter = 'all' | MaterialUsage;

export const MaterialPanel: React.FC<{ projectId: string }> = ({ projectId }) => {
  const t = useEvidT();
  const { snapshot, actions } = useEvidossier();
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<KindFilter>('all');
  const [usage, setUsage] = useState<UsageFilter>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const materials = useMemo(() => (snapshot ? listProjectMaterials(snapshot, projectId) : []), [snapshot, projectId]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return materials.filter((material) => {
      if (kind !== 'all' && material.kind !== kind) return false;
      if (usage !== 'all' && material.usage !== usage) return false;
      if (!query) return true;
      const current = currentVersionOf(material);
      return [material.name, material.usageNote ?? '', current?.fileName ?? ''].some((value) =>
        value.toLowerCase().includes(query)
      );
    });
  }, [materials, kind, usage, search]);

  if (!snapshot) {
    return <LoadingBlock />;
  }

  const previewMaterial = previewId ? (getMaterial(snapshot, previewId) ?? null) : null;
  const hasFilters = kind !== 'all' || usage !== 'all' || search.trim() !== '';

  const resetFilters = (): void => {
    setKind('all');
    setUsage('all');
    setSearch('');
  };

  const handleAddVersion = (material: Material): void => {
    Modal.confirm({
      title: t('evidossierProjects.materials.addVersion.title'),
      content: t('evidossierProjects.materials.addVersion.text'),
      okText: t('evidossierProjects.materials.addVersion.ok'),
      cancelText: t('evidossierCommon.action.cancel'),
      onOk: async () => {
        const updated = await actions.addMaterialVersion(material.id);
        if (updated) Message.success(t('evidossierProjects.materials.addVersion.done'));
      },
    });
  };

  const handleRemove = async (material: Material): Promise<void> => {
    const removed = await actions.removeMaterial(material.id);
    if (removed) Message.success(t('evidossierProjects.materials.delete.done'));
  };

  const kindOptions = [
    { label: t('evidossierProjects.materials.allKinds'), value: 'all' },
    ...MATERIAL_KINDS.map((materialKind) => ({
      label: t(`evidossierCommon.materialKind.${materialKind}`),
      value: materialKind,
    })),
  ];
  const usageOptions = [
    { label: t('evidossierProjects.materials.allUsages'), value: 'all' },
    ...MATERIAL_USAGES.map((materialUsage) => ({
      label: t(`evidossierCommon.materialUsage.${materialUsage}`),
      value: materialUsage,
    })),
  ];

  return (
    <div>
      <div className='evd-proj-filters evd-mb-16'>
        <Input
          style={{ width: 260, maxWidth: '100%' }}
          prefix={<IconSearch size={14} />}
          allowClear
          value={search}
          onChange={(value) => setSearch(value)}
          placeholder={t('evidossierProjects.materials.searchPlaceholder')}
          aria-label={t('evidossierProjects.materials.searchPlaceholder')}
        />
        <Select
          style={{ width: 168 }}
          value={kind}
          options={kindOptions}
          onChange={(value) => setKind(value as KindFilter)}
          aria-label={t('evidossierProjects.materials.kindFilter')}
        />
        <Select
          style={{ width: 168 }}
          value={usage}
          options={usageOptions}
          onChange={(value) => setUsage(value as UsageFilter)}
          aria-label={t('evidossierProjects.materials.usageFilter')}
        />
        <span className='evd-caption'>
          {t('evidossierProjects.materials.count', { visible: filtered.length, total: materials.length })}
        </span>
        {hasFilters ? (
          <Button size='small' type='text' onClick={resetFilters}>
            {t('evidossierProjects.materials.resetFilters')}
          </Button>
        ) : null}
        <span className='evd-flex-1' />
        <Button type='primary' icon={<IconPlus size={14} />} onClick={() => setAddOpen(true)}>
          {t('evidossierProjects.materials.add')}
        </Button>
      </div>

      {materials.length === 0 ? (
        <EmptyState
          title={t('evidossierProjects.materials.emptyTitle')}
          text={t('evidossierProjects.materials.emptyText')}
          actions={
            <Button type='primary' icon={<IconPlus size={14} />} onClick={() => setAddOpen(true)}>
              {t('evidossierProjects.materials.add')}
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t('evidossierProjects.materials.noMatchTitle')}
          text={t('evidossierProjects.materials.noMatchText')}
          actions={<Button onClick={resetFilters}>{t('evidossierProjects.materials.resetFilters')}</Button>}
        />
      ) : (
        <div className='evd-table-wrap'>
          <table className='evd-table evd-proj-mat-table'>
            <thead>
              <tr>
                <th>{t('evidossierProjects.materials.columns.name')}</th>
                <th>{t('evidossierProjects.materials.columns.kind')}</th>
                <th>{t('evidossierProjects.materials.columns.usage')}</th>
                <th>{t('evidossierProjects.materials.columns.origin')}</th>
                <th>{t('evidossierProjects.materials.columns.parse')}</th>
                <th>{t('evidossierProjects.materials.columns.updated')}</th>
                <th>{t('evidossierProjects.materials.columns.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((material) => {
                const current = currentVersionOf(material);
                const generatedFrom = material.generatedByPackageId
                  ? getPackage(snapshot, material.generatedByPackageId)
                  : undefined;
                const moreMenu = (
                  <Menu
                    onClickMenuItem={(key) => {
                      if (key === 'version') handleAddVersion(material);
                    }}
                    style={{ width: 200 }}
                  >
                    <Menu.Item key='version'>{t('evidossierProjects.materials.actions.addVersion')}</Menu.Item>
                  </Menu>
                );
                return (
                  <tr key={material.id}>
                    <td>
                      <div className='evd-proj-cell-main'>
                        <span className='evd-list__title evd-truncate'>{material.name}</span>
                        {current && current.fileName !== material.name ? (
                          <span className='evd-list__text evd-truncate'>{current.fileName}</span>
                        ) : null}
                      </div>
                    </td>
                    <td>{t(`evidossierCommon.materialKind.${material.kind}`)}</td>
                    <td>
                      {material.usage === 'pending' ? (
                        <ToneTag tone='yellow'>{t('evidossierCommon.materialUsage.pending')}</ToneTag>
                      ) : (
                        <span>{t(`evidossierCommon.materialUsage.${material.usage}`)}</span>
                      )}
                    </td>
                    <td>
                      <div className='evd-proj-cell-main'>
                        <ToneTag tone={material.origin === 'generated' ? 'blue' : 'neutral'}>
                          {t(`evidossierCommon.materialOrigin.${material.origin}`)}
                        </ToneTag>
                        <span className='evd-caption evd-nowrap'>
                          {current
                            ? t('evidossierProjects.materials.versionLabel', {
                                number: current.version,
                                count: material.versions.length,
                              })
                            : t('evidossierCommon.common.none')}
                        </span>
                        {generatedFrom ? (
                          <span className='evd-caption evd-truncate'>
                            {t('evidossierProjects.materials.generatedBy', { code: generatedFrom.code })}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td>{current ? <StatusTag kind='parse' value={current.parseStatus} /> : null}</td>
                    <td className='evd-caption evd-nowrap'>{formatDateTime(material.updatedAt)}</td>
                    <td>
                      <div className='evd-proj-actions'>
                        <Button
                          size='small'
                          type='text'
                          icon={<IconEye size={14} />}
                          onClick={() => setPreviewId(material.id)}
                        >
                          {t('evidossierProjects.materials.actions.preview')}
                        </Button>
                        <Dropdown droplist={moreMenu} trigger='click' position='br'>
                          <Button
                            size='small'
                            type='text'
                            icon={<IconMore size={14} />}
                            aria-label={t('evidossierProjects.materials.actions.more')}
                          />
                        </Dropdown>
                        <Popconfirm
                          title={t('evidossierProjects.materials.delete.title')}
                          content={t('evidossierProjects.materials.delete.text')}
                          okText={t('evidossierProjects.materials.delete.ok')}
                          cancelText={t('evidossierCommon.action.cancel')}
                          onOk={() => handleRemove(material)}
                        >
                          <Button
                            size='small'
                            type='text'
                            status='danger'
                            icon={<IconClose size={14} />}
                            aria-label={t('evidossierProjects.materials.actions.delete')}
                          />
                        </Popconfirm>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AddMaterialModal projectId={projectId} visible={addOpen} onClose={() => setAddOpen(false)} />
      <MaterialPreviewDrawer material={previewMaterial} onClose={() => setPreviewId(null)} />
    </div>
  );
};
