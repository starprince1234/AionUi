/**
 * Artifact graph construction and deterministic layered layout.
 *
 * The graph is a read-only business view: every node comes from the snapshot
 * and every edge comes from `snapshot.relations`, which are only created by
 * explicit business actions (review, comparison, revision, derivation). Layout
 * is computed here so the interactive canvas (`pages/graph/GraphView`) only has
 * to render geometry and handle interaction; dragging never changes business
 * relations.
 *
 * Direction is always source version -> target version. In the project scope
 * packages are aggregated into one node per package by default; expanding a
 * package replaces its package node with one version node per formal version
 * inside a group box.
 */
import type {
  ArtifactPackage,
  EntityId,
  EvidossierSnapshot,
  GraphEdge,
  GraphGroup,
  GraphLayout,
  GraphNode,
  GraphPackageNode,
  GraphScope,
  GraphVersionNode,
  PackageRelation,
  PackageVersion,
  RelationType,
  TaskKind,
  VersionRef,
} from './types';

/* -------------------------------------------------------------------------- */
/* Public contract                                                             */
/* -------------------------------------------------------------------------- */

export type GraphBuildOptions = {
  scope: GraphScope;
  /** Relation types to draw. Defaults to all five semantic relation types. */
  relationTypes?: RelationType[];
  /** Task kinds to focus on. Defaults to all three business loops. */
  taskKinds?: TaskKind[];
  /** Project scope: packages whose version nodes are shown instead of one package node. */
  expandedPackageIds?: string[];
  /** Package scope: also include the indirect upstream neighbourhood (one hop). */
  includeUpstream?: boolean;
  /** Package scope: also include the indirect downstream neighbourhood (one hop). */
  includeDownstream?: boolean;
};

export const ALL_RELATION_TYPES: readonly RelationType[] = [
  'reviewed',
  'compared',
  'revised_from',
  'based_on',
  'derived_from',
];

export const ALL_TASK_KINDS: readonly TaskKind[] = ['generate', 'review', 'compare'];

/** Node and layout geometry (also used by the canvas renderer for hit boxes). */
export const GRAPH_PACKAGE_SIZE = { width: 200, height: 64 } as const;
export const GRAPH_VERSION_SIZE = { width: 176, height: 44 } as const;
export const GRAPH_GROUP_WIDTH = GRAPH_PACKAGE_SIZE.width;
export const GRAPH_GROUP_PADDING = 12;
export const GRAPH_GROUP_TITLE_HEIGHT = 28;
export const GRAPH_GROUP_NODE_GAP = 16;
/** Vertical gap between stacked nodes of the same layer. Must stay >= 32. */
export const GRAPH_NODE_GAP = 32;
/** Horizontal gap between layers. Must stay >= 120. */
export const GRAPH_LAYER_GAP = 140;
/** Extra canvas margin included in `GraphLayout.bounds`. */
export const GRAPH_BOUNDS_PADDING = 40;
/** Separator used in `GraphEdge.label` when several relation types are merged. */
export const GRAPH_EDGE_LABEL_SEPARATOR = '|';

/* -------------------------------------------------------------------------- */
/* Small deterministic helpers                                                 */
/* -------------------------------------------------------------------------- */

export const emptyGraphLayout = (): GraphLayout => ({
  nodes: [],
  edges: [],
  groups: [],
  bounds: { minX: 0, minY: 0, width: 0, height: 0 },
});

export const packageNodeId = (packageId: EntityId): EntityId => `pkg:${packageId}`;

export const versionNodeId = (versionId: EntityId): EntityId => `ver:${versionId}`;

export const packageIdFromNodeId = (nodeId: EntityId): EntityId | undefined =>
  nodeId.startsWith('pkg:') ? nodeId.slice('pkg:'.length) : undefined;

export const versionIdFromNodeId = (nodeId: EntityId): EntityId | undefined =>
  nodeId.startsWith('ver:') ? nodeId.slice('ver:'.length) : undefined;

const RELATION_STRENGTH = new Map<RelationType, number>(ALL_RELATION_TYPES.map((type, index) => [type, index]));

const relationStrength = (type: RelationType): number => RELATION_STRENGTH.get(type) ?? ALL_RELATION_TYPES.length;

/** Relation types merged into one edge label (strongest first). */
export const edgeRelationTypes = (edge: GraphEdge): RelationType[] => {
  const known = new Set<string>(ALL_RELATION_TYPES);
  return edge.label.split(GRAPH_EDGE_LABEL_SEPARATOR).filter((key) => known.has(key)) as RelationType[];
};

/**
 * Exact relations behind one edge. Project-level edges aggregate every relation
 * between the same two package nodes, so the UI needs this to show every
 * recorded endpoint and scope note instead of only the primary relation.
 */
export const getRelationsForEdge = (snapshot: EvidossierSnapshot, edge: GraphEdge): PackageRelation[] => {
  const primary = snapshot.relations.find((relation) => relation.id === edge.relationId);
  if (!primary) return [];
  const types = new Set<RelationType>(edgeRelationTypes(edge));
  const fromVersionId = versionIdFromNodeId(edge.fromNodeId);
  const toVersionId = versionIdFromNodeId(edge.toNodeId);
  return snapshot.relations.filter(
    (relation) =>
      relation.source.packageId === primary.source.packageId &&
      relation.target.packageId === primary.target.packageId &&
      types.has(relation.type) &&
      (fromVersionId === undefined || relation.source.versionId === fromVersionId) &&
      (toVersionId === undefined || relation.target.versionId === toVersionId)
  );
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/* -------------------------------------------------------------------------- */
/* Layout primitives                                                           */
/* -------------------------------------------------------------------------- */

type LayoutUnit = {
  id: EntityId;
  width: number;
  height: number;
};

type UnitEdge = { from: EntityId; to: EntityId };

/**
 * Longest-path depth where relation sources sit to the left of targets. Cycles
 * are ignored with a visiting guard so a malformed relation set can never loop
 * the layout.
 */
const computeDepths = (ids: EntityId[], edges: UnitEdge[]): Map<EntityId, number> => {
  const incoming = new Map<EntityId, EntityId[]>();
  for (const id of ids) incoming.set(id, []);
  for (const edge of edges) {
    if (edge.from === edge.to) continue;
    const list = incoming.get(edge.to);
    if (list && incoming.has(edge.from)) list.push(edge.from);
  }
  const memo = new Map<EntityId, number>();
  const visiting = new Set<EntityId>();
  const maxDepth = Math.max(1, ids.length);
  const visit = (id: EntityId): number => {
    const cached = memo.get(id);
    if (cached !== undefined) return cached;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    let depth = 0;
    for (const from of incoming.get(id) ?? []) {
      depth = Math.max(depth, visit(from) + 1);
      if (depth >= maxDepth) {
        depth = maxDepth;
        break;
      }
    }
    visiting.delete(id);
    memo.set(id, depth);
    return depth;
  };
  for (const id of ids) visit(id);
  return memo;
};

/**
 * Deterministic ordering inside each layer. A single barycenter pass keeps
 * long chains readable without making the result dependent on previous renders:
 * identical input always produces identical coordinates.
 */
const orderLayers = (layers: LayoutUnit[][], edges: UnitEdge[]): void => {
  const normalized = new Map<EntityId, number>();
  const incoming = new Map<EntityId, EntityId[]>();
  for (const edge of edges) {
    if (edge.from === edge.to) continue;
    const list = incoming.get(edge.to);
    if (list) list.push(edge.from);
    else incoming.set(edge.to, [edge.from]);
  }
  layers.forEach((layer, layerIndex) => {
    if (layerIndex > 0 && layer.length > 1) {
      const scored = layer.map((unit, index) => {
        const predecessors = (incoming.get(unit.id) ?? [])
          .map((id) => normalized.get(id))
          .filter((value): value is number => value !== undefined);
        const score =
          predecessors.length > 0 ? predecessors.reduce((sum, value) => sum + value, 0) / predecessors.length : 0.5;
        return { unit, score, index };
      });
      scored.sort((a, b) => a.score - b.score || a.index - b.index);
      scored.forEach((item, index) => {
        layer[index] = item.unit;
      });
    }
    const denominator = Math.max(1, layer.length - 1);
    layer.forEach((unit, index) => normalized.set(unit.id, index / denominator));
  });
};

/**
 * Place units on a left-to-right layered grid. Nodes inside one layer are
 * stacked vertically with `GRAPH_NODE_GAP`; layers are separated horizontally by
 * `GRAPH_LAYER_GAP` and vertically centered against the tallest layer.
 */
const layoutUnits = (units: LayoutUnit[], edges: UnitEdge[]): Map<EntityId, { x: number; y: number }> => {
  const positions = new Map<EntityId, { x: number; y: number }>();
  if (units.length === 0) return positions;

  const depths = computeDepths(
    units.map((unit) => unit.id),
    edges
  );
  const layerMap = new Map<number, LayoutUnit[]>();
  for (const unit of units) {
    const depth = depths.get(unit.id) ?? 0;
    const layer = layerMap.get(depth);
    if (layer) layer.push(unit);
    else layerMap.set(depth, [unit]);
  }
  const layers = [...layerMap.keys()]
    .sort((a, b) => a - b)
    .map((depth) => layerMap.get(depth) ?? [])
    .filter((layer) => layer.length > 0);
  orderLayers(layers, edges);

  const layerWidths = layers.map((layer) => Math.max(...layer.map((unit) => unit.width)));
  const layerHeights = layers.map((layer) =>
    layer.reduce((total, unit, index) => total + unit.height + (index > 0 ? GRAPH_NODE_GAP : 0), 0)
  );
  const tallest = Math.max(...layerHeights);

  let xCursor = 0;
  layers.forEach((layer, layerIndex) => {
    const width = layerWidths[layerIndex];
    let yCursor = (tallest - layerHeights[layerIndex]) / 2;
    for (const unit of layer) {
      positions.set(unit.id, { x: xCursor + (width - unit.width) / 2, y: yCursor });
      yCursor += unit.height + GRAPH_NODE_GAP;
    }
    xCursor += width + GRAPH_LAYER_GAP;
  });
  return positions;
};

/* -------------------------------------------------------------------------- */
/* Edge geometry                                                               */
/* -------------------------------------------------------------------------- */

const bezierPoint = (
  startX: number,
  startY: number,
  control1X: number,
  control1Y: number,
  control2X: number,
  control2Y: number,
  endX: number,
  endY: number,
  t: number
): { x: number; y: number } => {
  const inverse = 1 - t;
  const x =
    inverse * inverse * inverse * startX +
    3 * inverse * inverse * t * control1X +
    3 * inverse * t * t * control2X +
    t * t * t * endX;
  const y =
    inverse * inverse * inverse * startY +
    3 * inverse * inverse * t * control1Y +
    3 * inverse * t * t * control2Y +
    t * t * t * endY;
  return { x, y };
};

export type GraphEdgeGeometry = {
  path: string;
  labelX: number;
  labelY: number;
};

/**
 * One cubic Bezier from the right edge of the source to the left edge of the
 * target. Back edges (target left of source, only possible with cycles) loop
 * below the node row so they do not overlap the forward chain.
 */
export const buildEdgeGeometry = (from: GraphNode, to: GraphNode): GraphEdgeGeometry => {
  const startX = from.x + from.width;
  const startY = from.y + from.height / 2;
  const endX = to.x;
  const endY = to.y + to.height / 2;
  const dx = endX - startX;
  if (dx >= 0) {
    const bend = clamp(dx * 0.45, 40, 160);
    const control1X = startX + bend;
    const control2X = endX - bend;
    const label = bezierPoint(startX, startY, control1X, startY, control2X, endY, endX, endY, 0.5);
    return {
      path: `M ${startX} ${startY} C ${control1X} ${startY}, ${control2X} ${endY}, ${endX} ${endY}`,
      labelX: label.x,
      labelY: label.y,
    };
  }
  const bulge = clamp(Math.abs(dx) * 0.6, 70, 180);
  const offset = 64;
  const control1X = startX + bulge;
  const control1Y = startY + offset;
  const control2X = endX - bulge;
  const control2Y = endY + offset;
  const label = bezierPoint(startX, startY, control1X, control1Y, control2X, control2Y, endX, endY, 0.5);
  return {
    path: `M ${startX} ${startY} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${endX} ${endY}`,
    labelX: label.x,
    labelY: label.y + 18,
  };
};

/* -------------------------------------------------------------------------- */
/* Bounds                                                                      */
/* -------------------------------------------------------------------------- */

type Rect = { x: number; y: number; width: number; height: number };

const computeBounds = (rects: Rect[]): GraphLayout['bounds'] => {
  if (rects.length === 0) return { minX: 0, minY: 0, width: 0, height: 0 };
  const minX = Math.min(...rects.map((rect) => rect.x)) - GRAPH_BOUNDS_PADDING;
  const minY = Math.min(...rects.map((rect) => rect.y)) - GRAPH_BOUNDS_PADDING;
  const maxX = Math.max(...rects.map((rect) => rect.x + rect.width)) + GRAPH_BOUNDS_PADDING;
  const maxY = Math.max(...rects.map((rect) => rect.y + rect.height)) + GRAPH_BOUNDS_PADDING;
  return { minX, minY, width: maxX - minX, height: maxY - minY };
};

/* -------------------------------------------------------------------------- */
/* Shared edge assembly                                                        */
/* -------------------------------------------------------------------------- */

type RelationBucket = { fromNodeId: EntityId; toNodeId: EntityId; relations: PackageRelation[] };

const bucketRelations = (
  relations: PackageRelation[],
  resolveEndpoint: (ref: VersionRef) => EntityId | undefined
): RelationBucket[] => {
  const buckets = new Map<string, RelationBucket>();
  for (const relation of relations) {
    const fromNodeId = resolveEndpoint(relation.source);
    const toNodeId = resolveEndpoint(relation.target);
    if (!fromNodeId || !toNodeId || fromNodeId === toNodeId) continue;
    const key = `${fromNodeId}->${toNodeId}`;
    const existing = buckets.get(key);
    if (existing) existing.relations.push(relation);
    else buckets.set(key, { fromNodeId, toNodeId, relations: [relation] });
  }
  return [...buckets.values()];
};

const createEdges = (buckets: RelationBucket[], nodes: GraphNode[]): GraphEdge[] => {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edges: GraphEdge[] = [];
  for (const bucket of buckets) {
    const from = nodeById.get(bucket.fromNodeId);
    const to = nodeById.get(bucket.toNodeId);
    if (!from || !to) continue;
    const primary = bucket.relations[0];
    const types = [...new Set(bucket.relations.map((relation) => relation.type))].sort(
      (a, b) => relationStrength(a) - relationStrength(b)
    );
    const geometry = buildEdgeGeometry(from, to);
    edges.push({
      id: `edge:${bucket.fromNodeId}->${bucket.toNodeId}`,
      relationId: primary.id,
      type: types[0],
      fromNodeId: bucket.fromNodeId,
      toNodeId: bucket.toNodeId,
      path: geometry.path,
      label: types.join(GRAPH_EDGE_LABEL_SEPARATOR),
      sourceVersionId: primary.source.versionId,
      targetVersionId: primary.target.versionId,
    });
  }
  return edges;
};

/* -------------------------------------------------------------------------- */
/* Project scope                                                               */
/* -------------------------------------------------------------------------- */

const sortPackagesForGraph = (a: { code: string; id: string }, b: { code: string; id: string }): number =>
  a.code.localeCompare(b.code) || a.id.localeCompare(b.id);

const buildProjectGraph = (
  snapshot: EvidossierSnapshot,
  projectId: EntityId,
  relationTypes: Set<RelationType>,
  taskKinds: Set<TaskKind>,
  expandedPackageIds: Set<EntityId>
): GraphLayout => {
  const packageById = new Map(snapshot.packages.map((pkg) => [pkg.id, pkg]));
  const projectRelations = snapshot.relations.filter((relation) => {
    if (!relationTypes.has(relation.type)) return false;
    if (!taskKinds.has(relation.source.taskKind) && !taskKinds.has(relation.target.taskKind)) return false;
    const sourcePackage = packageById.get(relation.source.packageId);
    const targetPackage = packageById.get(relation.target.packageId);
    if (!sourcePackage || !targetPackage) return false;
    return sourcePackage.projectId === projectId || targetPackage.projectId === projectId;
  });
  if (projectRelations.length === 0) return emptyGraphLayout();

  const includedPackageIds = new Set<EntityId>();
  for (const relation of projectRelations) {
    includedPackageIds.add(relation.source.packageId);
    includedPackageIds.add(relation.target.packageId);
  }

  const versionsByPackage = new Map<EntityId, PackageVersion[]>();
  for (const version of snapshot.versions) {
    if (!includedPackageIds.has(version.packageId)) continue;
    const list = versionsByPackage.get(version.packageId);
    if (list) list.push(version);
    else versionsByPackage.set(version.packageId, [version]);
  }
  for (const versions of versionsByPackage.values()) versions.sort((a, b) => a.versionNumber - b.versionNumber);

  const packages = [...includedPackageIds]
    .map((id) => packageById.get(id))
    .filter((pkg): pkg is ArtifactPackage => Boolean(pkg))
    .sort(sortPackagesForGraph);

  const units: LayoutUnit[] = packages.map((pkg) => {
    const versions = versionsByPackage.get(pkg.id) ?? [];
    const expanded = expandedPackageIds.has(pkg.id) && versions.length > 0;
    if (!expanded) return { id: pkg.id, width: GRAPH_PACKAGE_SIZE.width, height: GRAPH_PACKAGE_SIZE.height };
    const height =
      GRAPH_GROUP_TITLE_HEIGHT +
      GRAPH_GROUP_PADDING * 2 +
      versions.length * GRAPH_VERSION_SIZE.height +
      Math.max(0, versions.length - 1) * GRAPH_GROUP_NODE_GAP;
    return { id: pkg.id, width: GRAPH_GROUP_WIDTH, height };
  });

  const unitEdges: UnitEdge[] = projectRelations
    .map((relation) => ({ from: relation.source.packageId, to: relation.target.packageId }))
    .filter((edge) => edge.from !== edge.to);
  const positions = layoutUnits(units, unitEdges);

  const nodes: GraphNode[] = [];
  const groups: GraphGroup[] = [];
  for (const pkg of packages) {
    const position = positions.get(pkg.id);
    if (!position) continue;
    const versions = versionsByPackage.get(pkg.id) ?? [];
    const expanded = expandedPackageIds.has(pkg.id) && versions.length > 0;
    if (expanded) {
      const groupHeight =
        GRAPH_GROUP_TITLE_HEIGHT +
        GRAPH_GROUP_PADDING * 2 +
        versions.length * GRAPH_VERSION_SIZE.height +
        Math.max(0, versions.length - 1) * GRAPH_GROUP_NODE_GAP;
      groups.push({
        packageId: pkg.id,
        x: position.x,
        y: position.y,
        width: GRAPH_GROUP_WIDTH,
        height: groupHeight,
        packageCode: pkg.code,
        title: pkg.title,
        taskKind: pkg.task.kind,
        expanded: true,
      });
      const currentVersionId = versions[versions.length - 1]?.id;
      versions.forEach((version, index) => {
        const node: GraphVersionNode = {
          id: versionNodeId(version.id),
          nodeType: 'version',
          x: position.x + GRAPH_GROUP_PADDING,
          y:
            position.y +
            GRAPH_GROUP_TITLE_HEIGHT +
            GRAPH_GROUP_PADDING +
            index * (GRAPH_VERSION_SIZE.height + GRAPH_GROUP_NODE_GAP),
          width: GRAPH_VERSION_SIZE.width,
          height: GRAPH_VERSION_SIZE.height,
          packageId: pkg.id,
          versionId: version.id,
          packageCode: pkg.code,
          versionLabel: version.label,
          versionNumber: version.versionNumber,
          title: pkg.title,
          taskKind: pkg.task.kind,
          isCurrent: version.id === currentVersionId,
          createdAt: version.createdAt,
        };
        nodes.push(node);
      });
    } else {
      const currentVersion = versions[versions.length - 1];
      const node: GraphPackageNode = {
        id: packageNodeId(pkg.id),
        nodeType: 'package',
        x: position.x,
        y: position.y,
        width: GRAPH_PACKAGE_SIZE.width,
        height: GRAPH_PACKAGE_SIZE.height,
        packageId: pkg.id,
        packageCode: pkg.code,
        title: pkg.title,
        taskKind: pkg.task.kind,
        status: pkg.status,
        versionCount: versions.length,
        currentVersionLabel: currentVersion?.label,
        projectId: pkg.projectId,
      };
      nodes.push(node);
    }
  }

  const versionNodeIds = new Set(nodes.filter((node) => node.nodeType === 'version').map((node) => node.id));
  const packageNodeIds = new Set(nodes.filter((node) => node.nodeType === 'package').map((node) => node.id));
  const resolveEndpoint = (ref: VersionRef): EntityId | undefined => {
    const asVersion = versionNodeId(ref.versionId);
    if (versionNodeIds.has(asVersion)) return asVersion;
    const asPackage = packageNodeId(ref.packageId);
    if (packageNodeIds.has(asPackage)) return asPackage;
    return undefined;
  };

  const edges = createEdges(bucketRelations(projectRelations, resolveEndpoint), nodes);
  return { nodes, groups, edges, bounds: computeBounds([...nodes, ...groups]) };
};

/* -------------------------------------------------------------------------- */
/* Package scope                                                               */
/* -------------------------------------------------------------------------- */

const buildPackageGraph = (
  snapshot: EvidossierSnapshot,
  packageId: EntityId,
  focusVersionId: EntityId | undefined,
  relationTypes: Set<RelationType>,
  taskKinds: Set<TaskKind>,
  includeUpstream: boolean,
  includeDownstream: boolean
): GraphLayout => {
  const pkg = snapshot.packages.find((candidate) => candidate.id === packageId);
  if (!pkg) return emptyGraphLayout();

  const packageById = new Map(snapshot.packages.map((candidate) => [candidate.id, candidate]));
  const versionById = new Map(snapshot.versions.map((version) => [version.id, version]));
  const ownVersions = snapshot.versions
    .filter((version) => version.packageId === pkg.id)
    .sort((a, b) => a.versionNumber - b.versionNumber);
  const latestOwnVersionId = ownVersions[ownVersions.length - 1]?.id;

  const relationPasses = (relation: PackageRelation): boolean =>
    relationTypes.has(relation.type) &&
    (taskKinds.has(relation.source.taskKind) || taskKinds.has(relation.target.taskKind)) &&
    versionById.has(relation.source.versionId) &&
    versionById.has(relation.target.versionId);

  const directRelations = snapshot.relations.filter(
    (relation) =>
      (relation.source.packageId === pkg.id || relation.target.packageId === pkg.id) && relationPasses(relation)
  );

  const includedVersionIds = new Set<EntityId>(ownVersions.map((version) => version.id));
  const includeRef = (ref: VersionRef): void => {
    if (versionById.has(ref.versionId)) includedVersionIds.add(ref.versionId);
  };
  for (const relation of directRelations) {
    includeRef(relation.source);
    includeRef(relation.target);
  }

  const relations: PackageRelation[] = [...directRelations];
  if (includeUpstream) {
    const upstreamVersionIds = new Set(
      directRelations
        .filter((relation) => relation.target.packageId === pkg.id)
        .map((relation) => relation.source.versionId)
    );
    for (const relation of snapshot.relations) {
      if (!relationPasses(relation)) continue;
      if (relations.some((existing) => existing.id === relation.id)) continue;
      if (!upstreamVersionIds.has(relation.target.versionId)) continue;
      relations.push(relation);
      includeRef(relation.source);
      includeRef(relation.target);
    }
  }
  if (includeDownstream) {
    const downstreamVersionIds = new Set(
      directRelations
        .filter((relation) => relation.source.packageId === pkg.id)
        .map((relation) => relation.target.versionId)
    );
    for (const relation of snapshot.relations) {
      if (!relationPasses(relation)) continue;
      if (relations.some((existing) => existing.id === relation.id)) continue;
      if (!downstreamVersionIds.has(relation.source.versionId)) continue;
      relations.push(relation);
      includeRef(relation.source);
      includeRef(relation.target);
    }
  }

  if (includedVersionIds.size === 0) return emptyGraphLayout();

  const includedVersions = [...includedVersionIds]
    .map((id) => versionById.get(id))
    .filter((version): version is PackageVersion => Boolean(version))
    .sort((a, b) => {
      const packageA = packageById.get(a.packageId);
      const packageB = packageById.get(b.packageId);
      return (
        (packageA?.code ?? '').localeCompare(packageB?.code ?? '') ||
        a.versionNumber - b.versionNumber ||
        a.id.localeCompare(b.id)
      );
    });

  const units: LayoutUnit[] = includedVersions.map((version) => ({
    id: version.id,
    width: GRAPH_VERSION_SIZE.width,
    height: GRAPH_VERSION_SIZE.height,
  }));
  const unitEdges: UnitEdge[] = relations
    .map((relation) => ({ from: relation.source.versionId, to: relation.target.versionId }))
    .filter((edge) => edge.from !== edge.to);
  const positions = layoutUnits(units, unitEdges);

  const currentVersionId = focusVersionId && versionById.has(focusVersionId) ? focusVersionId : latestOwnVersionId;
  const nodes: GraphNode[] = [];
  for (const version of includedVersions) {
    const position = positions.get(version.id);
    if (!position) continue;
    const owner = packageById.get(version.packageId);
    const node: GraphVersionNode = {
      id: versionNodeId(version.id),
      nodeType: 'version',
      x: position.x,
      y: position.y,
      width: GRAPH_VERSION_SIZE.width,
      height: GRAPH_VERSION_SIZE.height,
      packageId: version.packageId,
      versionId: version.id,
      packageCode: owner?.code ?? pkg.code,
      versionLabel: version.label,
      versionNumber: version.versionNumber,
      title: owner?.title ?? pkg.title,
      taskKind: owner?.task.kind ?? pkg.task.kind,
      isCurrent: version.id === currentVersionId,
      createdAt: version.createdAt,
    };
    nodes.push(node);
  }

  const nodeIds = new Set(nodes.map((node) => node.id));
  const resolveEndpoint = (ref: VersionRef): EntityId | undefined => {
    const id = versionNodeId(ref.versionId);
    return nodeIds.has(id) ? id : undefined;
  };
  const edges = createEdges(bucketRelations(relations, resolveEndpoint), nodes);
  return { nodes, groups: [], edges, bounds: computeBounds(nodes) };
};

/* -------------------------------------------------------------------------- */
/* Entry point                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Build a read-only graph layout for the requested scope. Returns an empty
 * layout (no nodes, no edges) when there is nothing to draw so pages can show
 * an explicit empty state instead of a blank canvas.
 */
export const buildGraph = (snapshot: EvidossierSnapshot, options: GraphBuildOptions): GraphLayout => {
  const relationTypes = new Set<RelationType>(options.relationTypes ?? ALL_RELATION_TYPES);
  const taskKinds = new Set<TaskKind>(options.taskKinds ?? ALL_TASK_KINDS);
  if (relationTypes.size === 0 || taskKinds.size === 0) return emptyGraphLayout();

  if (options.scope.kind === 'project') {
    return buildProjectGraph(
      snapshot,
      options.scope.projectId,
      relationTypes,
      taskKinds,
      new Set(options.expandedPackageIds ?? [])
    );
  }
  return buildPackageGraph(
    snapshot,
    options.scope.packageId,
    options.scope.focusVersionId,
    relationTypes,
    taskKinds,
    options.includeUpstream ?? false,
    options.includeDownstream ?? false
  );
};
