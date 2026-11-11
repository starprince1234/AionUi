/**
 * Demo projects.
 *
 * prj-001 is the fully worked main scenario. prj-002 is intentionally empty
 * (empty state coverage). prj-003 has parsed + unreadable materials but no
 * package yet (materials-only coverage).
 */
import type { Project } from '../../domain/types';
import { currentUser, editorUser, reviewerUser } from './users';

export const createProjects = (): Project[] => [
  {
    id: 'prj-001',
    code: 'PRJ-2026-014',
    name: '智慧园区技术方案编制',
    description: '为滨江智慧园区一期编制技术方案，并完成独立审查、修订与版本比对。',
    createdAt: '2026-11-03T09:00:00+08:00',
    updatedAt: '2026-11-10T17:40:00+08:00',
    members: [
      { user: currentUser(), role: 'owner' },
      { user: editorUser(), role: 'editor' },
      { user: reviewerUser(), role: 'reviewer' },
    ],
    tags: ['智慧园区', '技术方案', '审查修订'],
  },
  {
    id: 'prj-002',
    code: 'PRJ-2026-021',
    name: '新能源工厂数字化交付',
    description: '新能源工厂数字化交付项目，尚未上传材料，用于展示空项目状态。',
    createdAt: '2026-11-03T08:10:00+08:00',
    updatedAt: '2026-11-03T08:12:00+08:00',
    members: [{ user: currentUser(), role: 'owner' }],
    tags: ['数字化交付', '待启动'],
  },
  {
    id: 'prj-003',
    code: 'PRJ-2026-009',
    name: '轨道交通信号系统改造',
    description: '轨道交通信号系统改造需求梳理阶段，已上传需求说明书与现场勘察材料，尚未创建交付包。',
    createdAt: '2026-11-05T10:20:00+08:00',
    updatedAt: '2026-11-07T09:40:00+08:00',
    members: [
      { user: currentUser(), role: 'owner' },
      { user: editorUser(), role: 'editor' },
    ],
    tags: ['轨道交通', '信号系统', '需求梳理'],
  },
];
