/**
 * Mock Evidossier repository.
 *
 * Implements the same `EvidossierRepository` contract the future HTTP adapter
 * will implement. All state lives in this browser (localStorage) and all
 * execution is simulated: no file upload, no Codex call, no server write.
 */
import {
  buildArtifactPayload,
  buildDeliverableDocument,
  buildMaterialReferences,
  clone,
  documentToDraft,
  findVersionRef,
  nowIso,
  uid,
} from './simulation';
import { createSeedState, SEED_SCHEMA_VERSION } from './seed';
import type {
  AddMaterialInput,
  ArtifactPackage,
  CreatePackageInput,
  EditArtifactInput,
  EvidossierSnapshot,
  ExecutionRun,
  Material,
  MaterialReference,
  PackageRelation,
  PackageVersion,
  Project,
  Stage,
  StageArtifact,
  StartComparisonInput,
  StartReviewInput,
  StartRevisionFromDifferencesInput,
  StartRevisionFromFindingsInput,
  SubmitVersionInput,
  UserRef,
  VersionRef,
  WorkDraft,
} from '../domain/types';
import type { DraftConflictResolution, EvidossierRepository, TickResult } from './repository';
import { DEMO_STORAGE_KEY } from './repository';
import { getBlueprint } from '../domain/blueprints';

const CURRENT_USER: UserRef = { id: 'usr-demo', displayName: '林析' };

const stageNameZh: Record<string, string> = {
  goal: '目标与材料理解',
  facts: '事实与要求整理',
  retrieval: '检索选材',
  plan: '大纲或修改计划',
  draft: '草稿编制',
  validation: '校验',
  delivery: '保存与交付',
  scope: '范围与材料理解',
  basis: '审查依据整理',
  coverage: '覆盖规划',
  inspection: '执行检查',
  recheck: '问题复核',
  report: '报告与交付',
  versions: '版本与范围确定',
  mapping: '对应关系建立',
  extraction: '差异提取',
  explanation: '语义说明',
};

const stageLabel = (key: string): string => stageNameZh[key] ?? key;

const makeExecutionId = (packageId: string): string => `exec-${packageId.replace(/^pkg-/, '')}`;

const readStored = (): EvidossierSnapshot | null => {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EvidossierSnapshot;
    if (!parsed || parsed.demo?.schemaVersion !== SEED_SCHEMA_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeStored = (snapshot: EvidossierSnapshot): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(
      DEMO_STORAGE_KEY,
      JSON.stringify({ ...snapshot, demo: { ...snapshot.demo, savedAt: nowIso() } })
    );
  } catch {
    // Storage may be full or blocked; the demo keeps working in memory.
  }
};

const nextPackageCode = (snapshot: EvidossierSnapshot, projectId: string): string => {
  const codes = snapshot.packages
    .filter((pkg) => pkg.projectId === projectId)
    .map((pkg) => Number.parseInt(pkg.code.replace(/\D/g, ''), 10))
    .filter((value) => Number.isFinite(value));
  const next = (codes.length > 0 ? Math.max(...codes) : 0) + 1;
  return `P${String(next).padStart(3, '0')}`;
};

const addMessage = (
  snapshot: EvidossierSnapshot,
  conversationId: string,
  message: Omit<EvidossierSnapshot['messages'][number], 'id' | 'conversationId' | 'createdAt'>
): void => {
  const conversation = snapshot.conversations.find((item) => item.id === conversationId);
  const id = uid('msg');
  snapshot.messages.push({ id, conversationId, createdAt: nowIso(), ...message });
  if (conversation) conversation.messageIds.push(id);
};

const pushEvent = (
  execution: ExecutionRun,
  type: ExecutionRun['events'][number]['type'],
  label: string,
  detail?: string
): void => {
  execution.events.push({ id: uid('evt'), type, at: nowIso(), label, detail });
  execution.updatedAt = nowIso();
};

const setPackageStatus = (pkg: ArtifactPackage, status: ArtifactPackage['status'], note?: string): void => {
  if (pkg.status !== status) {
    pkg.status = status;
    pkg.statusHistory.push({ status, at: nowIso(), note });
  }
  pkg.updatedAt = nowIso();
};

const materialRefsFromVersion = (version: PackageVersion): MaterialReference[] => version.inputs;

const collectInputRefs = (snapshot: EvidossierSnapshot, pkg: ArtifactPackage): MaterialReference[] => {
  const artifacts = snapshot.artifacts.filter((artifact) => artifact.packageId === pkg.id);
  const refs = artifacts.flatMap((artifact) => artifact.basedOn);
  const seen = new Set<string>();
  const result: MaterialReference[] = [];
  for (const ref of refs) {
    const key = `${ref.materialId}:${ref.materialVersionId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ ...ref });
  }
  return result;
};

const latestArtifactsByStage = (snapshot: EvidossierSnapshot, pkg: ArtifactPackage): StageArtifact[] => {
  const artifacts = snapshot.artifacts.filter((artifact) => artifact.packageId === pkg.id);
  const byStage = new Map<string, StageArtifact>();
  for (const artifact of artifacts) {
    const current = byStage.get(artifact.stageId);
    if (!current || artifact.revision > current.revision) byStage.set(artifact.stageId, artifact);
  }
  return [...byStage.values()];
};

export class MockEvidossierRepository implements EvidossierRepository {
  private state: EvidossierSnapshot | null = null;
  private readonly storage: boolean;

  constructor(options?: { storage?: boolean }) {
    this.storage = options?.storage ?? true;
  }

  private load(): EvidossierSnapshot {
    if (!this.state) {
      this.state = (this.storage ? readStored() : null) ?? createSeedState();
      this.normalizeState(this.state);
    }
    return this.state;
  }

  /**
   * Repair states that cannot make progress: a stage that is waiting for a
   * confirmation but has no candidate artifact, or a dangling artifact pointer.
   * This also upgrades demo snapshots persisted by older builds.
   */
  private normalizeState(state: EvidossierSnapshot): void {
    for (const stage of state.stages) {
      if ((stage.status === 'awaiting_confirmation' || stage.status === 'needs_review') && !stage.currentArtifactId) {
        stage.status = 'not_started';
        stage.completedAt = undefined;
      }
      if (stage.currentArtifactId && !state.artifacts.some((artifact) => artifact.id === stage.currentArtifactId)) {
        stage.currentArtifactId = undefined;
        if (stage.status === 'completed') stage.status = 'needs_review';
      }
    }
    for (const artifact of state.artifacts) {
      if (!state.stages.some((stage) => stage.id === artifact.stageId)) {
        artifact.status = 'superseded';
      }
    }
  }

  private persist(): void {
    if (this.state && this.storage) writeStored(this.state);
  }

  private snapshot(): EvidossierSnapshot {
    return clone(this.load());
  }

  /** Demo-only helper used by the UI to validate direct links. */
  async getSnapshot(): Promise<EvidossierSnapshot> {
    return this.snapshot();
  }

  async resetDemo(): Promise<EvidossierSnapshot> {
    this.state = createSeedState();
    if (this.storage) {
      try {
        localStorage.removeItem(DEMO_STORAGE_KEY);
      } catch {
        // ignore
      }
      writeStored(this.state);
    }
    return this.snapshot();
  }

  async tick(): Promise<TickResult> {
    const state = this.load();
    const running = state.executions.filter((execution) => execution.status === 'running');
    if (running.length === 0) return { changed: false, running: false };

    let changed = false;
    for (const execution of running) {
      if (this.advanceExecution(state, execution)) changed = true;
    }
    if (changed) this.persist();
    const stillRunning = state.executions.some((execution) => execution.status === 'running');
    return { changed, running: stillRunning };
  }

  private advanceExecution(state: EvidossierSnapshot, execution: ExecutionRun): boolean {
    const pkg = state.packages.find((item) => item.id === execution.packageId);
    if (!pkg) return false;
    const stages = state.stages.filter((stage) => stage.packageId === pkg.id).sort((a, b) => a.order - b.order);

    // A pending confirmation blocks the run: the task waits for the user.
    if (stages.some((stage) => stage.status === 'awaiting_confirmation' || stage.status === 'needs_review')) {
      return false;
    }

    const active = stages.find((stage) => stage.status === 'running');
    if (!active) {
      const next = stages.find((stage) => stage.status === 'not_started');
      if (!next) {
        execution.status = 'completed';
        execution.activity = '全部阶段已完成';
        execution.currentStageKey = undefined;
        pushEvent(execution, 'completed', '执行完成', '所有阶段已产生成果');
        setPackageStatus(pkg, 'awaiting_user', '所有阶段已完成，可以提交正式版本');
        pkg.attentionNote = '所有阶段已完成，可以提交正式版本。';
        return true;
      }
      next.status = 'running';
      next.startedAt = nowIso();
      execution.currentStageKey = next.key;
      execution.activity = `正在执行：${stageLabel(next.key)}`;
      setPackageStatus(pkg, 'in_progress');
      pkg.attentionNote = undefined;
      pushEvent(execution, 'stage_started', `开始阶段：${stageLabel(next.key)}`, next.key);
      addMessage(state, pkg.primaryConversationId, {
        role: 'system',
        text: `阶段「${stageLabel(next.key)}」已开始。演示环境中的执行由浏览器模拟推进，不代表真实 Codex 运行。`,
        stageKey: next.key,
        simulated: true,
      });
      return true;
    }

    const blueprint = getBlueprint(pkg.task.kind).find((item) => item.key === active.key);
    const progressTicks = execution.events.filter(
      (event) => event.type === 'progress' && event.detail === active.key
    ).length;

    if (progressTicks < 2) {
      const ratio = progressTicks === 0 ? 0.35 : 0.7;
      execution.activity = `正在执行：${stageLabel(active.key)}（模拟进度 ${Math.round(ratio * 100)}%）`;
      pushEvent(execution, 'progress', `阶段进度：${stageLabel(active.key)}`, active.key);
      return true;
    }

    if (blueprint?.artifactKind) {
      const built = buildArtifactPayload({
        snapshot: state,
        pkg,
        stage: active,
        kind: blueprint.artifactKind,
        title: blueprint.artifactTitleKey ?? stageLabel(active.key),
      });
      const previousRevisions = state.artifacts.filter(
        (artifact) => artifact.packageId === pkg.id && artifact.kind === blueprint.artifactKind
      );
      const revision = Math.max(0, ...previousRevisions.map((artifact) => artifact.revision)) + 1;
      const artifact: StageArtifact = {
        id: uid('art'),
        packageId: pkg.id,
        stageId: active.id,
        kind: blueprint.artifactKind,
        revision,
        status: 'pending_confirmation',
        title: stageLabel(active.key),
        updatedAt: nowIso(),
        updatedBy: CURRENT_USER,
        summary: built.summary,
        basedOn: built.basedOn,
        payload: built.payload,
      };
      state.artifacts.push(artifact);
      active.currentArtifactId = artifact.id;
      active.status = 'awaiting_confirmation';
      execution.activity = `已生成「${stageLabel(active.key)}」候选成果，等待你的确认`;
      pushEvent(execution, 'artifact_candidate', `候选成果：${stageLabel(active.key)}`, active.key);
      setPackageStatus(pkg, 'awaiting_user', `阶段「${stageLabel(active.key)}」等待确认`);
      pkg.attentionNote = `阶段「${stageLabel(active.key)}」已生成候选成果，等待你的确认。`;
      addMessage(state, pkg.primaryConversationId, {
        role: 'assistant',
        text: `已生成「${stageLabel(active.key)}」的候选成果。请在阶段成果中检查内容；确认后才会进入下一阶段。\n\n（演示模拟输出，不代表真实审查或专业判断。）`,
        stageKey: active.key,
        simulated: true,
      });
      return true;
    }

    active.status = 'completed';
    active.completedAt = nowIso();
    execution.activity = `完成阶段：${stageLabel(active.key)}`;
    pushEvent(execution, 'stage_started', `完成阶段：${stageLabel(active.key)}`, active.key);
    return true;
  }

  async createProject(input: { name: string; description: string }): Promise<Project> {
    const state = this.load();
    const project: Project = {
      id: uid('prj'),
      code: `PRJ-2026-${String(state.projects.length + 1).padStart(3, '0')}`,
      name: input.name,
      description: input.description,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      members: [{ user: state.currentUser, role: 'owner' }],
      tags: [],
    };
    state.projects.unshift(project);
    this.persist();
    return clone(project);
  }

  async renameProject(projectId: string, name: string): Promise<Project> {
    const state = this.load();
    const project = state.projects.find((item) => item.id === projectId);
    if (!project) throw new Error('项目不存在');
    project.name = name;
    project.updatedAt = nowIso();
    this.persist();
    return clone(project);
  }

  async addMaterial(input: AddMaterialInput): Promise<Material> {
    const state = this.load();
    const materialId = uid('mat');
    const versionId = uid('mv');
    const material: Material = {
      id: materialId,
      projectId: input.projectId,
      name: input.name,
      kind: input.kind,
      origin: 'uploaded',
      usage: input.usage,
      usageNote: input.usageNote,
      versions: [
        {
          id: versionId,
          version: 1,
          fileName: input.demoFileName,
          sizeBytes: input.sizeBytes,
          addedAt: nowIso(),
          parseStatus: 'pending',
          parseNote: '演示环境未上传服务器，未执行真实解析。',
        },
      ],
      currentVersionId: versionId,
      addedAt: nowIso(),
      updatedAt: nowIso(),
    };
    state.materials.unshift(material);
    this.persist();
    return clone(material);
  }

  async addMaterialVersion(materialId: string): Promise<Material> {
    const state = this.load();
    const material = state.materials.find((item) => item.id === materialId);
    if (!material) throw new Error('材料不存在');
    const nextVersion = Math.max(0, ...material.versions.map((item) => item.version)) + 1;
    const version = {
      id: uid('mv'),
      version: nextVersion,
      fileName: `${material.name.replace(/\.[^.]+$/, '')}_v${nextVersion}${material.name.match(/\.[^.]+$/)?.[0] ?? ''}`,
      sizeBytes: material.versions[0]?.sizeBytes ?? 1024 * 1024,
      addedAt: nowIso(),
      parseStatus: 'pending' as const,
      parseNote: '演示环境未上传服务器，未执行真实解析。',
    };
    material.versions.push(version);
    material.currentVersionId = version.id;
    material.updatedAt = nowIso();
    this.persist();
    return clone(material);
  }

  async removeMaterial(materialId: string): Promise<void> {
    const state = this.load();
    state.materials = state.materials.filter((item) => item.id !== materialId);
    this.persist();
  }

  async setMaterialParseOutcome(materialId: string, outcome: 'parsed' | 'failed'): Promise<Material> {
    const state = this.load();
    const material = state.materials.find((item) => item.id === materialId);
    if (!material) throw new Error('材料不存在');
    const version = material.versions.find((item) => item.id === material.currentVersionId);
    if (!version) throw new Error('材料版本不存在');
    if (outcome === 'failed') {
      version.parseStatus = 'failed';
      version.parseNote = '模拟解析失败：演示环境无法读取真实文件内容。';
      version.document = undefined;
    } else {
      version.parseStatus = 'parsed';
      version.parseNote = '模拟解析完成：正文为演示占位内容，不代表真实文件。';
      version.document = {
        id: uid('doc'),
        title: material.name,
        blocks: [
          { id: uid('blk'), type: 'heading', level: 1, text: '一、材料说明' },
          {
            id: uid('blk'),
            type: 'paragraph',
            text: `本文件为演示环境模拟解析结果，仅用于验证前端工作流。真实文件解析需要后端接入。文件名：${material.name}。`,
          },
          { id: uid('blk'), type: 'heading', level: 1, text: '二、模拟正文' },
          { id: uid('blk'), type: 'paragraph', text: '此处为演示占位正文，不包含真实业务数据。' },
        ],
      };
    }
    material.updatedAt = nowIso();
    this.persist();
    return clone(material);
  }

  private createPackageShell(
    state: EvidossierSnapshot,
    projectId: string,
    kind: ArtifactPackage['task']['kind'],
    title: string,
    goal: string,
    requirements: string[]
  ): { pkg: ArtifactPackage; conversationId: string; execution: ExecutionRun } {
    const code = nextPackageCode(state, projectId);
    const packageId = `pkg-${code.toLowerCase()}`;
    const conversationId = `conv-${code.toLowerCase()}`;
    const executionId = makeExecutionId(packageId);
    const project = state.projects.find((item) => item.id === projectId);
    if (!project) throw new Error('项目不存在');

    state.conversations.push({
      id: conversationId,
      packageId,
      title: `${title} · 主要对话`,
      createdAt: nowIso(),
      messageIds: [],
    });

    const stages: Stage[] = getBlueprint(kind).map(
      (blueprint, index): Stage => ({
        id: `stage-${code.toLowerCase()}-${blueprint.key}`,
        packageId,
        key: blueprint.key,
        order: index + 1,
        titleKey: blueprint.titleKey,
        descriptionKey: blueprint.descriptionKey,
        status: 'not_started',
        inputRefs: [],
      })
    );

    const execution: ExecutionRun = {
      id: executionId,
      packageId,
      status: 'running',
      startedAt: nowIso(),
      updatedAt: nowIso(),
      activity: '已创建交付包，开始模拟执行',
      events: [],
      inputVersionIds: [],
    };

    const pkg: ArtifactPackage = {
      id: packageId,
      code,
      projectId,
      title,
      task: {
        id: uid('task'),
        kind,
        goal,
        requirements,
        createdAt: nowIso(),
      },
      status: 'in_progress',
      primaryConversationId: conversationId,
      versionIds: [],
      stageIds: stages.map((stage) => stage.id),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      createdBy: state.currentUser,
      executionId,
      statusHistory: [{ status: 'in_progress', at: nowIso(), note: '交付包已创建' }],
    };

    state.packages.push(pkg);
    state.stages.push(...stages);
    state.executions.push(execution);
    project.updatedAt = nowIso();

    addMessage(state, conversationId, {
      role: 'user',
      text: `创建交付包：${title}\n\n目标：${goal}`,
      author: state.currentUser,
    });
    addMessage(state, conversationId, {
      role: 'system',
      text: '演示模式：交付包已创建。接下来的阶段推进为浏览器内模拟执行，不会调用 Codex。',
    });

    return { pkg, conversationId, execution };
  }

  async createPackage(input: CreatePackageInput): Promise<ArtifactPackage> {
    const state = this.load();
    if (input.kind !== 'generate') throw new Error('请使用对应的创建方法');
    const { pkg, conversationId, execution } = this.createPackageShell(
      state,
      input.projectId,
      'generate',
      input.title,
      input.goal,
      input.requirements
    );

    if (input.mode === 'revision' && input.revisionOfVersionId) {
      pkg.task.revisionOfVersionId = input.revisionOfVersionId;
      pkg.task.revisionScope = input.revisionScope;
      const baseVersion = state.versions.find((version) => version.id === input.revisionOfVersionId);
      if (baseVersion) {
        const draft = this.buildDraftFromVersion(state, pkg, baseVersion, '基于所选版本创建修订草稿');
        pkg.currentDraft = draft.draft;
        execution.status = 'idle';
        execution.activity = '已创建修订草稿，等待你的编辑与确认';
        pkg.pendingRelations = [
          { type: 'revised_from', sourceVersionId: baseVersion.id, scopeNote: input.revisionScope },
        ];
        addMessage(state, conversationId, {
          role: 'system',
          text: `已从 ${baseVersion.label} 创建修订草稿。授权修改范围：${input.revisionScope ?? '未填写'}。草稿不会改写历史版本。`,
        });
      }
    } else {
      const firstStage = state.stages
        .filter((stage) => stage.packageId === pkg.id)
        .sort((a, b) => a.order - b.order)[0];
      if (firstStage) firstStage.inputRefs = input.materialRefs;
      execution.inputVersionIds = input.materialRefs.map((ref) => ref.materialVersionId);
    }

    this.persist();
    return clone(pkg);
  }

  async startReview(input: StartReviewInput): Promise<ArtifactPackage> {
    const state = this.load();
    const { pkg, conversationId, execution } = this.createPackageShell(
      state,
      input.projectId,
      'review',
      input.title,
      input.goal,
      input.requirements
    );
    pkg.reviewTarget = input.reviewTarget;
    // Review basis references stay precise: snapshot the material versions the
    // wizard selected (or, when the adapter only receives requirements, the
    // project materials used as requirements/review basis).
    const basisRefs: MaterialReference[] = (
      input.materialRefs ?? buildMaterialReferences(state, input.projectId)
    ).filter((reference) => {
      if (input.reviewTarget.kind === 'material_version') {
        return reference.materialVersionId !== input.reviewTarget.materialVersionId;
      }
      return true;
    });
    const stages = state.stages.filter((stage) => stage.packageId === pkg.id).sort((a, b) => a.order - b.order);
    if (stages[0]) stages[0].inputRefs = basisRefs;
    execution.inputVersionIds = basisRefs.map((reference) => reference.materialVersionId);
    if (input.reviewTarget.kind === 'package_version') {
      pkg.pendingRelations = [
        { type: 'reviewed', sourceVersionId: input.reviewTarget.versionId, scopeNote: input.scopeNote },
      ];
    }
    addMessage(state, conversationId, {
      role: 'user',
      text: `审查范围：${input.scopeNote}`,
      author: state.currentUser,
    });
    this.persist();
    return clone(pkg);
  }

  async startComparison(input: StartComparisonInput): Promise<ArtifactPackage> {
    const state = this.load();
    const { pkg } = this.createPackageShell(state, input.projectId, 'compare', input.title, input.scopeNote, []);
    pkg.comparisonInputs = [
      { versionId: input.baselineVersionId, role: 'baseline' },
      { versionId: input.targetVersionId, role: 'target' },
    ];
    pkg.pendingRelations = [
      {
        type: 'compared',
        sourceVersionId: input.baselineVersionId,
        comparisonRole: 'baseline',
        scopeNote: input.scopeNote,
      },
      {
        type: 'compared',
        sourceVersionId: input.targetVersionId,
        comparisonRole: 'target',
        scopeNote: input.scopeNote,
      },
    ];
    this.persist();
    return clone(pkg);
  }

  async startRevisionFromFindings(input: StartRevisionFromFindingsInput): Promise<ArtifactPackage> {
    const state = this.load();
    const { pkg, conversationId, execution } = this.createPackageShell(
      state,
      input.projectId,
      'generate',
      input.title,
      '按所选审查问题修订方案',
      ['采用所选问题并限定修改范围']
    );
    pkg.task.revisionOfVersionId = input.baseVersionId;
    pkg.task.revisionScope = input.scopeNote;
    pkg.pendingRelations = [
      { type: 'revised_from', sourceVersionId: input.baseVersionId, scopeNote: input.scopeNote },
      {
        type: 'based_on',
        sourceVersionId: input.reviewVersionId,
        scopeNote: `采用 ${input.findingIds.length} 个审查问题`,
      },
    ];
    const baseVersion = state.versions.find((version) => version.id === input.baseVersionId);
    if (baseVersion) {
      const draft = this.buildDraftFromVersion(
        state,
        pkg,
        baseVersion,
        `依据 ${input.reviewVersionId} 的 ${input.findingIds.length} 个问题创建修订草稿`
      );
      pkg.currentDraft = draft.draft;
      execution.status = 'idle';
      execution.activity = '已创建修订草稿，等待你的编辑与确认';
    }
    addMessage(state, conversationId, {
      role: 'system',
      text: `已按所选 ${input.findingIds.length} 个审查问题创建修订任务。来源版本与审查报告均保持原样；修订草稿仅带入选中的问题与授权范围。`,
    });
    this.persist();
    return clone(pkg);
  }

  async startRevisionFromDifferences(input: StartRevisionFromDifferencesInput): Promise<ArtifactPackage> {
    const state = this.load();
    const { pkg, conversationId, execution } = this.createPackageShell(
      state,
      input.projectId,
      'generate',
      input.title,
      '按所选版本差异修订方案',
      ['采用所选差异并限定修改范围']
    );
    pkg.task.revisionOfVersionId = input.baseVersionId;
    pkg.task.revisionScope = input.scopeNote;
    pkg.pendingRelations = [
      { type: 'revised_from', sourceVersionId: input.baseVersionId, scopeNote: input.scopeNote },
      {
        type: 'based_on',
        sourceVersionId: input.comparisonVersionId,
        scopeNote: `采用 ${input.differenceIds.length} 处差异`,
      },
    ];
    const baseVersion = state.versions.find((version) => version.id === input.baseVersionId);
    if (baseVersion) {
      const draft = this.buildDraftFromVersion(
        state,
        pkg,
        baseVersion,
        `依据比对报告的 ${input.differenceIds.length} 处差异创建修订草稿`
      );
      pkg.currentDraft = draft.draft;
      execution.status = 'idle';
      execution.activity = '已创建修订草稿，等待你的编辑与确认';
    }
    addMessage(state, conversationId, {
      role: 'system',
      text: `已按所选 ${input.differenceIds.length} 处差异创建修订任务。比对报告与两端版本保持原样。`,
    });
    this.persist();
    return clone(pkg);
  }

  private buildDraftFromVersion(
    state: EvidossierSnapshot,
    pkg: ArtifactPackage,
    baseVersion: PackageVersion,
    changeNote: string
  ): { draft: WorkDraft } {
    const draft: WorkDraft = {
      id: uid('draft'),
      baseVersionId: baseVersion.id,
      updatedAt: nowIso(),
      updatedBy: state.currentUser,
      changeNote,
    };

    const stages = state.stages.filter((stage) => stage.packageId === pkg.id).sort((a, b) => a.order - b.order);
    const draftStage = stages.find((stage) => stage.key === 'draft');
    if (!draftStage) return { draft };

    // Earlier stages are already covered by the base version.
    for (const stage of stages) {
      if (stage.order < draftStage.order) {
        stage.status = 'completed';
        stage.completedAt = stage.completedAt ?? nowIso();
      } else if (stage.key !== 'draft') {
        stage.status = 'not_started';
        stage.currentArtifactId = undefined;
        stage.completedAt = undefined;
      }
    }

    const baseDoc = baseVersion.deliverable.document;
    const latestDraft = state.artifacts
      .filter((artifact) => artifact.packageId === pkg.id && artifact.kind === 'draft')
      .sort((a, b) => b.revision - a.revision)[0];
    const revision = (latestDraft?.revision ?? 0) + 1;
    const artifact: StageArtifact = {
      id: uid('art'),
      packageId: pkg.id,
      stageId: draftStage.id,
      kind: 'draft',
      revision,
      status: 'pending_confirmation',
      title: '工作草稿',
      updatedAt: nowIso(),
      updatedBy: state.currentUser,
      summary: `基于 ${baseVersion.label} 创建的工作草稿，等待编辑或确认。`,
      basedOn: materialRefsFromVersion(baseVersion),
      supersedesId: latestDraft?.id,
      payload: baseDoc ? documentToDraft(baseDoc) : { type: 'draft', sections: [] },
    };
    state.artifacts.push(artifact);
    draftStage.currentArtifactId = artifact.id;
    draftStage.status = 'awaiting_confirmation';
    draftStage.startedAt = draftStage.startedAt ?? nowIso();
    setPackageStatus(pkg, 'in_progress', '创建了新的工作草稿');
    pkg.attentionNote = '工作草稿等待编辑或确认。';
    return { draft };
  }

  async renamePackage(packageId: string, title: string): Promise<void> {
    const state = this.load();
    const pkg = state.packages.find((item) => item.id === packageId);
    if (!pkg) throw new Error('交付包不存在');
    pkg.title = title;
    pkg.updatedAt = nowIso();
    this.persist();
  }

  async continueEditing(packageId: string, baseVersionId: string): Promise<void> {
    const state = this.load();
    const pkg = state.packages.find((item) => item.id === packageId);
    if (!pkg) throw new Error('交付包不存在');
    const baseVersion = state.versions.find((version) => version.id === baseVersionId);
    if (!baseVersion) throw new Error('基准版本不存在');
    const draft = this.buildDraftFromVersion(state, pkg, baseVersion, `基于 ${baseVersion.label} 继续修改`);
    pkg.currentDraft = draft.draft;
    const execution = state.executions.find((item) => item.id === pkg.executionId);
    if (execution) {
      execution.status = 'idle';
      execution.activity = '已创建新的工作草稿，等待你的编辑与确认';
      pushEvent(execution, 'resumed', '从正式版本创建草稿', baseVersion.label);
    }
    addMessage(state, pkg.primaryConversationId, {
      role: 'system',
      text: `已基于 ${baseVersion.label} 创建新的工作草稿。正式版本保持只读，提交后会形成下一正式版本。`,
    });
    this.persist();
  }

  async sendMessage(packageId: string, text: string): Promise<void> {
    const state = this.load();
    const pkg = state.packages.find((item) => item.id === packageId);
    if (!pkg) throw new Error('交付包不存在');
    if (!text.trim()) return;
    addMessage(state, pkg.primaryConversationId, {
      role: 'user',
      text: text.trim(),
      author: state.currentUser,
    });
    addMessage(state, pkg.primaryConversationId, {
      role: 'system',
      text: '演示模式：消息已记录。当前环境没有接入真实 AI 执行，补充要求不会自动生成新成果；请在阶段成果中编辑或触发演示执行。',
    });
    pkg.updatedAt = nowIso();
    this.persist();
  }

  async confirmArtifact(packageId: string, artifactId: string): Promise<void> {
    const state = this.load();
    const pkg = state.packages.find((item) => item.id === packageId);
    if (!pkg) throw new Error('交付包不存在');
    const artifact = state.artifacts.find((item) => item.id === artifactId && item.packageId === packageId);
    if (!artifact) throw new Error('阶段成果不存在');
    if (artifact.status === 'confirmed') return;
    const stage = state.stages.find((item) => item.id === artifact.stageId);
    if (!stage) throw new Error('阶段不存在');

    artifact.status = 'confirmed';
    artifact.updatedAt = nowIso();
    artifact.updatedBy = state.currentUser;
    stage.status = 'completed';
    stage.currentArtifactId = artifact.id;
    stage.completedAt = nowIso();
    pkg.attentionNote = undefined;

    const execution = state.executions.find((item) => item.id === pkg.executionId);
    const stages = state.stages.filter((item) => item.packageId === pkg.id).sort((a, b) => a.order - b.order);
    const allDone = stages.every((item) => item.status === 'completed');
    if (execution) {
      if (allDone) {
        execution.status = 'completed';
        execution.activity = '所有阶段已完成，等待提交正式版本';
        pushEvent(execution, 'completed', '阶段全部完成', artifact.title);
        setPackageStatus(pkg, 'awaiting_user', '所有阶段已完成，可以提交正式版本');
        pkg.attentionNote = '所有阶段已完成，可以提交正式版本。';
      } else {
        execution.status = 'running';
        execution.activity = `已确认「${stageLabel(stage.key)}」，继续执行下一阶段`;
        pushEvent(execution, 'resumed', `确认成果：${artifact.title}`, stage.key);
        setPackageStatus(pkg, 'in_progress');
      }
    }
    addMessage(state, pkg.primaryConversationId, {
      role: 'system',
      text: `已确认阶段成果「${artifact.title}」（修订 ${artifact.revision}）。确认记录已关联当前输入版本。`,
      stageKey: stage.key,
    });
    this.persist();
  }

  async editArtifact(input: EditArtifactInput): Promise<StageArtifact> {
    const state = this.load();
    const pkg = state.packages.find((item) => item.id === input.packageId);
    if (!pkg) throw new Error('交付包不存在');
    const artifact = state.artifacts.find((item) => item.id === input.artifactId && item.packageId === input.packageId);
    if (!artifact) throw new Error('阶段成果不存在');
    const stage = state.stages.find((item) => item.id === artifact.stageId);
    if (!stage) throw new Error('阶段不存在');
    const edited: StageArtifact = {
      id: uid('art'),
      packageId: artifact.packageId,
      stageId: artifact.stageId,
      kind: artifact.kind,
      revision: artifact.revision + 1,
      status: 'pending_confirmation',
      title: artifact.title,
      updatedAt: nowIso(),
      updatedBy: state.currentUser,
      summary: input.summary,
      basedOn: artifact.basedOn,
      supersedesId: artifact.id,
      payload: input.payload,
    };
    state.artifacts.push(edited);
    artifact.status = artifact.status === 'confirmed' ? 'superseded' : artifact.status;
    stage.currentArtifactId = edited.id;
    stage.status = 'awaiting_confirmation';
    pkg.attentionNote = `阶段「${stageLabel(stage.key)}」的人工编辑等待确认。`;
    setPackageStatus(pkg, 'awaiting_user', '人工编辑产生新修订，等待确认');
    addMessage(state, pkg.primaryConversationId, {
      role: 'system',
      text: `阶段成果「${artifact.title}」已保存人工修订（修订 ${edited.revision}）。旧修订保留，不会覆盖已提交版本。`,
      stageKey: stage.key,
    });
    this.persist();
    return clone(edited);
  }

  async pauseExecution(packageId: string): Promise<void> {
    const state = this.load();
    const pkg = state.packages.find((item) => item.id === packageId);
    if (!pkg) throw new Error('交付包不存在');
    const execution = state.executions.find((item) => item.id === pkg.executionId);
    if (execution) {
      execution.status = 'paused';
      execution.pausedNote = '用户暂停。已提交成果与固定输入均保留，恢复后从最新检查点继续。';
      execution.activity = '已暂停';
      pushEvent(execution, 'paused', '执行已暂停', execution.currentStageKey);
    }
    setPackageStatus(pkg, 'paused', '用户暂停执行');
    pkg.attentionNote = '执行已暂停，恢复前可检查暂停期间变化。';
    this.persist();
  }

  async resumeExecution(packageId: string): Promise<void> {
    const state = this.load();
    const pkg = state.packages.find((item) => item.id === packageId);
    if (!pkg) throw new Error('交付包不存在');
    const execution = state.executions.find((item) => item.id === pkg.executionId);
    if (execution) {
      execution.status = 'running';
      execution.pausedNote = undefined;
      execution.activity = '已恢复，从检查点继续';
      pushEvent(execution, 'resumed', '执行已恢复', execution.currentStageKey);
    }
    setPackageStatus(pkg, 'in_progress', '用户恢复执行');
    pkg.attentionNote = undefined;
    this.persist();
  }

  async retryStage(packageId: string): Promise<void> {
    const state = this.load();
    const pkg = state.packages.find((item) => item.id === packageId);
    if (!pkg) throw new Error('交付包不存在');
    const stages = state.stages.filter((item) => item.packageId === pkg.id).sort((a, b) => a.order - b.order);
    const failed = stages.find((item) => item.status === 'failed');
    if (failed) {
      failed.status = 'not_started';
      failed.statusNote = undefined;
    }
    const execution = state.executions.find((item) => item.id === pkg.executionId);
    if (execution) {
      execution.status = 'running';
      execution.failure = undefined;
      execution.activity = '从失败阶段重新执行';
      pushEvent(execution, 'resumed', '重试失败阶段', failed?.key);
    }
    setPackageStatus(pkg, 'in_progress', '重试失败阶段');
    pkg.attentionNote = undefined;
    this.persist();
  }

  async simulateFailure(packageId: string): Promise<void> {
    const state = this.load();
    const pkg = state.packages.find((item) => item.id === packageId);
    if (!pkg) throw new Error('交付包不存在');
    const execution = state.executions.find((item) => item.id === pkg.executionId);
    if (!execution) throw new Error('执行会话不存在');
    const stages = state.stages.filter((item) => item.packageId === pkg.id).sort((a, b) => a.order - b.order);
    const active =
      stages.find((item) => item.status === 'running') ?? stages.find((item) => item.status === 'not_started');
    if (active) {
      active.status = 'failed';
      active.statusNote = '模拟执行失败：演示环境主动触发，用于验证失败与重试交互。';
    }
    execution.status = 'failed';
    execution.activity = '执行失败';
    execution.failure = {
      failedStageKey: active?.key ?? 'unknown',
      reason: '模拟执行在生成阶段成果时失败。此失败由演示控制触发，用于验证前端失败状态。',
      preservedNote: '失败前已确认的阶段成果与固定输入均保留。',
      retryable: true,
    };
    pushEvent(execution, 'failed', '执行失败', active?.key);
    setPackageStatus(pkg, 'failed', '模拟执行失败');
    pkg.attentionNote = '执行失败，已保留此前有效成果，可重试该阶段。';
    this.persist();
  }

  async resolveDraftConflict(packageId: string, resolution: DraftConflictResolution): Promise<void> {
    const state = this.load();
    const pkg = state.packages.find((item) => item.id === packageId);
    if (!pkg) throw new Error('交付包不存在');
    const draft = pkg.currentDraft;
    const conflict = draft?.conflict;
    if (!draft || !conflict) return;
    const userArtifact = state.artifacts.find((item) => item.id === conflict.userArtifactId);
    const candidate = state.artifacts.find((item) => item.id === conflict.candidateArtifactId);
    const stage = state.stages.find((item) => item.id === (userArtifact?.stageId ?? candidate?.stageId));
    const execution = state.executions.find((item) => item.id === pkg.executionId);

    if (resolution === 'keep_user') {
      if (candidate) candidate.status = 'superseded';
      if (stage && userArtifact) {
        userArtifact.status = 'pending_confirmation';
        stage.currentArtifactId = userArtifact.id;
        stage.status = 'awaiting_confirmation';
      }
    }
    if (resolution === 'keep_candidate') {
      if (userArtifact) userArtifact.status = 'superseded';
      if (stage && candidate) {
        candidate.status = 'pending_confirmation';
        stage.currentArtifactId = candidate.id;
        stage.status = 'awaiting_confirmation';
      }
    }
    if (resolution === 'rerun') {
      if (candidate) candidate.status = 'superseded';
      if (userArtifact) userArtifact.status = 'superseded';
      if (stage) {
        stage.status = 'not_started';
        stage.currentArtifactId = undefined;
        stage.completedAt = undefined;
      }
    }

    conflict.resolution = resolution;
    draft.conflict = undefined;
    if (execution) {
      execution.status = 'running';
      execution.failure = undefined;
      execution.activity =
        resolution === 'rerun' ? '已基于最新输入重新执行，等待新的候选成果' : '冲突已处理，等待确认保留的成果版本';
      pushEvent(execution, 'resumed', '冲突处理完成', stage?.key);
    }
    if (resolution === 'rerun') {
      setPackageStatus(pkg, 'in_progress', '冲突处理：基于最新输入重跑');
      pkg.attentionNote = '已基于最新输入重新执行，请等待新的候选成果。';
    } else {
      setPackageStatus(pkg, 'awaiting_user', `冲突处理：${resolution}`);
      pkg.attentionNote = '请确认保留的成果版本后继续执行。';
    }
    addMessage(state, pkg.primaryConversationId, {
      role: 'system',
      text:
        resolution === 'keep_user'
          ? '已保留你的人工编辑，旧运行候选保留为历史候选；请确认该版本后继续。'
          : resolution === 'keep_candidate'
            ? '已采用旧运行候选作为当前成果，你的人工编辑保留为历史修订；请确认该版本后继续。'
            : '将基于最新输入重新生成，旧候选保留为历史。',
    });
    this.persist();
  }

  async submitVersion(input: SubmitVersionInput): Promise<PackageVersion> {
    const state = this.load();
    const pkg = state.packages.find((item) => item.id === input.packageId);
    if (!pkg) throw new Error('交付包不存在');

    const previousVersions = state.versions.filter((version) => version.packageId === pkg.id);
    const versionNumber = Math.max(0, ...previousVersions.map((version) => version.versionNumber)) + 1;
    const label = `${pkg.code}/v${versionNumber}`;
    const built = buildDeliverableDocument(state, pkg);
    const artifacts = latestArtifactsByStage(state, pkg)
      .filter((artifact) => artifact.status === 'confirmed' || artifact.status === 'pending_confirmation')
      .map((artifact) => ({
        artifactId: artifact.id,
        revision: artifact.revision,
        title: artifact.title,
        kind: artifact.kind,
      }));
    const inputs = collectInputRefs(state, pkg);
    const confirmations = latestArtifactsByStage(state, pkg)
      .filter((artifact) => artifact.status === 'confirmed')
      .map((artifact) => ({
        id: uid('cfm'),
        label: `确认阶段成果：${artifact.title}`,
        confirmedBy: state.currentUser,
        confirmedAt: artifact.updatedAt,
        artifactId: artifact.id,
      }));

    const version: PackageVersion = {
      id: uid(`ver-${pkg.code.toLowerCase()}`),
      packageId: pkg.id,
      projectId: pkg.projectId,
      versionNumber,
      label,
      status: input.unfinishedNote ? 'partial' : 'delivered',
      createdAt: nowIso(),
      createdBy: state.currentUser,
      baseVersionId: pkg.currentDraft?.baseVersionId,
      changeNote: input.changeNote || `提交 ${label}`,
      inputs,
      artifacts,
      deliverable: {
        id: uid('deliverable'),
        kind: built.kind,
        title: built.title,
        fileName: built.fileName,
        format: pkg.task.kind === 'generate' ? 'docx' : 'report',
        pageCount: built.document.pageCount ?? Math.max(2, Math.ceil(built.document.blocks.length / 8)),
        simulatedFile: false,
        document: built.document,
      },
      confirmations,
      unfinishedNote: input.unfinishedNote,
    };

    state.versions.push(version);
    pkg.versionIds.push(version.id);
    pkg.currentDraft = undefined;
    pkg.attentionNote = undefined;
    setPackageStatus(pkg, 'delivered', `提交正式版本 ${label}`);

    // Relations become business facts once the target package version exists.
    const pending = pkg.pendingRelations ?? [];
    const targetRef: VersionRef = {
      packageId: pkg.id,
      versionId: version.id,
      packageCode: pkg.code,
      packageTitle: pkg.title,
      versionLabel: label,
      versionNumber,
      taskKind: pkg.task.kind,
    };
    for (const spec of pending) {
      const sourceRef = findVersionRef(state, spec.sourceVersionId);
      if (!sourceRef) continue;
      const relation: PackageRelation = {
        id: uid('rel'),
        type: spec.type,
        source: sourceRef,
        target: targetRef,
        comparisonRole: spec.comparisonRole,
        scopeNote: spec.scopeNote,
        createdAt: nowIso(),
        createdBy: state.currentUser,
      };
      state.relations.push(relation);
    }
    pkg.pendingRelations = undefined;

    const execution = state.executions.find((item) => item.id === pkg.executionId);
    if (execution) {
      execution.status = 'completed';
      execution.activity = `正式版本 ${label} 已提交`;
      pushEvent(execution, 'completed', '提交正式版本', label);
    }

    addMessage(state, pkg.primaryConversationId, {
      role: 'system',
      text: `已提交正式版本 ${label}。该版本为不可变快照，包含当时的输入、阶段成果与交付物。`,
    });
    // Also refresh the "deliverable artifacts" for the report packages.
    this.persist();
    return clone(version);
  }
}
