import {
  Rule,
  Condition,
  ConditionValue,
  ComparisonOperator,
  InOperator,
  EvaluationResult,
} from './types';

function isComparisonOperator(value: unknown): value is ComparisonOperator {
  if (typeof value !== 'object' || value === null) return false;
  const keys = Object.keys(value);
  return keys.some((k) => ['gte', 'lte', 'gt', 'lt'].includes(k));
}

function isInOperator(value: unknown): value is InOperator {
  if (typeof value !== 'object' || value === null) return false;
  return 'in' in value && Array.isArray((value as InOperator).in);
}

function compareValue(actual: unknown, operator: ComparisonOperator): boolean {
  if (typeof actual !== 'number') return false;

  if (operator.gte !== undefined && !(actual >= operator.gte)) return false;
  if (operator.lte !== undefined && !(actual <= operator.lte)) return false;
  if (operator.gt !== undefined && !(actual > operator.gt)) return false;
  if (operator.lt !== undefined && !(actual < operator.lt)) return false;

  return true;
}

function checkInOperator(actual: unknown, operator: InOperator): boolean {
  return operator.in.includes(actual as string | number | boolean);
}

function matchCondition(
  condition: ConditionValue,
  actual: unknown
): boolean {
  // Comparison operators
  if (isComparisonOperator(condition)) {
    return compareValue(actual, condition);
  }

  // In operator
  if (isInOperator(condition)) {
    return checkInOperator(actual, condition);
  }

  // Exact match (strict equality, no type coercion)
  return actual === condition;
}

function matchConditions(
  conditions: Condition,
  input: Record<string, unknown>
): boolean {
  // First check regular field conditions (excluding all/any)
  for (const [field, constraint] of Object.entries(conditions)) {
    if (field === 'all' || field === 'any') continue;

    const actualValue = input[field];
    if (!matchCondition(constraint as ConditionValue, actualValue)) {
      return false;
    }
  }

  // Handle 'all' - all conditions must match
  if ('all' in conditions && Array.isArray(conditions.all)) {
    if (!conditions.all.every((c) => matchConditions(c, input))) {
      return false;
    }
  }

  // Handle 'any' - at least one condition must match
  if ('any' in conditions && Array.isArray(conditions.any)) {
    if (!conditions.any.some((c) => matchConditions(c, input))) {
      return false;
    }
  }

  return true;
}

export function evaluate(
  rules: Rule[],
  input: Record<string, unknown>
): EvaluationResult {
  // First match wins
  for (const rule of rules) {
    if (matchConditions(rule.when, input)) {
      return {
        matched_rule: rule.id,
        output: { ...rule.then },
      };
    }
  }

  // No rule matched
  return {
    matched_rule: null,
    output: {},
  };
}

/**
 * Evaluate rules filtered by rule_type.
 * This allows different rule sets to be scoped and evaluated separately.
 */
export function evaluateByType(
  rules: Rule[],
  ruleType: string,
  input: Record<string, unknown>
): EvaluationResult {
  // Filter rules that match the rule_type
  const filteredRules = rules.filter((rule) => {
    const ruleTypeCondition = rule.when.rule_type;
    return ruleTypeCondition === ruleType;
  });

  return evaluate(filteredRules, input);
}

