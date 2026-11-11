/**
 * Project workspace: one page with overview / packages / materials / graph tabs.
 *
 * The active tab is part of the URL, so refresh and deep links work and the
 * side navigation highlights the matching entry.
 */
import { Button, Dropdown, Menu } from '@arco-design/web-react';
import React, { Suspense, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEvidossier } from '../../data/EvidossierProvider';
import { getProject, getProjectRelations, listProjectMaterials, listProjectPackages } from '../../data/selectors';
import type { TaskKind } from '../../domain/types';
import { IconChevronDown, IconCompare, IconGenerate, IconReview } from '../../design/icons';
import {
  EmptyState,
  LoadingBlock,
  MetaList,
  PageHeader,
  TabStrip,
  formatDateTime,
  useEvidT,
} from '../../design/primitives';
import { MaterialPanel } from '../materials/MaterialPanel';
import { ProjectOverview } from './ProjectOverview';
import { ProjectPackagesTab } from './ProjectPackagesTab';
import { RenameProjectModal } from './ProjectDialogs';
import { createTaskPath, projectMemberNames, projectTabPath, TASK_KINDS } from './packageInfo';
import './projects.css';

const ProjectGraphPanel = React.lazy(() => import('../graph/ProjectGraphPanel'));

type ProjectTab = 'overview' | 'packages' | 'materials' | 'graph';

const isProjectTab = (value: string | undefined): value is ProjectTab =>
  value === 'overview' || value === 'packages' || value === 'materials' || value === 'graph';

const TASK_ICONS: Record<TaskKind, React.ReactNode> = {
  generate: <IconGenerate size={14} />,
  review: <IconReview size={14} />,
  compare: <IconCompare size={14} />,
};

const ProjectPage: React.FC = () => {
  const t = useEvidT();
  const navigate = useNavigate();
  const params = useParams<{ projectId?: string; tab?: string }>();
  const { snapshot, loading } = useEvidossier();
  const [renameOpen, setRenameOpen] = useState(false);

  const projectId = params.projectId ?? '';
  const tab: ProjectTab = isProjectTab(params.tab) ? params.tab : 'overview';

  const project = useMemo(() => (snapshot ? getProject(snapshot, projectId) : undefined), [snapshot, projectId]);

  const counts = useMemo(() => {
    if (!snapshot || !project) return { packages: 0, materials: 0, relations: 0 };
    return {
      packages: listProjectPackages(snapshot, project.id).length,
      materials: listProjectMaterials(snapshot, project.id).length,
      relations: getProjectRelations(snapshot, project.id).length,
    };
  }, [snapshot, project]);

  if (loading || !snapshot) {
    return (
      <div className='evd-page evd-proj-page'>
        <LoadingBlock />
      </div>
    );
  }

  if (!project) {
    return (
      <div className='evd-page evd-proj-page'>
        <PageHeader title={t('evidossierProjects.project.notFoundTitle')} />
        <EmptyState
          title={t('evidossierProjects.project.notFoundTitle')}
          text={t('evidossierProjects.project.notFoundText')}
          actions={
            <Button type='primary' onClick={() => navigate('/evidossier/projects')}>
              {t('evidossierProjects.project.backToProjects')}
            </Button>
          }
        />
      </div>
    );
  }

  const newTaskMenu = (
    <Menu
      onClickMenuItem={(key) => {
        if (key === 'generate' || key === 'review' || key === 'compare') {
          navigate(createTaskPath(key, project.id));
        }
      }}
      style={{ width: 240 }}
    >
      {TASK_KINDS.map((kind) => (
        <Menu.Item key={kind}>
          <span className='evd-row' style={{ gap: 8 }}>
            {TASK_ICONS[kind]}
            {t(`evidossierCommon.taskKind.${kind}`)}
          </span>
        </Menu.Item>
      ))}
    </Menu>
  );

  return (
    <div className='evd-page evd-proj-page'>
      <PageHeader
        crumbs={[
          { label: t('evidossierProjects.project.crumbHome'), onClick: () => navigate('/evidossier') },
          { label: t('evidossierProjects.project.crumbProjects'), onClick: () => navigate('/evidossier/projects') },
          { label: project.name },
        ]}
        title={project.name}
        description={project.description}
        meta={
          <MetaList
            items={[
              {
                label: t('evidossierProjects.project.meta.code'),
                value: <span className='evd-mono'>{project.code}</span>,
              },
              { label: t('evidossierProjects.project.meta.members'), value: projectMemberNames(project) },
              { label: t('evidossierProjects.project.meta.updated'), value: formatDateTime(project.updatedAt) },
            ]}
          />
        }
        actions={
          <div className='evd-row' style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Button onClick={() => setRenameOpen(true)}>{t('evidossierProjects.project.rename')}</Button>
            <Dropdown droplist={newTaskMenu} position='br' trigger='click'>
              <Button type='primary'>
                {t('evidossierProjects.project.newTask')} <IconChevronDown size={12} />
              </Button>
            </Dropdown>
          </div>
        }
      />

      <div className='evd-proj-tabs'>
        <TabStrip
          items={[
            { key: 'overview', label: t('evidossierProjects.project.tabs.overview') },
            { key: 'packages', label: t('evidossierProjects.project.tabs.packages'), count: counts.packages },
            { key: 'materials', label: t('evidossierProjects.project.tabs.materials'), count: counts.materials },
            { key: 'graph', label: t('evidossierProjects.project.tabs.graph'), count: counts.relations },
          ]}
          value={tab}
          onChange={(key) => {
            if (isProjectTab(key)) navigate(projectTabPath(project.id, key));
          }}
          ariaLabel={t('evidossierProjects.project.tabsLabel')}
        />
      </div>

      {tab === 'overview' ? (
        <ProjectOverview project={project} onOpenTab={(next) => navigate(projectTabPath(project.id, next))} />
      ) : null}

      {tab === 'packages' ? <ProjectPackagesTab projectId={project.id} /> : null}

      {tab === 'materials' ? <MaterialPanel projectId={project.id} /> : null}

      {tab === 'graph' ? (
        <Suspense fallback={<LoadingBlock label={t('evidossierProjects.project.loadingGraph')} />}>
          <ProjectGraphPanel projectId={project.id} />
        </Suspense>
      ) : null}

      <RenameProjectModal
        project={renameOpen ? project : null}
        onClose={() => setRenameOpen(false)}
        onRenamed={() => setRenameOpen(false)}
      />
    </div>
  );
};

export default ProjectPage;
