# Best Practices

Guidelines for writing maintainable, testable, and correct business logic rules.

## Table of Contents

- [Rule Organization](#rule-organization)
- [Naming Conventions](#naming-conventions)
- [Rule Ordering](#rule-ordering)
- [Writing Conditions](#writing-conditions)
- [Testing Strategies](#testing-strategies)
- [Common Mistakes](#common-mistakes)
- [Code Review Checklist](#code-review-checklist)

---

## Rule Organization

### One Domain Per File

Keep related rules together in a single file:

```
logic/rules/
├── pricing.yaml        # All pricing/discount rules
├── shipping.yaml       # Shipping cost and method rules
├── access.yaml         # Permission and access control
└── validation.yaml     # Order/input validation
```

**Don't:**
```
logic/rules/
├── rules.yaml          # Everything in one file
├── misc.yaml           # Unclear purpose
└── rules_v2.yaml       # Version in filename
```

### Use Comments to Group Rules

```yaml
version: 1
rules:
  # === High Priority: VIP Customers ===

  - id: vip_discount
    # ...

  - id: vip_free_shipping
    # ...

  # === Medium Priority: Enterprise ===

  - id: enterprise_discount
    # ...

  # === Default Rules ===

  - id: standard_pricing
    # ...
```

### Keep Files Focused

If a file has more than 15-20 rules, consider splitting it:

```yaml
# Before: pricing.yaml with 30 rules

# After:
# pricing-discounts.yaml - discount calculation rules
# pricing-taxes.yaml - tax calculation rules
# pricing-promotions.yaml - promotional pricing
```

---

## Naming Conventions

### Rule IDs

Use `snake_case` with descriptive names:

```yaml
# Good
- id: enterprise_bulk_discount
- id: free_shipping_over_100
- id: blocked_region_access_denied

# Bad
- id: rule1
- id: discount
- id: enterpriseBulkDiscount
- id: ENTERPRISE_DISCOUNT
```

### Use Prefixes for Related Rules

```yaml
# Group related rules with prefixes
- id: shipping_free_threshold
- id: shipping_express_member
- id: shipping_standard_rate

- id: access_admin_full
- id: access_user_limited
- id: access_guest_readonly
```

### Descriptions

Write descriptions that explain **when** the rule applies, not **what** it does:

```yaml
# Good - explains the business condition
description: "VIP customers during holiday season"
description: "First-time orders under $50"
description: "Enterprise accounts with annual contracts"

# Bad - just restates the output
description: "Applies 20% discount"
description: "Sets shipping to free"
description: "Returns access granted true"
```

---

## Rule Ordering

### The Golden Rule

**First match wins.** Order rules from most specific to least specific.

### Ordering Strategy

1. **Blocking/error conditions first**
2. **Most specific combinations**
3. **Single high-priority conditions**
4. **General conditions**
5. **Catch-all/default last**

```yaml
rules:
  # 1. Blocking conditions
  - id: blocked_user
    when:
      is_blocked: true
    then:
      access: denied

  # 2. Specific combinations
  - id: vip_bulk_holiday
    when:
      all:
        - customer_tier: vip
        - quantity: { gte: 100 }
        - is_holiday: true
    then:
      discount: 50

  # 3. High-priority single conditions
  - id: vip_standard
    when:
      customer_tier: vip
    then:
      discount: 30

  # 4. General conditions
  - id: bulk_discount
    when:
      quantity: { gte: 100 }
    then:
      discount: 10

  # 5. Default
  - id: no_discount
    when: {}
    then:
      discount: 0
```

### Verify Ordering with Tests

Always test that higher-priority rules beat lower-priority ones:

```yaml
tests:
  - name: VIP beats bulk discount
    input:
      customer_tier: vip
      quantity: 500
    expect:
      matched_rule: vip_standard  # Not bulk_discount
```

---

## Writing Conditions

### Be Explicit

Don't rely on implicit behavior. State all required conditions:

```yaml
# Good - explicit about all requirements
when:
  all:
    - customer_tier: enterprise
    - account_status: active
    - email_verified: true

# Bad - assumes other fields don't matter
when:
  customer_tier: enterprise
```

### Use `all` for Multiple Required Conditions

```yaml
# Good - clear that all are required
when:
  all:
    - region: { in: [us, ca] }
    - order_total: { gte: 100 }
    - is_member: true

# Acceptable - implicit AND for simple cases
when:
  customer_tier: enterprise
  is_active: true
```

### Prefer Positive Conditions

```yaml
# Good - check for the positive case
when:
  is_verified: true

# Avoid - double negatives are confusing
when:
  is_not_unverified: true
```

### Avoid Overlapping Conditions

Rules with overlapping conditions make ordering tricky:

```yaml
# Problem: These overlap - order determines which wins
- id: large_order
  when:
    quantity: { gte: 50 }

- id: bulk_order
  when:
    quantity: { gte: 100 }

# Solution: Make ranges explicit
- id: bulk_order
  when:
    quantity: { gte: 100 }

- id: large_order
  when:
    quantity:
      gte: 50
      lt: 100
```

---

## Testing Strategies

### Test Every Rule

Each rule should have at least one test that matches it:

```yaml
# For each rule ID, have a test with:
expect:
  matched_rule: <that_rule_id>
```

### Test Boundaries

For numeric comparisons, test at and around the boundary:

```yaml
# Rule: quantity >= 100
tests:
  - name: at boundary (100)
    input: { quantity: 100 }
    expect: { matched_rule: bulk_rule }

  - name: just below boundary (99)
    input: { quantity: 99 }
    expect: { matched_rule: standard_rule }

  - name: above boundary (150)
    input: { quantity: 150 }
    expect: { matched_rule: bulk_rule }
```

### Test Rule Priority

Verify that higher-priority rules are matched when multiple could apply:

```yaml
tests:
  - name: VIP status beats bulk discount
    input:
      customer_tier: vip
      quantity: 200  # Would match bulk_discount too
    expect:
      matched_rule: vip_discount  # VIP should win

  - name: enterprise beats bulk
    input:
      customer_tier: enterprise
      quantity: 200
    expect:
      matched_rule: enterprise_discount
```

### Test the Default/Catch-All

Ensure the default rule catches unmatched cases:

```yaml
tests:
  - name: unknown tier falls through to default
    input:
      customer_tier: unknown_tier
      quantity: 5
    expect:
      matched_rule: default_pricing
```

### Test Edge Cases

```yaml
tests:
  # Missing fields
  - name: missing optional field
    input:
      customer_tier: standard
      # quantity not provided
    expect:
      matched_rule: default_rule

  # Null values
  - name: explicit null value
    input:
      discount_code: null
    expect:
      matched_rule: no_discount_code

  # Empty strings
  - name: empty string is not null
    input:
      coupon: ""
    expect:
      matched_rule: invalid_coupon
```

---

## Common Mistakes

### Mistake 1: Catch-All Too Early

```yaml
# WRONG - default matches everything, other rules never run
rules:
  - id: default
    when: {}
    then: { discount: 0 }

  - id: vip_discount  # Never reached!
    when: { customer_tier: vip }
    then: { discount: 30 }
```

**Fix:** Always put catch-all rules last.

### Mistake 2: Type Mismatches

```yaml
# WRONG - comparing string to number
when:
  quantity: "100"  # String, not number

# Input: { quantity: 100 }  # Number
# Result: No match!
```

**Fix:** Match types exactly. Use numbers for numbers, strings for strings.

### Mistake 3: Forgetting Case Sensitivity

```yaml
# Rule expects lowercase
when:
  region: us

# Input: { region: "US" }
# Result: No match!
```

**Fix:** Normalize data before evaluation, or use `in` with variants:

```yaml
when:
  region:
    in: [us, US, Us]
```

### Mistake 4: Overly Broad Conditions

```yaml
# WRONG - matches any order over $50, even from blocked users
- id: free_shipping
  when:
    order_total: { gte: 50 }
  then:
    shipping: free

# A blocked user with $100 order gets free shipping!
```

**Fix:** Add necessary conditions or ensure blocking rules come first:

```yaml
- id: blocked_user
  when:
    is_blocked: true
  then:
    error: "Account blocked"

- id: free_shipping
  when:
    order_total: { gte: 50 }
  then:
    shipping: free
```

### Mistake 5: Missing Default Rule

```yaml
rules:
  - id: enterprise
    when: { tier: enterprise }
    then: { discount: 20 }

  - id: pro
    when: { tier: pro }
    then: { discount: 10 }

  # No default! What happens for tier: "starter"?
  # Result: { matched_rule: null, output: {} }
```

**Fix:** Always include a catch-all default:

```yaml
  - id: default
    when: {}
    then: { discount: 0 }
```

### Mistake 6: Inconsistent Output Fields

```yaml
# WRONG - different rules return different fields
- id: vip
  when: { tier: vip }
  then:
    discount_percent: 30

- id: default
  when: {}
  then:
    discount: 0  # Different field name!
```

**Fix:** Use consistent field names across all rules:

```yaml
- id: vip
  then:
    discount_percent: 30

- id: default
  then:
    discount_percent: 0
```

---

## Code Review Checklist

When reviewing PR changes to logic rules:

### Structure
- [ ] File is in correct location (`/logic/rules/` or `/logic/tests/`)
- [ ] `version: 1` header present
- [ ] Rule IDs are unique across all files
- [ ] Rule IDs use `snake_case`

### Ordering
- [ ] New rules inserted at correct priority level
- [ ] Catch-all/default rules are last
- [ ] No rules are unreachable (shadowed by earlier rules)

### Conditions
- [ ] Conditions use correct types (string/number/boolean)
- [ ] Comparison operators used correctly (`gte` not `>=`)
- [ ] No overlapping conditions without clear priority

### Tests
- [ ] New rules have corresponding tests
- [ ] Tests verify `matched_rule` for clarity
- [ ] Boundary conditions tested
- [ ] Priority/ordering tests included
- [ ] Existing tests still pass

### Outputs
- [ ] Output field names are consistent
- [ ] All rules produce the same output fields
- [ ] No typos in output values

### Descriptions
- [ ] Rules have descriptions explaining the business case
- [ ] Descriptions explain "when", not "what"
