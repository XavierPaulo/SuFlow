import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ProcessDefinition, Role } from '../core';
import type { TeamConnection } from './team-config';

export interface Member {
  user_id: string;
  email: string;
  display_name: string;
  role: Role;
}

export interface Invite {
  email: string;
  role: Role;
}

export interface ProcessSummary {
  id: string;
  name: string;
  version: number;
  published: boolean;
  updated_at: string;
}

const clients = new Map<string, SupabaseClient>();

/** Acesso ao banco de uma equipe. Cada equipe tem o próprio projeto Supabase. */
export class TeamDb {
  readonly client: SupabaseClient;

  constructor(readonly team: TeamConnection) {
    let client = clients.get(team.url);
    if (!client) {
      client = createClient(team.url, team.key, { auth: { storageKey: `suflow-auth-${new URL(team.url).host}` } });
      clients.set(team.url, client);
    }
    this.client = client;
  }

  /** Retorna a versão do esquema SuFlow instalada, ou lança erro se ausente. */
  async schemaVersion(): Promise<number> {
    const { data, error } = await this.client.rpc('suflow_schema_version');
    if (error) throw error;
    return Number(data);
  }

  async teamName(): Promise<string> {
    const { data, error } = await this.client.from('team_settings').select('name').single();
    if (error) throw error;
    return data.name as string;
  }

  async renameTeam(name: string): Promise<void> {
    const { error } = await this.client.from('team_settings').update({ name }).eq('id', true);
    if (error) throw error;
  }

  async signUp(email: string, password: string, displayName: string): Promise<{ needsConfirmation: boolean }> {
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName }, emailRedirectTo: location.href.split('#')[0] },
    });
    if (error) throw error;
    return { needsConfirmation: !data.session };
  }

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async signOut(): Promise<void> {
    await this.client.auth.signOut();
  }

  async currentUserId(): Promise<string | undefined> {
    const { data } = await this.client.auth.getSession();
    return data.session?.user.id;
  }

  async me(): Promise<Member | undefined> {
    const userId = await this.currentUserId();
    if (!userId) return undefined;
    const { data, error } = await this.client.from('members').select('*').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return (data as Member | null) ?? undefined;
  }

  async members(): Promise<Member[]> {
    const { data, error } = await this.client.from('members').select('*').order('created_at');
    if (error) throw error;
    return data as Member[];
  }

  async setRole(userId: string, role: Role): Promise<void> {
    const { error } = await this.client.from('members').update({ role }).eq('user_id', userId);
    if (error) throw error;
  }

  async removeMember(userId: string): Promise<void> {
    const { error } = await this.client.from('members').delete().eq('user_id', userId);
    if (error) throw error;
  }

  async invites(): Promise<Invite[]> {
    const { data, error } = await this.client.from('invites').select('email, role').order('created_at');
    if (error) throw error;
    return data as Invite[];
  }

  async invite(email: string, role: Role): Promise<void> {
    const invitedBy = await this.currentUserId();
    const { error } = await this.client
      .from('invites')
      .upsert({ email: email.toLowerCase(), role, invited_by: invitedBy });
    if (error) throw error;
  }

  async cancelInvite(email: string): Promise<void> {
    const { error } = await this.client.from('invites').delete().eq('email', email);
    if (error) throw error;
  }

  async processes(): Promise<ProcessSummary[]> {
    const { data, error } = await this.client
      .from('processes')
      .select('id, name, version, published, updated_at')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data as ProcessSummary[];
  }

  async loadProcess(id: string): Promise<ProcessDefinition> {
    const { data, error } = await this.client.from('processes').select('definition').eq('id', id).single();
    if (error) throw error;
    return data.definition as ProcessDefinition;
  }

  async saveProcess(process: ProcessDefinition): Promise<void> {
    const { error } = await this.client.from('processes').upsert({
      id: process.id,
      name: process.name,
      definition: process,
      version: process.version,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  }

  async deleteProcess(id: string): Promise<void> {
    const { error } = await this.client.from('processes').delete().eq('id', id);
    if (error) throw error;
  }
}

/** Link direto para o editor SQL do projeto, a partir do endereço https://<ref>.supabase.co. */
export function sqlEditorLink(url: string): string {
  const ref = new URL(url).host.split('.')[0];
  return `https://supabase.com/dashboard/project/${ref}/sql/new`;
}

export function authSettingsLink(url: string): string {
  const ref = new URL(url).host.split('.')[0];
  return `https://supabase.com/dashboard/project/${ref}/auth/url-configuration`;
}
