import type { FlowNode, ProcessDefinition } from './model';

export type Severity = 'error' | 'warning';

export interface Issue {
  severity: Severity;
  code: string;
  message: string;
  elementId?: string;
}

/**
 * Padronização: verifica se o processo é um BPMN bem formado antes de
 * poder ser publicado ou executado.
 */
export function validateProcess(process: ProcessDefinition): Issue[] {
  const issues: Issue[] = [];
  const nodes = new Map(process.nodes.map((n) => [n.id, n]));
  const laneIds = new Set(process.lanes.map((l) => l.id));
  const formIds = new Set(process.forms.map((f) => f.id));
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();

  const starts = process.nodes.filter((n) => n.type === 'event' && n.kind === 'start');
  const ends = process.nodes.filter((n) => n.type === 'event' && n.kind === 'end');
  if (starts.length === 0) {
    issues.push({ severity: 'error', code: 'no-start', message: 'O processo precisa de um evento de início.' });
  }
  if (ends.length === 0) {
    issues.push({ severity: 'error', code: 'no-end', message: 'O processo precisa de um evento de fim.' });
  }

  for (const flow of process.flows) {
    const source = nodes.get(flow.sourceId);
    const target = nodes.get(flow.targetId);
    if (!source || !target) {
      issues.push({
        severity: 'error',
        code: 'dangling-flow',
        message: 'Fluxo de sequência ligado a um elemento que não existe.',
        elementId: flow.id,
      });
      continue;
    }
    if (source.type === 'artifact' || target.type === 'artifact') {
      issues.push({
        severity: 'error',
        code: 'artifact-in-flow',
        message: 'Artefatos não participam do fluxo de sequência; use uma associação.',
        elementId: flow.id,
      });
    }
    outgoing.set(source.id, (outgoing.get(source.id) ?? 0) + 1);
    incoming.set(target.id, (incoming.get(target.id) ?? 0) + 1);
  }

  for (const node of process.nodes) {
    const ins = incoming.get(node.id) ?? 0;
    const outs = outgoing.get(node.id) ?? 0;
    if (node.laneId && !laneIds.has(node.laneId)) {
      issues.push({ severity: 'error', code: 'unknown-lane', message: `"${label(node)}" está numa raia inexistente.`, elementId: node.id });
    }
    if (node.type === 'artifact') continue;
    if (node.type === 'event' && node.kind === 'start' && ins > 0) {
      issues.push({ severity: 'error', code: 'start-incoming', message: 'Evento de início não pode receber fluxos.', elementId: node.id });
    }
    if (node.type === 'event' && node.kind === 'end' && outs > 0) {
      issues.push({ severity: 'error', code: 'end-outgoing', message: 'Evento de fim não pode ter fluxos de saída.', elementId: node.id });
    }
    const isStart = node.type === 'event' && node.kind === 'start';
    const isEnd = node.type === 'event' && node.kind === 'end';
    if (!isStart && ins === 0) {
      issues.push({ severity: 'warning', code: 'no-incoming', message: `"${label(node)}" nunca é alcançado.`, elementId: node.id });
    }
    if (!isEnd && outs === 0) {
      issues.push({ severity: 'warning', code: 'no-outgoing', message: `"${label(node)}" não leva a lugar nenhum.`, elementId: node.id });
    }
    if (node.type === 'activity') {
      if (node.formId && !formIds.has(node.formId)) {
        issues.push({ severity: 'error', code: 'unknown-form', message: `"${label(node)}" usa um formulário inexistente.`, elementId: node.id });
      }
      if (node.kind === 'userTask' && !node.assignee && !node.laneId) {
        issues.push({ severity: 'warning', code: 'no-assignee', message: `"${label(node)}" não tem responsável.`, elementId: node.id });
      }
    }
    if (node.type === 'gateway' && (node.kind === 'exclusive' || node.kind === 'inclusive') && outs > 1) {
      const branches = process.flows.filter((f) => f.sourceId === node.id);
      const unguarded = branches.filter((f) => !f.condition && !f.isDefault);
      if (unguarded.length > 0) {
        issues.push({
          severity: 'error',
          code: 'gateway-unguarded',
          message: `O gateway "${label(node)}" tem saídas sem condição nem caminho padrão.`,
          elementId: node.id,
        });
      }
    }
  }

  return issues;
}

export function isPublishable(process: ProcessDefinition): boolean {
  return validateProcess(process).every((i) => i.severity !== 'error');
}

function label(node: FlowNode): string {
  return node.name || node.id;
}
