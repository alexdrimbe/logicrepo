# logicrepo

A CLI tool that validates business logic defined in YAML files. Runs in CI to block PRs with invalid or risky logic changes.

## Why

Separate business logic from application code. Define rules as version-controlled YAML, test them in CI, and review changes in PR diffs.

## Quick Start

```bash
# Run directly with npx
npx logicrepo check

# Or install globally
npm install -g logicrepo
logicrepo check
```

## Example

**Rule:** `logic/rules/pricing.yaml`

```yaml
version: 1
rules:
  - id: enterprise_discount
    description: "Enterprise customers get 20% off"
    when:
      customer_tier: enterprise
    then:
      discount_percent: 20

  - id: default_pricing
    when: {}
    then:
      discount_percent: 0
```

**Test:** `logic/tests/pricing_tests.yaml`

```yaml
version: 1
tests:
  - name: enterprise customer gets discount
    input:
      customer_tier: enterprise
    expect:
      discount_percent: 20
      matched_rule: enterprise_discount
```

**Output:**

```
Loading rules...
  ✓ logic/rules/pricing.yaml (2 rules)

Running tests...
  ✓ logic/tests/pricing_tests.yaml (1 passed)

✓ All 1 tests passed
```

## Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](https://github.com/alexdrimbe/logicrepo/blob/main/docs/getting-started.md) | Create your first rules and tests |
| [Rules Reference](https://github.com/alexdrimbe/logicrepo/blob/main/docs/rules.md) | Complete rule syntax and operators |
| [Examples](https://github.com/alexdrimbe/logicrepo/blob/main/docs/examples.md) | Real-world examples: pricing, access control, feature flags |
| [Best Practices](https://github.com/alexdrimbe/logicrepo/blob/main/docs/best-practices.md) | Patterns, anti-patterns, and code review checklist |

## CI Integration

```yaml
# .github/workflows/logic-check.yml
name: Logic Check
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npx logicrepo check
```

## Key Concepts

- **First match wins**: Rules evaluated in order; first match returns
- **Deterministic**: Same input always produces same output
- **Stateless**: Rules only see the input, nothing else
- **Strict equality**: No type coercion (`"100"` ≠ `100`)

## Directory Structure

```
logic/
├── rules/     # Business logic (YAML)
└── tests/     # Test scenarios (YAML)
```

## CLI

```bash
logicrepo check              # Validate rules and run tests
logicrepo check --dir ./path # Custom logic directory
```

Exit code `0` = all tests pass. Exit code `1` = failures (blocks CI).
