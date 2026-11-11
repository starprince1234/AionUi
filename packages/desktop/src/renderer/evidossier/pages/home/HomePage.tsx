/**
 * Workspace home.
 *
 * Answers "where am I and what should I do next": the three task entries, the
 * packages waiting for the user, recent projects and recent packages. All
 * numbers come from the snapshot; nothing on this page is hard-coded.
 */
import { Button, Dropdown, Menu } from '@arco-design/web-react';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEvidossier } from '../../data/EvidossierProvider';
import {
  getProject,
  listAttentionPackages,
  listProjectMaterials,
  listProjectPackages,
  listRecentPackages,
  packageNeedsUser,
} from '../../data/selectors';
import type { TaskKind } from '../../domain/types';
import { IconChevronDown, IconCompare, IconGenerate, IconPlus, IconReview } from '../../design/icons';
import {
  Banner,
  Card,
  EmptyState,
  LoadingBlock,
  PageHeader,
  RowButton,
  Section,
  Stats,
  formatDateTime,
  useEvidT,
} from '../../design/primitives';
import { CreateProjectModal } from '../projects/ProjectDialogs';
import { PackageRow } from '../projects/PackageRow';
import { createTaskPath, packagePath } from '../projects/packageInfo';
import './home.css';

const TASK_ENTRIES: ReadonlyArray<{ kind: TaskKind; icon: React.ReactNode }> = [
  { kind: 'generate', icon: <IconGenerate size={20} /> },
  { kind: 'review', icon: <IconReview size={20} /> },
  { kind: 'compare', icon: <IconCompare size={20} /> },
];

const HomePage: React.FC = () => {
  const t = useEvidT();
  const navigate = useNavigate();
  const { snapshot, loading } = useEvidossier();
  const [createOpen, setCreateOpen] = useState(false);

  const view = useMemo(() => {
    if (!snapshot) {
      return {
        attention: [],
        recentProjects: [],
        recentPackages: [],
        stats: { projects: 0, packages: 0, attention: 0, versions: 0 },
      };
    }
    const attention = listAttentionPackages(snapshot);
    const recentProjects = snapshot.projects.toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3);
    const recentPackages = listRecentPackages(snapshot, 6);
    return {
      attention,
      recentProjects,
      recentPackages,
      stats: {
        projects: snapshot.projects.length,
        packages: snapshot.packages.length,
        attention: attention.length,
        versions: snapshot.versions.length,
      },
    };
  }, [snapshot]);

  if (loading || !snapshot) {
    return (
      <div className='evd-page evd-proj-page'>
        <LoadingBlock />
      </div>
    );
  }

  const createMenu = (
    <Menu
      onClickMenuItem={(key) => {
        if (key === 'generate' || key === 'review' || key === 'compare') navigate(createTaskPath(key));
      }}
      style={{ width: 240 }}
    >
      {TASK_ENTRIES.map((entry) => (
        <Menu.Item key={entry.kind}>
          <span className='evd-row' style={{ gap: 8 }}>
            {entry.icon}
            {t(`evidossierCommon.taskKind.${entry.kind}`)}
          </span>
        </Menu.Item>
      ))}
    </Menu>
  );

  return (
    <div className='evd-page evd-proj-page'>
      <PageHeader
        title={t('evidossierProjects.home.title')}
        description={t('evidossierProjects.home.description')}
        actions={
          <div className='evd-row' style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Button icon={<IconPlus size={14} />} onClick={() => setCreateOpen(true)}>
              {t('evidossierProjects.home.createProject')}
            </Button>
            <Dropdown droplist={createMenu} position='br' trigger='click'>
              <Button type='primary'>
                {t('evidossierProjects.home.newPackage')} <IconChevronDown size={12} />
              </Button>
            </Dropdown>
          </div>
        }
      />

      <Section title={t('evidossierProjects.home.entriesTitle')}>
        <div className='evd-proj-entries'>
          {TASK_ENTRIES.map(({ kind, icon }) => (
            <div className='evd-proj-entry' key={kind}>
              <RowButton
                className='evd-proj-entry__main'
                onClick={() => navigate(createTaskPath(kind))}
                ariaLabel={t(`evidossierProjects.home.entries.${kind}.title`)}
              >
                <span className='evd-proj-entry__icon'>{icon}</span>
                <span className='evd-stack evd-stack--sm' style={{ flex: '1 1 auto', minWidth: 0 }}>
                  <span className='evd-h3'>{t(`evidossierProjects.home.entries.${kind}.title`)}</span>
                  <span className='evd-body evd-muted'>{t(`evidossierProjects.home.entries.${kind}.description`)}</span>
                  <span className='evd-caption'>{t(`evidossierProjects.home.entries.${kind}.input`)}</span>
                </span>
              </RowButton>
              <div className='evd-proj-entry__foot'>
                <Button type='primary' size='small' onClick={() => navigate(createTaskPath(kind))}>
                  {t(`evidossierProjects.home.entries.${kind}.action`)}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <div className='evd-proj-home__stats'>
        <Stats
          items={[
            { label: t('evidossierProjects.home.stats.projects'), value: view.stats.projects },
            { label: t('evidossierProjects.home.stats.packages'), value: view.stats.packages },
            { label: t('evidossierProjects.home.stats.attention'), value: view.stats.attention },
            { label: t('evidossierProjects.home.stats.versions'), value: view.stats.versions },
          ]}
        />
      </div>

      {snapshot.projects.length === 0 ? (
        <Section>
          <EmptyState
            title={t('evidossierProjects.home.noProjects.title')}
            text={t('evidossierProjects.home.noProjects.text')}
            actions={
              <Button type='primary' icon={<IconPlus size={14} />} onClick={() => setCreateOpen(true)}>
                {t('evidossierProjects.home.noProjects.create')}
              </Button>
            }
          />
        </Section>
      ) : (
        <>
          <Section
            title={t('evidossierProjects.home.attention.title')}
            hint={t('evidossierProjects.home.attention.hint')}
          >
            {view.attention.length === 0 ? (
              <div className='evd-card'>
                <EmptyState
                  title={t('evidossierProjects.home.attention.emptyTitle')}
                  text={t('evidossierProjects.home.attention.emptyText')}
                />
              </div>
            ) : (
              <div className='evd-card'>
                {view.attention.map((pkg) => (
                  <PackageRow
                    key={pkg.id}
                    pkg={pkg}
                    snapshot={snapshot}
                    projectName={getProject(snapshot, pkg.projectId)?.name}
                    showAttentionNote
                    onOpen={() => navigate(packagePath(pkg.id))}
                  />
                ))}
              </div>
            )}
          </Section>

          <Section
            title={t('evidossierProjects.home.recentProjects.title')}
            hint={t('evidossierProjects.home.recentProjects.hint')}
            actions={
              view.recentProjects.length > 0 ? (
                <Button type='text' onClick={() => navigate('/evidossier/projects')}>
                  {t('evidossierProjects.home.recentProjects.viewAll')}
                </Button>
              ) : undefined
            }
          >
            {view.recentProjects.length === 0 ? (
              <EmptyState
                title={t('evidossierProjects.home.recentProjects.emptyTitle')}
                text={t('evidossierProjects.home.recentProjects.emptyText')}
                actions={
                  <Button type='primary' icon={<IconPlus size={14} />} onClick={() => setCreateOpen(true)}>
                    {t('evidossierProjects.home.createProject')}
                  </Button>
                }
              />
            ) : (
              <div className='evd-proj-home__projects'>
                {view.recentProjects.map((project) => {
                  const packages = listProjectPackages(snapshot, project.id);
                  const materials = listProjectMaterials(snapshot, project.id);
                  const attention = packages.filter(packageNeedsUser).length;
                  return (
                    <Card
                      key={project.id}
                      title={project.name}
                      subtitle={project.code}
                      ariaLabel={project.name}
                      onClick={() => navigate(`/evidossier/projects/${project.id}`)}
                    >
                      <p className='evd-body evd-muted evd-proj-clamp'>{project.description}</p>
                      <div className='evd-proj-home__metrics'>
                        <span>{t('evidossierProjects.home.projectMeta.packages', { count: packages.length })}</span>
                        <span>{t('evidossierProjects.home.projectMeta.materials', { count: materials.length })}</span>
                        <span>{t('evidossierProjects.home.projectMeta.attention', { count: attention })}</span>
                      </div>
                      <p className='evd-caption evd-mb-0'>
                        {t('evidossierProjects.home.projectMeta.updated', { time: formatDateTime(project.updatedAt) })}
                      </p>
                    </Card>
                  );
                })}
              </div>
            )}
          </Section>

          <Section
            title={t('evidossierProjects.home.recentPackages.title')}
            hint={t('evidossierProjects.home.recentPackages.hint')}
            actions={
              <Button type='text' onClick={() => navigate('/evidossier/projects')}>
                {t('evidossierProjects.home.recentPackages.viewAll')}
              </Button>
            }
          >
            {view.recentPackages.length === 0 ? (
              <EmptyState
                title={t('evidossierProjects.home.recentPackages.emptyTitle')}
                text={t('evidossierProjects.home.recentPackages.emptyText')}
              />
            ) : (
              <div className='evd-card'>
                {view.recentPackages.map((pkg) => (
                  <PackageRow
                    key={pkg.id}
                    pkg={pkg}
                    snapshot={snapshot}
                    projectName={getProject(snapshot, pkg.projectId)?.name}
                    onOpen={() => navigate(packagePath(pkg.id))}
                  />
                ))}
              </div>
            )}
          </Section>
        </>
      )}

      <Banner tone='info' title={t('evidossierCommon.demo.bannerTitle')}>
        {t('evidossierCommon.demo.bannerText')} · {t('evidossierCommon.demo.savedLocally')}
      </Banner>

      <CreateProjectModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(project) => {
          setCreateOpen(false);
          navigate(`/evidossier/projects/${project.id}`);
        }}
      />
    </div>
  );
};

export default HomePage;
