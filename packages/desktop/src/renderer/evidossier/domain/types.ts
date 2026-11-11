/**
 * Evidossier business domain types.
 *
 * This file is the single source of truth for the frontend business contract.
 * It describes the target product semantics from docs/product.md, docs/flows.md
 * and docs/innovations.md. The current demo build is fed by an isolated mock
 * adapter (`data/repository.ts`); no backend implementation of these objects
 * exists in AionCore yet.
 *
 * Naming follows the project documents: Project, Task, ArtifactPackage,
 * PackageVersion, PackageRelation, Conversation, ExecutionRun, Stage,
 * StageArtifact, Deliverable, MaterialReference, ReviewFinding,
 * ComparisonDifference.
 */

export type EntityId = string;

/** ISO-8601 timestamp. */
export type IsoTimestamp = string;

/* -------------------------------------------------------------------------- */
/* Core vocabulary                                                             */
/* -------------------------------------------------------------------------- */

/** The three independent business loops. */
export type TaskKind = 'generate' | 'review' | 'compare';

/**
 * Package-level business status. This is the Task status, not the execution
 * session status (see ExecutionStatus) and not a version status.
 */
export type PackageStatus =
  | 'draft'
  | 'in_progress'
  | 'awaiting_user'
  | 'paused'
  | 'failed'
  | 'delivered'
  | 'pending_supplement';

/** Stage status inside a task. */
export type StageStatus = 'not_started' | 'running' | 'awaiting_confirmation' | 'completed' | 'needs_review' | 'failed';

/** Stage artifact lifecycle. */
export type ArtifactStatus =
  | 'candidate'
  | 'pending_confirmation'
  | 'confirmed'
  | 'needs_review'
  | 'failed'
  | 'superseded';

/** Codex execution session status, tracked separately from business state. */
export type ExecutionStatus = 'idle' | 'running' | 'paused' | 'failed' | 'completed';

/** Immutable delivery version status. */
export type VersionStatus = 'delivered' | 'partial';

/** Semantic package relation types (source version -> target version). */
export type RelationType = 'reviewed' | 'compared' | 'revised_from' | 'based_on' | 'derived_from';

/** Role of one input inside a multi-input comparison. */
export type ComparisonRole = 'baseline' | 'target' | 'additional';

/** Marker for the current user. Demo data has one acting user. */
export type UserRef = { id: EntityId; displayName: string };

/* -------------------------------------------------------------------------- */
/* Document model (used for materials, drafts and delivered documents)         */
/* -------------------------------------------------------------------------- */

export type DocBlockType = 'heading' | 'paragraph' | 'list' | 'table' | 'quote';

/** Structured document block. Block ids are stable so reviews/diffs can point at them. */
export type DocBlock = {
  id: EntityId;
  type: DocBlockType;
  /** Heading level 1-3, only meaningful for `heading`. */
  level?: 1 | 2 | 3;
  text?: string;
  items?: string[];
  /** First row is the header row when `header` is true. */
  rows?: string[][];
  header?: boolean;
};

/** A structured document (material body, package draft or delivered file body). */
export type EvidDocument = {
  id: EntityId;
  title: string;
  blocks: DocBlock[];
  /** Optional file-level metadata shown in the reader header. */
  pageCount?: number;
  wordCount?: number;
};

/** Stable pointer to a readable position in a document. */
export type DocLocation = {
  documentId: EntityId;
  blockId: EntityId;
  /** Human readable path, e.g. "第 3 章 > 3.2 系统架构". */
  sectionPath: string;
  /** Short excerpt quoted in findings/differences. */
  quote: string;
};

/* -------------------------------------------------------------------------- */
/* Materials                                                                   */
/* -------------------------------------------------------------------------- */

export type MaterialKind = 'document' | 'spreadsheet' | 'drawing' | 'image' | 'template' | 'archive';

/** Usage the user assigned to a material inside a task. */
export type MaterialUsage =
  | 'fact'
  | 'requirement'
  | 'template'
  | 'style_reference'
  | 'case'
  | 'review_basis'
  | 'pending';

/** Distinguishes original uploads from artifacts generated during work. */
export type MaterialOrigin = 'uploaded' | 'generated';

export type MaterialParseStatus = 'parsed' | 'parsing' | 'failed' | 'partial' | 'pending';

export type MaterialVersion = {
  id: EntityId;
  version: number;
  fileName: string;
  sizeBytes: number;
  addedAt: IsoTimestamp;
  parseStatus: MaterialParseStatus;
  /** Human readable reason when parsing failed or was partial. */
  parseNote?: string;
  /** Parsed body for text documents; absent for unreadable files. */
  document?: EvidDocument;
};

export type Material = {
  id: EntityId;
  projectId: EntityId;
  name: string;
  kind: MaterialKind;
  origin: MaterialOrigin;
  /** Role/use inside the project. */
  usage: MaterialUsage;
  /** Free-form description of why the material is in the project. */
  usageNote?: string;
  versions: MaterialVersion[];
  /** Currently effective version. */
  currentVersionId: EntityId;
  addedAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  /** Set when the material was produced by a package stage. */
  generatedByPackageId?: EntityId;
};

/** Exact material version referenced by a stage/version/report. */
export type MaterialReference = {
  id: EntityId;
  materialId: EntityId;
  materialVersionId: EntityId;
  materialName: string;
  versionNumber: number;
  role: MaterialUsage;
  /** Optional locator inside the material. */
  note?: string;
};

/* -------------------------------------------------------------------------- */
/* Project                                                                     */
/* -------------------------------------------------------------------------- */

export type ProjectMember = {
  user: UserRef;
  role: 'owner' | 'editor' | 'reviewer';
};

export type Project = {
  id: EntityId;
  code: string;
  name: string;
  description: string;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  members: ProjectMember[];
  /** Free-form short tags shown on project cards. */
  tags: string[];
};

/* -------------------------------------------------------------------------- */
/* Task / package / version                                                    */
/* -------------------------------------------------------------------------- */

export type Task = {
  id: EntityId;
  kind: TaskKind;
  /** User-facing goal statement. */
  goal: string;
  /** Structured requirements collected during the create wizard. */
  requirements: string[];
  /** For revision tasks: the exact version this work is authorized to modify. */
  revisionOfVersionId?: EntityId;
  /** Authorized modification scope for revision tasks. */
  revisionScope?: string;
  createdAt: IsoTimestamp;
};

export type PackageStatusHistory = {
  status: PackageStatus;
  at: IsoTimestamp;
  note?: string;
};

/** Exact package version referenced by a review task. */
export type ReviewTarget =
  | { kind: 'package_version'; versionId: EntityId; versionLabel: string }
  | {
      kind: 'material_version';
      materialId: EntityId;
      materialVersionId: EntityId;
      materialName: string;
      versionNumber: number;
    };

/** Relation that will be created once the package delivers its first version. */
export type PendingRelationSpec = {
  type: RelationType;
  sourceVersionId: EntityId;
  comparisonRole?: ComparisonRole;
  scopeNote?: string;
};

export type ArtifactPackage = {
  id: EntityId;
  code: string;
  projectId: EntityId;
  title: string;
  task: Task;
  status: PackageStatus;
  /** Short human summary of what the package currently needs from the user. */
  attentionNote?: string;
  primaryConversationId: EntityId;
  /** Review packages: which exact material/version is under review. */
  reviewTarget?: ReviewTarget;
  /** Exact inputs of a comparison package, with their roles. */
  comparisonInputs?: Array<{ versionId: EntityId; role: ComparisonRole }>;
  /** Relations only become visible business facts on first delivery. */
  pendingRelations?: PendingRelationSpec[];
  /** Current work draft, if the package has one. */
  currentDraft?: WorkDraft;
  /** Formal version history, oldest first. */
  versionIds: EntityId[];
  /** The stage artifacts currently in play. */
  stageIds: EntityId[];
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  createdBy: UserRef;
  /** Latest execution session summary (may be idle). */
  executionId?: EntityId;
  statusHistory: PackageStatusHistory[];
};

/** Editable working state; never a delivered version. */
export type WorkDraft = {
  id: EntityId;
  /** Formal version the draft is based on; undefined for a brand new package. */
  baseVersionId?: EntityId;
  updatedAt: IsoTimestamp;
  updatedBy: UserRef;
  changeNote: string;
  /** Conflicts detected between a running result and manual edits. */
  conflict?: DraftConflict;
};

export type DraftConflict = {
  id: EntityId;
  message: string;
  /** Artifact the user edited manually. */
  userArtifactId: EntityId;
  /** Candidate produced by the stale run. */
  candidateArtifactId: EntityId;
  detectedAt: IsoTimestamp;
  resolution?: 'pending' | 'keep_user' | 'keep_candidate' | 'rerun';
};

export type VersionConfirmation = {
  id: EntityId;
  label: string;
  confirmedBy: UserRef;
  confirmedAt: IsoTimestamp;
  artifactId?: EntityId;
};

export type PackageVersion = {
  id: EntityId;
  packageId: EntityId;
  projectId: EntityId;
  /** Monotonic version number inside the package, starting at 1. */
  versionNumber: number;
  /** Display label, e.g. "P001/v2". */
  label: string;
  status: VersionStatus;
  createdAt: IsoTimestamp;
  createdBy: UserRef;
  /** Exact version this one was derived from inside the same package. */
  baseVersionId?: EntityId;
  /** Human note describing what changed in this version. */
  changeNote: string;
  /** Inputs frozen at delivery time. */
  inputs: MaterialReference[];
  /** Stage artifacts included in the snapshot, frozen by id + revision. */
  artifacts: VersionedArtifactRef[];
  /** Delivered file or report. */
  deliverable: Deliverable;
  confirmations: VersionConfirmation[];
  /** Unfinished scope explicitly kept in a partial delivery. */
  unfinishedNote?: string;
};

export type VersionedArtifactRef = {
  artifactId: EntityId;
  revision: number;
  title: string;
  kind: StageArtifactKind;
};

/* -------------------------------------------------------------------------- */
/* Relations                                                                   */
/* -------------------------------------------------------------------------- */

/** Exact pointer to a package version, used as a relation endpoint. */
export type VersionRef = {
  packageId: EntityId;
  versionId: EntityId;
  /** Denormalized display data so the graph never needs a second lookup. */
  packageCode: string;
  packageTitle: string;
  versionLabel: string;
  versionNumber: number;
  taskKind: TaskKind;
};

/**
 * A semantic relation between two exact package versions.
 * Direction is always source -> target; `note` explains what the target did
 * with the source (e.g. "P002/v1 审查了 P001/v2").
 */
export type PackageRelation = {
  id: EntityId;
  type: RelationType;
  source: VersionRef;
  target: VersionRef;
  /** For `compared` relations: role of the source inside the comparison. */
  comparisonRole?: ComparisonRole;
  /** Authorization/adoption scope recorded when the relation was created. */
  scopeNote?: string;
  createdAt: IsoTimestamp;
  createdBy: UserRef;
};

/* -------------------------------------------------------------------------- */
/* Conversation & execution                                                    */
/* -------------------------------------------------------------------------- */

export type MessageRole = 'user' | 'assistant' | 'system';

export type ConversationMessage = {
  id: EntityId;
  conversationId: EntityId;
  role: MessageRole;
  /** Markdown-ish plain text; rendered as paragraphs, never used for claims. */
  text: string;
  createdAt: IsoTimestamp;
  author?: UserRef;
  /** Stage the message belongs to, when applicable. */
  stageKey?: StageKey;
  /** Marks simulated assistant output so the UI can label it honestly. */
  simulated?: boolean;
  /** Attached artifacts or materials mentioned in the message. */
  attachmentIds?: EntityId[];
};

export type Conversation = {
  id: EntityId;
  packageId: EntityId;
  title: string;
  createdAt: IsoTimestamp;
  messageIds: EntityId[];
};

export type ExecutionEventType =
  | 'queued'
  | 'stage_started'
  | 'progress'
  | 'artifact_candidate'
  | 'waiting_user'
  | 'paused'
  | 'failed'
  | 'resumed'
  | 'completed';

export type ExecutionEvent = {
  id: EntityId;
  type: ExecutionEventType;
  at: IsoTimestamp;
  label: string;
  detail?: string;
};

export type ExecutionFailure = {
  failedStageKey: StageKey;
  reason: string;
  /** Work kept before the failure. */
  preservedNote: string;
  retryable: boolean;
};

export type ExecutionRun = {
  id: EntityId;
  packageId: EntityId;
  status: ExecutionStatus;
  currentStageKey?: StageKey;
  startedAt?: IsoTimestamp;
  updatedAt: IsoTimestamp;
  /** Short, user-readable current activity. Never internal prompts. */
  activity: string;
  events: ExecutionEvent[];
  failure?: ExecutionFailure;
  pausedNote?: string;
  /** Everything the run reads. If inputs change, the run is stale. */
  inputVersionIds: EntityId[];
};

/* -------------------------------------------------------------------------- */
/* Stages & stage artifacts                                                    */
/* -------------------------------------------------------------------------- */

export type StageKey = string;

export type Stage = {
  id: EntityId;
  packageId: EntityId;
  key: StageKey;
  order: number;
  /** i18n key for the stage name. */
  titleKey: string;
  /** Short user-facing description, i18n key. */
  descriptionKey: string;
  status: StageStatus;
  /** Stage artifact currently effective for this stage. */
  currentArtifactId?: EntityId;
  startedAt?: IsoTimestamp;
  completedAt?: IsoTimestamp;
  /** Input material versions this stage read. */
  inputRefs: MaterialReference[];
  /** Human note shown when the stage is blocked / needs review. */
  statusNote?: string;
};

export type StageArtifactKind =
  | 'fact_list'
  | 'outline'
  | 'draft'
  | 'validation'
  | 'coverage_plan'
  | 'findings'
  | 'review_report'
  | 'mapping'
  | 'differences'
  | 'comparison_report';

export type StageArtifact = {
  id: EntityId;
  packageId: EntityId;
  stageId: EntityId;
  kind: StageArtifactKind;
  /** Revision inside this artifact line; edits create a new revision. */
  revision: number;
  status: ArtifactStatus;
  title: string;
  updatedAt: IsoTimestamp;
  updatedBy: UserRef;
  /** Human-friendly summary shown on cards. */
  summary: string;
  /** Exact inputs the artifact was produced from. */
  basedOn: MaterialReference[];
  /** Previous revision id, kept for history. */
  supersedesId?: EntityId;
  /** Structured payload; discriminated by `kind`. */
  payload: StageArtifactPayload;
};

export type StageArtifactPayload =
  | FactListPayload
  | OutlinePayload
  | DraftPayload
  | ValidationPayload
  | CoveragePayload
  | FindingsPayload
  | ReviewReportPayload
  | MappingPayload
  | DifferencesPayload
  | ComparisonReportPayload;

export type FactItemStatus = 'confirmed' | 'pending' | 'conflict' | 'missing';

export type FactItem = {
  id: EntityId;
  kind: 'fact' | 'requirement' | 'assumption' | 'conflict' | 'gap';
  statement: string;
  detail?: string;
  source?: DocLocation;
  materialReferenceId?: EntityId;
  status: FactItemStatus;
};

export type FactListPayload = {
  type: 'fact_list';
  items: FactItem[];
  openQuestions: string[];
};

export type OutlineSection = {
  id: EntityId;
  title: string;
  purpose: string;
  requirementRefs: string[];
  basisRefs: EntityId[];
  status: 'planned' | 'confirmed' | 'needs_review';
  /** For revision tasks: whether the section is inside the authorized scope. */
  inScope?: boolean;
};

export type OutlinePayload = {
  type: 'outline';
  sections: OutlineSection[];
  scopeNote?: string;
};

export type DraftParagraph = {
  id: EntityId;
  text: string;
  /** Citation markers pointing at material references. */
  citationRefs?: EntityId[];
  /** Highlighted local change for revision tasks. */
  change?: 'added' | 'modified' | 'unchanged';
  previousText?: string;
};

export type DraftSection = {
  id: EntityId;
  heading: string;
  paragraphs: DraftParagraph[];
};

export type DraftPayload = {
  type: 'draft';
  sections: DraftSection[];
  isPartial?: boolean;
};

export type ValidationCheckStatus = 'pass' | 'warn' | 'fail' | 'manual' | 'not_checked';

export type ValidationCheck = {
  id: EntityId;
  label: string;
  status: ValidationCheckStatus;
  detail: string;
  location?: DocLocation;
};

export type ValidationPayload = {
  type: 'validation';
  checks: ValidationCheck[];
  openItems: string[];
};

export type CoverageStatus = 'checked' | 'unchecked' | 'uncheckable' | 'not_applicable';

export type CoverageItem = {
  id: EntityId;
  code: string;
  title: string;
  status: CoverageStatus;
  note?: string;
  findingIds: EntityId[];
};

export type CoveragePayload = {
  type: 'coverage_plan';
  items: CoverageItem[];
  scopeNote: string;
};

export type FindingSeverity = 'high' | 'medium' | 'low' | 'info';

export type FindingStatus = 'open' | 'confirmed' | 'uncertain' | 'dismissed';

export type ReviewFinding = {
  id: EntityId;
  code: string;
  severity: FindingSeverity;
  title: string;
  description: string;
  /** What the finding is judged against (requirement/clause). */
  basis: string;
  basisLocation?: DocLocation;
  /** Where the problem is in the reviewed material. */
  location?: DocLocation;
  status: FindingStatus;
  suggestion: string;
  /** Coverage item this finding belongs to. */
  coverageItemId?: EntityId;
  /** True when the citation could not be located in the material. */
  citationUnresolved?: boolean;
};

export type FindingsPayload = {
  type: 'findings';
  findings: ReviewFinding[];
  scopeNote: string;
};

export type ReviewReportPayload = {
  type: 'review_report';
  summary: string;
  coverageStats: { checked: number; unchecked: number; uncheckable: number; notApplicable: number };
  findingStats: { high: number; medium: number; low: number; info: number; uncertain: number };
  limitations: string[];
  /** Version references this report is frozen against. */
  reviewedVersionRefs: VersionRef[];
};

export type MappingConfidence = 'confirmed' | 'candidate' | 'uncertain' | 'none';

export type SectionMapping = {
  id: EntityId;
  baseBlockId?: EntityId;
  targetBlockId?: EntityId;
  baseTitle: string;
  targetTitle: string;
  confidence: MappingConfidence;
  note?: string;
};

export type MappingPayload = {
  type: 'mapping';
  mappings: SectionMapping[];
  unmatchedBase: string[];
  unmatchedTarget: string[];
};

export type DifferenceKind = 'added' | 'removed' | 'modified' | 'moved' | 'uncertain';

export type ComparisonDifference = {
  id: EntityId;
  code: string;
  kind: DifferenceKind;
  summary: string;
  detail: string;
  baseLocation?: DocLocation;
  targetLocation?: DocLocation;
  baseText?: string;
  targetText?: string;
  mappingId?: EntityId;
  /** Machine confidence; uncertain differences are never presented as facts. */
  confidence: MappingConfidence;
};

export type DifferencesPayload = {
  type: 'differences';
  differences: ComparisonDifference[];
  scopeNote: string;
};

export type ComparisonReportPayload = {
  type: 'comparison_report';
  summary: string;
  differenceStats: { added: number; removed: number; modified: number; moved: number; uncertain: number };
  limitations: string[];
  /** Frozen exact inputs; redundant with relations but keeps report self-contained. */
  inputs: { ref: VersionRef; role: ComparisonRole }[];
};

/* -------------------------------------------------------------------------- */
/* Deliverables                                                                */
/* -------------------------------------------------------------------------- */

export type DeliverableKind = 'document' | 'review_report' | 'comparison_report';

export type DeliverableFormat = 'docx' | 'pdf' | 'md' | 'report';

export type Deliverable = {
  id: EntityId;
  kind: DeliverableKind;
  title: string;
  fileName: string;
  format: DeliverableFormat;
  pageCount?: number;
  /** Demo builds never generate real files; the UI must say so. */
  simulatedFile?: boolean;
  /** Readable body used by the in-app preview. */
  document?: EvidDocument;
};

/* -------------------------------------------------------------------------- */
/* Snapshot & repository contract                                             */
/* -------------------------------------------------------------------------- */

export type DemoMeta = {
  /** Demo build marker; surfaced in the UI. */
  isDemo: true;
  schemaVersion: number;
  seededAt: IsoTimestamp;
  /** Last time demo state was persisted in this browser. */
  savedAt?: IsoTimestamp;
};

/** Normalized state returned by the adapter. Treat as read-only. */
export type EvidossierSnapshot = {
  demo: DemoMeta;
  currentUser: UserRef;
  projects: Project[];
  materials: Material[];
  packages: ArtifactPackage[];
  versions: PackageVersion[];
  relations: PackageRelation[];
  conversations: Conversation[];
  messages: ConversationMessage[];
  executions: ExecutionRun[];
  stages: Stage[];
  artifacts: StageArtifact[];
};

/* -------------------------------------------------------------------------- */
/* Create-task inputs                                                          */
/* -------------------------------------------------------------------------- */

export type CreatePackageInput =
  | {
      kind: 'generate';
      projectId: EntityId;
      title: string;
      goal: string;
      requirements: string[];
      materialRefs: MaterialReference[];
      mode: 'new' | 'revision';
      revisionOfVersionId?: EntityId;
      revisionScope?: string;
      /** Set when created from a review report or comparison report. */
      basis?: { versionId: EntityId; reportPackageId: EntityId; kind: 'review' | 'compare'; selectedIds: EntityId[] };
    }
  | {
      kind: 'review';
      projectId: EntityId;
      title: string;
      goal: string;
      requirements: string[];
      /** Exact material or package version under review. */
      reviewTarget: ReviewTarget;
      materialRefs: MaterialReference[];
    }
  | {
      kind: 'compare';
      projectId: EntityId;
      title: string;
      goal: string;
      baselineVersionId: EntityId;
      targetVersionId: EntityId;
      scopeNote: string;
    };

/** Everything a page needs about one package, assembled by the adapter. */
export type PackageWorkspace = {
  pkg: ArtifactPackage;
  project: Project;
  task: Task;
  stages: Stage[];
  artifacts: StageArtifact[];
  versions: PackageVersion[];
  currentVersion?: PackageVersion;
  conversation?: Conversation;
  messages: ConversationMessage[];
  execution?: ExecutionRun;
  /** Relations where this package is the target (incoming). */
  incomingRelations: PackageRelation[];
  /** Relations where this package is the source (outgoing). */
  outgoingRelations: PackageRelation[];
  /** Materials referenced anywhere in the package. */
  materials: Material[];
};

export type GraphScope =
  | { kind: 'project'; projectId: EntityId }
  | { kind: 'package'; packageId: EntityId; focusVersionId?: EntityId };

export type GraphFilter = {
  relationTypes: RelationType[];
  taskKinds: TaskKind[];
  /** Show version nodes for expanded packages. */
  expandedPackageIds: EntityId[];
};

export type GraphNodeBase = {
  id: EntityId;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type GraphPackageNode = GraphNodeBase & {
  nodeType: 'package';
  packageId: EntityId;
  packageCode: string;
  title: string;
  taskKind: TaskKind;
  status: PackageStatus;
  versionCount: number;
  currentVersionLabel?: string;
  projectId: EntityId;
};

export type GraphVersionNode = GraphNodeBase & {
  nodeType: 'version';
  packageId: EntityId;
  versionId: EntityId;
  packageCode: string;
  versionLabel: string;
  versionNumber: number;
  title: string;
  taskKind: TaskKind;
  isCurrent: boolean;
  createdAt: IsoTimestamp;
};

export type GraphNode = GraphPackageNode | GraphVersionNode;

export type GraphEdge = {
  id: EntityId;
  relationId: EntityId;
  type: RelationType;
  fromNodeId: EntityId;
  toNodeId: EntityId;
  /** Path geometry in canvas coordinates. */
  path: string;
  label: string;
  sourceVersionId: EntityId;
  targetVersionId: EntityId;
};

export type GraphGroup = {
  packageId: EntityId;
  x: number;
  y: number;
  width: number;
  height: number;
  packageCode: string;
  title: string;
  taskKind: TaskKind;
  expanded: boolean;
};

export type GraphLayout = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  groups: GraphGroup[];
  bounds: { minX: number; minY: number; width: number; height: number };
};

/* -------------------------------------------------------------------------- */
/* Action result types                                                         */
/* -------------------------------------------------------------------------- */

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

export type SubmitVersionInput = {
  packageId: EntityId;
  changeNote: string;
  /** Optional explicit unfinished scope for partial delivery. */
  unfinishedNote?: string;
};

export type StartReviewInput = {
  projectId: EntityId;
  /** Exact package version or material version that will be reviewed. */
  reviewTarget: ReviewTarget;
  title: string;
  goal: string;
  requirements: string[];
  scopeNote: string;
  /** Exact material versions used as review basis (optional; adapter may derive). */
  materialRefs?: MaterialReference[];
};

export type StartComparisonInput = {
  projectId: EntityId;
  baselineVersionId: EntityId;
  targetVersionId: EntityId;
  title: string;
  scopeNote: string;
};

export type StartRevisionFromFindingsInput = {
  projectId: EntityId;
  reviewPackageId: EntityId;
  reviewVersionId: EntityId;
  /** Exact package version the revision is authorized to modify. */
  baseVersionId: EntityId;
  findingIds: EntityId[];
  title: string;
  scopeNote: string;
};

export type StartRevisionFromDifferencesInput = {
  projectId: EntityId;
  comparisonPackageId: EntityId;
  comparisonVersionId: EntityId;
  baseVersionId: EntityId;
  differenceIds: EntityId[];
  title: string;
  scopeNote: string;
};

export type EditArtifactInput = {
  packageId: EntityId;
  artifactId: EntityId;
  payload: StageArtifactPayload;
  summary: string;
};

export type AddMaterialInput = {
  projectId: EntityId;
  name: string;
  kind: MaterialKind;
  usage: MaterialUsage;
  usageNote?: string;
  sizeBytes: number;
  /** Demo upload: file content never leaves the browser. */
  demoFileName: string;
};
