/**
 * Generate-loop packages: P001 (two delivered versions) and P003 (revision).
 *
 * Stage skeletons come from the shared blueprints; this module only owns the
 * business state, stage artifacts, versions, conversation and execution record.
 */
import type {
  ArtifactPackage,
  Conversation,
  ConversationMessage,
  DraftPayload,
  ExecutionRun,
  FactListPayload,
  MaterialUsage,
  OutlinePayload,
  PackageVersion,
  Stage,
  StageArtifact,
  Task,
  ValidationPayload,
} from '../../domain/types';
import { createP001V1Document } from './docP001V1';
import { createP001V2Document } from './docP001V2';
import { createP003V1Document } from './docP003V1';
import { currentUser, demoAgentUser } from './users';
import { materialRef } from './refs';
import { buildStages, seedStageId } from './stageBuilders';

const ref = (materialId: string, role?: MaterialUsage, note?: string) => materialRef(materialId, role, note);

/* ========================================================================== */
/* P001 智慧园区技术方案编制                                                    */
/* ========================================================================== */

export const createP001Task = (): Task => ({
  id: 'task-p001',
  kind: 'generate',
  goal: '编制智慧园区一期技术方案，形成可提交、可验收的正式版本。',
  requirements: [
    '覆盖需求说明书 V1.2 的建设范围、技术架构、设备与投资要求。',
    '按技术方案编写模板组织章节，设备选型须给出型号与关键参数。',
    '投资估算分项合计须与需求说明书的控制额一致。',
    '引用材料必须标注来源，无法核实的内容单独说明。',
  ],
  createdAt: '2026-11-03T10:40:00+08:00',
});

export const createP001Stages = (): Stage[] =>
  buildStages('pkg-001', 'generate', [ref('mat-001', 'requirement'), ref('mat-005', 'template')], {
    goal: {
      status: 'completed',
      startedAt: '2026-11-03T10:45:00+08:00',
      completedAt: '2026-11-03T10:58:00+08:00',
    },
    facts: {
      status: 'completed',
      currentArtifactId: 'art-p001-facts',
      startedAt: '2026-11-03T10:58:00+08:00',
      completedAt: '2026-11-03T11:14:00+08:00',
      inputRefs: [ref('mat-001', 'requirement'), ref('mat-002', 'fact'), ref('mat-004', 'fact')],
    },
    retrieval: {
      status: 'completed',
      startedAt: '2026-11-03T11:14:00+08:00',
      completedAt: '2026-11-03T11:32:00+08:00',
      inputRefs: [
        ref('mat-001', 'requirement'),
        ref('mat-002', 'fact'),
        ref('mat-003', 'case'),
        ref('mat-004', 'fact'),
        ref('mat-005', 'template'),
      ],
    },
    plan: {
      status: 'completed',
      currentArtifactId: 'art-p001-outline',
      startedAt: '2026-11-03T11:32:00+08:00',
      completedAt: '2026-11-03T12:05:00+08:00',
    },
    draft: {
      status: 'completed',
      currentArtifactId: 'art-p001-draft',
      startedAt: '2026-11-03T13:30:00+08:00',
      completedAt: '2026-11-03T16:40:00+08:00',
      inputRefs: [
        ref('mat-001', 'requirement'),
        ref('mat-002', 'fact'),
        ref('mat-003', 'case'),
        ref('mat-004', 'fact'),
      ],
    },
    validation: {
      status: 'completed',
      currentArtifactId: 'art-p001-validation',
      startedAt: '2026-11-03T16:40:00+08:00',
      completedAt: '2026-11-03T17:05:00+08:00',
      inputRefs: [ref('mat-001', 'requirement'), ref('mat-004', 'fact'), ref('mat-006', 'pending')],
    },
    delivery: {
      status: 'completed',
      startedAt: '2026-11-03T17:05:00+08:00',
      completedAt: '2026-11-03T17:20:00+08:00',
    },
  });

const createP001FactList = (): FactListPayload => ({
  type: 'fact_list',
  items: [
    {
      id: 'fact-p001-01',
      kind: 'requirement',
      statement: '平台需支持不少于 2000 路视频接入，录像保存不少于 30 天。',
      detail: '需求说明书第 4 章技术架构要求，属于平台容量的硬性指标。',
      source: {
        documentId: 'doc-mat-001',
        blockId: 'm1-b-11',
        sectionPath: '第 4 章 技术架构要求',
        quote: '平台需支持不少于 2000 路视频接入，视频存储不少于 30 天。',
      },
      materialReferenceId: 'mref-mat-001-requirement',
      status: 'confirmed',
    },
    {
      id: 'fact-p001-02',
      kind: 'fact',
      statement: '园区现有摄像机共 210 路，存储周期约 15 天。',
      detail: '现状无法满足 30 天保存要求，需在方案中说明存储扩容方式。',
      source: {
        documentId: 'doc-mat-002',
        blockId: 'm2-b-07',
        sectionPath: '第 2 章 视频监控现状',
        quote: '现有模拟摄像机 148 路、数字摄像机 62 路，存储周期约 15 天',
      },
      materialReferenceId: 'mref-mat-002-fact',
      status: 'confirmed',
    },
    {
      id: 'fact-p001-03',
      kind: 'fact',
      statement: '中心机房现有 6 个 42U 机柜，已使用 4 个，UPS 负载率约 62%。',
      detail: '剩余机柜空间可容纳新增平台设备，UPS 需在深化设计时核算扩容。',
      source: {
        documentId: 'doc-mat-002',
        blockId: 'm2-b-04',
        sectionPath: '第 1 章 机房与网络',
        quote: '现有 42U 机柜 6 个，已使用 4 个',
      },
      materialReferenceId: 'mref-mat-002-fact',
      status: 'confirmed',
    },
    {
      id: 'fact-p001-04',
      kind: 'requirement',
      statement: '一期总投资控制在 3800 万元以内，设备与安装费用不超过 2600 万元。',
      detail: '投资估算分项合计必须与控制额一致。',
      source: {
        documentId: 'doc-mat-001',
        blockId: 'm1-b-17',
        sectionPath: '第 7 章 投资与进度要求',
        quote: '一期总投资控制在 3800 万元以内',
      },
      materialReferenceId: 'mref-mat-001-requirement',
      status: 'confirmed',
    },
    {
      id: 'fact-p001-05',
      kind: 'assumption',
      statement: '参考案例中 400 万像素星光级摄像机可作为室外枪机选型基线。',
      detail: '参考案例仅作经验参考，选型仍需以设备选型参数表为准。',
      source: {
        documentId: 'doc-mat-003',
        blockId: 'm3-b-07',
        sectionPath: '第 2 章 设备配置经验',
        quote: '室外摄像机统一采用 400 万像素星光级设备',
      },
      materialReferenceId: 'mref-mat-003-case',
      status: 'pending',
    },
    {
      id: 'fact-p001-06',
      kind: 'conflict',
      statement: '参考案例的设备投资占比为 65%，与需求说明书的控制额结构不同，不能直接套用。',
      detail: '参考案例按自身规模估算，本项目需按需求控制额重新分配分项。',
      source: {
        documentId: 'doc-mat-003',
        blockId: 'm3-b-11',
        sectionPath: '第 4 章 投资与进度',
        quote: '设备与安装',
      },
      materialReferenceId: 'mref-mat-003-case',
      status: 'conflict',
    },
    {
      id: 'fact-p001-07',
      kind: 'gap',
      statement: '现场平面图为扫描件，无法提取文字层，图面坐标与管线位置尚未核实。',
      detail: '该材料不能作为已核实依据，涉及管线敷设的内容需在深化设计阶段现场确认。',
      materialReferenceId: 'mref-mat-006-pending',
      status: 'missing',
    },
    {
      id: 'fact-p001-08',
      kind: 'fact',
      statement: '设备选型参数表表 1、表 2 可完整提取，表 3 因合并单元格无法可靠提取。',
      detail: '设备型号与关键参数以表 1、表 2 为准，表 3 涉及内容标记为待人工核对。',
      source: {
        documentId: 'doc-mat-004',
        blockId: 'm4-b-02',
        sectionPath: '设备选型参数表（节选）',
        quote: '表 1、表 2 提取完整；表 3 因合并单元格无法可靠提取',
      },
      materialReferenceId: 'mref-mat-004-fact',
      status: 'pending',
    },
  ],
  openQuestions: [
    '室外管网清淤范围与 D 栋上联改造责任方由哪一方确认？',
    '既有 210 路摄像机是否保留，需要在设备清单中明确。',
    '设备选型参数表表 3 的存储与服务器参数需人工核对后确认。',
  ],
});

const createP001Outline = (): OutlinePayload => ({
  type: 'outline',
  sections: [
    {
      id: 'outline-p001-01',
      title: '1 概述',
      purpose: '说明编制目的与依据，固定方案引用的材料版本。',
      requirementRefs: ['需求说明书 1 项目背景', '编写模板 1 章节结构'],
      basisRefs: ['mat-001', 'mat-005'],
      status: 'confirmed',
    },
    {
      id: 'outline-p001-02',
      title: '2 需求理解',
      purpose: '复述建设目标与范围，确认对需求的理解无偏差。',
      requirementRefs: ['需求说明书 2 建设目标', '需求说明书 3 建设范围'],
      basisRefs: ['mat-001'],
      status: 'confirmed',
    },
    {
      id: 'outline-p001-03',
      title: '3 总体设计',
      purpose: '给出云边协同架构、部署位置与设备选型配置。',
      requirementRefs: ['需求说明书 4 技术架构要求', '需求说明书 5 设备与基础设施要求'],
      basisRefs: ['mat-001', 'mat-002', 'mat-004'],
      status: 'confirmed',
    },
    {
      id: 'outline-p001-04',
      title: '4 详细设计',
      purpose: '按综合安防、智能通行、能源管理、运营中心展开。',
      requirementRefs: ['需求说明书 3 建设范围'],
      basisRefs: ['mat-001', 'mat-002'],
      status: 'confirmed',
    },
    {
      id: 'outline-p001-05',
      title: '5 运维保障',
      purpose: '说明运维组织与运维服务内容。',
      requirementRefs: ['需求说明书 8 验收与交付要求'],
      basisRefs: ['mat-001', 'mat-003'],
      status: 'confirmed',
    },
    {
      id: 'outline-p001-06',
      title: '6 投资估算',
      purpose: '按需求控制额给出投资构成与分年度安排。',
      requirementRefs: ['需求说明书 7 投资与进度要求'],
      basisRefs: ['mat-001'],
      status: 'confirmed',
    },
    {
      id: 'outline-p001-07',
      title: '7 实施计划',
      purpose: '给出 10 个月的分阶段实施安排。',
      requirementRefs: ['需求说明书 2 建设目标'],
      basisRefs: ['mat-001'],
      status: 'confirmed',
    },
    {
      id: 'outline-p001-08',
      title: '8 风险与应对',
      purpose: '列出勘察发现的网络、管网与设备到货风险。',
      requirementRefs: ['需求说明书 1 项目背景'],
      basisRefs: ['mat-002'],
      status: 'confirmed',
    },
    {
      id: 'outline-p001-09',
      title: '9 验收与交付',
      purpose: '说明验收阶段、试运行周期与交付物清单。',
      requirementRefs: ['需求说明书 8 验收与交付要求'],
      basisRefs: ['mat-001', 'mat-005'],
      status: 'confirmed',
    },
    {
      id: 'outline-p001-10',
      title: '10 结论与建议',
      purpose: '总结方案结论并给出招标前待办事项。',
      requirementRefs: ['需求说明书 2 建设目标'],
      basisRefs: ['mat-001'],
      status: 'confirmed',
    },
  ],
  scopeNote: '按技术方案编写模板组织为 10 章；现场平面图无法提取文字，涉及图面的内容不在大纲中承诺。',
});

const createP001Draft = (): DraftPayload => ({
  type: 'draft',
  isPartial: false,
  sections: [
    {
      id: 'draft-p001-s01',
      heading: '1 概述',
      paragraphs: [
        {
          id: 'draft-p001-01',
          text: '本方案依据《智慧园区建设需求说明书 V1.2》与现场勘察记录编制，适用于园区一期工程的技术设计与实施。',
          citationRefs: ['mref-mat-001-requirement', 'mref-mat-002-fact'],
          change: 'unchanged',
        },
      ],
    },
    {
      id: 'draft-p001-s02',
      heading: '2 需求理解',
      paragraphs: [
        {
          id: 'draft-p001-02',
          text: '一期以统一平台、数据贯通、分期扩展为目标，平台可用性不低于 99.9%，视频监控在线率不低于 99%。',
          citationRefs: ['mref-mat-001-requirement'],
          change: 'unchanged',
        },
      ],
    },
    {
      id: 'draft-p001-s03',
      heading: '3 总体设计',
      paragraphs: [
        {
          id: 'draft-p001-03',
          text: '平台采用云边协同架构，中心平台负责数据汇聚与分析，边缘节点承担视频接入与实时告警。',
          citationRefs: ['mref-mat-002-fact'],
          change: 'unchanged',
        },
        {
          id: 'draft-p001-04',
          text: '设备选型按室外环境防护、双电源冗余与统一品牌的原则配置，具体参数见 3.2 设备参数表。',
          citationRefs: ['mref-mat-004-fact'],
          change: 'added',
        },
      ],
    },
    {
      id: 'draft-p001-s04',
      heading: '4 详细设计',
      paragraphs: [
        {
          id: 'draft-p001-05',
          text: '综合安防覆盖园区出入口、主要道路、楼栋出入口与重点设备机房，录像保存不少于 30 天。',
          citationRefs: ['mref-mat-001-requirement'],
          change: 'unchanged',
        },
        {
          id: 'draft-p001-06',
          text: '能源管理对水、电、气计量数据集中采集，并提供能耗趋势与异常用能分析。',
          citationRefs: ['mref-mat-001-requirement'],
          change: 'unchanged',
        },
      ],
    },
    {
      id: 'draft-p001-s05',
      heading: '5 运维保障',
      paragraphs: [
        {
          id: 'draft-p001-07',
          text: '项目交付后由建设单位运维团队负责日常运维，承建单位提供不少于 2 年的运维服务。',
          citationRefs: ['mref-mat-001-requirement'],
          change: 'unchanged',
        },
      ],
    },
    {
      id: 'draft-p001-s06',
      heading: '6 投资估算',
      paragraphs: [
        {
          id: 'draft-p001-08',
          text: '一期总投资按 3800 万元以内控制，投资构成包括设备与安装、软件开发、网络与机房改造、运维服务及其他费用。',
          citationRefs: ['mref-mat-001-requirement'],
          change: 'unchanged',
        },
      ],
    },
    {
      id: 'draft-p001-s07',
      heading: '7 实施计划',
      paragraphs: [
        {
          id: 'draft-p001-09',
          text: '项目总工期 10 个月，2027 年第三季度完成试运行。',
          citationRefs: ['mref-mat-001-requirement'],
          change: 'unchanged',
        },
      ],
    },
    {
      id: 'draft-p001-s08',
      heading: '8 风险与应对',
      paragraphs: [
        {
          id: 'draft-p001-10',
          text: 'D 栋单路上联与室外管网积水是主要实施风险，分别通过窗口期申请与施工前清淤应对。',
          citationRefs: ['mref-mat-002-fact'],
          change: 'unchanged',
        },
      ],
    },
    {
      id: 'draft-p001-s09',
      heading: '9 验收与交付',
      paragraphs: [
        {
          id: 'draft-p001-11',
          text: '验收分为初验、试运行与终验，试运行不少于 3 个月，验收前完成第三方检测。',
          citationRefs: ['mref-mat-001-requirement'],
          change: 'unchanged',
        },
      ],
    },
    {
      id: 'draft-p001-s10',
      heading: '10 结论与建议',
      paragraphs: [
        {
          id: 'draft-p001-12',
          text: '方案满足需求说明书的建设范围与目标，建议在招标前完成设备参数与投资分项的最终核对。',
          citationRefs: ['mref-mat-001-requirement'],
          change: 'unchanged',
        },
      ],
    },
  ],
});

const createP001Validation = (): ValidationPayload => ({
  type: 'validation',
  checks: [
    {
      id: 'check-p001-01',
      label: '需求覆盖检查',
      status: 'pass',
      detail: '需求说明书第 2、3、4、5、7、8 章的要求均在方案中有对应章节。',
    },
    {
      id: 'check-p001-02',
      label: '引用来源检查',
      status: 'pass',
      detail: '方案事实均标注了材料来源，参考案例仅用于选型参考并已注明。',
    },
    {
      id: 'check-p001-03',
      label: '设备参数可核对性',
      status: 'warn',
      detail: '设备选型参数表表 3 为合并单元格，无法可靠提取，相关参数标记为待人工核对。',
      location: {
        documentId: 'doc-mat-004',
        blockId: 'm4-b-07',
        sectionPath: '设备选型参数表（节选）',
        quote: '表 3 存储与服务器参数因合并单元格无法可靠提取',
      },
    },
    {
      id: 'check-p001-04',
      label: '投资口径检查',
      status: 'warn',
      detail: '投资构成合计 3 920 万元，超出需求说明书 3800 万元控制额 120 万元，已标记待核对。',
      location: {
        documentId: 'doc-p001-v2',
        blockId: 'p1v2-b-47',
        sectionPath: '第 6 章 > 6.1 投资构成',
        quote: '超出需求控制额 120 万元',
      },
    },
    {
      id: 'check-p001-05',
      label: '文件可读性检查',
      status: 'warn',
      detail: '现场平面图为扫描件，无法提取文字层，未作为已核实依据使用。',
    },
    {
      id: 'check-p001-06',
      label: '交付结构检查',
      status: 'pass',
      detail: '交付文档包含 10 章正文、12 张表格，章节结构与编写模板一致。',
    },
  ],
  openItems: ['投资构成合计超出控制额 120 万元，需在后续版本核对。', '设备选型参数表表 3 待人工核对。'],
});

export const createP001Artifacts = (): StageArtifact[] => [
  {
    id: 'art-p001-facts',
    packageId: 'pkg-001',
    stageId: seedStageId('pkg-001', 'facts'),
    kind: 'fact_list',
    revision: 1,
    status: 'confirmed',
    title: '事实与要求清单',
    updatedAt: '2026-11-03T11:14:00+08:00',
    updatedBy: currentUser(),
    summary: '整理 8 条事实与要求、2 个冲突与缺口，另有 3 个待确认问题。',
    basedOn: [
      ref('mat-001', 'requirement'),
      ref('mat-002', 'fact'),
      ref('mat-003', 'case'),
      ref('mat-004', 'fact'),
      ref('mat-006', 'pending', '扫描件无法提取文字，仅记录为缺口'),
    ],
    payload: createP001FactList(),
  },
  {
    id: 'art-p001-outline',
    packageId: 'pkg-001',
    stageId: seedStageId('pkg-001', 'plan'),
    kind: 'outline',
    revision: 1,
    status: 'confirmed',
    title: '大纲与修改计划',
    updatedAt: '2026-11-04T11:30:00+08:00',
    updatedBy: currentUser(),
    summary: '按编写模板形成 10 章大纲，V1.1 将 3.2 与第 5 章扩展为设备参数与运维细化内容。',
    basedOn: [ref('mat-001', 'requirement'), ref('mat-005', 'template')],
    payload: createP001Outline(),
  },
  {
    id: 'art-p001-draft',
    packageId: 'pkg-001',
    stageId: seedStageId('pkg-001', 'draft'),
    kind: 'draft',
    revision: 1,
    status: 'confirmed',
    title: '工作草稿',
    updatedAt: '2026-11-04T16:30:00+08:00',
    updatedBy: currentUser(),
    summary: '10 章正文草稿，含设备参数表与运维保障扩展内容，供正式版本提交前审阅。',
    basedOn: [ref('mat-001', 'requirement'), ref('mat-002', 'fact'), ref('mat-003', 'case'), ref('mat-004', 'fact')],
    payload: createP001Draft(),
  },
  {
    id: 'art-p001-validation',
    packageId: 'pkg-001',
    stageId: seedStageId('pkg-001', 'validation'),
    kind: 'validation',
    revision: 1,
    status: 'confirmed',
    title: '校验结果',
    updatedAt: '2026-11-04T17:00:00+08:00',
    updatedBy: currentUser(),
    summary: '6 项校验中 3 项通过、3 项警告：表 3 待核对、投资超出控制额、扫描图纸不可读。',
    basedOn: [ref('mat-001', 'requirement'), ref('mat-004', 'fact'), ref('mat-006', 'pending')],
    payload: createP001Validation(),
  },
];

export const createP001Versions = (): PackageVersion[] => [
  {
    id: 'ver-p001-v1',
    packageId: 'pkg-001',
    projectId: 'prj-001',
    versionNumber: 1,
    label: 'P001/v1',
    status: 'delivered',
    createdAt: '2026-11-03T17:20:00+08:00',
    createdBy: currentUser(),
    changeNote: '首次正式交付：10 章技术方案 V1.0，覆盖总体设计、子系统设计与投资估算。',
    inputs: [
      ref('mat-001', 'requirement'),
      ref('mat-002', 'fact'),
      ref('mat-003', 'case'),
      ref('mat-004', 'fact'),
      ref('mat-005', 'template'),
    ],
    artifacts: [
      { artifactId: 'art-p001-facts', revision: 1, title: '事实与要求清单', kind: 'fact_list' },
      { artifactId: 'art-p001-outline', revision: 1, title: '大纲与修改计划', kind: 'outline' },
      { artifactId: 'art-p001-draft', revision: 1, title: '工作草稿', kind: 'draft' },
      { artifactId: 'art-p001-validation', revision: 1, title: '校验结果', kind: 'validation' },
    ],
    deliverable: {
      id: 'del-p001-v1',
      kind: 'document',
      title: '智慧园区技术方案（一期）V1.0',
      fileName: 'P001-智慧园区技术方案（一期）V1.0.docx',
      format: 'docx',
      pageCount: 86,
      simulatedFile: true,
      document: createP001V1Document(),
    },
    confirmations: [
      {
        id: 'conf-p001-v1-01',
        label: '正式版本 V1.0 已确认',
        confirmedBy: currentUser(),
        confirmedAt: '2026-11-03T17:20:00+08:00',
        artifactId: 'art-p001-validation',
      },
    ],
  },
  {
    id: 'ver-p001-v2',
    packageId: 'pkg-001',
    projectId: 'prj-001',
    versionNumber: 2,
    label: 'P001/v2',
    status: 'delivered',
    createdAt: '2026-11-04T17:05:00+08:00',
    createdBy: currentUser(),
    baseVersionId: 'ver-p001-v1',
    changeNote:
      '相对 V1.0 补充 3.2 设备型号与关键参数表，扩展第 5 章运维保障（组织职责、服务响应与备件、培训），其余章节沿用 V1.0。',
    inputs: [
      ref('mat-001', 'requirement'),
      ref('mat-002', 'fact'),
      ref('mat-003', 'case'),
      ref('mat-004', 'fact'),
      ref('mat-005', 'template'),
    ],
    artifacts: [
      { artifactId: 'art-p001-facts', revision: 1, title: '事实与要求清单', kind: 'fact_list' },
      { artifactId: 'art-p001-outline', revision: 1, title: '大纲与修改计划', kind: 'outline' },
      { artifactId: 'art-p001-draft', revision: 1, title: '工作草稿', kind: 'draft' },
      { artifactId: 'art-p001-validation', revision: 1, title: '校验结果', kind: 'validation' },
    ],
    deliverable: {
      id: 'del-p001-v2',
      kind: 'document',
      title: '智慧园区技术方案（一期）V1.1',
      fileName: 'P001-智慧园区技术方案（一期）V1.1.docx',
      format: 'docx',
      pageCount: 98,
      simulatedFile: true,
      document: createP001V2Document(),
    },
    confirmations: [
      {
        id: 'conf-p001-v2-01',
        label: '正式版本 V1.1 已确认',
        confirmedBy: currentUser(),
        confirmedAt: '2026-11-04T17:05:00+08:00',
        artifactId: 'art-p001-validation',
      },
    ],
  },
];

export const createP001Package = (): ArtifactPackage => ({
  id: 'pkg-001',
  code: 'P001',
  projectId: 'prj-001',
  title: '智慧园区技术方案编制',
  task: createP001Task(),
  status: 'delivered',
  primaryConversationId: 'conv-p001',
  versionIds: ['ver-p001-v1', 'ver-p001-v2'],
  stageIds: ['goal', 'facts', 'retrieval', 'plan', 'draft', 'validation', 'delivery'].map((key) =>
    seedStageId('pkg-001', key)
  ),
  createdAt: '2026-11-03T10:40:00+08:00',
  updatedAt: '2026-11-04T17:05:00+08:00',
  createdBy: currentUser(),
  executionId: 'exec-p001',
  statusHistory: [
    { status: 'draft', at: '2026-11-03T10:40:00+08:00', note: '创建交付包' },
    { status: 'in_progress', at: '2026-11-03T10:45:00+08:00' },
    { status: 'delivered', at: '2026-11-03T17:20:00+08:00', note: 'P001/v1 正式交付' },
    { status: 'in_progress', at: '2026-11-04T09:05:00+08:00', note: '按用户要求补充设备参数与运维章节' },
    { status: 'delivered', at: '2026-11-04T17:05:00+08:00', note: 'P001/v2 正式交付' },
  ],
});

export const createP001Conversation = (): Conversation => ({
  id: 'conv-p001',
  packageId: 'pkg-001',
  title: '智慧园区技术方案编制会话',
  createdAt: '2026-11-03T10:42:00+08:00',
  messageIds: [
    'msg-p001-01',
    'msg-p001-02',
    'msg-p001-03',
    'msg-p001-04',
    'msg-p001-05',
    'msg-p001-06',
    'msg-p001-07',
    'msg-p001-08',
    'msg-p001-09',
    'msg-p001-10',
  ],
});

export const createP001Messages = (): ConversationMessage[] => [
  {
    id: 'msg-p001-01',
    conversationId: 'conv-p001',
    role: 'user',
    text: '请依据需求说明书 V1.2 和现场勘察记录，编制智慧园区一期技术方案。先整理事实清单和大纲，我确认后再进入草稿。',
    createdAt: '2026-11-03T10:42:00+08:00',
    author: currentUser(),
    stageKey: 'goal',
  },
  {
    id: 'msg-p001-02',
    conversationId: 'conv-p001',
    role: 'system',
    text: '阶段『目标与材料理解』开始：读取需求说明书、勘察记录、参考案例、设备参数表与编写模板。',
    createdAt: '2026-11-03T10:45:00+08:00',
    stageKey: 'goal',
  },
  {
    id: 'msg-p001-03',
    conversationId: 'conv-p001',
    role: 'assistant',
    text: '演示模拟执行：已完成材料理解。需求说明书与勘察记录可读；设备选型参数表表 1、表 2 可提取，表 3 标记为待人工核对；现场平面图为扫描件，无法提取文字层，未作为依据。',
    createdAt: '2026-11-03T10:58:00+08:00',
    author: demoAgentUser(),
    stageKey: 'facts',
    simulated: true,
  },
  {
    id: 'msg-p001-04',
    conversationId: 'conv-p001',
    role: 'system',
    text: '阶段『事实与要求整理』生成了候选成果，等待确认：事实与要求清单。',
    createdAt: '2026-11-03T11:14:00+08:00',
    stageKey: 'facts',
    attachmentIds: ['art-p001-facts'],
  },
  {
    id: 'msg-p001-05',
    conversationId: 'conv-p001',
    role: 'user',
    text: '事实清单可以，按 10 章大纲继续。第 6 章投资估算要和需求说明书的 3800 万元控制额对齐。',
    createdAt: '2026-11-03T11:30:00+08:00',
    author: currentUser(),
    stageKey: 'plan',
  },
  {
    id: 'msg-p001-06',
    conversationId: 'conv-p001',
    role: 'assistant',
    text: '演示模拟执行：已生成 10 章大纲，覆盖需求说明书建设范围、技术架构、设备、投资与验收要求；投资估算章节将单独核对控制额。',
    createdAt: '2026-11-03T12:05:00+08:00',
    author: demoAgentUser(),
    stageKey: 'plan',
    simulated: true,
    attachmentIds: ['art-p001-outline'],
  },
  {
    id: 'msg-p001-07',
    conversationId: 'conv-p001',
    role: 'user',
    text: '草稿和校验完成后，直接提交正式版本 V1.0。',
    createdAt: '2026-11-03T16:50:00+08:00',
    author: currentUser(),
    stageKey: 'validation',
  },
  {
    id: 'msg-p001-08',
    conversationId: 'conv-p001',
    role: 'system',
    text: '正式版本 P001/v1 已提交：智慧园区技术方案（一期）V1.0。',
    createdAt: '2026-11-03T17:20:00+08:00',
    attachmentIds: ['ver-p001-v1'],
  },
  {
    id: 'msg-p001-09',
    conversationId: 'conv-p001',
    role: 'user',
    text: 'V1.0 设备章节太简略了。请补充具体型号与关键参数，并扩展运维保障章节，形成 V1.1；其他章节不要动。',
    createdAt: '2026-11-04T09:05:00+08:00',
    author: currentUser(),
    stageKey: 'goal',
  },
  {
    id: 'msg-p001-10',
    conversationId: 'conv-p001',
    role: 'assistant',
    text: '演示模拟执行：V1.1 已提交。3.2 增补设备参数表，第 5 章扩展为组织职责、服务响应与备件、培训三节；其余章节与 V1.0 保持一致。',
    createdAt: '2026-11-04T17:05:00+08:00',
    author: demoAgentUser(),
    simulated: true,
    attachmentIds: ['ver-p001-v2'],
  },
];

export const createP001Execution = (): ExecutionRun => ({
  id: 'exec-p001',
  packageId: 'pkg-001',
  status: 'completed',
  currentStageKey: 'delivery',
  startedAt: '2026-11-03T10:45:00+08:00',
  updatedAt: '2026-11-04T17:05:00+08:00',
  activity: '正式版本 P001/v2 已提交',
  inputVersionIds: ['mv-001-1', 'mv-002-1', 'mv-003-1', 'mv-004-1', 'mv-005-1', 'mv-006-1'],
  events: [
    { id: 'evt-p001-01', type: 'queued', at: '2026-11-03T10:40:00+08:00', label: '运行已排队' },
    { id: 'evt-p001-02', type: 'stage_started', at: '2026-11-03T10:45:00+08:00', label: '阶段『目标与材料理解』开始' },
    { id: 'evt-p001-03', type: 'stage_started', at: '2026-11-03T10:58:00+08:00', label: '阶段『事实与要求整理』开始' },
    {
      id: 'evt-p001-04',
      type: 'artifact_candidate',
      at: '2026-11-03T11:14:00+08:00',
      label: '生成事实与要求清单候选',
      detail: '等待用户确认',
    },
    { id: 'evt-p001-05', type: 'stage_started', at: '2026-11-03T11:32:00+08:00', label: '阶段『大纲或修改计划』开始' },
    { id: 'evt-p001-06', type: 'artifact_candidate', at: '2026-11-03T12:05:00+08:00', label: '生成 10 章大纲候选' },
    { id: 'evt-p001-07', type: 'stage_started', at: '2026-11-03T13:30:00+08:00', label: '阶段『草稿编制』开始' },
    { id: 'evt-p001-08', type: 'artifact_candidate', at: '2026-11-03T16:40:00+08:00', label: '生成正式版本 V1.0 草稿' },
    { id: 'evt-p001-09', type: 'stage_started', at: '2026-11-03T16:40:00+08:00', label: '阶段『校验』开始' },
    {
      id: 'evt-p001-10',
      type: 'progress',
      at: '2026-11-03T17:05:00+08:00',
      label: '校验完成：投资口径与文件可读性存在警告',
    },
    { id: 'evt-p001-11', type: 'completed', at: '2026-11-03T17:20:00+08:00', label: '正式版本 P001/v1 已提交' },
    { id: 'evt-p001-12', type: 'resumed', at: '2026-11-04T09:10:00+08:00', label: '按用户要求补充设备参数与运维章节' },
    {
      id: 'evt-p001-13',
      type: 'stage_started',
      at: '2026-11-04T09:40:00+08:00',
      label: '阶段『大纲或修改计划』重新开始',
    },
    { id: 'evt-p001-14', type: 'artifact_candidate', at: '2026-11-04T11:30:00+08:00', label: '生成扩展后的大纲候选' },
    { id: 'evt-p001-15', type: 'stage_started', at: '2026-11-04T13:40:00+08:00', label: '阶段『草稿编制』开始' },
    { id: 'evt-p001-16', type: 'artifact_candidate', at: '2026-11-04T16:30:00+08:00', label: '生成正式版本 V1.1 草稿' },
    { id: 'evt-p001-17', type: 'completed', at: '2026-11-04T17:05:00+08:00', label: '正式版本 P001/v2 已提交' },
  ],
});

/* ========================================================================== */
/* P003 方案修订（按审查意见）                                                  */
/* ========================================================================== */

export const createP003Task = (): Task => ({
  id: 'task-p003',
  kind: 'generate',
  goal: '依据 P002/v1 审查报告修订 P001/v2，仅修改授权章节并形成修订稿 V1.2。',
  requirements: [
    '优先处理审查问题 F-01、F-02、F-04，并核对 F-03 的投资分项。',
    '仅授权修改 3.2 设备选型与配置、5 运维保障、6 投资估算。',
    '其余章节保持与 P001/v2 一致，便于后续版本比对。',
    '修订稿须保留审查报告的问题编号与处理说明。',
  ],
  revisionOfVersionId: 'ver-p001-v2',
  revisionScope: '仅授权修改 3.2 设备选型与配置、5 运维保障、6 投资估算；其他章节保持与 P001/v2 一致。',
  createdAt: '2026-11-06T09:20:00+08:00',
});

export const createP003Stages = (): Stage[] =>
  buildStages('pkg-003', 'generate', [ref('mat-001', 'requirement'), ref('mat-004', 'fact')], {
    goal: {
      status: 'completed',
      startedAt: '2026-11-06T09:25:00+08:00',
      completedAt: '2026-11-06T09:38:00+08:00',
    },
    facts: {
      status: 'completed',
      currentArtifactId: 'art-p003-facts',
      startedAt: '2026-11-06T09:38:00+08:00',
      completedAt: '2026-11-06T09:58:00+08:00',
      inputRefs: [ref('mat-001', 'requirement'), ref('mat-004', 'fact')],
    },
    retrieval: {
      status: 'completed',
      startedAt: '2026-11-06T09:58:00+08:00',
      completedAt: '2026-11-06T10:10:00+08:00',
    },
    plan: {
      status: 'completed',
      currentArtifactId: 'art-p003-outline',
      startedAt: '2026-11-06T10:10:00+08:00',
      completedAt: '2026-11-06T10:45:00+08:00',
      inputRefs: [ref('mat-001', 'requirement'), ref('mat-005', 'template')],
    },
    draft: {
      status: 'completed',
      currentArtifactId: 'art-p003-draft',
      startedAt: '2026-11-06T11:20:00+08:00',
      completedAt: '2026-11-06T16:10:00+08:00',
      inputRefs: [ref('mat-001', 'requirement'), ref('mat-004', 'fact')],
    },
    validation: {
      status: 'completed',
      currentArtifactId: 'art-p003-validation',
      startedAt: '2026-11-06T16:10:00+08:00',
      completedAt: '2026-11-06T16:50:00+08:00',
    },
    delivery: {
      status: 'completed',
      startedAt: '2026-11-06T16:50:00+08:00',
      completedAt: '2026-11-06T17:20:00+08:00',
    },
  });

const createP003FactList = (): FactListPayload => ({
  type: 'fact_list',
  items: [
    {
      id: 'fact-p003-01',
      kind: 'requirement',
      statement: 'F-01：3.2 设备选型未给出具体型号与关键参数，需按设备选型参数表补齐。',
      detail: '审查报告 P002/v1 高优先级问题，修订后须可逐项核对型号与参数。',
      source: {
        documentId: 'doc-p001-v2',
        blockId: 'p1v2-b-21',
        sectionPath: '第 3 章 > 3.2 设备选型与配置',
        quote: '具体型号与关键参数在招标前结合设备选型参数表确定',
      },
      materialReferenceId: 'mref-mat-004-fact',
      status: 'confirmed',
    },
    {
      id: 'fact-p003-02',
      kind: 'requirement',
      statement: 'F-02：运维保障缺少明确的响应时限与备件保障指标。',
      detail: '修订须给出可考核的响应时限与备件储备安排。',
      source: {
        documentId: 'doc-p001-v2',
        blockId: 'p1v2-b-41',
        sectionPath: '第 5 章 > 5.2 服务响应与备件',
        quote: '服务内容包括故障受理、远程支持与现场处理',
      },
      materialReferenceId: 'mref-mat-001-requirement',
      status: 'confirmed',
    },
    {
      id: 'fact-p003-03',
      kind: 'requirement',
      statement: 'F-03：投资构成合计 3 920 万元，超出需求控制额 3 800 万元。',
      detail: '修订须调整分项金额，使合计与控制额一致。',
      source: {
        documentId: 'doc-p001-v2',
        blockId: 'p1v2-b-47',
        sectionPath: '第 6 章 > 6.1 投资构成',
        quote: '超出需求控制额 120 万元',
      },
      materialReferenceId: 'mref-mat-001-requirement',
      status: 'confirmed',
    },
    {
      id: 'fact-p003-04',
      kind: 'requirement',
      statement: 'F-04：视频监控设备参数与设备选型参数表不一致。',
      detail: '摄像机分辨率与存储容量需按参数表表 1、表 2 更正。',
      source: {
        documentId: 'doc-p001-v2',
        blockId: 'p1v2-b-22',
        sectionPath: '第 3 章 > 3.2 设备参数表',
        quote: '200 万像素，23 倍光学变焦，IP66',
      },
      materialReferenceId: 'mref-mat-004-fact',
      status: 'confirmed',
    },
    {
      id: 'fact-p003-05',
      kind: 'fact',
      statement: '设备选型参数表表 1 要求摄像机分辨率不低于 400 万像素，存储单盘不低于 10TB。',
      detail: '修订后的设备参数表须逐项满足该最低要求。',
      source: {
        documentId: 'doc-mat-004',
        blockId: 'm4-b-04',
        sectionPath: '设备选型参数表（节选）',
        quote: '400 万像素，23 倍光学变焦，防护等级 IP66',
      },
      materialReferenceId: 'mref-mat-004-fact',
      status: 'confirmed',
    },
    {
      id: 'fact-p003-06',
      kind: 'assumption',
      statement: '本次修订只调整授权章节，其余章节沿用 V1.1，不重新组织全文。',
      detail: '保持其他章节与 P001/v2 文本一致，便于版本比对。',
      materialReferenceId: 'mref-mat-001-requirement',
      status: 'confirmed',
    },
    {
      id: 'fact-p003-07',
      kind: 'gap',
      statement: '设备选型参数表表 3 仍无法可靠提取，本次修订不涉及存储与服务器采购型号。',
      detail: '表 3 待人工核对后再确定，修订稿明确该限制。',
      materialReferenceId: 'mref-mat-004-fact',
      status: 'missing',
    },
  ],
  openQuestions: ['设备选型参数表表 3 是否需要在招标前补充并人工核对？'],
});

const createP003Outline = (): OutlinePayload => ({
  type: 'outline',
  sections: [
    {
      id: 'outline-p003-01',
      title: '3.2 设备选型与配置',
      purpose: '按设备参数表补齐型号与关键参数，处理 F-01、F-04。',
      requirementRefs: ['需求说明书 5 设备与基础设施要求', '审查报告 F-01 / F-04'],
      basisRefs: ['mat-001', 'mat-004'],
      status: 'confirmed',
      inScope: true,
    },
    {
      id: 'outline-p003-02',
      title: '5 运维保障',
      purpose: '补充服务响应时限与备件清单，处理 F-02。',
      requirementRefs: ['需求说明书 8 验收与交付要求', '审查报告 F-02'],
      basisRefs: ['mat-001'],
      status: 'confirmed',
      inScope: true,
    },
    {
      id: 'outline-p003-03',
      title: '6 投资估算',
      purpose: '调整投资分项使合计与控制额一致，处理 F-03。',
      requirementRefs: ['需求说明书 7 投资与进度要求', '审查报告 F-03'],
      basisRefs: ['mat-001', 'mat-004'],
      status: 'confirmed',
      inScope: true,
    },
    {
      id: 'outline-p003-04',
      title: '1 概述',
      purpose: '保持与 V1.1 一致，不在修订范围。',
      requirementRefs: ['编写模板 1 章节结构'],
      basisRefs: ['mat-005'],
      status: 'confirmed',
      inScope: false,
    },
    {
      id: 'outline-p003-05',
      title: '2 需求理解',
      purpose: '保持与 V1.1 一致，不在修订范围。',
      requirementRefs: ['需求说明书 2 建设目标'],
      basisRefs: ['mat-001'],
      status: 'confirmed',
      inScope: false,
    },
    {
      id: 'outline-p003-06',
      title: '3.1 总体架构',
      purpose: '保持与 V1.1 一致，不在修订范围。',
      requirementRefs: ['需求说明书 4 技术架构要求'],
      basisRefs: ['mat-001'],
      status: 'confirmed',
      inScope: false,
    },
    {
      id: 'outline-p003-07',
      title: '4 详细设计',
      purpose: '保持与 V1.1 一致，不在修订范围。',
      requirementRefs: ['需求说明书 3 建设范围'],
      basisRefs: ['mat-001'],
      status: 'confirmed',
      inScope: false,
    },
    {
      id: 'outline-p003-08',
      title: '7-9 实施、风险与验收',
      purpose: '保持与 V1.1 一致，不在修订范围。',
      requirementRefs: ['需求说明书 8 验收与交付要求'],
      basisRefs: ['mat-001'],
      status: 'confirmed',
      inScope: false,
    },
    {
      id: 'outline-p003-09',
      title: '10 结论与建议',
      purpose: '保持与 V1.1 一致，不在修订范围。',
      requirementRefs: ['需求说明书 2 建设目标'],
      basisRefs: ['mat-001'],
      status: 'confirmed',
      inScope: false,
    },
  ],
  scopeNote: '仅授权修改 3.2、5、6 三章；其他章节标记为只读，保持与 P001/v2 一致。',
});

const createP003Draft = (): DraftPayload => ({
  type: 'draft',
  isPartial: false,
  sections: [
    {
      id: 'draft-p003-s01',
      heading: '3.2 设备选型与配置',
      paragraphs: [
        {
          id: 'draft-p003-01',
          text: '设备选型遵循满足需求、适度冗余、便于运维的原则：前端设备按室外环境选择防护等级不低于 IP65 的型号；网络与存储设备按双电源、双链路设计；核心设备统一品牌，便于备件共用。本次修订已按《设备选型参数表》补齐摄像机、存储与核心交换机的具体型号与关键参数，见 3.2 设备参数表。',
          citationRefs: ['mref-mat-004-fact'],
          change: 'modified',
          previousText:
            '设备选型遵循满足需求、适度冗余、便于运维的原则：前端设备按室外环境选择防护等级不低于 IP65 的型号；网络与存储设备按双电源、双链路设计；核心设备统一品牌，便于备件共用。具体型号与关键参数在招标前结合设备选型参数表确定。',
        },
        {
          id: 'draft-p003-02',
          text: '上述参数已按设备选型参数表逐项核对：摄像机分辨率统一为 400 万像素，存储阵列按单盘 10TB、30 天保存周期重新核算，数量由 4 套调整为 5 套，满足需求说明书要求的存储能力。',
          citationRefs: ['mref-mat-004-fact'],
          change: 'added',
        },
      ],
    },
    {
      id: 'draft-p003-s02',
      heading: '5 运维保障',
      paragraphs: [
        {
          id: 'draft-p003-03',
          text: '项目交付后由建设单位运维团队负责日常运维，承建单位提供不少于 2 年的运维服务。运维内容包括设备巡检、故障处理、软件升级与备件更换，运维组织与服务方式见以下各节。',
          change: 'unchanged',
        },
        {
          id: 'draft-p003-04',
          text: '项目交付前完成两轮培训：第一轮面向运维人员，覆盖平台操作、告警处置与日常巡检；第二轮面向管理人员，覆盖报表使用与权限管理。培训材料与操作手册一并移交。',
          change: 'unchanged',
        },
        {
          id: 'draft-p003-05',
          text: '承建单位提供不少于 2 年的运维服务，服务内容包括故障受理、远程支持与现场处理。服务响应时限如下：重大故障 30 分钟内响应、4 小时内恢复；一般故障 2 小时内响应、24 小时内处理。服务期内按季度提交运维报告，并对重大活动提供保障值守。',
          citationRefs: ['mref-mat-001-requirement'],
          change: 'modified',
          previousText:
            '承建单位提供不少于 2 年的运维服务，服务内容包括故障受理、远程支持与现场处理。服务期内按季度提交运维报告，并对重大活动提供保障值守。',
        },
        {
          id: 'draft-p003-06',
          text: '备件储备按前端设备、通行设备、网络设备、存储与服务器四类清单管理，明确储备数量与存放位置，按季度盘点并补充。',
          change: 'added',
        },
      ],
    },
    {
      id: 'draft-p003-s03',
      heading: '6 投资估算',
      paragraphs: [
        {
          id: 'draft-p003-07',
          text: '本次修订按设备选型调整了设备与安装费用，并核减软件开发与其他费用，投资合计由 3 920 万元调整为 3 800 万元，与需求说明书的投资控制额一致。分项调整明细见下表。',
          citationRefs: ['mref-mat-001-requirement'],
          change: 'modified',
          previousText: '按设备选型参数表核算后，本版本投资构成如下表。',
        },
      ],
    },
  ],
});

const createP003Validation = (): ValidationPayload => ({
  type: 'validation',
  checks: [
    {
      id: 'check-p003-01',
      label: '授权边界检查',
      status: 'pass',
      detail: '差异仅出现在 3.2、5、6 三章，其余章节文本与 P001/v2 一致。',
    },
    {
      id: 'check-p003-02',
      label: '审查问题处理检查',
      status: 'pass',
      detail: 'F-01、F-02、F-03、F-04 四项均有对应的修订内容，处理说明完整。',
    },
    {
      id: 'check-p003-03',
      label: '设备参数可追溯性',
      status: 'pass',
      detail: '设备型号与关键参数逐项对应设备选型参数表表 1、表 2。',
    },
    {
      id: 'check-p003-04',
      label: '投资控制额检查',
      status: 'pass',
      detail: '投资构成合计 3 800 万元，与需求说明书控制额一致。',
    },
    {
      id: 'check-p003-05',
      label: '文件可读性检查',
      status: 'warn',
      detail: '设备选型参数表表 3 仍无法可靠提取，修订稿已说明不涉及该部分采购型号。',
    },
    {
      id: 'check-p003-06',
      label: '章节完整性检查',
      status: 'pass',
      detail: '10 章结构完整，段落与表格编号连续，修订标记可追溯。',
    },
  ],
  openItems: ['设备选型参数表表 3 待人工核对后再确定存储与服务器型号。'],
});

export const createP003Artifacts = (): StageArtifact[] => [
  {
    id: 'art-p003-facts',
    packageId: 'pkg-003',
    stageId: seedStageId('pkg-003', 'facts'),
    kind: 'fact_list',
    revision: 1,
    status: 'confirmed',
    title: '事实与要求清单',
    updatedAt: '2026-11-06T09:58:00+08:00',
    updatedBy: currentUser(),
    summary: '整理 7 条修订依据，覆盖 F-01、F-02、F-03、F-04 及授权边界。',
    basedOn: [ref('mat-001', 'requirement'), ref('mat-004', 'fact')],
    payload: createP003FactList(),
  },
  {
    id: 'art-p003-outline',
    packageId: 'pkg-003',
    stageId: seedStageId('pkg-003', 'plan'),
    kind: 'outline',
    revision: 1,
    status: 'confirmed',
    title: '大纲与修改计划',
    updatedAt: '2026-11-06T10:45:00+08:00',
    updatedBy: currentUser(),
    summary: '3.2、5、6 标记为授权修改范围，其余章节标记为只读不修改。',
    basedOn: [ref('mat-001', 'requirement'), ref('mat-004', 'fact'), ref('mat-005', 'template')],
    payload: createP003Outline(),
  },
  {
    id: 'art-p003-draft',
    packageId: 'pkg-003',
    stageId: seedStageId('pkg-003', 'draft'),
    kind: 'draft',
    revision: 1,
    status: 'confirmed',
    title: '工作草稿',
    updatedAt: '2026-11-06T16:10:00+08:00',
    updatedBy: currentUser(),
    summary: '三个授权章节的修订候选，包含局部修改标记、原文与新增内容。',
    basedOn: [ref('mat-001', 'requirement'), ref('mat-004', 'fact')],
    payload: createP003Draft(),
  },
  {
    id: 'art-p003-validation',
    packageId: 'pkg-003',
    stageId: seedStageId('pkg-003', 'validation'),
    kind: 'validation',
    revision: 1,
    status: 'confirmed',
    title: '校验结果',
    updatedAt: '2026-11-06T16:50:00+08:00',
    updatedBy: currentUser(),
    summary: '6 项校验中 5 项通过、1 项警告：设备参数表表 3 仍不可读。',
    basedOn: [ref('mat-001', 'requirement'), ref('mat-004', 'fact')],
    payload: createP003Validation(),
  },
];

export const createP003Versions = (): PackageVersion[] => [
  {
    id: 'ver-p003-v1',
    packageId: 'pkg-003',
    projectId: 'prj-001',
    versionNumber: 1,
    label: 'P003/v1',
    status: 'delivered',
    createdAt: '2026-11-06T17:20:00+08:00',
    createdBy: currentUser(),
    changeNote:
      '依据 P002/v1 审查报告修订 P001/v2：3.2 补齐设备型号与参数，第 5 章补充响应时限与备件清单，第 6 章投资合计调整为 3 800 万元；其余章节与 P001/v2 一致。',
    inputs: [ref('mat-001', 'requirement'), ref('mat-004', 'fact'), ref('mat-005', 'template')],
    artifacts: [
      { artifactId: 'art-p003-facts', revision: 1, title: '事实与要求清单', kind: 'fact_list' },
      { artifactId: 'art-p003-outline', revision: 1, title: '大纲与修改计划', kind: 'outline' },
      { artifactId: 'art-p003-draft', revision: 1, title: '工作草稿', kind: 'draft' },
      { artifactId: 'art-p003-validation', revision: 1, title: '校验结果', kind: 'validation' },
    ],
    deliverable: {
      id: 'del-p003-v1',
      kind: 'document',
      title: '智慧园区技术方案（一期）V1.2（修订稿）',
      fileName: 'P003-智慧园区技术方案（一期）V1.2（修订稿）.docx',
      format: 'docx',
      pageCount: 102,
      simulatedFile: true,
      document: createP003V1Document(),
    },
    confirmations: [
      {
        id: 'conf-p003-v1-01',
        label: '修订稿 V1.2 已确认',
        confirmedBy: currentUser(),
        confirmedAt: '2026-11-06T17:20:00+08:00',
        artifactId: 'art-p003-validation',
      },
    ],
  },
];

export const createP003Package = (): ArtifactPackage => ({
  id: 'pkg-003',
  code: 'P003',
  projectId: 'prj-001',
  title: '方案修订（按审查意见）',
  task: createP003Task(),
  status: 'delivered',
  primaryConversationId: 'conv-p003',
  versionIds: ['ver-p003-v1'],
  stageIds: ['goal', 'facts', 'retrieval', 'plan', 'draft', 'validation', 'delivery'].map((key) =>
    seedStageId('pkg-003', key)
  ),
  createdAt: '2026-11-06T09:20:00+08:00',
  updatedAt: '2026-11-06T17:20:00+08:00',
  createdBy: currentUser(),
  executionId: 'exec-p003',
  statusHistory: [
    { status: 'draft', at: '2026-11-06T09:20:00+08:00', note: '从审查报告创建修订任务' },
    { status: 'in_progress', at: '2026-11-06T09:25:00+08:00' },
    { status: 'delivered', at: '2026-11-06T17:20:00+08:00', note: 'P003/v1 修订稿正式交付' },
  ],
});

export const createP003Conversation = (): Conversation => ({
  id: 'conv-p003',
  packageId: 'pkg-003',
  title: '方案修订会话',
  createdAt: '2026-11-06T09:22:00+08:00',
  messageIds: [
    'msg-p003-01',
    'msg-p003-02',
    'msg-p003-03',
    'msg-p003-04',
    'msg-p003-05',
    'msg-p003-06',
    'msg-p003-07',
    'msg-p003-08',
  ],
});

export const createP003Messages = (): ConversationMessage[] => [
  {
    id: 'msg-p003-01',
    conversationId: 'conv-p003',
    role: 'user',
    text: '按 P002/v1 审查报告创建修订任务，只改 3.2、5、6 三章，重点处理 F-01、F-02、F-04，投资按 F-03 核对。',
    createdAt: '2026-11-06T09:22:00+08:00',
    author: currentUser(),
    stageKey: 'goal',
  },
  {
    id: 'msg-p003-02',
    conversationId: 'conv-p003',
    role: 'system',
    text: '阶段『目标与材料理解』开始：读取审查报告 P002/v1、技术方案 P001/v2 与设备选型参数表。',
    createdAt: '2026-11-06T09:25:00+08:00',
    stageKey: 'goal',
  },
  {
    id: 'msg-p003-03',
    conversationId: 'conv-p003',
    role: 'assistant',
    text: '演示模拟执行：已整理 7 条修订依据，其中 F-01、F-02、F-04 为优先处理项；设备参数表表 3 仍无法可靠提取，本次不涉及存储与服务器选型。',
    createdAt: '2026-11-06T09:58:00+08:00',
    author: demoAgentUser(),
    stageKey: 'facts',
    simulated: true,
    attachmentIds: ['art-p003-facts'],
  },
  {
    id: 'msg-p003-04',
    conversationId: 'conv-p003',
    role: 'system',
    text: '阶段『大纲或修改计划』开始：生成仅覆盖授权章节的修改计划。',
    createdAt: '2026-11-06T10:10:00+08:00',
    stageKey: 'plan',
  },
  {
    id: 'msg-p003-05',
    conversationId: 'conv-p003',
    role: 'assistant',
    text: '演示模拟执行：修改计划已生成，3.2、5、6 标记为授权范围，其余章节标记为只读不修改。',
    createdAt: '2026-11-06T10:45:00+08:00',
    author: demoAgentUser(),
    stageKey: 'plan',
    simulated: true,
    attachmentIds: ['art-p003-outline'],
  },
  {
    id: 'msg-p003-06',
    conversationId: 'conv-p003',
    role: 'user',
    text: '校验通过后提交修订稿 V1.2。',
    createdAt: '2026-11-06T16:15:00+08:00',
    author: currentUser(),
    stageKey: 'validation',
  },
  {
    id: 'msg-p003-07',
    conversationId: 'conv-p003',
    role: 'system',
    text: '阶段『校验』完成：授权边界、设备参数可追溯性与投资控制额检查通过；表 3 不可读保留为限制。',
    createdAt: '2026-11-06T16:50:00+08:00',
    stageKey: 'validation',
  },
  {
    id: 'msg-p003-08',
    conversationId: 'conv-p003',
    role: 'assistant',
    text: '演示模拟执行：修订稿 V1.2 已提交，仅修改授权章节，其余章节与 P001/v2 保持一致。',
    createdAt: '2026-11-06T17:20:00+08:00',
    author: demoAgentUser(),
    simulated: true,
    attachmentIds: ['ver-p003-v1'],
  },
];

export const createP003Execution = (): ExecutionRun => ({
  id: 'exec-p003',
  packageId: 'pkg-003',
  status: 'completed',
  currentStageKey: 'delivery',
  startedAt: '2026-11-06T09:25:00+08:00',
  updatedAt: '2026-11-06T17:20:00+08:00',
  activity: '修订稿 P003/v1 已提交',
  inputVersionIds: ['mv-001-1', 'mv-004-1'],
  events: [
    { id: 'evt-p003-01', type: 'queued', at: '2026-11-06T09:20:00+08:00', label: '运行已排队' },
    { id: 'evt-p003-02', type: 'stage_started', at: '2026-11-06T09:25:00+08:00', label: '阶段『目标与材料理解』开始' },
    { id: 'evt-p003-03', type: 'artifact_candidate', at: '2026-11-06T09:58:00+08:00', label: '生成修订依据清单候选' },
    {
      id: 'evt-p003-04',
      type: 'artifact_candidate',
      at: '2026-11-06T10:45:00+08:00',
      label: '生成授权范围内的修改计划',
    },
    { id: 'evt-p003-05', type: 'stage_started', at: '2026-11-06T11:20:00+08:00', label: '阶段『草稿编制』开始' },
    {
      id: 'evt-p003-06',
      type: 'progress',
      at: '2026-11-06T15:40:00+08:00',
      label: '授权章节修订完成，其余章节保持只读',
    },
    { id: 'evt-p003-07', type: 'stage_started', at: '2026-11-06T16:10:00+08:00', label: '阶段『校验』开始' },
    { id: 'evt-p003-08', type: 'completed', at: '2026-11-06T17:20:00+08:00', label: '修订稿 P003/v1 已提交' },
  ],
});
