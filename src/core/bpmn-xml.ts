import type { FlowNode, ProcessDefinition } from './model';

/** Exporta o processo em BPMN 2.0 XML, para abrir em outras ferramentas. */
export function toBpmnXml(process: ProcessDefinition): string {
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" ' +
      'id="Definitions_' + esc(process.id) + '" targetNamespace="https://suflow.app/bpmn" exporter="SuFlow">',
    `  <bpmn:process id="${esc(process.id)}" name="${esc(process.name)}" isExecutable="true">`,
  ];

  if (process.lanes.length > 0) {
    lines.push('    <bpmn:laneSet>');
    for (const lane of process.lanes) {
      lines.push(`      <bpmn:lane id="${esc(lane.id)}" name="${esc(lane.name)}">`);
      for (const node of process.nodes.filter((n) => n.laneId === lane.id)) {
        lines.push(`        <bpmn:flowNodeRef>${esc(node.id)}</bpmn:flowNodeRef>`);
      }
      lines.push('      </bpmn:lane>');
    }
    lines.push('    </bpmn:laneSet>');
  }

  for (const node of process.nodes) {
    lines.push(`    ${nodeElement(node)}`);
  }

  for (const flow of process.flows) {
    const attrs = `id="${esc(flow.id)}" sourceRef="${esc(flow.sourceId)}" targetRef="${esc(flow.targetId)}"` +
      (flow.name ? ` name="${esc(flow.name)}"` : '');
    if (flow.condition) {
      lines.push(`    <bpmn:sequenceFlow ${attrs}>`);
      lines.push(`      <bpmn:conditionExpression>${esc(flow.condition)}</bpmn:conditionExpression>`);
      lines.push('    </bpmn:sequenceFlow>');
    } else {
      lines.push(`    <bpmn:sequenceFlow ${attrs} />`);
    }
  }

  lines.push('  </bpmn:process>', '</bpmn:definitions>');
  return lines.join('\n');
}

function nodeElement(node: FlowNode): string {
  const attrs = `id="${esc(node.id)}" name="${esc(node.name)}"`;
  switch (node.type) {
    case 'event': {
      const tag = node.kind === 'start' ? 'startEvent' : node.kind === 'end' ? 'endEvent' : 'intermediateCatchEvent';
      if (node.trigger === 'none') return `<bpmn:${tag} ${attrs} />`;
      return `<bpmn:${tag} ${attrs}><bpmn:${node.trigger}EventDefinition /></bpmn:${tag}>`;
    }
    case 'activity':
      return `<bpmn:${node.kind} ${attrs} />`;
    case 'gateway':
      return `<bpmn:${node.kind}Gateway ${attrs} />`;
    case 'artifact':
      if (node.kind === 'annotation') {
        return `<bpmn:textAnnotation id="${esc(node.id)}"><bpmn:text>${esc(node.text ?? node.name)}</bpmn:text></bpmn:textAnnotation>`;
      }
      if (node.kind === 'group') return `<bpmn:group id="${esc(node.id)}" />`;
      return `<bpmn:dataObjectReference ${attrs} />`;
  }
}

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
