/**
 * Compare-loop package P004: P001/v2 (baseline) vs P003/v1 (target).
 *
 * Mappings and differences reference block ids that really exist in both
 * delivered documents; the report payload repeats the machine-readable stats.
 */
import type {
  ArtifactPackage,
  ComparisonReportPayload,
  Conversation,
  ConversationMessage,
  DifferencesPayload,
  ExecutionRun,
  MappingPayload,
  PackageVersion,
  SectionMapping,
  Stage,
  StageArtifact,
  Task,
} from '../../domain/types';
import { createP004ReportDocument } from './reportDocs';
import { currentUser, demoAgentUser } from './users';
import { versionRef } from './refs';
import { buildStages, seedStageId } from './stageBuilders';

export const createP004Task = (): Task => ({
  id: 'task-p004',
  kind: 'compare',
  goal: '比对 P001/v2 与 P003/v1，输出可追溯的差异清单与比对报告，仅描述实际变化。',
  requirements: [
    '基准版本为 P001/v2，目标版本为 P003/v1。',
    '先建立章节与段落对应关系，再提取差异。',
    '差异须引用两端真实存在的原文位置。',
    '无法确认的对应单独标记，不作为确定性差异。',
  ],
  createdAt: '2026-11-09T09:30:00+08:00',
});

export const createP004Stages = (): Stage[] =>
  buildStages('pkg-004', 'compare', [], {
    versions: {
      status: 'completed',
      startedAt: '2026-11-09T09:35:00+08:00',
      completedAt: '2026-11-09T09:50:00+08:00',
    },
    mapping: {
      status: 'completed',
      currentArtifactId: 'art-p004-mapping',
      startedAt: '2026-11-09T09:50:00+08:00',
      completedAt: '2026-11-09T10:40:00+08:00',
    },
    extraction: {
      status: 'completed',
      currentArtifactId: 'art-p004-differences',
      startedAt: '2026-11-09T10:40:00+08:00',
      completedAt: '2026-11-09T13:20:00+08:00',
    },
    explanation: {
      status: 'completed',
      startedAt: '2026-11-09T13:20:00+08:00',
      completedAt: '2026-11-09T14:30:00+08:00',
    },
    recheck: {
      status: 'completed',
      startedAt: '2026-11-09T14:30:00+08:00',
      completedAt: '2026-11-09T15:10:00+08:00',
    },
    report: {
      status: 'completed',
      currentArtifactId: 'art-p004-report',
      startedAt: '2026-11-09T15:10:00+08:00',
      completedAt: '2026-11-09T15:40:00+08:00',
    },
  });

const createP004Mappings = (): SectionMapping[] => [
  {
    id: 'map-p004-01',
    baseBlockId: 'p1v2-b-03',
    targetBlockId: 'p3v1-b-03',
    baseTitle: '1 概述',
    targetTitle: '1 概述',
    confidence: 'confirmed',
  },
  {
    id: 'map-p004-02',
    baseBlockId: 'p1v2-b-08',
    targetBlockId: 'p3v1-b-08',
    baseTitle: '2 需求理解',
    targetTitle: '2 需求理解',
    confidence: 'confirmed',
  },
  {
    id: 'map-p004-03',
    baseBlockId: 'p1v2-b-15',
    targetBlockId: 'p3v1-b-15',
    baseTitle: '3 总体设计',
    targetTitle: '3 总体设计',
    confidence: 'confirmed',
  },
  {
    id: 'map-p004-04',
    baseBlockId: 'p1v2-b-21',
    targetBlockId: 'p3v1-b-21',
    baseTitle: '3.2 设备选型与配置（选型原则）',
    targetTitle: '3.2 设备选型与配置（选型原则）',
    confidence: 'confirmed',
    note: '修订段在原文基础上补充型号与参数说明。',
  },
  {
    id: 'map-p004-05',
    baseBlockId: 'p1v2-b-22',
    targetBlockId: 'p3v1-b-22',
    baseTitle: '3.2 视频监控设备参数表',
    targetTitle: '3.2 视频监控设备参数表',
    confidence: 'confirmed',
    note: '表结构一致，部分行参数被更正。',
  },
  {
    id: 'map-p004-06',
    baseBlockId: 'p1v2-b-25',
    targetBlockId: 'p3v1-b-25',
    baseTitle: '4 详细设计',
    targetTitle: '4 详细设计',
    confidence: 'confirmed',
  },
  {
    id: 'map-p004-07',
    baseBlockId: 'p1v2-b-35',
    targetBlockId: 'p3v1-b-35',
    baseTitle: '5 运维保障',
    targetTitle: '5 运维保障',
    confidence: 'confirmed',
  },
  {
    id: 'map-p004-08',
    baseBlockId: 'p1v2-b-41',
    targetBlockId: 'p3v1-b-42',
    baseTitle: '5.2 服务响应段',
    targetTitle: '5.2 服务响应段',
    confidence: 'confirmed',
    note: '目标段落在原文基础上补充了响应与恢复时限。',
  },
  {
    id: 'map-p004-09',
    baseBlockId: 'p1v2-b-43',
    targetBlockId: 'p3v1-b-40',
    baseTitle: '5.2 培训与知识转移段',
    targetTitle: '5.1 培训与知识转移段',
    confidence: 'candidate',
    note: '段落文本一致，但位置从 5.2 移动到 5.1 末尾。',
  },
  {
    id: 'map-p004-10',
    baseBlockId: 'p1v2-b-42',
    targetBlockId: 'p3v1-b-43',
    baseTitle: '5.2 备件范围（列表）',
    targetTitle: '5.2 备件清单（表格）',
    confidence: 'uncertain',
    note: '列表与表格的结构不同，内容无法逐项对应。',
  },
  {
    id: 'map-p004-11',
    baseBlockId: 'p1v2-b-44',
    targetBlockId: 'p3v1-b-44',
    baseTitle: '6 投资估算',
    targetTitle: '6 投资估算',
    confidence: 'confirmed',
  },
  {
    id: 'map-p004-12',
    baseBlockId: 'p1v2-b-47',
    targetBlockId: 'p3v1-b-48',
    baseTitle: '6.1 投资构成表',
    targetTitle: '6.1 投资构成表',
    confidence: 'confirmed',
    note: '表结构一致，行金额与合计被调整。',
  },
  {
    id: 'map-p004-13',
    baseBlockId: 'p1v2-b-50',
    targetBlockId: 'p3v1-b-51',
    baseTitle: '7 实施计划',
    targetTitle: '7 实施计划',
    confidence: 'confirmed',
  },
  {
    id: 'map-p004-14',
    baseBlockId: 'p1v2-b-53',
    targetBlockId: 'p3v1-b-54',
    baseTitle: '8 风险与应对',
    targetTitle: '8 风险与应对',
    confidence: 'confirmed',
  },
  {
    id: 'map-p004-15',
    baseBlockId: 'p1v2-b-55',
    targetBlockId: 'p3v1-b-56',
    baseTitle: '9 验收与交付',
    targetTitle: '9 验收与交付',
    confidence: 'confirmed',
  },
  {
    id: 'map-p004-16',
    baseBlockId: 'p1v2-b-58',
    targetBlockId: 'p3v1-b-59',
    baseTitle: '10 结论与建议',
    targetTitle: '10 结论与建议',
    confidence: 'confirmed',
  },
];

const createP004MappingPayload = (): MappingPayload => ({
  type: 'mapping',
  mappings: createP004Mappings(),
  unmatchedBase: ['3.2 设备参数说明段（V1.1）'],
  unmatchedTarget: ['3.2 参数核算说明段（V1.2 新增）', '6.1 投资控制额对齐说明段（V1.2 新增）'],
});

const createP004DifferencesPayload = (): DifferencesPayload => ({
  type: 'differences',
  scopeNote: '比对范围为两版全文，基准 P001/v2、目标 P003/v1；差异仅描述文本变化，不作缺陷定性。',
  differences: [
    {
      id: 'diff-p004-01',
      code: 'D-01',
      kind: 'modified',
      summary: '3.2 选型原则段补充了具体型号与关键参数说明',
      detail:
        '修订段在原有选型原则后补充了按设备选型参数表补齐型号与参数的说明，并指向 3.2 设备参数表；其余表述保持一致。',
      baseLocation: {
        documentId: 'doc-p001-v2',
        blockId: 'p1v2-b-21',
        sectionPath: '第 3 章 > 3.2 设备选型与配置',
        quote: '具体型号与关键参数在招标前结合设备选型参数表确定',
      },
      targetLocation: {
        documentId: 'doc-p003-v1',
        blockId: 'p3v1-b-21',
        sectionPath: '第 3 章 > 3.2 设备选型与配置',
        quote: '本次修订已按《设备选型参数表》补齐摄像机、存储与核心交换机的具体型号与关键参数',
      },
      baseText: '具体型号与关键参数在招标前结合设备选型参数表确定。',
      targetText: '本次修订已按《设备选型参数表》补齐摄像机、存储与核心交换机的具体型号与关键参数，见 3.2 设备参数表。',
      mappingId: 'map-p004-04',
      confidence: 'confirmed',
    },
    {
      id: 'diff-p004-02',
      code: 'D-02',
      kind: 'modified',
      summary: '视频监控设备参数表按参数表更正分辨率、存储容量与数量',
      detail:
        '球型摄像机由 200 万像素更正为 400 万像素；存储阵列单盘容量由 8TB 调整为 10TB，数量由 4 套调整为 5 套；部分型号后缀同步更新。',
      baseLocation: {
        documentId: 'doc-p001-v2',
        blockId: 'p1v2-b-22',
        sectionPath: '第 3 章 > 3.2 设备参数表',
        quote: '200 万像素，23 倍光学变焦，IP66',
      },
      targetLocation: {
        documentId: 'doc-p003-v1',
        blockId: 'p3v1-b-22',
        sectionPath: '第 3 章 > 3.2 设备参数表',
        quote: '400 万像素，23 倍光学变焦，IP66',
      },
      baseText: '室外球型摄像机 DS-2DC7423IW：200 万像素；视频存储阵列 DS-A72048R：单盘 8TB，4 套。',
      targetText: '室外球型摄像机 DS-2DC7423IW-A：400 万像素；视频存储阵列 DS-A72048R：单盘 10TB，5 套。',
      mappingId: 'map-p004-05',
      confidence: 'confirmed',
    },
    {
      id: 'diff-p004-03',
      code: 'D-03',
      kind: 'added',
      summary: '3.2 新增参数核对说明段',
      detail: '新增段落说明摄像机分辨率、存储容量与数量的核对结果，并引用设备选型参数表。',
      targetLocation: {
        documentId: 'doc-p003-v1',
        blockId: 'p3v1-b-24',
        sectionPath: '第 3 章 > 3.2 设备选型与配置',
        quote: '上述参数已按设备选型参数表逐项核对',
      },
      targetText:
        '上述参数已按设备选型参数表逐项核对：摄像机分辨率统一为 400 万像素，存储阵列按单盘 10TB、30 天保存周期重新核算。',
      confidence: 'confirmed',
    },
    {
      id: 'diff-p004-04',
      code: 'D-04',
      kind: 'removed',
      summary: 'V1.1 中表 3 待确认说明段被删除',
      detail: '原段落说明表 3 无法提取、待招标前确认；修订后参数已核对，段落不再适用，因此移除。',
      baseLocation: {
        documentId: 'doc-p001-v2',
        blockId: 'p1v2-b-24',
        sectionPath: '第 3 章 > 3.2 设备选型与配置',
        quote: '具体型号待招标前确认',
      },
      baseText: '说明：存储与服务器部分参数（表 3）因设备参数表合并单元格无法可靠提取，具体型号待招标前确认。',
      confidence: 'confirmed',
    },
    {
      id: 'diff-p004-05',
      code: 'D-05',
      kind: 'modified',
      summary: '5.2 服务响应段补充了分级响应与恢复时限',
      detail: '新增重大故障 30 分钟响应、4 小时恢复，一般故障 2 小时响应、24 小时内处理的时限要求。',
      baseLocation: {
        documentId: 'doc-p001-v2',
        blockId: 'p1v2-b-41',
        sectionPath: '第 5 章 > 5.2 服务响应与备件',
        quote: '服务内容包括故障受理、远程支持与现场处理',
      },
      targetLocation: {
        documentId: 'doc-p003-v1',
        blockId: 'p3v1-b-42',
        sectionPath: '第 5 章 > 5.2 服务响应与备件',
        quote: '重大故障 30 分钟内响应、4 小时内恢复；一般故障 2 小时内响应、24 小时内处理',
      },
      baseText: '承建单位提供不少于 2 年的运维服务，服务内容包括故障受理、远程支持与现场处理。',
      targetText:
        '承建单位提供不少于 2 年的运维服务，服务内容包括故障受理、远程支持与现场处理。服务响应时限如下：重大故障 30 分钟内响应、4 小时内恢复；一般故障 2 小时内响应、24 小时内处理。',
      mappingId: 'map-p004-08',
      confidence: 'confirmed',
    },
    {
      id: 'diff-p004-06',
      code: 'D-06',
      kind: 'moved',
      summary: '培训与知识转移段由 5.2 移至 5.1 末尾',
      detail: '段落文本未变化，位置由服务响应与备件一节移动到运维组织与职责一节末尾，用于对应组织职责相关要求。',
      baseLocation: {
        documentId: 'doc-p001-v2',
        blockId: 'p1v2-b-43',
        sectionPath: '第 5 章 > 5.2 服务响应与备件',
        quote: '项目交付前完成两轮培训',
      },
      targetLocation: {
        documentId: 'doc-p003-v1',
        blockId: 'p3v1-b-40',
        sectionPath: '第 5 章 > 5.1 运维组织与职责',
        quote: '项目交付前完成两轮培训',
      },
      baseText: '项目交付前完成两轮培训：第一轮面向运维人员，第二轮面向管理人员。',
      targetText: '项目交付前完成两轮培训：第一轮面向运维人员，第二轮面向管理人员。',
      mappingId: 'map-p004-09',
      confidence: 'candidate',
    },
    {
      id: 'diff-p004-07',
      code: 'D-07',
      kind: 'uncertain',
      summary: '备件范围列表与备件清单表无法一一对应',
      detail: 'V1.1 的 4 项备件范围列表被 V1.2 的 4 行备件清单表格替代，分类与数量无法逐项对应，需人工确认是否等价。',
      baseLocation: {
        documentId: 'doc-p001-v2',
        blockId: 'p1v2-b-42',
        sectionPath: '第 5 章 > 5.2 服务响应与备件',
        quote: '常用前端摄像机与电源适配器',
      },
      targetLocation: {
        documentId: 'doc-p003-v1',
        blockId: 'p3v1-b-43',
        sectionPath: '第 5 章 > 5.2 服务响应与备件',
        quote: '室外球机、枪机、半球摄像机',
      },
      baseText:
        '备件范围：常用前端摄像机与电源适配器、门禁读头与道闸控制板、接入交换机与光模块、存储硬盘与边缘节点电源模块。',
      targetText: '备件清单表：前端设备、通行设备、网络设备、存储与服务器四类，并给出储备数量与存放位置。',
      mappingId: 'map-p004-10',
      confidence: 'uncertain',
    },
    {
      id: 'diff-p004-08',
      code: 'D-08',
      kind: 'modified',
      summary: '6.1 投资构成表金额与合计调整',
      detail:
        '设备与安装、软件开发、网络与机房改造、运维服务及其他费用分项均调整，合计由 3 920 万元调整为 3 800 万元。',
      baseLocation: {
        documentId: 'doc-p001-v2',
        blockId: 'p1v2-b-47',
        sectionPath: '第 6 章 > 6.1 投资构成',
        quote: '超出需求控制额 120 万元',
      },
      targetLocation: {
        documentId: 'doc-p003-v1',
        blockId: 'p3v1-b-48',
        sectionPath: '第 6 章 > 6.1 投资构成',
        quote: '与需求控制额一致',
      },
      baseText:
        '设备与安装 2 486 万元、软件开发 640 万元、网络与机房改造 312 万元、运维服务 290 万元、其他费用 192 万元，合计 3 920 万元。',
      targetText:
        '设备与安装 2 446 万元、软件开发 620 万元、网络与机房改造 300 万元、运维服务 278 万元、其他费用 156 万元，合计 3 800 万元。',
      mappingId: 'map-p004-12',
      confidence: 'confirmed',
    },
    {
      id: 'diff-p004-09',
      code: 'D-09',
      kind: 'added',
      summary: '6.1 新增投资控制额对齐说明段',
      detail: '新增段落说明分项调整与控制额对齐情况，并指明调整明细见投资构成表。',
      targetLocation: {
        documentId: 'doc-p003-v1',
        blockId: 'p3v1-b-47',
        sectionPath: '第 6 章 > 6.1 投资构成',
        quote: '投资合计由 3 920 万元调整为 3 800 万元',
      },
      targetText:
        '本次修订按设备选型调整了设备与安装费用，并核减软件开发与其他费用，投资合计由 3 920 万元调整为 3 800 万元。',
      confidence: 'confirmed',
    },
  ],
});

const createP004ReportPayload = (): ComparisonReportPayload => ({
  type: 'comparison_report',
  summary:
    '两版差异集中在授权的 3.2、5、6 三章：确定性差异 8 处、无法确认的对应 1 处；其余章节文本一致。差异方向与审查意见 F-01、F-02、F-03、F-04 的修订要求吻合。',
  differenceStats: {
    added: 2,
    removed: 1,
    modified: 4,
    moved: 1,
    uncertain: 1,
  },
  limitations: [
    '5.2 备件内容由列表调整为表格，无法确认与原列表的一一对应关系。',
    '培训与知识转移段发生位置移动，按文本相似度标记为候选对应，需人工确认。',
    '本次比对只比较文档文本，不判断修订是否满足审查意见，也不验证投资数据。',
  ],
  inputs: [
    { ref: versionRef('ver-p001-v2'), role: 'baseline' },
    { ref: versionRef('ver-p003-v1'), role: 'target' },
  ],
});

export const createP004Artifacts = (): StageArtifact[] => [
  {
    id: 'art-p004-mapping',
    packageId: 'pkg-004',
    stageId: seedStageId('pkg-004', 'mapping'),
    kind: 'mapping',
    revision: 1,
    status: 'confirmed',
    title: '对应关系表',
    updatedAt: '2026-11-09T10:40:00+08:00',
    updatedBy: currentUser(),
    summary: '建立 16 组章节/段落对应关系：14 组已确认或候选、1 组无法确认、2 处单侧存在。',
    basedOn: [],
    payload: createP004MappingPayload(),
  },
  {
    id: 'art-p004-differences',
    packageId: 'pkg-004',
    stageId: seedStageId('pkg-004', 'extraction'),
    kind: 'differences',
    revision: 1,
    status: 'confirmed',
    title: '差异清单',
    updatedAt: '2026-11-09T13:20:00+08:00',
    updatedBy: currentUser(),
    summary: '共 9 处差异：新增 2、删除 1、修改 4、移动 1、无法确认 1；全部引用两端原文位置。',
    basedOn: [],
    payload: createP004DifferencesPayload(),
  },
  {
    id: 'art-p004-report',
    packageId: 'pkg-004',
    stageId: seedStageId('pkg-004', 'report'),
    kind: 'comparison_report',
    revision: 1,
    status: 'confirmed',
    title: '比对报告',
    updatedAt: '2026-11-09T15:40:00+08:00',
    updatedBy: currentUser(),
    summary: '报告汇总 9 处差异与 3 条限制，冻结基准 P001/v2 与目标 P003/v1。',
    basedOn: [],
    payload: createP004ReportPayload(),
  },
];

export const createP004Versions = (): PackageVersion[] => [
  {
    id: 'ver-p004-v1',
    packageId: 'pkg-004',
    projectId: 'prj-001',
    versionNumber: 1,
    label: 'P004/v1',
    status: 'delivered',
    createdAt: '2026-11-09T15:50:00+08:00',
    createdBy: currentUser(),
    changeNote:
      '比对报告首次交付：9 处差异（新增 2、删除 1、修改 4、移动 1、无法确认 1），冻结基准 P001/v2 与目标 P003/v1。',
    inputs: [],
    artifacts: [
      { artifactId: 'art-p004-mapping', revision: 1, title: '对应关系表', kind: 'mapping' },
      { artifactId: 'art-p004-differences', revision: 1, title: '差异清单', kind: 'differences' },
      { artifactId: 'art-p004-report', revision: 1, title: '比对报告', kind: 'comparison_report' },
    ],
    deliverable: {
      id: 'del-p004-v1',
      kind: 'comparison_report',
      title: 'P001/v2 与 P003/v1 方案修订前后比对报告',
      fileName: 'P004-方案修订前后比对报告.md',
      format: 'report',
      pageCount: 24,
      simulatedFile: true,
      document: createP004ReportDocument(),
    },
    confirmations: [
      {
        id: 'conf-p004-v1-01',
        label: '比对报告已确认',
        confirmedBy: currentUser(),
        confirmedAt: '2026-11-09T15:48:00+08:00',
        artifactId: 'art-p004-report',
      },
    ],
  },
];

export const createP004Package = (): ArtifactPackage => ({
  id: 'pkg-004',
  code: 'P004',
  projectId: 'prj-001',
  title: '方案修订前后比对',
  task: createP004Task(),
  status: 'delivered',
  primaryConversationId: 'conv-p004',
  comparisonInputs: [
    { versionId: 'ver-p001-v2', role: 'baseline' },
    { versionId: 'ver-p003-v1', role: 'target' },
  ],
  versionIds: ['ver-p004-v1'],
  stageIds: ['versions', 'mapping', 'extraction', 'explanation', 'recheck', 'report'].map((key) =>
    seedStageId('pkg-004', key)
  ),
  createdAt: '2026-11-09T09:30:00+08:00',
  updatedAt: '2026-11-09T15:50:00+08:00',
  createdBy: currentUser(),
  executionId: 'exec-p004',
  statusHistory: [
    { status: 'draft', at: '2026-11-09T09:30:00+08:00', note: '创建比对任务' },
    { status: 'in_progress', at: '2026-11-09T09:35:00+08:00' },
    { status: 'delivered', at: '2026-11-09T15:50:00+08:00', note: 'P004/v1 比对报告正式交付' },
  ],
});

export const createP004Conversation = (): Conversation => ({
  id: 'conv-p004',
  packageId: 'pkg-004',
  title: '方案修订前后比对会话',
  createdAt: '2026-11-09T09:32:00+08:00',
  messageIds: ['msg-p004-01', 'msg-p004-02', 'msg-p004-03', 'msg-p004-04', 'msg-p004-05', 'msg-p004-06', 'msg-p004-07'],
});

export const createP004Messages = (): ConversationMessage[] => [
  {
    id: 'msg-p004-01',
    conversationId: 'conv-p004',
    role: 'user',
    text: '比对 P001/v2 和 P003/v1，看看修订改了哪些地方，重点核对是否只动了授权章节。',
    createdAt: '2026-11-09T09:32:00+08:00',
    author: currentUser(),
    stageKey: 'versions',
  },
  {
    id: 'msg-p004-02',
    conversationId: 'conv-p004',
    role: 'system',
    text: '阶段『版本与范围确定』开始：锁定基准 P001/v2、目标 P003/v1，比较方向为基准→目标。',
    createdAt: '2026-11-09T09:35:00+08:00',
    stageKey: 'versions',
  },
  {
    id: 'msg-p004-03',
    conversationId: 'conv-p004',
    role: 'assistant',
    text: '演示模拟执行：两版版本已确认，基准与目标均为正式交付版本；将先建立章节对应关系，再提取差异。',
    createdAt: '2026-11-09T09:50:00+08:00',
    author: demoAgentUser(),
    stageKey: 'versions',
    simulated: true,
  },
  {
    id: 'msg-p004-04',
    conversationId: 'conv-p004',
    role: 'system',
    text: '阶段『对应关系建立』生成了候选成果，等待确认：对应关系表。',
    createdAt: '2026-11-09T10:40:00+08:00',
    stageKey: 'mapping',
    attachmentIds: ['art-p004-mapping'],
  },
  {
    id: 'msg-p004-05',
    conversationId: 'conv-p004',
    role: 'assistant',
    text: '演示模拟执行：差异提取完成，共 9 处：新增 2、删除 1、修改 4、移动 1、无法确认 1；差异只出现在 3.2、5、6 三章。',
    createdAt: '2026-11-09T13:20:00+08:00',
    author: demoAgentUser(),
    stageKey: 'extraction',
    simulated: true,
    attachmentIds: ['art-p004-differences'],
  },
  {
    id: 'msg-p004-06',
    conversationId: 'conv-p004',
    role: 'user',
    text: '无法确认的那条先保留，报告里写明需要人工复核。',
    createdAt: '2026-11-09T14:00:00+08:00',
    author: currentUser(),
    stageKey: 'explanation',
  },
  {
    id: 'msg-p004-07',
    conversationId: 'conv-p004',
    role: 'system',
    text: '正式版本 P004/v1 已提交：方案修订前后比对报告。',
    createdAt: '2026-11-09T15:50:00+08:00',
    attachmentIds: ['ver-p004-v1'],
  },
];

export const createP004Execution = (): ExecutionRun => ({
  id: 'exec-p004',
  packageId: 'pkg-004',
  status: 'completed',
  currentStageKey: 'report',
  startedAt: '2026-11-09T09:35:00+08:00',
  updatedAt: '2026-11-09T15:50:00+08:00',
  activity: '比对报告 P004/v1 已提交',
  inputVersionIds: [],
  events: [
    { id: 'evt-p004-01', type: 'queued', at: '2026-11-09T09:30:00+08:00', label: '运行已排队' },
    { id: 'evt-p004-02', type: 'stage_started', at: '2026-11-09T09:35:00+08:00', label: '阶段『版本与范围确定』开始' },
    { id: 'evt-p004-03', type: 'artifact_candidate', at: '2026-11-09T10:40:00+08:00', label: '生成对应关系表候选' },
    { id: 'evt-p004-04', type: 'stage_started', at: '2026-11-09T10:40:00+08:00', label: '阶段『差异提取』开始' },
    {
      id: 'evt-p004-05',
      type: 'artifact_candidate',
      at: '2026-11-09T13:20:00+08:00',
      label: '生成差异清单候选',
      detail: '9 处差异，1 处无法确认',
    },
    { id: 'evt-p004-06', type: 'progress', at: '2026-11-09T14:30:00+08:00', label: '语义说明与差异复核完成' },
    { id: 'evt-p004-07', type: 'artifact_candidate', at: '2026-11-09T15:40:00+08:00', label: '生成比对报告候选' },
    { id: 'evt-p004-08', type: 'completed', at: '2026-11-09T15:50:00+08:00', label: '比对报告 P004/v1 已提交' },
  ],
});
