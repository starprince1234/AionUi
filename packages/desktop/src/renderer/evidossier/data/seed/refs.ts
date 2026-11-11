/**
 * Stable id tables and reference factories for the demo seed.
 *
 * Materials and package versions are looked up here so every stage, version,
 * relation and report points at the same exact entity. Factories always return
 * new objects; module level data stays immutable.
 */
import type {
  EntityId,
  IsoTimestamp,
  MaterialKind,
  MaterialParseStatus,
  MaterialReference,
  MaterialUsage,
  TaskKind,
  VersionRef,
} from '../../domain/types';

/* -------------------------------------------------------------------------- */
/* Materials                                                                   */
/* -------------------------------------------------------------------------- */

export type MaterialSpec = {
  id: EntityId;
  projectId: EntityId;
  name: string;
  kind: MaterialKind;
  usage: MaterialUsage;
  usageNote: string;
  versionId: EntityId;
  versionNumber: number;
  sizeBytes: number;
  addedAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  parseStatus: MaterialParseStatus;
  parseNote?: string;
};

export const MATERIAL_SPECS: readonly MaterialSpec[] = [
  {
    id: 'mat-001',
    projectId: 'prj-001',
    name: '智慧园区建设需求说明书 V1.2.docx',
    kind: 'document',
    usage: 'requirement',
    usageNote: '项目建设的上位要求，技术方案编制与独立审查的主要依据。',
    versionId: 'mv-001-1',
    versionNumber: 1,
    sizeBytes: 486_912,
    addedAt: '2026-11-03T09:15:00+08:00',
    updatedAt: '2026-11-03T09:16:00+08:00',
    parseStatus: 'parsed',
  },
  {
    id: 'mat-002',
    projectId: 'prj-001',
    name: '园区现有基础设施勘察记录.docx',
    kind: 'document',
    usage: 'fact',
    usageNote: '记录园区既有网络、监控、供电与机房现状，是部署方案的现场事实来源。',
    versionId: 'mv-002-1',
    versionNumber: 1,
    sizeBytes: 233_472,
    addedAt: '2026-11-03T09:24:00+08:00',
    updatedAt: '2026-11-03T09:25:00+08:00',
    parseStatus: 'parsed',
  },
  {
    id: 'mat-003',
    projectId: 'prj-001',
    name: '同类型园区技术方案（参考案例）.docx',
    kind: 'document',
    usage: 'case',
    usageNote: '同规模园区的已实施方案，用于参考总体架构、设备配置与运维组织经验。',
    versionId: 'mv-003-1',
    versionNumber: 1,
    sizeBytes: 356_352,
    addedAt: '2026-11-03T09:38:00+08:00',
    updatedAt: '2026-11-03T09:39:00+08:00',
    parseStatus: 'parsed',
  },
  {
    id: 'mat-004',
    projectId: 'prj-001',
    name: '设备选型参数表.xlsx',
    kind: 'spreadsheet',
    usage: 'fact',
    usageNote: '设备型号与关键参数的汇总表，用于方案设备选型与审查核对。',
    versionId: 'mv-004-1',
    versionNumber: 1,
    sizeBytes: 148_480,
    addedAt: '2026-11-03T09:52:00+08:00',
    updatedAt: '2026-11-03T09:53:00+08:00',
    parseStatus: 'partial',
    parseNote: '表 3 合并单元格无法可靠提取，已标记为待人工核对',
  },
  {
    id: 'mat-005',
    projectId: 'prj-001',
    name: '技术方案编写模板（2026 版）.docx',
    kind: 'template',
    usage: 'template',
    usageNote: '规定技术方案的章节结构、图表与引用写法，作为交付文档的格式依据。',
    versionId: 'mv-005-1',
    versionNumber: 1,
    sizeBytes: 97_280,
    addedAt: '2026-11-03T10:05:00+08:00',
    updatedAt: '2026-11-03T10:06:00+08:00',
    parseStatus: 'parsed',
  },
  {
    id: 'mat-006',
    projectId: 'prj-001',
    name: '现场平面图-园区一期.pdf',
    kind: 'drawing',
    usage: 'pending',
    usageNote: '现场平面图，仅作定位参考；因无法提取文字层，未作为已核实事实依据。',
    versionId: 'mv-006-1',
    versionNumber: 1,
    sizeBytes: 2_985_984,
    addedAt: '2026-11-03T10:18:00+08:00',
    updatedAt: '2026-11-03T10:19:00+08:00',
    parseStatus: 'failed',
    parseNote: '扫描图纸无法提取文字层，不能作为已核实依据',
  },
  {
    id: 'mat-007',
    projectId: 'prj-003',
    name: '信号系统改造需求说明书（脱敏）.docx',
    kind: 'document',
    usage: 'requirement',
    usageNote: '信号系统改造的需求边界与验收要求，已做脱敏处理。',
    versionId: 'mv-007-1',
    versionNumber: 1,
    sizeBytes: 318_464,
    addedAt: '2026-11-06T14:10:00+08:00',
    updatedAt: '2026-11-06T14:11:00+08:00',
    parseStatus: 'parsed',
  },
  {
    id: 'mat-008',
    projectId: 'prj-003',
    name: '现场勘察照片汇总.pdf',
    kind: 'drawing',
    usage: 'pending',
    usageNote: '现场勘察照片汇总，仅作参考；扫描件无法提取可核对文字。',
    versionId: 'mv-008-1',
    versionNumber: 1,
    sizeBytes: 5_242_880,
    addedAt: '2026-11-07T09:35:00+08:00',
    updatedAt: '2026-11-07T09:36:00+08:00',
    parseStatus: 'failed',
    parseNote: '照片汇总为扫描件，无法提取文字，不能作为已核实依据',
  },
];

export const materialSpec = (materialId: EntityId): MaterialSpec => {
  const spec = MATERIAL_SPECS.find((candidate) => candidate.id === materialId);
  if (spec === undefined) {
    throw new Error(`Unknown material id in seed: ${materialId}`);
  }
  return spec;
};

/** Build an exact material reference; the id is stable per material and usage role. */
export const materialRef = (materialId: EntityId, role?: MaterialUsage, note?: string): MaterialReference => {
  const spec = materialSpec(materialId);
  const resolvedRole = role ?? spec.usage;
  return {
    id: `mref-${spec.id}-${resolvedRole}`,
    materialId: spec.id,
    materialVersionId: spec.versionId,
    materialName: spec.name,
    versionNumber: spec.versionNumber,
    role: resolvedRole,
    ...(note === undefined ? {} : { note }),
  };
};

/* -------------------------------------------------------------------------- */
/* Package versions                                                            */
/* -------------------------------------------------------------------------- */

export type VersionSpec = {
  versionId: EntityId;
  packageId: EntityId;
  packageCode: string;
  packageTitle: string;
  versionLabel: string;
  versionNumber: number;
  taskKind: TaskKind;
};

export const VERSION_SPECS: readonly VersionSpec[] = [
  {
    versionId: 'ver-p001-v1',
    packageId: 'pkg-001',
    packageCode: 'P001',
    packageTitle: '智慧园区技术方案编制',
    versionLabel: 'P001/v1',
    versionNumber: 1,
    taskKind: 'generate',
  },
  {
    versionId: 'ver-p001-v2',
    packageId: 'pkg-001',
    packageCode: 'P001',
    packageTitle: '智慧园区技术方案编制',
    versionLabel: 'P001/v2',
    versionNumber: 2,
    taskKind: 'generate',
  },
  {
    versionId: 'ver-p002-v1',
    packageId: 'pkg-002',
    packageCode: 'P002',
    packageTitle: '智慧园区技术方案独立审查',
    versionLabel: 'P002/v1',
    versionNumber: 1,
    taskKind: 'review',
  },
  {
    versionId: 'ver-p003-v1',
    packageId: 'pkg-003',
    packageCode: 'P003',
    packageTitle: '方案修订（按审查意见）',
    versionLabel: 'P003/v1',
    versionNumber: 1,
    taskKind: 'generate',
  },
  {
    versionId: 'ver-p004-v1',
    packageId: 'pkg-004',
    packageCode: 'P004',
    packageTitle: '方案修订前后比对',
    versionLabel: 'P004/v1',
    versionNumber: 1,
    taskKind: 'compare',
  },
  {
    versionId: 'ver-p005-v1',
    packageId: 'pkg-005',
    packageCode: 'P005',
    packageTitle: '需求说明书一致性审查',
    versionLabel: 'P005/v1',
    versionNumber: 1,
    taskKind: 'review',
  },
];

export const versionSpec = (versionId: EntityId): VersionSpec => {
  const spec = VERSION_SPECS.find((candidate) => candidate.versionId === versionId);
  if (spec === undefined) {
    throw new Error(`Unknown package version id in seed: ${versionId}`);
  }
  return spec;
};

/** Denormalized exact version pointer used as a relation/report endpoint. */
export const versionRef = (versionId: EntityId): VersionRef => {
  const spec = versionSpec(versionId);
  return {
    packageId: spec.packageId,
    versionId: spec.versionId,
    packageCode: spec.packageCode,
    packageTitle: spec.packageTitle,
    versionLabel: spec.versionLabel,
    versionNumber: spec.versionNumber,
    taskKind: spec.taskKind,
  };
};
