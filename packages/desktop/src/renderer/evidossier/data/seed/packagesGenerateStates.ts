/**
 * Generate-loop packages with non-delivered business states:
 * P006 paused, P007 failed, P008 awaiting the user's conflict decision.
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
  Stage,
  StageArtifact,
  Task,
  ValidationPayload,
} from '../../domain/types';
import { currentUser, demoAgentUser } from './users';
import { materialRef } from './refs';
import { buildStages, seedStageId } from './stageBuilders';

const ref = (materialId: string, role?: MaterialUsage, note?: string) => materialRef(materialId, role, note);

/* ========================================================================== */
/* P006 园区能耗分析章节补充（暂停）                                            */
/* ========================================================================== */

export const createP006Task = (): Task => ({
  id: 'task-p006',
  kind: 'generate',
  goal: '为智慧园区技术方案补充园区能耗分析章节，形成可并入主文档的章节稿。',
  requirements: [
    '依据需求说明书与勘察记录整理能耗相关事实。',
    '章节需覆盖分区能耗统计、趋势分析与节能建议。',
    '不修改技术方案已交付章节，仅新增章节稿。',
  ],
  createdAt: '2026-11-07T10:00:00+08:00',
});

export const createP006Stages = (): Stage[] =>
  buildStages('pkg-006', 'generate', [ref('mat-001', 'requirement'), ref('mat-002', 'fact')], {
    goal: {
      status: 'completed',
      startedAt: '2026-11-07T10:05:00+08:00',
      completedAt: '2026-11-07T10:18:00+08:00',
    },
    facts: {
      status: 'completed',
      currentArtifactId: 'art-p006-facts',
      startedAt: '2026-11-07T10:18:00+08:00',
      completedAt: '2026-11-07T10:40:00+08:00',
    },
    retrieval: {
      status: 'completed',
      startedAt: '2026-11-07T10:40:00+08:00',
      completedAt: '2026-11-07T10:58:00+08:00',
    },
    plan: {
      status: 'awaiting_confirmation',
      currentArtifactId: 'art-p006-outline',
      startedAt: '2026-11-07T10:58:00+08:00',
      statusNote: '大纲候选已生成，等待用户确认后进入草稿编制。',
    },
  });

const createP006FactList = (): FactListPayload => ({
  type: 'fact_list',
  items: [
    {
      id: 'fact-p006-01',
      kind: 'fact',
      statement: '园区现有电表 126 只、水表 38 只、燃气表 12 只，已具备本地读数功能。',
      source: {
        documentId: 'doc-mat-002',
        blockId: 'm2-b-09',
        sectionPath: '第 3 章 能源与计量',
        quote: '电表 126 只、水表 38 只、燃气表 12 只',
      },
      materialReferenceId: 'mref-mat-002-fact',
      status: 'confirmed',
    },
    {
      id: 'fact-p006-02',
      kind: 'requirement',
      statement: '能源管理要求水、电、气计量集中采集与分析，计量数据完整率不低于 98%。',
      source: {
        documentId: 'doc-mat-001',
        blockId: 'm1-b-09',
        sectionPath: '第 3 章 建设范围',
        quote: '水、电、气计量集中采集与分析',
      },
      materialReferenceId: 'mref-mat-001-requirement',
      status: 'confirmed',
    },
    {
      id: 'fact-p006-03',
      kind: 'requirement',
      statement: '能源数据需按楼栋、楼层与重点设备分区统计，并提供异常用能分析。',
      source: {
        documentId: 'doc-mat-001',
        blockId: 'm1-b-09',
        sectionPath: '第 3 章 建设范围',
        quote: '计量数据完整率不低于 98%',
      },
      materialReferenceId: 'mref-mat-001-requirement',
      status: 'confirmed',
    },
    {
      id: 'fact-p006-04',
      kind: 'gap',
      statement: '既有抄表系统数据采集频率不统一，无法按统一口径直接生成能耗趋势。',
      detail: '章节需说明数据补采与口径统一的前置条件。',
      source: {
        documentId: 'doc-mat-002',
        blockId: 'm2-b-09',
        sectionPath: '第 3 章 能源与计量',
        quote: '数据采集频率不统一',
      },
      materialReferenceId: 'mref-mat-002-fact',
      status: 'pending',
    },
    {
      id: 'fact-p006-05',
      kind: 'assumption',
      statement: '能耗分析章节按楼栋、楼层与重点设备三级维度组织。',
      detail: '维度划分需与运营中心报表口径保持一致。',
      materialReferenceId: 'mref-mat-001-requirement',
      status: 'pending',
    },
  ],
  openQuestions: ['能耗分析所需的历史数据周期由哪一方提供？', '费用分摊是否纳入本章节范围？'],
});

const createP006Outline = (): OutlinePayload => ({
  type: 'outline',
  sections: [
    {
      id: 'outline-p006-01',
      title: '能耗分析范围与数据来源',
      purpose: '说明数据来源、计量范围与数据质量前置条件。',
      requirementRefs: ['需求说明书 3 建设范围'],
      basisRefs: ['mat-001', 'mat-002'],
      status: 'confirmed',
    },
    {
      id: 'outline-p006-02',
      title: '分区能耗统计',
      purpose: '按楼栋、楼层与重点设备给出版统计口径。',
      requirementRefs: ['需求说明书 3 建设范围'],
      basisRefs: ['mat-001', 'mat-002'],
      status: 'planned',
    },
    {
      id: 'outline-p006-03',
      title: '能耗趋势与异常识别',
      purpose: '说明趋势分析、异常用能识别与告警规则。',
      requirementRefs: ['需求说明书 3 建设范围'],
      basisRefs: ['mat-002'],
      status: 'needs_review',
    },
    {
      id: 'outline-p006-04',
      title: '节能建议与费用分摊',
      purpose: '给出节能建议与费用分摊的分析口径。',
      requirementRefs: ['需求说明书 3 建设范围'],
      basisRefs: ['mat-001'],
      status: 'planned',
    },
  ],
  scopeNote: '本章节作为技术方案补充章节，确认后并入主文档，不修改已交付章节。',
});

export const createP006Artifacts = (): StageArtifact[] => [
  {
    id: 'art-p006-facts',
    packageId: 'pkg-006',
    stageId: seedStageId('pkg-006', 'facts'),
    kind: 'fact_list',
    revision: 1,
    status: 'confirmed',
    title: '事实与要求清单',
    updatedAt: '2026-11-07T10:40:00+08:00',
    updatedBy: currentUser(),
    summary: '整理 5 条能耗相关事实与要求，另有 2 个待确认问题。',
    basedOn: [ref('mat-001', 'requirement'), ref('mat-002', 'fact')],
    payload: createP006FactList(),
  },
  {
    id: 'art-p006-outline',
    packageId: 'pkg-006',
    stageId: seedStageId('pkg-006', 'plan'),
    kind: 'outline',
    revision: 1,
    status: 'pending_confirmation',
    title: '大纲与修改计划',
    updatedAt: '2026-11-07T11:05:00+08:00',
    updatedBy: currentUser(),
    summary: '能耗分析章节 4 节大纲候选，其中趋势与异常识别一节待评审。',
    basedOn: [ref('mat-001', 'requirement'), ref('mat-002', 'fact')],
    payload: createP006Outline(),
  },
];

export const createP006Package = (): ArtifactPackage => ({
  id: 'pkg-006',
  code: 'P006',
  projectId: 'prj-001',
  title: '园区能耗分析章节补充',
  task: createP006Task(),
  status: 'paused',
  attentionNote: '执行在「大纲或修改计划」阶段暂停：确认能耗分析大纲后可恢复。',
  primaryConversationId: 'conv-p006',
  currentDraft: {
    id: 'draft-p006-01',
    updatedAt: '2026-11-07T11:20:00+08:00',
    updatedBy: currentUser(),
    changeNote: '草稿编制前的能耗分析补充，已保留事实清单与大纲候选。',
  },
  versionIds: [],
  stageIds: ['goal', 'facts', 'retrieval', 'plan', 'draft', 'validation', 'delivery'].map((key) =>
    seedStageId('pkg-006', key)
  ),
  createdAt: '2026-11-07T10:00:00+08:00',
  updatedAt: '2026-11-07T11:20:00+08:00',
  createdBy: currentUser(),
  executionId: 'exec-p006',
  statusHistory: [
    { status: 'draft', at: '2026-11-07T10:00:00+08:00', note: '创建交付包' },
    { status: 'in_progress', at: '2026-11-07T10:05:00+08:00' },
    { status: 'paused', at: '2026-11-07T11:20:00+08:00', note: '等待用户确认能耗分析大纲' },
  ],
});

export const createP006Conversation = (): Conversation => ({
  id: 'conv-p006',
  packageId: 'pkg-006',
  title: '园区能耗分析章节补充会话',
  createdAt: '2026-11-07T10:02:00+08:00',
  messageIds: ['msg-p006-01', 'msg-p006-02', 'msg-p006-03', 'msg-p006-04', 'msg-p006-05', 'msg-p006-06', 'msg-p006-07'],
});

export const createP006Messages = (): ConversationMessage[] => [
  {
    id: 'msg-p006-01',
    conversationId: 'conv-p006',
    role: 'user',
    text: '给技术方案补一份能耗分析章节，先整理事实和大纲给我看，不要动已有章节。',
    createdAt: '2026-11-07T10:02:00+08:00',
    author: currentUser(),
    stageKey: 'goal',
  },
  {
    id: 'msg-p006-02',
    conversationId: 'conv-p006',
    role: 'system',
    text: '阶段『目标与材料理解』开始：读取需求说明书与勘察记录中的能源相关内容。',
    createdAt: '2026-11-07T10:05:00+08:00',
    stageKey: 'goal',
  },
  {
    id: 'msg-p006-03',
    conversationId: 'conv-p006',
    role: 'system',
    text: '阶段『事实与要求整理』生成了候选成果，等待确认：能耗事实与要求清单。',
    createdAt: '2026-11-07T10:40:00+08:00',
    stageKey: 'facts',
    attachmentIds: ['art-p006-facts'],
  },
  {
    id: 'msg-p006-04',
    conversationId: 'conv-p006',
    role: 'assistant',
    text: '演示模拟执行：事实清单已生成。现有表计数量与采集要求已核实；既有抄表系统采集频率不统一，趋势分析需要补充前置条件。',
    createdAt: '2026-11-07T10:42:00+08:00',
    author: demoAgentUser(),
    stageKey: 'facts',
    simulated: true,
  },
  {
    id: 'msg-p006-05',
    conversationId: 'conv-p006',
    role: 'assistant',
    text: '演示模拟执行：能耗分析章节大纲候选已生成，共 4 节；趋势与异常识别一节标记为待评审，请确认后我再进入草稿编制。',
    createdAt: '2026-11-07T11:05:00+08:00',
    author: demoAgentUser(),
    stageKey: 'plan',
    simulated: true,
    attachmentIds: ['art-p006-outline'],
  },
  {
    id: 'msg-p006-06',
    conversationId: 'conv-p006',
    role: 'system',
    text: '执行已暂停：阶段『大纲或修改计划』等待用户确认，恢复后继续草稿编制。',
    createdAt: '2026-11-07T11:20:00+08:00',
    stageKey: 'plan',
  },
  {
    id: 'msg-p006-07',
    conversationId: 'conv-p006',
    role: 'user',
    text: '大纲先放着，我今天晚些确认。',
    createdAt: '2026-11-07T11:26:00+08:00',
    author: currentUser(),
    stageKey: 'plan',
  },
];

export const createP006Execution = (): ExecutionRun => ({
  id: 'exec-p006',
  packageId: 'pkg-006',
  status: 'paused',
  currentStageKey: 'plan',
  startedAt: '2026-11-07T10:05:00+08:00',
  updatedAt: '2026-11-07T11:20:00+08:00',
  activity: '已暂停：等待用户确认能耗分析大纲',
  pausedNote:
    '执行在「大纲或修改计划」阶段暂停：大纲候选已生成，等待用户确认后恢复并进入草稿编制；恢复前不会修改大纲或进入下一阶段。',
  inputVersionIds: ['mv-001-1', 'mv-002-1'],
  events: [
    { id: 'evt-p006-01', type: 'queued', at: '2026-11-07T10:00:00+08:00', label: '运行已排队' },
    { id: 'evt-p006-02', type: 'stage_started', at: '2026-11-07T10:05:00+08:00', label: '阶段『目标与材料理解』开始' },
    { id: 'evt-p006-03', type: 'artifact_candidate', at: '2026-11-07T10:40:00+08:00', label: '生成能耗事实与要求清单' },
    { id: 'evt-p006-04', type: 'stage_started', at: '2026-11-07T10:58:00+08:00', label: '阶段『大纲或修改计划』开始' },
    { id: 'evt-p006-05', type: 'waiting_user', at: '2026-11-07T11:05:00+08:00', label: '大纲候选生成，等待用户确认' },
    { id: 'evt-p006-06', type: 'paused', at: '2026-11-07T11:20:00+08:00', label: '执行暂停' },
  ],
});

/* ========================================================================== */
/* P007 设备选型参数复核（失败）                                                */
/* ========================================================================== */

export const createP007Task = (): Task => ({
  id: 'task-p007',
  kind: 'generate',
  goal: '复核设备选型参数表与方案设备参数的一致性，输出参数复核说明。',
  requirements: [
    '逐项核对摄像机、存储与网络设备参数。',
    '参数核对必须能追溯到设备选型参数表的具体表格。',
    '无法核对的参数须明确标记，不得给出推测值。',
  ],
  createdAt: '2026-11-09T10:30:00+08:00',
});

export const createP007Stages = (): Stage[] =>
  buildStages('pkg-007', 'generate', [ref('mat-004', 'fact'), ref('mat-001', 'requirement')], {
    goal: {
      status: 'completed',
      startedAt: '2026-11-09T10:35:00+08:00',
      completedAt: '2026-11-09T10:48:00+08:00',
    },
    facts: {
      status: 'completed',
      currentArtifactId: 'art-p007-facts',
      startedAt: '2026-11-09T10:48:00+08:00',
      completedAt: '2026-11-09T11:05:00+08:00',
    },
    retrieval: {
      status: 'completed',
      startedAt: '2026-11-09T11:05:00+08:00',
      completedAt: '2026-11-09T11:15:00+08:00',
    },
    plan: {
      status: 'completed',
      currentArtifactId: 'art-p007-outline',
      startedAt: '2026-11-09T11:15:00+08:00',
      completedAt: '2026-11-09T11:30:00+08:00',
    },
    draft: {
      status: 'completed',
      currentArtifactId: 'art-p007-draft',
      startedAt: '2026-11-09T11:30:00+08:00',
      completedAt: '2026-11-09T11:38:00+08:00',
    },
    validation: {
      status: 'failed',
      currentArtifactId: 'art-p007-validation',
      startedAt: '2026-11-09T11:38:00+08:00',
      statusNote: '参数核对未通过：设备选型参数表表 3 无法提取，关键参数缺失，校验无法完成。',
    },
  });

const createP007FactList = (): FactListPayload => ({
  type: 'fact_list',
  items: [
    {
      id: 'fact-p007-01',
      kind: 'fact',
      statement: '设备选型参数表表 1 要求室外摄像机不低于 400 万像素。',
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
      id: 'fact-p007-02',
      kind: 'fact',
      statement: '设备选型参数表表 2 要求存储单盘不低于 10TB、保存 30 天。',
      source: {
        documentId: 'doc-mat-004',
        blockId: 'm4-b-06',
        sectionPath: '设备选型参数表（节选）',
        quote: '24 个千兆端口，4 个万兆上联，支持 PoE',
      },
      materialReferenceId: 'mref-mat-004-fact',
      status: 'confirmed',
    },
    {
      id: 'fact-p007-03',
      kind: 'gap',
      statement: '设备选型参数表表 3 为合并单元格，无法可靠提取，存储与服务器参数缺失。',
      source: {
        documentId: 'doc-mat-004',
        blockId: 'm4-b-07',
        sectionPath: '设备选型参数表（节选）',
        quote: '表 3 存储与服务器参数因合并单元格无法可靠提取',
      },
      materialReferenceId: 'mref-mat-004-fact',
      status: 'missing',
    },
    {
      id: 'fact-p007-04',
      kind: 'requirement',
      statement: '技术方案须给出监控摄像机、存储与网络设备的明确型号与关键参数。',
      source: {
        documentId: 'doc-mat-001',
        blockId: 'm1-b-13',
        sectionPath: '第 5 章 设备与基础设施要求',
        quote: '技术方案须给出监控摄像机、存储与网络设备的明确型号与关键参数',
      },
      materialReferenceId: 'mref-mat-001-requirement',
      status: 'confirmed',
    },
    {
      id: 'fact-p007-05',
      kind: 'conflict',
      statement: '方案设备参数表中的球机分辨率与设备选型参数表要求不一致，尚未确认以哪一版为准。',
      detail: '该冲突需要人工核对设备选型参数表原始文件后才能定稿。',
      materialReferenceId: 'mref-mat-004-fact',
      status: 'conflict',
    },
  ],
  openQuestions: ['设备选型参数表表 3 能否提供可提取的原始表格或人工核对结果？'],
});

const createP007Outline = (): OutlinePayload => ({
  type: 'outline',
  sections: [
    {
      id: 'outline-p007-01',
      title: '参数复核范围与依据',
      purpose: '说明复核对象、参数表版本与判定口径。',
      requirementRefs: ['需求说明书 5 设备与基础设施要求'],
      basisRefs: ['mat-001', 'mat-004'],
      status: 'confirmed',
    },
    {
      id: 'outline-p007-02',
      title: '逐项参数核对表',
      purpose: '按设备类别逐项列出参数、依据与核对结论。',
      requirementRefs: ['需求说明书 5 设备与基础设施要求'],
      basisRefs: ['mat-004'],
      status: 'confirmed',
    },
    {
      id: 'outline-p007-03',
      title: '无法核对项与限制',
      purpose: '列出表 3 缺失导致的无法核对项。',
      requirementRefs: ['需求说明书 5 设备与基础设施要求'],
      basisRefs: ['mat-004'],
      status: 'confirmed',
    },
  ],
  scopeNote: '复核仅覆盖可提取的设备参数；表 3 不可读导致存储与服务器部分无法核对。',
});

const createP007Draft = (): DraftPayload => ({
  type: 'draft',
  isPartial: true,
  sections: [
    {
      id: 'draft-p007-s01',
      heading: '参数复核范围与依据',
      paragraphs: [
        {
          id: 'draft-p007-01',
          text: '本次复核以设备选型参数表表 1、表 2 为判定依据，逐项核对方案中的摄像机与网络设备参数。',
          citationRefs: ['mref-mat-004-fact'],
          change: 'unchanged',
        },
      ],
    },
    {
      id: 'draft-p007-s02',
      heading: '逐项参数核对表',
      paragraphs: [
        {
          id: 'draft-p007-02',
          text: '摄像机分辨率、存储单盘容量与核心交换机端口数量按下表逐项核对，结论标注为通过、不一致或无法核对。',
          citationRefs: ['mref-mat-004-fact'],
          change: 'unchanged',
        },
      ],
    },
    {
      id: 'draft-p007-s03',
      heading: '无法核对项与限制',
      paragraphs: [
        {
          id: 'draft-p007-03',
          text: '存储与服务器参数依赖设备选型参数表表 3，但表 3 无法可靠提取，相关参数无法核对，不得以推测值替代。',
          citationRefs: ['mref-mat-004-fact'],
          change: 'unchanged',
        },
      ],
    },
  ],
});

const createP007Validation = (): ValidationPayload => ({
  type: 'validation',
  checks: [
    {
      id: 'check-p007-01',
      label: '参数一致性检查',
      status: 'fail',
      detail: '设备参数表表 3 无法提取，存储与服务器关键参数缺失，参数一致性无法完成核对。',
      location: {
        documentId: 'doc-mat-004',
        blockId: 'm4-b-07',
        sectionPath: '设备选型参数表（节选）',
        quote: '表 3 存储与服务器参数因合并单元格无法可靠提取',
      },
    },
    {
      id: 'check-p007-02',
      label: '摄像机参数核对',
      status: 'warn',
      detail: '球机分辨率与参数表要求不一致，待人工确认后处理。',
    },
    {
      id: 'check-p007-03',
      label: '网络设备参数核对',
      status: 'pass',
      detail: '核心交换机与接入交换机参数满足表 2 要求。',
    },
    {
      id: 'check-p007-04',
      label: '引用可追溯性',
      status: 'pass',
      detail: '已核对参数均标注了参数表表格与行位置。',
    },
  ],
  openItems: ['设备选型参数表表 3 需提供可提取版本或人工核对结果后重试。'],
});

export const createP007Artifacts = (): StageArtifact[] => [
  {
    id: 'art-p007-facts',
    packageId: 'pkg-007',
    stageId: seedStageId('pkg-007', 'facts'),
    kind: 'fact_list',
    revision: 1,
    status: 'confirmed',
    title: '事实与要求清单',
    updatedAt: '2026-11-09T11:05:00+08:00',
    updatedBy: currentUser(),
    summary: '整理 5 条参数事实与要求，其中表 3 缺失与分辨率冲突为待处理项。',
    basedOn: [ref('mat-004', 'fact'), ref('mat-001', 'requirement')],
    payload: createP007FactList(),
  },
  {
    id: 'art-p007-outline',
    packageId: 'pkg-007',
    stageId: seedStageId('pkg-007', 'plan'),
    kind: 'outline',
    revision: 1,
    status: 'confirmed',
    title: '大纲与修改计划',
    updatedAt: '2026-11-09T11:30:00+08:00',
    updatedBy: currentUser(),
    summary: '参数复核说明按范围、逐项核对表、无法核对项三节组织。',
    basedOn: [ref('mat-001', 'requirement'), ref('mat-004', 'fact')],
    payload: createP007Outline(),
  },
  {
    id: 'art-p007-draft',
    packageId: 'pkg-007',
    stageId: seedStageId('pkg-007', 'draft'),
    kind: 'draft',
    revision: 1,
    status: 'confirmed',
    title: '工作草稿',
    updatedAt: '2026-11-09T11:38:00+08:00',
    updatedBy: currentUser(),
    summary: '参数复核说明草稿（不完整），存储与服务器部分因表 3 不可读未完成。',
    basedOn: [ref('mat-004', 'fact'), ref('mat-001', 'requirement')],
    payload: createP007Draft(),
  },
  {
    id: 'art-p007-validation',
    packageId: 'pkg-007',
    stageId: seedStageId('pkg-007', 'validation'),
    kind: 'validation',
    revision: 1,
    status: 'failed',
    title: '校验结果',
    updatedAt: '2026-11-09T11:40:00+08:00',
    updatedBy: currentUser(),
    summary: '参数一致性校验失败：表 3 无法提取，存储与服务器参数缺失。',
    basedOn: [ref('mat-004', 'fact'), ref('mat-001', 'requirement')],
    payload: createP007Validation(),
  },
];

export const createP007Package = (): ArtifactPackage => ({
  id: 'pkg-007',
  code: 'P007',
  projectId: 'prj-001',
  title: '设备选型参数复核',
  task: createP007Task(),
  status: 'failed',
  attentionNote: '校验阶段失败：设备参数表表 3 不可读，可修复材料后重试；已有成果已保留。',
  primaryConversationId: 'conv-p007',
  currentDraft: {
    id: 'draft-p007-01',
    updatedAt: '2026-11-09T11:40:00+08:00',
    updatedBy: currentUser(),
    changeNote: '参数复核草稿已保留，等待材料修复后从校验阶段重试。',
  },
  versionIds: [],
  stageIds: ['goal', 'facts', 'retrieval', 'plan', 'draft', 'validation', 'delivery'].map((key) =>
    seedStageId('pkg-007', key)
  ),
  createdAt: '2026-11-09T10:30:00+08:00',
  updatedAt: '2026-11-09T11:40:00+08:00',
  createdBy: currentUser(),
  executionId: 'exec-p007',
  statusHistory: [
    { status: 'draft', at: '2026-11-09T10:30:00+08:00', note: '创建交付包' },
    { status: 'in_progress', at: '2026-11-09T10:35:00+08:00' },
    { status: 'failed', at: '2026-11-09T11:40:00+08:00', note: '校验阶段失败，保留已有成果' },
  ],
});

export const createP007Conversation = (): Conversation => ({
  id: 'conv-p007',
  packageId: 'pkg-007',
  title: '设备选型参数复核会话',
  createdAt: '2026-11-09T10:32:00+08:00',
  messageIds: ['msg-p007-01', 'msg-p007-02', 'msg-p007-03', 'msg-p007-04', 'msg-p007-05', 'msg-p007-06'],
});

export const createP007Messages = (): ConversationMessage[] => [
  {
    id: 'msg-p007-01',
    conversationId: 'conv-p007',
    role: 'user',
    text: '复核设备选型参数表与方案设备参数是否一致，有冲突的逐项列出，不要直接改方案。',
    createdAt: '2026-11-09T10:32:00+08:00',
    author: currentUser(),
    stageKey: 'goal',
  },
  {
    id: 'msg-p007-02',
    conversationId: 'conv-p007',
    role: 'system',
    text: '阶段『事实与要求整理』生成了候选成果，等待确认：参数事实与要求清单。',
    createdAt: '2026-11-09T11:05:00+08:00',
    stageKey: 'facts',
    attachmentIds: ['art-p007-facts'],
  },
  {
    id: 'msg-p007-03',
    conversationId: 'conv-p007',
    role: 'assistant',
    text: '演示模拟执行：表 1、表 2 参数已核对，发现球机分辨率不一致；表 3 无法可靠提取，存储与服务器参数无法核对。',
    createdAt: '2026-11-09T11:06:00+08:00',
    author: demoAgentUser(),
    stageKey: 'facts',
    simulated: true,
  },
  {
    id: 'msg-p007-04',
    conversationId: 'conv-p007',
    role: 'system',
    text: '阶段『校验』失败：参数一致性核对无法完成，执行已终止，已有草稿保留。',
    createdAt: '2026-11-09T11:40:00+08:00',
    stageKey: 'validation',
  },
  {
    id: 'msg-p007-05',
    conversationId: 'conv-p007',
    role: 'assistant',
    text: '演示模拟执行：本次运行在校验阶段终止。失败原因：设备选型参数表表 3 因合并单元格无法可靠提取，关键参数缺失。事实清单、大纲与草稿已保留，可修复材料后重试。',
    createdAt: '2026-11-09T11:41:00+08:00',
    author: demoAgentUser(),
    stageKey: 'validation',
    simulated: true,
    attachmentIds: ['art-p007-validation'],
  },
  {
    id: 'msg-p007-06',
    conversationId: 'conv-p007',
    role: 'user',
    text: '我找一版可提取的参数表，稍后再试。',
    createdAt: '2026-11-09T11:45:00+08:00',
    author: currentUser(),
    stageKey: 'validation',
  },
];

export const createP007Execution = (): ExecutionRun => ({
  id: 'exec-p007',
  packageId: 'pkg-007',
  status: 'failed',
  currentStageKey: 'validation',
  startedAt: '2026-11-09T10:35:00+08:00',
  updatedAt: '2026-11-09T11:40:00+08:00',
  activity: '校验阶段失败：设备参数表表 3 无法提取，关键参数缺失',
  failure: {
    failedStageKey: 'validation',
    reason: '设备选型参数表表 3 因合并单元格无法可靠提取，存储与服务器关键参数缺失，参数一致性无法完成核对。',
    preservedNote: '事实清单、大纲与草稿已保留；修复材料后可从此前成果继续，不需要重新整理事实。',
    retryable: true,
  },
  inputVersionIds: ['mv-004-1', 'mv-001-1'],
  events: [
    { id: 'evt-p007-01', type: 'queued', at: '2026-11-09T10:30:00+08:00', label: '运行已排队' },
    { id: 'evt-p007-02', type: 'stage_started', at: '2026-11-09T10:35:00+08:00', label: '阶段『目标与材料理解』开始' },
    { id: 'evt-p007-03', type: 'stage_started', at: '2026-11-09T11:30:00+08:00', label: '阶段『草稿编制』开始' },
    { id: 'evt-p007-04', type: 'artifact_candidate', at: '2026-11-09T11:38:00+08:00', label: '参数复核草稿完成' },
    { id: 'evt-p007-05', type: 'stage_started', at: '2026-11-09T11:38:00+08:00', label: '阶段『校验』开始' },
    {
      id: 'evt-p007-06',
      type: 'failed',
      at: '2026-11-09T11:40:00+08:00',
      label: '校验失败',
      detail: '设备选型参数表表 3 无法可靠提取',
    },
  ],
});

/* ========================================================================== */
/* P008 运维保障章节编制（等待用户处理冲突）                                    */
/* ========================================================================== */

export const createP008Task = (): Task => ({
  id: 'task-p008',
  kind: 'generate',
  goal: '在技术方案修订稿基础上编制运维保障章节补充稿。',
  requirements: [
    '沿用 P001/v2 与 P003/v1 的运维保障框架。',
    '补充备件保障与服务考核内容。',
    '大纲须经用户手工确认后再进入草稿。',
  ],
  createdAt: '2026-11-10T09:40:00+08:00',
});

export const createP008Stages = (): Stage[] =>
  buildStages('pkg-008', 'generate', [ref('mat-001', 'requirement'), ref('mat-003', 'case')], {
    goal: {
      status: 'completed',
      startedAt: '2026-11-10T09:45:00+08:00',
      completedAt: '2026-11-10T09:55:00+08:00',
    },
    facts: {
      status: 'completed',
      currentArtifactId: 'art-p008-facts',
      startedAt: '2026-11-10T09:55:00+08:00',
      completedAt: '2026-11-10T10:15:00+08:00',
    },
    retrieval: {
      status: 'completed',
      startedAt: '2026-11-10T10:15:00+08:00',
      completedAt: '2026-11-10T10:30:00+08:00',
    },
    plan: {
      status: 'completed',
      currentArtifactId: 'art-p008-outline-user',
      startedAt: '2026-11-10T10:30:00+08:00',
      completedAt: '2026-11-10T14:35:00+08:00',
      inputRefs: [ref('mat-001', 'requirement'), ref('mat-003', 'case')],
    },
    draft: {
      status: 'awaiting_confirmation',
      startedAt: '2026-11-10T14:40:00+08:00',
      statusNote: '大纲存在冲突：用户手工编辑版本与旧运行候选并存，等待用户选择保留哪一边。',
    },
  });

const createP008FactList = (): FactListPayload => ({
  type: 'fact_list',
  items: [
    {
      id: 'fact-p008-01',
      kind: 'requirement',
      statement: '运维服务期不少于 2 年，响应时间不超过 2 小时。',
      source: {
        documentId: 'doc-mat-001',
        blockId: 'm1-b-19',
        sectionPath: '第 8 章 验收与交付要求',
        quote: '运维服务期不少于 2 年，响应时间不超过 2 小时。',
      },
      materialReferenceId: 'mref-mat-001-requirement',
      status: 'confirmed',
    },
    {
      id: 'fact-p008-02',
      kind: 'fact',
      statement: '参考案例中重大故障 30 分钟响应、4 小时恢复，一般故障 2 小时响应。',
      source: {
        documentId: 'doc-mat-003',
        blockId: 'm3-b-09',
        sectionPath: '第 3 章 运维组织',
        quote: '重大故障 30 分钟响应、4 小时恢复，一般故障 2 小时响应。',
      },
      materialReferenceId: 'mref-mat-003-case',
      status: 'confirmed',
    },
    {
      id: 'fact-p008-03',
      kind: 'fact',
      statement: '参考案例中建设单位设 3 人运维小组，承建单位提供 2 年驻场服务。',
      source: {
        documentId: 'doc-mat-003',
        blockId: 'm3-b-09',
        sectionPath: '第 3 章 运维组织',
        quote: '建设单位设 3 人运维小组，承建单位提供 2 年驻场服务。',
      },
      materialReferenceId: 'mref-mat-003-case',
      status: 'confirmed',
    },
    {
      id: 'fact-p008-04',
      kind: 'assumption',
      statement: '本次补充沿用 V1.2 修订稿的运维框架，只补充备件保障与服务考核细节。',
      materialReferenceId: 'mref-mat-001-requirement',
      status: 'pending',
    },
    {
      id: 'fact-p008-05',
      kind: 'gap',
      statement: '备件清单的具体数量尚无正式依据，需在草稿中说明为建议值。',
      materialReferenceId: 'mref-mat-003-case',
      status: 'pending',
    },
  ],
  openQuestions: ['备件储备数量是否按参考案例的建议值执行？'],
});

const createP008OutlineUser = (): OutlinePayload => ({
  type: 'outline',
  sections: [
    {
      id: 'outline-p008-01',
      title: '运维组织与职责',
      purpose: '沿用修订稿框架，明确双方职责。',
      requirementRefs: ['需求说明书 8 验收与交付要求'],
      basisRefs: ['mat-001', 'mat-003'],
      status: 'confirmed',
    },
    {
      id: 'outline-p008-02',
      title: '服务响应与考核',
      purpose: '补充响应时限与季度考核方式。',
      requirementRefs: ['需求说明书 8 验收与交付要求'],
      basisRefs: ['mat-001', 'mat-003'],
      status: 'confirmed',
    },
    {
      id: 'outline-p008-03',
      title: '备件保障',
      purpose: '补充备件储备建议与盘点机制。',
      requirementRefs: ['需求说明书 8 验收与交付要求'],
      basisRefs: ['mat-003'],
      status: 'confirmed',
    },
  ],
  scopeNote: '用户手工调整后的大纲：增加服务考核一节，备件保障独立成节。',
});

const createP008OutlineStale = (): OutlinePayload => ({
  type: 'outline',
  sections: [
    {
      id: 'outline-p008-04',
      title: '运维总则',
      purpose: '旧运行候选：先说明运维目标与总体原则。',
      requirementRefs: ['需求说明书 8 验收与交付要求'],
      basisRefs: ['mat-001'],
      status: 'needs_review',
    },
    {
      id: 'outline-p008-05',
      title: '运维组织与职责',
      purpose: '旧运行候选：按承建单位、建设单位分别说明职责。',
      requirementRefs: ['需求说明书 8 验收与交付要求'],
      basisRefs: ['mat-001', 'mat-003'],
      status: 'planned',
    },
    {
      id: 'outline-p008-06',
      title: '服务响应与备件',
      purpose: '旧运行候选：响应与备件合并在同一节。',
      requirementRefs: ['需求说明书 8 验收与交付要求'],
      basisRefs: ['mat-001', 'mat-003'],
      status: 'planned',
    },
  ],
  scopeNote: '旧运行返回的大纲候选，未被采纳；与用户手工编辑的大纲并存，等待用户选择。',
});

export const createP008Artifacts = (): StageArtifact[] => [
  {
    id: 'art-p008-facts',
    packageId: 'pkg-008',
    stageId: seedStageId('pkg-008', 'facts'),
    kind: 'fact_list',
    revision: 1,
    status: 'confirmed',
    title: '事实与要求清单',
    updatedAt: '2026-11-10T10:15:00+08:00',
    updatedBy: currentUser(),
    summary: '整理 5 条运维相关事实与要求，含 2 个待确认项。',
    basedOn: [ref('mat-001', 'requirement'), ref('mat-003', 'case')],
    payload: createP008FactList(),
  },
  {
    id: 'art-p008-outline-user',
    packageId: 'pkg-008',
    stageId: seedStageId('pkg-008', 'plan'),
    kind: 'outline',
    revision: 1,
    status: 'confirmed',
    title: '大纲与修改计划（用户版）',
    updatedAt: '2026-11-10T14:35:00+08:00',
    updatedBy: currentUser(),
    summary: '用户手工调整后的大纲：服务考核单独一节，备件保障独立成节。',
    basedOn: [ref('mat-001', 'requirement'), ref('mat-003', 'case')],
    payload: createP008OutlineUser(),
  },
  {
    id: 'art-p008-outline-stale',
    packageId: 'pkg-008',
    stageId: seedStageId('pkg-008', 'plan'),
    kind: 'outline',
    revision: 1,
    status: 'candidate',
    title: '大纲与修改计划（旧运行候选）',
    updatedAt: '2026-11-10T14:55:00+08:00',
    updatedBy: currentUser(),
    summary: '旧运行返回的大纲候选，未被采纳，等待用户决定是否保留。',
    basedOn: [ref('mat-001', 'requirement'), ref('mat-003', 'case')],
    payload: createP008OutlineStale(),
  },
];

export const createP008Package = (): ArtifactPackage => ({
  id: 'pkg-008',
  code: 'P008',
  projectId: 'prj-001',
  title: '运维保障章节编制',
  task: createP008Task(),
  status: 'awaiting_user',
  attentionNote: '大纲冲突：用户手工编辑版本与旧运行候选并存，等待选择保留哪一边。',
  primaryConversationId: 'conv-p008',
  currentDraft: {
    id: 'draft-p008-01',
    updatedAt: '2026-11-10T15:20:00+08:00',
    updatedBy: currentUser(),
    changeNote: '运维保障章节编制中，大纲由用户手工调整后与旧运行候选冲突。',
    conflict: {
      id: 'conflict-p008-01',
      message: '旧运行返回的大纲候选与用户手工编辑的大纲不一致，系统未自动覆盖，请选择保留哪一版本。',
      userArtifactId: 'art-p008-outline-user',
      candidateArtifactId: 'art-p008-outline-stale',
      detectedAt: '2026-11-10T15:20:00+08:00',
      resolution: 'pending',
    },
  },
  versionIds: [],
  stageIds: ['goal', 'facts', 'retrieval', 'plan', 'draft', 'validation', 'delivery'].map((key) =>
    seedStageId('pkg-008', key)
  ),
  createdAt: '2026-11-10T09:40:00+08:00',
  updatedAt: '2026-11-10T15:20:00+08:00',
  createdBy: currentUser(),
  executionId: 'exec-p008',
  statusHistory: [
    { status: 'draft', at: '2026-11-10T09:40:00+08:00', note: '创建交付包' },
    { status: 'in_progress', at: '2026-11-10T09:45:00+08:00' },
    { status: 'awaiting_user', at: '2026-11-10T15:20:00+08:00', note: '旧运行候选与用户大纲冲突，等待选择' },
  ],
});

export const createP008Conversation = (): Conversation => ({
  id: 'conv-p008',
  packageId: 'pkg-008',
  title: '运维保障章节编制会话',
  createdAt: '2026-11-10T09:42:00+08:00',
  messageIds: [
    'msg-p008-01',
    'msg-p008-02',
    'msg-p008-03',
    'msg-p008-04',
    'msg-p008-05',
    'msg-p008-06',
    'msg-p008-07',
    'msg-p008-08',
  ],
});

export const createP008Messages = (): ConversationMessage[] => [
  {
    id: 'msg-p008-01',
    conversationId: 'conv-p008',
    role: 'user',
    text: '在修订稿基础上补一份运维保障章节，重点写服务考核和备件保障。',
    createdAt: '2026-11-10T09:42:00+08:00',
    author: currentUser(),
    stageKey: 'goal',
  },
  {
    id: 'msg-p008-02',
    conversationId: 'conv-p008',
    role: 'system',
    text: '阶段『事实与要求整理』生成了候选成果，等待确认：运维事实与要求清单。',
    createdAt: '2026-11-10T10:15:00+08:00',
    stageKey: 'facts',
    attachmentIds: ['art-p008-facts'],
  },
  {
    id: 'msg-p008-03',
    conversationId: 'conv-p008',
    role: 'assistant',
    text: '演示模拟执行：已生成运维大纲，共 3 节：运维组织与职责、服务响应与考核、备件保障。',
    createdAt: '2026-11-10T11:05:00+08:00',
    author: demoAgentUser(),
    stageKey: 'plan',
    simulated: true,
  },
  {
    id: 'msg-p008-04',
    conversationId: 'conv-p008',
    role: 'user',
    text: '大纲我手工调一下：服务考核要单独写，备件保障独立成节。',
    createdAt: '2026-11-10T14:35:00+08:00',
    author: currentUser(),
    stageKey: 'plan',
    attachmentIds: ['art-p008-outline-user'],
  },
  {
    id: 'msg-p008-05',
    conversationId: 'conv-p008',
    role: 'system',
    text: '用户手工编辑了大纲，系统已保存为用户版大纲；旧运行仍在返回结果，等待其结束。',
    createdAt: '2026-11-10T14:36:00+08:00',
    stageKey: 'plan',
  },
  {
    id: 'msg-p008-06',
    conversationId: 'conv-p008',
    role: 'assistant',
    text: '演示模拟执行：旧运行已返回大纲候选，与用户手工编辑版本结构不同；系统未自动覆盖用户版本，已标记冲突。',
    createdAt: '2026-11-10T15:20:00+08:00',
    author: demoAgentUser(),
    stageKey: 'plan',
    simulated: true,
    attachmentIds: ['art-p008-outline-stale'],
  },
  {
    id: 'msg-p008-07',
    conversationId: 'conv-p008',
    role: 'system',
    text: '检测到大纲冲突：用户版大纲与旧运行候选并存，等待用户选择保留哪一边后再进入草稿编制。',
    createdAt: '2026-11-10T15:20:00+08:00',
    stageKey: 'draft',
  },
  {
    id: 'msg-p008-08',
    conversationId: 'conv-p008',
    role: 'user',
    text: '先保留我的版本，我确认后再决定旧候选怎么处理。',
    createdAt: '2026-11-10T15:25:00+08:00',
    author: currentUser(),
    stageKey: 'draft',
  },
];

export const createP008Execution = (): ExecutionRun => ({
  id: 'exec-p008',
  packageId: 'pkg-008',
  status: 'completed',
  currentStageKey: 'draft',
  startedAt: '2026-11-10T09:45:00+08:00',
  updatedAt: '2026-11-10T15:20:00+08:00',
  activity: '旧运行结果已返回：大纲候选与用户手工编辑版本冲突，等待用户选择保留哪一边',
  inputVersionIds: ['mv-001-1', 'mv-003-1'],
  events: [
    { id: 'evt-p008-01', type: 'queued', at: '2026-11-10T09:40:00+08:00', label: '运行已排队' },
    { id: 'evt-p008-02', type: 'stage_started', at: '2026-11-10T09:45:00+08:00', label: '阶段『目标与材料理解』开始' },
    { id: 'evt-p008-03', type: 'artifact_candidate', at: '2026-11-10T10:15:00+08:00', label: '生成运维事实与要求清单' },
    { id: 'evt-p008-04', type: 'stage_started', at: '2026-11-10T10:30:00+08:00', label: '阶段『大纲或修改计划』开始' },
    { id: 'evt-p008-05', type: 'waiting_user', at: '2026-11-10T14:35:00+08:00', label: '用户手工编辑大纲，等待确认' },
    {
      id: 'evt-p008-06',
      type: 'artifact_candidate',
      at: '2026-11-10T14:55:00+08:00',
      label: '旧运行返回大纲候选',
      detail: '与用户版大纲冲突，未自动覆盖',
    },
    { id: 'evt-p008-07', type: 'waiting_user', at: '2026-11-10T15:20:00+08:00', label: '检测到大纲冲突，等待用户选择' },
    { id: 'evt-p008-08', type: 'completed', at: '2026-11-10T15:20:00+08:00', label: '旧运行结束，冲突候选已保留' },
  ],
});
