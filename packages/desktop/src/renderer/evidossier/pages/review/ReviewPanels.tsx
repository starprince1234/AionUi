/**
 * Presentational panels for the independent review workbench: coverage plan,
 * findings list, finding detail, review basis and report.
 *
 * Every panel is read-only. Coverage and findings are stage results produced by
 * the simulated execution; the workbench never edits them here (editing lives
 * in the generate workbench, and review packages have no editable draft).
 */
import { Button, Checkbox, Input, Select, Tooltip } from '@arco-design/web-react';
import React from 'react';
import type {
  CoveragePayload,
  FindingSeverity,
  FindingStatus,
  PackageVersion,
  ReviewFinding,
  ReviewReportPayload,
  Stage,
  StageArtifact,
} from '../../domain/types';
import {
  Banner,
  MetaList,
  Meter,
  RowButton,
  SeverityTag,
  Stats,
  StatusTag,
  ToneTag,
  cx,
  formatDateTime,
  useEvidT,
} from '../../design/primitives';
import { IconSearch } from '../../design/icons';
import type { CoverageCounts, ReviewBasisEntry, ReviewTargetState } from './reviewHelpers';

/** Keep Arco portals inside `.evd-root` so Carbon tokens and overrides apply. */
const getPopupMount = (): Element =>
  (typeof document === 'undefined' ? null : document.querySelector('.evd-root')) ?? document.body;

/* -------------------------------------------------------------------------- */
/* Coverage plan                                                               */
/* -------------------------------------------------------------------------- */

export const CoveragePane: React.FC<{
  payload?: CoveragePayload;
  counts: CoverageCounts;
  stage?: Stage;
  findingsById: Map<string, ReviewFinding>;
  onSelectFinding: (finding: ReviewFinding) => void;
}> = ({ payload, counts, stage, findingsById, onSelectFinding }) => {
  const t = useEvidT();

  if (!payload) {
    return (
      <div className='evd-rv__pane-pad'>
        <EmptyCoverage t={t} stage={stage} />
      </div>
    );
  }

  return (
    <div className='evd-rv__pane-pad'>
      <Meter
        value={counts.checked}
        total={counts.total}
        tone={counts.total > 0 && counts.checked === counts.total ? 'success' : 'warning'}
        label={t('evidossierReview.review.coverage.meterLabel')}
      />
      <div className='evd-rv__covstats'>
        <span className='evd-caption'>
          {t('evidossierReview.review.coverage.statChecked')} {counts.checked}
        </span>
        <span className='evd-caption'>
          {t('evidossierReview.review.coverage.statUnchecked')} {counts.unchecked}
        </span>
        <span className='evd-caption'>
          {t('evidossierReview.review.coverage.statUncheckable')} {counts.uncheckable}
        </span>
        <span className='evd-caption'>
          {t('evidossierReview.review.coverage.statNotApplicable')} {counts.notApplicable}
        </span>
      </div>
      <div className='evd-rv__field'>
        <span className='evd-label'>{t('evidossierReview.review.coverage.scopeNote')}</span>
        <span className='evd-caption'>{payload.scopeNote || t('evidossierReview.review.coverage.noScopeNote')}</span>
      </div>
      <ul className='evd-list evd-mt-16'>
        {payload.items.map((item) => (
          <li key={item.id} className='evd-rv__covitem'>
            <div className='evd-rv__covitem-head'>
              <span className='evd-mono evd-subtle'>{item.code}</span>
              <span className='evd-rv__covitem-title'>{item.title}</span>
              <StatusTag kind='coverage' value={item.status} />
            </div>
            {item.note ? <p className='evd-rv__covitem-note'>{item.note}</p> : null}
            {item.findingIds.length > 0 ? (
              <div className='evd-rv__covitem-findings'>
                <span className='evd-caption'>
                  {t('evidossierReview.review.coverage.linkedFindings')} ({item.findingIds.length})
                </span>
                {item.findingIds.map((findingId) => {
                  const finding = findingsById.get(findingId);
                  if (!finding) return null;
                  return (
                    <Button
                      key={findingId}
                      size='mini'
                      type='text'
                      onClick={() => onSelectFinding(finding)}
                      aria-label={`${finding.code} ${finding.title}`}
                    >
                      {finding.code}
                    </Button>
                  );
                })}
              </div>
            ) : (
              <p className='evd-rv__covitem-note'>{t('evidossierReview.review.coverage.noLinkedFinding')}</p>
            )}
          </li>
        ))}
      </ul>
      <p className='evd-caption evd-mt-8'>{t('evidossierReview.review.coverage.uncheckableHint')}</p>
    </div>
  );
};

const EmptyCoverage: React.FC<{ t: ReturnType<typeof useEvidT>; stage?: Stage }> = ({ t, stage }) => (
  <>
    <div className='evd-empty'>
      <p className='evd-empty__title'>{t('evidossierReview.review.coverage.emptyTitle')}</p>
      <p className='evd-empty__text'>{t('evidossierReview.review.coverage.emptyText')}</p>
    </div>
    {stage ? (
      <p className='evd-caption evd-mt-8'>
        {t('evidossierReview.review.coverage.currentStage', {
          stage: t(stage.titleKey),
        })}
      </p>
    ) : null}
  </>
);

/* -------------------------------------------------------------------------- */
/* Findings                                                                    */
/* -------------------------------------------------------------------------- */

const SEVERITY_OPTIONS: Array<'all' | FindingSeverity> = ['all', 'high', 'medium', 'low', 'info'];
const STATUS_OPTIONS: Array<'all' | FindingStatus> = ['all', 'open', 'confirmed', 'uncertain', 'dismissed'];

const toSeverity = (value: unknown): 'all' | FindingSeverity =>
  value === 'high' || value === 'medium' || value === 'low' || value === 'info' ? value : 'all';

const toStatus = (value: unknown): 'all' | FindingStatus =>
  value === 'open' || value === 'confirmed' || value === 'uncertain' || value === 'dismissed' ? value : 'all';

export const FindingsPane: React.FC<{
  findings: ReviewFinding[];
  totalCount: number;
  hasArtifact: boolean;
  coverage?: CoveragePayload;
  report?: ReviewReportPayload;
  counts: CoverageCounts;
  stage?: Stage;
  severity: 'all' | FindingSeverity;
  status: 'all' | FindingStatus;
  keyword: string;
  onSeverityChange: (value: 'all' | FindingSeverity) => void;
  onStatusChange: (value: 'all' | FindingStatus) => void;
  onKeywordChange: (value: string) => void;
  selectedIds: string[];
  activeId?: string;
  onToggleSelected: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  onActivate: (finding: ReviewFinding) => void;
  footer?: React.ReactNode;
}> = ({
  findings,
  totalCount,
  hasArtifact,
  coverage,
  report,
  counts,
  stage,
  severity,
  status,
  keyword,
  onSeverityChange,
  onStatusChange,
  onKeywordChange,
  selectedIds,
  activeId,
  onToggleSelected,
  onToggleAll,
  onActivate,
  footer,
}) => {
  const t = useEvidT();
  const allSelected = findings.length > 0 && findings.every((finding) => selectedIds.includes(finding.id));
  const someSelected = findings.some((finding) => selectedIds.includes(finding.id));

  return (
    <div className='evd-rv__findings-pane'>
      <div className='evd-rv__filters'>
        <Select
          size='small'
          getPopupContainer={getPopupMount}
          value={severity}
          onChange={(value) => onSeverityChange(toSeverity(value))}
          style={{ width: 108 }}
          aria-label={t('evidossierReview.review.findings.severityLabel')}
        >
          {SEVERITY_OPTIONS.map((option) => (
            <Select.Option key={option} value={option}>
              {option === 'all'
                ? t('evidossierReview.review.findings.all')
                : t(`evidossierCommon.status.severity.${option}`)}
            </Select.Option>
          ))}
        </Select>
        <Select
          size='small'
          getPopupContainer={getPopupMount}
          value={status}
          onChange={(value) => onStatusChange(toStatus(value))}
          style={{ width: 108 }}
          aria-label={t('evidossierReview.review.findings.statusLabel')}
        >
          {STATUS_OPTIONS.map((option) => (
            <Select.Option key={option} value={option}>
              {option === 'all'
                ? t('evidossierReview.review.findings.all')
                : t(`evidossierCommon.status.finding.${option}`, { defaultValue: option })}
            </Select.Option>
          ))}
        </Select>
        <Input
          size='small'
          allowClear
          value={keyword}
          onChange={onKeywordChange}
          prefix={<IconSearch size={12} />}
          placeholder={t('evidossierReview.review.findings.searchPlaceholder')}
          style={{ flex: '1 1 120px', minWidth: 100 }}
          aria-label={t('evidossierReview.review.findings.searchPlaceholder')}
        />
      </div>
      <div className='evd-rv__listhead'>
        <Checkbox
          checked={allSelected}
          indeterminate={someSelected && !allSelected}
          onChange={onToggleAll}
          disabled={findings.length === 0}
          aria-label={t('evidossierReview.review.findings.selectAll')}
        />
        <span className='evd-caption'>
          {t('evidossierReview.review.findings.selectedCount', { count: selectedIds.length })}
        </span>
        <span className='evd-caption evd-rv__listcount'>{totalCount}</span>
      </div>
      <div className='evd-rv__scroll'>
        {!hasArtifact ? (
          <div className='evd-rv__pane-pad'>
            <div className='evd-empty'>
              <p className='evd-empty__title'>{t('evidossierReview.review.findings.emptyNoArtifactTitle')}</p>
              <p className='evd-empty__text'>{t('evidossierReview.review.findings.emptyNoArtifactText')}</p>
              {stage ? (
                <p className='evd-caption'>
                  {t('evidossierReview.review.coverage.currentStage', { stage: t(stage.titleKey) })}
                </p>
              ) : null}
            </div>
          </div>
        ) : totalCount === 0 ? (
          <ZeroFindings t={t} coverage={coverage} report={report} counts={counts} />
        ) : findings.length === 0 ? (
          <div className='evd-rv__pane-pad'>
            <div className='evd-empty'>
              <p className='evd-empty__title'>{t('evidossierReview.review.findings.emptyFilteredTitle')}</p>
              <p className='evd-empty__text'>{t('evidossierReview.review.findings.emptyFilteredText')}</p>
            </div>
          </div>
        ) : (
          findings.map((finding) => (
            <div
              key={finding.id}
              className={cx('evd-rv__finding-row', activeId === finding.id && 'evd-rv__finding-row--active')}
            >
              <Checkbox
                checked={selectedIds.includes(finding.id)}
                onChange={() => onToggleSelected(finding.id)}
                aria-label={finding.code}
              />
              <RowButton
                className='evd-rv__finding-main'
                onClick={() => onActivate(finding)}
                ariaLabel={`${finding.code} ${finding.title}`}
              >
                <span className='evd-rv__finding-head'>
                  <SeverityTag severity={finding.severity} />
                  <span className='evd-mono evd-subtle'>{finding.code}</span>
                  <StatusTag kind='finding' value={finding.status} />
                  {finding.citationUnresolved ? (
                    <ToneTag tone='yellow'>{t('evidossierReview.review.findings.citationUnresolved')}</ToneTag>
                  ) : null}
                </span>
                <span className='evd-rv__finding-title'>{finding.title}</span>
                <span className='evd-rv__finding-meta'>
                  {finding.location ? (
                    <span className='evd-truncate'>{finding.location.sectionPath}</span>
                  ) : (
                    <span>{t('evidossierReview.review.findings.noLocation')}</span>
                  )}
                </span>
              </RowButton>
            </div>
          ))
        )}
      </div>
      {footer ? <div className='evd-rv__footer'>{footer}</div> : null}
    </div>
  );
};

const ZeroFindings: React.FC<{
  t: ReturnType<typeof useEvidT>;
  coverage?: CoveragePayload;
  report?: ReviewReportPayload;
  counts: CoverageCounts;
}> = ({ t, coverage, report, counts }) => (
  <div className='evd-rv__pane-pad'>
    <Banner tone='info' title={t('evidossierReview.review.findings.zeroTitle')}>
      {t('evidossierReview.review.findings.zeroText')}
    </Banner>
    <p className='evd-caption evd-mt-16'>
      {t('evidossierReview.review.findings.zeroCoverage', {
        checked: counts.checked,
        total: counts.total,
        uncheckable: counts.uncheckable,
        notApplicable: counts.notApplicable,
      })}
    </p>
    {coverage?.scopeNote ? (
      <p className='evd-caption evd-mt-8'>
        {t('evidossierReview.review.coverage.scopeNote')}: {coverage.scopeNote}
      </p>
    ) : null}
    {report && report.limitations.length > 0 ? (
      <div className='evd-mt-16'>
        <p className='evd-label'>{t('evidossierReview.review.findings.zeroLimitations')}</p>
        <ul className='evd-rv__bullets'>
          {report.limitations.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>
    ) : (
      <p className='evd-caption evd-mt-8'>{t('evidossierReview.review.findings.zeroNoReport')}</p>
    )}
  </div>
);

/* -------------------------------------------------------------------------- */
/* Finding detail                                                              */
/* -------------------------------------------------------------------------- */

export const DetailPane: React.FC<{
  finding?: ReviewFinding;
  emptyZero: boolean;
  coverageTitle?: string;
  selectedForRevision: boolean;
  onToggleSelected: (checked: boolean) => void;
  onLocate: () => void;
  onViewBasis: () => void;
  basisAvailable: boolean;
}> = ({
  finding,
  emptyZero,
  coverageTitle,
  selectedForRevision,
  onToggleSelected,
  onLocate,
  onViewBasis,
  basisAvailable,
}) => {
  const t = useEvidT();

  if (!finding) {
    return (
      <div className='evd-rv__pane-pad'>
        <div className='evd-empty'>
          <p className='evd-empty__title'>
            {emptyZero ? t('evidossierReview.review.detail.emptyZero') : t('evidossierReview.review.detail.emptyTitle')}
          </p>
          <p className='evd-empty__text'>
            {emptyZero ? t('evidossierReview.review.findings.zeroText') : t('evidossierReview.review.detail.emptyText')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='evd-rv__pane-pad'>
      <div className='evd-rv__detail-head'>
        <SeverityTag severity={finding.severity} />
        <span className='evd-mono evd-subtle'>{finding.code}</span>
        <StatusTag kind='finding' value={finding.status} />
      </div>
      <h3 className='evd-h3 evd-mt-8'>{finding.title}</h3>
      <p className='evd-body evd-mt-8'>{finding.description}</p>
      {finding.citationUnresolved ? (
        <Banner tone='warning' className='evd-mt-16'>
          {t('evidossierReview.review.detail.citationUnresolved')}
        </Banner>
      ) : null}
      <dl className='evd-rv__fields'>
        <div className='evd-rv__field'>
          <dt className='evd-label'>{t('evidossierReview.review.detail.basis')}</dt>
          <dd className='evd-body'>{finding.basis}</dd>
        </div>
        {finding.basisLocation ? (
          <div className='evd-rv__field'>
            <dt className='evd-label'>{t('evidossierReview.review.detail.basisLocation')}</dt>
            <dd className='evd-body'>
              <span className='evd-caption'>{finding.basisLocation.sectionPath}</span>
              <blockquote className='evd-doc__quote evd-mt-8'>{finding.basisLocation.quote}</blockquote>
            </dd>
          </div>
        ) : null}
        {coverageTitle ? (
          <div className='evd-rv__field'>
            <dt className='evd-label'>{t('evidossierReview.review.detail.coverageItem')}</dt>
            <dd className='evd-body'>{coverageTitle}</dd>
          </div>
        ) : null}
        <div className='evd-rv__field'>
          <dt className='evd-label'>{t('evidossierReview.review.detail.location')}</dt>
          <dd className='evd-body'>
            {finding.location ? (
              <>
                <span className='evd-caption'>
                  {t('evidossierReview.review.detail.sectionPath')}: {finding.location.sectionPath}
                </span>
                <blockquote className='evd-doc__quote evd-mt-8'>{finding.location.quote}</blockquote>
              </>
            ) : (
              <span className='evd-caption'>{t('evidossierReview.review.findings.noLocation')}</span>
            )}
          </dd>
        </div>
        <div className='evd-rv__field'>
          <dt className='evd-label'>{t('evidossierReview.review.detail.suggestion')}</dt>
          <dd className='evd-body'>{finding.suggestion}</dd>
        </div>
      </dl>
      <div className='evd-rv__detail-actions'>
        <Checkbox checked={selectedForRevision} onChange={onToggleSelected}>
          {t('evidossierReview.review.detail.selectForRevision')}
        </Checkbox>
        <div className='evd-row' style={{ gap: 8, flexWrap: 'wrap' }}>
          <Tooltip
            content={t('evidossierReview.review.findings.noLocation')}
            disabled={Boolean(finding.location)}
            getPopupContainer={getPopupMount}
          >
            <span>
              <Button size='small' disabled={!finding.location} onClick={onLocate}>
                {t('evidossierReview.review.detail.locate')}
              </Button>
            </span>
          </Tooltip>
          {basisAvailable ? (
            <Button size='small' onClick={onViewBasis}>
              {t('evidossierReview.review.detail.viewBasis')}
            </Button>
          ) : (
            <Tooltip content={t('evidossierReview.review.detail.basisUnreadable')} getPopupContainer={getPopupMount}>
              <span>
                <Button size='small' disabled>
                  {t('evidossierReview.review.detail.viewBasis')}
                </Button>
              </span>
            </Tooltip>
          )}
        </div>
      </div>
      <p className='evd-caption evd-mt-16'>{t('evidossierReview.review.detail.notProfessional')}</p>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Review basis                                                                */
/* -------------------------------------------------------------------------- */

export const BasisPane: React.FC<{
  target: ReviewTargetState;
  purpose: string;
  scopeNote?: string;
  requirements: string[];
  entries: ReviewBasisEntry[];
}> = ({ target, purpose, scopeNote, requirements, entries }) => {
  const t = useEvidT();
  const targetItems = (() => {
    if (target.packageVersion) {
      return [
        {
          label: t('evidossierReview.review.basis.reviewedVersion'),
          value: t('evidossierReview.review.basis.versionMeta', {
            label: target.packageVersion.label,
            date: formatDateTime(target.packageVersion.createdAt),
          }),
        },
      ];
    }
    if (target.material && target.materialVersion) {
      return [
        {
          label: t('evidossierReview.review.basis.reviewedMaterial'),
          value: t('evidossierReview.review.basis.materialMeta', {
            version: target.materialVersion.version,
            status: t(`evidossierCommon.status.parse.${target.materialVersion.parseStatus}`, {
              defaultValue: target.materialVersion.parseStatus,
            }),
          }),
        },
      ];
    }
    return [];
  })();

  return (
    <div className='evd-rv__pane-pad'>
      {targetItems.length > 0 ? <MetaList items={targetItems} /> : null}
      {purpose ? (
        <div className='evd-rv__field'>
          <span className='evd-label'>{t('evidossierReview.review.workbench.purposeLabel')}</span>
          <span className='evd-body'>{purpose}</span>
        </div>
      ) : null}
      <div className='evd-rv__field'>
        <span className='evd-label'>{t('evidossierReview.review.workbench.scopeLabel')}</span>
        <span className='evd-caption'>{scopeNote || t('evidossierReview.review.workbench.scopeMissing')}</span>
      </div>
      <div className='evd-mt-16'>
        <p className='evd-label'>{t('evidossierReview.review.basis.requirements')}</p>
        {requirements.length > 0 ? (
          <ul className='evd-rv__bullets'>
            {requirements.map((requirement, index) => (
              <li key={index}>{requirement}</li>
            ))}
          </ul>
        ) : (
          <p className='evd-caption'>{t('evidossierReview.review.basis.noRequirements')}</p>
        )}
      </div>
      <div className='evd-mt-16'>
        <p className='evd-label'>{t('evidossierReview.review.basis.materials')}</p>
        {entries.length === 0 ? (
          <p className='evd-caption'>{t('evidossierReview.review.basis.noMaterials')}</p>
        ) : (
          <ul className='evd-list'>
            {entries.map((entry, index) => (
              <li key={`${entry.materialName}-${entry.versionNumber}-${index}`} className='evd-rv__basisitem'>
                <div className='evd-row evd-row--between' style={{ gap: 8, alignItems: 'flex-start' }}>
                  <span className='evd-rv__basisitem-name'>
                    {entry.materialName}
                    <span className='evd-caption'> · v{entry.versionNumber}</span>
                  </span>
                  <span className='evd-rv__basisitem-tags'>
                    <ToneTag tone='neutral'>
                      {t(`evidossierCommon.materialUsage.${entry.role}`, { defaultValue: entry.role })}
                    </ToneTag>
                    {entry.parseStatus ? <StatusTag kind='parse' value={entry.parseStatus} /> : null}
                    <ToneTag tone={entry.readable ? 'green' : 'red'}>
                      {entry.readable
                        ? t('evidossierReview.review.basis.readable')
                        : t('evidossierReview.review.basis.unreadable')}
                    </ToneTag>
                  </span>
                </div>
                {!entry.readable ? (
                  <p className='evd-caption evd-mt-8'>{t('evidossierReview.review.basis.unverified')}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className='evd-caption evd-mt-16'>{t('evidossierReview.review.basis.demoNote')}</p>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Report                                                                      */
/* -------------------------------------------------------------------------- */

const severityLabels: Array<'high' | 'medium' | 'low' | 'info' | 'uncertain'> = [
  'high',
  'medium',
  'low',
  'info',
  'uncertain',
];

export const ReportPane: React.FC<{
  payload?: ReviewReportPayload;
  artifactHistory: StageArtifact[];
  reportVersion?: PackageVersion;
  delivered: boolean;
  onViewFull: () => void;
  onOpenVersion: () => void;
}> = ({ payload, artifactHistory, reportVersion, delivered, onViewFull, onOpenVersion }) => {
  const t = useEvidT();

  return (
    <div className='evd-rv__pane-pad'>
      {payload ? (
        <>
          <div className='evd-row' style={{ gap: 8, flexWrap: 'wrap' }}>
            <ToneTag tone='blue'>{t('evidossierReview.review.report.mockReport')}</ToneTag>
            {reportVersion ? <span className='evd-version'>{reportVersion.label}</span> : null}
          </div>
          <div className='evd-mt-16'>
            <p className='evd-label'>{t('evidossierReview.review.report.summary')}</p>
            <p className='evd-body'>{payload.summary}</p>
          </div>
          <div className='evd-mt-16'>
            <p className='evd-label'>{t('evidossierReview.review.report.coverageStats')}</p>
            <Stats
              items={[
                { label: t('evidossierReview.review.coverage.statChecked'), value: payload.coverageStats.checked },
                { label: t('evidossierReview.review.coverage.statUnchecked'), value: payload.coverageStats.unchecked },
                {
                  label: t('evidossierReview.review.coverage.statUncheckable'),
                  value: payload.coverageStats.uncheckable,
                },
                {
                  label: t('evidossierReview.review.coverage.statNotApplicable'),
                  value: payload.coverageStats.notApplicable,
                },
              ]}
            />
          </div>
          <div className='evd-mt-16'>
            <p className='evd-label'>{t('evidossierReview.review.report.findingStats')}</p>
            <Stats
              items={severityLabels.map((key) => ({
                label:
                  key === 'uncertain'
                    ? t('evidossierCommon.status.finding.uncertain')
                    : t(`evidossierCommon.status.severity.${key}`),
                value: payload.findingStats[key],
              }))}
            />
          </div>
          <div className='evd-mt-16'>
            <p className='evd-label'>{t('evidossierReview.review.report.limitations')}</p>
            {payload.limitations.length > 0 ? (
              <ul className='evd-rv__bullets'>
                {payload.limitations.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className='evd-caption'>{t('evidossierReview.review.report.noLimitations')}</p>
            )}
          </div>
          {payload.reviewedVersionRefs.length > 0 ? (
            <div className='evd-mt-16'>
              <p className='evd-label'>{t('evidossierReview.review.report.frozenVersions')}</p>
              <ul className='evd-rv__bullets'>
                {payload.reviewedVersionRefs.map((ref) => (
                  <li key={ref.versionId}>
                    {ref.versionLabel} · {ref.packageCode} {ref.packageTitle}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className='evd-row evd-mt-16' style={{ gap: 8, flexWrap: 'wrap' }}>
            <Button size='small' onClick={onViewFull}>
              {t('evidossierReview.review.report.viewFull')}
            </Button>
            {delivered && reportVersion ? (
              <Button size='small' onClick={onOpenVersion}>
                {t('evidossierReview.review.report.openVersion')}
              </Button>
            ) : null}
          </div>
        </>
      ) : (
        <div className='evd-empty'>
          <p className='evd-empty__title'>{t('evidossierReview.review.report.notGeneratedTitle')}</p>
          <p className='evd-empty__text'>{t('evidossierReview.review.report.notGeneratedText')}</p>
        </div>
      )}
      <ArtifactHistory history={artifactHistory} />
    </div>
  );
};

export const ArtifactHistory: React.FC<{ history: StageArtifact[] }> = ({ history }) => {
  const t = useEvidT();
  return (
    <div className='evd-mt-24'>
      <p className='evd-label'>
        {t('evidossierReview.shared.artifactHistory')}{' '}
        <ToneTag tone='blue'>{t('evidossierReview.shared.mock')}</ToneTag>
      </p>
      {history.length === 0 ? (
        <p className='evd-caption evd-mt-8'>{t('evidossierReview.shared.artifactHistoryEmpty')}</p>
      ) : (
        <ul className='evd-list'>
          {history.map((artifact) => (
            <li key={artifact.id} className='evd-rv__artifact'>
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
              {artifact.summary ? <p className='evd-rv__covitem-note'>{artifact.summary}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
