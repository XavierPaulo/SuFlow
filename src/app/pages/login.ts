import { activeTeam, decodeInvite, listTeams, saveTeam, setActiveTeam, type TeamConnection } from '../../data/team-config';
import { TeamDb } from '../../data/team-db';
import { errorMessage, h } from '../../ui/dom';
import { go } from '../router';
import { field, form, panel } from './create-team';

/** Login de um membro na equipe ativa (ou escolha entre equipes já usadas neste navegador). */
export function loginPage(root: HTMLElement): void {
  const team = activeTeam();
  const container = h('main', { class: 'wizard' }, h('a', { class: 'back', href: '#/' }, '← Voltar'));
  root.append(container);

  if (!team) {
    container.append(
      panel(
        'Entrar numa equipe',
        h('p', {}, 'Este navegador ainda não conhece nenhuma equipe. Abra o link de convite que o administrador da sua equipe enviou, ou cole-o aqui:'),
        form(
          (values) => {
            const code = values.link.split('c=')[1] ?? values.link;
            const invited = decodeInvite(code);
            if (!invited) {
              alert('Link de convite inválido.');
              return;
            }
            saveTeam(invited);
            go('/entrar');
          },
          field('Link de convite', h('input', { name: 'link', required: true })),
          h('button', { class: 'btn primary' }, 'Continuar'),
        ),
        h('p', {}, 'Quer começar a sua? ', h('a', { href: '#/criar' }, 'Crie uma equipe'), '.'),
      ),
    );
    return;
  }

  const others = listTeams().filter((t) => t.url !== team.url);
  container.append(
    authPanel(team, 'signin'),
    others.length > 0
      ? h(
          'section',
          { class: 'panel' },
          h('h2', {}, 'Outras equipes neste navegador'),
          ...others.map((t) =>
            h('button', { class: 'btn', onclick: () => { setActiveTeam(t.url); go('/entrar'); } }, t.name),
          ),
        )
      : '',
  );
}

/** Página aberta pelo link de convite: guarda a conexão e oferece o cadastro. */
export function invitePage(root: HTMLElement, params: URLSearchParams): void {
  const team = decodeInvite(params.get('c') ?? '');
  const container = h('main', { class: 'wizard' });
  root.append(container);
  if (!team) {
    container.append(panel('Convite inválido', h('p', {}, 'Peça um novo link ao administrador da equipe.')));
    return;
  }
  saveTeam(team);
  container.append(authPanel(team, 'signup'));
}

function authPanel(team: TeamConnection, mode: 'signin' | 'signup'): HTMLElement {
  const db = new TeamDb(team);
  const status = h('p', { class: 'status' });
  const isSignup = mode === 'signup';

  return panel(
    isSignup ? `Entrar na equipe ${team.name}` : `Entrar em ${team.name}`,
    isSignup
      ? h('p', {}, 'Crie sua conta com o mesmo e-mail em que o administrador enviou o convite.')
      : h('p', {}, 'Use o e-mail e a senha da sua conta nesta equipe.'),
    form(
      async (values, button) => {
        button.disabled = true;
        status.textContent = isSignup ? 'Criando conta…' : 'Entrando…';
        try {
          if (isSignup) {
            const { needsConfirmation } = await db.signUp(values.email, values.password, values.displayName);
            if (needsConfirmation) {
              status.textContent = `Enviamos um link de confirmação para ${values.email}. Confirme e depois entre.`;
              return;
            }
          } else {
            await db.signIn(values.email, values.password);
          }
          go('/app');
        } catch (error) {
          status.textContent = errorMessage(error);
        } finally {
          button.disabled = false;
        }
      },
      ...(isSignup ? [field('Seu nome', h('input', { name: 'displayName', required: true }))] : []),
      field('E-mail', h('input', { name: 'email', type: 'email', required: true, autocomplete: 'email' })),
      field('Senha', h('input', {
        name: 'password', type: 'password', required: true, minlength: 8,
        autocomplete: isSignup ? 'new-password' : 'current-password',
      })),
      h('button', { class: 'btn primary' }, isSignup ? 'Criar conta' : 'Entrar'),
    ),
    status,
    isSignup ? h('a', { href: '#/entrar' }, 'Já tenho conta') : '',
  );
}
