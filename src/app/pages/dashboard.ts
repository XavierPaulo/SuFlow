import { can, emptyProcess, ROLE_LABELS, type Role } from '../../core';
import { activeTeam, inviteLink } from '../../data/team-config';
import { TeamDb, type Member } from '../../data/team-db';
import { errorMessage, h } from '../../ui/dom';
import { go } from '../router';
import { field, form, panel } from './create-team';

const ROLES = Object.keys(ROLE_LABELS) as Role[];

/** Painel da equipe: processos, membros, convites e papéis. */
export async function dashboardPage(root: HTMLElement): Promise<void> {
  const team = activeTeam();
  if (!team) return go('/entrar');
  const db = new TeamDb(team);
  if (!(await db.currentUserId())) return go('/entrar');

  const main = h('main', { class: 'dashboard' });
  root.append(main);

  let me: Member | undefined;
  let teamName = team.name;
  try {
    [me, teamName] = await Promise.all([db.me(), db.teamName()]);
  } catch (error) {
    main.append(panel('Erro ao carregar a equipe', h('p', {}, errorMessage(error))));
    return;
  }

  const signOut = h('button', { class: 'btn small', onclick: async () => { await db.signOut(); go('/'); } }, 'Sair');
  main.append(h('header', { class: 'topbar' }, h('h1', { class: 'pixel' }, teamName), h('span', { class: 'badge' }, me ? ROLE_LABELS[me.role] : 'Sem acesso'), signOut));

  if (!me) {
    main.append(
      panel(
        'Aguardando convite',
        h('p', {}, 'Sua conta existe, mas ainda não faz parte desta equipe. Peça ao administrador para convidar o seu e-mail e depois crie a conta novamente pelo link de convite.'),
      ),
    );
    return;
  }

  main.append(await processesPanel(db, me.role));
  if (can(me.role, 'manageTeam')) main.append(await teamPanel(db, me));
}

async function processesPanel(db: TeamDb, role: Role): Promise<HTMLElement> {
  const list = h('ul', { class: 'list' });
  const refresh = async () => {
    const processes = await db.processes();
    list.replaceChildren(
      ...(processes.length === 0
        ? [h('li', { class: 'empty' }, 'Nenhum processo ainda.')]
        : processes.map((p) =>
            h(
              'li',
              {},
              h('span', {}, p.name),
              h('span', { class: 'muted' }, `v${p.version} · ${new Date(p.updated_at).toLocaleDateString('pt-BR')}`),
              role === 'admin'
                ? h('button', {
                    class: 'btn small danger',
                    onclick: async () => {
                      if (!confirm(`Excluir o processo "${p.name}"?`)) return;
                      await db.deleteProcess(p.id);
                      await refresh();
                    },
                  }, 'Excluir')
                : null,
            ),
          )),
    );
  };
  await refresh();

  return panel(
    'Processos',
    h('p', { class: 'muted' }, 'O editor visual no estilo Mega Drive chega na próxima etapa.'),
    list,
    can(role, 'createProcess')
      ? form(
          async (values, button) => {
            button.disabled = true;
            try {
              await db.saveProcess(emptyProcess(values.name));
              await refresh();
            } catch (error) {
              alert(errorMessage(error));
            } finally {
              button.disabled = false;
            }
          },
          field('Novo processo', h('input', { name: 'name', required: true, placeholder: 'Ex.: Aprovação de compras' })),
          h('button', { class: 'btn primary' }, 'Criar processo'),
        )
      : '',
  );
}

async function teamPanel(db: TeamDb, me: Member): Promise<HTMLElement> {
  const members = h('ul', { class: 'list' });
  const invites = h('ul', { class: 'list' });

  const refresh = async () => {
    const [memberRows, inviteRows] = await Promise.all([db.members(), db.invites()]);
    members.replaceChildren(
      ...memberRows.map((m) =>
        h(
          'li',
          {},
          h('span', {}, m.display_name || m.email, h('small', { class: 'muted' }, ` ${m.email}`)),
          m.user_id === me.user_id
            ? h('span', { class: 'badge' }, ROLE_LABELS[m.role])
            : roleSelect(m.role, async (role) => {
                await db.setRole(m.user_id, role);
              }),
          m.user_id === me.user_id
            ? null
            : h('button', {
                class: 'btn small danger',
                onclick: async () => {
                  if (!confirm(`Remover ${m.email} da equipe?`)) return;
                  await db.removeMember(m.user_id);
                  await refresh();
                },
              }, 'Remover'),
        ),
      ),
    );
    invites.replaceChildren(
      ...(inviteRows.length === 0
        ? [h('li', { class: 'empty' }, 'Nenhum convite pendente.')]
        : inviteRows.map((i) =>
            h(
              'li',
              {},
              h('span', {}, i.email),
              h('span', { class: 'badge' }, ROLE_LABELS[i.role]),
              h('button', { class: 'btn small', onclick: async () => { await db.cancelInvite(i.email); await refresh(); } }, 'Cancelar'),
            ),
          )),
    );
  };
  await refresh();

  const status = h('p', { class: 'status' });
  const link = inviteLink(db.team);
  const copy = h('button', { class: 'btn small', type: 'button' }, 'Copiar link');
  copy.addEventListener('click', async () => {
    await navigator.clipboard.writeText(link);
    copy.textContent = 'Copiado!';
  });

  return panel(
    'Equipe',
    h('h3', {}, 'Membros'),
    members,
    h('h3', {}, 'Convites pendentes'),
    invites,
    form(
      async (values, button) => {
        button.disabled = true;
        try {
          await db.invite(values.email, values.role as Role);
          status.textContent = `Convite registrado. Envie o link abaixo para ${values.email}.`;
          await refresh();
        } catch (error) {
          status.textContent = errorMessage(error);
        } finally {
          button.disabled = false;
        }
      },
      field('E-mail do novo membro', h('input', { name: 'email', type: 'email', required: true })),
      field('Papel', roleSelect('member')),
      h('button', { class: 'btn primary' }, 'Convidar'),
    ),
    status,
    h('div', { class: 'invite-row' }, h('pre', { class: 'invite' }, link), copy),
  );
}

function roleSelect(current: Role, onChange?: (role: Role) => Promise<void>): HTMLSelectElement {
  const select = h('select', { name: 'role' }, ...ROLES.map((r) => h('option', { value: r, selected: r === current }, ROLE_LABELS[r])));
  if (onChange) {
    select.addEventListener('change', async () => {
      try {
        await onChange(select.value as Role);
      } catch (error) {
        alert(errorMessage(error));
        select.value = current;
      }
    });
  }
  return select;
}
