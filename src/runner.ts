import {
  Rule,
  TestCase,
  TestResult,
  EvaluationResult,
} from './types';
import { evaluate, evaluateByType } from './evaluator';

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;

  if (typeof a === 'object' && typeof b === 'object') {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);

    if (aKeys.length !== bKeys.length) return false;

    for (const key of aKeys) {
      if (!bKeys.includes(key)) return false;
      if (!deepEqual(aObj[key], bObj[key])) return false;
    }

    return true;
  }

  return false;
}

function generateReason(
  expected: Record<string, unknown>,
  actual: EvaluationResult,
  rules: Rule[]
): string {
  // Check if wrong rule matched
  if (
    expected.matched_rule !== undefined &&
    expected.matched_rule !== actual.matched_rule
  ) {
    if (actual.matched_rule === null) {
      return 'No rule matched the input. Check your rule conditions.';
    }

    const expectedRule = rules.find((r) => r.id === expected.matched_rule);
    const actualRule = rules.find((r) => r.id === actual.matched_rule);

    if (expectedRule && actualRule) {
      const expectedIndex = rules.indexOf(expectedRule);
      const actualIndex = rules.indexOf(actualRule);

      if (actualIndex < expectedIndex) {
        return `Rule '${actual.matched_rule}' matched before '${expected.matched_rule}'. Check rule ordering.`;
      }
    }

    return `Expected rule '${expected.matched_rule}' to match, but '${actual.matched_rule}' matched instead.`;
  }

  // Check output differences
  const expectedOutput = { ...expected };
  delete expectedOutput.matched_rule;

  for (const [key, expectedValue] of Object.entries(expectedOutput)) {
    const actualValue = actual.output[key];
    if (!deepEqual(expectedValue, actualValue)) {
      return `Output mismatch: expected ${key}=${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}`;
    }
  }

  return 'Unknown mismatch';
}

export function runTest(
  test: TestCase,
  rules: Rule[],
  file: string
): TestResult {
  // If rule_type is specified in input, filter rules by type
  const ruleType = test.input.rule_type as string | undefined;
  const actual = ruleType
    ? evaluateByType(rules, ruleType, test.input)
    : evaluate(rules, test.input);

  // Build expected result for comparison
  const expectedOutput: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(test.expect)) {
    if (key !== 'matched_rule') {
      expectedOutput[key] = value;
    }
  }

  // Check matched_rule
  const expectedMatchedRule = test.expect.matched_rule;
  const matchedRuleCorrect =
    expectedMatchedRule === undefined ||
    expectedMatchedRule === actual.matched_rule;

  // Check output values
  let outputCorrect = true;
  for (const [key, expectedValue] of Object.entries(expectedOutput)) {
    if (!deepEqual(expectedValue, actual.output[key])) {
      outputCorrect = false;
      break;
    }
  }

  const passed = matchedRuleCorrect && outputCorrect;

  return {
    file,
    name: test.name,
    passed,
    input: test.input,
    expected: test.expect,
    actual,
    reason: passed ? undefined : generateReason(test.expect, actual, rules),
  };
}

export function runTests(
  tests: TestCase[],
  rules: Rule[],
  file: string
): TestResult[] {
  return tests.map((test) => runTest(test, rules, file));
}
