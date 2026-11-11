/**
 * Comparison-task wizard form: pick two different formal versions of the same
 * project, describe the scope and make clear that a change is not automatically
 * a defect.
 */
import { Button, Input, Message, Select } from '@arco-design/web-react';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PackageVersion } from '../../domain/types';
import { getProjectVersions } from '../../data/selectors';
import { useEvidossier } from '../../data/EvidossierProvider';
import { Banner, Card, LoadingBlock, useEvidT } from '../../design/primitives';
import { ProjectSelect, WizardField, getPopupMount, versionOptionLabel } from './WizardFields';

type CompareWizardFormProps = {
  initialProjectId?: string;
  baselineVersionId?: string;
  targetVersionId?: string;
};

type FormErrors = Record<string, string | undefined>;

export const CompareWizardForm: React.FC<CompareWizardFormProps> = ({
  initialProjectId,
  baselineVersionId,
  targetVersionId,
}) => {
  const t = useEvidT();
  const navigate = useNavigate();
  const { snapshot, actions } = useEvidossier();

  const [projectId, setProjectId] = useState<string | undefined>(initialProjectId);
  const [title, setTitle] = useState('');
  const [baselineId, setBaselineId] = useState<string | undefined>(baselineVersionId);
  const [targetId, setTargetId] = useState<string | undefined>(targetVersionId);
  const [scopeNote, setScopeNote] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const projects = snapshot?.projects ?? [];
  const selectedProjectId = projectId ?? projects[0]?.id;
  const versions: PackageVersion[] = useMemo(
    () => (snapshot && selectedProjectId ? getProjectVersions(snapshot, selectedProjectId) : []),
    [snapshot, selectedProjectId]
  );

  if (!snapshot) return <LoadingBlock label={t('evidossierCommon.common.loading')} />;

  const packageTitleOf = (version: PackageVersion): string | undefined =>
    snapshot.packages.find((pkg) => pkg.id === version.packageId)?.title;

  const sortedVersions = versions.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const submit = async (): Promise<void> => {
    const next: FormErrors = {};
    if (!selectedProjectId) next.projectId = t('evidossierPackage.wizard.errors.projectRequired');
    if (!title.trim()) next.title = t('evidossierPackage.wizard.errors.titleRequired');
    if (!scopeNote.trim()) next.scopeNote = t('evidossierPackage.wizard.errors.scopeRequired');
    if (!baselineId) next.baseline = t('evidossierPackage.wizard.errors.baselineRequired');
    if (!targetId) next.target = t('evidossierPackage.wizard.errors.targetRequired');
    if (baselineId && targetId && baselineId === targetId) {
      next.target = t('evidossierPackage.wizard.errors.sameVersion');
    }
    setErrors(next);
    if (Object.keys(next).length > 0 || !selectedProjectId || !baselineId || !targetId || baselineId === targetId)
      return;

    setSubmitting(true);
    const created = await actions.startComparison({
      projectId: selectedProjectId,
      baselineVersionId: baselineId,
      targetVersionId: targetId,
      title: title.trim(),
      scopeNote: scopeNote.trim(),
    });
    setSubmitting(false);
    if (created) {
      Message.success(t('evidossierPackage.wizard.createDone', { code: created.code }));
      navigate(`/evidossier/packages/${created.id}`);
    }
  };

  return (
    <div className='evd-pkg-wizard'>
      <Banner tone='info' title={t('evidossierPackage.wizard.compare.noticeTitle')}>
        {t('evidossierPackage.wizard.compare.noticeText')}
      </Banner>

      <Card title={t('evidossierPackage.wizard.compare.setupTitle')}>
        <div className='evd-pkg-form'>
          <WizardField label={t('evidossierPackage.wizard.projectLabel')} required error={errors.projectId}>
            <ProjectSelect
              projects={projects}
              value={selectedProjectId}
              onChange={(next) => {
                setProjectId(next);
                setBaselineId(undefined);
                setTargetId(undefined);
                setErrors({});
              }}
            />
          </WizardField>
          <WizardField label={t('evidossierPackage.wizard.compare.titleLabel')} required error={errors.title}>
            <Input
              value={title}
              maxLength={120}
              placeholder={t('evidossierPackage.wizard.compare.titlePlaceholder')}
              onChange={(value) => {
                setTitle(value);
                setErrors((prev) => ({ ...prev, title: undefined }));
              }}
            />
          </WizardField>
          {versions.length < 2 ? (
            <Banner tone='warning' title={t('evidossierPackage.wizard.compare.notEnoughTitle')}>
              {t('evidossierPackage.wizard.compare.notEnoughText')}
            </Banner>
          ) : null}
          <div className='evd-pkg-form-grid'>
            <WizardField label={t('evidossierPackage.wizard.compare.baselineLabel')} required error={errors.baseline}>
              <Select
                getPopupContainer={getPopupMount}
                value={baselineId}
                placeholder={t('evidossierPackage.wizard.compare.versionPlaceholder')}
                onChange={(value) => {
                  setBaselineId(String(value));
                  setErrors((prev) => ({ ...prev, baseline: undefined, target: undefined }));
                }}
              >
                {sortedVersions.map((version) => (
                  <Select.Option key={version.id} value={version.id}>
                    {versionOptionLabel(version, packageTitleOf(version))}
                  </Select.Option>
                ))}
              </Select>
            </WizardField>
            <WizardField label={t('evidossierPackage.wizard.compare.targetLabel')} required error={errors.target}>
              <Select
                getPopupContainer={getPopupMount}
                value={targetId}
                placeholder={t('evidossierPackage.wizard.compare.versionPlaceholder')}
                onChange={(value) => {
                  setTargetId(String(value));
                  setErrors((prev) => ({ ...prev, target: undefined }));
                }}
              >
                {sortedVersions.map((version) => (
                  <Select.Option key={version.id} value={version.id} disabled={version.id === baselineId}>
                    {versionOptionLabel(version, packageTitleOf(version))}
                  </Select.Option>
                ))}
              </Select>
            </WizardField>
          </div>
          <WizardField
            label={t('evidossierPackage.wizard.compare.scopeLabel')}
            required
            error={errors.scopeNote}
            hint={t('evidossierPackage.wizard.compare.scopeHint')}
          >
            <Input.TextArea
              value={scopeNote}
              autoSize={{ minRows: 3, maxRows: 6 }}
              placeholder={t('evidossierPackage.wizard.compare.scopePlaceholder')}
              onChange={(value) => {
                setScopeNote(value);
                setErrors((prev) => ({ ...prev, scopeNote: undefined }));
              }}
            />
          </WizardField>
        </div>
      </Card>

      <div className='evd-pkg-wizard-footer'>
        <Button onClick={() => navigate(-1)}>{t('evidossierCommon.action.cancel')}</Button>
        <Button type='primary' loading={submitting} onClick={() => void submit()}>
          {t('evidossierCommon.action.startComparison')}
        </Button>
      </div>
    </div>
  );
};
