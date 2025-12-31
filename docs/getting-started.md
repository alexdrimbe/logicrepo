# Getting Started

This guide walks you through creating your first logic rules and tests.

## Table of Contents

- [Creating a Rule File](#creating-a-rule-file)
- [Creating a Test File](#creating-a-test-file)
- [Running Validation](#running-validation)
- [Iterating on Rules](#iterating-on-rules)

---

## Creating a Rule File

### Step 1: Create the file

Rule files go in `/logic/rules/`. Create a new YAML file:

```bash
touch logic/rules/shipping.yaml
```

**File naming:**
- Use descriptive names: `shipping.yaml`, `pricing.yaml`, `access-control.yaml`
- Use lowercase with hyphens or underscores
- One domain per file keeps things organized

### Step 2: Add the version header

Every rule file must start with `version: 1`:

```yaml
version: 1
rules:
  # rules go here
```

### Step 3: Add your first rule

```yaml
version: 1
rules:
  - id: free_shipping_threshold
    description: "Free shipping for orders over $100"
    when:
      order_total:
        gte: 100
    then:
      shipping_cost: 0
      shipping_method: standard
```

### Step 4: Add more rules in priority order

Remember: **first match wins**. Put specific rules before general ones:

```yaml
version: 1
rules:
  # Most specific first
  - id: express_member_shipping
    description: "Express members always get free express shipping"
    when:
      membership: express
    then:
      shipping_cost: 0
      shipping_method: express

  # Then general high-value rule
  - id: free_shipping_threshold
    description: "Free shipping for orders over $100"
    when:
      order_total:
        gte: 100
    then:
      shipping_cost: 0
      shipping_method: standard

  # Default/catch-all last
  - id: standard_shipping
    description: "Standard shipping rate"
    when: {}
    then:
      shipping_cost: 9.99
      shipping_method: standard
```

### Complete Rule File Template

```yaml
version: 1
rules:
  # === High Priority Rules ===

  - id: rule_highest_priority
    description: "Explain when this applies"
    when:
      # most specific conditions
    then:
      # outputs

  # === Medium Priority Rules ===

  - id: rule_medium_priority
    description: "Explain when this applies"
    when:
      # moderately specific conditions
    then:
      # outputs

  # === Default Rule ===

  - id: default_rule
    description: "Fallback when nothing else matches"
    when: {}
    then:
      # default outputs
```

---

## Creating a Test File

### Step 1: Create the file

Test files go in `/logic/tests/`. Name them to match your rule files:

```bash
touch logic/tests/shipping_tests.yaml
```

### Step 2: Add the version header

```yaml
version: 1
tests:
  # tests go here
```

### Step 3: Add test cases

Each test has:
- `name`: Descriptive name (shown in output)
- `input`: The data to evaluate
- `expect`: Expected outputs (including which rule should match)

```yaml
version: 1
tests:
  - name: express member gets free express shipping
    input:
      membership: express
      order_total: 50
    expect:
      shipping_cost: 0
      shipping_method: express
      matched_rule: express_member_shipping

  - name: large order gets free standard shipping
    input:
      membership: standard
      order_total: 150
    expect:
      shipping_cost: 0
      shipping_method: standard
      matched_rule: free_shipping_threshold

  - name: small order pays shipping
    input:
      membership: standard
      order_total: 30
    expect:
      shipping_cost: 9.99
      shipping_method: standard
      matched_rule: standard_shipping
```

### Step 4: Test edge cases

Always test boundaries and special cases:

```yaml
tests:
  # Boundary: exactly at threshold
  - name: order exactly at $100 threshold
    input:
      order_total: 100
    expect:
      shipping_cost: 0
      matched_rule: free_shipping_threshold

  # Boundary: just below threshold
  - name: order just below $100 threshold
    input:
      order_total: 99.99
    expect:
      shipping_cost: 9.99
      matched_rule: standard_shipping

  # Priority: express beats threshold
  - name: express member with large order still gets express
    input:
      membership: express
      order_total: 200
    expect:
      shipping_method: express
      matched_rule: express_member_shipping
```

### Complete Test File Template

```yaml
version: 1
tests:
  # === Happy Path Tests ===

  - name: describe the normal case
    input:
      field1: value1
      field2: value2
    expect:
      output1: expected1
      matched_rule: expected_rule_id

  # === Edge Cases ===

  - name: boundary condition at threshold
    input:
      quantity: 100  # exactly at boundary
    expect:
      matched_rule: threshold_rule

  - name: boundary condition below threshold
    input:
      quantity: 99   # just below
    expect:
      matched_rule: default_rule

  # === Priority Tests ===

  - name: verify rule A beats rule B
    input:
      # conditions that match both rules
    expect:
      matched_rule: rule_a  # higher priority
```

---

## Running Validation

### Basic check

```bash
node dist/index.js check
```

**Success output:**
```
Loading rules...
  ✓ /logic/rules/shipping.yaml (3 rules)

Running tests...
  ✓ /logic/tests/shipping_tests.yaml (6 passed)

✓ All 6 tests passed
```

**Failure output:**
```
Loading rules...
  ✓ /logic/rules/shipping.yaml (3 rules)

Running tests...
  ✗ /logic/tests/shipping_tests.yaml (5 passed, 1 failed)

FAILED: order exactly at $100 threshold

  File: /logic/tests/shipping_tests.yaml
  Test: order exactly at $100 threshold

  Input:
    order_total: 100

  Expected:
    shipping_cost: 0
    matched_rule: "free_shipping_threshold"

  Actual:
    matched_rule: "standard_shipping"
    shipping_cost: 9.99

  Why: Expected rule 'free_shipping_threshold' to match, but 'standard_shipping' matched instead.

✗ 1 of 6 tests failed
```

### Custom directory

```bash
node dist/index.js check --dir ./my-logic-folder
```

---

## Iterating on Rules

### Workflow

1. **Write/modify rules** in `/logic/rules/`
2. **Write tests** that define expected behavior
3. **Run `logicrepo check`** to validate
4. **Fix failures** by adjusting rules or tests
5. **Commit** when all tests pass

### Debugging Tips

**Wrong rule matched?**
- Check rule order - first match wins
- Look for overly broad conditions higher in the file
- Add more specific conditions to distinguish rules

**No rule matched?**
- Add a catch-all rule with `when: {}`
- Check for typos in field names
- Verify input types match conditions (string vs number)

**Output value wrong?**
- Check the `then` block of the matched rule
- Verify you're testing the right rule with `matched_rule`

### Adding a New Rule to Existing File

1. Decide priority relative to existing rules
2. Insert at the correct position (not at the end unless it's lowest priority)
3. Add tests for the new rule
4. Add tests to verify it doesn't break existing behavior
5. Run validation

```yaml
rules:
  - id: existing_high_priority
    # ...

  # NEW RULE - inserted in correct priority position
  - id: new_rule
    description: "New business requirement"
    when:
      new_condition: value
    then:
      new_output: result

  - id: existing_lower_priority
    # ...
```
