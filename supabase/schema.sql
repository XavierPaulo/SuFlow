-- SuFlow: esquema do banco de UMA equipe.
-- Cada equipe roda este script no próprio projeto Supabase (SQL Editor > New query > Run).
-- Os dados ficam inteiramente no projeto da equipe; o SuFlow não guarda nada centralmente.
-- O script pode ser executado novamente com segurança.

create table if not exists public.team_settings (
  id boolean primary key default true check (id),
  name text not null default 'Minha equipe',
  created_at timestamptz not null default now()
);
insert into public.team_settings (id) values (true) on conflict do nothing;

create table if not exists public.members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null default '',
  role text not null check (role in ('admin', 'editor', 'member', 'viewer')),
  created_at timestamptz not null default now()
);

create table if not exists public.invites (
  email text primary key,
  role text not null check (role in ('admin', 'editor', 'member', 'viewer')),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.processes (
  id text primary key,
  name text not null,
  definition jsonb not null,
  version integer not null default 1,
  published boolean not null default false,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Papel do usuário logado nesta equipe (null se não for membro).
create or replace function public.current_member_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.members where user_id = auth.uid();
$$;

-- Usado pelo assistente de cadastro para confirmar que o esquema foi aplicado.
create or replace function public.suflow_schema_version()
returns integer language sql immutable as $$ select 1 $$;
grant execute on function public.suflow_schema_version() to anon, authenticated;

-- Novo usuário: o primeiro vira administrador; os demais entram só se convidados.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  invited_role text;
begin
  if not exists (select 1 from public.members) then
    insert into public.members (user_id, email, display_name, role)
    values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'display_name', ''), 'admin');
    return new;
  end if;

  select role into invited_role from public.invites where lower(email) = lower(new.email);
  if invited_role is not null then
    insert into public.members (user_id, email, display_name, role)
    values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'display_name', ''), invited_role);
    delete from public.invites where lower(email) = lower(new.email);
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.team_settings enable row level security;
alter table public.members enable row level security;
alter table public.invites enable row level security;
alter table public.processes enable row level security;

-- Nome da equipe é público, para aparecer na tela de login.
drop policy if exists team_settings_read on public.team_settings;
create policy team_settings_read on public.team_settings for select using (true);
drop policy if exists team_settings_update on public.team_settings;
create policy team_settings_update on public.team_settings for update
  using (public.current_member_role() = 'admin');

drop policy if exists members_read on public.members;
create policy members_read on public.members for select
  using (public.current_member_role() is not null);
drop policy if exists members_admin_update on public.members;
create policy members_admin_update on public.members for update
  using (public.current_member_role() = 'admin');
drop policy if exists members_admin_delete on public.members;
create policy members_admin_delete on public.members for delete
  using (public.current_member_role() = 'admin' and user_id <> auth.uid());

drop policy if exists invites_admin on public.invites;
create policy invites_admin on public.invites for all
  using (public.current_member_role() = 'admin')
  with check (public.current_member_role() = 'admin');

-- Visibilidade e controle por processo, seguindo a política gravada na definição.
drop policy if exists processes_read on public.processes;
create policy processes_read on public.processes for select using (
  public.current_member_role() = 'admin'
  or (definition -> 'access' -> 'visibleTo') ? public.current_member_role()
);
drop policy if exists processes_insert on public.processes;
create policy processes_insert on public.processes for insert
  with check (public.current_member_role() in ('admin', 'editor'));
drop policy if exists processes_update on public.processes;
create policy processes_update on public.processes for update using (
  public.current_member_role() = 'admin'
  or (public.current_member_role() = 'editor' and (definition -> 'access' -> 'editableBy') ? 'editor')
);
drop policy if exists processes_delete on public.processes;
create policy processes_delete on public.processes for delete
  using (public.current_member_role() = 'admin');
