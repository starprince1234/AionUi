/**
 * Material vocabulary and small read-only helpers for the materials panel.
 */
import type { Material, MaterialKind, MaterialUsage, MaterialVersion } from '../../domain/types';

export const MATERIAL_KINDS: readonly MaterialKind[] = [
  'document',
  'spreadsheet',
  'drawing',
  'image',
  'template',
  'archive',
];

export const MATERIAL_USAGES: readonly MaterialUsage[] = [
  'fact',
  'requirement',
  'template',
  'style_reference',
  'case',
  'review_basis',
  'pending',
];

/** Version currently effective for a material. */
export const currentVersionOf = (material: Material): MaterialVersion | undefined =>
  material.versions.find((version) => version.id === material.currentVersionId) ??
  material.versions[material.versions.length - 1];

/**
 * A version is readable only when parsing produced a document and the status
 * is parsed or partial. Failed / pending versions must never be shown as read.
 */
export const isReadableVersion = (version: MaterialVersion | undefined): boolean =>
  Boolean(version?.document && (version.parseStatus === 'parsed' || version.parseStatus === 'partial'));
