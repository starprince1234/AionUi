/**
 * Project-scope artifact graph tab.
 *
 * Owns filtering, expansion, selection and the read-only detail panel; the
 * canvas itself is the generic `GraphView`. Mounted both by the project page
 * tab and (wrapped by `GraphPage`) at `/evidossier/graph`.
 */
import { Button, Drawer, Input, Select, Tooltip } from '@arco-design/web-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useEvidossier } from '../../data/EvidossierProvider';
import { getProject, getProjectRelations, getProjectVersions, listProjectPackages } from '../../data/selectors';
import {
  ALL_RELATION_TYPES,
  ALL_TASK_KINDS,
  buildGraph,
  emptyGraphLayout,
  type GraphBuildOptions,
} from '../../domain/graph';
import type { GraphEdge, GraphNode, RelationType, TaskKind } from '../../domain/types';
import { cx, EmptyState, LoadingBlock } from '../../design/primitives';
import { IconSearch } from '../../design/icons';
import GraphView, { type GraphBranchAction } from './GraphView';
import GraphDetailPanel from './GraphDetailPanel';
import './graph.css';

const Option = Select.Option;

const EMPTY_LAYOUT = emptyGraphLayout();

/** Keep Arco portals inside `.evd-root` so Carbon tokens and overrides apply. */
const getPopupMount = (): HTMLElement => (document.querySelector('.evd-root') as HTMLElement | null) ?? document.body;

const newTaskUrl = (action: GraphBranchAction, projectId: string, versionId: string): string => {
  const project = encodeURIComponent(projectId);
  const version = encodeURIComponent(versionId);
  if (action === 'review') return `/evidossier/new/review?projectId=${project}&reviewVersionId=${version}`;
  if (action === 'compare') return `/evidossier/new/compare?projectId=${project}&baselineVersionId=${version}`;
  // The generate wizard reads `baseVersionId`; `mode=revision` selects the
  // revision intent so the user only has to confirm the scope.
  return `/evidossier/new/generate?projectId=${project}&mode=revision&baseVersionId=${version}`;
};

export type ProjectGraphPanelProps = {
  projectId: string;
  className?: string;
};

export const ProjectGraphPanel: React.FC<ProjectGraphPanelProps> = ({ projectId, className }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { snapshot } = useEvidossier();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [relationTypes, setRelationTypes] = useState<RelationType[]>([...ALL_RELATION_TYPES]);
  const [taskKinds, setTaskKinds] = useState<TaskKind[]>([...ALL_TASK_KINDS]);
  const [expandedPackageIds, setExpandedPackageIds] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(undefined);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [compact, setCompact] = useState(false);

  const project = snapshot ? getProject(snapshot, projectId) : undefined;
  const projectPackages = snapshot ? listProjectPackages(snapshot, projectId) : [];
  const projectVersions = snapshot ? getProjectVersions(snapshot, projectId) : [];
  const projectRelations = snapshot ? getProjectRelations(snapshot, projectId) : [];

  const layout = useMemo(() => {
    if (!snapshot) return EMPTY_LAYOUT;
    const options: GraphBuildOptions = {
      scope: { kind: 'project', projectId },
      relationTypes,
      taskKinds,
      expandedPackageIds,
    };
    return buildGraph(snapshot, options);
  }, [snapshot, projectId, relationTypes, taskKinds, expandedPackageIds]);

  const selectedNode = useMemo(
    () => layout.nodes.find((node) => node.id === selectedNodeId),
    [layout.nodes, selectedNodeId]
  );
  const selectedEdge = useMemo(
    () => layout.edges.find((edge) => edge.id === selectedEdgeId),
    [layout.edges, selectedEdgeId]
  );

  /* Clear view state when the panel is pointed at another project. */
  useEffect(() => {
    setExpandedPackageIds([]);
    setSelectedNodeId(undefined);
    setSelectedEdgeId(undefined);
    setSearch('');
  }, [projectId]);

  /* Clear selection when filters / expansion removes the selected item. */
  useEffect(() => {
    if (selectedNodeId && !layout.nodes.some((node) => node.id === selectedNodeId)) setSelectedNodeId(undefined);
    if (selectedEdgeId && !layout.edges.some((edge) => edge.id === selectedEdgeId)) setSelectedEdgeId(undefined);
  }, [layout, selectedNodeId, selectedEdgeId]);

  /* Detail panel inline above 800px of available width, drawer below (≈1080px viewport). */
  useEffect(() => {
    const element = rootRef.current;
    if (!element) return undefined;
    const update = (): void => setCompact(element.clientWidth > 0 && element.clientWidth < 800);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const normalizedSearch = search.trim().toLowerCase();
  const matchedNodeIds = useMemo(() => {
    if (!normalizedSearch) return undefined;
    return layout.nodes
      .filter((node) => {
        const text =
          node.nodeType === 'package'
            ? `${node.packageCode} ${node.title}`
            : `${node.versionLabel} ${node.packageCode} ${node.title}`;
        return text.toLowerCase().includes(normalizedSearch);
      })
      .map((node) => node.id);
  }, [layout.nodes, normalizedSearch]);

  const expandablePackageIds = useMemo(
    () => projectPackages.filter((pkg) => pkg.versionIds.length > 0).map((pkg) => pkg.id),
    [projectPackages]
  );
  const filtersDirty = relationTypes.length !== ALL_RELATION_TYPES.length || taskKinds.length !== ALL_TASK_KINDS.length;

  const clearSelection = (): void => {
    setSelectedNodeId(undefined);
    setSelectedEdgeId(undefined);
  };

  const handleSelectNode = (node: GraphNode | null): void => {
    setSelectedNodeId(node?.id);
    if (node) setSelectedEdgeId(undefined);
  };

  const handleSelectEdge = (edge: GraphEdge | null): void => {
    setSelectedEdgeId(edge?.id);
    if (edge) setSelectedNodeId(undefined);
  };

  const openPackage = (packageId: string): void => {
    navigate(`/evidossier/packages/${packageId}`);
  };

  const openVersion = (packageId: string, versionId: string): void => {
    navigate(`/evidossier/packages/${packageId}/versions/${versionId}`);
  };

  const handleOpenNode = (node: GraphNode): void => {
    if (node.nodeType === 'package') openPackage(node.packageId);
    else openVersion(node.packageId, node.versionId);
  };

  const handleTogglePackage = (packageId: string): void => {
    setExpandedPackageIds((current) =>
      current.includes(packageId) ? current.filter((id) => id !== packageId) : [...current, packageId]
    );
  };

  const handleCreateBranch = (node: GraphNode, action: GraphBranchAction): void => {
    let versionId: string | undefined;
    let linkProjectId = projectId;
    if (node.nodeType === 'version') {
      versionId = node.versionId;
      linkProjectId = snapshot?.versions.find((version) => version.id === versionId)?.projectId ?? projectId;
    } else {
      const pkg = projectPackages.find((candidate) => candidate.id === node.packageId);
      versionId = pkg?.versionIds[pkg.versionIds.length - 1];
      linkProjectId = pkg?.projectId ?? projectId;
    }
    if (!versionId) return;
    navigate(newTaskUrl(action, linkProjectId, versionId));
  };

  const resetFilters = (): void => {
    setRelationTypes([...ALL_RELATION_TYPES]);
    setTaskKinds([...ALL_TASK_KINDS]);
    setSearch('');
    setExpandedPackageIds([]);
  };

  const handleSearchSubmit = (): void => {
    const first = matchedNodeIds?.[0];
    if (!first) return;
    setSelectedEdgeId(undefined);
    setSelectedNodeId(first);
  };

  if (!snapshot) return <LoadingBlock />;

  if (!project) {
    return (
      <div className={cx('evd-graph-panel', className)} ref={rootRef}>
        <EmptyState
          title={t('evidossierGraph.emptyProject.title')}
          text={t('evidossierGraph.emptyProject.text')}
          actions={
            <Button onClick={() => navigate('/evidossier/projects')}>{t('evidossierGraph.emptyProject.back')}</Button>
          }
        />
      </div>
    );
  }

  const noPackages = projectPackages.length === 0;
  const noRelations = !noPackages && projectRelations.length === 0;
  const filteredEmpty = !noPackages && !noRelations && layout.nodes.length === 0;

  const emptyState = noPackages ? (
    <EmptyState
      center
      title={t('evidossierGraph.emptyPackages.title')}
      text={t('evidossierGraph.emptyPackages.text')}
      actions={
        <>
          <Button type='primary' onClick={() => navigate(`/evidossier/new/generate?projectId=${projectId}`)}>
            {t('evidossierGraph.emptyPackages.create')}
          </Button>
          <Button onClick={() => navigate(`/evidossier/projects/${projectId}/packages`)}>
            {t('evidossierGraph.emptyPackages.viewPackages')}
          </Button>
        </>
      }
    />
  ) : noRelations ? (
    <EmptyState
      center
      title={t('evidossierGraph.empty.title')}
      text={t('evidossierGraph.empty.text')}
      actions={
        <>
          <Button type='primary' onClick={() => navigate(`/evidossier/new/review?projectId=${projectId}`)}>
            {t('evidossierGraph.empty.startReview')}
          </Button>
          <Button onClick={() => navigate(`/evidossier/projects/${projectId}/packages`)}>
            {t('evidossierGraph.empty.viewPackages')}
          </Button>
        </>
      }
    />
  ) : filteredEmpty ? (
    <EmptyState
      center
      title={t('evidossierGraph.emptyFiltered.title')}
      text={t('evidossierGraph.emptyFiltered.text')}
      actions={<Button onClick={resetFilters}>{t('evidossierGraph.toolbar.resetFilters')}</Button>}
    />
  ) : undefined;

  return (
    <div className={cx('evd-graph-panel', className)} ref={rootRef}>
      <div className='evd-graph-panel__toolbar'>
        <span className='evd-graph-panel__field'>
          <span className='evd-label'>{t('evidossierGraph.toolbar.relationTypes')}</span>
          <Select
            mode='multiple'
            size='small'
            value={relationTypes}
            className='evd-graph-panel__select'
            getPopupContainer={getPopupMount}
            onChange={(value: RelationType[]) => setRelationTypes(value)}
          >
            {ALL_RELATION_TYPES.map((type) => (
              <Option key={type} value={type}>
                {t(`evidossierCommon.relation.${type}`)}
              </Option>
            ))}
          </Select>
        </span>
        <span className='evd-graph-panel__field'>
          <span className='evd-label'>{t('evidossierGraph.toolbar.taskTypes')}</span>
          <Select
            mode='multiple'
            size='small'
            value={taskKinds}
            className='evd-graph-panel__select evd-graph-panel__select--narrow'
            getPopupContainer={getPopupMount}
            onChange={(value: TaskKind[]) => setTaskKinds(value)}
          >
            {ALL_TASK_KINDS.map((kind) => (
              <Option key={kind} value={kind}>
                {t(`evidossierCommon.taskKind.${kind}Short`)}
              </Option>
            ))}
          </Select>
        </span>
        <span className='evd-graph-panel__field'>
          <span className='evd-label'>{t('evidossierGraph.toolbar.searchLabel')}</span>
          <Input
            size='small'
            allowClear
            value={search}
            className='evd-graph-panel__search'
            prefix={<IconSearch size={14} />}
            placeholder={t('evidossierGraph.toolbar.searchPlaceholder')}
            aria-label={t('evidossierGraph.toolbar.searchLabel')}
            onChange={(value: string) => setSearch(value)}
            onPressEnter={handleSearchSubmit}
          />
        </span>
        <span className='evd-graph-panel__spacer' />
        <Button
          size='small'
          disabled={expandablePackageIds.length === 0}
          onClick={() => setExpandedPackageIds(expandablePackageIds)}
        >
          {t('evidossierGraph.toolbar.expandAll')}
        </Button>
        <Button size='small' disabled={expandedPackageIds.length === 0} onClick={() => setExpandedPackageIds([])}>
          {t('evidossierGraph.toolbar.collapseAll')}
        </Button>
        {filtersDirty || search.length > 0 || expandedPackageIds.length > 0 ? (
          <Button size='small' type='text' onClick={resetFilters}>
            {t('evidossierGraph.toolbar.resetFilters')}
          </Button>
        ) : null}
      </div>

      <div className='evd-graph-panel__meta'>
        <span className='evd-caption'>
          {t('evidossierGraph.toolbar.counts', {
            packages: projectPackages.length,
            versions: projectVersions.length,
            relations: projectRelations.length,
          })}
        </span>
        <span className='evd-caption'>
          {t('evidossierGraph.toolbar.canvasCounts', {
            nodes: layout.nodes.length,
            edges: layout.edges.length,
          })}
        </span>
        {normalizedSearch ? (
          <span className='evd-caption'>
            {matchedNodeIds && matchedNodeIds.length > 0
              ? t('evidossierGraph.toolbar.searchMatches', { count: matchedNodeIds.length })
              : t('evidossierGraph.toolbar.searchNoMatch')}
          </span>
        ) : null}
        <span className='evd-graph-panel__spacer' />
        <Tooltip content={t('evidossierGraph.toolbar.graphHint')} getPopupContainer={getPopupMount}>
          <span className='evd-caption evd-nowrap'>{t('evidossierGraph.toolbar.graphHintShort')}</span>
        </Tooltip>
      </div>

      <div className='evd-graph-panel__main'>
        <div className='evd-graph-panel__canvas'>
          <GraphView
            layout={layout}
            focusVersionId={undefined}
            selectedNodeId={selectedNodeId}
            selectedEdgeId={selectedEdgeId}
            highlightedNodeIds={matchedNodeIds}
            emptyState={emptyState}
            onSelectNode={handleSelectNode}
            onSelectEdge={handleSelectEdge}
            onOpenNode={handleOpenNode}
            onTogglePackage={handleTogglePackage}
            onCreateBranch={handleCreateBranch}
            height='100%'
          />
        </div>
        {!compact ? (
          <aside className='evd-graph-panel__details' aria-label={t('evidossierGraph.details.title')}>
            <GraphDetailPanel
              snapshot={snapshot}
              node={selectedNode}
              edge={selectedEdge}
              onClose={clearSelection}
              onTogglePackage={handleTogglePackage}
              onOpenPackage={openPackage}
              onOpenVersion={openVersion}
              onCreateBranch={handleCreateBranch}
            />
          </aside>
        ) : null}
      </div>

      {compact ? (
        <Drawer
          visible={Boolean(selectedNode || selectedEdge)}
          width={360}
          footer={null}
          closable={false}
          title={null}
          className='evd-graph-drawer'
          getPopupContainer={getPopupMount}
          onCancel={clearSelection}
        >
          <GraphDetailPanel
            snapshot={snapshot}
            node={selectedNode}
            edge={selectedEdge}
            onClose={clearSelection}
            onTogglePackage={handleTogglePackage}
            onOpenPackage={openPackage}
            onOpenVersion={openVersion}
            onCreateBranch={handleCreateBranch}
          />
        </Drawer>
      ) : null}
    </div>
  );
};

export default ProjectGraphPanel;
