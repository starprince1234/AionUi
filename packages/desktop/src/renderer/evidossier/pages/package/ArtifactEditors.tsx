/**
 * Stage artifact renderers and editors for the generate workbench.
 *
 * The read-only branches are the honest presentation of simulated artifacts;
 * the editable branches only cover the payload kinds the generate loop owns
 * (facts, outline, draft). Validation and report artifacts stay read-only here
 * because they are confirmation/report surfaces, not authoring surfaces.
 */
import { Button, Input, Select } from '@arco-design/web-react';
import React from 'react';
import type {
  DraftPayload,
  FactItem,
  FactItemStatus,
  FactListPayload,
  OutlinePayload,
  OutlineSection,
  StageArtifact,
  StageArtifactKind,
  StageArtifactPayload,
  ValidationPayload,
} from '../../domain/types';
import { EmptyState, StatusTag, ToneTag, useEvidT } from '../../design/primitives';
import { IconClose, IconPlus } from '../../design/icons';
import { getPopupMount } from './packageSupport';

const FACT_KINDS: FactItem['kind'][] = ['fact', 'requirement', 'assumption', 'conflict', 'gap'];
const FACT_STATUSES: FactItemStatus[] = ['confirmed', 'pending', 'conflict', 'missing'];

let localSeq = 0;
const localId = (prefix: string): string => {
  localSeq += 1;
  return `${prefix}-local-${Date.now().toString(36)}-${localSeq}`;
};

export const isArtifactEditable = (kind: StageArtifactKind): boolean =>
  kind === 'fact_list' || kind === 'outline' || kind === 'draft';

/** Plain-text lines used by the conflict comparison; never raw payload dumps. */
export const summarizeArtifact = (artifact: StageArtifact): string[] => {
  const payload = artifact.payload;
  if (payload.type === 'fact_list') return payload.items.map((item) => item.statement).filter(Boolean);
  if (payload.type === 'outline') return payload.sections.map((section) => section.title).filter(Boolean);
  if (payload.type === 'draft') return payload.sections.map((section) => section.heading).filter(Boolean);
  if (payload.type === 'validation') return payload.checks.map((check) => check.label);
  return [artifact.summary];
};

type EditorProps = {
  artifact: StageArtifact;
  editing: boolean;
  payload: StageArtifactPayload;
  onChange: (payload: StageArtifactPayload) => void;
};

/* -------------------------------------------------------------------------- */
/* Read-only renderers                                                         */
/* -------------------------------------------------------------------------- */

const FactListReadOnly: React.FC<{ payload: FactListPayload }> = ({ payload }) => {
  const t = useEvidT();
  return (
    <div className='evd-pkg-editor evd-pkg-editor--flush'>
      {payload.items.length === 0 ? (
        <EmptyState title={t('evidossierPackage.artifact.emptyFactList')} center />
      ) : (
        <div className='evd-table-wrap' style={{ border: 0 }}>
          <table className='evd-table evd-pkg-table'>
            <thead>
              <tr>
                <th style={{ width: 90 }}>{t('evidossierPackage.fact.colKind')}</th>
                <th style={{ minWidth: 220 }}>{t('evidossierPackage.fact.colStatement')}</th>
                <th style={{ width: 170 }}>{t('evidossierPackage.fact.colSource')}</th>
                <th style={{ width: 100 }}>{t('evidossierPackage.fact.colStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {payload.items.map((item) => (
                <tr key={item.id}>
                  <td>{t(`evidossierPackage.factKind.${item.kind}`)}</td>
                  <td>{item.statement}</td>
                  <td>
                    {item.source ? (
                      <span className='evd-caption'>
                        {item.source.sectionPath}
                        <br />
                        {item.source.quote}
                      </span>
                    ) : (
                      <span className='evd-caption evd-subtle'>{t('evidossierPackage.fact.noSource')}</span>
                    )}
                  </td>
                  <td>
                    <StatusTag kind='fact' value={item.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {payload.openQuestions.length > 0 ? (
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--evd-hairline)' }}>
          <p className='evd-pkg-field__label'>{t('evidossierPackage.fact.openQuestions')}</p>
          <ul className='evd-pkg-dialog-list'>
            {payload.openQuestions.map((question, index) => (
              <li key={index}>{question}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

const outlineStatusLabelKey = (status: OutlineSection['status']): string =>
  `evidossierPackage.outline.status.${status}`;

const OutlineReadOnly: React.FC<{ payload: OutlinePayload }> = ({ payload }) => {
  const t = useEvidT();
  if (payload.sections.length === 0) {
    return (
      <div className='evd-pkg-editor'>
        <EmptyState title={t('evidossierPackage.artifact.emptyOutline')} center />
      </div>
    );
  }
  return (
    <div className='evd-pkg-editor evd-pkg-editor--flush'>
      <div className='evd-table-wrap' style={{ border: 0 }}>
        <table className='evd-table evd-pkg-table'>
          <thead>
            <tr>
              <th style={{ width: 220 }}>{t('evidossierPackage.outline.colTitle')}</th>
              <th>{t('evidossierPackage.outline.colPurpose')}</th>
              <th style={{ width: 160 }}>{t('evidossierPackage.outline.colRequirements')}</th>
              <th style={{ width: 130 }}>{t('evidossierPackage.outline.colStatus')}</th>
            </tr>
          </thead>
          <tbody>
            {payload.sections.map((section) => (
              <tr key={section.id}>
                <td>{section.title}</td>
                <td>{section.purpose}</td>
                <td>
                  {section.requirementRefs.length > 0 ? (
                    <span className='evd-inline-list'>
                      {section.requirementRefs.map((ref) => (
                        <ToneTag key={ref}>{ref}</ToneTag>
                      ))}
                    </span>
                  ) : (
                    <span className='evd-caption evd-subtle'>{t('evidossierCommon.common.none')}</span>
                  )}
                </td>
                <td>
                  <div className='evd-stack evd-stack--sm'>
                    <ToneTag tone={section.status === 'confirmed' ? 'green' : 'yellow'}>
                      {t(outlineStatusLabelKey(section.status))}
                    </ToneTag>
                    {section.inScope === false ? (
                      <ToneTag tone='red'>{t('evidossierPackage.outline.outOfScope')}</ToneTag>
                    ) : null}
                    {section.inScope === true ? (
                      <ToneTag tone='blue'>{t('evidossierPackage.outline.inScope')}</ToneTag>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {payload.scopeNote ? (
        <p className='evd-caption' style={{ padding: '10px 16px', borderTop: '1px solid var(--evd-hairline)' }}>
          {payload.scopeNote}
        </p>
      ) : null}
    </div>
  );
};

const DraftReadOnly: React.FC<{ payload: DraftPayload }> = ({ payload }) => {
  const t = useEvidT();
  if (payload.sections.length === 0) {
    return (
      <div className='evd-pkg-editor'>
        <EmptyState title={t('evidossierPackage.artifact.emptyDraft')} center />
      </div>
    );
  }
  return (
    <div className='evd-pkg-editor'>
      {payload.isPartial ? <p className='evd-caption evd-mb-16'>{t('evidossierPackage.draft.partialHint')}</p> : null}
      {payload.sections.map((section) => (
        <section className='evd-pkg-draft-section' key={section.id}>
          <h3 className='evd-pkg-draft-heading'>{section.heading}</h3>
          {section.paragraphs.map((paragraph) => (
            <div key={paragraph.id}>
              {paragraph.change && paragraph.change !== 'unchanged' ? (
                <div className='evd-pkg-change-row'>
                  <ToneTag tone={paragraph.change === 'added' ? 'green' : 'yellow'}>
                    {t(`evidossierPackage.draft.change.${paragraph.change}`)}
                  </ToneTag>
                  {paragraph.citationRefs && paragraph.citationRefs.length > 0 ? (
                    <span className='evd-caption'>
                      {t('evidossierPackage.draft.citationCount', { count: paragraph.citationRefs.length })}
                    </span>
                  ) : null}
                </div>
              ) : null}
              {paragraph.previousText ? (
                <div className='evd-pkg-previous'>
                  <span className='evd-pkg-previous__label'>{t('evidossierPackage.draft.previous')}</span>
                  {paragraph.previousText}
                </div>
              ) : null}
              <p className='evd-pkg-draft-paragraph'>{paragraph.text}</p>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
};

const ValidationReadOnly: React.FC<{ payload: ValidationPayload }> = ({ payload }) => {
  const t = useEvidT();
  return (
    <div className='evd-pkg-editor'>
      {payload.checks.length === 0 ? (
        <EmptyState title={t('evidossierPackage.validation.empty')} center />
      ) : (
        payload.checks.map((check) => (
          <div className='evd-pkg-validation-row' key={check.id}>
            <StatusTag kind='validation' value={check.status} />
            <div className='evd-flex-1'>
              <span className='evd-body' style={{ fontWeight: 600 }}>
                {check.label}
              </span>
              <p className='evd-caption' style={{ margin: '2px 0 0' }}>
                {check.detail}
              </p>
              {check.location ? (
                <p className='evd-caption evd-subtle' style={{ margin: '2px 0 0' }}>
                  {check.location.sectionPath}
                </p>
              ) : null}
            </div>
          </div>
        ))
      )}
      {payload.openItems.length > 0 ? (
        <div className='evd-mt-16'>
          <p className='evd-pkg-field__label'>{t('evidossierPackage.validation.openItems')}</p>
          <ul className='evd-pkg-dialog-list'>
            {payload.openItems.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

const UnsupportedReadOnly: React.FC<{ artifact: StageArtifact }> = ({ artifact }) => {
  const t = useEvidT();
  return (
    <div className='evd-pkg-editor'>
      <p className='evd-body'>{artifact.summary}</p>
      <p className='evd-caption' style={{ margin: '8px 0 0' }}>
        {t('evidossierPackage.artifact.unsupported')}
      </p>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Editors                                                                     */
/* -------------------------------------------------------------------------- */

const FactListEditor: React.FC<{ payload: FactListPayload; onChange: (payload: StageArtifactPayload) => void }> = ({
  payload,
  onChange,
}) => {
  const t = useEvidT();
  const updateItem = (itemId: string, patch: Partial<FactItem>): void => {
    onChange({
      ...payload,
      items: payload.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
    });
  };
  const addItem = (): void => {
    onChange({
      ...payload,
      items: [
        ...payload.items,
        {
          id: localId('fact'),
          kind: 'fact',
          statement: '',
          status: 'pending',
        },
      ],
    });
  };
  const removeItem = (itemId: string): void => {
    onChange({ ...payload, items: payload.items.filter((item) => item.id !== itemId) });
  };

  return (
    <div className='evd-pkg-editor'>
      <div className='evd-table-wrap'>
        <table className='evd-table evd-pkg-table'>
          <thead>
            <tr>
              <th style={{ width: 120 }}>{t('evidossierPackage.fact.colKind')}</th>
              <th>{t('evidossierPackage.fact.colStatement')}</th>
              <th style={{ width: 130 }}>{t('evidossierPackage.fact.colStatus')}</th>
              <th style={{ width: 64 }}>{t('evidossierCommon.common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {payload.items.map((item) => (
              <tr key={item.id}>
                <td>
                  <Select
                    getPopupContainer={getPopupMount}
                    size='small'
                    value={item.kind}
                    onChange={(value) => updateItem(item.id, { kind: value as FactItem['kind'] })}
                  >
                    {FACT_KINDS.map((kind) => (
                      <Select.Option key={kind} value={kind}>
                        {t(`evidossierPackage.factKind.${kind}`)}
                      </Select.Option>
                    ))}
                  </Select>
                </td>
                <td>
                  <Input
                    size='small'
                    value={item.statement}
                    placeholder={t('evidossierPackage.fact.statementPlaceholder')}
                    onChange={(value) => updateItem(item.id, { statement: value })}
                  />
                </td>
                <td>
                  <Select
                    getPopupContainer={getPopupMount}
                    size='small'
                    value={item.status}
                    onChange={(value) => updateItem(item.id, { status: value as FactItemStatus })}
                  >
                    {FACT_STATUSES.map((status) => (
                      <Select.Option key={status} value={status}>
                        {t(`evidossierCommon.status.fact.${status}`)}
                      </Select.Option>
                    ))}
                  </Select>
                </td>
                <td>
                  <div className='evd-pkg-row-actions'>
                    <Button
                      size='mini'
                      type='text'
                      icon={<IconClose size={12} />}
                      aria-label={t('evidossierPackage.fact.delete')}
                      onClick={() => removeItem(item.id)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button className='evd-mt-8' size='small' icon={<IconPlus size={12} />} onClick={addItem}>
        {t('evidossierPackage.fact.add')}
      </Button>
      {payload.openQuestions.length > 0 ? (
        <div className='evd-mt-16'>
          <p className='evd-pkg-field__label'>{t('evidossierPackage.fact.openQuestions')}</p>
          <ul className='evd-pkg-dialog-list'>
            {payload.openQuestions.map((question, index) => (
              <li key={index}>{question}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

const OutlineEditor: React.FC<{ payload: OutlinePayload; onChange: (payload: StageArtifactPayload) => void }> = ({
  payload,
  onChange,
}) => {
  const t = useEvidT();
  const updateSection = (sectionId: string, patch: Partial<OutlineSection>): void => {
    onChange({
      ...payload,
      sections: payload.sections.map((section) => (section.id === sectionId ? { ...section, ...patch } : section)),
    });
  };
  const removeSection = (sectionId: string): void => {
    onChange({ ...payload, sections: payload.sections.filter((section) => section.id !== sectionId) });
  };
  const addSection = (): void => {
    onChange({
      ...payload,
      sections: [
        ...payload.sections,
        {
          id: localId('sec'),
          title: '',
          purpose: '',
          requirementRefs: [],
          basisRefs: [],
          status: 'planned',
        },
      ],
    });
  };

  return (
    <div className='evd-pkg-editor'>
      {payload.sections.map((section) => (
        <div className='evd-pkg-outline-section' key={section.id}>
          <div className='evd-pkg-outline-grid'>
            <div className='evd-pkg-field'>
              <span className='evd-pkg-field__label'>{t('evidossierPackage.outline.colTitle')}</span>
              <Input
                value={section.title}
                placeholder={t('evidossierPackage.outline.titlePlaceholder')}
                onChange={(value) => updateSection(section.id, { title: value })}
              />
            </div>
            <div className='evd-pkg-field'>
              <span className='evd-pkg-field__label'>{t('evidossierPackage.outline.colPurpose')}</span>
              <Input.TextArea
                value={section.purpose}
                autoSize={{ minRows: 2, maxRows: 4 }}
                placeholder={t('evidossierPackage.outline.purposePlaceholder')}
                onChange={(value) => updateSection(section.id, { purpose: value })}
              />
            </div>
          </div>
          <div className='evd-row evd-mt-8' style={{ flexWrap: 'wrap' }}>
            {section.requirementRefs.length > 0 ? (
              <span className='evd-inline-list'>
                {section.requirementRefs.map((ref) => (
                  <ToneTag key={ref}>{ref}</ToneTag>
                ))}
              </span>
            ) : null}
            {section.inScope === true ? <ToneTag tone='blue'>{t('evidossierPackage.outline.inScope')}</ToneTag> : null}
            {section.inScope === false ? (
              <ToneTag tone='red'>{t('evidossierPackage.outline.outOfScope')}</ToneTag>
            ) : null}
            <Button
              size='mini'
              type='text'
              style={{ marginLeft: 'auto' }}
              icon={<IconClose size={12} />}
              onClick={() => removeSection(section.id)}
            >
              {t('evidossierPackage.outline.delete')}
            </Button>
          </div>
        </div>
      ))}
      <Button size='small' icon={<IconPlus size={12} />} onClick={addSection}>
        {t('evidossierPackage.outline.add')}
      </Button>
    </div>
  );
};

const DraftEditor: React.FC<{ payload: DraftPayload; onChange: (payload: StageArtifactPayload) => void }> = ({
  payload,
  onChange,
}) => {
  const t = useEvidT();
  const updateHeading = (sectionId: string, heading: string): void => {
    onChange({
      ...payload,
      sections: payload.sections.map((section) => (section.id === sectionId ? { ...section, heading } : section)),
    });
  };
  const updateParagraph = (sectionId: string, paragraphId: string, text: string): void => {
    onChange({
      ...payload,
      sections: payload.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              paragraphs: section.paragraphs.map((paragraph) =>
                paragraph.id === paragraphId ? { ...paragraph, text } : paragraph
              ),
            }
          : section
      ),
    });
  };

  return (
    <div className='evd-pkg-editor'>
      {payload.sections.map((section) => (
        <section className='evd-pkg-draft-section' key={section.id}>
          <div className='evd-pkg-field evd-mb-8'>
            <span className='evd-pkg-field__label'>{t('evidossierPackage.draft.headingLabel')}</span>
            <Input value={section.heading} onChange={(value) => updateHeading(section.id, value)} />
          </div>
          {section.paragraphs.map((paragraph) => (
            <div key={paragraph.id} className='evd-mb-16'>
              {paragraph.change && paragraph.change !== 'unchanged' ? (
                <div className='evd-pkg-change-row'>
                  <ToneTag tone={paragraph.change === 'added' ? 'green' : 'yellow'}>
                    {t(`evidossierPackage.draft.change.${paragraph.change}`)}
                  </ToneTag>
                </div>
              ) : null}
              {paragraph.previousText ? (
                <div className='evd-pkg-previous'>
                  <span className='evd-pkg-previous__label'>{t('evidossierPackage.draft.previous')}</span>
                  {paragraph.previousText}
                </div>
              ) : null}
              <Input.TextArea
                value={paragraph.text}
                autoSize={{ minRows: 3, maxRows: 10 }}
                onChange={(value) => updateParagraph(section.id, paragraph.id, value)}
              />
            </div>
          ))}
        </section>
      ))}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Entry component                                                             */
/* -------------------------------------------------------------------------- */

export const ArtifactEditor: React.FC<EditorProps> = ({ artifact, editing, payload, onChange }) => {
  if (editing) {
    if (payload.type === 'fact_list') return <FactListEditor payload={payload} onChange={onChange} />;
    if (payload.type === 'outline') return <OutlineEditor payload={payload} onChange={onChange} />;
    if (payload.type === 'draft') return <DraftEditor payload={payload} onChange={onChange} />;
  }

  if (payload.type === 'fact_list') return <FactListReadOnly payload={payload} />;
  if (payload.type === 'outline') return <OutlineReadOnly payload={payload} />;
  if (payload.type === 'draft') return <DraftReadOnly payload={payload} />;
  if (payload.type === 'validation') return <ValidationReadOnly payload={payload} />;
  return <UnsupportedReadOnly artifact={artifact} />;
};

/** Small helper used by the stage header to keep labels consistent. */
export const artifactKindLabelKey = (kind: StageArtifactKind): string => `evidossierCommon.artifactKind.${kind}`;

/** Tone used for the conflict column tags. */
export const artifactStatusTone = (
  status: StageArtifact['status']
): 'neutral' | 'green' | 'yellow' | 'red' | 'outline' => {
  switch (status) {
    case 'confirmed':
      return 'green';
    case 'pending_confirmation':
    case 'needs_review':
      return 'yellow';
    case 'failed':
      return 'red';
    case 'superseded':
      return 'outline';
    default:
      return 'neutral';
  }
};
