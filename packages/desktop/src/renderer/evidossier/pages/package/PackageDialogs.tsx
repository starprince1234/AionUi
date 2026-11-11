/**
 * Package dialogs: rename, continue editing and formal version submission.
 *
 * The submission dialog is intentionally explicit about what will be frozen:
 * inputs, stage results, unfinished scope and the change note. For review and
 * comparison packages it previews the simulated report statistics instead of a
 * document draft.
 */
import { Button, Input, Modal, Radio } from '@arco-design/web-react';
import React, { useEffect, useMemo, useState } from 'react';
import type {
  MaterialReference,
  PackageVersion,
  PackageWorkspace,
  StageArtifact,
  SubmitVersionInput,
} from '../../domain/types';
import { resolveMaterialReference } from '../../data/selectors';
import { useEvidossier } from '../../data/EvidossierProvider';
import { Banner, DemoTag, EmptyState, StatusTag, ToneTag, formatDateTime, useEvidT } from '../../design/primitives';
import { DocumentView } from '../../components/DocumentView';
import { artifactKindLabelKey } from './ArtifactEditors';
import { getPopupMount } from './packageSupport';

type SubmitValues = Pick<SubmitVersionInput, 'changeNote' | 'unfinishedNote'>;

const latestArtifactsByStage = (workspace: PackageWorkspace): StageArtifact[] => {
  const byStage = new Map<string, StageArtifact>();
  for (const artifact of workspace.artifacts) {
    const current = byStage.get(artifact.stageId);
    if (!current || artifact.revision > current.revision) byStage.set(artifact.stageId, artifact);
  }
  return [...byStage.values()];
};

const collectInputRefs = (workspace: PackageWorkspace): MaterialReference[] => {
  const refs: MaterialReference[] = [];
  const seen = new Set<string>();
  const push = (ref: MaterialReference): void => {
    const key = `${ref.materialId}:${ref.materialVersionId}:${ref.role}`;
    if (seen.has(key)) return;
    seen.add(key);
    refs.push(ref);
  };
  for (const version of workspace.versions) version.inputs.forEach(push);
  for (const artifact of workspace.artifacts) artifact.basedOn.forEach(push);
  return refs;
};

/* -------------------------------------------------------------------------- */
/* Rename                                                                      */
/* -------------------------------------------------------------------------- */

type RenamePackageDialogProps = {
  visible: boolean;
  currentTitle: string;
  onCancel: () => void;
  onConfirm: (title: string) => Promise<boolean>;
};

export const RenamePackageDialog: React.FC<RenamePackageDialogProps> = ({
  visible,
  currentTitle,
  onCancel,
  onConfirm,
}) => {
  const t = useEvidT();
  const [value, setValue] = useState(currentTitle);
  const [error, setError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setValue(currentTitle);
    setError(undefined);
    setSubmitting(false);
  }, [visible, currentTitle]);

  const submit = async (): Promise<void> => {
    const next = value.trim();
    if (!next) {
      setError(t('evidossierPackage.rename.empty'));
      return;
    }
    setSubmitting(true);
    const ok = await onConfirm(next);
    setSubmitting(false);
    if (!ok) setError(t('evidossierPackage.rename.failed'));
  };

  return (
    <Modal
      title={t('evidossierPackage.rename.title')}
      visible={visible}
      onCancel={onCancel}
      onOk={() => void submit()}
      confirmLoading={submitting}
      okButtonProps={{ disabled: !value.trim() }}
      okText={t('evidossierCommon.action.save')}
      cancelText={t('evidossierCommon.action.cancel')}
      getPopupContainer={getPopupMount}
    >
      <div className='evd-pkg-field'>
        <span className='evd-pkg-field__label'>{t('evidossierPackage.rename.label')}</span>
        <Input
          value={value}
          maxLength={120}
          onChange={(next) => {
            setValue(next);
            setError(undefined);
          }}
          onPressEnter={() => void submit()}
        />
        {error ? <p className='evd-pkg-error-text'>{error}</p> : null}
      </div>
      <p className='evd-pkg-dialog-hint'>{t('evidossierCommon.common.prototypeNotice')}</p>
    </Modal>
  );
};

/* -------------------------------------------------------------------------- */
/* Continue editing                                                            */
/* -------------------------------------------------------------------------- */

type ContinueEditingDialogProps = {
  visible: boolean;
  workspace: PackageWorkspace;
  defaultBaseVersionId?: string;
  onCancel: () => void;
  onConfirm: (baseVersionId: string) => Promise<boolean>;
};

export const ContinueEditingDialog: React.FC<ContinueEditingDialogProps> = ({
  visible,
  workspace,
  defaultBaseVersionId,
  onCancel,
  onConfirm,
}) => {
  const t = useEvidT();
  const versions = workspace.versions;
  const fallbackId = versions.length > 0 ? versions[versions.length - 1].id : undefined;
  const [selected, setSelected] = useState<string | undefined>(defaultBaseVersionId ?? fallbackId);
  const [error, setError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSelected(defaultBaseVersionId ?? fallbackId);
    setError(undefined);
    setSubmitting(false);
  }, [visible, defaultBaseVersionId, fallbackId]);

  const submit = async (): Promise<void> => {
    if (!selected) {
      setError(t('evidossierPackage.continueEdit.selectRequired'));
      return;
    }
    setSubmitting(true);
    const ok = await onConfirm(selected);
    setSubmitting(false);
    if (!ok) setError(t('evidossierPackage.continueEdit.failed'));
  };

  return (
    <Modal
      title={t('evidossierCommon.action.continueEdit')}
      visible={visible}
      onCancel={onCancel}
      onOk={() => void submit()}
      confirmLoading={submitting}
      okButtonProps={{ disabled: !selected }}
      okText={t('evidossierCommon.action.continueEdit')}
      cancelText={t('evidossierCommon.action.cancel')}
      getPopupContainer={getPopupMount}
      style={{ width: 640 }}
    >
      <Banner tone='info' className='evd-mb-16' title={t('evidossierCommon.common.readOnly')}>
        {t('evidossierCommon.common.readOnlyHint')}
      </Banner>
      <p className='evd-body'>{t('evidossierPackage.continueEdit.text')}</p>
      {versions.length === 0 ? (
        <EmptyState
          title={t('evidossierPackage.continueEdit.noVersions')}
          text={t('evidossierPackage.continueEdit.noVersionsText')}
        />
      ) : (
        <Radio.Group
          value={selected}
          onChange={(value) => {
            setSelected(String(value));
            setError(undefined);
          }}
          direction='vertical'
          style={{ width: '100%' }}
        >
          {versions
            .slice()
            .reverse()
            .map((version) => (
              <Radio key={version.id} value={version.id} style={{ alignItems: 'flex-start', marginBottom: 10 }}>
                <span className='evd-row' style={{ flexWrap: 'wrap' }}>
                  <span className='evd-version'>{version.label}</span>
                  <StatusTag kind='version' value={version.status} />
                  <span className='evd-caption'>{formatDateTime(version.createdAt)}</span>
                  {version.id === fallbackId ? (
                    <ToneTag tone='blue'>{t('evidossierCommon.common.current')}</ToneTag>
                  ) : null}
                </span>
                <span className='evd-caption' style={{ display: 'block' }}>
                  {version.changeNote}
                </span>
              </Radio>
            ))}
        </Radio.Group>
      )}
      {error ? <p className='evd-pkg-error-text'>{error}</p> : null}
      <p className='evd-pkg-dialog-hint'>{t('evidossierPackage.continueEdit.hint')}</p>
    </Modal>
  );
};

/* -------------------------------------------------------------------------- */
/* Submit version                                                              */
/* -------------------------------------------------------------------------- */

type SubmitVersionDialogProps = {
  visible: boolean;
  workspace: PackageWorkspace;
  onCancel: () => void;
  onSubmit: (values: SubmitValues) => Promise<PackageVersion | undefined>;
};

export const SubmitVersionDialog: React.FC<SubmitVersionDialogProps> = ({ visible, workspace, onCancel, onSubmit }) => {
  const t = useEvidT();
  const { snapshot } = useEvidossier();
  const kind = workspace.pkg.task.kind;
  const isReport = kind === 'review' || kind === 'compare';
  const defaultChangeNote =
    kind === 'review'
      ? t('evidossierPackage.submit.defaultReviewNote')
      : kind === 'compare'
        ? t('evidossierPackage.submit.defaultCompareNote')
        : '';

  const [changeNote, setChangeNote] = useState(defaultChangeNote);
  const [unfinishedNote, setUnfinishedNote] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setChangeNote(defaultChangeNote);
    setUnfinishedNote('');
    setError(undefined);
    setSubmitting(false);
    setPreviewOpen(false);
  }, [visible, defaultChangeNote]);

  const stageArtifacts = useMemo(() => latestArtifactsByStage(workspace), [workspace]);
  const inputRefs = useMemo(() => collectInputRefs(workspace), [workspace]);
  const latestDraft = useMemo(
    () =>
      workspace.artifacts.filter((artifact) => artifact.kind === 'draft').sort((a, b) => b.revision - a.revision)[0],
    [workspace.artifacts]
  );
  const reportArtifact = useMemo(
    () =>
      workspace.artifacts
        .filter((artifact) => artifact.kind === 'review_report' || artifact.kind === 'comparison_report')
        .sort((a, b) => b.revision - a.revision)[0],
    [workspace.artifacts]
  );

  const submit = async (): Promise<void> => {
    const note = changeNote.trim();
    if (!note) {
      setError(t('evidossierPackage.submit.changeNoteRequired'));
      return;
    }
    setSubmitting(true);
    const version = await onSubmit({
      changeNote: note,
      unfinishedNote: unfinishedNote.trim() || undefined,
    });
    setSubmitting(false);
    if (!version) setError(t('evidossierPackage.submit.failed'));
  };

  const renderInputs = (): React.ReactNode => (
    <div className='evd-pkg-dialog-section'>
      <p className='evd-pkg-dialog-section__title'>{t('evidossierPackage.submit.inputs')}</p>
      {inputRefs.length === 0 ? (
        <p className='evd-caption evd-mb-0'>{t('evidossierPackage.submit.noInputs')}</p>
      ) : (
        <ul className='evd-pkg-dialog-list'>
          {inputRefs.map((ref) => {
            const resolved = snapshot ? resolveMaterialReference(snapshot, ref) : undefined;
            const available = resolved?.available ?? false;
            return (
              <li key={`${ref.id}-${ref.role}`}>
                {ref.materialName}（v{ref.versionNumber}）· {t(`evidossierCommon.materialUsage.${ref.role}`)}
                {available ? null : (
                  <span style={{ marginLeft: 6 }}>
                    <ToneTag tone='red'>{t('evidossierPackage.status.unavailable')}</ToneTag>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className='evd-pkg-dialog-hint'>{t('evidossierPackage.submit.inputsHint')}</p>
    </div>
  );

  const renderStageResults = (): React.ReactNode => (
    <div className='evd-pkg-dialog-section'>
      <p className='evd-pkg-dialog-section__title'>{t('evidossierPackage.submit.stageResults')}</p>
      {stageArtifacts.length === 0 ? (
        <p className='evd-caption evd-mb-0'>{t('evidossierPackage.submit.noStageResults')}</p>
      ) : (
        <div className='evd-table-wrap' style={{ border: 0 }}>
          <table className='evd-table evd-table--compact'>
            <tbody>
              {stageArtifacts.map((artifact) => (
                <tr key={artifact.id}>
                  <td>{t(artifactKindLabelKey(artifact.kind))}</td>
                  <td>
                    <ToneTag>{t('evidossierPackage.artifact.revisionTag', { revision: artifact.revision })}</ToneTag>
                  </td>
                  <td>
                    <StatusTag kind='artifact' value={artifact.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className='evd-pkg-dialog-hint'>{t('evidossierPackage.submit.stageResultsHint')}</p>
    </div>
  );

  const renderDraftPreview = (): React.ReactNode => {
    if (!previewOpen) return null;
    if (latestDraft && latestDraft.payload.type === 'draft') {
      const payload = latestDraft.payload;
      return (
        <div className='evd-pkg-preview'>
          <p className='evd-pkg-preview__title'>{t('evidossierPackage.submit.previewDraftTitle')}</p>
          {payload.sections.map((section) => (
            <section key={section.id}>
              <h3 className='evd-pkg-draft-heading'>{section.heading}</h3>
              {section.paragraphs.map((paragraph) => (
                <p className='evd-pkg-draft-paragraph' key={paragraph.id}>
                  {paragraph.text}
                </p>
              ))}
            </section>
          ))}
        </div>
      );
    }
    if (workspace.currentVersion?.deliverable.document) {
      return (
        <div className='evd-pkg-preview'>
          <DocumentView document={workspace.currentVersion.deliverable.document} />
        </div>
      );
    }
    return (
      <div className='evd-pkg-preview'>
        <EmptyState
          title={t('evidossierPackage.submit.previewUnavailable')}
          text={t('evidossierPackage.submit.previewUnavailableText')}
        />
      </div>
    );
  };

  const renderReportPreview = (): React.ReactNode => {
    const payload = reportArtifact?.payload;
    return (
      <div className='evd-pkg-dialog-section'>
        <p className='evd-pkg-dialog-section__title'>{t('evidossierPackage.submit.reportStats')}</p>
        {!reportArtifact || !payload ? (
          <Banner tone='warning' title={t('evidossierPackage.submit.reportMissingTitle')}>
            {t('evidossierPackage.submit.reportMissingText')}
          </Banner>
        ) : (
          <>
            <p className='evd-pkg-statline'>
              <ToneTag>{t(artifactKindLabelKey(reportArtifact.kind))}</ToneTag>
              <StatusTag kind='artifact' value={reportArtifact.status} />
              <span className='evd-caption'>
                {t('evidossierPackage.artifact.revisionTag', { revision: reportArtifact.revision })} ·{' '}
                {formatDateTime(reportArtifact.updatedAt)}
              </span>
            </p>
            {payload.type === 'review_report' ? (
              <>
                <p className='evd-pkg-statline'>
                  {t('evidossierPackage.submit.coverageLine', {
                    checked: payload.coverageStats.checked,
                    unchecked: payload.coverageStats.unchecked,
                    uncheckable: payload.coverageStats.uncheckable,
                    na: payload.coverageStats.notApplicable,
                  })}
                </p>
                <p className='evd-pkg-statline'>
                  {t('evidossierPackage.submit.findingLine', {
                    high: payload.findingStats.high,
                    medium: payload.findingStats.medium,
                    low: payload.findingStats.low,
                    info: payload.findingStats.info,
                    uncertain: payload.findingStats.uncertain,
                  })}
                </p>
                <p className='evd-pkg-dialog-section__title'>{t('evidossierPackage.submit.reviewedVersions')}</p>
                <ul className='evd-pkg-dialog-list'>
                  {payload.reviewedVersionRefs.map((ref) => (
                    <li key={ref.versionId}>
                      {ref.packageCode} · {ref.packageTitle} · {ref.versionLabel}
                    </li>
                  ))}
                </ul>
                {payload.limitations.length > 0 ? (
                  <>
                    <p className='evd-pkg-dialog-section__title' style={{ marginTop: 8 }}>
                      {t('evidossierPackage.submit.limitations')}
                    </p>
                    <ul className='evd-pkg-dialog-list'>
                      {payload.limitations.map((limitation, index) => (
                        <li key={index}>{limitation}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </>
            ) : payload.type === 'comparison_report' ? (
              <>
                <p className='evd-pkg-statline'>
                  {t('evidossierPackage.submit.differenceLine', {
                    added: payload.differenceStats.added,
                    removed: payload.differenceStats.removed,
                    modified: payload.differenceStats.modified,
                    moved: payload.differenceStats.moved,
                    uncertain: payload.differenceStats.uncertain,
                  })}
                </p>
                <p className='evd-pkg-dialog-section__title'>{t('evidossierPackage.submit.comparedVersions')}</p>
                <ul className='evd-pkg-dialog-list'>
                  {payload.inputs.map((input) => (
                    <li key={`${input.ref.versionId}-${input.role}`}>
                      {t(`evidossierCommon.comparisonRole.${input.role}`)}：{input.ref.packageCode} ·{' '}
                      {input.ref.packageTitle} · {input.ref.versionLabel}
                    </li>
                  ))}
                </ul>
                {payload.limitations.length > 0 ? (
                  <>
                    <p className='evd-pkg-dialog-section__title' style={{ marginTop: 8 }}>
                      {t('evidossierPackage.submit.limitations')}
                    </p>
                    <ul className='evd-pkg-dialog-list'>
                      {payload.limitations.map((limitation, index) => (
                        <li key={index}>{limitation}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </>
            ) : null}
            <p className='evd-pkg-dialog-hint'>{t('evidossierPackage.submit.reportFooter')}</p>
          </>
        )}
      </div>
    );
  };

  return (
    <Modal
      title={isReport ? t('evidossierCommon.action.submitReport') : t('evidossierCommon.action.submitVersion')}
      visible={visible}
      onCancel={onCancel}
      onOk={() => void submit()}
      confirmLoading={submitting}
      okButtonProps={{ disabled: !changeNote.trim() }}
      okText={isReport ? t('evidossierCommon.action.submitReport') : t('evidossierCommon.action.submitVersion')}
      cancelText={t('evidossierCommon.action.cancel')}
      getPopupContainer={getPopupMount}
      style={{ width: 760 }}
    >
      <Banner tone='info' className='evd-mb-8' title={t('evidossierPackage.submit.freezeTitle')}>
        {t('evidossierPackage.submit.freezeText')}
      </Banner>
      <p className='evd-caption'>
        <DemoTag>{t('evidossierCommon.common.simulated')}</DemoTag> {t('evidossierPackage.submit.demoHint')}
      </p>

      {isReport ? renderReportPreview() : renderStageResults()}
      {isReport ? null : (
        <div className='evd-pkg-dialog-section'>
          <p className='evd-pkg-dialog-section__title'>{t('evidossierPackage.submit.preview')}</p>
          <Button size='small' onClick={() => setPreviewOpen((open) => !open)}>
            {previewOpen ? t('evidossierPackage.submit.hidePreview') : t('evidossierPackage.submit.showPreview')}
          </Button>
          {renderDraftPreview()}
          <p className='evd-pkg-dialog-hint'>{t('evidossierPackage.submit.previewHint')}</p>
        </div>
      )}

      {renderInputs()}

      <div className='evd-pkg-dialog-section'>
        <div className='evd-pkg-field'>
          <span className='evd-pkg-field__label'>{t('evidossierPackage.submit.changeNote')}</span>
          <Input.TextArea
            value={changeNote}
            autoSize={{ minRows: 2, maxRows: 4 }}
            placeholder={t('evidossierPackage.submit.changeNotePlaceholder')}
            onChange={(value) => {
              setChangeNote(value);
              setError(undefined);
            }}
          />
        </div>
        <div className='evd-pkg-field evd-mt-8'>
          <span className='evd-pkg-field__label'>{t('evidossierPackage.submit.unfinishedNote')}</span>
          <Input.TextArea
            value={unfinishedNote}
            autoSize={{ minRows: 2, maxRows: 4 }}
            placeholder={t('evidossierPackage.submit.unfinishedPlaceholder')}
            onChange={setUnfinishedNote}
          />
          <p className='evd-pkg-dialog-hint'>{t('evidossierPackage.submit.unfinishedHint')}</p>
        </div>
        {error ? <p className='evd-pkg-error-text'>{error}</p> : null}
      </div>
    </Modal>
  );
};
