/**
 * Presentational panels for the version comparison workbench: difference list,
 * difference detail, section correspondence and comparison report.
 *
 * The panels stay read-only; the only state-changing actions (confirming a
 * candidate result, submitting the report, starting a revision) live in
 * CompareWorkbench.
 */
import { Button, Checkbox } from '@arco-design/web-react';
import React from 'react';
import type {
  ComparisonDifference,
  ComparisonReportPayload,
  DifferencesPayload,
  MappingPayload,
  PackageVersion,
  SectionMapping,
  Stage,
  StageArtifact,
} from '../../domain/types';
import { Banner, RowButton, Stats, StatusTag, ToneTag, cx, formatDateTime, useEvidT } from '../../design/primitives';
import { DIFFERENCE_KINDS, differenceKindCounts } from './compareHelpers';

/* -------------------------------------------------------------------------- */
/* Difference list                                                             */
/* -------------------------------------------------------------------------- */

export const DifferencesPane: React.FC<{
  differences: ComparisonDifference[];
  totalCount: number;
  hasArtifact: boolean;
  kinds: ComparisonDifference['kind'][];
  onToggleKind: (kind: ComparisonDifference['kind']) => void;
  differencesPayload?: DifferencesPayload;
  report?: ComparisonReportPayload;
  stage?: Stage;
  selectedIds: string[];
  activeId?: string;
  onToggleSelected: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  onActivate: (difference: ComparisonDifference) => void;
  footer?: React.ReactNode;
}> = ({
  differences,
  totalCount,
  hasArtifact,
  kinds,
  onToggleKind,
  differencesPayload,
  report,
  stage,
  selectedIds,
  activeId,
  onToggleSelected,
  onToggleAll,
  onActivate,
  footer,
}) => {
  const t = useEvidT();
  const allDifferences = differencesPayload?.differences ?? [];
  const counts = differenceKindCounts(allDifferences);
  const allSelected = differences.length > 0 && differences.every((difference) => selectedIds.includes(difference.id));
  const someSelected = differences.some((difference) => selectedIds.includes(difference.id));

  return (
    <div className='evd-cmp__listpane'>
      <div className='evd-cmp__filters'>
        <span className='evd-label evd-cmp__filterlabel'>{t('evidossierReview.compare.filters.label')}</span>
        {DIFFERENCE_KINDS.map((kind) => (
          <Checkbox key={kind} checked={kinds.includes(kind)} onChange={() => onToggleKind(kind)}>
            <span className='evd-caption'>
              {t(`evidossierCommon.status.diff.${kind}`)} {counts[kind]}
            </span>
          </Checkbox>
        ))}
      </div>
      <div className='evd-cmp__listhead'>
        <Checkbox
          checked={allSelected}
          indeterminate={someSelected && !allSelected}
          onChange={onToggleAll}
          disabled={differences.length === 0}
          aria-label={t('evidossierReview.compare.differences.selectAll')}
        />
        <span className='evd-caption'>
          {t('evidossierReview.compare.differences.selectedCount', { count: selectedIds.length })}
        </span>
        <span className='evd-caption evd-cmp__listcount'>
          {t('evidossierReview.compare.differences.total', { count: totalCount })}
        </span>
      </div>
      <div className='evd-cmp__scroll'>
        {!hasArtifact ? (
          <div className='evd-cmp__pane-pad'>
            <div className='evd-empty'>
              <p className='evd-empty__title'>{t('evidossierReview.compare.differences.emptyNoArtifactTitle')}</p>
              <p className='evd-empty__text'>{t('evidossierReview.compare.differences.emptyNoArtifactText')}</p>
              {stage ? (
                <p className='evd-caption'>
                  {t('evidossierReview.review.coverage.currentStage', { stage: t(stage.titleKey) })}
                </p>
              ) : null}
            </div>
          </div>
        ) : totalCount === 0 ? (
          <div className='evd-cmp__pane-pad'>
            <Banner tone='info' title={t('evidossierReview.compare.differences.zeroTitle')}>
              {t('evidossierReview.compare.differences.zeroText')}
            </Banner>
            {differencesPayload?.scopeNote ? (
              <p className='evd-caption evd-mt-16'>
                {t('evidossierReview.compare.differences.zeroScope', { scope: differencesPayload.scopeNote })}
              </p>
            ) : null}
            {report && report.limitations.length > 0 ? (
              <div className='evd-mt-16'>
                <p className='evd-label'>{t('evidossierReview.compare.differences.zeroLimitations')}</p>
                <ul className='evd-cmp__bullets'>
                  {report.limitations.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : differences.length === 0 ? (
          <div className='evd-cmp__pane-pad'>
            <div className='evd-empty'>
              <p className='evd-empty__title'>{t('evidossierReview.compare.differences.emptyFilteredTitle')}</p>
              <p className='evd-empty__text'>{t('evidossierReview.compare.differences.emptyFilteredText')}</p>
            </div>
          </div>
        ) : (
          differences.map((difference) => (
            <div
              key={difference.id}
              className={cx('evd-cmp__diffrow', activeId === difference.id && 'evd-cmp__diffrow--active')}
            >
              <Checkbox
                checked={selectedIds.includes(difference.id)}
                onChange={() => onToggleSelected(difference.id)}
                aria-label={difference.code}
              />
              <RowButton
                className='evd-cmp__diffmain'
                onClick={() => onActivate(difference)}
                ariaLabel={`${difference.code} ${difference.summary}`}
              >
                <span className='evd-cmp__diffhead'>
                  <StatusTag kind='diff' value={difference.kind} />
                  <span className='evd-mono evd-subtle'>{difference.code}</span>
                  <StatusTag kind='mapping' value={difference.confidence} />
                </span>
                <span className='evd-cmp__difftitle'>{difference.summary}</span>
                <span className='evd-cmp__diffmeta'>
                  {difference.baseLocation ? (
                    <span className='evd-truncate'>{difference.baseLocation.sectionPath}</span>
                  ) : (
                    <span>{t('evidossierReview.compare.detail.noSide')}</span>
                  )}
                  <span aria-hidden>→</span>
                  {difference.targetLocation ? (
                    <span className='evd-truncate'>{difference.targetLocation.sectionPath}</span>
                  ) : (
                    <span>{t('evidossierReview.compare.detail.noSide')}</span>
                  )}
                </span>
              </RowButton>
            </div>
          ))
        )}
      </div>
      {footer ? <div className='evd-cmp__footer'>{footer}</div> : null}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Difference detail                                                           */
/* -------------------------------------------------------------------------- */

export const DifferenceDetailPane: React.FC<{
  difference?: ComparisonDifference;
  mapping?: SectionMapping;
  onLocateBase: () => void;
  onLocateTarget: () => void;
}> = ({ difference, mapping, onLocateBase, onLocateTarget }) => {
  const t = useEvidT();

  if (!difference) {
    return (
      <div className='evd-cmp__pane-pad'>
        <div className='evd-empty'>
          <p className='evd-empty__title'>{t('evidossierReview.compare.detail.emptyTitle')}</p>
          <p className='evd-empty__text'>{t('evidossierReview.compare.detail.emptyText')}</p>
        </div>
      </div>
    );
  }

  const uncertain = difference.kind === 'uncertain' || difference.confidence === 'uncertain';

  return (
    <div className='evd-cmp__pane-pad'>
      <div className='evd-cmp__detailhead'>
        <StatusTag kind='diff' value={difference.kind} />
        <span className='evd-mono evd-subtle'>{difference.code}</span>
        <StatusTag kind='mapping' value={difference.confidence} />
      </div>
      <h3 className='evd-h3 evd-mt-8'>{difference.summary}</h3>
      <p className='evd-body evd-mt-8'>{difference.detail}</p>
      {uncertain ? (
        <Banner tone='warning' className='evd-mt-16'>
          {t('evidossierReview.compare.detail.uncertainConclusion')}
        </Banner>
      ) : null}

      <div className='evd-cmp__side'>
        <div className='evd-cmp__sidehead'>
          <span className='evd-label'>{t('evidossierReview.compare.detail.baseSide')}</span>
          {difference.baseLocation ? (
            <Button size='mini' type='text' onClick={onLocateBase}>
              {t('evidossierReview.compare.detail.locateBase')}
            </Button>
          ) : null}
        </div>
        {difference.baseLocation || difference.baseText ? (
          <>
            {difference.baseLocation ? (
              <span className='evd-caption'>{difference.baseLocation.sectionPath}</span>
            ) : null}
            <blockquote className='evd-doc__quote'>
              {difference.baseText ?? difference.baseLocation?.quote ?? ''}
            </blockquote>
          </>
        ) : (
          <p className='evd-caption'>{t('evidossierReview.compare.detail.noSide')}</p>
        )}
      </div>

      <div className='evd-cmp__side'>
        <div className='evd-cmp__sidehead'>
          <span className='evd-label'>{t('evidossierReview.compare.detail.targetSide')}</span>
          {difference.targetLocation ? (
            <Button size='mini' type='text' onClick={onLocateTarget}>
              {t('evidossierReview.compare.detail.locateTarget')}
            </Button>
          ) : null}
        </div>
        {difference.targetLocation || difference.targetText ? (
          <>
            {difference.targetLocation ? (
              <span className='evd-caption'>{difference.targetLocation.sectionPath}</span>
            ) : null}
            <blockquote className='evd-doc__quote'>
              {difference.targetText ?? difference.targetLocation?.quote ?? ''}
            </blockquote>
          </>
        ) : (
          <p className='evd-caption'>{t('evidossierReview.compare.detail.noSide')}</p>
        )}
      </div>

      <div className='evd-cmp__mapping'>
        <p className='evd-label'>{t('evidossierReview.compare.detail.mapping')}</p>
        {mapping ? (
          <>
            <p className='evd-body evd-mt-8'>
              {t('evidossierReview.compare.detail.mappingValue', {
                base: mapping.baseTitle,
                target: mapping.targetTitle,
              })}
            </p>
            <div className='evd-row' style={{ gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              <StatusTag kind='mapping' value={mapping.confidence} />
              {mapping.note ? <span className='evd-caption'>{mapping.note}</span> : null}
            </div>
          </>
        ) : (
          <p className='evd-caption evd-mt-8'>{t('evidossierReview.compare.detail.noMapping')}</p>
        )}
      </div>

      <p className='evd-caption evd-mt-16'>{t('evidossierReview.compare.detail.notDefect')}</p>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Correspondence                                                              */
/* -------------------------------------------------------------------------- */

export const MappingPane: React.FC<{ payload?: MappingPayload; stage?: Stage }> = ({ payload, stage }) => {
  const t = useEvidT();

  if (!payload) {
    return (
      <div className='evd-cmp__pane-pad'>
        <div className='evd-empty'>
          <p className='evd-empty__title'>{t('evidossierReview.compare.mapping.emptyTitle')}</p>
          <p className='evd-empty__text'>{t('evidossierReview.compare.mapping.emptyText')}</p>
          {stage ? (
            <p className='evd-caption'>
              {t('evidossierReview.review.coverage.currentStage', { stage: t(stage.titleKey) })}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className='evd-cmp__pane-pad'>
      <div className='evd-row evd-row--between'>
        <span className='evd-label'>{t('evidossierReview.compare.tabs.mapping')}</span>
        <span className='evd-caption'>
          {t('evidossierReview.compare.mapping.count', { count: payload.mappings.length })}
        </span>
      </div>
      <div className='evd-table-wrap evd-mt-8'>
        <table className='evd-table evd-table--compact'>
          <thead>
            <tr>
              <th>{t('evidossierReview.compare.mapping.baseTitle')}</th>
              <th>{t('evidossierReview.compare.mapping.targetTitle')}</th>
              <th>{t('evidossierReview.compare.mapping.confidence')}</th>
            </tr>
          </thead>
          <tbody>
            {payload.mappings.map((mapping) => (
              <tr key={mapping.id}>
                <td>
                  {mapping.baseTitle || '—'}
                  {mapping.note ? <p className='evd-cmp__mapnote'>{mapping.note}</p> : null}
                </td>
                <td>{mapping.targetTitle || '—'}</td>
                <td>
                  <StatusTag kind='mapping' value={mapping.confidence} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className='evd-cmp__unmatched'>
        <p className='evd-label'>
          {t('evidossierReview.compare.mapping.unmatchedBase', { count: payload.unmatchedBase.length })}
        </p>
        {payload.unmatchedBase.length > 0 ? (
          <ul className='evd-cmp__bullets'>
            {payload.unmatchedBase.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className='evd-caption'>{t('evidossierReview.compare.mapping.none')}</p>
        )}
        <p className='evd-label evd-mt-16'>
          {t('evidossierReview.compare.mapping.unmatchedTarget', { count: payload.unmatchedTarget.length })}
        </p>
        {payload.unmatchedTarget.length > 0 ? (
          <ul className='evd-cmp__bullets'>
            {payload.unmatchedTarget.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className='evd-caption'>{t('evidossierReview.compare.mapping.none')}</p>
        )}
      </div>
      <p className='evd-caption evd-mt-16'>{t('evidossierReview.compare.mapping.unconfirmedHint')}</p>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Report                                                                      */
/* -------------------------------------------------------------------------- */

const DIFFERENCE_STAT_KEYS: Array<'added' | 'removed' | 'modified' | 'moved' | 'uncertain'> = [
  'added',
  'removed',
  'modified',
  'moved',
  'uncertain',
];

export const CompareReportPane: React.FC<{
  payload?: ComparisonReportPayload;
  artifactHistory: StageArtifact[];
  reportVersion?: PackageVersion;
  delivered: boolean;
  onViewFull: () => void;
  onOpenVersion: () => void;
}> = ({ payload, artifactHistory, reportVersion, delivered, onViewFull, onOpenVersion }) => {
  const t = useEvidT();

  return (
    <div className='evd-cmp__pane-pad'>
      {payload ? (
        <>
          <div className='evd-row' style={{ gap: 8, flexWrap: 'wrap' }}>
            <ToneTag tone='blue'>{t('evidossierReview.compare.report.mockReport')}</ToneTag>
            {reportVersion ? <span className='evd-version'>{reportVersion.label}</span> : null}
          </div>
          <div className='evd-mt-16'>
            <p className='evd-label'>{t('evidossierReview.compare.report.summary')}</p>
            <p className='evd-body'>{payload.summary}</p>
          </div>
          <div className='evd-mt-16'>
            <p className='evd-label'>{t('evidossierReview.compare.report.differenceStats')}</p>
            <Stats
              items={DIFFERENCE_STAT_KEYS.map((key) => ({
                label: t(`evidossierCommon.status.diff.${key}`),
                value: payload.differenceStats[key],
              }))}
            />
          </div>
          <div className='evd-mt-16'>
            <p className='evd-label'>{t('evidossierReview.compare.report.frozenInputs')}</p>
            <ul className='evd-cmp__bullets'>
              {payload.inputs.map((input) => (
                <li key={`${input.role}-${input.ref.versionId}`}>
                  {t(`evidossierCommon.comparisonRole.${input.role}`)}: {input.ref.versionLabel} ·{' '}
                  {input.ref.packageCode} {input.ref.packageTitle}
                </li>
              ))}
            </ul>
          </div>
          <div className='evd-mt-16'>
            <p className='evd-label'>{t('evidossierReview.compare.report.limitations')}</p>
            {payload.limitations.length > 0 ? (
              <ul className='evd-cmp__bullets'>
                {payload.limitations.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className='evd-caption'>{t('evidossierReview.compare.report.noLimitations')}</p>
            )}
          </div>
          <div className='evd-row evd-mt-16' style={{ gap: 8, flexWrap: 'wrap' }}>
            <Button size='small' onClick={onViewFull}>
              {t('evidossierReview.compare.report.viewFull')}
            </Button>
            {delivered && reportVersion ? (
              <Button size='small' onClick={onOpenVersion}>
                {t('evidossierReview.compare.report.openVersion')}
              </Button>
            ) : null}
          </div>
        </>
      ) : (
        <div className='evd-empty'>
          <p className='evd-empty__title'>{t('evidossierReview.compare.report.notGeneratedTitle')}</p>
          <p className='evd-empty__text'>{t('evidossierReview.compare.report.notGeneratedText')}</p>
        </div>
      )}
      <div className='evd-mt-24'>
        <p className='evd-label'>
          {t('evidossierReview.shared.artifactHistory')}{' '}
          <ToneTag tone='blue'>{t('evidossierReview.shared.mock')}</ToneTag>
        </p>
        {artifactHistory.length === 0 ? (
          <p className='evd-caption evd-mt-8'>{t('evidossierReview.shared.artifactHistoryEmpty')}</p>
        ) : (
          <ul className='evd-list'>
            {artifactHistory.map((artifact) => (
              <li key={artifact.id} className='evd-cmp__artifact'>
                <div className='evd-row evd-row--between' style={{ gap: 8 }}>
                  <span className='evd-body'>
                    {t(`evidossierCommon.artifactKind.${artifact.kind}`, { defaultValue: artifact.kind })}
                  </span>
                  <span className='evd-caption'>
                    {t('evidossierReview.shared.artifactRevision', { revision: artifact.revision })}
                  </span>
                </div>
                <div className='evd-row' style={{ gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                  <StatusTag kind='artifact' value={artifact.status} />
                  <span className='evd-caption'>
                    {t('evidossierReview.shared.artifactUpdated', { date: formatDateTime(artifact.updatedAt) })}
                  </span>
                </div>
                {artifact.summary ? <p className='evd-cmp__mapnote'>{artifact.summary}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
