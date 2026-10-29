import type { ProcessDefinition, Role } from './model';

export type Action = 'manageTeam' | 'createProcess' | 'viewProcess' | 'editProcess' | 'runProcess' | 'viewReports';

const TEAM_PERMISSIONS: Record<Role, Action[]> = {
  admin: ['manageTeam', 'createProcess', 'viewProcess', 'editProcess', 'runProcess', 'viewReports'],
  editor: ['createProcess', 'viewProcess', 'editProcess', 'runProcess', 'viewReports'],
  member: ['viewProcess', 'runProcess'],
  viewer: ['viewProcess', 'viewReports'],
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  editor: 'Editor de processos',
  member: 'Membro',
  viewer: 'Observador',
};

/** Visibilidade e controle: combina o papel na equipe com a política do processo. */
export function can(role: Role, action: Action, process?: ProcessDefinition): boolean {
  if (!TEAM_PERMISSIONS[role].includes(action)) return false;
  if (!process || role === 'admin') return true;
  if (action === 'viewProcess' || action === 'runProcess') return process.access.visibleTo.includes(role);
  if (action === 'editProcess') return process.access.editableBy.includes(role);
  return true;
}
