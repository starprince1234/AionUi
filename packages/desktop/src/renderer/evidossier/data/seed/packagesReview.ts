/**
 * Review-loop packages: P002 (six findings against P001/v2) and P005
 * (zero findings against material mat-001, with an explicit coverage limit).
 */
import type {
  ArtifactPackage,
  Conversation,
  ConversationMessage,
  CoveragePayload,
  ExecutionRun,
  FindingSeverity,
  FindingsPayload,
  MaterialUsage,
  PackageVersion,
  ReviewFinding,
  ReviewReportPayload,
  Stage,
  StageArtifact,
  Task,
} from '../../domain/types';
import { createP002ReportDocument, createP005ReportDocument } from './reportDocs';
import { currentUser, demoAgentUser } from './users';
import { materialRef, versionRef } from './refs';
import { buildStages, seedStageId } from './stageBuilders';

const ref = (materialId: string, role?: MaterialUsage, note?: string) => materialRef(materialId, role, note);

const severityOf = (findings: ReviewFinding[], severity: FindingSeverity): number =>
  findings.filter((finding) => finding.severity === severity).length;

/* ========================================================================== */
/* P002 智慧园区技术方案独立审查                                                */
/* ========================================================================== */

export const createP002Task = (): Task => ({
  id: 'task-p002',
  kind: 'review',
  goal: '对《智慧园区技术方案（一期）V1.1》进行独立审查，输出可追溯的问题清单与审查报告。',
  requirements: [
    '审查对象为 P001/v2，依据需求说明书 V1.2 与设备选型参数表。',
    '覆盖需求依据、设备参数、运维保障、投资估算与引用可追溯性。',
    '每个问题须定位到方案原文位置并给出审查依据。',
    '无法检查的内容单独说明，不计入已检查。',
  ],
  createdAt: '2026-11-05T09:30:00+08:00',
});

export const createP002Stages = (): Stage[] =>
  buildStages('pkg-002', 'review', [ref('mat-001', 'requirement'), ref('mat-004', 'fact')], {
    scope: {
      status: 'completed',
      startedAt: '2026-11-05T09:35:00+08:00',
      completedAt: '2026-11-05T09:45:00+08:00',
      inputRefs: [ref('mat-001', 'requirement')],
    },
    basis: {
      status: 'completed',
      startedAt: '2026-11-05T09:45:00+08:00',
      completedAt: '2026-11-05T10:10:00+08:00',
      inputRefs: [ref('mat-001', 'requirement'), ref('mat-004', 'fact')],
    },
    coverage: {
      status: 'completed',
      currentArtifactId: 'art-p002-coverage',
      startedAt: '2026-11-05T10:10:00+08:00',
      completedAt: '2026-11-05T10:35:00+08:00',
    },
    inspection: {
      status: 'completed',
      currentArtifactId: 'art-p002-findings',
      startedAt: '2026-11-05T10:35:00+08:00',
      completedAt: '2026-11-05T14:20:00+08:00',
      inputRefs: [ref('mat-001', 'requirement'), ref('mat-004', 'fact'), ref('mat-006', 'pending')],
    },
    recheck: {
      status: 'completed',
      startedAt: '2026-11-05T14:20:00+08:00',
      completedAt: '2026-11-05T15:10:00+08:00',
      inputRefs: [ref('mat-004', 'fact')],
    },
    report: {
      status: 'completed',
      currentArtifactId: 'art-p002-report',
      startedAt: '2026-11-05T15:10:00+08:00',
      completedAt: '2026-11-05T16:30:00+08:00',
    },
  });

const createP002Coverage = (): CoveragePayload => ({
  type: 'coverage_plan',
  items: [
    {
      id: 'cov-p002-01',
      code: 'C-01',
      title: '需求依据与版本完整性',
      status: 'checked',
      note: '核对方案引用的需求说明书版本与审查对象一致。',
      findingIds: [],
    },
    {
      id: 'cov-p002-02',
      code: 'C-02',
      title: '建设目标与范围响应',
      status: 'checked',
      note: '核对方案是否覆盖需求说明书的五个子系统与建设边界。',
      findingIds: [],
    },
    {
      id: 'cov-p002-03',
      code: 'C-03',
      title: '总体架构与技术路线',
      status: 'checked',
      note: '核对云边协同架构与部署说明是否自洽。',
      findingIds: [],
    },
    {
      id: 'cov-p002-04',
      code: 'C-04',
      title: '设备选型与参数一致性',
      status: 'checked',
      note: '核对设备型号、关键参数与设备选型参数表。',
      findingIds: ['find-p002-01', 'find-p002-04'],
    },
    {
      id: 'cov-p002-05',
      code: 'C-05',
      title: '运维保障可执行性',
      status: 'checked',
      note: '核对响应时限、备件安排与服务考核是否可执行。',
      findingIds: ['find-p002-02'],
    },
    {
      id: 'cov-p002-06',
      code: 'C-06',
      title: '投资估算与控制额',
      status: 'checked',
      note: '核对投资分项合计与需求说明书的控制额。',
      findingIds: ['find-p002-03'],
    },
    {
      id: 'cov-p002-07',
      code: 'C-07',
      title: '实施计划与进度合理性',
      status: 'checked',
      note: '核对 10 个月工期与阶段安排的可行性。',
      findingIds: [],
    },
    {
      id: 'cov-p002-08',
      code: 'C-08',
      title: '安全与合规要求',
      status: 'checked',
      note: '核对等保、数据留存与资料保密要求是否响应。',
      findingIds: [],
    },
    {
      id: 'cov-p002-09',
      code: 'C-09',
      title: '引用可追溯性与论证充分性',
      status: 'checked',
      note: '核对引用能否回到具体材料与条款位置。',
      findingIds: ['find-p002-05', 'find-p002-06'],
    },
    {
      id: 'cov-p002-10',
      code: 'C-10',
      title: '现场图纸与附件可核对性',
      status: 'uncheckable',
      note: '现场平面图为扫描件，无法提取文字层，未作为已核实依据进行核对。',
      findingIds: [],
    },
  ],
  scopeNote: '审查范围为技术方案 V1.1 全文，依据需求说明书 V1.2 与设备选型参数表；扫描图纸未纳入可核对范围。',
});

const createP002Findings = (): ReviewFinding[] => [
  {
    id: 'find-p002-01',
    code: 'F-01',
    severity: 'high',
    title: '3.2 设备选型未给出具体型号与关键参数',
    description:
      '方案 3.2 仅给出选型原则与设备类别，未给出监控摄像机、存储与网络设备的具体型号与关键参数，读者无法判断方案是否满足需求说明书的设备要求，也无法开展招标前的参数复核。',
    basis: '需求说明书第 5 章设备与基础设施要求：技术方案须给出监控摄像机、存储与网络设备的明确型号与关键参数。',
    basisLocation: {
      documentId: 'doc-mat-001',
      blockId: 'm1-b-13',
      sectionPath: '第 5 章 设备与基础设施要求',
      quote: '技术方案须给出监控摄像机、存储与网络设备的明确型号与关键参数',
    },
    location: {
      documentId: 'doc-p001-v2',
      blockId: 'p1v2-b-21',
      sectionPath: '第 3 章 > 3.2 设备选型与配置',
      quote: '具体型号与关键参数在招标前结合设备选型参数表确定',
    },
    status: 'confirmed',
    suggestion: '按设备选型参数表表 1、表 2 补齐摄像机、存储与网络设备的具体型号与关键参数，并在方案中给出对应表格。',
    coverageItemId: 'cov-p002-04',
  },
  {
    id: 'find-p002-02',
    code: 'F-02',
    severity: 'high',
    title: '运维保障缺少明确的响应时限与备件保障指标',
    description:
      '方案第 5 章只描述了运维服务内容与总体服务期，未给出重大故障、一般故障的响应与恢复时限，也未给出备件储备安排，无法据此考核运维服务质量，与需求说明书响应时间要求无法对应。',
    basis: '需求说明书第 8 章验收与交付要求：运维服务期不少于 2 年，响应时间不超过 2 小时。',
    basisLocation: {
      documentId: 'doc-mat-001',
      blockId: 'm1-b-19',
      sectionPath: '第 8 章 验收与交付要求',
      quote: '运维服务期不少于 2 年，响应时间不超过 2 小时。',
    },
    location: {
      documentId: 'doc-p001-v2',
      blockId: 'p1v2-b-41',
      sectionPath: '第 5 章 > 5.2 服务响应与备件',
      quote: '服务内容包括故障受理、远程支持与现场处理',
    },
    status: 'confirmed',
    suggestion: '补充分等级的响应与恢复时限，增加备件清单与储备数量，并写明季度考核方式。',
    coverageItemId: 'cov-p002-05',
  },
  {
    id: 'find-p002-03',
    code: 'F-03',
    severity: 'medium',
    title: '投资估算合计超出需求控制额',
    description: '6.1 投资构成表分项合计为 3 920 万元，超出需求说明书 3 800 万元控制额 120 万元，方案未说明超出原因。',
    basis: '需求说明书第 7 章投资与进度要求：一期总投资控制在 3800 万元以内。',
    basisLocation: {
      documentId: 'doc-mat-001',
      blockId: 'm1-b-17',
      sectionPath: '第 7 章 投资与进度要求',
      quote: '一期总投资控制在 3800 万元以内',
    },
    location: {
      documentId: 'doc-p001-v2',
      blockId: 'p1v2-b-47',
      sectionPath: '第 6 章 > 6.1 投资构成',
      quote: '超出需求控制额 120 万元',
    },
    status: 'confirmed',
    suggestion: '调整设备与安装、软件开发等分项金额，使合计与控制额一致；如确有必要超支，应单独说明理由并履行审批。',
    coverageItemId: 'cov-p002-06',
  },
  {
    id: 'find-p002-04',
    code: 'F-04',
    severity: 'medium',
    title: '设备参数与设备选型参数表不一致',
    description:
      '方案 3.2 视频监控设备参数表中室外球型摄像机为 200 万像素，而设备选型参数表表 1 要求不低于 400 万像素；存储阵列按单盘 8TB 配置，低于参数表要求的单盘 10TB，按 30 天存储周期核算容量不足。',
    basis: '设备选型参数表表 1：室外球型摄像机不低于 400 万像素，存储单盘不低于 10TB。',
    basisLocation: {
      documentId: 'doc-mat-004',
      blockId: 'm4-b-04',
      sectionPath: '设备选型参数表（节选）',
      quote: '400 万像素，23 倍光学变焦，防护等级 IP66',
    },
    location: {
      documentId: 'doc-p001-v2',
      blockId: 'p1v2-b-22',
      sectionPath: '第 3 章 > 3.2 设备参数表',
      quote: '200 万像素，23 倍光学变焦，IP66',
    },
    status: 'confirmed',
    suggestion: '将球机参数更正为 400 万像素，存储按单盘 10TB、30 天保存周期重新核算并调整数量。',
    coverageItemId: 'cov-p002-04',
  },
  {
    id: 'find-p002-05',
    code: 'F-05',
    severity: 'low',
    title: '能源管理未说明与既有计量系统的对接方式',
    description:
      '4.3 能源管理描述了数据采集与分析能力，但未说明与既有计量系统的对接协议、数据采集频率与异常数据补采方式，建设实施时存在接口不确定性。',
    basis: '需求说明书第 3 章建设范围：能源管理需实现水、电、气计量集中采集。',
    basisLocation: {
      documentId: 'doc-mat-001',
      blockId: 'm1-b-09',
      sectionPath: '第 3 章 建设范围',
      quote: '水、电、气计量集中采集与分析',
    },
    location: {
      documentId: 'doc-p001-v2',
      blockId: 'p1v2-b-32',
      sectionPath: '第 4 章 > 4.3 能源管理',
      quote: '本文未说明与既有计量系统的具体对接协议与数据采集频率',
    },
    status: 'open',
    suggestion: '补充既有计量系统接口协议、采集频率与异常数据补采机制，并与勘察记录的采集现状对应。',
    coverageItemId: 'cov-p002-09',
  },
  {
    id: 'find-p002-06',
    code: 'F-06',
    severity: 'info',
    title: '部分引用缺少可追溯的文件与条款位置',
    description:
      '1.2 编制依据列出了参考案例，但正文引用参考案例时未标注章节位置；审查时无法将部分选型经验与参考案例原文一一对应，引用可追溯性不足。',
    basis: '审查规则：引用的依据文件需可定位到具体版本与条款位置。',
    basisLocation: {
      documentId: 'doc-mat-001',
      blockId: 'm1-b-02',
      sectionPath: '文档说明',
      quote: '作为后续技术方案编制与独立审查的依据',
    },
    location: {
      documentId: 'doc-p001-v2',
      blockId: 'p1v2-b-07',
      sectionPath: '第 1 章 > 1.2 编制依据',
      quote: '《同类型园区技术方案（参考案例）》',
    },
    status: 'uncertain',
    suggestion: '为参考案例引用补充章节位置，或在正文中说明该内容仅作经验参考、不作为本项目结论依据。',
    coverageItemId: 'cov-p002-09',
    citationUnresolved: true,
  },
];

const createP002FindingsPayload = (): FindingsPayload => ({
  type: 'findings',
  findings: createP002Findings(),
  scopeNote: '问题定位到技术方案 V1.1 的具体 block，审查依据指向需求说明书或设备选型参数表的对应位置。',
});

const createP002ReportPayload = (): ReviewReportPayload => {
  const coverage = createP002Coverage();
  const findings = createP002Findings();
  return {
    type: 'review_report',
    summary:
      '技术方案 V1.1 总体覆盖了需求说明书的建设范围与目标，但设备参数完整性、运维可考核性与投资口径存在高优先级问题；共记录 6 个问题，其中 1 条引用无法回到原文，标记为待核实。',
    coverageStats: {
      checked: coverage.items.filter((item) => item.status === 'checked').length,
      unchecked: coverage.items.filter((item) => item.status === 'unchecked').length,
      uncheckable: coverage.items.filter((item) => item.status === 'uncheckable').length,
      notApplicable: coverage.items.filter((item) => item.status === 'not_applicable').length,
    },
    findingStats: {
      high: severityOf(findings, 'high'),
      medium: severityOf(findings, 'medium'),
      low: severityOf(findings, 'low'),
      info: severityOf(findings, 'info'),
      uncertain: findings.filter((finding) => finding.status === 'uncertain').length,
    },
    limitations: [
      '现场平面图为扫描件，无法提取文字层，未作为已核实依据；附图与图例未纳入核对。',
      '设备选型参数表表 3 为合并单元格，提取不可靠，存储与服务器参数未逐项核实。',
      '本次审查基于文档文本，未进行现场复核，也未验证设备到货与安装结果。',
    ],
    reviewedVersionRefs: [versionRef('ver-p001-v2')],
  };
};

export const createP002Artifacts = (): StageArtifact[] => [
  {
    id: 'art-p002-coverage',
    packageId: 'pkg-002',
    stageId: seedStageId('pkg-002', 'coverage'),
    kind: 'coverage_plan',
    revision: 1,
    status: 'confirmed',
    title: '覆盖计划',
    updatedAt: '2026-11-05T10:35:00+08:00',
    updatedBy: currentUser(),
    summary: '将审查范围拆为 10 个覆盖项：9 项可检查、1 项因扫描图纸无法核对。',
    basedOn: [ref('mat-001', 'requirement'), ref('mat-004', 'fact')],
    payload: createP002Coverage(),
  },
  {
    id: 'art-p002-findings',
    packageId: 'pkg-002',
    stageId: seedStageId('pkg-002', 'inspection'),
    kind: 'findings',
    revision: 1,
    status: 'confirmed',
    title: '问题清单',
    updatedAt: '2026-11-05T14:20:00+08:00',
    updatedBy: currentUser(),
    summary: '共 6 个问题：高 2、中 2、低 1、提示 1；每个问题均定位到方案原文与审查依据。',
    basedOn: [ref('mat-001', 'requirement'), ref('mat-004', 'fact')],
    payload: createP002FindingsPayload(),
  },
  {
    id: 'art-p002-report',
    packageId: 'pkg-002',
    stageId: seedStageId('pkg-002', 'report'),
    kind: 'review_report',
    revision: 1,
    status: 'confirmed',
    title: '审查报告',
    updatedAt: '2026-11-05T16:30:00+08:00',
    updatedBy: currentUser(),
    summary: '报告汇总 10 项覆盖结果与 6 个问题，写明 3 条审查限制，并冻结审查对象版本。',
    basedOn: [ref('mat-001', 'requirement'), ref('mat-004', 'fact'), ref('mat-005', 'template')],
    payload: createP002ReportPayload(),
  },
];

export const createP002Package = (): ArtifactPackage => ({
  id: 'pkg-002',
  code: 'P002',
  projectId: 'prj-001',
  title: '智慧园区技术方案独立审查',
  task: createP002Task(),
  status: 'delivered',
  primaryConversationId: 'conv-p002',
  reviewTarget: { kind: 'package_version', versionId: 'ver-p001-v2', versionLabel: 'P001/v2' },
  versionIds: ['ver-p002-v1'],
  stageIds: ['scope', 'basis', 'coverage', 'inspection', 'recheck', 'report'].map((key) => seedStageId('pkg-002', key)),
  createdAt: '2026-11-05T09:30:00+08:00',
  updatedAt: '2026-11-05T16:40:00+08:00',
  createdBy: currentUser(),
  executionId: 'exec-p002',
  statusHistory: [
    { status: 'draft', at: '2026-11-05T09:30:00+08:00', note: '创建审查任务' },
    { status: 'in_progress', at: '2026-11-05T09:35:00+08:00' },
    { status: 'delivered', at: '2026-11-05T16:40:00+08:00', note: 'P002/v1 审查报告正式交付' },
  ],
});

export const createP002Versions = (): PackageVersion[] => [
  {
    id: 'ver-p002-v1',
    packageId: 'pkg-002',
    projectId: 'prj-001',
    versionNumber: 1,
    label: 'P002/v1',
    status: 'delivered',
    createdAt: '2026-11-05T16:40:00+08:00',
    createdBy: currentUser(),
    changeNote: '审查报告首次交付：10 个覆盖项、6 个问题、3 条审查限制，审查对象冻结为 P001/v2。',
    inputs: [ref('mat-001', 'requirement'), ref('mat-004', 'fact')],
    artifacts: [
      { artifactId: 'art-p002-coverage', revision: 1, title: '覆盖计划', kind: 'coverage_plan' },
      { artifactId: 'art-p002-findings', revision: 1, title: '问题清单', kind: 'findings' },
      { artifactId: 'art-p002-report', revision: 1, title: '审查报告', kind: 'review_report' },
    ],
    deliverable: {
      id: 'del-p002-v1',
      kind: 'review_report',
      title: '智慧园区技术方案（一期）V1.1 独立审查报告',
      fileName: 'P002-技术方案独立审查报告.md',
      format: 'report',
      pageCount: 21,
      simulatedFile: true,
      document: createP002ReportDocument(),
    },
    confirmations: [
      {
        id: 'conf-p002-v1-01',
        label: '审查报告已确认',
        confirmedBy: currentUser(),
        confirmedAt: '2026-11-05T16:35:00+08:00',
        artifactId: 'art-p002-report',
      },
    ],
  },
];

export const createP002Conversation = (): Conversation => ({
  id: 'conv-p002',
  packageId: 'pkg-002',
  title: '技术方案独立审查会话',
  createdAt: '2026-11-05T09:32:00+08:00',
  messageIds: [
    'msg-p002-01',
    'msg-p002-02',
    'msg-p002-03',
    'msg-p002-04',
    'msg-p002-05',
    'msg-p002-06',
    'msg-p002-07',
    'msg-p002-08',
  ],
});

export const createP002Messages = (): ConversationMessage[] => [
  {
    id: 'msg-p002-01',
    conversationId: 'conv-p002',
    role: 'user',
    text: '请对 P001/v2 技术方案 V1.1 做独立审查，依据需求说明书 V1.2 和设备选型参数表，重点看设备选型、运维保障和投资估算。',
    createdAt: '2026-11-05T09:32:00+08:00',
    author: currentUser(),
    stageKey: 'scope',
  },
  {
    id: 'msg-p002-02',
    conversationId: 'conv-p002',
    role: 'system',
    text: '阶段『范围与材料理解』开始：锁定审查对象 P001/v2 与依据材料版本。',
    createdAt: '2026-11-05T09:35:00+08:00',
    stageKey: 'scope',
  },
  {
    id: 'msg-p002-03',
    conversationId: 'conv-p002',
    role: 'assistant',
    text: '演示模拟执行：审查依据已整理，共拆出 10 个覆盖项；现场平面图为扫描件，无法提取文字，不纳入可核对范围。',
    createdAt: '2026-11-05T10:10:00+08:00',
    author: demoAgentUser(),
    stageKey: 'basis',
    simulated: true,
  },
  {
    id: 'msg-p002-04',
    conversationId: 'conv-p002',
    role: 'system',
    text: '阶段『覆盖规划』生成了候选成果，等待确认：覆盖计划。',
    createdAt: '2026-11-05T10:35:00+08:00',
    stageKey: 'coverage',
    attachmentIds: ['art-p002-coverage'],
  },
  {
    id: 'msg-p002-05',
    conversationId: 'conv-p002',
    role: 'user',
    text: '覆盖计划可以，按这个范围检查。',
    createdAt: '2026-11-05T10:40:00+08:00',
    author: currentUser(),
    stageKey: 'coverage',
  },
  {
    id: 'msg-p002-06',
    conversationId: 'conv-p002',
    role: 'assistant',
    text: '演示模拟执行：检查完成，记录 6 个问题：高 2、中 2、低 1、提示 1；其中 1 条引用无法回到原文，已标记为待核实。',
    createdAt: '2026-11-05T14:20:00+08:00',
    author: demoAgentUser(),
    stageKey: 'inspection',
    simulated: true,
    attachmentIds: ['art-p002-findings'],
  },
  {
    id: 'msg-p002-07',
    conversationId: 'conv-p002',
    role: 'user',
    text: '报告确认后直接交付，我会按 F-01、F-02、F-04 创建修订任务。',
    createdAt: '2026-11-05T16:00:00+08:00',
    author: currentUser(),
    stageKey: 'report',
  },
  {
    id: 'msg-p002-08',
    conversationId: 'conv-p002',
    role: 'system',
    text: '正式版本 P002/v1 已提交：技术方案独立审查报告。',
    createdAt: '2026-11-05T16:40:00+08:00',
    attachmentIds: ['ver-p002-v1'],
  },
];

export const createP002Execution = (): ExecutionRun => ({
  id: 'exec-p002',
  packageId: 'pkg-002',
  status: 'completed',
  currentStageKey: 'report',
  startedAt: '2026-11-05T09:35:00+08:00',
  updatedAt: '2026-11-05T16:40:00+08:00',
  activity: '审查报告 P002/v1 已提交',
  inputVersionIds: ['mv-001-1', 'mv-004-1', 'mv-006-1'],
  events: [
    { id: 'evt-p002-01', type: 'queued', at: '2026-11-05T09:30:00+08:00', label: '运行已排队' },
    { id: 'evt-p002-02', type: 'stage_started', at: '2026-11-05T09:35:00+08:00', label: '阶段『范围与材料理解』开始' },
    { id: 'evt-p002-03', type: 'artifact_candidate', at: '2026-11-05T10:35:00+08:00', label: '生成覆盖计划候选' },
    { id: 'evt-p002-04', type: 'stage_started', at: '2026-11-05T10:35:00+08:00', label: '阶段『执行检查』开始' },
    {
      id: 'evt-p002-05',
      type: 'artifact_candidate',
      at: '2026-11-05T14:20:00+08:00',
      label: '生成问题清单候选',
      detail: '6 个问题，1 条待核实',
    },
    { id: 'evt-p002-06', type: 'stage_started', at: '2026-11-05T14:20:00+08:00', label: '阶段『问题复核』开始' },
    { id: 'evt-p002-07', type: 'artifact_candidate', at: '2026-11-05T16:30:00+08:00', label: '生成审查报告候选' },
    { id: 'evt-p002-08', type: 'completed', at: '2026-11-05T16:40:00+08:00', label: '审查报告 P002/v1 已提交' },
  ],
});

/* ========================================================================== */
/* P005 需求说明书一致性审查（零问题）                                          */
/* ========================================================================== */

export const createP005Task = (): Task => ({
  id: 'task-p005',
  kind: 'review',
  goal: '审查《智慧园区建设需求说明书 V1.2》的可提取文本，检查文档内部一致性并写明检查范围与限制。',
  requirements: [
    '审查对象为材料 mat-001 的当前材料版本（版本 1）。',
    '仅检查可提取文本，附件与表格不在可检查范围内。',
    '只判断内部一致性，不判断需求本身合理性。',
    '零发现时也须写明实际检查范围与限制。',
  ],
  createdAt: '2026-11-10T09:40:00+08:00',
});

export const createP005Stages = (): Stage[] =>
  buildStages('pkg-005', 'review', [ref('mat-001', 'requirement')], {
    scope: {
      status: 'completed',
      startedAt: '2026-11-10T09:45:00+08:00',
      completedAt: '2026-11-10T09:55:00+08:00',
      inputRefs: [ref('mat-001', 'requirement')],
    },
    basis: {
      status: 'completed',
      startedAt: '2026-11-10T09:55:00+08:00',
      completedAt: '2026-11-10T10:10:00+08:00',
      inputRefs: [ref('mat-001', 'requirement'), ref('mat-005', 'template')],
    },
    coverage: {
      status: 'completed',
      currentArtifactId: 'art-p005-coverage',
      startedAt: '2026-11-10T10:10:00+08:00',
      completedAt: '2026-11-10T10:25:00+08:00',
    },
    inspection: {
      status: 'completed',
      currentArtifactId: 'art-p005-findings',
      startedAt: '2026-11-10T10:25:00+08:00',
      completedAt: '2026-11-10T14:30:00+08:00',
      inputRefs: [ref('mat-001', 'requirement')],
    },
    recheck: {
      status: 'completed',
      startedAt: '2026-11-10T14:30:00+08:00',
      completedAt: '2026-11-10T15:10:00+08:00',
      inputRefs: [ref('mat-001', 'requirement')],
    },
    report: {
      status: 'completed',
      currentArtifactId: 'art-p005-report',
      startedAt: '2026-11-10T15:10:00+08:00',
      completedAt: '2026-11-10T16:10:00+08:00',
    },
  });

const createP005Coverage = (): CoveragePayload => ({
  type: 'coverage_plan',
  items: [
    {
      id: 'cov-p005-01',
      code: 'C-01',
      title: '文档版本与适用范围',
      status: 'checked',
      note: '核对版本号、修订日期与文档说明是否一致。',
      findingIds: [],
    },
    {
      id: 'cov-p005-02',
      code: 'C-02',
      title: '项目背景与建设目标一致性',
      status: 'checked',
      note: '核对背景描述与建设目标是否相互支持。',
      findingIds: [],
    },
    {
      id: 'cov-p005-03',
      code: 'C-03',
      title: '建设范围与边界一致性',
      status: 'checked',
      note: '核对覆盖范围与不含范围是否互斥且无遗漏。',
      findingIds: [],
    },
    {
      id: 'cov-p005-04',
      code: 'C-04',
      title: '技术架构要求内部一致性',
      status: 'checked',
      note: '核对架构要求、接入容量与存储要求是否矛盾。',
      findingIds: [],
    },
    {
      id: 'cov-p005-05',
      code: 'C-05',
      title: '设备与基础设施要求内部一致性',
      status: 'checked',
      note: '核对设备要求与建设范围、验收指标是否一致。',
      findingIds: [],
    },
    {
      id: 'cov-p005-06',
      code: 'C-06',
      title: '安全与合规要求内部一致性',
      status: 'checked',
      note: '核对等保要求、数据留存与保密要求是否冲突。',
      findingIds: [],
    },
    {
      id: 'cov-p005-07',
      code: 'C-07',
      title: '投资与进度口径一致性',
      status: 'checked',
      note: '核对投资控制额、进度节点与建设目标是否一致。',
      findingIds: [],
    },
    {
      id: 'cov-p005-08',
      code: 'C-08',
      title: '验收与交付要求内部一致性',
      status: 'checked',
      note: '核对试运行、检测与运维服务期要求是否相互支持。',
      findingIds: [],
    },
    {
      id: 'cov-p005-09',
      code: 'C-09',
      title: '附件与表格覆盖',
      status: 'not_applicable',
      note: '审查范围仅限 Markdown 可提取文本，文档附件与表格不在可检查范围内。',
      findingIds: [],
    },
  ],
  scopeNote: '审查对象为材料 mat-001 当前版本（版本 1）；仅检查可提取文本的内部一致性，附件与表格不适用。',
});

const createP005Findings = (): FindingsPayload => ({
  type: 'findings',
  findings: [],
  scopeNote: '在可检查的 8 个覆盖项中未发现问题；附件与表格不适用，不计入检查结果。',
});

const createP005ReportPayload = (): ReviewReportPayload => {
  const coverage = createP005Coverage();
  return {
    type: 'review_report',
    summary:
      '在可检查范围内未发现问题：需求说明书 V1.2 各章表述一致，关键指标前后未出现矛盾；附件与表格不在本次检查范围内。',
    coverageStats: {
      checked: coverage.items.filter((item) => item.status === 'checked').length,
      unchecked: coverage.items.filter((item) => item.status === 'unchecked').length,
      uncheckable: coverage.items.filter((item) => item.status === 'uncheckable').length,
      notApplicable: coverage.items.filter((item) => item.status === 'not_applicable').length,
    },
    findingStats: { high: 0, medium: 0, low: 0, info: 0, uncertain: 0 },
    limitations: [
      '仅对 Markdown 可提取文本检查，附件表格未覆盖。',
      '未核对原始排版、批注与修订痕迹。',
      '未对需求内容本身的合理性做判断，仅检查内部一致性。',
    ],
    reviewedVersionRefs: [],
  };
};

export const createP005Artifacts = (): StageArtifact[] => [
  {
    id: 'art-p005-coverage',
    packageId: 'pkg-005',
    stageId: seedStageId('pkg-005', 'coverage'),
    kind: 'coverage_plan',
    revision: 1,
    status: 'confirmed',
    title: '覆盖计划',
    updatedAt: '2026-11-10T10:25:00+08:00',
    updatedBy: currentUser(),
    summary: '将需求说明书拆为 9 个覆盖项：8 项可检查、1 项不适用（附件与表格）。',
    basedOn: [ref('mat-001', 'requirement')],
    payload: createP005Coverage(),
  },
  {
    id: 'art-p005-findings',
    packageId: 'pkg-005',
    stageId: seedStageId('pkg-005', 'inspection'),
    kind: 'findings',
    revision: 1,
    status: 'confirmed',
    title: '问题清单',
    updatedAt: '2026-11-10T14:30:00+08:00',
    updatedBy: currentUser(),
    summary: '问题清单为空：在可检查范围内未发现问题。',
    basedOn: [ref('mat-001', 'requirement')],
    payload: createP005Findings(),
  },
  {
    id: 'art-p005-report',
    packageId: 'pkg-005',
    stageId: seedStageId('pkg-005', 'report'),
    kind: 'review_report',
    revision: 1,
    status: 'confirmed',
    title: '审查报告',
    updatedAt: '2026-11-10T16:10:00+08:00',
    updatedBy: currentUser(),
    summary: '零问题审查报告：8 项已检查、1 项不适用，并写明 3 条检查限制。',
    basedOn: [ref('mat-001', 'requirement'), ref('mat-005', 'template')],
    payload: createP005ReportPayload(),
  },
];

export const createP005Versions = (): PackageVersion[] => [
  {
    id: 'ver-p005-v1',
    packageId: 'pkg-005',
    projectId: 'prj-001',
    versionNumber: 1,
    label: 'P005/v1',
    status: 'delivered',
    createdAt: '2026-11-10T16:20:00+08:00',
    createdBy: currentUser(),
    changeNote: '需求说明书一致性审查报告首次交付：零问题、覆盖完整，审查对象冻结为 mat-001 版本 1。',
    inputs: [ref('mat-001', 'requirement')],
    artifacts: [
      { artifactId: 'art-p005-coverage', revision: 1, title: '覆盖计划', kind: 'coverage_plan' },
      { artifactId: 'art-p005-findings', revision: 1, title: '问题清单', kind: 'findings' },
      { artifactId: 'art-p005-report', revision: 1, title: '审查报告', kind: 'review_report' },
    ],
    deliverable: {
      id: 'del-p005-v1',
      kind: 'review_report',
      title: '智慧园区建设需求说明书 V1.2 一致性审查报告',
      fileName: 'P005-需求说明书一致性审查报告.md',
      format: 'report',
      pageCount: 12,
      simulatedFile: true,
      document: createP005ReportDocument(),
    },
    confirmations: [
      {
        id: 'conf-p005-v1-01',
        label: '审查报告已确认',
        confirmedBy: currentUser(),
        confirmedAt: '2026-11-10T16:18:00+08:00',
        artifactId: 'art-p005-report',
      },
    ],
  },
];

export const createP005Package = (): ArtifactPackage => ({
  id: 'pkg-005',
  code: 'P005',
  projectId: 'prj-001',
  title: '需求说明书一致性审查',
  task: createP005Task(),
  status: 'delivered',
  primaryConversationId: 'conv-p005',
  reviewTarget: {
    kind: 'material_version',
    materialId: 'mat-001',
    materialVersionId: 'mv-001-1',
    materialName: '智慧园区建设需求说明书 V1.2.docx',
    versionNumber: 1,
  },
  versionIds: ['ver-p005-v1'],
  stageIds: ['scope', 'basis', 'coverage', 'inspection', 'recheck', 'report'].map((key) => seedStageId('pkg-005', key)),
  createdAt: '2026-11-10T09:40:00+08:00',
  updatedAt: '2026-11-10T16:20:00+08:00',
  createdBy: currentUser(),
  executionId: 'exec-p005',
  statusHistory: [
    { status: 'draft', at: '2026-11-10T09:40:00+08:00', note: '创建材料审查任务' },
    { status: 'in_progress', at: '2026-11-10T09:45:00+08:00' },
    { status: 'delivered', at: '2026-11-10T16:20:00+08:00', note: 'P005/v1 审查报告正式交付' },
  ],
});

export const createP005Conversation = (): Conversation => ({
  id: 'conv-p005',
  packageId: 'pkg-005',
  title: '需求说明书一致性审查会话',
  createdAt: '2026-11-10T09:42:00+08:00',
  messageIds: ['msg-p005-01', 'msg-p005-02', 'msg-p005-03', 'msg-p005-04', 'msg-p005-05', 'msg-p005-06', 'msg-p005-07'],
});

export const createP005Messages = (): ConversationMessage[] => [
  {
    id: 'msg-p005-01',
    conversationId: 'conv-p005',
    role: 'user',
    text: '帮我检查需求说明书 V1.2 内部是否一致；只管可提取的文字，附件不用管，结论要写清检查范围。',
    createdAt: '2026-11-10T09:42:00+08:00',
    author: currentUser(),
    stageKey: 'scope',
  },
  {
    id: 'msg-p005-02',
    conversationId: 'conv-p005',
    role: 'system',
    text: '阶段『范围与材料理解』开始：锁定材料 mat-001 当前版本，标记附件与表格不在可检查范围。',
    createdAt: '2026-11-10T09:45:00+08:00',
    stageKey: 'scope',
  },
  {
    id: 'msg-p005-03',
    conversationId: 'conv-p005',
    role: 'assistant',
    text: '演示模拟执行：覆盖计划已生成，共 9 项：8 项可检查，附件与表格标记为不适用。',
    createdAt: '2026-11-10T10:25:00+08:00',
    author: demoAgentUser(),
    stageKey: 'coverage',
    simulated: true,
    attachmentIds: ['art-p005-coverage'],
  },
  {
    id: 'msg-p005-04',
    conversationId: 'conv-p005',
    role: 'user',
    text: '按这个范围检查即可。',
    createdAt: '2026-11-10T10:28:00+08:00',
    author: currentUser(),
    stageKey: 'coverage',
  },
  {
    id: 'msg-p005-05',
    conversationId: 'conv-p005',
    role: 'assistant',
    text: '演示模拟执行：检查完成，在 8 个可检查项中未发现问题；关键指标前后未出现矛盾，附件与表格不在检查范围。',
    createdAt: '2026-11-10T14:30:00+08:00',
    author: demoAgentUser(),
    stageKey: 'inspection',
    simulated: true,
    attachmentIds: ['art-p005-findings'],
  },
  {
    id: 'msg-p005-06',
    conversationId: 'conv-p005',
    role: 'user',
    text: '零问题也要把实际检查范围和限制写进报告，然后交付。',
    createdAt: '2026-11-10T15:00:00+08:00',
    author: currentUser(),
    stageKey: 'report',
  },
  {
    id: 'msg-p005-07',
    conversationId: 'conv-p005',
    role: 'system',
    text: '正式版本 P005/v1 已提交：需求说明书一致性审查报告（零发现，覆盖完整）。',
    createdAt: '2026-11-10T16:20:00+08:00',
    attachmentIds: ['ver-p005-v1'],
  },
];

export const createP005Execution = (): ExecutionRun => ({
  id: 'exec-p005',
  packageId: 'pkg-005',
  status: 'completed',
  currentStageKey: 'report',
  startedAt: '2026-11-10T09:45:00+08:00',
  updatedAt: '2026-11-10T16:20:00+08:00',
  activity: '审查报告 P005/v1 已提交',
  inputVersionIds: ['mv-001-1'],
  events: [
    { id: 'evt-p005-01', type: 'queued', at: '2026-11-10T09:40:00+08:00', label: '运行已排队' },
    { id: 'evt-p005-02', type: 'stage_started', at: '2026-11-10T09:45:00+08:00', label: '阶段『范围与材料理解』开始' },
    { id: 'evt-p005-03', type: 'artifact_candidate', at: '2026-11-10T10:25:00+08:00', label: '生成覆盖计划候选' },
    { id: 'evt-p005-04', type: 'stage_started', at: '2026-11-10T10:25:00+08:00', label: '阶段『执行检查』开始' },
    {
      id: 'evt-p005-05',
      type: 'progress',
      at: '2026-11-10T14:30:00+08:00',
      label: '检查完成：8 项通过、1 项不适用、0 个问题',
    },
    { id: 'evt-p005-06', type: 'artifact_candidate', at: '2026-11-10T16:10:00+08:00', label: '生成零问题审查报告候选' },
    { id: 'evt-p005-07', type: 'completed', at: '2026-11-10T16:20:00+08:00', label: '审查报告 P005/v1 已提交' },
  ],
});
