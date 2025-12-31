import chalk from 'chalk';
import { TestResult, ValidationError } from './types';

function indent(text: string, spaces: number): string {
  const prefix = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((line) => prefix + line)
    .join('\n');
}

function formatObject(obj: Record<string, unknown>, spaces: number = 4): string {
  const lines = Object.entries(obj).map(
    ([key, value]) => `${key}: ${JSON.stringify(value)}`
  );
  return indent(lines.join('\n'), spaces);
}

export function formatValidationError(error: ValidationError): string {
  const lines = [
    chalk.red('ERROR: Invalid syntax'),
    '',
    `  File: ${error.file}`,
  ];

  if (error.line !== undefined) {
    lines.push(`  Line: ${error.line}`);
  }

  lines.push(`  Problem: ${error.message}`);

  if (error.hint) {
    lines.push('', `  ${error.hint}`);
  }

  lines.push('');
  return lines.join('\n');
}

export function formatTestFailure(result: TestResult): string {
  const lines = [
    chalk.red(`FAILED: ${result.name}`),
    '',
    `  File: ${result.file}`,
    `  Test: ${result.name}`,
    '',
    '  Input:',
    formatObject(result.input),
    '',
    '  Expected:',
    formatObject(result.expected),
    '',
    '  Actual:',
    `    matched_rule: ${result.actual.matched_rule === null ? 'null' : `"${result.actual.matched_rule}"`}`,
  ];

  if (Object.keys(result.actual.output).length > 0) {
    lines.push(formatObject(result.actual.output));
  }

  if (result.reason) {
    lines.push('', `  Why: ${result.reason}`);
  }

  lines.push('');
  return lines.join('\n');
}

export function formatLoadSuccess(file: string, count: number, type: string): string {
  return chalk.green('  ✓') + ` ${file} (${count} ${type})`;
}

export function formatLoadError(file: string): string {
  return chalk.red('  ✗') + ` ${file}`;
}

export function formatTestFileSuccess(file: string, passed: number): string {
  return chalk.green('  ✓') + ` ${file} (${passed} passed)`;
}

export function formatTestFileFailure(
  file: string,
  passed: number,
  failed: number
): string {
  return chalk.red('  ✗') + ` ${file} (${passed} passed, ${failed} failed)`;
}

export function formatSummary(
  totalTests: number,
  passedTests: number,
  failedTests: number
): string {
  if (failedTests === 0) {
    return chalk.green(`\n✓ All ${totalTests} tests passed\n`);
  }
  return chalk.red(`\n✗ ${failedTests} of ${totalTests} tests failed\n`);
}
