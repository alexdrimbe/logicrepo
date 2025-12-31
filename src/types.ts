// Rule condition operators
export interface ComparisonOperator {
  gte?: number;
  lte?: number;
  gt?: number;
  lt?: number;
}

export interface InOperator {
  in: (string | number | boolean)[];
}

export type ConditionValue =
  | string
  | number
  | boolean
  | ComparisonOperator
  | InOperator;

// Condition can have field matchers, or 'all'/'any' for boolean logic
// We use a simpler type to avoid TypeScript index signature conflicts
export type Condition = Record<string, ConditionValue | Condition[]>;

export interface Rule {
  id: string;
  description?: string;
  when: Condition;
  then: Record<string, unknown>;
}

export interface RuleFile {
  version: number;
  rules: Rule[];
}

export interface LoadedRules {
  file: string;
  rules: Rule[];
}

// Test schemas
export interface TestCase {
  name: string;
  input: Record<string, unknown>;
  expect: {
    matched_rule?: string | null;
    [key: string]: unknown;
  };
}

export interface TestFile {
  version: number;
  tests: TestCase[];
}

export interface LoadedTests {
  file: string;
  tests: TestCase[];
}

// Evaluation result
export interface EvaluationResult {
  matched_rule: string | null;
  output: Record<string, unknown>;
}

// Test result
export interface TestResult {
  file: string;
  name: string;
  passed: boolean;
  input: Record<string, unknown>;
  expected: Record<string, unknown>;
  actual: EvaluationResult;
  reason?: string;
}

// Validation errors
export interface ValidationError {
  file: string;
  line?: number;
  message: string;
  hint?: string;
}
