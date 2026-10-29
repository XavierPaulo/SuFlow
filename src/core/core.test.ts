import { describe, expect, it } from 'vitest';
import {
  can,
  emptyProcess,
  evaluateRules,
  isPublishable,
  toBpmnXml,
  validateProcess,
  type ProcessDefinition,
} from './index';

function sampleProcess(): ProcessDefinition {
  const p = emptyProcess('Aprovar compra');
  p.lanes = [{ id: 'lane_fin', name: 'Financeiro', assignee: { kind: 'role', value: 'financeiro' } }];
  p.forms = [{ id: 'form_1', name: 'Pedido', fields: [{ id: 'f1', name: 'valor', label: 'Valor', type: 'number', required: true }] }];
  p.nodes = [
    { id: 'start', type: 'event', kind: 'start', trigger: 'none', name: 'Pedido recebido', position: { x: 0, y: 0 } },
    {
      id: 'review', type: 'activity', kind: 'userTask', name: 'Analisar', position: { x: 10, y: 0 },
      laneId: 'lane_fin', formId: 'form_1', requirements: [], validations: [],
    },
    { id: 'gw', type: 'gateway', kind: 'exclusive', name: 'Aprovado?', position: { x: 20, y: 0 } },
    { id: 'ok', type: 'event', kind: 'end', trigger: 'none', name: 'Aprovado', position: { x: 30, y: 0 } },
    { id: 'no', type: 'event', kind: 'end', trigger: 'none', name: 'Recusado', position: { x: 30, y: 10 } },
  ];
  p.flows = [
    { id: 'f1', sourceId: 'start', targetId: 'review' },
    { id: 'f2', sourceId: 'review', targetId: 'gw' },
    { id: 'f3', sourceId: 'gw', targetId: 'ok', condition: 'aprovado == true' },
    { id: 'f4', sourceId: 'gw', targetId: 'no', isDefault: true },
  ];
  return p;
}

describe('validateProcess', () => {
  it('aceita um processo bem formado', () => {
    expect(validateProcess(sampleProcess())).toEqual([]);
    expect(isPublishable(sampleProcess())).toBe(true);
  });

  it('exige eventos de início e fim', () => {
    const codes = validateProcess(emptyProcess('Vazio')).map((i) => i.code);
    expect(codes).toContain('no-start');
    expect(codes).toContain('no-end');
  });

  it('acusa saída de gateway sem condição', () => {
    const p = sampleProcess();
    p.flows[3] = { ...p.flows[3], isDefault: false };
    expect(validateProcess(p).map((i) => i.code)).toContain('gateway-unguarded');
    expect(isPublishable(p)).toBe(false);
  });

  it('acusa fluxo para elemento inexistente e formulário inexistente', () => {
    const p = sampleProcess();
    p.flows.push({ id: 'bad', sourceId: 'review', targetId: 'ghost' });
    const review = p.nodes[1];
    if (review.type === 'activity') review.formId = 'nope';
    const codes = validateProcess(p).map((i) => i.code);
    expect(codes).toContain('dangling-flow');
    expect(codes).toContain('unknown-form');
  });
});

describe('evaluateRules', () => {
  it('reporta somente as regras que falham', () => {
    const failures = evaluateRules(
      [
        { id: 'r1', field: 'valor', operator: 'required', message: 'Informe o valor' },
        { id: 'r2', field: 'valor', operator: 'lt', value: 1000, message: 'Acima do limite' },
        { id: 'r3', field: 'email', operator: 'matches', value: '^\\S+@\\S+$', message: 'E-mail inválido' },
      ],
      { valor: 5000, email: 'a@b.c' },
    );
    expect(failures.map((f) => f.ruleId)).toEqual(['r2']);
  });
});

describe('can', () => {
  it('respeita o papel e a política do processo', () => {
    const p = sampleProcess();
    p.access = { visibleTo: ['admin', 'editor'], editableBy: ['admin'] };
    expect(can('member', 'runProcess', p)).toBe(false);
    expect(can('editor', 'viewProcess', p)).toBe(true);
    expect(can('editor', 'editProcess', p)).toBe(false);
    expect(can('admin', 'editProcess', p)).toBe(true);
    expect(can('viewer', 'createProcess')).toBe(false);
  });
});

describe('toBpmnXml', () => {
  it('gera BPMN 2.0 com raias, nós e condições', () => {
    const xml = toBpmnXml(sampleProcess());
    expect(xml).toContain('<bpmn:lane id="lane_fin" name="Financeiro">');
    expect(xml).toContain('<bpmn:userTask id="review" name="Analisar" />');
    expect(xml).toContain('<bpmn:exclusiveGateway id="gw" name="Aprovado?" />');
    expect(xml).toContain('<bpmn:conditionExpression>aprovado == true</bpmn:conditionExpression>');
  });
});
