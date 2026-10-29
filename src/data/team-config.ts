/**
 * Conexão de uma equipe com o próprio banco Supabase.
 * A chave publicável é segura para ficar no navegador: o acesso real
 * é controlado pelas políticas de segurança (RLS) do banco da equipe.
 */
export interface TeamConnection {
  name: string;
  url: string;
  key: string;
}

const STORAGE_KEY = 'suflow.teams';
const ACTIVE_KEY = 'suflow.activeTeam';

export function listTeams(): TeamConnection[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TeamConnection[]) : [];
  } catch {
    return [];
  }
}

export function saveTeam(team: TeamConnection): void {
  const others = listTeams().filter((t) => t.url !== team.url);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([team, ...others]));
  localStorage.setItem(ACTIVE_KEY, team.url);
}

export function forgetTeam(url: string): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(listTeams().filter((t) => t.url !== url)));
  if (localStorage.getItem(ACTIVE_KEY) === url) localStorage.removeItem(ACTIVE_KEY);
}

export function activeTeam(): TeamConnection | undefined {
  const url = localStorage.getItem(ACTIVE_KEY);
  const teams = listTeams();
  return teams.find((t) => t.url === url) ?? teams[0];
}

export function setActiveTeam(url: string): void {
  localStorage.setItem(ACTIVE_KEY, url);
}

/** Normaliza o endereço do projeto: aceita com ou sem https e barra final. */
export function normalizeUrl(input: string): string {
  let url = input.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//.test(url)) url = `https://${url}`;
  return url;
}

export function encodeInvite(team: TeamConnection): string {
  const json = JSON.stringify({ n: team.name, u: team.url, k: team.key });
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeInvite(code: string): TeamConnection | undefined {
  try {
    const binary = atob(code.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const data = JSON.parse(new TextDecoder().decode(bytes)) as { n?: unknown; u?: unknown; k?: unknown };
    if (typeof data.n !== 'string' || typeof data.u !== 'string' || typeof data.k !== 'string') return undefined;
    return { name: data.n, url: data.u, key: data.k };
  } catch {
    return undefined;
  }
}

export function inviteLink(team: TeamConnection): string {
  const base = `${location.origin}${location.pathname}`;
  return `${base}#/convite?c=${encodeInvite(team)}`;
}
