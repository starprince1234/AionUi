/**
 * Simulated stage-output generators for the demo adapter.
 *
 * Everything here runs in the browser and is clearly labelled as simulated in
 * the UI. It exists so the frontend workflows can be exercised end-to-end
 * before AionCore exposes stage execution. It must never be presented as real
 * Codex output or as professional judgement.
 */
import type {
  ArtifactPackage,
  ComparisonDifference,
  ComparisonReportPayload,
  CoverageItem,
  CoveragePayload,
  Deliverable,
  DifferencesPayload,
  DraftPayload,
  DraftSection,
  EvidDocument,
  EvidossierSnapshot,
  FactListPayload,
  FindingsPayload,
  MappingPayload,
  MaterialReference,
  ReviewFinding,
  ReviewReportPayload,
  SectionMapping,
  Stage,
  StageArtifactKind,
  StageArtifactPayload,
  ValidationPayload,
  VersionRef,
} from '../domain/types';

/* -------------------------------------------------------------------------- */
/* Small helpers                                                               */
/* -------------------------------------------------------------------------- */

export const nowIso = (): string => new Date().toISOString();

let idCounter = 0;
export const uid = (prefix: string): string => {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
};

export const clone = <T>(value: T): T => {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
};

export const findDocForVersion = (snapshot: EvidossierSnapshot, versionId: string): EvidDocument | undefined => {
  const version = snapshot.versions.find((item) => item.id === versionId);
  return version?.deliverable.document;
};

export const findDocForMaterialVersion = (
  snapshot: EvidossierSnapshot,
  materialVersionId: string
): EvidDocument | undefined => {
  for (const material of snapshot.materials) {
    const version = material.versions.find((item) => item.id === materialVersionId);
    if (version?.document) return version.document;
  }
  return undefined;
};

export const findVersionRef = (snapshot: EvidossierSnapshot, versionId: string): VersionRef | undefined => {
  const version = snapshot.versions.find((item) => item.id === versionId);
  if (!version) return undefined;
  const pkg = snapshot.packages.find((item) => item.id === version.packageId);
  if (!pkg) return undefined;
  return {
    packageId: pkg.id,
    versionId: version.id,
    packageCode: pkg.code,
    packageTitle: pkg.title,
    versionLabel: version.label,
    versionNumber: version.versionNumber,
    taskKind: pkg.task.kind,
  };
};

export const projectMaterials = (snapshot: EvidossierSnapshot, projectId: string) =>
  snapshot.materials.filter((material) => material.projectId === projectId);

export const buildMaterialReferences = (
  snapshot: EvidossierSnapshot,
  projectId: string,
  limit = 4
): MaterialReference[] =>
  projectMaterials(snapshot, projectId)
    .slice(0, limit)
    .map((material) => {
      const version = material.versions.find((item) => item.id === material.currentVersionId) ?? material.versions[0];
      return {
        id: uid('ref'),
        materialId: material.id,
        materialVersionId: version?.id ?? '',
        materialName: material.name,
        versionNumber: version?.version ?? 1,
        role: material.usage,
      };
    });

const docSectionPath = (doc: EvidDocument, blockId: string): string => {
  let heading = doc.title;
  for (const block of doc.blocks) {
    if (block.id === blockId) return heading;
    if (block.type === 'heading') heading = `${heading} > ${block.text ?? ''}`;
  }
  return heading;
};

export const locateBlock = (
  doc: EvidDocument | undefined,
  predicate: (index: number) => boolean
): { blockId: string; quote: string } | undefined => {
  if (!doc) return undefined;
  const index = doc.blocks.findIndex((_block, i) => predicate(i));
  if (index < 0) return undefined;
  const block = doc.blocks[index];
  return {
    blockId: block.id,
    quote: (block.text ?? block.items?.[0] ?? block.rows?.[0]?.join(' / ') ?? '').slice(0, 90),
  };
};

/* -------------------------------------------------------------------------- */
/* Generate & revise simulation                                                */
/* -------------------------------------------------------------------------- */

const outlineTitles = (goal: string): string[] => {
  if (/能耗|节能/.test(goal)) return ['现状与能耗基线', '能耗监测方案', '节能控制策略', '数据采集与安全', '实施与验收'];
  if (/运维/.test(goal)) return ['运维范围与职责', '组织与值班安排', '故障响应与备件', '培训与考核', '服务保障指标'];
  if (/设备|选型/.test(goal)) return ['设备选型依据', '参数比选', '兼容与扩容', '供货与实施', '验收标准'];
  return ['项目背景与目标', '需求与范围分析', '总体技术方案', '实施计划与里程碑', '运维保障与验收'];
};

const factItems = (pkg: ArtifactPackage, materials: MaterialReference[]): FactListPayload => {
  return {
    type: 'fact_list',
    items: [
      {
        id: uid('fact'),
        kind: 'requirement',
        statement: '交付目标：' + pkg.task.goal,
        detail: '来自创建交付包时填写的任务目标。',
        status: 'confirmed',
      },
      {
        id: uid('fact'),
        kind: 'requirement',
        statement: '园区一期需在 2026 年 12 月前完成系统联调，并在验收前提交完整技术方案。',
        detail: '来自需求说明书进度要求章节。',
        status: materials.length > 0 ? 'confirmed' : 'pending',
      },
      {
        id: uid('fact'),
        kind: 'fact',
        statement: '核心设备需要满足 7×24 小时运行，关键链路采用双机热备。',
        detail: '来自需求说明书可靠性条款。',
        status: 'confirmed',
      },
      {
        id: uid('fact'),
        kind: 'fact',
        statement: '现场弱电井空间有限，需复核机柜尺寸与散热条件。',
        detail: '来自勘察记录，尚待现场二次确认。',
        status: 'pending',
      },
      {
        id: uid('fact'),
        kind: 'conflict',
        statement: '需求说明书要求投资控制在一期预算内，但设备参数表推荐型号超出预算约 8%。',
        detail: '两份输入材料存在冲突，需用户裁决或补充预算依据。',
        status: 'conflict',
      },
      {
        id: uid('fact'),
        kind: 'gap',
        statement: '缺少园区供电容量与配电改造范围的有效依据。',
        detail: '材料清单中未找到对应文件，不能作为已核实条件。',
        status: 'missing',
      },
    ],
    openQuestions: ['设备参数超预算的取舍由谁确认？', '供电容量数据是否可提供最新版本？'],
  };
};

const outlinePayload = (pkg: ArtifactPackage, materials: MaterialReference[]): StageArtifactPayload => ({
  type: 'outline',
  scopeNote: pkg.task.revisionOfVersionId ? pkg.task.revisionScope : undefined,
  sections: outlineTitles(pkg.task.goal).map((title, index) => ({
    id: uid('sec'),
    title,
    purpose: `回应任务目标：${pkg.task.goal.slice(0, 40)}`,
    requirementRefs: [index === 0 ? '交付目标' : '需求说明书相关条款'],
    basisRefs: materials.slice(0, Math.max(1, Math.min(2, materials.length))).map((item) => item.id),
    status: index === 0 ? 'confirmed' : 'planned',
  })),
});

const draftPayload = (pkg: ArtifactPackage, materials: MaterialReference[]): DraftPayload => {
  const sections: DraftSection[] = outlineTitles(pkg.task.goal).map((title, index) => ({
    id: uid('dsec'),
    heading: title,
    paragraphs: [
      {
        id: uid('para'),
        text: `${title}围绕「${pkg.task.goal}」展开。本节根据项目材料与任务要求整理可执行内容，具体参数以确认后的依据为准。`,
        citationRefs: materials.slice(0, 1).map((item) => item.id),
      },
      {
        id: uid('para'),
        text:
          index === 0
            ? '本节说明项目背景、交付范围与边界条件，并列出当前仍未取得依据的待确认事项。'
            : '本节给出方案要点、实施安排与验证方式，不对未核实的数据作出承诺。',
      },
    ],
  }));
  return { type: 'draft', sections };
};

const validationPayload = (pkg: ArtifactPackage): ValidationPayload => ({
  type: 'validation',
  checks: [
    { id: uid('chk'), label: '要求覆盖检查', status: 'pass', detail: '任务要求与大纲章节一一对应。' },
    { id: uid('chk'), label: '引用来源检查', status: 'warn', detail: '有 2 处引用指向待确认版本的设备参数表。' },
    {
      id: uid('chk'),
      label: '授权范围检查',
      status: 'pass',
      detail: pkg.task.revisionScope ? '修改范围未越出授权章节。' : '新生成内容不涉及旧版本改写。',
    },
    { id: uid('chk'), label: '结构与可读性', status: 'pass', detail: '章节层级完整，可导出为文档。' },
    { id: uid('chk'), label: '专业判断复核', status: 'manual', detail: '专业结论需人工复核，模拟执行不提供专业保证。' },
  ],
  openItems: ['设备参数表版本待确认', '投资估算需人工复核'],
});

/* -------------------------------------------------------------------------- */
/* Review simulation                                                           */
/* -------------------------------------------------------------------------- */

type ReviewSimulationContext = {
  targetDoc?: EvidDocument;
  targetLabel: string;
  basisMaterials: MaterialReference[];
};

const coverageFromDoc = (ctx: ReviewSimulationContext): CoveragePayload => {
  const headings = (ctx.targetDoc?.blocks ?? []).filter((block) => block.type === 'heading').slice(0, 6);
  const items: CoverageItem[] = headings.map(
    (heading, index): CoverageItem => ({
      id: uid('cov'),
      code: `C-${String(index + 1).padStart(2, '0')}`,
      title: heading.text ?? `第 ${index + 1} 部分`,
      status: index === headings.length - 1 && headings.length > 3 ? 'unchecked' : 'checked',
      note: index === headings.length - 1 && headings.length > 3 ? '本次模拟执行未完成该部分检查。' : undefined,
      findingIds: [],
    })
  );
  if (items.length === 0) {
    items.push({
      id: uid('cov'),
      code: 'C-01',
      title: '全文可读范围',
      status: 'checked',
      findingIds: [],
    });
  }
  items.push({
    id: uid('cov'),
    code: `C-${String(items.length + 1).padStart(2, '0')}`,
    title: '附件与表格数据',
    status: 'uncheckable',
    note: '设备参数表存在合并单元格，模拟执行无法可靠提取，不能计入已检查范围。',
    findingIds: [],
  });
  items.push({
    id: uid('cov'),
    code: `C-${String(items.length + 2).padStart(2, '0')}`,
    title: '编写模板符合性',
    status: 'not_applicable',
    note: '模板仅作结构参考，不构成强制审查依据。',
    findingIds: [],
  });
  return {
    type: 'coverage_plan',
    items,
    scopeNote: ctx.targetLabel,
  };
};

const findingsFromDoc = (ctx: ReviewSimulationContext, coverage: CoveragePayload): FindingsPayload => {
  const doc = ctx.targetDoc;
  const blocks = doc?.blocks ?? [];
  const findBlock = (keyword: string): number => blocks.findIndex((block) => (block.text ?? '').includes(keyword));
  const makeLocation = (index: number) => {
    if (index < 0 || !doc) return undefined;
    const block = blocks[index];
    return {
      documentId: doc.id,
      blockId: block.id,
      sectionPath: docSectionPath(doc, block.id),
      quote: (block.text ?? '').slice(0, 90),
    };
  };

  const candidates: Array<Omit<ReviewFinding, 'code' | 'coverageItemId'>> = [
    {
      id: uid('find'),
      severity: 'high',
      title: '投资估算与需求说明书预算口径不一致',
      description:
        '方案中的投资估算总额与需求说明书规定的预算上限存在偏差，且未说明超出部分的审批依据。该问题在模拟审查中由文本对照产生。',
      basis: '需求说明书 V1.2 · 第 4 章 投资控制要求',
      location: makeLocation(findBlock('投资')),
      status: 'open',
      suggestion: '补充预算对照表，说明超支部分的范围与审批路径，或调整设备配置。',
    },
    {
      id: uid('find'),
      severity: 'high',
      title: '关键设备可靠性指标缺少可验收表述',
      description: '方案描述设备具备高可靠性，但未给出可用性指标、故障恢复时间等可验收条件。',
      basis: '需求说明书 V1.2 · 可靠性要求章节',
      location: makeLocation(findBlock('可靠性') >= 0 ? findBlock('可靠性') : findBlock('设备')),
      status: 'open',
      suggestion: '补充可用性指标、双机热备切换时间与验收方法。',
    },
    {
      id: uid('find'),
      severity: 'medium',
      title: '运维保障章节职责边界不清',
      description: '运维职责在建设单位与总包单位之间的划分不完整，缺少升级与仲裁机制。',
      basis: '需求说明书 V1.2 · 运维服务要求',
      location: makeLocation(findBlock('运维')),
      status: 'open',
      suggestion: '补充职责矩阵与故障升级路径。',
    },
    {
      id: uid('find'),
      severity: 'medium',
      title: '实施计划缺少与供电改造的接口安排',
      description: '实施计划未体现供电改造窗口对系统联调的影响，存在进度风险。',
      basis: '勘察记录 · 现场条件',
      location: makeLocation(findBlock('实施') >= 0 ? findBlock('实施') : blocks.length - 1),
      status: 'uncertain',
      suggestion: '补充与供电改造的接口计划及缓冲时间。',
    },
    {
      id: uid('find'),
      severity: 'low',
      title: '术语使用前后不一致',
      description: '同一设备在文中出现两种名称，可能影响后续采购与验收对照。',
      basis: '需求说明书 V1.2 · 术语表',
      location: makeLocation(findBlock('设备')),
      status: 'open',
      suggestion: '统一术语并与需求说明书术语表对齐。',
    },
    {
      id: uid('find'),
      severity: 'info',
      title: '附件引用无法回到原文',
      description: '文中引用了设备参数表第 3 页的关键参数，但该表在模拟执行中无法可靠读取，引用待人工核实。',
      basis: '设备选型参数表',
      location: makeLocation(0),
      status: 'uncertain',
      citationUnresolved: true,
      suggestion: '提供可读取的参数表版本，或人工核对后更新引用。',
    },
  ];

  const findings: ReviewFinding[] = candidates.map((item, index) => ({
    ...item,
    code: `F-${String(index + 1).padStart(2, '0')}`,
    coverageItemId: coverage.items[index % Math.max(1, coverage.items.length)]?.id,
  }));

  // Link findings back to coverage items.
  for (const item of coverage.items) {
    item.findingIds = findings.filter((finding) => finding.coverageItemId === item.id).map((finding) => finding.id);
  }
  return { type: 'findings', findings, scopeNote: ctx.targetLabel };
};

const reportFromReview = (
  ctx: ReviewSimulationContext,
  coverage: CoveragePayload,
  findings: FindingsPayload,
  versionRefs: VersionRef[]
): ReviewReportPayload => {
  const count = (status: string) => coverage.items.filter((item) => item.status === status).length;
  const severity = (value: string) => findings.findings.filter((item) => item.severity === value).length;
  return {
    type: 'review_report',
    summary: `本次模拟审查覆盖「${ctx.targetLabel}」。共建立 ${coverage.items.length} 个检查项，发现 ${findings.findings.length} 个问题。模拟结果仅用于演示前端工作流，不构成专业审查结论。`,
    coverageStats: {
      checked: count('checked'),
      unchecked: count('unchecked'),
      uncheckable: count('uncheckable'),
      notApplicable: count('not_applicable'),
    },
    findingStats: {
      high: severity('high'),
      medium: severity('medium'),
      low: severity('low'),
      info: severity('info'),
      uncertain: findings.findings.filter((item) => item.status === 'uncertain').length,
    },
    limitations: ['模拟执行未接入真实文档解析与专业规则库。', '设备参数表表格结构无法可靠提取，相关结论待人工核实。'],
    reviewedVersionRefs: versionRefs,
  };
};

/* -------------------------------------------------------------------------- */
/* Compare simulation                                                          */
/* -------------------------------------------------------------------------- */

const compareDocs = (baseDoc: EvidDocument | undefined, targetDoc: EvidDocument | undefined) => {
  const baseHeadings = (baseDoc?.blocks ?? []).filter((block) => block.type === 'heading');
  const targetHeadings = (targetDoc?.blocks ?? []).filter((block) => block.type === 'heading');
  const mappings: SectionMapping[] = [];
  const usedTarget = new Set<string>();

  for (const base of baseHeadings) {
    const exact = targetHeadings.find((target) => (target.text ?? '') === (base.text ?? ''));
    if (exact) {
      usedTarget.add(exact.id);
      mappings.push({
        id: uid('map'),
        baseBlockId: base.id,
        targetBlockId: exact.id,
        baseTitle: base.text ?? '',
        targetTitle: exact.text ?? '',
        confidence: 'confirmed',
      });
    }
  }
  for (const target of targetHeadings) {
    if (usedTarget.has(target.id)) continue;
    mappings.push({
      id: uid('map'),
      targetBlockId: target.id,
      baseTitle: '（无对应章节）',
      targetTitle: target.text ?? '',
      confidence: 'candidate',
    });
  }
  const unmatchedBase = baseHeadings
    .filter((base) => !mappings.some((mapping) => mapping.baseBlockId === base.id))
    .map((base) => base.text ?? '');
  const unmatchedTarget = targetHeadings
    .filter((target) => !mappings.some((mapping) => mapping.targetBlockId === target.id))
    .map((target) => target.text ?? '');
  return { mappings, unmatchedBase, unmatchedTarget };
};

const buildLocations = (doc: EvidDocument | undefined, title: string) => {
  if (!doc) return undefined;
  const heading = doc.blocks.find((block) => block.type === 'heading');
  const paragraph = doc.blocks.find((block) => block.type === 'paragraph');
  const block = heading ?? paragraph;
  if (!block) return undefined;
  return {
    documentId: doc.id,
    blockId: block.id,
    sectionPath: title,
    quote: (block.text ?? '').slice(0, 90),
  };
};

const differencesFromDocs = (
  baseDoc: EvidDocument | undefined,
  targetDoc: EvidDocument | undefined,
  beforeLabel: string,
  afterLabel: string
): { differences: DifferencesPayload; mappingPayload: MappingPayload } => {
  const { mappings, unmatchedBase, unmatchedTarget } = compareDocs(baseDoc, targetDoc);
  const differences: ComparisonDifference[] = [];

  // Changed sections: same heading, different following paragraph text length/content.
  const baseParas = (baseDoc?.blocks ?? []).filter((block) => block.type === 'paragraph');
  const targetParas = (targetDoc?.blocks ?? []).filter((block) => block.type === 'paragraph');
  const changedCount = Math.max(0, Math.min(targetParas.length, baseParas.length, 4));
  for (let i = 0; i < changedCount; i += 1) {
    const base = baseParas[i];
    const target = targetParas[i];
    if (!base || !target || base.text === target.text) continue;
    differences.push({
      id: uid('diff'),
      code: `D-${String(differences.length + 1).padStart(2, '0')}`,
      kind: 'modified',
      summary: `第 ${i + 1} 段内容发生变化`,
      detail: '模拟比对按段落文本对照得到该变化；变化本身不代表问题，是否合规需另行审查。',
      baseLocation: {
        documentId: baseDoc?.id ?? '',
        blockId: base.id,
        sectionPath: beforeLabel,
        quote: (base.text ?? '').slice(0, 90),
      },
      targetLocation: {
        documentId: targetDoc?.id ?? '',
        blockId: target.id,
        sectionPath: afterLabel,
        quote: (target.text ?? '').slice(0, 90),
      },
      baseText: base.text,
      targetText: target.text,
      confidence: 'confirmed',
    });
  }

  for (const missing of unmatchedBase) {
    differences.push({
      id: uid('diff'),
      code: `D-${String(differences.length + 1).padStart(2, '0')}`,
      kind: 'removed',
      summary: `章节「${missing}」在目标版本中不存在`,
      detail: '可能被删除或移动，模拟比对无法确认去向，标记为待确认。',
      baseLocation: buildLocations(baseDoc, missing),
      confidence: 'uncertain',
    });
  }
  for (const added of unmatchedTarget.slice(0, 2)) {
    differences.push({
      id: uid('diff'),
      code: `D-${String(differences.length + 1).padStart(2, '0')}`,
      kind: 'added',
      summary: `目标版本新增章节「${added}」`,
      detail: '新增内容在基准版本中没有对应章节。',
      targetLocation: buildLocations(targetDoc, added),
      confidence: 'confirmed',
    });
  }
  if (unmatchedTarget.length > 2) {
    differences.push({
      id: uid('diff'),
      code: `D-${String(differences.length + 1).padStart(2, '0')}`,
      kind: 'moved',
      summary: `疑似移动：${unmatchedTarget.slice(2).join('、')}`,
      detail: '目标版本中出现了位置变化的内容，模拟比对无法确认唯一对应关系。',
      targetLocation: buildLocations(targetDoc, unmatchedTarget[2]),
      confidence: 'candidate',
    });
  }
  if (differences.length === 0) {
    differences.push({
      id: uid('diff'),
      code: 'D-01',
      kind: 'uncertain',
      summary: '未发现可确认的文本差异',
      detail: '两份文档的可读文本未发现差异；不排除表格、附件等无法读取内容存在变化。',
      baseLocation: buildLocations(baseDoc, beforeLabel),
      targetLocation: buildLocations(targetDoc, afterLabel),
      confidence: 'uncertain',
    });
  }

  return {
    differences: {
      type: 'differences',
      differences,
      scopeNote: `基准端：${beforeLabel}；目标端：${afterLabel}`,
    },
    mappingPayload: { type: 'mapping', mappings, unmatchedBase, unmatchedTarget },
  };
};

const reportFromCompare = (
  differences: DifferencesPayload,
  baseRef: VersionRef | undefined,
  targetRef: VersionRef | undefined,
  scopeNote: string
): ComparisonReportPayload => {
  const count = (kind: string) => differences.differences.filter((item) => item.kind === kind).length;
  return {
    type: 'comparison_report',
    summary: `本次模拟比对共识别 ${differences.differences.length} 处差异。${scopeNote}。模拟比对不判断变化好坏，涉及合规性仍需独立审查。`,
    differenceStats: {
      added: count('added'),
      removed: count('removed'),
      modified: count('modified'),
      moved: count('moved'),
      uncertain: count('uncertain'),
    },
    limitations: ['模拟比对仅覆盖可提取文本，未覆盖表格单元与附件。', '无法对应的内容保留为不确定，不自动合并。'],
    inputs: [
      ...(baseRef ? [{ ref: baseRef, role: 'baseline' as const }] : []),
      ...(targetRef ? [{ ref: targetRef, role: 'target' as const }] : []),
    ],
  };
};

/* -------------------------------------------------------------------------- */
/* Public builders                                                             */
/* -------------------------------------------------------------------------- */

const latestArtifactOfKind = (snapshot: EvidossierSnapshot, packageId: string, kind: StageArtifactKind) =>
  snapshot.artifacts
    .filter((artifact) => artifact.packageId === packageId && artifact.kind === kind)
    .sort((a, b) => b.revision - a.revision)[0];

export const buildArtifactPayload = (input: {
  snapshot: EvidossierSnapshot;
  pkg: ArtifactPackage;
  stage: Stage;
  kind: StageArtifactKind;
  title: string;
}): { payload: StageArtifactPayload; summary: string; basedOn: MaterialReference[] } => {
  const { snapshot, pkg, kind } = input;
  const materials = buildMaterialReferences(snapshot, pkg.projectId);

  if (pkg.task.kind === 'generate') {
    switch (kind) {
      case 'fact_list': {
        const payload = factItems(pkg, materials);
        return { payload, summary: `整理 ${payload.items.length} 条事实与要求，含冲突与缺口。`, basedOn: materials };
      }
      case 'outline': {
        const payload = outlinePayload(pkg, materials) as Extract<StageArtifactPayload, { type: 'outline' }>;
        return { payload, summary: `形成 ${payload.sections.length} 个章节的计划。`, basedOn: materials };
      }
      case 'draft': {
        const payload = draftPayload(pkg, materials);
        return { payload, summary: `生成 ${payload.sections.length} 节的模拟草稿。`, basedOn: materials };
      }
      case 'validation': {
        const payload = validationPayload(pkg);
        return {
          payload,
          summary: `执行 ${payload.checks.length} 项校验，${payload.openItems.length} 项待人工确认。`,
          basedOn: materials,
        };
      }
      default:
        return { payload: { type: 'fact_list', items: [], openQuestions: [] }, summary: '', basedOn: materials };
    }
  }

  if (pkg.task.kind === 'review') {
    const targetVersionId = pkg.reviewTarget?.kind === 'package_version' ? pkg.reviewTarget.versionId : undefined;
    const targetDoc =
      pkg.reviewTarget?.kind === 'package_version'
        ? findDocForVersion(snapshot, pkg.reviewTarget.versionId)
        : findDocForMaterialVersion(snapshot, pkg.reviewTarget?.materialVersionId ?? '');
    const targetLabel =
      pkg.reviewTarget?.kind === 'package_version'
        ? `${pkg.reviewTarget.versionLabel}`
        : (pkg.reviewTarget?.materialName ?? '待审材料');
    const ctx: ReviewSimulationContext = { targetDoc, targetLabel, basisMaterials: materials };

    if (kind === 'coverage_plan') {
      const payload = coverageFromDoc(ctx);
      return { payload, summary: `建立 ${payload.items.length} 个检查项。`, basedOn: materials };
    }
    if (kind === 'findings') {
      const coverage =
        (latestArtifactOfKind(snapshot, pkg.id, 'coverage_plan')?.payload as CoveragePayload | undefined) ??
        coverageFromDoc(ctx);
      const payload = findingsFromDoc(ctx, coverage);
      return { payload, summary: `记录 ${payload.findings.length} 个模拟问题。`, basedOn: materials };
    }
    if (kind === 'review_report') {
      const coverage =
        (latestArtifactOfKind(snapshot, pkg.id, 'coverage_plan')?.payload as CoveragePayload | undefined) ??
        coverageFromDoc(ctx);
      const findings =
        (latestArtifactOfKind(snapshot, pkg.id, 'findings')?.payload as FindingsPayload | undefined) ??
        findingsFromDoc(ctx, coverage);
      const versionRefs =
        targetVersionId && findVersionRef(snapshot, targetVersionId)
          ? [findVersionRef(snapshot, targetVersionId)!]
          : [];
      const payload = reportFromReview(ctx, coverage, findings, versionRefs);
      return {
        payload,
        summary: `汇总覆盖 ${coverage.items.length} 项、问题 ${findings.findings.length} 个。`,
        basedOn: materials,
      };
    }
  }

  if (pkg.task.kind === 'compare') {
    const inputIds = pkg.comparisonInputs ?? [];
    const baselineId = inputIds.find((item) => item.role === 'baseline')?.versionId;
    const targetId = inputIds.find((item) => item.role === 'target')?.versionId;
    const baseDoc = baselineId ? findDocForVersion(snapshot, baselineId) : undefined;
    const targetDoc = targetId ? findDocForVersion(snapshot, targetId) : undefined;
    const baseRef = baselineId ? findVersionRef(snapshot, baselineId) : undefined;
    const targetRef = targetId ? findVersionRef(snapshot, targetId) : undefined;

    if (kind === 'mapping') {
      const { mappingPayload } = differencesFromDocs(
        baseDoc,
        targetDoc,
        baseRef?.versionLabel ?? '基准',
        targetRef?.versionLabel ?? '目标'
      );
      return {
        payload: mappingPayload,
        summary: `建立 ${mappingPayload.mappings.length} 组对应关系。`,
        basedOn: materials,
      };
    }
    if (kind === 'differences') {
      const { differences } = differencesFromDocs(
        baseDoc,
        targetDoc,
        baseRef?.versionLabel ?? '基准',
        targetRef?.versionLabel ?? '目标'
      );
      return { payload: differences, summary: `识别 ${differences.differences.length} 处差异。`, basedOn: materials };
    }
    if (kind === 'comparison_report') {
      const differences =
        (latestArtifactOfKind(snapshot, pkg.id, 'differences')?.payload as DifferencesPayload | undefined) ??
        differencesFromDocs(baseDoc, targetDoc, baseRef?.versionLabel ?? '基准', targetRef?.versionLabel ?? '目标')
          .differences;
      const payload = reportFromCompare(differences, baseRef, targetRef, differences.scopeNote);
      return { payload, summary: `汇总 ${differences.differences.length} 处差异及限制。`, basedOn: materials };
    }
  }

  return { payload: { type: 'fact_list', items: [], openQuestions: [] }, summary: '', basedOn: materials };
};

/* -------------------------------------------------------------------------- */
/* Deliverable documents                                                       */
/* -------------------------------------------------------------------------- */

export const draftToDocument = (title: string, payload: DraftPayload, id: string): EvidDocument => {
  const blocks: EvidDocument['blocks'] = [];
  payload.sections.forEach((section) => {
    blocks.push({ id: uid('blk'), type: 'heading', level: 1, text: section.heading });
    section.paragraphs.forEach((paragraph) => {
      blocks.push({ id: uid('blk'), type: 'paragraph', text: paragraph.text });
    });
  });
  return { id, title, blocks };
};

export const documentToDraft = (doc: EvidDocument): DraftPayload => {
  const sections: DraftSection[] = [];
  let current: DraftSection | undefined;
  for (const block of doc.blocks) {
    if (block.type === 'heading') {
      current = { id: uid('dsec'), heading: block.text ?? '未命名章节', paragraphs: [] };
      sections.push(current);
      continue;
    }
    if (!current) {
      current = { id: uid('dsec'), heading: '正文', paragraphs: [] };
      sections.push(current);
    }
    if (block.type === 'paragraph' && block.text) {
      current.paragraphs.push({ id: uid('para'), text: block.text });
    } else if (block.type === 'list' && block.items) {
      current.paragraphs.push({ id: uid('para'), text: block.items.join('；') });
    } else if (block.type === 'table' && block.rows) {
      current.paragraphs.push({ id: uid('para'), text: block.rows.map((row) => row.join(' | ')).join('\n') });
    }
  }
  return { type: 'draft', sections };
};

const reportDoc = (title: string, payload: ReviewReportPayload | ComparisonReportPayload): EvidDocument => {
  const blocks: EvidDocument['blocks'] = [];
  const push = (block: Omit<EvidDocument['blocks'][number], 'id'>) => blocks.push({ id: uid('blk'), ...block });

  push({ type: 'heading', level: 1, text: '一、结论摘要' });
  push({ type: 'paragraph', text: payload.summary });

  if (payload.type === 'review_report') {
    push({ type: 'heading', level: 1, text: '二、检查覆盖' });
    push({
      type: 'table',
      header: true,
      rows: [
        ['状态', '数量'],
        ['已检查', String(payload.coverageStats.checked)],
        ['未检查', String(payload.coverageStats.unchecked)],
        ['无法检查', String(payload.coverageStats.uncheckable)],
        ['不适用', String(payload.coverageStats.notApplicable)],
      ],
    });
    push({ type: 'heading', level: 1, text: '三、问题统计' });
    push({
      type: 'table',
      header: true,
      rows: [
        ['严重程度', '数量'],
        ['高', String(payload.findingStats.high)],
        ['中', String(payload.findingStats.medium)],
        ['低', String(payload.findingStats.low)],
        ['提示', String(payload.findingStats.info)],
        ['待核实', String(payload.findingStats.uncertain)],
      ],
    });
  } else {
    push({ type: 'heading', level: 1, text: '二、差异统计' });
    push({
      type: 'table',
      header: true,
      rows: [
        ['类型', '数量'],
        ['新增', String(payload.differenceStats.added)],
        ['删除', String(payload.differenceStats.removed)],
        ['修改', String(payload.differenceStats.modified)],
        ['移动', String(payload.differenceStats.moved)],
        ['无法确认', String(payload.differenceStats.uncertain)],
      ],
    });
    push({ type: 'heading', level: 1, text: '三、比较输入' });
    payload.inputs.forEach((input) => {
      push({
        type: 'paragraph',
        text: `${input.ref.versionLabel}（${input.role === 'baseline' ? '基准端' : '目标端'}）· ${input.ref.packageTitle}`,
      });
    });
  }

  push({ type: 'heading', level: 1, text: '四、限制与未完成范围' });
  payload.limitations.forEach((item, index) => {
    push({ type: 'list', items: [`${index + 1}. ${item}`] });
  });
  push({
    type: 'paragraph',
    text: '本报告由 Evidossier 前端 V1 演示环境生成，用于演示报告结构与工作流。它不代表真实审查或比对结论。',
  });
  return { id: uid('doc'), title, blocks, pageCount: 4 };
};

export const buildDeliverableDocument = (
  snapshot: EvidossierSnapshot,
  pkg: ArtifactPackage
): { document: EvidDocument; fileName: string; kind: Deliverable['kind']; title: string } => {
  if (pkg.task.kind === 'generate') {
    const draftArtifact = [...snapshot.artifacts]
      .filter((artifact) => artifact.packageId === pkg.id && artifact.kind === 'draft')
      .sort((a, b) => b.revision - a.revision)[0];
    const outline = latestArtifactOfKind(snapshot, pkg.id, 'outline')?.payload as
      | Extract<StageArtifactPayload, { type: 'outline' }>
      | undefined;
    const payload =
      (draftArtifact?.payload as DraftPayload | undefined) ??
      (outline
        ? {
            type: 'draft' as const,
            sections: outline.sections.map((section) => ({
              id: uid('dsec'),
              heading: section.title,
              paragraphs: [{ id: uid('para'), text: section.purpose }],
            })),
          }
        : { type: 'draft' as const, sections: [] });
    const document = draftToDocument(pkg.title, payload, uid('doc'));
    return { document, fileName: `${pkg.title}.docx`, kind: 'document', title: pkg.title };
  }

  const reportArtifact = latestArtifactOfKind(
    snapshot,
    pkg.id,
    pkg.task.kind === 'review' ? 'review_report' : 'comparison_report'
  );
  if (reportArtifact) {
    const document = reportDoc(
      `${pkg.title}（模拟报告）`,
      reportArtifact.payload as ReviewReportPayload | ComparisonReportPayload
    );
    return {
      document,
      fileName: `${pkg.title}（模拟报告）.pdf`,
      kind: pkg.task.kind === 'review' ? 'review_report' : 'comparison_report',
      title: `${pkg.title}（模拟报告）`,
    };
  }

  // Fallback: build the report from scratch so the flow never produces an empty file.
  if (pkg.task.kind === 'review') {
    const targetVersionId = pkg.reviewTarget?.kind === 'package_version' ? pkg.reviewTarget.versionId : undefined;
    const targetDoc =
      pkg.reviewTarget?.kind === 'package_version'
        ? findDocForVersion(snapshot, pkg.reviewTarget.versionId)
        : findDocForMaterialVersion(snapshot, pkg.reviewTarget?.materialVersionId ?? '');
    const targetLabel =
      pkg.reviewTarget?.kind === 'package_version'
        ? pkg.reviewTarget.versionLabel
        : (pkg.reviewTarget?.materialName ?? '待审材料');
    const ctx: ReviewSimulationContext = { targetDoc, targetLabel, basisMaterials: [] };
    const coverage = coverageFromDoc(ctx);
    const findings = findingsFromDoc(ctx, coverage);
    const payload = reportFromReview(
      ctx,
      coverage,
      findings,
      targetVersionId && findVersionRef(snapshot, targetVersionId) ? [findVersionRef(snapshot, targetVersionId)!] : []
    );
    return {
      document: reportDoc(`${pkg.title}（模拟报告）`, payload),
      fileName: `${pkg.title}（模拟报告）.pdf`,
      kind: 'review_report',
      title: pkg.title,
    };
  }
  const differences = differencesFromDocs(undefined, undefined, '基准', '目标').differences;
  const payload = reportFromCompare(differences, undefined, undefined, differences.scopeNote);
  return {
    document: reportDoc(`${pkg.title}（模拟报告）`, payload),
    fileName: `${pkg.title}（模拟报告）.pdf`,
    kind: 'comparison_report',
    title: pkg.title,
  };
};

export { reportFromCompare, reportFromReview, differencesFromDocs };
