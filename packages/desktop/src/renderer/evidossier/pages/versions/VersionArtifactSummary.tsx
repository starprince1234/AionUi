/**
 * Read-only summary of one frozen stage artifact payload inside a version
 * snapshot. Renders the main fields only; it never edits the artifact.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { StageArtifact } from '../../domain/types';
import { SeverityTag, StatusTag } from '../../design/primitives';

const QuoteList: React.FC<{ items: string[]; title: React.ReactNode }> = ({ items, title }) => {
  if (items.length === 0) return null;
  return (
    <>
      <p className='evd-label evd-ver-payload__label'>{title}</p>
      <ul className='evd-ver-payload__list'>
        {items.map((item, index) => (
          <li key={`${index}-${item.slice(0, 12)}`} className='evd-ver-payload__item'>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </>
  );
};

export const VersionArtifactSummary: React.FC<{ artifact: StageArtifact }> = ({ artifact }) => {
  const { t } = useTranslation();
  const payload = artifact.payload;

  switch (payload.type) {
    case 'fact_list':
      return (
        <div className='evd-ver-payload'>
          <p className='evd-caption'>{t('evidossierGraph.payload.factItems', { count: payload.items.length })}</p>
          <ul className='evd-ver-payload__list'>
            {payload.items.map((item) => (
              <li key={item.id} className='evd-ver-payload__item'>
                <StatusTag kind='fact' value={item.status} />
                <span className='evd-ver-payload__text'>{item.statement}</span>
                {item.detail ? <span className='evd-caption evd-ver-payload__detail'>{item.detail}</span> : null}
              </li>
            ))}
          </ul>
          <QuoteList items={payload.openQuestions} title={t('evidossierGraph.payload.openQuestions')} />
        </div>
      );

    case 'outline':
      return (
        <div className='evd-ver-payload'>
          <ul className='evd-ver-payload__list'>
            {payload.sections.map((section) => (
              <li key={section.id} className='evd-ver-payload__item'>
                <span className='evd-tag evd-tag--outline'>
                  {t(`evidossierGraph.payload.outlineStatus.${section.status}`)}
                </span>
                <span className='evd-ver-payload__text'>{section.title}</span>
                {section.purpose ? (
                  <span className='evd-caption evd-ver-payload__detail'>{section.purpose}</span>
                ) : null}
              </li>
            ))}
          </ul>
          {payload.scopeNote ? <p className='evd-caption'>{payload.scopeNote}</p> : null}
        </div>
      );

    case 'draft':
      return (
        <div className='evd-ver-payload'>
          {payload.isPartial ? <p className='evd-caption'>{t('evidossierGraph.payload.partialDraft')}</p> : null}
          <ul className='evd-ver-payload__list'>
            {payload.sections.map((section) => (
              <li key={section.id} className='evd-ver-payload__item'>
                <span className='evd-ver-payload__text'>{section.heading}</span>
                <span className='evd-caption'>
                  {t('evidossierGraph.payload.paragraphCount', { count: section.paragraphs.length })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      );

    case 'validation':
      return (
        <div className='evd-ver-payload'>
          <ul className='evd-ver-payload__list'>
            {payload.checks.map((check) => (
              <li key={check.id} className='evd-ver-payload__item'>
                <StatusTag kind='validation' value={check.status} />
                <span className='evd-ver-payload__text'>{check.label}</span>
                <span className='evd-caption evd-ver-payload__detail'>{check.detail}</span>
              </li>
            ))}
          </ul>
          <QuoteList items={payload.openItems} title={t('evidossierGraph.payload.openItems')} />
        </div>
      );

    case 'coverage_plan':
      return (
        <div className='evd-ver-payload'>
          <ul className='evd-ver-payload__list'>
            {payload.items.map((item) => (
              <li key={item.id} className='evd-ver-payload__item'>
                <StatusTag kind='coverage' value={item.status} />
                <span className='evd-ver-payload__text'>
                  {item.code} · {item.title}
                </span>
                {item.note ? <span className='evd-caption evd-ver-payload__detail'>{item.note}</span> : null}
              </li>
            ))}
          </ul>
          <p className='evd-caption'>{payload.scopeNote}</p>
        </div>
      );

    case 'findings':
      return (
        <div className='evd-ver-payload'>
          <ul className='evd-ver-payload__list'>
            {payload.findings.map((finding) => (
              <li key={finding.id} className='evd-ver-payload__item'>
                <span className='evd-tag evd-tag--outline'>{finding.code}</span>
                <SeverityTag severity={finding.severity} />
                <StatusTag kind='finding' value={finding.status} />
                <span className='evd-ver-payload__text'>{finding.title}</span>
                <span className='evd-caption evd-ver-payload__detail'>{finding.basis}</span>
              </li>
            ))}
          </ul>
          <p className='evd-caption'>{payload.scopeNote}</p>
        </div>
      );

    case 'review_report':
      return (
        <div className='evd-ver-payload'>
          <p className='evd-body'>{payload.summary}</p>
          <dl className='evd-ver-payload__stats'>
            <div>
              <dt>{t('evidossierGraph.payload.coverageChecked')}</dt>
              <dd>{payload.coverageStats.checked}</dd>
            </div>
            <div>
              <dt>{t('evidossierGraph.payload.coverageUnchecked')}</dt>
              <dd>{payload.coverageStats.unchecked}</dd>
            </div>
            <div>
              <dt>{t('evidossierGraph.payload.coverageUncheckable')}</dt>
              <dd>{payload.coverageStats.uncheckable}</dd>
            </div>
            <div>
              <dt>{t('evidossierGraph.payload.findingTotal')}</dt>
              <dd>
                {payload.findingStats.high +
                  payload.findingStats.medium +
                  payload.findingStats.low +
                  payload.findingStats.info}
              </dd>
            </div>
          </dl>
          <QuoteList items={payload.limitations} title={t('evidossierGraph.payload.limitations')} />
          <ul className='evd-ver-payload__list'>
            {payload.reviewedVersionRefs.map((ref) => (
              <li key={`${ref.packageId}-${ref.versionId}`} className='evd-caption'>
                {t('evidossierGraph.payload.reviewedVersion', {
                  code: ref.packageCode,
                  label: ref.versionLabel,
                })}
              </li>
            ))}
          </ul>
        </div>
      );

    case 'mapping':
      return (
        <div className='evd-ver-payload'>
          <ul className='evd-ver-payload__list'>
            {payload.mappings.map((mapping) => (
              <li key={mapping.id} className='evd-ver-payload__item'>
                <StatusTag kind='mapping' value={mapping.confidence} />
                <span className='evd-ver-payload__text'>
                  {mapping.baseTitle} → {mapping.targetTitle}
                </span>
                {mapping.note ? <span className='evd-caption evd-ver-payload__detail'>{mapping.note}</span> : null}
              </li>
            ))}
          </ul>
          <QuoteList items={payload.unmatchedBase} title={t('evidossierGraph.payload.unmatchedBase')} />
          <QuoteList items={payload.unmatchedTarget} title={t('evidossierGraph.payload.unmatchedTarget')} />
        </div>
      );

    case 'differences':
      return (
        <div className='evd-ver-payload'>
          <ul className='evd-ver-payload__list'>
            {payload.differences.map((difference) => (
              <li key={difference.id} className='evd-ver-payload__item'>
                <StatusTag kind='diff' value={difference.kind} />
                <span className='evd-ver-payload__text'>{difference.summary}</span>
                <span className='evd-caption evd-ver-payload__detail'>{difference.detail}</span>
              </li>
            ))}
          </ul>
          <p className='evd-caption'>{payload.scopeNote}</p>
        </div>
      );

    case 'comparison_report':
      return (
        <div className='evd-ver-payload'>
          <p className='evd-body'>{payload.summary}</p>
          <dl className='evd-ver-payload__stats'>
            <div>
              <dt>{t('evidossierGraph.payload.added')}</dt>
              <dd>{payload.differenceStats.added}</dd>
            </div>
            <div>
              <dt>{t('evidossierGraph.payload.removed')}</dt>
              <dd>{payload.differenceStats.removed}</dd>
            </div>
            <div>
              <dt>{t('evidossierGraph.payload.modified')}</dt>
              <dd>{payload.differenceStats.modified}</dd>
            </div>
            <div>
              <dt>{t('evidossierGraph.payload.uncertain')}</dt>
              <dd>{payload.differenceStats.uncertain}</dd>
            </div>
          </dl>
          <QuoteList items={payload.limitations} title={t('evidossierGraph.payload.limitations')} />
          <ul className='evd-ver-payload__list'>
            {payload.inputs.map((input) => (
              <li key={`${input.ref.packageId}-${input.ref.versionId}`} className='evd-caption'>
                {t('evidossierGraph.payload.comparisonInput', {
                  role: t(`evidossierCommon.comparisonRole.${input.role}`),
                  code: input.ref.packageCode,
                  label: input.ref.versionLabel,
                })}
              </li>
            ))}
          </ul>
        </div>
      );

    default:
      return null;
  }
};

export default VersionArtifactSummary;
