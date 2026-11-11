/**
 * Project create / rename dialogs shared by the workbench home and project
 * pages. Both actions go through the provider so the snapshot is refreshed.
 */
import { Form, Input, Message, Modal } from '@arco-design/web-react';
import React, { useEffect, useState } from 'react';
import { useEvidossier } from '../../data/EvidossierProvider';
import { useEvidT } from '../../design/primitives';
import type { Project } from '../../domain/types';

type ProjectFormValues = { name: string; description?: string };
type RenameFormValues = { name: string };

export const CreateProjectModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onCreated: (project: Project) => void;
}> = ({ visible, onClose, onCreated }) => {
  const t = useEvidT();
  const { actions } = useEvidossier();
  const [form] = Form.useForm<ProjectFormValues>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) form.resetFields();
  }, [visible, form]);

  const handleOk = async (): Promise<void> => {
    try {
      const values = await form.validate();
      setSubmitting(true);
      const project = await actions.createProject({
        name: (values.name ?? '').trim(),
        description: (values.description ?? '').trim(),
      });
      if (project) {
        Message.success(t('evidossierProjects.dialog.createProject.done'));
        onCreated(project);
      }
    } catch {
      // Invalid fields are highlighted by Arco Form; action errors are messaged by the provider.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={t('evidossierProjects.dialog.createProject.title')}
      visible={visible}
      onCancel={onClose}
      onOk={handleOk}
      okText={t('evidossierProjects.dialog.createProject.submit')}
      cancelText={t('evidossierCommon.action.cancel')}
      confirmLoading={submitting}
      unmountOnExit
    >
      <Form form={form} layout='vertical'>
        <Form.Item
          label={t('evidossierProjects.dialog.createProject.name')}
          field='name'
          rules={[{ required: true, message: t('evidossierProjects.dialog.createProject.nameRequired') }]}
        >
          <Input placeholder={t('evidossierProjects.dialog.createProject.namePlaceholder')} maxLength={80} />
        </Form.Item>
        <Form.Item label={t('evidossierProjects.dialog.createProject.description')} field='description'>
          <Input.TextArea
            placeholder={t('evidossierProjects.dialog.createProject.descriptionPlaceholder')}
            autoSize={{ minRows: 3, maxRows: 6 }}
            maxLength={300}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export const RenameProjectModal: React.FC<{
  project: Project | null;
  onClose: () => void;
  onRenamed: (project: Project) => void;
}> = ({ project, onClose, onRenamed }) => {
  const t = useEvidT();
  const { actions } = useEvidossier();
  const [form] = Form.useForm<RenameFormValues>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!project) return;
    form.resetFields();
    form.setFieldsValue({ name: project.name });
  }, [project, form]);

  const handleOk = async (): Promise<void> => {
    if (!project) return;
    try {
      const values = await form.validate();
      setSubmitting(true);
      const renamed = await actions.renameProject(project.id, (values.name ?? '').trim());
      if (renamed) {
        Message.success(t('evidossierProjects.dialog.renameProject.done'));
        onRenamed(renamed);
      }
    } catch {
      // Invalid fields are highlighted by Arco Form; action errors are messaged by the provider.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={t('evidossierProjects.dialog.renameProject.title')}
      visible={project !== null}
      onCancel={onClose}
      onOk={handleOk}
      okText={t('evidossierProjects.dialog.renameProject.submit')}
      cancelText={t('evidossierCommon.action.cancel')}
      confirmLoading={submitting}
      unmountOnExit
    >
      <Form form={form} layout='vertical'>
        <Form.Item
          label={t('evidossierProjects.dialog.renameProject.name')}
          field='name'
          rules={[{ required: true, message: t('evidossierProjects.dialog.renameProject.nameRequired') }]}
        >
          <Input maxLength={80} />
        </Form.Item>
      </Form>
    </Modal>
  );
};
