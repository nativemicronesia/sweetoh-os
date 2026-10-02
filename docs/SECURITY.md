# Security notes (reviewed 2026-10-03)

## What is enforced and tested

- **Every server action is a public endpoint.** `scripts/action-security.test.ts` fails if an action neither checks the caller nor is on the short list of intentionally public actions, and fails if a public sign-in, sign-up, emailed-link or checkout action lacks a rate limit (`lib/shared/action-limit.ts`).
- **No password sign-in for the owner.** The owner signs in by an emailed link gated to `FOUNDATION_OWNER_EMAIL`; the old password action was removed. Link requests past the limit answer the same way and send nothing, so the inbox cannot be flooded and nothing leaks.
- **Imported SVGs** (`lib/studio/artwork-import.ts`) are refused, never cleaned, if they contain scripts, event handlers, external links, entities, embedded documents or animation. Files go straight to storage and are re-encoded as PNG.
- **Public APIs** are rate limited per instance (icons, error reports), validated, and bounded in size. The auth middleware skips public static-like routes.
- **Headers** on every response: nosniff, frame-ancestors via X-Frame-Options, referrer policy, permissions policy (microphone only), HSTS.
- **Data export** is scoped to the caller, rate limited, and excludes secrets and payment identifiers.
- **Secrets**: no key patterns in tracked files (scanned 2026-10-03). Printify tokens are stored encrypted.

## Dependencies (npm audit, production)

Upgraded 2026-10-03: Next 16.2.9 to 16.3.8 (middleware and proxy bypass advisories), drizzle-orm to 0.45.3 (identifier escaping), sharp to 0.35.5 (libvips CVEs), and patch updates for nanoid, qs and postcss.

Accepted for now, with reasons:

- **fabric 6.9.1** (advisories: stored XSS via Fabric's SVG export, gradient color-stop escaping). Studio never calls Fabric's `toSVG`; its SVG export is hand-built from shape and path data. Fabric 7 is a major upgrade and needs its own pass.
- **canvas, tar, @mapbox/node-pre-gyp** (via Fabric's optional node canvas): install-time tooling, not reachable from a request.

Re-run `npm audit --omit=dev` monthly.

## Known gaps and decisions needed

1. **No Content-Security-Policy yet.** It needs a nonce pass over Next's inline scripts, Stripe and Supabase before it can be enabled without breaking pages.
2. **Creator sign-up confirms the email automatically** (`email_confirm: true`), so someone could register an address they do not own and set its password. Sign-ups are closed (`CREATOR_SIGNUPS`); add an emailed confirmation before opening them.
3. **Rate limits are per server instance.** Add Vercel Firewall rate-limit rules for the sign-in, sign-up and icon paths for a hard global cap.
4. **Account deletion** is not built. The database cascades from the user row, but deleting an account also means removing the auth user, the stored files, and cancelling billing; those need your decisions (retention, refunds) first.
5. **Production schema** has not been confirmed against the code: run `npm run db:check`.
