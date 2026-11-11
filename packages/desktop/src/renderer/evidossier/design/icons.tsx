/**
 * Evidossier icon set.
 *
 * Carbon UI icons are 16px / 20px stroke glyphs. The upstream project uses
 * @icon-park/react; Evidossier keeps its own minimal 24-grid stroke set so the
 * product surfaces stay visually consistent with the Carbon-derived design
 * language (1.5px strokes, square joins, no decorative fills).
 */
import React from 'react';

export type EvidIconProps = {
  size?: number;
  className?: string;
  title?: string;
};

const Svg: React.FC<EvidIconProps & { children: React.ReactNode; viewBox?: string }> = ({
  size = 16,
  className,
  title,
  children,
  viewBox = '0 0 24 24',
}) => (
  <svg
    width={size}
    height={size}
    viewBox={viewBox}
    fill='none'
    stroke='currentColor'
    strokeWidth={1.5}
    strokeLinecap='square'
    strokeLinejoin='miter'
    className={className}
    aria-hidden={title ? undefined : true}
    role={title ? 'img' : undefined}
    focusable='false'
    style={{ display: 'inline-block', verticalAlign: 'middle', flex: '0 0 auto' }}
  >
    {title ? <title>{title}</title> : null}
    {children}
  </svg>
);

export const IconPlus: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <path d='M12 5v14M5 12h14' />
  </Svg>
);

export const IconMinus: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <path d='M5 12h14' />
  </Svg>
);

export const IconArrowLeft: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <path d='M19 12H5M11 6l-6 6 6 6' />
  </Svg>
);

export const IconArrowRight: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <path d='M5 12h14M13 6l6 6-6 6' />
  </Svg>
);

export const IconChevronRight: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <path d='M9 5l7 7-7 7' />
  </Svg>
);

export const IconChevronDown: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <path d='M5 9l7 7 7-7' />
  </Svg>
);

export const IconChevronUp: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <path d='M5 15l7-7 7 7' />
  </Svg>
);

export const IconClose: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <path d='M6 6l12 12M18 6L6 18' />
  </Svg>
);

export const IconCheck: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <path d='M4 12l5 5L20 6' />
  </Svg>
);

export const IconWarning: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <path d='M12 3l10 18H2L12 3z' />
    <path d='M12 9v5M12 17.5v.5' />
  </Svg>
);

export const IconError: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <circle cx='12' cy='12' r='9' />
    <path d='M12 7v6M12 16.5v.5' />
  </Svg>
);

export const IconInfo: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <circle cx='12' cy='12' r='9' />
    <path d='M12 11v6M12 7.5v.5' />
  </Svg>
);

export const IconGraph: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <rect x='3' y='4' width='7' height='5' />
    <rect x='14' y='4' width='7' height='5' />
    <rect x='8' y='15' width='8' height='5' />
    <path d='M6.5 9v3h11V9M12 12v3' />
  </Svg>
);

export const IconPackage: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <path d='M3 7l9-4 9 4v10l-9 4-9-4V7z' />
    <path d='M3 7l9 4 9-4M12 11v10' />
  </Svg>
);

export const IconReview: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <path d='M5 3h10l4 4v14H5V3z' />
    <path d='M15 3v4h4M8 12h8M8 16h8' />
    <circle cx='16' cy='16' r='4' />
    <path d='M19 19l2 2' />
  </Svg>
);

export const IconCompare: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <path d='M8 4H4v16h4M16 4h4v16h-4' />
    <path d='M12 3v18M9 8l-2 2 2 2M15 13l2 2-2 2' />
  </Svg>
);

export const IconGenerate: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <path d='M5 3h9l5 5v13H5V3z' />
    <path d='M14 3v5h5M8 12h7M8 16h5' />
  </Svg>
);

export const IconHistory: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <path d='M4 12a8 8 0 1 0 2.4-5.7' />
    <path d='M4 4v4h4M12 8v4l3 2' />
  </Svg>
);

export const IconFolder: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <path d='M3 6h6l2 2h10v11H3V6z' />
  </Svg>
);

export const IconFile: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <path d='M6 3h8l4 4v14H6V3z' />
    <path d='M14 3v4h4' />
  </Svg>
);

export const IconUpload: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <path d='M12 16V4M7 9l5-5 5 5' />
    <path d='M4 16v4h16v-4' />
  </Svg>
);

export const IconSearch: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <circle cx='11' cy='11' r='7' />
    <path d='M16 16l5 5' />
  </Svg>
);

export const IconFilter: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <path d='M3 5h18l-7 8v6l-4 2v-8L3 5z' />
  </Svg>
);

export const IconRefresh: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <path d='M20 11a8 8 0 0 0-14-5L3 9' />
    <path d='M4 13a8 8 0 0 0 14 5l3-3' />
    <path d='M3 4v5h5M21 20v-5h-5' />
  </Svg>
);

export const IconMore: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <circle cx='5' cy='12' r='1' />
    <circle cx='12' cy='12' r='1' />
    <circle cx='19' cy='12' r='1' />
  </Svg>
);

export const IconEdit: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <path d='M4 20h4L20 8l-4-4L4 16v4z' />
    <path d='M14 6l4 4' />
  </Svg>
);

export const IconPause: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <path d='M8 4v16M16 4v16' />
  </Svg>
);

export const IconPlay: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <path d='M6 4l14 8-14 8V4z' />
  </Svg>
);

export const IconRetry: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <path d='M4 12a8 8 0 1 1 2.4 5.7' />
    <path d='M4 4v4h4' />
  </Svg>
);

export const IconLock: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <rect x='5' y='10' width='14' height='10' />
    <path d='M8 10V7a4 4 0 0 1 8 0v3' />
  </Svg>
);

export const IconExternal: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <path d='M14 4h6v6M20 4l-9 9' />
    <path d='M18 14v6H4V6h6' />
  </Svg>
);

export const IconZoomIn: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <circle cx='11' cy='11' r='7' />
    <path d='M11 8v6M8 11h6M16 16l5 5' />
  </Svg>
);

export const IconZoomOut: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <circle cx='11' cy='11' r='7' />
    <path d='M8 11h6M16 16l5 5' />
  </Svg>
);

export const IconFit: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <path d='M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5' />
    <rect x='9' y='9' width='6' height='6' />
  </Svg>
);

export const IconRelation: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <circle cx='5' cy='12' r='2.5' />
    <circle cx='19' cy='12' r='2.5' />
    <path d='M7.5 12h9M14 9l3 3-3 3' />
  </Svg>
);

export const IconClock: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <circle cx='12' cy='12' r='9' />
    <path d='M12 7v5l3 2' />
  </Svg>
);

export const IconUser: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <circle cx='12' cy='8' r='4' />
    <path d='M4 21c0-4 3.6-7 8-7s8 3 8 7' />
  </Svg>
);

export const IconDownload: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <path d='M12 3v12M7 10l5 5 5-5' />
    <path d='M4 20h16' />
  </Svg>
);

export const IconSparkle: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <path d='M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2L12 3z' />
    <path d='M19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8L19 17z' />
  </Svg>
);

export const IconMessage: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <path d='M4 4h16v12H8l-4 4V4z' />
    <path d='M8 8h8M8 12h5' />
  </Svg>
);

export const IconTable: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <rect x='3' y='4' width='18' height='16' />
    <path d='M3 10h18M9 4v16M15 4v16' />
  </Svg>
);

export const IconList: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <path d='M8 6h13M8 12h13M8 18h13M3 6h.5M3 12h.5M3 18h.5' />
  </Svg>
);

export const IconLink: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <path d='M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.5 1.5' />
    <path d='M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5' />
  </Svg>
);

export const IconCheckCircle: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <circle cx='12' cy='12' r='9' />
    <path d='M8 12l3 3 5-6' />
  </Svg>
);

export const IconTriangle: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <path d='M12 4l9 16H3L12 4z' />
  </Svg>
);

export const IconSidebar: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <rect x='3' y='4' width='18' height='16' />
    <path d='M9 4v16' />
  </Svg>
);

export const IconEye: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <path d='M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z' />
    <circle cx='12' cy='12' r='2.5' />
  </Svg>
);

export const IconBranch: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <circle cx='7' cy='5' r='2.5' />
    <circle cx='7' cy='19' r='2.5' />
    <circle cx='17' cy='9' r='2.5' />
    <path d='M7 7.5v9M9.5 5H14a3 3 0 0 1 3 3v.5' />
  </Svg>
);

export const IconSave: React.FC<EvidIconProps> = (props) => (
  <Svg {...props}>
    <path d='M4 4h13l3 3v13H4V4z' />
    <path d='M8 4v6h8V4M8 20v-6h8v6' />
  </Svg>
);
