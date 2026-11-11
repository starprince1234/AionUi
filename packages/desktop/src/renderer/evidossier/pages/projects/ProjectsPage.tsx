/**
 * Project list: search, project cards, create and rename actions.
 *
 * Counts and membership are derived from the snapshot on every render so new
 * materials or packages are reflected immediately.
 */
import { Button, Dropdown, Input, Menu } from '@arco-design/web-react';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEvidossier } from '../../data/EvidossierProvider';
import { getProjectVersions, listProjectMaterials, listProjectPackages, packageNeedsUser } from '../../data/selectors';
import type { Project } from '../../domain/types';
import { IconMore, IconPlus, IconSearch } from '../../design/icons';
import { EmptyState, LoadingBlock, PageHeader, formatDateTime, useEvidT } from '../../design/primitives';
import { CreateProjectModal, RenameProjectModal } from './ProjectDialogs';
import { projectMemberNames } from './packageInfo';
import './projects.css';

const ProjectsPage: React.FC = () => {
  const t = useEvidT();
  const navigate = useNavigate();
  const { snapshot, loading } = useEvidossier();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Project | null>(null);

  const projects = useMemo(
    () => (snapshot ? snapshot.projects.toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt)) : []),
    [snapshot]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter((project) =>
      [project.name, project.code, project.description, ...project.tags].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [projects, search]);

  if (loading || !snapshot) {
    return (
      <div className='evd-page evd-proj-page'>
        <LoadingBlock />
      </div>
    );
  }

  const openProject = (project: Project): void => {
    navigate(`/evidossier/projects/${project.id}`);
  };

  const renderProjectCard = (project: Project): React.ReactNode => {
    const packages = listProjectPackages(snapshot, project.id);
    const materials = listProjectMaterials(snapshot, project.id);
    const attention = packages.filter(packageNeedsUser).length;
    const versions = getProjectVersions(snapshot, project.id).length;

    const moreMenu = (
      <Menu
        onClickMenuItem={(key) => {
          if (key === 'open') openProject(project);
          if (key === 'rename') setRenameTarget(project);
        }}
        style={{ width: 180 }}
      >
        <Menu.Item key='open'>{t('evidossierProjects.projects.open')}</Menu.Item>
        <Menu.Item key='rename'>{t('evidossierCommon.action.rename')}</Menu.Item>
      </Menu>
    );

    return (
      <div className='evd-card evd-proj-card' key={project.id}>
        <div className='evd-proj-card__head'>
          <div className='evd-proj-card__heading'>
            <span className='evd-caption evd-mono'>{project.code}</span>
            <h3 className='evd-h3 evd-proj-card__name'>{project.name}</h3>
          </div>
          <Dropdown droplist={moreMenu} trigger='click' position='br'>
            <Button type='text' icon={<IconMore size={14} />} aria-label={t('evidossierProjects.projects.more')} />
          </Dropdown>
        </div>
        <p className='evd-body evd-muted evd-proj-card__desc'>
          {project.description || t('evidossierProjects.projects.noDescription')}
        </p>
        <div className='evd-proj-card__metrics'>
          <div className='evd-proj-mini'>
            <div className='evd-proj-mini__label'>{t('evidossierProjects.projects.packages')}</div>
            <div className='evd-proj-mini__value'>{packages.length}</div>
          </div>
          <div className='evd-proj-mini'>
            <div className='evd-proj-mini__label'>{t('evidossierProjects.projects.materials')}</div>
            <div className='evd-proj-mini__value'>{materials.length}</div>
          </div>
          <div className='evd-proj-mini'>
            <div className='evd-proj-mini__label'>{t('evidossierProjects.projects.attention')}</div>
            <div className='evd-proj-mini__value'>{attention}</div>
          </div>
          <div className='evd-proj-mini'>
            <div className='evd-proj-mini__label'>{t('evidossierProjects.projects.versions')}</div>
            <div className='evd-proj-mini__value'>{versions}</div>
          </div>
        </div>
        <div className='evd-proj-card__foot'>
          <span className='evd-caption evd-truncate'>
            {t('evidossierProjects.projects.members')} · {projectMemberNames(project)}
          </span>
          <span className='evd-caption evd-nowrap'>
            {t('evidossierProjects.projects.updated')} {formatDateTime(project.updatedAt)}
          </span>
        </div>
        <div className='evd-proj-card__actions'>
          <Button size='small' onClick={() => openProject(project)}>
            {t('evidossierProjects.projects.open')}
          </Button>
          <Button size='small' type='text' onClick={() => setRenameTarget(project)}>
            {t('evidossierCommon.action.rename')}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className='evd-page evd-proj-page'>
      <PageHeader
        title={t('evidossierProjects.projects.title')}
        description={t('evidossierProjects.projects.description')}
        actions={
          <Button type='primary' icon={<IconPlus size={14} />} onClick={() => setCreateOpen(true)}>
            {t('evidossierProjects.projects.create')}
          </Button>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          title={t('evidossierProjects.projects.emptyTitle')}
          text={t('evidossierProjects.projects.emptyText')}
          actions={
            <Button type='primary' icon={<IconPlus size={14} />} onClick={() => setCreateOpen(true)}>
              {t('evidossierProjects.projects.create')}
            </Button>
          }
        />
      ) : (
        <>
          <div className='evd-toolbar evd-mb-16'>
            <Input
              style={{ width: 320, maxWidth: '100%' }}
              prefix={<IconSearch size={14} />}
              allowClear
              value={search}
              onChange={(value) => setSearch(value)}
              placeholder={t('evidossierProjects.projects.searchPlaceholder')}
              aria-label={t('evidossierProjects.projects.searchPlaceholder')}
            />
            <span className='evd-caption'>{t('evidossierProjects.projects.count', { count: filtered.length })}</span>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title={t('evidossierProjects.projects.noMatchTitle')}
              text={t('evidossierProjects.projects.noMatchText')}
              actions={<Button onClick={() => setSearch('')}>{t('evidossierProjects.projects.clearSearch')}</Button>}
            />
          ) : (
            <div className='evd-proj-cards'>{filtered.map(renderProjectCard)}</div>
          )}
        </>
      )}

      <CreateProjectModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(project) => {
          setCreateOpen(false);
          openProject(project);
        }}
      />
      <RenameProjectModal
        project={renameTarget}
        onClose={() => setRenameTarget(null)}
        onRenamed={() => setRenameTarget(null)}
      />
    </div>
  );
};

export default ProjectsPage;
