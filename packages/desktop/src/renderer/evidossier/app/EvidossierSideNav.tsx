/**
 * Evidossier side navigation: global workspace entries plus the contextual
 * project navigation (overview / packages / materials / graph).
 */
import { Button } from '@arco-design/web-react';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEvidossier } from '../data/EvidossierProvider';
import { getPackage, getProject, listProjectPackages } from '../data/selectors';
import { RowButton } from '../design/primitives';
import { IconFolder, IconGraph, IconHistory, IconPackage, IconReview } from '../design/icons';

type NavItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  active: boolean;
  meta?: string;
};

const matches = (pathname: string, target: string, exact = true): boolean => {
  const base = `/evidossier${target}`;
  if (exact) return pathname === base || pathname === `${base}/`;
  return pathname === base || pathname.startsWith(`${base}/`);
};

type NavContext = {
  projectId?: string;
  packageId?: string;
  packageCode?: string;
  packageTitle?: string;
};

export const EvidossierSideNav: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { snapshot } = useEvidossier();

  const context = useMemo<NavContext>(() => {
    if (!snapshot) return {};
    const packageMatch = location.pathname.match(/\/evidossier\/packages\/([^/]+)/);
    const packageId = packageMatch?.[1];
    const pkg = packageId ? getPackage(snapshot, packageId) : undefined;
    if (pkg) return { projectId: pkg.projectId, packageId, packageCode: pkg.code, packageTitle: pkg.title };
    const projectMatch = location.pathname.match(/\/evidossier\/projects\/([^/]+)/);
    return { projectId: projectMatch?.[1] };
  }, [snapshot, location.pathname]);

  const project = snapshot && context.projectId ? getProject(snapshot, context.projectId) : undefined;
  const projectPackages = snapshot && project ? listProjectPackages(snapshot, project.id) : [];

  const globalItems: NavItem[] = [
    {
      key: 'home',
      label: t('evidossierCommon.nav.home'),
      icon: <IconPackage size={16} />,
      path: '/',
      active: matches(location.pathname, ''),
    },
    {
      key: 'projects',
      label: t('evidossierCommon.nav.projects'),
      icon: <IconFolder size={16} />,
      path: '/projects',
      active:
        matches(location.pathname, '/projects', false) && !location.pathname.match(/^\/evidossier\/projects\/[^/]+/),
    },
    {
      key: 'graph',
      label: t('evidossierCommon.nav.graph'),
      icon: <IconGraph size={16} />,
      path: '/graph',
      active: matches(location.pathname, '/graph'),
    },
  ];

  const projectItems: NavItem[] = project
    ? [
        {
          key: 'overview',
          label: t('evidossierCommon.nav.projectOverview'),
          icon: <IconFolder size={16} />,
          path: `/projects/${project.id}`,
          active: location.pathname === `/evidossier/projects/${project.id}`,
        },
        {
          key: 'packages',
          label: t('evidossierCommon.nav.packages'),
          icon: <IconPackage size={16} />,
          path: `/projects/${project.id}/packages`,
          active: location.pathname.startsWith(`/evidossier/projects/${project.id}/packages`),
          meta: String(projectPackages.length),
        },
        {
          key: 'materials',
          label: t('evidossierCommon.nav.materials'),
          icon: <IconReview size={16} />,
          path: `/projects/${project.id}/materials`,
          active: location.pathname.startsWith(`/evidossier/projects/${project.id}/materials`),
        },
        {
          key: 'graph',
          label: t('evidossierCommon.nav.graph'),
          icon: <IconGraph size={16} />,
          path: `/projects/${project.id}/graph`,
          active: location.pathname.startsWith(`/evidossier/projects/${project.id}/graph`),
        },
      ]
    : [];

  return (
    <nav className='evd-sidenav' aria-label={t('evidossierCommon.nav.workspace')}>
      <div className='evd-sidenav__section'>
        <div className='evd-sidenav__heading'>{t('evidossierCommon.nav.workspace')}</div>
        {globalItems.map((item) => (
          <RowButton
            key={item.key}
            className='evd-sidenav__item'
            active={item.active}
            ariaLabel={item.label}
            onClick={() => navigate(`/evidossier${item.path === '/' ? '' : item.path}`)}
          >
            {item.icon}
            <span>{item.label}</span>
          </RowButton>
        ))}
      </div>

      {project ? (
        <div className='evd-sidenav__section' style={{ paddingTop: 4 }}>
          <div className='evd-sidenav__heading' style={{ marginBottom: 4 }}>
            {project.code}
          </div>
          <div className='evd-body' style={{ fontWeight: 600, marginBottom: 8 }}>
            {project.name}
          </div>
          {projectItems.map((item) => (
            <RowButton
              key={item.key}
              className='evd-sidenav__item'
              active={item.active}
              ariaLabel={item.label}
              onClick={() => navigate(`/evidossier${item.path}`)}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.meta ? <span className='evd-sidenav__meta'>{item.meta}</span> : null}
            </RowButton>
          ))}
          <Button
            type='text'
            size='small'
            className='evd-mt-8'
            icon={<IconFolder size={14} />}
            onClick={() => navigate('/evidossier/projects')}
          >
            {t('evidossierCommon.nav.backToProjects')}
          </Button>
        </div>
      ) : null}

      {context.packageId ? (
        <div className='evd-sidenav__section' style={{ paddingTop: 0 }}>
          <div className='evd-sidenav__heading'>{t('evidossierCommon.nav.recentPackages')}</div>
          <div className='evd-caption'>{context.packageCode}</div>
          <div className='evd-body evd-truncate' style={{ fontWeight: 600 }}>
            {context.packageTitle}
          </div>
        </div>
      ) : null}

      <div className='evd-sidenav__foot'>
        <RowButton
          className='evd-sidenav__item'
          ariaLabel={t('evidossierCommon.nav.home')}
          onClick={() => navigate('/evidossier/new/generate')}
        >
          <IconHistory size={16} />
          <span>{t('evidossierCommon.action.createPackage')}</span>
        </RowButton>
        <div className='evd-caption' style={{ marginTop: 8 }}>
          Evidossier V1 · {t('evidossierCommon.demo.chip')}
        </div>
      </div>
    </nav>
  );
};
