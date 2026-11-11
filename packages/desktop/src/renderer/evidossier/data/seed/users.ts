/**
 * Demo actors.
 *
 * The workspace has exactly one acting user. Every helper returns a fresh
 * object so a snapshot never shares mutable user references with another.
 */
import type { UserRef } from '../../domain/types';

/** Current acting user of the demo workspace. */
export const currentUser = (): UserRef => ({ id: 'usr-demo', displayName: '林析' });

/** Project editor. */
export const editorUser = (): UserRef => ({ id: 'usr-editor-01', displayName: '宋珂' });

/** Project reviewer. */
export const reviewerUser = (): UserRef => ({ id: 'usr-reviewer-01', displayName: '唐文远' });

/** Identity attached to simulated assistant messages, so the UI can label them. */
export const demoAgentUser = (): UserRef => ({ id: 'agent-demo', displayName: '演示模拟执行' });
