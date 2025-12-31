import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'yaml';
import {
  RuleFile,
  TestFile,
  LoadedRules,
  LoadedTests,
  ValidationError,
} from './types';

export function findYamlFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Recurse into subdirectories
      files.push(...findYamlFiles(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

export function loadRuleFile(filePath: string): LoadedRules | ValidationError {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = parse(content) as RuleFile;

    if (!parsed || typeof parsed !== 'object') {
      return {
        file: filePath,
        message: 'File is empty or not a valid YAML object',
      };
    }

    if (parsed.version !== 1) {
      return {
        file: filePath,
        message: `Unsupported version: ${parsed.version}. Expected version: 1`,
      };
    }

    if (!Array.isArray(parsed.rules)) {
      return {
        file: filePath,
        message: 'Missing or invalid "rules" array',
      };
    }

    for (let i = 0; i < parsed.rules.length; i++) {
      const rule = parsed.rules[i];
      if (!rule.id || typeof rule.id !== 'string') {
        return {
          file: filePath,
          message: `Rule at index ${i} is missing a valid "id" field`,
        };
      }
      if (rule.when === undefined) {
        return {
          file: filePath,
          message: `Rule "${rule.id}" is missing a "when" field`,
        };
      }
      if (rule.then === undefined || typeof rule.then !== 'object') {
        return {
          file: filePath,
          message: `Rule "${rule.id}" is missing a valid "then" field`,
        };
      }
    }

    return {
      file: filePath,
      rules: parsed.rules,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      file: filePath,
      message: `Failed to parse YAML: ${message}`,
    };
  }
}

export function loadTestFile(filePath: string): LoadedTests | ValidationError {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = parse(content) as TestFile;

    if (!parsed || typeof parsed !== 'object') {
      return {
        file: filePath,
        message: 'File is empty or not a valid YAML object',
      };
    }

    if (parsed.version !== 1) {
      return {
        file: filePath,
        message: `Unsupported version: ${parsed.version}. Expected version: 1`,
      };
    }

    if (!Array.isArray(parsed.tests)) {
      return {
        file: filePath,
        message: 'Missing or invalid "tests" array',
      };
    }

    for (let i = 0; i < parsed.tests.length; i++) {
      const test = parsed.tests[i];
      if (!test.name || typeof test.name !== 'string') {
        return {
          file: filePath,
          message: `Test at index ${i} is missing a valid "name" field`,
        };
      }
      if (test.input === undefined || typeof test.input !== 'object') {
        return {
          file: filePath,
          message: `Test "${test.name}" is missing a valid "input" field`,
        };
      }
      if (test.expect === undefined || typeof test.expect !== 'object') {
        return {
          file: filePath,
          message: `Test "${test.name}" is missing a valid "expect" field`,
        };
      }
    }

    return {
      file: filePath,
      tests: parsed.tests,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      file: filePath,
      message: `Failed to parse YAML: ${message}`,
    };
  }
}

export function isValidationError(
  result: LoadedRules | LoadedTests | ValidationError
): result is ValidationError {
  return 'message' in result;
}
