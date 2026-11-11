/**
 * Evidossier application shell.
 *
 * Mounted by AionUi's router for `/evidossier/*`. It replaces the chat-centric
 * AionUi layout with the Artifact-centered workspace shell (top bar, project
 * navigation, demo banner) while reusing AionUi's React, Arco and i18n base.
 */
import { Button, Dropdown, Menu, Message, Modal, Spin } from '@arco-design/web-react';
import React, { Suspense, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { EvidossierProvider, useEvidossier } from '../data/EvidossierProvider';
import { getPackage, getProject } from '../data/selectors';
import { DemoTag, PageHeader } from '../design/primitives';
import { IconChevronDown, IconCompare, IconGenerate, IconRefresh, IconReview } from '../design/icons';
import { EvidossierSideNav } from './EvidossierSideNav';
import '../design/carbon.css';

const HomePage = React.lazy(() => import('../pages/home/HomePage'));
const ProjectsPage = React.lazy(() => import('../pages/projects/ProjectsPage'));
const ProjectPage = React.lazy(() => import('../pages/projects/ProjectPage'));
const PackageWorkspacePage = React.lazy(() => import('../pages/package/PackageWorkspacePage'));
const VersionDetailPage = React.lazy(() => import('../pages/versions/VersionDetailPage'));
const CreateTaskWizard = React.lazy(() => import('../pages/new/CreateTaskWizard'));
const GraphPage = React.lazy(() => import('../pages/graph/GraphPage'));

const RouteFallback: React.FC = () => (
  <div className='evd-center'>
    <Spin size={24} />
  </div>
);

const EvidossierTopBar: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { snapshot, actions } = useEvidossier();
  const [resetOpen, setResetOpen] = useState(false);

  const contextLabel = useMemo(() => {
    if (!snapshot) return '';
    const packageMatch = location.pathname.match(/\/packages\/([^/]+)/);
    if (packageMatch) {
      const pkg = getPackage(snapshot, packageMatch[1]);
      if (pkg) return `${pkg.code} · ${pkg.title}`;
    }
    const projectMatch = location.pathname.match(/\/projects\/([^/]+)/);
    if (projectMatch) {
      const project = getProject(snapshot, projectMatch[1]);
      if (project) return project.name;
    }
    if (location.pathname.includes('/graph')) return t('evidossierCommon.nav.graph');
    if (location.pathname.includes('/new')) return t('evidossierCommon.action.createPackage');
    return t('evidossierCommon.nav.home');
  }, [snapshot, location.pathname, t]);

  const createMenu = (
    <Menu onClickMenuItem={(key) => navigate(`/evidossier/new/${key}`)} style={{ width: 220 }}>
      <Menu.Item key='generate'>
        <span className='evd-row' style={{ gap: 8 }}>
          <IconGenerate size={14} /> {t('evidossierCommon.taskKind.generate')}
        </span>
      </Menu.Item>
      <Menu.Item key='review'>
        <span className='evd-row' style={{ gap: 8 }}>
          <IconReview size={14} /> {t('evidossierCommon.taskKind.review')}
        </span>
      </Menu.Item>
      <Menu.Item key='compare'>
        <span className='evd-row' style={{ gap: 8 }}>
          <IconCompare size={14} /> {t('evidossierCommon.taskKind.compare')}
        </span>
      </Menu.Item>
    </Menu>
  );

  return (
    <>
      <header className='evd-topbar'>
        <Button type='text' className='evd-btn-reset evd-brand' onClick={() => navigate('/evidossier')}>
          <span className='evd-brand__mark' aria-hidden>
            <span />
            <span />
            <span />
            <span />
          </span>
          <span className='evd-brand__name'>Evidossier</span>
          <span className='evd-brand__suffix'>{t('evidossierCommon.brand.suffix')}</span>
        </Button>
        <span className='evd-topbar__spacer' />
        <span className='evd-caption evd-truncate' style={{ maxWidth: 420 }}>
          {contextLabel}
        </span>
        <span className='evd-topbar__spacer' />
        <DemoTag>{t('evidossierCommon.demo.chip')}</DemoTag>
        <Dropdown droplist={createMenu} position='br' trigger='click'>
          <Button type='primary' size='small'>
            {t('evidossierCommon.action.create')} <IconChevronDown size={12} />
          </Button>
        </Dropdown>
        <Button
          size='small'
          type='text'
          icon={<IconRefresh size={14} />}
          aria-label={t('evidossierCommon.action.refresh')}
          onClick={() => {
            void actions.refresh();
            Message.success(t('evidossierCommon.action.refresh'));
          }}
        />
        <span className='evd-row' style={{ gap: 6 }}>
          <span
            aria-hidden
            style={{
              width: 24,
              height: 24,
              background: 'var(--evd-surface-2)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            林
          </span>
          <span className='evd-caption'>
            {snapshot?.currentUser.displayName ?? t('evidossierCommon.common.demoUser')}
          </span>
        </span>
      </header>
      <div
        className='evd-row'
        style={{
          gap: 12,
          minHeight: 36,
          padding: '6px 16px',
          background: 'var(--evd-surface-1)',
          borderBottom: '1px solid var(--evd-hairline)',
          flexWrap: 'wrap',
        }}
      >
        <span className='evd-caption' style={{ color: 'var(--evd-ink)' }}>
          {t('evidossierCommon.demo.bannerTitle')}
        </span>
        <span className='evd-caption evd-truncate' style={{ flex: '1 1 240px' }}>
          {t('evidossierCommon.demo.bannerText')}
        </span>
        <Button size='mini' type='text' onClick={() => setResetOpen(true)}>
          {t('evidossierCommon.demo.reset')}
        </Button>
      </div>
      <Modal
        title={t('evidossierCommon.demo.resetConfirmTitle')}
        visible={resetOpen}
        onCancel={() => setResetOpen(false)}
        onOk={() => {
          void actions.resetDemo().then((ok) => {
            if (ok) {
              Message.success(t('evidossierCommon.demo.resetDone'));
              navigate('/evidossier');
            }
            setResetOpen(false);
          });
        }}
        okText={t('evidossierCommon.demo.reset')}
        cancelText={t('evidossierCommon.action.cancel')}
      >
        <p className='evd-body evd-mb-8'>{t('evidossierCommon.demo.resetConfirmText')}</p>
        <p className='evd-caption evd-mb-0'>{t('evidossierCommon.demo.savedLocally')}</p>
      </Modal>
    </>
  );
};

const EvidossierContent: React.FC = () => {
  const { t } = useTranslation();
  const { snapshot, loading } = useEvidossier();

  if (loading || !snapshot) {
    return (
      <div className='evd-main'>
        <div className='evd-center' style={{ flex: 1 }}>
          <Spin size={28} tip={t('evidossierCommon.common.loadingWorkspace')} />
        </div>
      </div>
    );
  }

  return (
    <div className='evd-shell__body'>
      <EvidossierSideNav />
      <main className='evd-main'>
        <Suspense fallback={<RouteFallback />}>
          <RoutesSwitch />
        </Suspense>
      </main>
    </div>
  );
};

const RoutesSwitch: React.FC = () => (
  <Routes>
    <Route index element={<HomePage />} />
    <Route path='projects' element={<ProjectsPage />} />
    <Route path='projects/:projectId/:tab?' element={<ProjectPage />} />
    <Route path='packages/:packageId/versions/:versionId' element={<VersionDetailPage />} />
    <Route path='packages/:packageId' element={<PackageWorkspacePage />} />
    <Route path='new/:kind' element={<CreateTaskWizard />} />
    <Route path='graph' element={<GraphPage />} />
    <Route path='*' element={<EvidossierNotFound />} />
  </Routes>
);

const EvidossierNotFound: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className='evd-page'>
      <PageHeader
        title={t('evidossierCommon.common.notFound')}
        description={t('evidossierCommon.common.notFoundText')}
        actions={
          <Button type='primary' onClick={() => navigate('/evidossier')}>
            {t('evidossierCommon.nav.home')}
          </Button>
        }
      />
    </div>
  );
};

const EvidossierApp: React.FC = () => (
  <EvidossierProvider>
    <div className='evd-root' style={{ display: 'flex', flexDirection: 'column', height: '100dvh', minHeight: 0 }}>
      <EvidossierTopBar />
      <EvidossierContent />
    </div>
  </EvidossierProvider>
);

export default EvidossierApp;
