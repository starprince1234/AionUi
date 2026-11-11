/**
 * Shared wizard field helpers.
 *
 * The create-task wizard keeps validation local (no Arco Form) so every field
 * can show a compact Carbon-style error line and the demo can explain exactly
 * which input is missing before the repository call.
 */
import { Select } from '@arco-design/web-react';
import type { TFunction } from 'i18next';
import React from 'react';
import type { Material, MaterialReference, PackageVersion, Project } from '../../domain/types';
import { useEvidT } from '../../design/primitives';

/** Mounts Arco select popups inside the Evidossier theme scope. */
export const getPopupMount = (): HTMLElement => {
  if (typeof document === 'undefined') return undefined as unknown as HTMLElement;
  const root = document.querySelector('.evd-root');
  return root instanceof HTMLElement ? root : document.body;
};

export const WizardField: React.FC<{
  label: React.ReactNode;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}> = ({ label, required, hint, error, children }) => (
  <div className='evd-pkg-field'>
    <span className={`evd-pkg-field__label${required ? ' evd-pkg-field__label--required' : ''}`}>{label}</span>
    {children}
    {hint ? <p className='evd-pkg-field__hint'>{hint}</p> : null}
    {error ? <p className='evd-pkg-error-text'>{error}</p> : null}
  </div>
);

export const ProjectSelect: React.FC<{
  projects: Project[];
  value?: string;
  onChange: (projectId: string) => void;
  disabled?: boolean;
  placeholder?: string;
}> = ({ projects, value, onChange, disabled, placeholder }) => {
  const t = useEvidT();
  return (
    <Select
      value={value}
      onChange={(next) => onChange(String(next))}
      disabled={disabled}
      placeholder={placeholder ?? t('evidossierPackage.wizard.projectPlaceholder')}
      getPopupContainer={getPopupMount}
    >
      {projects.map((project) => (
        <Select.Option key={project.id} value={project.id}>
          {project.name}（{project.code}）
        </Select.Option>
      ))}
    </Select>
  );
};

/** Build the exact material reference the repository stores for a task input. */
export const buildMaterialReference = (material: Material): MaterialReference | undefined => {
  const version =
    material.versions.find((candidate) => candidate.id === material.currentVersionId) ??
    material.versions[material.versions.length - 1];
  if (!version) return undefined;
  return {
    id: `mref-${material.id}-${version.id}`,
    materialId: material.id,
    materialVersionId: version.id,
    materialName: material.name,
    versionNumber: version.version,
    role: material.usage,
  };
};

export const materialOptionLabel = (material: Material, t: TFunction): string => {
  const current = material.versions.find((candidate) => candidate.id === material.currentVersionId);
  const parseKey = current ? current.parseStatus : 'pending';
  const base = `${material.name} · ${t(`evidossierCommon.materialUsage.${material.usage}`)} · ${t(
    `evidossierCommon.status.parse.${parseKey}`
  )}`;
  return current && (current.parseStatus === 'failed' || current.parseStatus === 'partial')
    ? `${base}（${t('evidossierPackage.wizard.unreadableShort')}）`
    : base;
};

export const versionOptionLabel = (version: PackageVersion, packageTitle: string | undefined): string =>
  packageTitle ? `${version.label} · ${packageTitle}` : version.label;

export const splitLines = (value: string): string[] =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

export const materialHasReadableBody = (material: Material): boolean => {
  const current = material.versions.find((candidate) => candidate.id === material.currentVersionId);
  return Boolean(current?.document) && current?.parseStatus !== 'failed';
};

export const splitIdList = (raw: string | null | undefined): string[] =>
  (raw ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
