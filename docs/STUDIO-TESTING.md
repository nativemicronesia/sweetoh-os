# Studio testing and checks

| What | Command | Needs |
| --- | --- | --- |
| Types | `npm run typecheck` | nothing |
| Unit and logic tests (153+) | `npm test` | nothing |
| Browser tests of the real editor | `STUDIO_LAB=1 npm run dev`, then `npm run e2e:studio` | Chrome |
| Database matches the code | `npm run db:check` | `DATABASE_URL` (reads table and column names only) |

`/studio-lab` is a logged-out editor used only by the browser tests (`?photo=1` starts with a photo-like cutout layer; `/studio-lab/collage` is the collage page). It is a 404 unless `STUDIO_LAB=1`, so it never exists in production.

CI (`.github/workflows/ci.yml`) runs typecheck, tests and a scoped lint on every push. Lint is scoped to Studio, Skink and scripts because older files elsewhere still have React-hooks lint errors.

The browser tests cover text effects, text shapes, icons, the pen tool and point editing, combining shapes (including shapes whose edges touch exactly, which used to hang paper.js), SVG export, quick mockups, sticker borders, photo looks, the photo-to-product hop, the collage page, WCAG checks, and surviving a reload through autosave.

## What still needs a signed-in check

Saving to the library, reopening a saved design, applying a design to a product, the Make vector art action, and importing a file through the signed upload (the logic is unit-tested; the storage round trip is not).

## Importing artwork

Files go straight to storage on a signed URL (a server action body is capped at a few MB on Vercel), then `finishArtworkImportAction` runs `lib/studio/artwork-import.ts`: SVG is sanitized (anything with scripts, handlers, external links or entities is refused) and drawn at print size on a transparent background; photos are rotated upright and capped at 6000 px; the creator gets a plain-language report (solid background, low resolution, reduced size).
