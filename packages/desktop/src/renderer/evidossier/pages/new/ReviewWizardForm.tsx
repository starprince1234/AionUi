/**
 * Review-task wizard form: choose the exact review target (a formal package
 * version or a project material version), list review-basis materials and
 * describe the review scope before starting the independent review package.
 */
import { Button, Input, Message, Radio, Select } from '@arco-design/web-react';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Material, PackageVersion, ReviewTarget } from '../../domain/types';
import { getProjectVersions, listProjectMaterials } from '../../data/selectors';
import { useEvidossier } from '../../data/EvidossierProvider';
import { Banner, Card, LoadingBlock, useEvidT } from '../../design/primitives';
import {
  ProjectSelect,
  getPopupMount,
  WizardField,
  buildMaterialReference,
  materialOptionLabel,
  splitLines,
  versionOptionLabel,
} from './WizardFields';

type ReviewWizardFormProps = {
  initialProjectId?: string;
  /** Preselects a project package version as the review target (from a version page). */
  initialTargetVersionId?: string;
};

type FormErrors = Record<string, string | undefined>;

const currentMaterialVersion = (material: Material) =>
  material.versions.find((candidate) => candidate.id === material.currentVersionId) ??
  material.versions[material.versions.length - 1];

export const ReviewWizardForm: React.FC<ReviewWizardFormProps> = ({ initialProjectId, initialTargetVersionId }) => {
  const t = useEvidT();
  const navigate = useNavigate();
  const { snapshot, actions } = useEvidossier();

  const [projectId, setProjectId] = useState<string | undefined>(initialProjectId);
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [targetKind, setTargetKind] = useState<'package_version' | 'material_version'>('package_version');
  const [targetVersionId, setTargetVersionId] = useState<string | undefined>(initialTargetVersionId);
  const [targetMaterialId, setTargetMaterialId] = useState<string | undefined>(undefined);
  const [basisMaterialIds, setBasisMaterialIds] = useState<string[]>([]);
  const [requirementsText, setRequirementsText] = useState('');
  const [scopeNote, setScopeNote] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const projects = snapshot?.projects ?? [];
  const selectedProjectId = projectId ?? projects[0]?.id;
  const versions: PackageVersion[] = useMemo(
    () => (snapshot && selectedProjectId ? getProjectVersions(snapshot, selectedProjectId) : []),
    [snapshot, selectedProjectId]
  );
  const materials: Material[] = useMemo(
    () => (snapshot && selectedProjectId ? listProjectMaterials(snapshot, selectedProjectId) : []),
    [snapshot, selectedProjectId]
  );
  const readableMaterials = materials.filter((material) => currentMaterialVersion(material)?.parseStatus !== 'failed');
  const effectiveTargetKind: 'package_version' | 'material_version' =
    targetKind === 'package_version' && versions.length === 0 && readableMaterials.length > 0
      ? 'material_version'
      : targetKind;

  if (!snapshot) return <LoadingBlock label={t('evidossierCommon.common.loading')} />;

  const packageTitleOf = (version: PackageVersion): string | undefined =>
    snapshot.packages.find((pkg) => pkg.id === version.packageId)?.title;

  const resetTarget = (kind: 'package_version' | 'material_version'): void => {
    setTargetKind(kind);
    setTargetVersionId(undefined);
    setTargetMaterialId(undefined);
    setErrors((prev) => ({ ...prev, target: undefined, targetLabel: undefined }));
  };

  const resolveReviewTarget = (): { target: ReviewTarget; label: string } | undefined => {
    if (effectiveTargetKind === 'package_version') {
      const version = versions.find((candidate) => candidate.id === targetVersionId);
      if (!version) return undefined;
      return {
        target: { kind: 'package_version', versionId: version.id, versionLabel: version.label },
        label: version.label,
      };
    }
    const material = materials.find((candidate) => candidate.id === targetMaterialId);
    const version = material ? currentMaterialVersion(material) : undefined;
    if (!material || !version) return undefined;
    return {
      target: {
        kind: 'material_version',
        materialId: material.id,
        materialVersionId: version.id,
        materialName: material.name,
        versionNumber: version.version,
      },
      label: material.name,
    };
  };

  const submit = async (): Promise<void> => {
    const next: FormErrors = {};
    const resolved = resolveReviewTarget();
    if (!selectedProjectId) next.projectId = t('evidossierPackage.wizard.errors.projectRequired');
    if (!title.trim()) next.title = t('evidossierPackage.wizard.errors.titleRequired');
    if (!goal.trim()) next.goal = t('evidossierPackage.wizard.errors.goalRequired');
    if (!scopeNote.trim()) next.scopeNote = t('evidossierPackage.wizard.errors.scopeRequired');
    if (!resolved) next.target = t('evidossierPackage.wizard.errors.targetRequired');
    setErrors(next);
    if (Object.keys(next).length > 0 || !selectedProjectId || !resolved) return;

    const basisRefs = materials
      .filter((material) => basisMaterialIds.includes(material.id))
      .map((material) => buildMaterialReference(material))
      .filter((ref): ref is NonNullable<typeof ref> => Boolean(ref));
    const basisRequirementLines = basisRefs.map((ref) =>
      t('evidossierPackage.wizard.review.basisRequirementLine', {
        name: ref.materialName,
        version: ref.versionNumber,
        usage: t(`evidossierCommon.materialUsage.${ref.role}`),
      })
    );

    setSubmitting(true);
    const created = await actions.startReview({
      projectId: selectedProjectId,
      title: title.trim(),
      goal: goal.trim(),
      requirements: [...splitLines(requirementsText), ...basisRequirementLines],
      reviewTarget: resolved.target,
      scopeNote: scopeNote.trim(),
    });
    setSubmitting(false);
    if (created) {
      Message.success(t('evidossierPackage.wizard.createDone', { code: created.code }));
      navigate(`/evidossier/packages/${created.id}`);
    }
  };

  const renderTargetFields = (): React.ReactNode => (
    <>
      <WizardField label={t('evidossierPackage.wizard.review.targetType')} required>
        <Radio.Group
          type='button'
          value={effectiveTargetKind}
          onChange={(value) => resetTarget(value as 'package_version' | 'material_version')}
        >
          <Radio value='package_version' disabled={versions.length === 0}>
            {t('evidossierPackage.wizard.review.targetPackageVersion')}
          </Radio>
          <Radio value='material_version' disabled={readableMaterials.length === 0}>
            {t('evidossierPackage.wizard.review.targetMaterialVersion')}
          </Radio>
        </Radio.Group>
        {versions.length === 0 ? (
          <p className='evd-pkg-field__hint'>{t('evidossierPackage.wizard.review.noVersionsHint')}</p>
        ) : null}
        {readableMaterials.length === 0 ? (
          <p className='evd-pkg-field__hint'>{t('evidossierPackage.wizard.review.noMaterialsHint')}</p>
        ) : null}
      </WizardField>

      {effectiveTargetKind === 'package_version' ? (
        <WizardField label={t('evidossierPackage.wizard.review.targetVersionLabel')} required error={errors.target}>
          <Select
            getPopupContainer={getPopupMount}
            value={targetVersionId}
            placeholder={t('evidossierPackage.wizard.review.targetVersionPlaceholder')}
            onChange={(value) => {
              setTargetVersionId(String(value));
              setErrors((prev) => ({ ...prev, target: undefined }));
            }}
          >
            {versions
              .slice()
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((version) => (
                <Select.Option key={version.id} value={version.id}>
                  {versionOptionLabel(version, packageTitleOf(version))} · {version.createdAt.slice(0, 10)}
                </Select.Option>
              ))}
          </Select>
        </WizardField>
      ) : (
        <WizardField label={t('evidossierPackage.wizard.review.targetMaterialLabel')} required error={errors.target}>
          <Select
            getPopupContainer={getPopupMount}
            value={targetMaterialId}
            placeholder={t('evidossierPackage.wizard.review.targetMaterialPlaceholder')}
            onChange={(value) => {
              setTargetMaterialId(String(value));
              setErrors((prev) => ({ ...prev, target: undefined }));
            }}
          >
            {readableMaterials.map((material) => (
              <Select.Option key={material.id} value={material.id}>
                {materialOptionLabel(material, t)}
              </Select.Option>
            ))}
          </Select>
        </WizardField>
      )}
    </>
  );

  const reviewPackageHint = (): React.ReactNode => {
    const disabledMaterials = materials.filter(
      (material) => currentMaterialVersion(material)?.parseStatus === 'failed'
    );
    if (disabledMaterials.length === 0) return null;
    return (
      <Banner tone='warning' title={t('evidossierPackage.wizard.review.unreadableTitle')}>
        {t('evidossierPackage.wizard.review.unreadableText', {
          names: disabledMaterials.map((material) => material.name).join('、'),
        })}
      </Banner>
    );
  };

  return (
    <div className='evd-pkg-wizard'>
      <Banner tone='info' title={t('evidossierPackage.wizard.review.autoTitle')}>
        {t('evidossierPackage.wizard.review.autoText')}
      </Banner>

      <Card title={t('evidossierPackage.wizard.review.setupTitle')}>
        <div className='evd-pkg-form'>
          <WizardField label={t('evidossierPackage.wizard.projectLabel')} required error={errors.projectId}>
            <ProjectSelect
              projects={projects}
              value={selectedProjectId}
              onChange={(next) => {
                setProjectId(next);
                setTargetVersionId(undefined);
                setTargetMaterialId(undefined);
                setBasisMaterialIds([]);
                setErrors({});
              }}
            />
          </WizardField>
          <WizardField label={t('evidossierPackage.wizard.review.titleLabel')} required error={errors.title}>
            <Input
              value={title}
              maxLength={120}
              placeholder={t('evidossierPackage.wizard.review.titlePlaceholder')}
              onChange={(value) => {
                setTitle(value);
                setErrors((prev) => ({ ...prev, title: undefined }));
              }}
            />
          </WizardField>
          <WizardField
            label={t('evidossierPackage.wizard.review.goalLabel')}
            required
            error={errors.goal}
            hint={t('evidossierPackage.wizard.review.goalHint')}
          >
            <Input.TextArea
              value={goal}
              autoSize={{ minRows: 3, maxRows: 6 }}
              placeholder={t('evidossierPackage.wizard.review.goalPlaceholder')}
              onChange={(value) => {
                setGoal(value);
                setErrors((prev) => ({ ...prev, goal: undefined }));
              }}
            />
          </WizardField>
        </div>
      </Card>

      <Card
        title={t('evidossierPackage.wizard.review.targetTitle')}
        subtitle={t('evidossierPackage.wizard.review.targetSubtitle')}
      >
        <div className='evd-pkg-review-target'>
          {reviewPackageHint()}
          {renderTargetFields()}
        </div>
      </Card>

      <Card
        title={t('evidossierPackage.wizard.review.basisTitle')}
        subtitle={t('evidossierPackage.wizard.review.basisSubtitle')}
      >
        <div className='evd-pkg-form'>
          <WizardField
            label={t('evidossierPackage.wizard.review.basisLabel')}
            hint={t('evidossierPackage.wizard.review.basisHint')}
          >
            <Select
              getPopupContainer={getPopupMount}
              mode='multiple'
              value={basisMaterialIds}
              placeholder={t('evidossierPackage.wizard.review.basisPlaceholder')}
              onChange={(value) => setBasisMaterialIds((value as string[]).map(String))}
            >
              {materials.map((material) => (
                <Select.Option key={material.id} value={material.id}>
                  {materialOptionLabel(material, t)}
                </Select.Option>
              ))}
            </Select>
          </WizardField>
          <WizardField
            label={t('evidossierPackage.wizard.review.requirementsLabel')}
            hint={t('evidossierPackage.wizard.review.requirementsHint')}
          >
            <Input.TextArea
              value={requirementsText}
              autoSize={{ minRows: 2, maxRows: 6 }}
              placeholder={t('evidossierPackage.wizard.review.requirementsPlaceholder')}
              onChange={setRequirementsText}
            />
          </WizardField>
          <WizardField
            label={t('evidossierPackage.wizard.review.scopeLabel')}
            required
            error={errors.scopeNote}
            hint={t('evidossierPackage.wizard.review.scopeHint')}
          >
            <Input.TextArea
              value={scopeNote}
              autoSize={{ minRows: 3, maxRows: 6 }}
              placeholder={t('evidossierPackage.wizard.review.scopePlaceholder')}
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
          {t('evidossierCommon.action.startReviewPackage')}
        </Button>
      </div>
    </div>
  );
};
