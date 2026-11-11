/**
 * Interactive artifact graph canvas (SVG + React, no graph library).
 *
 * Responsibilities:
 * - render graph groups, nodes, arrow-marked edges and relation labels;
 * - zoom (wheel, pointer-centered, 0.4–2.5), pan (pointer drag), fit and center;
 * - select nodes / edges and open them (double click, node list, context menu);
 * - expand / collapse package version groups;
 * - provide a keyboard-accessible node list next to the canvas.
 *
 * Business relations are read-only: dragging only pans the viewport.
 */
import { Button, Tooltip } from '@arco-design/web-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ALL_RELATION_TYPES,
  ALL_TASK_KINDS,
  GRAPH_GROUP_PADDING,
  GRAPH_GROUP_TITLE_HEIGHT,
  edgeRelationTypes,
} from '../../domain/graph';
import type { GraphEdge, GraphLayout, GraphNode, GraphPackageNode, GraphVersionNode } from '../../domain/types';
import { cx, EmptyState, formatDate, RowButton } from '../../design/primitives';
import { IconFit, IconList, IconZoomIn, IconZoomOut } from '../../design/icons';
import './graph.css';

export type GraphBranchAction = 'review' | 'compare' | 'revise';

export type GraphViewProps = {
  layout: GraphLayout;
  /** Extra emphasized version (e.g. the version the graph page was opened from). */
  focusVersionId?: string;
  selectedNodeId?: string;
  selectedEdgeId?: string;
  /** Nodes matched by a search box; other nodes are dimmed instead of removed. */
  highlightedNodeIds?: string[];
  /** Custom empty content; defaults to a generic relation empty state. */
  emptyState?: React.ReactNode;
  onSelectNode: (node: GraphNode | null) => void;
  onSelectEdge: (edge: GraphEdge | null) => void;
  onOpenNode?: (node: GraphNode) => void;
  onTogglePackage?: (packageId: string) => void;
  onCreateBranch?: (node: GraphNode, action: GraphBranchAction) => void;
  /** Fixed canvas height in px, or a CSS size ('100%' fills the parent flex box). */
  height?: number | string;
};

type ViewTransform = { x: number; y: number; k: number };

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  moved: boolean;
};

type ContextMenuState = { node: GraphNode; x: number; y: number };

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.5;
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** Keep Arco portals inside .evd-root so Carbon tokens and overrides apply. */
const getPopupMount = (): HTMLElement => (document.querySelector('.evd-root') as HTMLElement | null) ?? document.body;

const CJK_PATTERN = /[\u1100-\u11ff\u2e80-\u9fff\uac00-\ud7af\uf900-\ufaff\uff00-\uffef]/;
const WIDE_CJK_PATTERN = /[\u1100-\u11ff\u2e80-\u9fff\uac00-\ud7af\uf900-\ufaff\uff00-\uffef]/;

/** Character-budget truncation for SVG text (no CSS ellipsis inside SVG). */
const truncateText = (text: string, maxUnits: number): string => {
  let units = 0;
  let result = '';
  for (const char of text) {
    const width = WIDE_CJK_PATTERN.test(char) ? 2 : 1;
    if (units + width > maxUnits) return `${result}…`;
    units += width;
    result += char;
  }
  return result;
};

const estimateTextWidth = (text: string, fontSize: number): number => {
  let units = 0;
  for (const char of text) units += CJK_PATTERN.test(char) ? 1 : 0.55;
  return units * fontSize;
};

const nodeDisplayLabel = (node: GraphNode): string =>
  node.nodeType === 'package' ? `${node.packageCode} · ${node.title}` : node.versionLabel;

export const GraphView: React.FC<GraphViewProps> = ({
  layout,
  focusVersionId,
  selectedNodeId,
  selectedEdgeId,
  highlightedNodeIds,
  emptyState,
  onSelectNode,
  onSelectEdge,
  onOpenNode,
  onTogglePackage,
  onCreateBranch,
  height,
}) => {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [view, setView] = useState<ViewTransform>({ x: 0, y: 0, k: 1 });
  const [panning, setPanning] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [menu, setMenu] = useState<ContextMenuState | null>(null);

  const nodeAriaLabel = (node: GraphNode): string => {
    if (node.nodeType === 'package') {
      return t('evidossierGraph.node.packageAria', {
        code: node.packageCode,
        title: node.title,
        count: node.versionCount,
      });
    }
    return t('evidossierGraph.node.versionAria', { label: node.versionLabel, code: node.packageCode });
  };

  const highlightSet = useMemo(
    () => (highlightedNodeIds && highlightedNodeIds.length > 0 ? new Set(highlightedNodeIds) : null),
    [highlightedNodeIds]
  );
  const nodeById = useMemo(() => new Map(layout.nodes.map((node) => [node.id, node])), [layout.nodes]);
  const nodeCount = layout.nodes.length;

  /* ---------------------------------------------------------------------- */
  /* Canvas size                                                             */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return undefined;
    const update = (): void => {
      const next = { width: element.clientWidth, height: element.clientHeight };
      setSize((current) => (current.width === next.width && current.height === next.height ? current : next));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [nodeCount]);

  /* ---------------------------------------------------------------------- */
  /* Viewport                                                                */
  /* ---------------------------------------------------------------------- */
  const fitView = useCallback((): void => {
    const { width, height: canvasHeight } = size;
    if (width <= 0 || canvasHeight <= 0) return;
    if (layout.nodes.length === 0) {
      setView({ x: 0, y: 0, k: 1 });
      return;
    }
    const bounds = layout.bounds;
    const padding = 28;
    const scale = Math.min(
      Math.max(1, width - padding * 2) / Math.max(1, bounds.width),
      Math.max(1, canvasHeight - padding * 2) / Math.max(1, bounds.height)
    );
    const k = clamp(scale, MIN_ZOOM, 1.25);
    setView({
      k,
      x: (width - bounds.width * k) / 2 - bounds.minX * k,
      y: (canvasHeight - bounds.height * k) / 2 - bounds.minY * k,
    });
  }, [layout, size]);

  useEffect(() => {
    fitView();
  }, [fitView]);

  const zoomBy = useCallback(
    (factor: number): void => {
      setView((current) => {
        const centerX = size.width > 0 ? size.width / 2 : 0;
        const centerY = size.height > 0 ? size.height / 2 : 0;
        const nextK = clamp(current.k * factor, MIN_ZOOM, MAX_ZOOM);
        const worldX = (centerX - current.x) / current.k;
        const worldY = (centerY - current.y) / current.k;
        return { k: nextK, x: centerX - worldX * nextK, y: centerY - worldY * nextK };
      });
    },
    [size]
  );

  const zoomAt = useCallback((factor: number, screenX: number, screenY: number): void => {
    setView((current) => {
      const nextK = clamp(current.k * factor, MIN_ZOOM, MAX_ZOOM);
      const worldX = (screenX - current.x) / current.k;
      const worldY = (screenY - current.y) / current.k;
      return { k: nextK, x: screenX - worldX * nextK, y: screenY - worldY * nextK };
    });
  }, []);

  const centerView = useCallback((): void => {
    setView((current) => {
      if (size.width <= 0 || size.height <= 0) return current;
      const bounds = layout.bounds;
      return {
        ...current,
        x: (size.width - bounds.width * current.k) / 2 - bounds.minX * current.k,
        y: (size.height - bounds.height * current.k) / 2 - bounds.minY * current.k,
      };
    });
  }, [layout, size]);

  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return undefined;
    const handleWheel = (event: WheelEvent): void => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const factor = Math.exp(-event.deltaY * 0.0015);
      zoomAt(factor, event.clientX - rect.left, event.clientY - rect.top);
    };
    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, [zoomAt, nodeCount]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    const target = event.target as Element | null;
    // Overlays (toolbar, zoom, legend, context menu, nodes, edges) handle their
    // own pointer events; handling them here would clear the context menu or
    // start a pan before their click runs.
    if (target?.closest('[data-evd-graph-interactive]')) return;
    setMenu(null);
    if (event.button !== 0) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: view.x,
      originY: view.y,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setPanning(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 3) drag.moved = true;
    setView((current) => ({ ...current, x: drag.originX + deltaX, y: drag.originY + deltaY }));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>): void => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    setPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!drag.moved) {
      onSelectNode(null);
      onSelectEdge(null);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Selection & context menu                                                */
  /* ---------------------------------------------------------------------- */
  const selectNode = (node: GraphNode): void => {
    setMenu(null);
    onSelectEdge(null);
    onSelectNode(node);
  };

  const selectEdge = (edge: GraphEdge): void => {
    setMenu(null);
    onSelectNode(null);
    onSelectEdge(edge);
  };

  const handleNodeContextMenu = (event: React.MouseEvent<SVGGElement>, node: GraphNode): void => {
    event.preventDefault();
    event.stopPropagation();
    selectNode(node);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenu({
      node,
      x: clamp(event.clientX - rect.left, 8, Math.max(8, rect.width - 208)),
      y: clamp(event.clientY - rect.top, 8, Math.max(8, rect.height - 160)),
    });
  };

  useEffect(() => {
    if (!menu) return undefined;
    const focusFirst = window.setTimeout(() => {
      menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    }, 0);
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setMenu(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusFirst);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menu]);

  // A relayout (filter / expand / collapse) invalidates the menu anchor; a
  // selection change alone must not close a menu that was just opened by the
  // right-click handler itself.
  useEffect(() => {
    setMenu(null);
  }, [layout]);

  /* ---------------------------------------------------------------------- */
  /* Rendering helpers                                                       */
  /* ---------------------------------------------------------------------- */
  const isDimmed = (node: GraphNode): boolean => Boolean(highlightSet) && !highlightSet?.has(node.id);

  const renderPackageNode = (node: GraphPackageNode): React.ReactNode => {
    const selected = node.id === selectedNodeId;
    const dimmed = isDimmed(node);
    const draft = node.status !== 'delivered';
    const meta = node.currentVersionLabel
      ? t('evidossierGraph.node.versionMeta', { count: node.versionCount, version: node.currentVersionLabel })
      : t('evidossierGraph.node.versionMetaNoCurrent', { count: node.versionCount });
    return (
      <g
        key={node.id}
        data-evd-graph-interactive
        role='button'
        tabIndex={0}
        aria-label={nodeAriaLabel(node)}
        className={cx(
          'evd-graph-node',
          'evd-graph-node--package',
          `evd-graph-node--kind-${node.taskKind}`,
          selected && 'evd-graph-node--selected',
          dimmed && 'evd-graph-node--dimmed',
          draft && 'evd-graph-node--draft'
        )}
        transform={`translate(${node.x} ${node.y})`}
        onClick={(event) => {
          event.stopPropagation();
          selectNode(node);
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onOpenNode?.(node);
        }}
        onContextMenu={(event) => handleNodeContextMenu(event, node)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            selectNode(node);
          }
        }}
      >
        <title>{`${node.packageCode} · ${node.title}`}</title>
        <rect className='evd-graph-node__box' width={node.width} height={node.height} />
        <rect className='evd-graph-node__kind' width={3} height={node.height} />
        <text className='evd-graph-node__code' x={12} y={19}>
          {node.packageCode}
        </text>
        <text className='evd-graph-node__task' x={node.width - 10} y={19} textAnchor='end'>
          {t(`evidossierCommon.taskKind.${node.taskKind}Short`)}
        </text>
        <text className='evd-graph-node__title' x={12} y={37}>
          {truncateText(node.title, 24)}
        </text>
        <text className='evd-graph-node__meta' x={12} y={53}>
          {truncateText(meta, 30)}
        </text>
        {node.versionCount > 0 ? (
          <text className='evd-graph-node__expand' x={node.width - 10} y={53} textAnchor='end' aria-hidden>
            +
          </text>
        ) : null}
      </g>
    );
  };

  const renderVersionNode = (node: GraphVersionNode): React.ReactNode => {
    const selected = node.id === selectedNodeId;
    const dimmed = isDimmed(node);
    const focused = node.versionId === focusVersionId;
    return (
      <g
        key={node.id}
        data-evd-graph-interactive
        role='button'
        tabIndex={0}
        aria-label={nodeAriaLabel(node)}
        className={cx(
          'evd-graph-node',
          'evd-graph-node--version',
          `evd-graph-node--kind-${node.taskKind}`,
          node.isCurrent && 'evd-graph-node--current',
          focused && 'evd-graph-node--focus',
          selected && 'evd-graph-node--selected',
          dimmed && 'evd-graph-node--dimmed'
        )}
        transform={`translate(${node.x} ${node.y})`}
        onClick={(event) => {
          event.stopPropagation();
          selectNode(node);
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onOpenNode?.(node);
        }}
        onContextMenu={(event) => handleNodeContextMenu(event, node)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            selectNode(node);
          }
        }}
      >
        <title>{`${node.versionLabel} · ${node.title}`}</title>
        <rect className='evd-graph-node__box' width={node.width} height={node.height} />
        <rect className='evd-graph-node__kind' width={3} height={node.height} />
        <text className='evd-graph-node__version' x={12} y={18}>
          {node.versionLabel}
        </text>
        <text className='evd-graph-node__meta' x={12} y={33}>
          {formatDate(node.createdAt)}
        </text>
        {node.isCurrent ? (
          <rect className='evd-graph-node__current-mark' x={node.width - 8} y={8} width={3} height={node.height - 16} />
        ) : null}
      </g>
    );
  };

  const renderGroup = (group: GraphLayout['groups'][number]): React.ReactNode => {
    const packageVersions = layout.nodes.filter(
      (node): node is GraphVersionNode => node.nodeType === 'version' && node.packageId === group.packageId
    );
    const dimmed = Boolean(highlightSet) && !packageVersions.some((node) => highlightSet?.has(node.id));
    return (
      <g
        key={`group:${group.packageId}`}
        className={cx(
          'evd-graph-group',
          `evd-graph-group--kind-${group.taskKind}`,
          dimmed && 'evd-graph-group--dimmed'
        )}
        transform={`translate(${group.x} ${group.y})`}
      >
        <rect className='evd-graph-group__box' width={group.width} height={group.height} />
        <path className='evd-graph-group__divider' d={`M 0 ${GRAPH_GROUP_TITLE_HEIGHT} H ${group.width}`} />
        <g
          data-evd-graph-interactive
          role='button'
          tabIndex={0}
          className='evd-graph-group__head'
          aria-label={t('evidossierGraph.node.collapseVersionsAria', { code: group.packageCode })}
          onClick={(event) => {
            event.stopPropagation();
            onTogglePackage?.(group.packageId);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onTogglePackage?.(group.packageId);
            }
          }}
        >
          <rect className='evd-graph-group__hit' width={group.width} height={GRAPH_GROUP_TITLE_HEIGHT} />
          <rect className='evd-graph-group__kind' x={GRAPH_GROUP_PADDING} y={8} width={3} height={12} />
          <text className='evd-graph-group__title' x={GRAPH_GROUP_PADDING + 9} y={18}>
            {truncateText(`${group.packageCode} · ${group.title}`, 22)}
          </text>
          <text className='evd-graph-group__toggle' x={group.width - 10} y={18} textAnchor='end' aria-hidden>
            −
          </text>
        </g>
      </g>
    );
  };

  const renderEdge = (edge: GraphEdge): React.ReactNode => {
    const selected = edge.id === selectedEdgeId;
    const from = nodeById.get(edge.fromNodeId);
    const to = nodeById.get(edge.toNodeId);
    const dimmed = Boolean(highlightSet) && (!from || !to || !highlightSet?.has(from.id) || !highlightSet?.has(to.id));
    const labels = edgeRelationTypes(edge).map((type) => t(`evidossierCommon.relation.${type}`));
    const labelText = labels.join(' · ');
    const labelWidth = estimateTextWidth(labelText, 12) + 14;
    const relationSummary = labels.join(', ');
    const aria = t('evidossierGraph.edge.aria', {
      source: from ? nodeDisplayLabel(from) : edge.sourceVersionId,
      relation: relationSummary,
      target: to ? nodeDisplayLabel(to) : edge.targetVersionId,
    });
    // Edge labels are positioned by the geometry encoded into the path; recover
    // the midpoint from the path's control points is unnecessary here because
    // the layout already centered the curve. Use the path bounding midpoint via
    // a deterministic approximation: controls are symmetric around the center.
    const label = edgeLabelPoint(edge);
    return (
      <g
        key={edge.id}
        data-evd-graph-interactive
        role='button'
        tabIndex={0}
        aria-label={aria}
        className={cx(
          'evd-graph-edge',
          `evd-graph-edge--${edge.type}`,
          selected && 'evd-graph-edge--selected',
          dimmed && 'evd-graph-edge--dimmed'
        )}
        onClick={(event) => {
          event.stopPropagation();
          selectEdge(edge);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            selectEdge(edge);
          }
        }}
      >
        <path className='evd-graph-edge__line' d={edge.path} markerEnd={`url(#evd-graph-arrow-${edge.type})`} />
        <path className='evd-graph-edge__hit' d={edge.path} />
        <g className='evd-graph-edge__label' transform={`translate(${label.x} ${label.y})`}>
          <rect className='evd-graph-edge__label-bg' x={-labelWidth / 2} y={-9} width={labelWidth} height={18} />
          <text className='evd-graph-edge__label-text' x={0} y={0} textAnchor='middle' dominantBaseline='middle'>
            {labelText}
          </text>
        </g>
      </g>
    );
  };

  /* ---------------------------------------------------------------------- */
  /* Empty layout                                                            */
  /* ---------------------------------------------------------------------- */
  const emptyContent = emptyState ?? (
    <EmptyState center title={t('evidossierGraph.empty.title')} text={t('evidossierGraph.empty.text')} />
  );

  if (nodeCount === 0) {
    return (
      <div className='evd-graph-view evd-graph-view--empty' style={{ height }}>
        <div className='evd-graph-empty'>{emptyContent}</div>
      </div>
    );
  }

  const branchMenuItems: Array<{ action: GraphBranchAction; label: string }> =
    menu?.node.nodeType === 'version'
      ? [
          ...(menu.node.taskKind === 'generate'
            ? [{ action: 'revise' as const, label: t('evidossierGraph.create.revise') }]
            : []),
          { action: 'review' as const, label: t('evidossierGraph.create.review') },
          { action: 'compare' as const, label: t('evidossierGraph.create.compare') },
        ]
      : [];

  return (
    <div className='evd-graph-view' style={{ height }}>
      <div className='evd-graph-view__canvas-wrap'>
        <div
          ref={canvasRef}
          className={cx('evd-graph__canvas', 'evd-graph-canvas', panning && 'evd-graph__canvas--panning')}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          aria-label={t('evidossierGraph.canvas.aria')}
          role='group'
        >
          <div className='evd-graph__toolbar' data-evd-graph-interactive>
            <div className='evd-graph-toolbar__zoom'>
              <Tooltip content={t('evidossierGraph.canvas.zoomIn')} getPopupContainer={getPopupMount}>
                <Button
                  size='small'
                  type='text'
                  className='evd-graph-toolbar__button'
                  icon={<IconZoomIn size={14} />}
                  aria-label={t('evidossierGraph.canvas.zoomIn')}
                  onClick={() => zoomBy(1.2)}
                />
              </Tooltip>
              <Tooltip content={t('evidossierGraph.canvas.zoomOut')} getPopupContainer={getPopupMount}>
                <Button
                  size='small'
                  type='text'
                  className='evd-graph-toolbar__button'
                  icon={<IconZoomOut size={14} />}
                  aria-label={t('evidossierGraph.canvas.zoomOut')}
                  onClick={() => zoomBy(1 / 1.2)}
                />
              </Tooltip>
              <Tooltip content={t('evidossierGraph.canvas.fit')} getPopupContainer={getPopupMount}>
                <Button
                  size='small'
                  type='text'
                  className='evd-graph-toolbar__button'
                  icon={<IconFit size={14} />}
                  aria-label={t('evidossierGraph.canvas.fit')}
                  onClick={fitView}
                />
              </Tooltip>
              <Tooltip content={t('evidossierGraph.canvas.center')} getPopupContainer={getPopupMount}>
                <Button
                  size='small'
                  type='text'
                  className='evd-graph-toolbar__button'
                  aria-label={t('evidossierGraph.canvas.center')}
                  onClick={centerView}
                >
                  {t('evidossierGraph.canvas.centerShort')}
                </Button>
              </Tooltip>
            </div>
            <span className='evd-graph-toolbar__spacer' />
            <Button
              size='small'
              className='evd-graph-toolbar__button'
              icon={<IconList size={14} />}
              onClick={() => setListOpen((current) => !current)}
            >
              {listOpen ? t('evidossierGraph.canvas.hideNodeList') : t('evidossierGraph.canvas.showNodeList')}
            </Button>
          </div>

          <svg className='evd-graph__svg'>
            <defs>
              {ALL_RELATION_TYPES.map((type) => (
                <marker
                  key={type}
                  id={`evd-graph-arrow-${type}`}
                  viewBox='0 0 10 10'
                  refX={9}
                  refY={5}
                  markerWidth={8}
                  markerHeight={8}
                  orient='auto-start-reverse'
                >
                  <path className={cx('evd-graph-arrow', `evd-graph-arrow--${type}`)} d='M 0 0 L 10 5 L 0 10 z' />
                </marker>
              ))}
            </defs>
            <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
              {layout.groups.map((group) => renderGroup(group))}
              {layout.edges.map((edge) => renderEdge(edge))}
              {layout.nodes.map((node) =>
                node.nodeType === 'package' ? renderPackageNode(node) : renderVersionNode(node)
              )}
            </g>
          </svg>

          <div className='evd-graph__zoom' data-evd-graph-interactive>
            <Button
              size='mini'
              type='text'
              icon={<IconZoomIn size={14} />}
              aria-label={t('evidossierGraph.canvas.zoomIn')}
              onClick={() => zoomBy(1.2)}
            />
            <Button
              size='mini'
              type='text'
              icon={<IconZoomOut size={14} />}
              aria-label={t('evidossierGraph.canvas.zoomOut')}
              onClick={() => zoomBy(1 / 1.2)}
            />
            <Button
              size='mini'
              type='text'
              icon={<IconFit size={14} />}
              aria-label={t('evidossierGraph.canvas.fit')}
              onClick={fitView}
            />
          </div>

          <div className='evd-graph__legend' data-evd-graph-interactive>
            <span className='evd-graph-legend__title'>{t('evidossierGraph.canvas.relationLegend')}</span>
            {ALL_RELATION_TYPES.map((type) => (
              <span className='evd-graph__legend-item' key={type}>
                <span className={cx('evd-graph__legend-swatch', `evd-graph-legend__line--${type}`)} aria-hidden />
                {t(`evidossierCommon.relation.${type}`)}
              </span>
            ))}
            <span className='evd-graph-legend__title'>{t('evidossierGraph.canvas.taskLegend')}</span>
            {ALL_TASK_KINDS.map((kind) => (
              <span className='evd-graph__legend-item' key={kind}>
                <span className={cx('evd-graph-legend__kind', `evd-graph-kind--${kind}`)} aria-hidden />
                {t(`evidossierCommon.taskKind.${kind}Short`)}
              </span>
            ))}
          </div>

          <div className='evd-graph-pan-hint' aria-hidden data-evd-graph-interactive>
            {t('evidossierGraph.canvas.panHint')}
          </div>

          {menu ? (
            <div
              ref={menuRef}
              className='evd-graph-context'
              data-evd-graph-interactive
              role='menu'
              aria-label={t('evidossierGraph.canvas.contextMenu')}
              style={{ left: menu.x, top: menu.y }}
            >
              <Button
                type='text'
                className='evd-graph-context__item'
                onClick={() => {
                  const node = menu.node;
                  setMenu(null);
                  onOpenNode?.(node);
                }}
              >
                {t('evidossierGraph.node.open')}
              </Button>
              {menu.node.nodeType === 'package' && onTogglePackage ? (
                <Button
                  type='text'
                  className='evd-graph-context__item'
                  onClick={() => {
                    const packageId = menu.node.packageId;
                    setMenu(null);
                    onTogglePackage(packageId);
                  }}
                >
                  {t('evidossierGraph.node.expandVersions')}
                </Button>
              ) : null}
              {onCreateBranch
                ? branchMenuItems.map((item) => (
                    <Button
                      key={item.action}
                      type='text'
                      className='evd-graph-context__item'
                      onClick={() => {
                        const node = menu.node;
                        setMenu(null);
                        onCreateBranch(node, item.action);
                      }}
                    >
                      {item.label}
                    </Button>
                  ))
                : null}
            </div>
          ) : null}
        </div>
      </div>

      {listOpen ? (
        <div className='evd-graph-nodelist'>
          <div className='evd-graph-nodelist__head'>
            <span className='evd-h4'>{t('evidossierGraph.canvas.nodeList')}</span>
            <span className='evd-caption'>{t('evidossierGraph.canvas.nodeListHint')}</span>
          </div>
          <ul className='evd-graph-nodelist__items' aria-label={t('evidossierGraph.canvas.nodeList')}>
            {layout.nodes.map((node) => (
              <li key={node.id} className='evd-graph-nodelist__row'>
                <RowButton
                  className='evd-graph-nodelist__select'
                  active={node.id === selectedNodeId}
                  ariaLabel={nodeAriaLabel(node)}
                  onClick={() => {
                    if (selectedNodeId === node.id) {
                      onOpenNode?.(node);
                      return;
                    }
                    selectNode(node);
                  }}
                >
                  <span className={cx('evd-graph-legend__kind', `evd-graph-kind--${node.taskKind}`)} aria-hidden />
                  <span className='evd-graph-nodelist__label'>{nodeDisplayLabel(node)}</span>
                  {node.nodeType === 'version' && node.isCurrent ? (
                    <span className='evd-tag evd-tag--blue'>{t('evidossierCommon.common.current')}</span>
                  ) : null}
                </RowButton>
                <span className='evd-caption evd-nowrap'>
                  {node.nodeType === 'package'
                    ? t('evidossierGraph.node.versionMetaNoCurrent', { count: node.versionCount })
                    : t('evidossierGraph.node.versionNode')}
                </span>
                <Button
                  size='mini'
                  type='text'
                  onClick={() => onOpenNode?.(node)}
                  aria-label={t('evidossierGraph.node.openAria', { label: nodeDisplayLabel(node) })}
                >
                  {t('evidossierGraph.node.open')}
                </Button>
                {node.nodeType === 'package' && onTogglePackage ? (
                  <Button size='mini' type='text' onClick={() => onTogglePackage(node.packageId)}>
                    {t('evidossierGraph.node.expandVersions')}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

/**
 * Midpoint of an edge path. The layout builder always emits a cubic Bezier with
 * symmetric control points, so taking the average of the first/last points plus
 * the controls encoded in the path is stable and cheap.
 */
const edgeLabelPoint = (edge: GraphEdge): { x: number; y: number } => {
  const numbers = edge.path.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (numbers.length >= 8) {
    const [startX, startY, control1X, control1Y, control2X, control2Y, endX, endY] = numbers;
    return {
      x: (startX + 3 * control1X + 3 * control2X + endX) / 8,
      y: (startY + 3 * control1Y + 3 * control2Y + endY) / 8,
    };
  }
  return { x: 0, y: 0 };
};

export default GraphView;
