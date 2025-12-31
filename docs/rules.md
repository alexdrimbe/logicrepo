# Logic Rules Reference

This document provides a complete reference for defining business logic rules in logicrepo.

## Table of Contents

- [File Format](#file-format)
- [Rule Structure](#rule-structure)
- [Conditions](#conditions)
  - [Exact Match](#exact-match)
  - [Comparison Operators](#comparison-operators)
  - [Set Membership](#set-membership)
  - [Boolean Logic](#boolean-logic)
  - [Empty Conditions](#empty-conditions)
- [Outputs](#outputs)
- [Evaluation Order](#evaluation-order)
- [Edge Cases](#edge-cases)

---

## File Format

Rules are stored in YAML files under `/logic/rules/`. All `.yaml` and `.yml` files in this directory are loaded.

```yaml
version: 1
rules:
  - id: rule_one
    when:
      field: value
    then:
      result: output

  - id: rule_two
    # ...
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `version` | `number` | Schema version. Must be `1` |
| `rules` | `array` | List of rule definitions |

---

## Rule Structure

Each rule has the following structure:

```yaml
- id: unique_rule_id
  description: "Human-readable explanation"
  when:
    # conditions
  then:
    # outputs
```

### Rule Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `id` | Yes | `string` | Unique identifier. Used in test assertions and error messages |
| `description` | No | `string` | Documents the rule's purpose. Shown in some error messages |
| `when` | Yes | `object` | Conditions that must match for rule to apply |
| `then` | Yes | `object` | Output values when rule matches |

### ID Naming Conventions

- Use `snake_case` for consistency
- Make IDs descriptive: `enterprise_bulk_discount` not `rule_1`
- Group related rules with prefixes: `pricing_`, `access_`, `feature_`

---

## Conditions

The `when` block defines what input must look like for a rule to match.

### Exact Match

The simplest condition: field must equal the specified value exactly.

```yaml
when:
  customer_tier: enterprise
```

**Supported value types:**

| Type | Example | Notes |
|------|---------|-------|
| String | `status: active` | Case-sensitive |
| Number | `quantity: 100` | Integer or float |
| Boolean | `is_premium: true` | `true` or `false` |
| Null | `discount_code: null` | Matches missing or null values |

**Important: No type coercion**

```yaml
# These are NOT equivalent:
quantity: 100      # Matches number 100
quantity: "100"    # Matches string "100"
```

**Multiple exact matches (implicit AND):**

```yaml
when:
  customer_tier: enterprise
  region: us
  is_active: true
# All three conditions must match
```

---

### Comparison Operators

For numeric comparisons, use operator objects.

#### Greater Than or Equal (`gte`)

```yaml
when:
  quantity:
    gte: 100
# Matches: 100, 101, 500, 1000
# Does not match: 99, 0, -1
```

#### Less Than or Equal (`lte`)

```yaml
when:
  price:
    lte: 50
# Matches: 50, 49, 0, -10
# Does not match: 51, 100
```

#### Greater Than (`gt`)

```yaml
when:
  age:
    gt: 18
# Matches: 19, 21, 100
# Does not match: 18, 17, 0
```

#### Less Than (`lt`)

```yaml
when:
  score:
    lt: 0
# Matches: -1, -100
# Does not match: 0, 1, 100
```

#### Combining Comparisons (Range)

Multiple operators on the same field create a range:

```yaml
when:
  quantity:
    gte: 10
    lte: 100
# Matches: 10, 50, 100
# Does not match: 9, 101
```

```yaml
when:
  temperature:
    gt: 0
    lt: 100
# Matches: 1, 50, 99
# Does not match: 0, 100, -5
```

#### Edge Cases

| Input | Condition | Result |
|-------|-----------|--------|
| `quantity: "100"` (string) | `quantity: { gte: 100 }` | **No match** - type mismatch |
| `quantity: null` | `quantity: { gte: 0 }` | **No match** - null is not a number |
| `quantity: 100.5` | `quantity: { gte: 100 }` | **Match** - floats work |
| Missing `quantity` field | `quantity: { gte: 0 }` | **No match** - field must exist |

---

### Set Membership

Check if a value is one of several allowed values.

#### In Operator (`in`)

```yaml
when:
  region:
    in: [us, ca, mx]
# Matches: "us", "ca", "mx"
# Does not match: "uk", "de", "US" (case-sensitive)
```

**Mixed types in set:**

```yaml
when:
  status:
    in: [active, pending, 1, true]
# Matches: "active", "pending", 1, true
# Does not match: "inactive", 0, false
```

**Single value (equivalent to exact match):**

```yaml
when:
  tier:
    in: [enterprise]
# Same as: tier: enterprise
```

#### Edge Cases

| Input | Condition | Result |
|-------|-----------|--------|
| `region: "US"` | `region: { in: [us, ca] }` | **No match** - case-sensitive |
| `region: null` | `region: { in: [us, null] }` | **Match** - null in set |
| Missing `region` field | `region: { in: [us] }` | **No match** - undefined ≠ null |

---

### Boolean Logic

Combine conditions with AND/OR logic.

#### All (AND)

Every condition in the list must match:

```yaml
when:
  all:
    - customer_tier: enterprise
    - quantity:
        gte: 100
    - region:
        in: [us, ca]
# All three must be true
```

#### Any (OR)

At least one condition must match:

```yaml
when:
  any:
    - customer_tier: vip
    - quantity:
        gte: 1000
    - has_coupon: true
# At least one must be true
```

#### Nested Logic

Combine `all` and `any` for complex conditions:

```yaml
when:
  all:
    - region:
        in: [us, ca]
    - any:
        - customer_tier: enterprise
        - all:
            - customer_tier: standard
            - quantity:
                gte: 500
```

This translates to:
```
(region IN [us, ca]) AND (
  (customer_tier = enterprise) OR
  (customer_tier = standard AND quantity >= 500)
)
```

#### Mixing Field Conditions with Boolean Logic

You can combine regular field conditions with `all`/`any`:

```yaml
when:
  is_active: true           # Must always be true
  all:                      # AND all of these
    - customer_tier: enterprise
    - quantity:
        gte: 100
```

---

### Empty Conditions

An empty `when` block matches everything. Use for catch-all/default rules:

```yaml
- id: default_pricing
  when: {}
  then:
    discount_percent: 0
```

**Always place catch-all rules last** - they will match any input.

---

## Outputs

The `then` block defines output values when the rule matches.

```yaml
then:
  discount_percent: 20
  free_shipping: true
  message: "Enterprise discount applied"
```

### Supported Output Types

| Type | Example |
|------|---------|
| String | `message: "Hello"` |
| Number | `discount: 20` |
| Boolean | `approved: true` |
| Null | `error: null` |
| Array | `tags: [premium, priority]` |
| Object | `metadata: { source: rule_engine }` |

### Output Naming Conventions

- Use `snake_case` for consistency with rule IDs
- Be explicit: `discount_percent` not `discount`
- Group related outputs: `shipping_free`, `shipping_method`

---

## Evaluation Order

**First match wins.** Rules are evaluated top-to-bottom; the first matching rule returns.

```yaml
rules:
  # Specific rules first
  - id: vip_discount
    when:
      customer_tier: vip
    then:
      discount_percent: 30

  # More general rules
  - id: enterprise_discount
    when:
      customer_tier: enterprise
    then:
      discount_percent: 20

  # Catch-all last
  - id: default
    when: {}
    then:
      discount_percent: 0
```

### Rule Ordering Strategy

1. **Most specific first**: Rules with more conditions or stricter criteria
2. **Higher priority first**: VIP before enterprise before standard
3. **Compound conditions first**: `all` conditions before single-field matches
4. **Catch-all last**: Empty `when: {}` always at the end

### Common Ordering Mistake

```yaml
# WRONG - catch-all matches everything, other rules never run
rules:
  - id: default
    when: {}
    then:
      discount_percent: 0

  - id: enterprise_discount  # Never reached!
    when:
      customer_tier: enterprise
    then:
      discount_percent: 20
```

---

## Edge Cases

### Missing Fields

If a condition references a field not in the input, the condition fails:

```yaml
when:
  customer_tier: enterprise  # Input lacks customer_tier
# Result: No match
```

### Extra Fields

Extra fields in input are ignored:

```yaml
when:
  customer_tier: enterprise

# Input: { customer_tier: "enterprise", region: "us", quantity: 100 }
# Result: Match (extra fields ignored)
```

### Null vs Missing

```yaml
# Matches explicit null
when:
  discount_code: null

# Input: { discount_code: null }  → Match
# Input: { }                       → No match (field missing)
```

### Empty String vs Missing

```yaml
when:
  coupon: ""

# Input: { coupon: "" }   → Match
# Input: { coupon: null } → No match
# Input: { }              → No match
```

### Case Sensitivity

All string comparisons are case-sensitive:

```yaml
when:
  region: us

# Input: { region: "us" } → Match
# Input: { region: "US" } → No match
# Input: { region: "Us" } → No match
```

### Floating Point Numbers

Comparisons work with floats:

```yaml
when:
  price:
    lte: 99.99

# Input: { price: 99.99 }  → Match
# Input: { price: 99.989 } → Match
# Input: { price: 100 }    → No match
```

### Boolean Strictness

Booleans must be actual booleans:

```yaml
when:
  is_active: true

# Input: { is_active: true }    → Match
# Input: { is_active: "true" }  → No match (string)
# Input: { is_active: 1 }       → No match (number)
```
