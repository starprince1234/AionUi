/**
 * Evidossier shared UI primitives.
 *
 * Thin Carbon-styled wrappers around Arco Design components plus the status
 * vocabulary shared by every Evidossier page. All copy goes through i18n keys
 * in the `evidossierCommon` module; page modules add their own keys.
 */
import { Button, Spin } from '@arco-design/web-react';
import dayjs from 'dayjs';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { IconInfo, IconWarning, type EvidIconProps } from './icons';

/* -------------------------------------------------------------------------- */
/* Hooks & helpers                                                             */
/* -------------------------------------------------------------------------- */

export const useEvidT = () => useTranslation().t;

export const formatDateTime = (iso: string): string => dayjs(iso).format('YYYY-MM-DD HH:mm');

export const formatDate = (iso: string): string => dayjs(iso).format('YYYY-MM-DD');

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export const cx = (...values: Array<string | false | null | undefined>): string => values.filter(Boolean).join(' ');

/* -------------------------------------------------------------------------- */
/* Layout primitives                                                           */
/* -------------------------------------------------------------------------- */

export type Crumb = { label: string; onClick?: () => void };

export const PageHeader: React.FC<{
  crumbs?: Crumb[];
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}> = ({ crumbs, title, description, actions, meta, className }) => (
  <div className={cx('evd-page__header', className)}>
    <div className='evd-page__heading'>
      {crumbs && crumbs.length > 0 ? (
        <nav className='evd-crumbs' aria-label='Breadcrumb'>
          {crumbs.map((crumb, index) => (
            <React.Fragment key={`${crumb.label}-${index}`}>
              {index > 0 ? <span className='evd-crumbs__sep'>/</span> : null}
              {crumb.onClick && index < crumbs.length - 1 ? (
                <Button type='text' className='evd-btn-reset evd-link' onClick={crumb.onClick}>
                  {crumb.label}
                </Button>
              ) : (
                <span>{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      ) : null}
      <h1 className='evd-h1 evd-page__title'>{title}</h1>
      {description ? <p className='evd-page__description'>{description}</p> : null}
      {meta ? <div className='evd-mt-16'>{meta}</div> : null}
    </div>
    {actions ? <div className='evd-page__actions'>{actions}</div> : null}
  </div>
);

export const Section: React.FC<{
  title?: React.ReactNode;
  hint?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, hint, actions, children, className }) => (
  <section className={cx('evd-section', className)}>
    {title || actions ? (
      <div className='evd-section__header'>
        <div>
          {title ? <h2 className='evd-section__title'>{title}</h2> : null}
          {hint ? <p className='evd-section__hint'>{hint}</p> : null}
        </div>
        {actions ? <div className='evd-section__actions'>{actions}</div> : null}
      </div>
    ) : null}
    {children}
  </section>
);

export const Card: React.FC<{
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  flush?: boolean;
  interactive?: boolean;
  selected?: boolean;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
}> = ({ title, subtitle, actions, children, flush, selected, className, onClick, ariaLabel }) => {
  const body = (
    <>
      {title || actions ? (
        <div className='evd-card__header'>
          <div>
            {title ? <h3 className='evd-card__title'>{title}</h3> : null}
            {subtitle ? <p className='evd-card__subtitle'>{subtitle}</p> : null}
          </div>
          {actions ? <div className='evd-card__actions'>{actions}</div> : null}
        </div>
      ) : null}
      <div className={cx('evd-card__body', flush && 'evd-card__body--flush')}>{children}</div>
    </>
  );

  if (onClick) {
    return (
      <Button
        type='text'
        className={cx('evd-btn-reset evd-card evd-card--interactive', selected && 'evd-card--selected', className)}
        onClick={onClick}
        disabled={false}
        aria-label={ariaLabel}
      >
        {body}
      </Button>
    );
  }

  return <div className={cx('evd-card', selected && 'evd-card--selected', className)}>{body}</div>;
};

export const MetaList: React.FC<{
  items: Array<{ label: React.ReactNode; value: React.ReactNode }>;
  className?: string;
}> = ({ items, className }) => (
  <dl className={cx('evd-meta', className)}>
    {items.map((item, index) => (
      <div className='evd-meta__item' key={index}>
        <dt className='evd-meta__label'>{item.label}</dt>
        <dd className='evd-meta__value' style={{ margin: 0 }}>
          {item.value}
        </dd>
      </div>
    ))}
  </dl>
);

export const Stats: React.FC<{
  items: Array<{ label: React.ReactNode; value: React.ReactNode; hint?: React.ReactNode }>;
}> = ({ items }) => (
  <div className='evd-stats'>
    {items.map((item, index) => (
      <div className='evd-stat' key={index}>
        <div className='evd-stat__label'>{item.label}</div>
        <div className='evd-stat__value'>{item.value}</div>
        {item.hint ? <div className='evd-stat__hint'>{item.hint}</div> : null}
      </div>
    ))}
  </div>
);

export const Meter: React.FC<{
  value: number;
  total: number;
  tone?: 'default' | 'success' | 'warning' | 'error';
  label?: React.ReactNode;
  className?: string;
}> = ({ value, total, tone = 'default', label, className }) => {
  const percent = total > 0 ? Math.min(100, Math.max(0, Math.round((value / total) * 100))) : 0;
  return (
    <div className={className}>
      {label ? (
        <div className='evd-row evd-row--between evd-mb-8'>
          <span className='evd-caption'>{label}</span>
          <span className='evd-caption'>
            {value}/{total}
          </span>
        </div>
      ) : null}
      <div className='evd-meter' role='progressbar' aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div
          className={cx('evd-meter__fill', tone !== 'default' && `evd-meter__fill--${tone}`)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Status vocabulary                                                           */
/* -------------------------------------------------------------------------- */

export type StatusKind =
  | 'package'
  | 'stage'
  | 'artifact'
  | 'execution'
  | 'version'
  | 'parse'
  | 'coverage'
  | 'mapping'
  | 'diff'
  | 'fact'
  | 'finding'
  | 'validation';

type Tone = 'neutral' | 'blue' | 'green' | 'yellow' | 'red' | 'outline';

const STATUS_TONES: Record<StatusKind, Record<string, Tone>> = {
  package: {
    draft: 'outline',
    in_progress: 'blue',
    awaiting_user: 'yellow',
    paused: 'yellow',
    failed: 'red',
    delivered: 'green',
    pending_supplement: 'yellow',
  },
  stage: {
    not_started: 'outline',
    running: 'blue',
    awaiting_confirmation: 'yellow',
    completed: 'green',
    needs_review: 'yellow',
    failed: 'red',
  },
  artifact: {
    candidate: 'neutral',
    pending_confirmation: 'yellow',
    confirmed: 'green',
    needs_review: 'yellow',
    failed: 'red',
    superseded: 'outline',
  },
  execution: { idle: 'outline', running: 'blue', paused: 'yellow', failed: 'red', completed: 'green' },
  version: { delivered: 'green', partial: 'yellow' },
  parse: { parsed: 'green', parsing: 'blue', failed: 'red', partial: 'yellow', pending: 'outline' },
  coverage: { checked: 'green', unchecked: 'outline', uncheckable: 'red', not_applicable: 'neutral' },
  mapping: { confirmed: 'blue', candidate: 'yellow', uncertain: 'outline', none: 'neutral' },
  diff: { added: 'green', removed: 'red', modified: 'yellow', moved: 'blue', uncertain: 'neutral' },
  fact: { confirmed: 'green', pending: 'yellow', conflict: 'red', missing: 'red' },
  finding: { open: 'yellow', confirmed: 'blue', uncertain: 'outline', dismissed: 'neutral' },
  validation: { pass: 'green', warn: 'yellow', fail: 'red', manual: 'blue', not_checked: 'outline' },
};

export const StatusTag: React.FC<{
  kind: StatusKind;
  value: string;
  label?: string;
  dot?: boolean;
  className?: string;
}> = ({ kind, value, label, dot, className }) => {
  const t = useEvidT();
  const tone = STATUS_TONES[kind][value] ?? 'neutral';
  const text = label ?? t(`evidossierCommon.status.${kind}.${value}`, { defaultValue: value });
  return (
    <span className={cx('evd-tag', `evd-tag--${tone}`, className)}>
      {dot ? <span className='evd-tag__dot' aria-hidden /> : null}
      {text}
    </span>
  );
};

export const SeverityTag: React.FC<{ severity: string; className?: string }> = ({ severity, className }) => {
  const t = useEvidT();
  return (
    <span className={cx('evd-severity', `evd-severity--${severity}`, className)}>
      {t(`evidossierCommon.status.severity.${severity}`, { defaultValue: severity })}
    </span>
  );
};

export const ToneTag: React.FC<{ children: React.ReactNode; tone?: Tone; className?: string }> = ({
  children,
  tone = 'neutral',
  className,
}) => <span className={cx('evd-tag', `evd-tag--${tone}`, className)}>{children}</span>;

export const DemoTag: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className }) => {
  const t = useEvidT();
  return <span className={cx('evd-demo-chip', className)}>{children ?? t('evidossierCommon.demo.chip')}</span>;
};

/* -------------------------------------------------------------------------- */
/* Banners / empty / loading                                                   */
/* -------------------------------------------------------------------------- */

export type BannerTone = 'info' | 'warning' | 'error' | 'success' | 'neutral';

const BannerIcon: React.FC<{ tone: BannerTone } & EvidIconProps> = ({ tone, ...props }) => {
  if (tone === 'error') return <IconInfo {...props} />;
  if (tone === 'warning') return <IconWarning {...props} />;
  return <IconInfo {...props} />;
};

export const Banner: React.FC<{
  tone?: BannerTone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}> = ({ tone = 'info', title, children, actions, className }) => (
  <div className={cx('evd-banner', `evd-banner--${tone}`, className)} role={tone === 'error' ? 'alert' : 'status'}>
    <span className='evd-banner__icon'>
      <BannerIcon tone={tone} size={16} />
    </span>
    <div className='evd-banner__body'>
      {title ? <p className='evd-banner__title'>{title}</p> : null}
      {children ? <div className='evd-banner__text'>{children}</div> : null}
      {actions ? <div className='evd-banner__actions'>{actions}</div> : null}
    </div>
  </div>
);

export const EmptyState: React.FC<{
  title: React.ReactNode;
  text?: React.ReactNode;
  actions?: React.ReactNode;
  center?: boolean;
  className?: string;
}> = ({ title, text, actions, center, className }) => (
  <div className={cx('evd-empty', center && 'evd-empty--center', className)}>
    <p className='evd-empty__title'>{title}</p>
    {text ? <p className='evd-empty__text'>{text}</p> : null}
    {actions ? <div className='evd-empty__actions'>{actions}</div> : null}
  </div>
);

export const LoadingBlock: React.FC<{ label?: React.ReactNode; className?: string }> = ({ label, className }) => {
  const t = useEvidT();
  return (
    <div className={cx('evd-center', className)}>
      <Spin size={20} tip={label ?? t('evidossierCommon.common.loading')} />
    </div>
  );
};

export const ErrorBlock: React.FC<{ text?: React.ReactNode; onRetry?: () => void; className?: string }> = ({
  text,
  onRetry,
  className,
}) => {
  const t = useEvidT();
  return (
    <Banner
      tone='error'
      title={t('evidossierCommon.common.loadFailed')}
      className={className}
      actions={
        onRetry ? (
          <Button size='small' onClick={onRetry}>
            {t('evidossierCommon.action.retry')}
          </Button>
        ) : undefined
      }
    >
      {text}
    </Banner>
  );
};

/* -------------------------------------------------------------------------- */
/* Buttons                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * A row/tab style button that keeps Arco's accessibility behaviour while the
 * Carbon design layer supplies the visual treatment.
 */
export const RowButton: React.FC<{
  className: string;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  ariaLabel?: string;
  title?: string;
}> = ({ className, children, onClick, disabled, active, ariaLabel, title }) => (
  <Button
    type='text'
    className={cx('evd-btn-reset', className, active && `${className}--active`)}
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
    title={title}
    aria-current={active ? 'page' : undefined}
  >
    {children}
  </Button>
);

export type TabItem = { key: string; label: React.ReactNode; count?: number };

export const TabStrip: React.FC<{
  items: TabItem[];
  value: string;
  onChange: (key: string) => void;
  className?: string;
  ariaLabel?: string;
}> = ({ items, value, onChange, className, ariaLabel }) => (
  <div className={cx('evd-workspace__tabs', className)} role='tablist' aria-label={ariaLabel}>
    {items.map((item) => (
      <RowButton
        key={item.key}
        className='evd-workspace__tab'
        active={item.key === value}
        onClick={() => onChange(item.key)}
        ariaLabel={typeof item.label === 'string' ? item.label : undefined}
      >
        <span>{item.label}</span>
        {typeof item.count === 'number' ? <span className='evd-sidenav__meta'>{item.count}</span> : null}
      </RowButton>
    ))}
  </div>
);

/* -------------------------------------------------------------------------- */
/* Small utilities                                                             */
/* -------------------------------------------------------------------------- */

export const MonoId: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <span className={cx('evd-mono evd-muted', className)}>{children}</span>
);

export const InlineDot: React.FC<{ tone?: 'neutral' | 'blue' | 'green' | 'yellow' | 'red' }> = ({
  tone = 'neutral',
}) => (
  <span
    aria-hidden
    style={{
      display: 'inline-block',
      width: 6,
      height: 6,
      flex: '0 0 6px',
      backgroundColor:
        tone === 'blue'
          ? 'var(--evd-blue)'
          : tone === 'green'
            ? 'var(--evd-success)'
            : tone === 'yellow'
              ? 'var(--evd-warning)'
              : tone === 'red'
                ? 'var(--evd-error)'
                : 'var(--evd-ink-subtle)',
    }}
  />
);
