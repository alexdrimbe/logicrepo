# Real-World Examples

This document provides complete examples of business logic rules for common domains.

## Table of Contents

- [Pricing & Discounts](#pricing--discounts)
- [Access Control](#access-control)
- [Feature Flags](#feature-flags)
- [Order Validation](#order-validation)
- [Shipping Rules](#shipping-rules)
- [Subscription Tiers](#subscription-tiers)

---

## Pricing & Discounts

Calculate discounts based on customer attributes and order characteristics.

### Rules: `logic/rules/pricing.yaml`

```yaml
version: 1
rules:
  # === VIP Tier (Highest Priority) ===

  - id: vip_holiday_special
    description: "VIP customers get 40% off during holidays"
    when:
      all:
        - customer_tier: vip
        - is_holiday_period: true
    then:
      discount_percent: 40
      discount_reason: "VIP Holiday Special"

  - id: vip_standard
    description: "VIP customers always get 30% off"
    when:
      customer_tier: vip
    then:
      discount_percent: 30
      discount_reason: "VIP Discount"

  # === Enterprise Tier ===

  - id: enterprise_bulk
    description: "Enterprise + bulk order = 25% off"
    when:
      all:
        - customer_tier: enterprise
        - quantity:
            gte: 100
    then:
      discount_percent: 25
      discount_reason: "Enterprise Bulk Discount"

  - id: enterprise_standard
    description: "Enterprise customers get 20% off"
    when:
      customer_tier: enterprise
    then:
      discount_percent: 20
      discount_reason: "Enterprise Discount"

  # === Promotional Discounts ===

  - id: bulk_discount
    description: "Large orders get 10% off"
    when:
      quantity:
        gte: 100
    then:
      discount_percent: 10
      discount_reason: "Bulk Order Discount"

  - id: first_order_discount
    description: "First-time customers get 15% off"
    when:
      is_first_order: true
    then:
      discount_percent: 15
      discount_reason: "Welcome Discount"

  # === Default ===

  - id: no_discount
    description: "Standard pricing"
    when: {}
    then:
      discount_percent: 0
      discount_reason: null
```

### Tests: `logic/tests/pricing_tests.yaml`

```yaml
version: 1
tests:
  # VIP tests
  - name: VIP during holiday gets 40%
    input:
      customer_tier: vip
      is_holiday_period: true
      quantity: 10
    expect:
      discount_percent: 40
      matched_rule: vip_holiday_special

  - name: VIP outside holiday gets 30%
    input:
      customer_tier: vip
      is_holiday_period: false
      quantity: 10
    expect:
      discount_percent: 30
      matched_rule: vip_standard

  - name: VIP beats bulk discount
    input:
      customer_tier: vip
      quantity: 500
    expect:
      discount_percent: 30
      matched_rule: vip_standard

  # Enterprise tests
  - name: enterprise bulk order
    input:
      customer_tier: enterprise
      quantity: 100
    expect:
      discount_percent: 25
      matched_rule: enterprise_bulk

  - name: enterprise small order
    input:
      customer_tier: enterprise
      quantity: 50
    expect:
      discount_percent: 20
      matched_rule: enterprise_standard

  # Promotional tests
  - name: first order discount
    input:
      customer_tier: standard
      is_first_order: true
      quantity: 5
    expect:
      discount_percent: 15
      matched_rule: first_order_discount

  - name: bulk beats first order (check ordering)
    input:
      customer_tier: standard
      is_first_order: true
      quantity: 100
    expect:
      discount_percent: 10
      matched_rule: bulk_discount

  # Default
  - name: standard customer small order
    input:
      customer_tier: standard
      quantity: 10
    expect:
      discount_percent: 0
      matched_rule: no_discount
```

---

## Access Control

Determine user permissions based on roles and context.

### Rules: `logic/rules/access.yaml`

```yaml
version: 1
rules:
  # === Blocked States (Highest Priority) ===

  - id: suspended_user
    description: "Suspended users have no access"
    when:
      account_status: suspended
    then:
      access_granted: false
      reason: "Account suspended"
      can_appeal: true

  - id: unverified_email
    description: "Unverified users have limited access"
    when:
      email_verified: false
    then:
      access_granted: false
      reason: "Email verification required"
      can_appeal: false

  # === Admin Access ===

  - id: super_admin
    description: "Super admins have full access"
    when:
      role: super_admin
    then:
      access_granted: true
      access_level: full
      can_modify_settings: true
      can_delete_users: true

  - id: admin
    description: "Admins have elevated access"
    when:
      role: admin
    then:
      access_granted: true
      access_level: elevated
      can_modify_settings: true
      can_delete_users: false

  # === Resource-Specific Access ===

  - id: owner_access
    description: "Resource owners have full access to their resources"
    when:
      is_resource_owner: true
    then:
      access_granted: true
      access_level: full
      can_modify_settings: true
      can_delete_users: false

  - id: team_member_access
    description: "Team members have read/write access"
    when:
      is_team_member: true
    then:
      access_granted: true
      access_level: standard
      can_modify_settings: false
      can_delete_users: false

  # === Public Access ===

  - id: public_resource
    description: "Public resources are readable by anyone"
    when:
      resource_visibility: public
    then:
      access_granted: true
      access_level: read_only
      can_modify_settings: false
      can_delete_users: false

  # === Default: Deny ===

  - id: default_deny
    description: "Deny access by default"
    when: {}
    then:
      access_granted: false
      reason: "Access denied"
      can_appeal: false
```

### Tests: `logic/tests/access_tests.yaml`

```yaml
version: 1
tests:
  # Blocked states
  - name: suspended user denied
    input:
      role: admin
      account_status: suspended
      email_verified: true
    expect:
      access_granted: false
      reason: "Account suspended"
      matched_rule: suspended_user

  - name: unverified user denied
    input:
      role: user
      account_status: active
      email_verified: false
    expect:
      access_granted: false
      matched_rule: unverified_email

  # Admin access
  - name: super admin full access
    input:
      role: super_admin
      account_status: active
      email_verified: true
    expect:
      access_granted: true
      access_level: full
      can_delete_users: true
      matched_rule: super_admin

  - name: admin elevated access
    input:
      role: admin
      account_status: active
      email_verified: true
    expect:
      access_granted: true
      can_delete_users: false
      matched_rule: admin

  # Resource access
  - name: owner can access their resource
    input:
      role: user
      account_status: active
      email_verified: true
      is_resource_owner: true
    expect:
      access_granted: true
      access_level: full
      matched_rule: owner_access

  - name: team member standard access
    input:
      role: user
      account_status: active
      email_verified: true
      is_team_member: true
    expect:
      access_granted: true
      access_level: standard
      matched_rule: team_member_access

  # Default deny
  - name: random user denied
    input:
      role: user
      account_status: active
      email_verified: true
      is_resource_owner: false
      is_team_member: false
      resource_visibility: private
    expect:
      access_granted: false
      matched_rule: default_deny
```

---

## Feature Flags

Control feature availability based on user segments.

### Rules: `logic/rules/features.yaml`

```yaml
version: 1
rules:
  # === Kill Switch (Highest Priority) ===

  - id: feature_killed
    description: "Feature is completely disabled"
    when:
      feature_kill_switch: true
    then:
      enabled: false
      reason: "Feature disabled globally"

  # === Beta Access ===

  - id: internal_beta
    description: "Internal users always get beta features"
    when:
      is_internal_user: true
    then:
      enabled: true
      variant: beta
      reason: "Internal user"

  - id: beta_opted_in
    description: "Users who opted into beta"
    when:
      beta_opt_in: true
    then:
      enabled: true
      variant: beta
      reason: "Beta opt-in"

  # === Percentage Rollout ===

  - id: rollout_90_percent
    description: "90% rollout based on user bucket"
    when:
      user_bucket:
        lt: 90
    then:
      enabled: true
      variant: stable
      reason: "Gradual rollout"

  # === Default: Disabled ===

  - id: feature_disabled
    description: "Feature not available"
    when: {}
    then:
      enabled: false
      variant: null
      reason: "Not in rollout"
```

### Tests: `logic/tests/features_tests.yaml`

```yaml
version: 1
tests:
  - name: kill switch overrides everything
    input:
      feature_kill_switch: true
      is_internal_user: true
      user_bucket: 5
    expect:
      enabled: false
      matched_rule: feature_killed

  - name: internal user gets beta
    input:
      is_internal_user: true
      user_bucket: 95
    expect:
      enabled: true
      variant: beta
      matched_rule: internal_beta

  - name: beta opt-in user
    input:
      beta_opt_in: true
      user_bucket: 95
    expect:
      enabled: true
      variant: beta
      matched_rule: beta_opted_in

  - name: user in rollout bucket
    input:
      user_bucket: 50
    expect:
      enabled: true
      variant: stable
      matched_rule: rollout_90_percent

  - name: user outside rollout
    input:
      user_bucket: 95
    expect:
      enabled: false
      matched_rule: feature_disabled
```

---

## Order Validation

Validate orders before processing.

### Rules: `logic/rules/order-validation.yaml`

```yaml
version: 1
rules:
  # === Hard Blocks ===

  - id: empty_cart
    description: "Reject empty orders"
    when:
      item_count:
        lte: 0
    then:
      valid: false
      error_code: EMPTY_CART
      error_message: "Your cart is empty"

  - id: exceeds_max_quantity
    description: "Reject orders over maximum quantity"
    when:
      total_quantity:
        gt: 1000
    then:
      valid: false
      error_code: QUANTITY_EXCEEDED
      error_message: "Maximum 1000 items per order"

  - id: below_minimum_order
    description: "Reject orders below minimum value"
    when:
      order_total:
        lt: 10
    then:
      valid: false
      error_code: BELOW_MINIMUM
      error_message: "Minimum order value is $10"

  # === Warnings (Valid but flagged) ===

  - id: high_value_order
    description: "Flag high-value orders for review"
    when:
      order_total:
        gte: 5000
    then:
      valid: true
      requires_review: true
      review_reason: "High value order"

  - id: bulk_order
    description: "Flag bulk orders"
    when:
      total_quantity:
        gte: 100
    then:
      valid: true
      requires_review: true
      review_reason: "Bulk order"

  # === Valid Orders ===

  - id: standard_order
    description: "Standard valid order"
    when: {}
    then:
      valid: true
      requires_review: false
      review_reason: null
```

### Tests: `logic/tests/order-validation_tests.yaml`

```yaml
version: 1
tests:
  # Hard blocks
  - name: reject empty cart
    input:
      item_count: 0
      total_quantity: 0
      order_total: 0
    expect:
      valid: false
      error_code: EMPTY_CART
      matched_rule: empty_cart

  - name: reject excessive quantity
    input:
      item_count: 5
      total_quantity: 1001
      order_total: 5000
    expect:
      valid: false
      error_code: QUANTITY_EXCEEDED
      matched_rule: exceeds_max_quantity

  - name: reject below minimum
    input:
      item_count: 1
      total_quantity: 1
      order_total: 5
    expect:
      valid: false
      error_code: BELOW_MINIMUM
      matched_rule: below_minimum_order

  # Warnings
  - name: high value flagged for review
    input:
      item_count: 10
      total_quantity: 10
      order_total: 7500
    expect:
      valid: true
      requires_review: true
      matched_rule: high_value_order

  - name: bulk order flagged
    input:
      item_count: 2
      total_quantity: 150
      order_total: 300
    expect:
      valid: true
      requires_review: true
      matched_rule: bulk_order

  # Standard
  - name: normal order passes
    input:
      item_count: 3
      total_quantity: 5
      order_total: 75
    expect:
      valid: true
      requires_review: false
      matched_rule: standard_order
```

---

## Shipping Rules

Determine shipping options and costs.

### Rules: `logic/rules/shipping.yaml`

```yaml
version: 1
rules:
  # === Restrictions ===

  - id: no_shipping_to_po_box
    description: "Cannot ship large items to PO boxes"
    when:
      all:
        - is_po_box: true
        - has_oversized_item: true
    then:
      can_ship: false
      error: "Oversized items cannot ship to PO boxes"

  - id: international_restriction
    description: "Some items cannot ship internationally"
    when:
      all:
        - is_domestic: false
        - has_restricted_item: true
    then:
      can_ship: false
      error: "Some items in your cart cannot ship internationally"

  # === Free Shipping Tiers ===

  - id: prime_free_shipping
    description: "Prime members get free 2-day shipping"
    when:
      membership: prime
    then:
      can_ship: true
      shipping_cost: 0
      shipping_days: 2
      shipping_method: express

  - id: free_shipping_threshold
    description: "Free shipping on orders over $75"
    when:
      order_total:
        gte: 75
    then:
      can_ship: true
      shipping_cost: 0
      shipping_days: 5
      shipping_method: standard

  # === Paid Shipping ===

  - id: express_shipping
    description: "Express shipping option"
    when:
      shipping_preference: express
    then:
      can_ship: true
      shipping_cost: 14.99
      shipping_days: 2
      shipping_method: express

  - id: standard_shipping
    description: "Standard shipping"
    when: {}
    then:
      can_ship: true
      shipping_cost: 5.99
      shipping_days: 5
      shipping_method: standard
```

---

## Subscription Tiers

Determine features available at each subscription level.

### Rules: `logic/rules/subscriptions.yaml`

```yaml
version: 1
rules:
  # === Trial ===

  - id: trial_expired
    description: "Expired trials get no access"
    when:
      all:
        - plan: trial
        - trial_expired: true
    then:
      has_access: false
      max_projects: 0
      max_team_members: 0
      features: []

  - id: active_trial
    description: "Active trial limits"
    when:
      plan: trial
    then:
      has_access: true
      max_projects: 1
      max_team_members: 1
      features: [basic_analytics]

  # === Paid Plans ===

  - id: enterprise_plan
    description: "Enterprise plan - unlimited"
    when:
      plan: enterprise
    then:
      has_access: true
      max_projects: -1  # unlimited
      max_team_members: -1
      features: [basic_analytics, advanced_analytics, api_access, sso, audit_log, priority_support]

  - id: pro_plan
    description: "Pro plan"
    when:
      plan: pro
    then:
      has_access: true
      max_projects: 50
      max_team_members: 25
      features: [basic_analytics, advanced_analytics, api_access]

  - id: starter_plan
    description: "Starter plan"
    when:
      plan: starter
    then:
      has_access: true
      max_projects: 5
      max_team_members: 3
      features: [basic_analytics]

  # === No Plan ===

  - id: no_subscription
    description: "No active subscription"
    when: {}
    then:
      has_access: false
      max_projects: 0
      max_team_members: 0
      features: []
```
