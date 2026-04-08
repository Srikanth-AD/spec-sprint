# SSO with Google and Microsoft

## Overview

Our SaaS app currently uses email + bcrypt-hashed passwords with
JWT-based session tokens. Enterprise customers have repeatedly asked
for SSO so they can manage user access through their existing identity
provider. We will add Google and Microsoft OAuth as our first SSO
options. SAML and Okta-specific connectors are out of scope for this
project.

## Current Auth

- Email + password (bcrypt, cost factor 12)
- JWT sessions, 24-hour expiry, refresh tokens stored in HTTP-only cookies
- Per-user MFA via TOTP (existing, unchanged)

## OAuth Flow

We will use the standard PKCE Authorization Code flow for both
Google and Microsoft. The flow:

1. User clicks "Sign in with Google" (or Microsoft) on the login page.
2. We redirect to the IdP authorization endpoint with PKCE challenge.
3. IdP redirects back to our callback with an authorization code.
4. We exchange the code (with verifier) for an ID token and access token.
5. We validate the ID token signature and claims.
6. We look up the user by email; create one if it doesn't exist.
7. We issue our standard JWT session.

## Account Linking

If a user signs in via SSO with an email that already exists in our
system as a password account, we should:

- Detect the conflict.
- Prompt the user: "An account with this email already exists.
  Sign in with your password to link your accounts."
- After successful password sign-in, link the SSO identity to the
  existing user record.
- On future SSO sign-ins, log them in directly.

Existing users who want to add SSO can do so from their account
settings page.

## Admin Controls

Org admins should be able to:

- Enable / disable SSO providers per organization.
- Force SSO for an organization (disables password sign-in for all
  members of that org).
- View an audit log of all auth events for their org.

## Session Handling

When a user signs in via SSO, our session expires when the IdP's
ID token expires (or after our default 24-hour limit, whichever
is shorter). On expiry, the user is prompted to re-authenticate
through their IdP.

## Security

All auth events must be written to an audit log:
- Successful sign-ins (with provider, IP, user agent)
- Failed sign-ins
- Account linking events
- Admin SSO config changes

## Out of Scope

- SAML 2.0
- Okta-specific connectors
- Custom IdP support
- SCIM provisioning
