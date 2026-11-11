/**
 * Add-material dialog.
 *
 * The demo never uploads or parses files: the Arco Upload trigger only records
 * the local file name and size, `beforeUpload` always cancels the request, and
 * the new material version starts in the "awaiting parse" state.
 */
import { Button, Form, Input, Message, Modal, Select, Upload } from '@arco-design/web-react';
import React, { useEffect, useState } from 'react';
import { useEvidossier } from '../../data/EvidossierProvider';
import type { MaterialKind, MaterialUsage } from '../../domain/types';
import { IconUpload } from '../../design/icons';
import { formatBytes, useEvidT } from '../../design/primitives';
import { MATERIAL_KINDS, MATERIAL_USAGES } from './materialMeta';

type AddMaterialValues = {
  name: string;
  kind: MaterialKind;
  usage: MaterialUsage;
  usageNote?: string;
};

type PickedFile = { name: string; size: number };

export const AddMaterialModal: React.FC<{
  projectId: string;
  visible: boolean;
  onClose: () => void;
}> = ({ projectId, visible, onClose }) => {
  const t = useEvidT();
  const { actions } = useEvidossier();
  const [form] = Form.useForm<AddMaterialValues>();
  const [file, setFile] = useState<PickedFile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    form.resetFields();
    form.setFieldsValue({ kind: 'document', usage: 'pending' });
    setFile(null);
  }, [visible, form]);

  const handleOk = async (): Promise<void> => {
    try {
      const values = await form.validate();
      const name = (values.name ?? '').trim();
      setSubmitting(true);
      const material = await actions.addMaterial({
        projectId,
        name,
        kind: values.kind ?? 'document',
        usage: values.usage ?? 'pending',
        usageNote: (values.usageNote ?? '').trim() || undefined,
        sizeBytes: file?.size ?? 0,
        demoFileName: file?.name ?? name,
      });
      if (material) {
        Message.success(t('evidossierProjects.materials.addModal.done'));
        onClose();
      }
    } catch {
      // Invalid fields are highlighted by Arco Form; action errors are messaged by the provider.
    } finally {
      setSubmitting(false);
    }
  };

  const kindOptions = MATERIAL_KINDS.map((kind) => ({
    label: t(`evidossierCommon.materialKind.${kind}`),
    value: kind,
  }));
  const usageOptions = MATERIAL_USAGES.map((usage) => ({
    label: t(`evidossierCommon.materialUsage.${usage}`),
    value: usage,
  }));

  return (
    <Modal
      title={t('evidossierProjects.materials.addModal.title')}
      visible={visible}
      onCancel={onClose}
      onOk={handleOk}
      okText={t('evidossierProjects.materials.addModal.submit')}
      cancelText={t('evidossierCommon.action.cancel')}
      confirmLoading={submitting}
      unmountOnExit
    >
      <Form form={form} layout='vertical'>
        <Form.Item
          label={t('evidossierProjects.materials.addModal.name')}
          field='name'
          rules={[{ required: true, message: t('evidossierProjects.materials.addModal.nameRequired') }]}
        >
          <Input placeholder={t('evidossierProjects.materials.addModal.namePlaceholder')} maxLength={120} />
        </Form.Item>
        <Form.Item label={t('evidossierProjects.materials.addModal.kind')} field='kind'>
          <Select options={kindOptions} />
        </Form.Item>
        <Form.Item label={t('evidossierProjects.materials.addModal.usage')} field='usage'>
          <Select options={usageOptions} />
        </Form.Item>
        <Form.Item label={t('evidossierProjects.materials.addModal.usageNote')} field='usageNote'>
          <Input placeholder={t('evidossierProjects.materials.addModal.usageNotePlaceholder')} maxLength={200} />
        </Form.Item>
      </Form>
      <div className='evd-proj-field'>
        <div className='evd-label evd-mb-8'>{t('evidossierProjects.materials.addModal.file')}</div>
        <div className='evd-row' style={{ gap: 8, flexWrap: 'wrap' }}>
          <Upload
            showUploadList={false}
            beforeUpload={(selected) => {
              setFile({ name: selected.name, size: selected.size });
              form.setFieldValue('name', selected.name);
              return false;
            }}
          >
            <Button icon={<IconUpload size={14} />}>{t('evidossierProjects.materials.addModal.chooseFile')}</Button>
          </Upload>
          {file ? (
            <>
              <span className='evd-caption evd-truncate'>
                {t('evidossierProjects.materials.addModal.fileChosen', {
                  name: file.name,
                  size: formatBytes(file.size),
                })}
              </span>
              <Button size='small' type='text' onClick={() => setFile(null)}>
                {t('evidossierProjects.materials.addModal.clearFile')}
              </Button>
            </>
          ) : null}
        </div>
        <p className='evd-caption evd-mt-8 evd-mb-0'>{t('evidossierProjects.materials.addModal.uploadHint')}</p>
      </div>
    </Modal>
  );
};
