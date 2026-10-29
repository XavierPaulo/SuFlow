import type { Rule } from './model';

export type InstanceData = Record<string, unknown>;

export interface RuleFailure {
  ruleId: string;
  message: string;
}

/** Avalia requisitos e validações declarativos sobre os dados de uma instância. */
export function evaluateRules(rules: Rule[], data: InstanceData): RuleFailure[] {
  return rules.filter((rule) => !passes(rule, data)).map((rule) => ({ ruleId: rule.id, message: rule.message }));
}

function passes(rule: Rule, data: InstanceData): boolean {
  const value = data[rule.field];
  switch (rule.operator) {
    case 'required':
      return value !== undefined && value !== null && value !== '' && value !== false;
    case 'equals':
      return String(value) === String(rule.value);
    case 'notEquals':
      return String(value) !== String(rule.value);
    case 'gt':
      return Number(value) > Number(rule.value);
    case 'lt':
      return Number(value) < Number(rule.value);
    case 'matches':
      try {
        return new RegExp(String(rule.value)).test(String(value ?? ''));
      } catch {
        return false;
      }
  }
}
