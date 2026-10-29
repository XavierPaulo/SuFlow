# SuFlow

Sistema web de BPMN automatizado, com editor visual no estilo Mega Drive. Roda inteiro no navegador e cada equipe guarda os próprios dados no próprio banco.

## Como funciona a separação por equipe

O SuFlow é um site estático único. Cada equipe cria um projeto **Supabase** gratuito e conecta o SuFlow a ele pelo assistente "Criar minha equipe". Usuários, processos e dados da equipe ficam só nesse banco, sob a conta e a responsabilidade da equipe. Quem publica o site não guarda dado de ninguém.

- A primeira pessoa a se cadastrar no banco vira **administradora**.
- Os demais só entram se o administrador registrar o e-mail como convite e enviar o link de convite.
- Papéis: Administrador, Editor de processos, Membro e Observador. As regras de acesso são aplicadas no próprio banco (Row Level Security), não só na tela.

## Arquitetura

```
src/
  core/   Domínio BPMN puro (modelo, validação, regras, permissões, exportação BPMN 2.0 XML). Sem dependência de navegador ou banco.
  data/   Acesso ao banco de cada equipe (Supabase) e conexões guardadas no navegador.
  app/    Roteador por hash e páginas (frontal, cadastro de equipe, login, convite, painel).
  ui/     Estilos 16-bit, ícone do suflê e utilitários de DOM.
supabase/schema.sql   Esquema que cada equipe roda no próprio banco.
```

## Desenvolvimento

```bash
npm install
npm run dev      # servidor local
npm test         # testes (Vitest)
npm run build    # checagem de tipos + build de produção em dist/
```

## Publicação

O workflow `.github/workflows/ci.yml` testa cada pull request e publica no GitHub Pages a cada push na `main`. Para ativar, em **Settings → Pages** escolha **Source: GitHub Actions**.

## Roteiro

1. Fundação e cadastro de equipes (este marco)
2. Editor visual estilo Mega Drive, com mouse, teclado e joystick
3. Execução automática: tokens, transições, gateways, status, hand-offs, formulários e validações
4. BI: tempo de ciclo, gargalos, volume por etapa e desempenho por responsável
