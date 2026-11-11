/**
 * Evidossier data provider.
 *
 * Owns the repository instance, exposes the latest snapshot plus action
 * methods, and polls the adapter while simulated executions are running. The
 * real backend adapter will plug into the same surface (write + refetch), so
 * pages never depend on mock storage details.
 */
import { Message } from '@arco-design/web-react';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AddMaterialInput,
  ArtifactPackage,
  CreatePackageInput,
  EditArtifactInput,
  EvidossierSnapshot,
  Material,
  PackageVersion,
  Project,
  StageArtifact,
  StartComparisonInput,
  StartReviewInput,
  StartRevisionFromDifferencesInput,
  StartRevisionFromFindingsInput,
  SubmitVersionInput,
} from '../domain/types';
import { MockEvidossierRepository } from './mockRepository';
import type { DraftConflictResolution, EvidossierRepository } from './repository';

type EvidossierActions = {
  createProject: (input: { name: string; description: string }) => Promise<Project | undefined>;
  renameProject: (projectId: string, name: string) => Promise<Project | undefined>;
  addMaterial: (input: AddMaterialInput) => Promise<Material | undefined>;
  addMaterialVersion: (materialId: string) => Promise<Material | undefined>;
  removeMaterial: (materialId: string) => Promise<boolean>;
  setMaterialParseOutcome: (materialId: string, outcome: 'parsed' | 'failed') => Promise<Material | undefined>;
  createPackage: (input: CreatePackageInput) => Promise<ArtifactPackage | undefined>;
  startReview: (input: StartReviewInput) => Promise<ArtifactPackage | undefined>;
  startComparison: (input: StartComparisonInput) => Promise<ArtifactPackage | undefined>;
  startRevisionFromFindings: (input: StartRevisionFromFindingsInput) => Promise<ArtifactPackage | undefined>;
  startRevisionFromDifferences: (input: StartRevisionFromDifferencesInput) => Promise<ArtifactPackage | undefined>;
  renamePackage: (packageId: string, title: string) => Promise<boolean>;
  continueEditing: (packageId: string, baseVersionId: string) => Promise<boolean>;
  sendMessage: (packageId: string, text: string) => Promise<boolean>;
  confirmArtifact: (packageId: string, artifactId: string) => Promise<boolean>;
  editArtifact: (input: EditArtifactInput) => Promise<StageArtifact | undefined>;
  pauseExecution: (packageId: string) => Promise<boolean>;
  resumeExecution: (packageId: string) => Promise<boolean>;
  retryStage: (packageId: string) => Promise<boolean>;
  simulateFailure: (packageId: string) => Promise<boolean>;
  resolveDraftConflict: (packageId: string, resolution: DraftConflictResolution) => Promise<boolean>;
  submitVersion: (input: SubmitVersionInput) => Promise<PackageVersion | undefined>;
  resetDemo: () => Promise<boolean>;
  refresh: () => Promise<void>;
};

type EvidossierContextValue = {
  snapshot: EvidossierSnapshot | null;
  loading: boolean;
  error: string | null;
  actions: EvidossierActions;
  repository: EvidossierRepository;
};

const EvidossierContext = createContext<EvidossierContextValue | null>(null);

export const EvidossierProvider: React.FC<{ children: React.ReactNode; repository?: EvidossierRepository }> = ({
  children,
  repository,
}) => {
  const repo = useMemo(() => repository ?? new MockEvidossierRepository(), [repository]);
  const [snapshot, setSnapshot] = useState<EvidossierSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = await repo.getSnapshot();
      if (mounted.current) {
        setSnapshot(next);
        setLoading(false);
      }
    } catch (err) {
      if (mounted.current) {
        setLoading(false);
        setError(err instanceof Error ? err.message : String(err));
      }
    }
  }, [repo]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!error) return;
    Message.error(error);
    setError(null);
  }, [error]);

  const invoke = useCallback(
    async <T,>(run: () => Promise<T>): Promise<T | undefined> => {
      try {
        const result = await run();
        await refresh();
        return result;
      } catch (err) {
        if (mounted.current) setError(err instanceof Error ? err.message : String(err));
        return undefined;
      }
    },
    [refresh]
  );

  const invokeVoid = useCallback(
    async (run: () => Promise<unknown>): Promise<boolean> => {
      try {
        await run();
        await refresh();
        return true;
      } catch (err) {
        if (mounted.current) setError(err instanceof Error ? err.message : String(err));
        return false;
      }
    },
    [refresh]
  );

  useEffect(() => {
    if (!snapshot) return;
    const running = snapshot.executions.some((execution) => execution.status === 'running');
    if (!running) return;
    let cancelled = false;
    const timer = window.setInterval(() => {
      void (async () => {
        const result = await repo.tick();
        if (!cancelled && result.changed) await refresh();
      })();
    }, 900);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [snapshot, repo, refresh]);

  const actions = useMemo<EvidossierActions>(
    () => ({
      createProject: (input) => invoke(() => repo.createProject(input)),
      renameProject: (projectId, name) => invoke(() => repo.renameProject(projectId, name)),
      addMaterial: (input) => invoke(() => repo.addMaterial(input)),
      addMaterialVersion: (materialId) => invoke(() => repo.addMaterialVersion(materialId)),
      removeMaterial: (materialId) => invokeVoid(() => repo.removeMaterial(materialId)),
      setMaterialParseOutcome: (materialId, outcome) => invoke(() => repo.setMaterialParseOutcome(materialId, outcome)),
      createPackage: (input) => invoke(() => repo.createPackage(input)),
      startReview: (input) => invoke(() => repo.startReview(input)),
      startComparison: (input) => invoke(() => repo.startComparison(input)),
      startRevisionFromFindings: (input) => invoke(() => repo.startRevisionFromFindings(input)),
      startRevisionFromDifferences: (input) => invoke(() => repo.startRevisionFromDifferences(input)),
      renamePackage: (packageId, title) => invokeVoid(() => repo.renamePackage(packageId, title)),
      continueEditing: (packageId, baseVersionId) => invokeVoid(() => repo.continueEditing(packageId, baseVersionId)),
      sendMessage: (packageId, text) => invokeVoid(() => repo.sendMessage(packageId, text)),
      confirmArtifact: (packageId, artifactId) => invokeVoid(() => repo.confirmArtifact(packageId, artifactId)),
      editArtifact: (input) => invoke(() => repo.editArtifact(input)),
      pauseExecution: (packageId) => invokeVoid(() => repo.pauseExecution(packageId)),
      resumeExecution: (packageId) => invokeVoid(() => repo.resumeExecution(packageId)),
      retryStage: (packageId) => invokeVoid(() => repo.retryStage(packageId)),
      simulateFailure: (packageId) => invokeVoid(() => repo.simulateFailure(packageId)),
      resolveDraftConflict: (packageId, resolution) =>
        invokeVoid(() => repo.resolveDraftConflict(packageId, resolution)),
      submitVersion: (input) => invoke(() => repo.submitVersion(input)),
      resetDemo: () => invokeVoid(() => repo.resetDemo()),
      refresh,
    }),
    [invoke, invokeVoid, repo, refresh]
  );

  const value = useMemo<EvidossierContextValue>(
    () => ({ snapshot, loading, error, actions, repository: repo }),
    [snapshot, loading, error, actions, repo]
  );

  return <EvidossierContext.Provider value={value}>{children}</EvidossierContext.Provider>;
};

export const useEvidossier = (): EvidossierContextValue => {
  const context = useContext(EvidossierContext);
  if (!context) throw new Error('useEvidossier must be used inside EvidossierProvider');
  return context;
};

/** Convenience hook for pages that require loaded data. */
export const useEvidossierSnapshot = (): { snapshot: EvidossierSnapshot; actions: EvidossierActions } | null => {
  const { snapshot, actions } = useEvidossier();
  if (!snapshot) return null;
  return { snapshot, actions };
};
