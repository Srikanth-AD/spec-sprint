# Guest Checkout

## Overview

Our e-commerce platform currently requires every shopper to create an
account before they can complete a purchase. Analytics show ~38% of
shoppers abandon their cart at the registration step. Product wants
us to introduce a guest checkout path that lets users complete a
purchase without creating an account, while preserving our existing
account-based flow for returning customers.

The goal: reduce checkout abandonment by 20% within one quarter of
launch.

## User Flow

1. Shopper browses the catalog and adds items to cart (existing flow,
   no changes).
2. Shopper opens cart and clicks "Checkout".
3. Checkout entry page offers two paths:
   - "Sign in" (existing)
   - "Continue as guest" (new — primary CTA)
4. Guest provides email, shipping address, and payment.
5. Order is placed; confirmation page shows order number.
6. Confirmation email is sent immediately, followed by a tracking
   email when the order ships.

## Payment

Payments go through Stripe via Stripe Elements. We never store full
card numbers — only the last 4 digits and expiry, plus the Stripe
payment method ID. The integration must be PCI DSS compliant; rely
on Stripe-hosted fields, do not pass raw PAN through our servers.

Failed payments should allow up to 3 retries on the same checkout
session before the cart is reset. After a successful payment but
before order creation, we capture the payment intent so funds are
held immediately.

## Email

- Order confirmation email: sent within 30 seconds of order creation.
  Includes order number, line items, total, shipping address, and
  estimated delivery window.
- Shipping notification: sent when the order ships, includes carrier
  tracking link.
- Both emails should render correctly in Gmail, Outlook, and Apple Mail.

## Mobile

The guest checkout flow must work on iOS Safari and Android Chrome
mobile browsers. Touch targets must be at least 44px. The payment
form should support Apple Pay and Google Pay where available.

## Edge Cases

- Cart timeout: a guest cart should expire after 30 minutes of
  inactivity. Show a clear message and let the shopper restart.
- Failed payment: clear error messaging, do not reset the cart on
  the first failure.
- Address validation: validate against a postal API; show inline
  errors for invalid postcodes.
- Duplicate orders: idempotency key on the order creation endpoint
  prevents double-charges if the user hits "Place Order" twice.

## Out of Scope

- Loyalty points (guests do not earn points)
- Saved addresses (no account = no saved data)
- Order history page for guests (one-shot tracking link only)
- International shipping (US only for v1)

## Non-Functional Requirements

- Checkout pages must load in under 2 seconds (LCP) on a 4G connection.
- PCI DSS compliant — no raw card data on our servers.
- Order creation endpoint must be idempotent.
- All payment events must be logged for audit (without storing PAN).

## Success Metric

Reduce checkout abandonment rate by 20% in the first quarter after launch,
measured as `cart_started → order_placed` conversion in our analytics.
