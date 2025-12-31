#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import {
  Rule,
  TestResult,
  ValidationError,
} from './types';
import {
  findYamlFiles,
  loadRuleFile,
  loadTestFile,
  isValidationError,
} from './loader';
import { runTests } from './runner';
import {
  formatValidationError,
  formatTestFailure,
  formatLoadSuccess,
  formatLoadError,
  formatTestFileSuccess,
  formatTestFileFailure,
  formatSummary,
} from './formatter';

const program = new Command();

program
  .name('logicrepo')
  .description('Validate business logic defined in YAML files')
  .version('0.1.0');

program
  .command('check')
  .description('Validate rules and run tests')
  .option('-d, --dir <path>', 'Base directory for logic files', './logic')
  .action((options) => {
    const baseDir = path.resolve(options.dir);
    const rulesDir = path.join(baseDir, 'rules');
    const testsDir = path.join(baseDir, 'tests');

    let hasErrors = false;
    const allRules: Rule[] = [];
    const allTestResults: TestResult[] = [];
    const validationErrors: ValidationError[] = [];

    // Load rules
    console.log('\nLoading rules...');
    const ruleFiles = findYamlFiles(rulesDir);

    if (ruleFiles.length === 0) {
      console.log(`  No rule files found in ${rulesDir}`);
    }

    for (const file of ruleFiles) {
      const result = loadRuleFile(file);
      if (isValidationError(result)) {
        console.log(formatLoadError(file));
        validationErrors.push(result);
        hasErrors = true;
      } else {
        console.log(formatLoadSuccess(file, result.rules.length, 'rules'));
        allRules.push(...result.rules);
      }
    }

    // Print validation errors
    if (validationErrors.length > 0) {
      console.log('');
      for (const error of validationErrors) {
        console.log(formatValidationError(error));
      }
    }

    // Load and run tests
    console.log('\nRunning tests...');
    const testFiles = findYamlFiles(testsDir);

    if (testFiles.length === 0) {
      console.log(`  No test files found in ${testsDir}`);
    }

    const testLoadErrors: ValidationError[] = [];

    for (const file of testFiles) {
      const result = loadTestFile(file);
      if (isValidationError(result)) {
        console.log(formatLoadError(file));
        testLoadErrors.push(result);
        hasErrors = true;
      } else {
        const testResults = runTests(result.tests, allRules, file);
        allTestResults.push(...testResults);

        const passed = testResults.filter((r) => r.passed).length;
        const failed = testResults.filter((r) => !r.passed).length;

        if (failed > 0) {
          console.log(formatTestFileFailure(file, passed, failed));
          hasErrors = true;
        } else {
          console.log(formatTestFileSuccess(file, passed));
        }
      }
    }

    // Print test load errors
    if (testLoadErrors.length > 0) {
      console.log('');
      for (const error of testLoadErrors) {
        console.log(formatValidationError(error));
      }
    }

    // Print test failures
    const failedTests = allTestResults.filter((r) => !r.passed);
    if (failedTests.length > 0) {
      console.log('');
      for (const result of failedTests) {
        console.log(formatTestFailure(result));
      }
    }

    // Summary
    const totalTests = allTestResults.length;
    const passedTests = allTestResults.filter((r) => r.passed).length;
    console.log(formatSummary(totalTests, passedTests, failedTests.length));

    process.exit(hasErrors ? 1 : 0);
  });

program.parse();
