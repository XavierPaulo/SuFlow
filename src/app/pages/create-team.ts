import schemaSql from '../../../supabase/schema.sql?raw';
import { inviteLink, normalizeUrl, saveTeam, type TeamConnection } from '../../data/team-config';
import { authSettingsLink, sqlEditorLink, TeamDb } from '../../data/team-db';
import { errorMessage, formValues, h } from '../../ui/dom';
import { go } from '../router';

interface WizardState {
  step: number;
  name: string;
  url: string;
  key: string;
}

const STEP_TITLES = ['Nome da equipe', 'Banco da equipe', 'Conectar', 'Instalar o SuFlow', 'Sua conta'];

/**
 * Assistente de criação de equipe. Cada equipe cria o próprio projeto
 * Supabase gratuito, de modo que os dados ficam sob a conta dela.
 */
export function createTeamPage(root: HTMLElement): void {
  const state: WizardState = { step: 0, name: '', url: '', key: '' };
  const container = h('main', { class: 'wizard' });
  root.append(container);

  const render = () => {
    container.replaceChildren(
      h('a', { class: 'back', href: '#/' }, '← Voltar'),
      h('h1', { class: 'pixel' }, 'Criar equipe'),
      h(
        'ol',
        { class: 'steps' },
        ...STEP_TITLES.map((title, i) =>
          h('li', { class: i === state.step ? 'current' : i < state.step ? 'done' : '' }, title),
        ),
      ),
      steps[state.step](),
    );
  };

  const next = () => {
    state.step += 1;
    render();
  };

  const team = (): TeamConnection => ({ name: state.name, url: state.url, key: state.key });

  const steps: (() => HTMLElement)[] = [
    () =>
      panel(
        'Como sua equipe vai se chamar?',
        form(
          (values) => {
            state.name = values.name;
            next();
          },
          field('Nome da equipe', h('input', { name: 'name', required: true, maxlength: 60, value: state.name, autofocus: true })),
          h('button', { class: 'btn primary' }, 'Continuar'),
        ),
      ),

    () =>
      panel(
        'Crie o banco da equipe no Supabase',
        h('p', {}, 'Os dados da equipe ficam num projeto Supabase seu, no plano gratuito. Leva uns 5 minutos:'),
        h(
          'ol',
          { class: 'howto' },
          h('li', {}, 'Crie uma conta em ', link('https://supabase.com/dashboard/sign-up', 'supabase.com'), '.'),
          h('li', {}, 'Clique em ', h('b', {}, 'New project'), `, dê o nome "${state.name}", escolha uma senha e a região mais próxima (ex.: São Paulo).`),
          h('li', {}, 'Espere o projeto ficar pronto e abra ', h('b', {}, 'Project Settings → API Keys'), '.'),
        ),
        h('button', { class: 'btn primary', onclick: next }, 'Projeto criado, continuar'),
      ),

    () => {
      const status = h('p', { class: 'status' });
      return panel(
        'Conecte o SuFlow ao banco',
        h('p', {}, 'Copie o endereço do projeto (Project URL) e a chave publicável (publishable ou anon key). Nunca use a chave secreta (service_role).'),
        form(
          async (values, button) => {
            if (/service_role|sb_secret_/.test(values.key)) {
              status.textContent = 'Essa é a chave secreta. Use a chave publicável (publishable/anon).';
              return;
            }
            state.url = normalizeUrl(values.url);
            state.key = values.key;
            button.disabled = true;
            status.textContent = 'Testando conexão…';
            try {
              const { error } = await new TeamDb(team()).client.auth.getSession();
              if (error) throw error;
              const res = await fetch(`${state.url}/auth/v1/settings`, { headers: { apikey: state.key } });
              if (!res.ok) throw new Error('O Supabase recusou a chave. Confira se copiou a chave inteira.');
              next();
            } catch (error) {
              status.textContent = `Não conectou: ${errorMessage(error)}`;
              button.disabled = false;
            }
          },
          field('Project URL', h('input', { name: 'url', required: true, placeholder: 'https://xxxx.supabase.co', value: state.url })),
          field('Chave publicável', h('input', { name: 'key', required: true, placeholder: 'sb_publishable_… ou eyJ…', value: state.key })),
          h('button', { class: 'btn primary' }, 'Testar e continuar'),
        ),
        status,
      );
    },

    () => {
      const status = h('p', { class: 'status' });
      const copy = h('button', { class: 'btn', type: 'button' }, 'Copiar script');
      copy.addEventListener('click', async () => {
        await navigator.clipboard.writeText(schemaSql);
        copy.textContent = 'Copiado!';
      });
      const check = h('button', { class: 'btn primary' }, 'Verificar instalação');
      check.addEventListener('click', async () => {
        check.disabled = true;
        status.textContent = 'Verificando…';
        try {
          await new TeamDb(team()).schemaVersion();
          next();
        } catch {
          status.textContent = 'Ainda não encontrei as tabelas do SuFlow. Rode o script e tente de novo.';
          check.disabled = false;
        }
      });
      return panel(
        'Instale as tabelas do SuFlow no banco',
        h(
          'ol',
          { class: 'howto' },
          h('li', {}, 'Copie o script abaixo.'),
          h('li', {}, 'Abra o ', link(sqlEditorLink(state.url), 'editor SQL do seu projeto'), ', cole o script e clique em ', h('b', {}, 'Run'), '.'),
          h('li', {}, 'Em ', link(authSettingsLink(state.url), 'Authentication → URL Configuration'), ', coloque este endereço em ', h('b', {}, 'Site URL'), ': ', h('code', {}, location.href.split('#')[0]), '.'),
        ),
        h('div', { class: 'actions' }, copy, check),
        status,
        h('details', {}, h('summary', {}, 'Ver o script'), h('pre', { class: 'sql' }, schemaSql)),
      );
    },

    () => {
      const status = h('p', { class: 'status' });
      return panel(
        'Crie sua conta de administrador',
        h('p', {}, 'A primeira pessoa a se cadastrar no banco vira administradora da equipe. Depois você convida os outros membros.'),
        form(
          async (values, button) => {
            button.disabled = true;
            status.textContent = 'Criando conta…';
            const db = new TeamDb(team());
            try {
              const { needsConfirmation } = await db.signUp(values.email, values.password, values.displayName);
              saveTeam(team());
              if (needsConfirmation) {
                container.replaceChildren(
                  panel(
                    'Confirme seu e-mail',
                    h('p', {}, `Enviamos um link para ${values.email}. Depois de confirmar, entre com seu e-mail e senha.`),
                    h('a', { class: 'btn primary', href: '#/entrar' }, 'Ir para o login'),
                  ),
                );
                return;
              }
              await db.renameTeam(state.name);
              container.replaceChildren(
                panel(
                  `Equipe ${state.name} pronta!`,
                  h('p', {}, 'Compartilhe este link com quem você convidar pelo painel. Ele só aponta para o banco da equipe; o acesso continua dependendo do convite.'),
                  h('pre', { class: 'invite' }, inviteLink(team())),
                  h('button', { class: 'btn primary', onclick: () => go('/app') }, 'Abrir painel da equipe'),
                ),
              );
            } catch (error) {
              status.textContent = `Não foi possível criar a conta: ${errorMessage(error)}`;
              button.disabled = false;
            }
          },
          field('Seu nome', h('input', { name: 'displayName', required: true })),
          field('E-mail', h('input', { name: 'email', type: 'email', required: true, autocomplete: 'email' })),
          field('Senha', h('input', { name: 'password', type: 'password', required: true, minlength: 8, autocomplete: 'new-password' })),
          h('button', { class: 'btn primary' }, 'Criar conta e equipe'),
        ),
        status,
      );
    },
  ];

  render();
}

export function panel(title: string, ...children: (Node | string)[]): HTMLElement {
  return h('section', { class: 'panel' }, h('h2', {}, title), ...children);
}

export function field(label: string, input: HTMLElement): HTMLElement {
  return h('label', { class: 'field' }, h('span', {}, label), input);
}

export function link(href: string, text: string): HTMLElement {
  return h('a', { href, target: '_blank', rel: 'noopener' }, text);
}

export function form(
  onSubmit: (values: Record<string, string>, button: HTMLButtonElement) => void | Promise<void>,
  ...children: HTMLElement[]
): HTMLFormElement {
  const el = h('form', {}, ...children);
  el.addEventListener('submit', (event) => {
    event.preventDefault();
    const button = el.querySelector<HTMLButtonElement>('button:not([type=button])')!;
    void onSubmit(formValues(el), button);
  });
  return el;
}
