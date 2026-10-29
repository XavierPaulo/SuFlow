/**
 * Núcleo do domínio BPMN do SuFlow.
 * Este módulo é puro: não conhece navegador, banco nem interface.
 */

export type Id = string;

export type EventKind = 'start' | 'intermediate' | 'end';
export type EventTrigger = 'none' | 'message' | 'timer' | 'signal' | 'conditional' | 'error';
export type ActivityKind = 'task' | 'userTask' | 'serviceTask' | 'scriptTask' | 'subProcess';
export type GatewayKind = 'exclusive' | 'parallel' | 'inclusive' | 'eventBased';
export type ArtifactKind = 'dataObject' | 'annotation' | 'group';

export interface Point {
  x: number;
  y: number;
}

interface NodeBase {
  id: Id;
  name: string;
  position: Point;
  /** Raia (swimlane) onde o nó está; define o responsável padrão. */
  laneId?: Id;
}

export interface EventNode extends NodeBase {
  type: 'event';
  kind: EventKind;
  trigger: EventTrigger;
  /** Expressão cron/ISO-8601 para gatilhos de tempo. */
  timer?: string;
}

export interface ActivityNode extends NodeBase {
  type: 'activity';
  kind: ActivityKind;
  /** Status (etapa) que a instância assume ao entrar nesta atividade. */
  status?: string;
  /** Formulário que o responsável preenche para concluir a atividade. */
  formId?: Id;
  /** Responsável explícito; se ausente, herda o da raia. */
  assignee?: Assignee;
  /** Requisitos que precisam ser verdadeiros para iniciar a atividade. */
  requirements: Rule[];
  /** Validações aplicadas aos dados ao concluir a atividade. */
  validations: Rule[];
  /** Prazo em horas, usado nos indicadores de BI. */
  slaHours?: number;
}

export interface GatewayNode extends NodeBase {
  type: 'gateway';
  kind: GatewayKind;
}

export interface ArtifactNode extends NodeBase {
  type: 'artifact';
  kind: ArtifactKind;
  text?: string;
}

export type FlowNode = EventNode | ActivityNode | GatewayNode | ArtifactNode;

export interface SequenceFlow {
  id: Id;
  sourceId: Id;
  targetId: Id;
  name?: string;
  /** Condição avaliada em gateways exclusivos/inclusivos. */
  condition?: string;
  /** Caminho padrão quando nenhuma condição é atendida. */
  isDefault?: boolean;
}

export interface Lane {
  id: Id;
  name: string;
  /** Papel ou pessoa responsável pelo trabalho na raia (hand-off). */
  assignee?: Assignee;
}

export interface Assignee {
  kind: 'role' | 'user';
  value: string;
}

/** Regra declarativa simples, avaliada sobre os dados da instância. */
export interface Rule {
  id: Id;
  field: string;
  operator: 'required' | 'equals' | 'notEquals' | 'gt' | 'lt' | 'matches';
  value?: string | number;
  message: string;
}

export interface FormField {
  id: Id;
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea' | 'file';
  required: boolean;
  options?: string[];
}

export interface FormDefinition {
  id: Id;
  name: string;
  fields: FormField[];
}

/** Visibilidade e controle: quem vê e quem edita o processo. */
export interface AccessPolicy {
  visibleTo: Role[];
  editableBy: Role[];
}

export type Role = 'admin' | 'editor' | 'member' | 'viewer';

export interface ProcessDefinition {
  id: Id;
  name: string;
  description: string;
  version: number;
  lanes: Lane[];
  nodes: FlowNode[];
  flows: SequenceFlow[];
  forms: FormDefinition[];
  access: AccessPolicy;
}

export function newId(prefix: string): Id {
  const random = globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  return `${prefix}_${random}`;
}

export function emptyProcess(name: string): ProcessDefinition {
  return {
    id: newId('proc'),
    name,
    description: '',
    version: 1,
    lanes: [],
    nodes: [],
    flows: [],
    forms: [],
    access: { visibleTo: ['admin', 'editor', 'member', 'viewer'], editableBy: ['admin', 'editor'] },
  };
}
