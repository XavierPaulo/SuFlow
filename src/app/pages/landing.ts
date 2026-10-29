import { activeTeam } from '../../data/team-config';
import { h, html } from '../../ui/dom';
import { souffleSvg } from '../../ui/icon';

const FEATURES: [string, string][] = [
  ['Editor 16-bit', 'Desenhe processos BPMN num editor com cara de jogo de Mega Drive, no mouse, teclado ou joystick.'],
  ['Execução automática', 'Gatilhos, gateways, transições e status movem o trabalho sozinhos entre as etapas.'],
  ['Hand-offs claros', 'Raias e responsáveis deixam explícito quem faz o quê e quando passa adiante.'],
  ['Formulários e regras', 'Crie formulários, requisitos e validações sem programar.'],
  ['Dados da sua equipe', 'Cada equipe usa o próprio banco. Ninguém mais, nem o SuFlow, guarda seus dados.'],
  ['BI embutido', 'Tempo de ciclo, gargalos e volume por etapa para melhorar o processo.'],
];

export function landingPage(root: HTMLElement): void {
  const team = activeTeam();
  root.append(
    h(
      'main',
      { class: 'landing' },
      h(
        'section',
        { class: 'hero' },
        html(`<div class="hero-icon">${souffleSvg(128)}</div>`),
        h('h1', { class: 'pixel' }, 'SuFlow'),
        h('p', { class: 'tagline' }, 'Processos que crescem no ponto certo.'),
        h(
          'div',
          { class: 'actions' },
          h('a', { class: 'btn primary', href: '#/criar' }, 'Criar minha equipe'),
          h('a', { class: 'btn', href: '#/entrar' }, team ? `Entrar em ${team.name}` : 'Entrar na minha equipe'),
        ),
        h('p', { class: 'press-start pixel' }, 'PRESS START'),
      ),
      h(
        'section',
        { class: 'features' },
        ...FEATURES.map(([title, text]) => h('article', { class: 'card' }, h('h2', {}, title), h('p', {}, text))),
      ),
      h('footer', { class: 'footer' }, 'Recebeu um link de convite? Basta abri-lo para entrar na equipe.'),
    ),
  );
}
