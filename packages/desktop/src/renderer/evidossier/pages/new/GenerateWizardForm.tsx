/**
 * Generate-task wizard form: new material generation, revision of an exact
 * formal version, and the two "continue from review findings / comparison
 * differences" modes. The latter two call the repository's dedicated revision
 * methods so the resulting package keeps its real source relations.
 */
import { Button, Checkbox, Input, Message, Radio, Select } from '@arco-design/web-react';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ArtifactPackage, PackageVersion, ReviewTarget } from '../../domain/types';
import { getProjectVersions, listProjectMaterials } from '../../data/selectors';
import { useEvidossier } from '../../data/EvidossierProvider';
import { Banner, Card, LoadingBlock, ToneTag, formatDateTime, useEvidT } from '../../design/primitives';
import {
  ProjectSelect,
  getPopupMount,
  WizardField,
  buildMaterialReference,
  materialOptionLabel,
  splitLines,
  versionOptionLabel,
} from './WizardFields';

type GenerateWizardFormProps = {
  initialProjectId?: string;
  initialMode?: 'new' | 'revision';
  baseVersionId?: string;
  reviewPackageId?: string;
  reviewVersionId?: string;
  findingIds: string[];
  comparePackageId?: string;
  compareVersionId?: string;
  differenceIds: string[];
  targetVersionId?: string;
  baselineVersionId?: string;
};

type FormErrors = Record<string, string | undefined>;

const findVersion = (versions: PackageVersion[], versionId: string | undefined): PackageVersion | undefined =>
  versionId ? versions.find((version) => version.id === versionId) : undefined;

const latestVersionOfPackage = (versions: PackageVersion[], packageId: string): PackageVersion | undefined =>
  versions.filter((version) => version.packageId === packageId).sort((a, b) => b.versionNumber - a.versionNumber)[0];

export const GenerateWizardForm: React.FC<GenerateWizardFormProps> = ({
  initialProjectId,
  initialMode,
  baseVersionId,
  reviewPackageId,
  reviewVersionId,
  findingIds,
  comparePackageId,
  compareVersionId,
  differenceIds,
  targetVersionId,
  baselineVersionId,
}) => {
  const t = useEvidT();
  const navigate = useNavigate();
  const { snapshot, actions } = useEvidossier();

  const reviewPackage: ArtifactPackage | undefined = reviewPackageId
    ? snapshot?.packages.find((pkg) => pkg.id === reviewPackageId)
    : undefined;
  const comparePackage: ArtifactPackage | undefined = comparePackageId
    ? snapshot?.packages.find((pkg) => pkg.id === comparePackageId)
    : undefined;
  const fromReview = Boolean(reviewPackageId);
  const fromCompare = Boolean(comparePackageId);
  const sourcePackage = reviewPackage ?? comparePackage;

  const effectiveProjectId = sourcePackage?.projectId ?? initialProjectId ?? snapshot?.projects[0]?.id;
  const projects = snapshot?.projects ?? [];

  const [projectId, setProjectId] = useState<string | undefined>(effectiveProjectId);
  const [mode, setMode] = useState<'new' | 'revision'>(initialMode === 'revision' ? 'revision' : 'new');
  const [title, setTitle] = useState(() =>
    sourcePackage ? t('evidossierPackage.wizard.generate.revisionTitleDefault', { title: sourcePackage.title }) : ''
  );
  const [goal, setGoal] = useState('');
  const [requirementsText, setRequirementsText] = useState('');
  const [materialIds, setMaterialIds] = useState<string[]>([]);
  const [revisionBaseId, setRevisionBaseId] = useState<string | undefined>(baseVersionId);
  const [scopeNote, setScopeNote] = useState('');
  const [permissionConfirmed, setPermissionConfirmed] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const currentProjectId = fromReview || fromCompare ? effectiveProjectId : projectId;

  const projectVersions = useMemo(
    () => (snapshot && currentProjectId ? getProjectVersions(snapshot, currentProjectId) : []),
    [snapshot, currentProjectId]
  );
  const projectMaterials = useMemo(
    () => (snapshot && currentProjectId ? listProjectMaterials(snapshot, currentProjectId) : []),
    [snapshot, currentProjectId]
  );
  /** Revision mode needs at least one formal version to revise. */
  const effectiveMode: 'new' | 'revision' = mode === 'revision' && projectVersions.length === 0 ? 'new' : mode;

  const sourceReportVersion = useMemo(() => {
    if (!snapshot) return undefined;
    if (reviewPackage) {
      const fromQuery = findVersion(
        snapshot.versions.filter((version) => version.packageId === reviewPackage.id),
        reviewVersionId
      );
      return fromQuery ?? latestVersionOfPackage(snapshot.versions, reviewPackage.id);
    }
    if (comparePackage) {
      const fromQuery = findVersion(
        snapshot.versions.filter((version) => version.packageId === comparePackage.id),
        compareVersionId
      );
      return fromQuery ?? latestVersionOfPackage(snapshot.versions, comparePackage.id);
    }
    return undefined;
  }, [snapshot, reviewPackage, comparePackage, reviewVersionId, compareVersionId]);

  const fallbackBaseVersionId = useMemo(() => {
    if (!snapshot) return undefined;
    if (baseVersionId) return baseVersionId;
    if (reviewPackage?.reviewTarget?.kind === 'package_version') return reviewPackage.reviewTarget.versionId;
    if (comparePackage) return targetVersionId ?? baselineVersionId;
    return undefined;
  }, [snapshot, baseVersionId, reviewPackage, comparePackage, targetVersionId, baselineVersionId]);

  const [compareBaseId, setCompareBaseId] = useState<string | undefined>(fallbackBaseVersionId);
  const resolvedBaseVersionId = fromReview || fromCompare ? (compareBaseId ?? fallbackBaseVersionId) : revisionBaseId;
  const resolvedBaseVersion = findVersion(
    snapshot?.versions.filter((version) => (currentProjectId ? version.projectId === currentProjectId : true)) ?? [],
    resolvedBaseVersionId
  );
  const compareBaseOptions = projectVersions
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((version) => {
      const owner = snapshot?.packages.find((pkg) => pkg.id === version.packageId);
      return { version, ownerTitle: owner?.title };
    });

  if (!snapshot) return <LoadingBlock label={t('evidossierCommon.common.loading')} />;

  const selectedMaterials = projectMaterials.filter((material) => materialIds.includes(material.id));

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!currentProjectId) next.projectId = t('evidossierPackage.wizard.errors.projectRequired');
    if (!title.trim()) next.title = t('evidossierPackage.wizard.errors.titleRequired');
    const baseMissing = !resolvedBaseVersionId || !resolvedBaseVersion;

    if (fromReview) {
      if (!reviewPackage) next.source = t('evidossierPackage.wizard.errors.sourceReviewMissing');
      if (!sourceReportVersion) next.sourceReport = t('evidossierPackage.wizard.errors.reportVersionRequired');
      if (findingIds.length === 0) next.findings = t('evidossierPackage.wizard.errors.findingsRequired');
      if (baseMissing) next.base = t('evidossierPackage.wizard.errors.baseVersionRequired');
      if (!scopeNote.trim()) next.scopeNote = t('evidossierPackage.wizard.errors.scopeRequired');
      if (!permissionConfirmed) next.permission = t('evidossierPackage.wizard.errors.permissionRequired');
    } else if (fromCompare) {
      if (!comparePackage) next.source = t('evidossierPackage.wizard.errors.sourceCompareMissing');
      if (!sourceReportVersion) next.sourceReport = t('evidossierPackage.wizard.errors.reportVersionRequired');
      if (differenceIds.length === 0) next.differences = t('evidossierPackage.wizard.errors.differencesRequired');
      if (baseMissing) next.base = t('evidossierPackage.wizard.errors.baseVersionRequired');
      if (!scopeNote.trim()) next.scopeNote = t('evidossierPackage.wizard.errors.scopeRequired');
      if (!permissionConfirmed) next.permission = t('evidossierPackage.wizard.errors.permissionRequired');
    } else {
      if (!goal.trim()) next.goal = t('evidossierPackage.wizard.errors.goalRequired');
      if (effectiveMode === 'revision') {
        if (!revisionBaseId) next.base = t('evidossierPackage.wizard.errors.baseVersionRequired');
        if (!scopeNote.trim()) next.scopeNote = t('evidossierPackage.wizard.errors.scopeRequired');
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (): Promise<void> => {
    if (!validate() || !currentProjectId) return;
    setSubmitting(true);
    let created: ArtifactPackage | undefined;
    if (fromReview && reviewPackage && sourceReportVersion && resolvedBaseVersionId) {
      created = await actions.startRevisionFromFindings({
        projectId: currentProjectId,
        reviewPackageId: reviewPackage.id,
        reviewVersionId: sourceReportVersion.id,
        baseVersionId: resolvedBaseVersionId,
        findingIds,
        title: title.trim(),
        scopeNote: scopeNote.trim(),
      });
    } else if (fromCompare && comparePackage && sourceReportVersion && resolvedBaseVersionId) {
      created = await actions.startRevisionFromDifferences({
        projectId: currentProjectId,
        comparisonPackageId: comparePackage.id,
        comparisonVersionId: sourceReportVersion.id,
        baseVersionId: resolvedBaseVersionId,
        differenceIds,
        title: title.trim(),
        scopeNote: scopeNote.trim(),
      });
    } else {
      const materialRefs = selectedMaterials
        .map((material) => buildMaterialReference(material))
        .filter((ref): ref is NonNullable<typeof ref> => Boolean(ref));
      created = await actions.createPackage({
        kind: 'generate',
        projectId: currentProjectId,
        title: title.trim(),
        goal: goal.trim(),
        requirements: splitLines(requirementsText),
        materialRefs,
        mode: effectiveMode,
        revisionOfVersionId: effectiveMode === 'revision' ? revisionBaseId : undefined,
        revisionScope: effectiveMode === 'revision' ? scopeNote.trim() : undefined,
      });
    }
    setSubmitting(false);
    if (created) {
      Message.success(t('evidossierPackage.wizard.createDone', { code: created.code }));
      navigate(`/evidossier/packages/${created.id}`);
    }
  };

  const sourceProjectLabel = sourcePackage ? `${sourcePackage.code} · ${sourcePackage.title}` : undefined;
  const reviewTargetLabel = reviewPackage?.reviewTarget
    ? formatReviewTarget(reviewPackage.reviewTarget, snapshot)
    : undefined;

  const renderSourceSummary = (): React.ReactNode => (
    <Card title={t('evidossierPackage.wizard.source.title')} subtitle={t('evidossierPackage.wizard.source.subtitle')}>
      <div className='evd-pkg-source-summary'>
        <div className='evd-pkg-source-row'>
          <span className='evd-pkg-source-row__label'>{t('evidossierPackage.wizard.source.package')}</span>
          <span className='evd-pkg-source-row__value'>
            {sourceProjectLabel ?? t('evidossierPackage.status.unavailable')}
          </span>
        </div>
        <div className='evd-pkg-source-row'>
          <span className='evd-pkg-source-row__label'>{t('evidossierPackage.wizard.source.reportVersion')}</span>
          <span className='evd-pkg-source-row__value'>
            {sourceReportVersion ? (
              <>
                <span className='evd-version'>{sourceReportVersion.label}</span>{' '}
                <span className='evd-caption'>{formatDateTime(sourceReportVersion.createdAt)}</span>
              </>
            ) : (
              <ToneTag tone='red'>{t('evidossierPackage.status.unavailable')}</ToneTag>
            )}
          </span>
        </div>
        {fromReview ? (
          <>
            <div className='evd-pkg-source-row'>
              <span className='evd-pkg-source-row__label'>{t('evidossierPackage.wizard.source.reviewTarget')}</span>
              <span className='evd-pkg-source-row__value'>
                {reviewTargetLabel ?? <ToneTag tone='red'>{t('evidossierPackage.status.unavailable')}</ToneTag>}
              </span>
            </div>
            <div className='evd-pkg-source-row'>
              <span className='evd-pkg-source-row__label'>{t('evidossierPackage.wizard.source.findings')}</span>
              <span className='evd-pkg-source-row__value'>
                {findingIds.length > 0 ? (
                  <ToneTag tone='blue'>
                    {t('evidossierPackage.wizard.source.selectedCount', { count: findingIds.length })}
                  </ToneTag>
                ) : (
                  <ToneTag tone='red'>{t('evidossierPackage.wizard.source.noFindings')}</ToneTag>
                )}
              </span>
            </div>
          </>
        ) : null}
        {fromCompare ? (
          <div className='evd-pkg-source-row'>
            <span className='evd-pkg-source-row__label'>{t('evidossierPackage.wizard.source.differences')}</span>
            <span className='evd-pkg-source-row__value'>
              {differenceIds.length > 0 ? (
                <ToneTag tone='blue'>
                  {t('evidossierPackage.wizard.source.selectedCount', { count: differenceIds.length })}
                </ToneTag>
              ) : (
                <ToneTag tone='red'>{t('evidossierPackage.wizard.source.noDifferences')}</ToneTag>
              )}
            </span>
          </div>
        ) : null}
        <div className='evd-pkg-source-row'>
          <span className='evd-pkg-source-row__label'>{t('evidossierPackage.wizard.source.baseVersion')}</span>
          <span className='evd-pkg-source-row__value'>
            {resolvedBaseVersion ? (
              <>
                {fromCompare ? (
                  <Select
                    getPopupContainer={getPopupMount}
                    value={resolvedBaseVersionId}
                    style={{ minWidth: 280 }}
                    onChange={(value) => {
                      setCompareBaseId(String(value));
                      setErrors((prev) => ({ ...prev, base: undefined }));
                    }}
                  >
                    {compareBaseOptions.map(({ version, ownerTitle }) => (
                      <Select.Option key={version.id} value={version.id}>
                        {versionOptionLabel(version, ownerTitle)}
                      </Select.Option>
                    ))}
                  </Select>
                ) : (
                  <span className='evd-row' style={{ flexWrap: 'wrap' }}>
                    <span className='evd-version'>{resolvedBaseVersion.label}</span>
                    <span className='evd-caption'>{formatDateTime(resolvedBaseVersion.createdAt)}</span>
                  </span>
                )}
                <p className='evd-pkg-field__hint evd-mt-8'>{t('evidossierPackage.wizard.source.baseVersionHint')}</p>
              </>
            ) : (
              <ToneTag tone='red'>{t('evidossierPackage.status.unavailable')}</ToneTag>
            )}
          </span>
        </div>
        {!reviewPackage && fromReview ? (
          <Banner tone='error' title={t('evidossierPackage.wizard.source.missingTitle')}>
            {t('evidossierPackage.wizard.errors.sourceReviewMissing')}
          </Banner>
        ) : null}
        {!comparePackage && fromCompare ? (
          <Banner tone='error' title={t('evidossierPackage.wizard.source.missingTitle')}>
            {t('evidossierPackage.wizard.errors.sourceCompareMissing')}
          </Banner>
        ) : null}
      </div>
    </Card>
  );

  const renderRevisionFields = (): React.ReactNode => (
    <>
      <WizardField label={t('evidossierPackage.wizard.generate.titleLabel')} required error={errors.title}>
        <Input
          value={title}
          onChange={(value) => {
            setTitle(value);
            setErrors((prev) => ({ ...prev, title: undefined }));
          }}
          placeholder={t('evidossierPackage.wizard.generate.titlePlaceholder')}
          maxLength={120}
        />
      </WizardField>
      <WizardField
        label={t('evidossierPackage.wizard.generate.scopeLabel')}
        required
        error={errors.scopeNote}
        hint={t('evidossierPackage.wizard.generate.scopeHint')}
      >
        <Input.TextArea
          value={scopeNote}
          autoSize={{ minRows: 3, maxRows: 6 }}
          placeholder={t('evidossierPackage.wizard.generate.scopePlaceholder')}
          onChange={(value) => {
            setScopeNote(value);
            setErrors((prev) => ({ ...prev, scopeNote: undefined }));
          }}
        />
      </WizardField>
      <Checkbox
        checked={permissionConfirmed}
        onChange={(checked) => {
          setPermissionConfirmed(checked);
          setErrors((prev) => ({ ...prev, permission: undefined }));
        }}
      >
        {t('evidossierPackage.wizard.source.permission')}
      </Checkbox>
      {errors.permission ? <p className='evd-pkg-error-text'>{errors.permission}</p> : null}
    </>
  );

  return (
    <div className='evd-pkg-wizard'>
      <Banner tone='info' title={t('evidossierPackage.wizard.generate.autoTitle')}>
        {t('evidossierPackage.wizard.generate.autoText')}
      </Banner>

      {fromReview || fromCompare ? renderSourceSummary() : null}

      {fromReview || fromCompare ? (
        <Card title={t('evidossierPackage.wizard.generate.revisionTitle')}>
          <div className='evd-pkg-form'>{renderRevisionFields()}</div>
        </Card>
      ) : (
        <>
          <Card title={t('evidossierPackage.wizard.generate.setupTitle')}>
            <div className='evd-pkg-form'>
              <WizardField label={t('evidossierPackage.wizard.projectLabel')} required error={errors.projectId}>
                <ProjectSelect
                  projects={projects}
                  value={projectId}
                  onChange={(next) => {
                    setProjectId(next);
                    setMaterialIds([]);
                    setMode('new');
                    setRevisionBaseId(undefined);
                    setErrors({});
                  }}
                />
              </WizardField>
              <WizardField label={t('evidossierPackage.wizard.generate.modeLabel')} required>
                <Radio.Group
                  type='button'
                  value={effectiveMode}
                  onChange={(value) => {
                    setMode(value as 'new' | 'revision');
                    setErrors({});
                  }}
                >
                  <Radio value='new'>{t('evidossierPackage.wizard.generate.modeNew')}</Radio>
                  <Radio value='revision' disabled={projectVersions.length === 0}>
                    {t('evidossierPackage.wizard.generate.modeRevision')}
                  </Radio>
                </Radio.Group>
                {projectVersions.length === 0 ? (
                  <p className='evd-pkg-field__hint'>{t('evidossierPackage.wizard.generate.noVersionsHint')}</p>
                ) : null}
              </WizardField>
              <WizardField label={t('evidossierPackage.wizard.generate.titleLabel')} required error={errors.title}>
                <Input
                  value={title}
                  onChange={(value) => {
                    setTitle(value);
                    setErrors((prev) => ({ ...prev, title: undefined }));
                  }}
                  placeholder={t('evidossierPackage.wizard.generate.titlePlaceholder')}
                  maxLength={120}
                />
              </WizardField>
              <WizardField
                label={t('evidossierPackage.wizard.generate.goalLabel')}
                required
                error={errors.goal}
                hint={t('evidossierPackage.wizard.generate.goalHint')}
              >
                <Input.TextArea
                  value={goal}
                  autoSize={{ minRows: 3, maxRows: 6 }}
                  placeholder={t('evidossierPackage.wizard.generate.goalPlaceholder')}
                  onChange={(value) => {
                    setGoal(value);
                    setErrors((prev) => ({ ...prev, goal: undefined }));
                  }}
                />
              </WizardField>
              <WizardField
                label={t('evidossierPackage.wizard.generate.requirementsLabel')}
                hint={t('evidossierPackage.wizard.generate.requirementsHint')}
              >
                <Input.TextArea
                  value={requirementsText}
                  autoSize={{ minRows: 2, maxRows: 6 }}
                  placeholder={t('evidossierPackage.wizard.generate.requirementsPlaceholder')}
                  onChange={setRequirementsText}
                />
              </WizardField>
            </div>
          </Card>

          {effectiveMode === 'revision' ? (
            <Card title={t('evidossierPackage.wizard.generate.revisionTitle')}>
              <div className='evd-pkg-form'>
                <WizardField label={t('evidossierPackage.wizard.generate.baseLabel')} required error={errors.base}>
                  <Select
                    getPopupContainer={getPopupMount}
                    value={revisionBaseId}
                    placeholder={t('evidossierPackage.wizard.generate.basePlaceholder')}
                    onChange={(value) => {
                      setRevisionBaseId(String(value));
                      setErrors((prev) => ({ ...prev, base: undefined }));
                    }}
                  >
                    {projectVersions
                      .slice()
                      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                      .map((version) => {
                        const owner = snapshot.packages.find((pkg) => pkg.id === version.packageId);
                        return (
                          <Select.Option key={version.id} value={version.id}>
                            {versionOptionLabel(version, owner?.title)} · {formatDateTime(version.createdAt)}
                          </Select.Option>
                        );
                      })}
                  </Select>
                </WizardField>
                <WizardField
                  label={t('evidossierPackage.wizard.generate.scopeLabel')}
                  required
                  error={errors.scopeNote}
                  hint={t('evidossierPackage.wizard.generate.scopeHint')}
                >
                  <Input.TextArea
                    value={scopeNote}
                    autoSize={{ minRows: 3, maxRows: 6 }}
                    placeholder={t('evidossierPackage.wizard.generate.scopePlaceholder')}
                    onChange={(value) => {
                      setScopeNote(value);
                      setErrors((prev) => ({ ...prev, scopeNote: undefined }));
                    }}
                  />
                </WizardField>
              </div>
            </Card>
          ) : null}

          {effectiveMode === 'new' ? (
            <Card
              title={t('evidossierPackage.wizard.generate.materialsTitle')}
              subtitle={t('evidossierPackage.wizard.generate.materialsSubtitle')}
            >
              <div className='evd-pkg-form'>
                <WizardField
                  label={t('evidossierPackage.wizard.generate.materialsLabel')}
                  hint={t('evidossierPackage.wizard.generate.materialsHint')}
                >
                  <Select
                    getPopupContainer={getPopupMount}
                    mode='multiple'
                    value={materialIds}
                    placeholder={t('evidossierPackage.wizard.generate.materialsPlaceholder')}
                    onChange={(value) => setMaterialIds((value as string[]).map(String))}
                  >
                    {projectMaterials.map((material) => (
                      <Select.Option key={material.id} value={material.id}>
                        {materialOptionLabel(material, t)}
                      </Select.Option>
                    ))}
                  </Select>
                </WizardField>
                {selectedMaterials.some((material) => {
                  const current = material.versions.find((candidate) => candidate.id === material.currentVersionId);
                  return current?.parseStatus === 'failed' || current?.parseStatus === 'partial';
                }) ? (
                  <Banner tone='warning' title={t('evidossierPackage.wizard.generate.unreadableTitle')}>
                    {t('evidossierPackage.wizard.generate.unreadableText')}
                  </Banner>
                ) : null}
              </div>
            </Card>
          ) : null}
        </>
      )}

      <div className='evd-pkg-wizard-footer'>
        <Button onClick={() => navigate(-1)}>{t('evidossierCommon.action.cancel')}</Button>
        <Button type='primary' loading={submitting} onClick={() => void submit()}>
          {t('evidossierCommon.action.createPackage')}
        </Button>
      </div>
    </div>
  );
};

const formatReviewTarget = (
  target: ReviewTarget,
  snapshot: NonNullable<ReturnType<typeof useEvidossier>['snapshot']>
): string => {
  if (target.kind === 'package_version') {
    const version = snapshot.versions.find((candidate) => candidate.id === target.versionId);
    const pkg = version ? snapshot.packages.find((candidate) => candidate.id === version.packageId) : undefined;
    return pkg ? `${target.versionLabel} · ${pkg.title}` : target.versionLabel;
  }
  return `${target.materialName}（v${target.versionNumber}）`;
};
