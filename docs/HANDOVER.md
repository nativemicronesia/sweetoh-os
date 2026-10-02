# SweetOh Studio handover (2026-10-03)

Live: https://www.sweetohcreations.shop. Pushing to `master` deploys production (Vercel is connected to GitHub). CI (`.github/workflows/ci.yml`) runs typecheck, tests and a scoped lint on every push.

## What exists

**Studio editor** (`app/(partner)/partner/canvas/product-editor.tsx`, Fabric.js): standalone designs and product design, templates, 506 fonts, 73 text styles, 14 text effects and 8 text shapes, 40,000 icons and stickers, vector pen and point editing, shape combining, image-to-vector, photo looks, sticker borders, collage, quick mockups, exports (PNG, JPG, PDF, SVG), import from other tools with a report, autosave, print checks.

**Skink and the AI layer**: Skink (`lib/domains/skink`) knows the creator's other tools (Canva, Kittl, Picsart, Printify, Etsy, ChatGPT and more), plans multi-step goals that favor tools they already pay for, and keeps memory. The editor AI proposes edits through typed commands (`lib/studio/editor-commands.ts`, route `app/api/studio/editor-proposals`). Every Studio feature is a typed layer field plus a command, so the AI can drive it without special cases.

**Platform**: rate limits, health and status pages, client error reports, data export, security headers (see `docs/SECURITY.md`, `docs/STUDIO-SCALE.md`).

## Run and check

```
npm run typecheck      # types
npm test               # 175+ logic tests, no environment needed
STUDIO_LAB=1 npm run dev, then npm run e2e:studio     # 13 browser tests incl. WCAG
npm run db:check       # database has every table and column the code expects (needs DATABASE_URL)
node scripts/load-test.mjs icons-search   # local only; refuses production
```

`.env.example` lists the variables. Notable ones: `FOUNDATION_OWNER_EMAIL` (the only address that can use the owner email link), `CREATOR_SIGNUPS` (creator sign-up gate, currently closed), and `STUDIO_LAB` (test route; leave unset in production).

## Keeping it healthy

- **Skink's tool knowledge expires on purpose.** `lib/domains/skink/tool-knowledge.ts` has `reviewBy` dates; a test fails after them so someone re-checks the guidance. Update the date after a review.
- **Icon index**: after changing icon packages run `npx tsx scripts/build-icon-index.ts` (a test fails when it is stale).
- **Dependencies**: run `npm audit --omit=dev` monthly. Fabric stays on 6.x until a deliberate 7.x pass (see SECURITY.md).
- **Adding a server action**: it must check the caller, or be added to the public list in `scripts/action-security.test.ts` with a rate limit.

## Decisions still open (need an owner)

1. Terms and privacy wording (`docs/DATA-INVENTORY.md` has the facts).
2. Account deletion: auth user, stored files and billing cancellation.
3. Emailed confirmation before opening creator sign-ups.
4. Content-Security-Policy and a Vercel Firewall rate-limit rule.
5. Run `npm run db:check` against production (migrations 0030 to 0033 were never confirmed).

## Not built yet

- Apply one design to many product drafts at once (the save-as-product pipeline is rendered in the browser; build it with a signed-in test).
- Pagination on `/studio/designs`, `/partner/library` and `/partner/list`.
- The collage lives under the partner area; creators do not have it yet.
- Signed-in flows (save and reopen, apply to a product, vector-art action, a real file import through storage) are covered by unit tests of their logic but have not had a recorded end-to-end run.

## Working agreements that avoided breakage

- Several sessions can edit this repo at once. Never `git commit -a`. Before adding a shared file, read `git diff <file>` and keep other people's hunks out. Verify in a clean `git worktree add /tmp/x HEAD` before pushing.
- Uncommitted work from another session (POD and Island Sprouts integration under `lib/integrations/pod`, `app/api/v1`, `drizzle/0025` to `0029`) is not part of this handover.
