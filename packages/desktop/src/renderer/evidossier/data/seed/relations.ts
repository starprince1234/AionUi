/**
 * Semantic package-version relations.
 *
 * Direction is always source -> target and the note explains what the target
 * did with the source. Every endpoint is a fully denormalized VersionRef.
 */
import type { PackageRelation } from '../../domain/types';
import { currentUser } from './users';
import { versionRef } from './refs';

export const createRelations = (): PackageRelation[] => [
  {
    id: 'rel-001',
    type: 'reviewed',
    source: versionRef('ver-p001-v2'),
    target: versionRef('ver-p002-v1'),
    scopeNote: '审查范围：技术方案 V1.1 全文，依据需求说明书 V1.2 与设备参数表',
    createdAt: '2026-11-05T16:40:00+08:00',
    createdBy: currentUser(),
  },
  {
    id: 'rel-002',
    type: 'revised_from',
    source: versionRef('ver-p001-v2'),
    target: versionRef('ver-p003-v1'),
    scopeNote: '仅授权修改 3.2 设备选型、5 运维保障、6 投资估算',
    createdAt: '2026-11-06T17:25:00+08:00',
    createdBy: currentUser(),
  },
  {
    id: 'rel-003',
    type: 'based_on',
    source: versionRef('ver-p002-v1'),
    target: versionRef('ver-p003-v1'),
    scopeNote: '采用 F-01、F-02、F-04 三个问题',
    createdAt: '2026-11-06T17:26:00+08:00',
    createdBy: currentUser(),
  },
  {
    id: 'rel-004',
    type: 'compared',
    source: versionRef('ver-p001-v2'),
    target: versionRef('ver-p004-v1'),
    comparisonRole: 'baseline',
    scopeNote: '作为比对基准版本',
    createdAt: '2026-11-09T15:55:00+08:00',
    createdBy: currentUser(),
  },
  {
    id: 'rel-005',
    type: 'compared',
    source: versionRef('ver-p003-v1'),
    target: versionRef('ver-p004-v1'),
    comparisonRole: 'target',
    scopeNote: '作为比对目标版本',
    createdAt: '2026-11-09T15:56:00+08:00',
    createdBy: currentUser(),
  },
];
