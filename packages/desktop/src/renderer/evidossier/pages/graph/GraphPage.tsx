/**
 * Global artifact graph page (`/evidossier/graph`).
 *
 * A page header plus a project switcher around the same interactive graph that
 * the project page graph tab mounts, so the reading and branch actions stay
 * consistent between the two entries.
 */
import { Button, Select } from '@arco-design/web-react';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useEvidossier } from '../../data/EvidossierProvider';
import { getProjectRelations } from '../../data/selectors';
import { EmptyState, LoadingBlock, PageHeader } from '../../design/primitives';
import { IconExternal } from '../../design/icons';
import ProjectGraphPanel from './ProjectGraphPanel';
import './graph.css';

const Option = Select.Option;

/** Keep Arco portals inside `.evd-root` so Carbon tokens and overrides apply. */
const getPopupMount = (): HTMLElement => (document.querySelector('.evd-root') as HTMLElement | null) ?? document.body;

const GraphPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { snapshot } = useEvidossier();
  const [projectId, setProjectId] = useState<string | undefined>(undefined);

  const projects = useMemo(() => snapshot?.projects ?? [], [snapshot]);

  const fallbackProjectId = useMemo(() => {
    if (!snapshot) return undefined;
    const withRelations = projects.find((project) => getProjectRelations(snapshot, project.id).length > 0);
    return withRelations?.id ?? projects[0]?.id;
  }, [snapshot, projects]);

  const activeProjectId =
    projectId && projects.some((project) => project.id === projectId) ? projectId : fallbackProjectId;

  if (!snapshot) return <LoadingBlock />;

  return (
    <div className='evd-graph-page'>
      <div className='evd-graph-page__header'>
        <PageHeader
          title={t('evidossierGraph.page.title')}
          description={t('evidossierGraph.page.description')}
          actions={
            <>
              <span className='evd-graph-page__project'>
                <span className='evd-label'>{t('evidossierGraph.page.projectLabel')}</span>
                <Select
                  size='small'
                  value={activeProjectId}
                  className='evd-graph-page__select'
                  getPopupContainer={getPopupMount}
                  onChange={(value: string) => setProjectId(value)}
                >
                  {projects.map((project) => (
                    <Option key={project.id} value={project.id}>
                      {project.code} · {project.name}
                    </Option>
                  ))}
                </Select>
              </span>
              {activeProjectId ? (
                <Button
                  size='small'
                  icon={<IconExternal size={14} />}
                  onClick={() => navigate(`/evidossier/projects/${activeProjectId}`)}
                >
                  {t('evidossierGraph.page.openProject')}
                </Button>
              ) : null}
            </>
          }
        />
      </div>

      <div className='evd-graph-page__body'>
        {projects.length === 0 ? (
          <EmptyState
            title={t('evidossierGraph.page.noProjectsTitle')}
            text={t('evidossierGraph.page.noProjectsText')}
            actions={
              <Button type='primary' onClick={() => navigate('/evidossier/projects')}>
                {t('evidossierGraph.page.viewProjects')}
              </Button>
            }
          />
        ) : activeProjectId ? (
          <ProjectGraphPanel projectId={activeProjectId} />
        ) : (
          <EmptyState title={t('evidossierGraph.page.noProjectSelected')} />
        )}
      </div>
    </div>
  );
};

export default GraphPage;
