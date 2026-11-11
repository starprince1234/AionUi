/**
 * Project materials.
 *
 * Every material has exactly one version and `currentVersionId` points at it.
 * mat-004 is partially parsed (表 3 marked for manual check); mat-006 and
 * mat-008 are unreadable scans and therefore carry no parsed document.
 */
import type { EvidDocument, Material } from '../../domain/types';
import {
  createMat001Document,
  createMat002Document,
  createMat003Document,
  createMat004Document,
  createMat005Document,
  createMat007Document,
} from './materialDocs';
import { MATERIAL_SPECS } from './refs';

const documentFor = (materialId: string): EvidDocument | undefined => {
  switch (materialId) {
    case 'mat-001':
      return createMat001Document();
    case 'mat-002':
      return createMat002Document();
    case 'mat-003':
      return createMat003Document();
    case 'mat-004':
      return createMat004Document();
    case 'mat-005':
      return createMat005Document();
    case 'mat-007':
      return createMat007Document();
    default:
      return undefined;
  }
};

export const createMaterials = (): Material[] =>
  MATERIAL_SPECS.map((spec) => {
    const document = documentFor(spec.id);
    return {
      id: spec.id,
      projectId: spec.projectId,
      name: spec.name,
      kind: spec.kind,
      origin: 'uploaded',
      usage: spec.usage,
      usageNote: spec.usageNote,
      versions: [
        {
          id: spec.versionId,
          version: spec.versionNumber,
          fileName: spec.name,
          sizeBytes: spec.sizeBytes,
          addedAt: spec.addedAt,
          parseStatus: spec.parseStatus,
          ...(spec.parseNote === undefined ? {} : { parseNote: spec.parseNote }),
          ...(document === undefined ? {} : { document }),
        },
      ],
      currentVersionId: spec.versionId,
      addedAt: spec.addedAt,
      updatedAt: spec.updatedAt,
    };
  });
