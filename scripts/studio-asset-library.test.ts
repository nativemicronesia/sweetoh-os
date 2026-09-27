import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import sharp from "sharp";
import { productPrintAreaFromStudio, studioLayoutSchema, studioMatchesProductPrintArea } from "../lib/domains/catalog/studio-layout";
import { studioProductArtworkIssue } from "../lib/domains/catalog/studio-product-artwork";
import type { CreativeLibraryAsset } from "../lib/domains/library/model";
import { prepareStudioTemplateCopy } from "../lib/domains/catalog/studio-template-copy";
import { STUDIO_ASSETS, studioAsset, studioAssetUrl } from "../lib/studio/asset-library";
import { STUDIO_FONT_PROVENANCE, resolveStudioFontKey } from "../lib/studio/font-provenance";
import { buildStudioEditorState, findStudioAssets, studioAssetSearchSchema, studioEditorCommandSchema, studioEditorProposalSchema } from "../lib/studio/editor-commands";
import { reorderLayers } from "../lib/studio/layer-order";
import { mockupTemplateSchema } from "../lib/studio/mockup/templates";
import { CONFIRMED_SHOP_METHODS, KNOWLEDGE_ONLY_METHODS } from "../lib/domains/production/methods";
import { drawingDashPattern, STUDIO_DRAW_BRUSHES } from "../lib/studio/drawing-brushes";
import { compactPressureSamples, pointerPressure, pressureSegment } from "../lib/studio/drawing-pressure";
import { STUDIO_DRAW_TEXTURES, studioBrushPresetSchema } from "../lib/studio/drawing-brushes";

test("seed graphics have stable unique identities and explicit provenance", () => {
  assert.ok(STUDIO_ASSETS.length >= 10);
  assert.equal(new Set(STUDIO_ASSETS.map((asset) => asset.id)).size, STUDIO_ASSETS.length);
  for (const asset of STUDIO_ASSETS) {
    assert.ok(asset.name && asset.category && asset.license && asset.source);
    assert.match(asset.svg, /^(?:<\?xml[^>]*>\s*)?<svg(?:\s|>)/);
    assert.match(asset.svg, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.equal(studioAsset(asset.id), asset);
    assert.ok(studioAssetUrl(asset).startsWith("data:image/svg+xml"));
  }
});

test("curated Tabler assets keep upstream provenance and commercial-use evidence searchable", () => {
  const tabler = STUDIO_ASSETS.filter((asset) => asset.id.startsWith("tabler-"));
  assert.equal(tabler.length, 112);
  for (const asset of tabler) {
    assert.equal(asset.licenseId, "MIT");
    assert.match(asset.sourceUrl ?? "", /github\.com\/tabler\/tabler-icons\/blob\/[0-9a-f]{40}\/icons\/outline\//);
    assert.match(asset.evidenceUrl ?? "", /github\.com\/tabler\/tabler-icons\/blob\/[0-9a-f]{40}\/LICENSE/);
    assert.equal(asset.commercialUse, true);
    assert.equal(asset.modificationAllowed, true);
    assert.equal(asset.redistributionAllowed, true);
    assert.equal(asset.attributionRequired, true);
    assert.match(asset.attributionText ?? "", /Copyright \(c\) 2020-2026 Paweł Kuna/);
    assert.equal(studioEditorCommandSchema.safeParse({ type: "add_graphic", assetKey: asset.id }).success, true);
  }
  const result = findStudioAssets({ query: "butterfly", kind: "element", limit: 10 });
  assert.equal(result[0]?.id, "tabler-butterfly-v1");
  assert.equal(result[0]?.sourceKind, "approved_internal");
  assert.equal(result[0]?.licenseId, "MIT");
  assert.equal(result[0]?.commercialUse, true);
  assert.ok(findStudioAssets({ query: "ocean", kind: "element", limit: 50 }).some((asset) => asset.id === "tabler-beach-v1"));
  assert.ok(findStudioAssets({ query: "engraving", kind: "pattern", limit: 50 }).some((asset) => asset.id === "so-engraver-hatch-v1"));
  assert.ok(findStudioAssets({ query: "frame", kind: "element", limit: 50 }).some((asset) => asset.id === "so-double-oval-frame-v1"));
  assert.ok(findStudioAssets({ query: "Christmas", kind: "any", limit: 50 }).some((asset) => asset.id === "tabler-christmas-tree-v1"));
  assert.ok(findStudioAssets({ query: "Halloween", kind: "any", limit: 50 }).some((asset) => asset.id === "tabler-pumpkin-scary-v1"));
  assert.ok(findStudioAssets({ query: "Easter", kind: "any", limit: 50 }).some((asset) => asset.id === "tabler-egg-v1"));
  assert.ok(findStudioAssets({ query: "back to school", kind: "any", limit: 50 }).some((asset) => asset.id === "tabler-backpack-v1"));
  assert.ok(findStudioAssets({ query: "wedding", kind: "any", limit: 50 }).some((asset) => asset.id === "tabler-rings-v1"));
  assert.ok(findStudioAssets({ query: "faith", kind: "any", limit: 50 }).some((asset) => asset.id === "tabler-cross-v1"));
  assert.ok(findStudioAssets({ query: "sports", kind: "any", limit: 50 }).some((asset) => asset.id === "tabler-ball-basketball-v1"));
  assert.ok(findStudioAssets({ query: "dog mom", kind: "any", limit: 50 }).some((asset) => asset.id === "tabler-dog-v1"));
  assert.ok(findStudioAssets({ query: "occupation", kind: "any", limit: 50 }).some((asset) => asset.id === "tabler-stethoscope-v1"));
});

test("diverse open collections retain exact provenance, evidence, rights, search tags, and Studio insertion", () => {
  const patterns = STUDIO_ASSETS.filter((asset) => asset.id.startsWith("patternfills-"));
  const crops = STUDIO_ASSETS.filter((asset) => asset.id.startsWith("open-crop-"));
  assert.equal(patterns.length, 15);
  assert.equal(crops.length, 16);
  for (const asset of patterns) {
    assert.equal(asset.licenseId, "MIT");
    assert.equal(asset.commercialUse, true);
    assert.equal(asset.modificationAllowed, true);
    assert.equal(asset.redistributionAllowed, true);
    assert.equal(asset.attributionRequired, true);
    assert.match(asset.sourceUrl ?? "", /iros\/patternfills\/blob\/cfd578c3a967982eaf545d0293491ef6828ec2c8\/src\/patterns\//);
    assert.match(asset.evidenceUrl ?? "", /iros\/patternfills\/blob\/cfd578c3a967982eaf545d0293491ef6828ec2c8\/README\.md/);
    assert.equal(studioEditorCommandSchema.safeParse({ type: "add_graphic", assetKey: asset.id }).success, true);
  }
  for (const asset of crops) {
    assert.equal(asset.licenseId, "CC0-1.0");
    assert.equal(asset.commercialUse, true);
    assert.equal(asset.modificationAllowed, true);
    assert.equal(asset.redistributionAllowed, true);
    assert.equal(asset.attributionRequired, false);
    assert.equal(asset.attributionText, null);
    assert.match(asset.sourceUrl ?? "", /openfarmcc\/open-crop-icons\/blob\/d41f1197a14bb82f12037dc47585152ae1e3074f\/icons\//);
    assert.match(asset.evidenceUrl ?? "", /openfarmcc\/open-crop-icons\/blob\/d41f1197a14bb82f12037dc47585152ae1e3074f\/README\.md/);
    assert.equal(studioEditorCommandSchema.safeParse({ type: "add_graphic", assetKey: asset.id }).success, true);
  }
  assert.ok(findStudioAssets({ query: "engraving", kind: "pattern", limit: 50 }).some((asset) => asset.id === "patternfills-crosshatch-v1"));
  assert.ok(findStudioAssets({ query: "Halloween", kind: "element", limit: 50 }).some((asset) => asset.id === "open-crop-pumpkin-v1"));
  assert.ok(findStudioAssets({ query: "tropical", kind: "element", limit: 50 }).some((asset) => asset.id === "open-crop-watermelon-v1"));
  assert.ok(findStudioAssets({ query: "botanical", kind: "element", limit: 50 }).some((asset) => asset.id === "open-crop-lavender-v1"));
  assert.ok(findStudioAssets({ query: "harvest", kind: "element", limit: 50 }).some((asset) => asset.id === "open-crop-acorn-squash-v1"));
  const patternEvidence = readFileSync("docs/licenses/third-party/patternfills/MIT-LICENSE.txt", "utf8");
  assert.match(patternEvidence, /Copyright \(c\) 2014 Irene Ros/);
  assert.match(readFileSync("docs/licenses/third-party/patternfills/CONTRIBUTORS.md", "utf8"), /gnarf/);
  assert.match(readFileSync("docs/licenses/third-party/open-crop-icons/CC0-LICENSE-EVIDENCE.md", "utf8"), /CC0/);
  assert.equal(readFileSync("docs/licenses/third-party/patternfills/source/circles-3.svg", "utf8").includes("<svg"), true);
  assert.equal(readFileSync("docs/licenses/third-party/open-crop-icons/source/pumpkin.svg", "utf8").includes("<svg"), true);
});

test("Libreclipart illustration batch keeps CC0 evidence, originals, designer tags, and Studio insertion", () => {
  const assets = STUDIO_ASSETS.filter((asset) => asset.id.startsWith("libreclipart-"));
  assert.equal(assets.length, 68);
  assert.equal(new Set(assets.map((asset) => asset.id)).size, assets.length);
  for (const asset of assets) {
    assert.equal(asset.licenseId, "CC0-1.0");
    assert.equal(asset.commercialUse, true);
    assert.equal(asset.modificationAllowed, true);
    assert.equal(asset.redistributionAllowed, true);
    assert.equal(asset.attributionRequired, false);
    assert.equal(asset.attributionText, null);
    assert.match(asset.sourceUrl ?? "", /libreclipart\.org\/en\/vectors\/.*\/\d+$/);
    assert.match(asset.evidenceUrl ?? "", /libreclipart\.org\/en\/vectors\/.*\/\d+$/);
    assert.match(asset.source, /SVG metadata credits Libreclipart.org; individual artist not stated/);
    assert.equal(studioEditorCommandSchema.safeParse({ type: "add_graphic", assetKey: asset.id }).success, true);
    assert.ok(readFileSync(`docs/licenses/third-party/libreclipart/source/${asset.id.match(/libreclipart-(\d+)-v1/)?.[1]}.svg`, "utf8").includes("<svg"));
  }
  for (const [query, id] of [
    ["floral wedding invitation", "libreclipart-860-v1"],
    ["tropical baby shower", "libreclipart-319-v1"],
    ["kids birthday", "libreclipart-13-v1"],
    ["island summer", "libreclipart-319-v1"],
    ["christmas gift tag", "libreclipart-245-v1"],
  ] as const) {
    assert.ok(findStudioAssets({ query, kind: "element", limit: 50 }).some((asset) => asset.id === id), query);
  }
  assert.match(readFileSync("docs/licenses/third-party/libreclipart/CC0-LICENSE-EVIDENCE.md", "utf8"), /all free vector images are under CC0/);
  assert.equal(readFileSync("docs/licenses/third-party/libreclipart/source/860.svg", "utf8").includes("<svg"), true);
});

test("Open Doodles adds authored lifestyle illustrations with CC0 rights and useful design retrieval", () => {
  const assets = STUDIO_ASSETS.filter((asset) => asset.id.startsWith("open-doodles-"));
  assert.equal(assets.length, 27);
  for (const asset of assets) {
    assert.equal(asset.licenseId, "CC0-1.0");
    assert.equal(asset.commercialUse, true);
    assert.equal(asset.modificationAllowed, true);
    assert.equal(asset.redistributionAllowed, true);
    assert.equal(asset.attributionRequired, false);
    assert.equal(asset.attributionText, null);
    assert.match(asset.source ?? "", /Pablo Stanley/);
    assert.match(asset.sourceUrl ?? "", /opendoodles\.s3-us-west-1\.amazonaws\.com\/.*\.svg$/);
    assert.equal(studioEditorCommandSchema.safeParse({ type: "add_graphic", assetKey: asset.id }).success, true);
  }
  for (const [query,id] of [
    ["dog mom", "open-doodles-doggie-v1"],
    ["christmas gift tag", "open-doodles-unboxing-v1"],
    ["halloween", "open-doodles-zombieing-v1"],
    ["summer body positivity", "open-doodles-bikini-v1"],
    ["school reading", "open-doodles-reading-side-v1"],
    ["garden botanical", "open-doodles-plant-v1"],
    ["retro roller skating", "open-doodles-roller-skating-v1"],
  ] as const) {
    assert.ok(findStudioAssets({ query, kind: "element", limit: 50 }).some((asset) => asset.id === id), query);
  }
  assert.match(readFileSync("docs/licenses/third-party/open-doodles/CC0-LICENSE-EVIDENCE.md", "utf8"), /Pablo Stanley/);
  assert.equal(readFileSync("docs/licenses/third-party/open-doodles/source/running.svg", "utf8").includes("<svg"), true);
});

test("Kitbitz adds a curated cross-theme CC0 object collection with source hashes, safe SVGs, and useful search", () => {
  const manifest = JSON.parse(readFileSync("docs/licenses/third-party/kitbitz/asset-manifest.json", "utf8")) as {
    upstreamRevision: string;
    upstreamCatalogGeneratedAt: string;
    selectedAssets: { sweetohId: string; originalSourcePath: string; originalFileSha256: string; upstreamKit: string }[];
  };
  const assets = STUDIO_ASSETS.filter((asset) => asset.id.startsWith("kitbitz-"));
  assert.equal(assets.length, 372);
  assert.equal(manifest.selectedAssets.length, assets.length);
  assert.equal(new Set(manifest.selectedAssets.map((asset) => asset.originalSourcePath)).size, assets.length);
  assert.equal(new Set(manifest.selectedAssets.map((asset) => asset.originalFileSha256)).size, assets.length);
  assert.match(manifest.upstreamRevision, /^[a-f0-9]{40}$/);
  assert.ok(manifest.upstreamCatalogGeneratedAt);
  assert.deepEqual(new Set(manifest.selectedAssets.map((asset) => asset.upstreamKit)).size, 12);
  for (const record of manifest.selectedAssets) {
    const source = readFileSync(path.join("docs/licenses/third-party/kitbitz/source", record.originalSourcePath));
    assert.equal(createHash("sha256").update(source).digest("hex"), record.originalFileSha256, record.originalSourcePath);
    const asset = studioAsset(record.sweetohId);
    assert.ok(asset);
    assert.equal(asset.licenseId, "CC0-1.0");
    assert.equal(asset.licenseUrl, "https://creativecommons.org/publicdomain/zero/1.0/");
    assert.equal(asset.commercialUse, true);
    assert.equal(asset.modificationAllowed, true);
    assert.equal(asset.redistributionAllowed, true);
    assert.equal(asset.attributionRequired, false);
    assert.equal(asset.attributionText, null);
    assert.match(asset.source, /individual illustrator is not named on this catalog record/);
    assert.match(asset.sourceUrl ?? "", new RegExp(`/blob/${manifest.upstreamRevision}/kits/`));
    assert.equal(asset.svg, source.toString("utf8"));
    assert.doesNotMatch(asset.svg, /<script\b|<foreignObject\b|<iframe\b|javascript:/i);
    assert.doesNotMatch(asset.svg, /(?:href|url\()\s*[=:(]\s*["']?https?:/i);
    assert.equal(studioEditorCommandSchema.safeParse({ type: "add_graphic", assetKey: asset.id }).success, true);
  }
  for (const [query, kit] of [
    ["garden botanical flower", "nature-kit"],
    ["halloween friendly ghost", "halloween-kit"],
    ["winter snow penguin", "winter-kit"],
    ["space planet", "space-kit"],
    ["cyberpunk neon flamingo", "cyberpunk-kit"],
    ["home decor books", "interior-kit"],
    ["medieval castle wall", "medieval-kit"],
    ["western lucky horseshoe", "western-kit"],
    ["city architecture building", "city-kit"],
  ] as const) {
    assert.ok(findStudioAssets({ query, kind: "any", limit: 50 }).some((asset) => manifest.selectedAssets.find((record) => record.sweetohId === asset.id)?.upstreamKit === kit), query);
  }
  assert.equal(assets.some((asset) => /barbie/i.test(`${asset.name} ${asset.tags.join(" ")}`)), false);
  assert.equal(assets.some((asset) => /\b(weapon|firearm|gun|sword|spear|shield|armor|axe|dagger|rifle|cannon|bullet)\b/i.test(`${asset.name} ${asset.tags.join(" ")}`)), false);
  assert.match(readFileSync("docs/licenses/third-party/kitbitz/UPSTREAM-LICENSE.md", "utf8"), /including for commercial\s+purposes/);
  assert.match(readFileSync("docs/licenses/third-party/kitbitz/UPSTREAM-LICENSE.md", "utf8"), /does not grant patent, trademark, publicity, or privacy rights/);
});

test("Openclipart frame, banner, badge, and background primitives are CC0 and findable by real design briefs", () => {
  const assets = STUDIO_ASSETS.filter((asset) => asset.id.startsWith("openclipart-"));
  assert.equal(assets.length, 14);
  for (const asset of assets) {
    assert.equal(asset.licenseId, "CC0-1.0");
    assert.equal(asset.licenseUrl, "https://creativecommons.org/publicdomain/zero/1.0/");
    assert.equal(asset.commercialUse, true);
    assert.equal(asset.modificationAllowed, true);
    assert.equal(asset.redistributionAllowed, true);
    assert.equal(asset.attributionRequired, false);
    assert.match(asset.sourceUrl ?? "", /^https:\/\/openclipart\.org\/detail\/\d+$/);
    assert.equal(asset.evidenceUrl, asset.sourceUrl);
    assert.equal(studioEditorCommandSchema.safeParse({ type: "add_graphic", assetKey: asset.id }).success, true);
  }
  for (const [query, expectedId] of [
    ["christmas frame", "openclipart-230538-v1"],
    ["graduation badge", "openclipart-189876-v1"],
    ["tropical pattern", "openclipart-289745-v1"],
    ["birthday banner", "openclipart-238238-v1"],
    ["baby background", "openclipart-284817-v1"],
    ["sports border", "openclipart-204165-v1"],
  ]) {
    assert.ok(findStudioAssets({ query, kind: "any", limit: 50 }).some((asset) => asset.id === expectedId), query);
  }
  assert.match(readFileSync("docs/licenses/third-party/openclipart/CC0-1.0-LEGALCODE.txt", "utf8"), /Creative Commons Legal Code/);
  assert.match(readFileSync("docs/licenses/third-party/openclipart/SOURCE.md", "utf8"), /mia_marianne/);
  assert.ok(readFileSync("docs/licenses/third-party/openclipart/source/230538-christmas-frame.svg", "utf8").includes("<svg"));
});

test("composition primitives surface for typography-adjacent design searches and keep originals distinct", () => {
  const briefs: [string, string][] = [
    ["sale badge", "so-sale-seal-v1"],
    ["cute label", "so-cute-label-v1"],
    ["speech bubble", "openclipart-298989-v1"],
    ["curved arrow", "openclipart-161695-v1"],
    ["retro burst", "so-retro-burst-v1"],
    ["divider", "openclipart-308072-v1"],
    ["tropical flourish", "so-tropical-flourish-v1"],
    ["organic shape", "so-organic-blob-v1"],
  ];
  for (const [query, id] of briefs) {
    assert.ok(findStudioAssets({ query, kind: "any", limit: 50 }).some((asset) => asset.id === id), query);
    assert.equal(studioEditorCommandSchema.safeParse({ type: "add_graphic", assetKey: id }).success, true);
  }
  const originals = STUDIO_ASSETS.filter((asset) => asset.id.startsWith("so-") && ["so-sale-seal-v1", "so-cute-label-v1", "so-organic-blob-v1", "so-tropical-flourish-v1", "so-retro-burst-v1"].includes(asset.id));
  assert.equal(originals.length, 5);
  assert.ok(originals.every((asset) => asset.source === "SweetOh OS" && asset.sourceUrl === undefined));
  const external = STUDIO_ASSETS.find((asset) => asset.id === "openclipart-298989-v1");
  assert.match(external?.source ?? "", /AdamStanislav.*298981/);
  assert.match(readFileSync("docs/licenses/third-party/openclipart-composition/SOURCE.md", "utf8"), /SHA-256/);
  assert.match(readFileSync("docs/licenses/third-party/openclipart-composition/CC0-1.0-LEGALCODE.txt", "utf8"), /Creative Commons Legal Code/);
});

test("OpenMoji adds a broad pinned CC BY-SA illustration collection with original SVGs and searchable themes", () => {
  const assets = STUDIO_ASSETS.filter((asset) => asset.id.startsWith("openmoji-"));
  assert.equal(assets.length, 527);
  for (const asset of assets) {
    assert.equal(asset.licenseId, "CC-BY-SA-4.0");
    assert.equal(asset.commercialUse, true);
    assert.equal(asset.modificationAllowed, true);
    assert.equal(asset.redistributionAllowed, true);
    assert.equal(asset.attributionRequired, true);
    assert.match(asset.attributionText ?? "", /OpenMoji.*CC BY-SA 4\.0/);
    assert.match(asset.sourceUrl ?? "", /openmoji\/blob\/aeb8bb3a59e2de39c754ac79180c8131c906acea\/color\/svg\//);
    assert.match(asset.evidenceUrl ?? "", /openmoji\/blob\/aeb8bb3a59e2de39c754ac79180c8131c906acea\/LICENSE\.txt$/);
    assert.match(asset.svg, /^<svg(?:\s|>)/);
    assert.equal(studioEditorCommandSchema.safeParse({ type: "add_graphic", assetKey: asset.id }).success, true);
  }
  for (const [query, categories] of [
    ["tropical ocean", ["Animals", "Nature & Botanicals", "Travel & Places"]],
    ["birthday party", ["Celebrations & Hobbies", "Celebrations & Expressions"]],
    ["graduation school", ["Objects & Crafts", "People & Occupations", "Celebrations & Hobbies"]],
    ["faith religion", ["Symbols & Faith", "Travel & Places"]],
    ["wedding floral", ["Nature & Botanicals", "Family & Life"]],
    ["sports hobby", ["Sports & Hobbies", "Celebrations & Hobbies"]],
  ] as const) {
    const results = findStudioAssets({ query, kind: "any", limit: 50 });
    assert.ok(results.some((asset) => asset.id.startsWith("openmoji-")), query);
    assert.ok(results.some((asset) => categories.includes(asset.category)), query);
  }
  assert.match(readFileSync("docs/licenses/third-party/openmoji/CC-BY-SA-4.0-LICENSE.txt", "utf8"), /Attribution-ShareAlike 4\.0 International Public License/);
  assert.match(readFileSync("docs/licenses/third-party/openmoji/UPSTREAM-FAQ.md", "utf8"), /commercial/);
  assert.match(readFileSync("docs/licenses/third-party/openmoji/SOURCE.md", "utf8"), /aeb8bb3a59e2de39c754ac79180c8131c906acea/);
  assert.match(readFileSync("docs/licenses/third-party/openmoji/source/1F332.svg", "utf8"), /^<svg/);
});

test("Hero Patterns and OpenGameArt add attributed vector patterns and CC0 reusable material textures", () => {
  const hero = STUDIO_ASSETS.filter((asset) => asset.id.startsWith("hero-pattern-"));
  const oga = STUDIO_ASSETS.filter((asset) => asset.id.startsWith("oga-seamless-"));
  assert.equal(hero.length, 80);
  assert.equal(oga.length, 51);
  for (const asset of hero) {
    assert.equal(asset.licenseId, "CC-BY-4.0");
    assert.equal(asset.commercialUse, true);
    assert.equal(asset.modificationAllowed, true);
    assert.equal(asset.redistributionAllowed, true);
    assert.equal(asset.attributionRequired, true);
    assert.match(asset.source, /Steve Schoger/);
    assert.match(asset.sourceUrl ?? "", /sschoger\/hero-patterns\/blob\/6a2ed74a6910a8b1095d15dd31f7f3f0188517ad\/svg\//);
    assert.match(asset.attributionText ?? "", /Steve Schoger.*CC BY 4\.0/);
    assert.equal(studioEditorCommandSchema.safeParse({ type: "add_graphic", assetKey: asset.id }).success, true);
  }
  for (const asset of oga) {
    assert.equal(asset.licenseId, "CC0-1.0");
    assert.equal(asset.commercialUse, true);
    assert.equal(asset.modificationAllowed, true);
    assert.equal(asset.redistributionAllowed, true);
    assert.equal(asset.attributionRequired, false);
    assert.match(asset.source, /uploader n4/);
    assert.equal(asset.svg.includes("data:image/webp;base64,"), true);
    assert.equal(studioEditorCommandSchema.safeParse({ type: "add_graphic", assetKey: asset.id }).success, true);
  }
  assert.ok(findStudioAssets({ query: "formal invitation wedding pattern", kind: "pattern", limit: 50 }).some((asset) => asset.id === "hero-pattern-formal-invitation-v1"));
  assert.ok(findStudioAssets({ query: "autumn fall background", kind: "pattern", limit: 50 }).some((asset) => asset.id === "hero-pattern-autumn-v1"));
  assert.ok(findStudioAssets({ query: "brick wall texture", kind: "pattern", limit: 50 }).some((asset) => asset.id === "oga-seamless-wall-512x512-0-v1"));
  assert.ok(findStudioAssets({ query: "fabric textile pattern", kind: "pattern", limit: 50 }).some((asset) => asset.id === "oga-seamless-blue-textile-v1"));
  assert.doesNotMatch(hero.map((asset) => asset.id).join(" "), /aztec|moroccan|temple|church-on-sunday|death-star|charlie-brown/);
  assert.match(readFileSync("docs/licenses/third-party/hero-patterns/CC-BY-4.0-LICENSE.txt", "utf8"), /Attribution 4\.0 International Public License/);
  assert.match(readFileSync("docs/licenses/third-party/hero-patterns/SOURCE.md", "utf8"), /Excluded culturally specific/);
  assert.match(readFileSync("docs/licenses/third-party/hero-patterns/source/autumn.svg", "utf8"), /^<svg/);
  assert.match(readFileSync("docs/licenses/third-party/opengameart-seamless-texture-pack/CC0-1.0-LEGALCODE.txt", "utf8"), /CC0 1\.0 Universal/);
  assert.match(readFileSync("docs/licenses/third-party/opengameart-seamless-texture-pack/SOURCE.md", "utf8"), /n4/);
  assert.ok(readFileSync("docs/licenses/third-party/opengameart-seamless-texture-pack/source/grass.png").length > 100);
});

test("every bundled vector renders as printable pixels", async () => {
  for (const asset of STUDIO_ASSETS) {
    try {
      const result = await sharp(Buffer.from(asset.svg)).resize(600, 600).png().toBuffer();
      assert.ok(result.byteLength > 100, asset.id);
    } catch (error) {
      throw new Error(`${asset.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
});

const base = { version: 1, surfaces: [{ id: "front", name: "Front", assetId: null, area: { x: .2, y: .2, width: .6, height: .6 }, layers: [] }] };
test("old layouts still load and vetted graphics round trip", () => {
  assert.equal(studioLayoutSchema.parse(base).surfaces[0].layers.length, 0);
  const withGraphic: { version: number; surfaces: { id: string; name: string; assetId: null; area: typeof base.surfaces[0]["area"]; layers: Record<string, unknown>[] }[] } = structuredClone(base);
  withGraphic.surfaces[0].layers.push({ kind: "graphic", id: "art-1", assetKey: STUDIO_ASSETS[0].id, x: 200, y: 200, scaleX: 1, scaleY: 1, angle: 0 });
  assert.equal(studioLayoutSchema.parse(withGraphic).surfaces[0].layers[0].kind, "graphic");
  withGraphic.surfaces[0].layers[0].assetKey = "unknown-asset";
  assert.equal(studioLayoutSchema.safeParse(withGraphic).success, false);
});

test("logical group identity persists across layout validation and exposes real capability truth", () => {
  const groupId = "00000000-0000-4000-8000-000000000010";
  const layout = studioLayoutSchema.parse({ ...base, surfaces: [{ ...base.surfaces[0], layers: [
    { id: "a", kind: "shape", shape: "rect", fill: "#ffffff", x: 10, y: 10, scaleX: 1, scaleY: 1, angle: 0, width: 30, height: 30, groupId },
    { id: "b", kind: "text", text: "PLAY", color: "#173e39", fontSize: 32, x: 50, y: 10, scaleX: 1, scaleY: 1, angle: 0, groupId },
  ] }] });
  const snapshot = buildStudioEditorState(layout, "front", ["a", "b"], 1);
  assert.equal(snapshot.layers[0].geometry.groupId, groupId);
  assert.deepEqual(snapshot.selectedLayerIds, ["a", "b"]);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "group_selection", layerIds: ["a", "b"] }).success, true);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "distribute_selection", layerIds: ["a", "b"], axis: "horizontal" }).success, false);
  assert.deepEqual(CONFIRMED_SHOP_METHODS, ["sublimation", "engraving"]);
  assert.ok(KNOWLEDGE_ONLY_METHODS.includes("embroidery"));
});

test("composition commands validate and multi-layer state survives save/reopen", () => {
  const ids = ["text-1", "asset-1"];
  for (const direction of ["forward", "backward", "front", "back"] as const) {
    assert.equal(studioEditorCommandSchema.safeParse({ type: "set_selection_order", layerIds: ids, direction }).success, true);
  }
  for (const edge of ["left", "hcenter", "right", "top", "vcenter", "bottom"] as const) {
    assert.equal(studioEditorCommandSchema.safeParse({ type: "align_canvas", layerIds: ids, edge }).success, true);
    assert.equal(studioEditorCommandSchema.safeParse({ type: "align_selection", layerIds: ids, edge }).success, true);
  }
  assert.equal(studioEditorCommandSchema.safeParse({ type: "set_selection_flags", layerIds: ids, hidden: true }).success, true);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "set_selection_flags", layerIds: ids }).success, false);
  const groupId = "00000000-0000-4000-8000-000000000011";
  const source = studioLayoutSchema.parse({ ...base, surfaces: [{ ...base.surfaces[0], layers: [
    { id: ids[0], kind: "text", text: "PLAY", color: "#173e39", fontSize: 36, x: 40, y: 50, scaleX: 1, scaleY: 1, angle: 0, groupId },
    { id: ids[1], kind: "image", assetId: "00000000-0000-4000-8000-000000000001", x: 80, y: 70, scaleX: 1, scaleY: 1, angle: 0, groupId, locked: true },
  ] }] });
  const reopened = studioLayoutSchema.parse(JSON.parse(JSON.stringify(source)));
  assert.deepEqual(reopened.surfaces[0].layers.map((layer) => layer.id), ids);
  assert.deepEqual(reopened.surfaces[0].layers.map((layer) => layer.groupId), [groupId, groupId]);
  assert.equal(reopened.surfaces[0].layers[1].kind === "image" && reopened.surfaces[0].layers[1].locked, true);
  const editor = readFileSync("app/(partner)/partner/canvas/product-editor.tsx", "utf8");
  assert.match(editor, /case "set_selection_order": return setLayersOrder/);
  assert.match(editor, /case "align_canvas": return alignCanvas/);
  assert.match(editor, /function setLayersOrder[\s\S]*?checkpoint\(\)[\s\S]*?capture\(\)/);
  assert.match(editor, /function setLayersFlags[\s\S]*?checkpoint\(\)[\s\S]*?capture\(\)/);
});

test("multi-layer z-order moves selected objects as a stable block or one step", () => {
  const layers = ["a", "b", "c", "d", "e"];
  const selected = new Set(["b", "d"]);
  assert.deepEqual(reorderLayers(layers, selected, "front"), ["a", "c", "e", "b", "d"]);
  assert.deepEqual(reorderLayers(layers, selected, "back"), ["b", "d", "a", "c", "e"]);
  assert.deepEqual(reorderLayers(layers, selected, "forward"), ["a", "c", "b", "e", "d"]);
  assert.deepEqual(reorderLayers(layers, selected, "backward"), ["b", "a", "d", "c", "e"]);
});

test("text styles validate, survive save/reopen and unavailable saved fonts use Inter", () => {
  const style = { type: "set_text_style", font: "montserrat", fontSize: 42, color: "#c8102e", bold: true, italic: true, textAlign: "center", lineHeight: 1.35, letterSpacing: 36, textBoxWidth: 240, text: "Sweet Oh" } as const;
  assert.equal(studioEditorCommandSchema.safeParse(style).success, true);
  assert.equal(studioEditorCommandSchema.safeParse({ ...style, font: "unlicensed-font" }).success, false);
  assert.equal(resolveStudioFontKey("montserrat"), "montserrat");
  assert.equal(resolveStudioFontKey("font-removed-from-build"), "inter");
  const layout = studioLayoutSchema.parse({ ...base, surfaces: [{ ...base.surfaces[0], layers: [
    { id: "type-style", kind: "text", text: style.text, color: style.color, font: style.font, fontSize: style.fontSize, bold: style.bold, italic: style.italic, textAlign: style.textAlign, lineHeight: style.lineHeight, letterSpacing: style.letterSpacing, textBoxWidth: style.textBoxWidth, x: 20, y: 30, scaleX: 1, scaleY: 1, angle: 0 },
    { id: "legacy-font", kind: "text", text: "Old", color: "#101828", font: "retired-font", fontSize: 24, x: 20, y: 80, scaleX: 1, scaleY: 1, angle: 0 },
  ] }] });
  const reopened = studioLayoutSchema.parse(JSON.parse(JSON.stringify(layout)));
  const snapshot = buildStudioEditorState(reopened, "front", ["type-style"], 2);
  assert.equal(snapshot.layers[0].geometry.textAlign, "center");
  assert.equal(snapshot.layers[0].geometry.textBoxWidth, 240);
  const text = reopened.surfaces[0].layers[0];
  assert.equal(text.kind, "text");
  if (text.kind === "text") assert.deepEqual({ id: text.id, font: text.font, size: text.fontSize, bold: text.bold, italic: text.italic, align: text.textAlign, lineHeight: text.lineHeight, spacing: text.letterSpacing, width: text.textBoxWidth, content: text.text }, { id: "type-style", font: "montserrat", size: 42, bold: true, italic: true, align: "center", lineHeight: 1.35, spacing: 36, width: 240, content: "Sweet Oh" });
  const editor = readFileSync("app/(partner)/partner/canvas/product-editor.tsx", "utf8");
  assert.match(editor, /case "set_text_style"[\s\S]*?changeSelected\([\s\S]*?record\)/);
  assert.match(editor, /function changeSelected\([\s\S]*?if \(record\) checkpoint\(\)[\s\S]*?capture\(\)/);
  assert.match(editor, /new Textbox\(layer\.text[\s\S]*?textBoxWidth/);
  assert.match(editor, /resolveStudioFontKey\(layer\.font\)/);
});

test("image crop, mask, and nondestructive adjustments remain in the production layout", () => {
  assert.equal(studioEditorCommandSchema.safeParse({ type: "set_image_adjustment", field: "temperature", value: -0.4 }).success, true);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "set_image_mask", mask: "rounded" }).success, true);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "crop_image", x: 20, y: 10, width: 300, height: 240 }).success, true);
  const layout = studioLayoutSchema.parse({ ...base, surfaces: [{ ...base.surfaces[0], printRegions: [{ id: "front-art", name: "Front art", bounds: { x: .2, y: .2, width: .5, height: .5 }, shape: "rectangle" }], layers: [
    { id: "creative-image", kind: "image", assetId: "00000000-0000-4000-8000-000000000001", printRegionId: "front-art", crop: { x: 20, y: 10, width: 300, height: 240 }, mask: "rounded", adjustments: { brightness: .15, contrast: -.1, saturation: .2, temperature: -.4, blur: .02 }, opacity: .7, shadow: { color: "#000000", opacity: .2, blur: 12, offsetX: 0, offsetY: 4 }, x: 70, y: 80, scaleX: .8, scaleY: .8, angle: 12, flipX: true },
  ] }] });
  const reopened = studioLayoutSchema.parse(JSON.parse(JSON.stringify(layout)));
  const image = reopened.surfaces[0].layers[0];
  assert.equal(image.kind, "image");
  if (image.kind === "image") {
    assert.equal(image.assetId, "00000000-0000-4000-8000-000000000001");
    assert.equal(image.printRegionId, "front-art");
    assert.deepEqual(image.crop, { x: 20, y: 10, width: 300, height: 240 });
    assert.deepEqual(image.adjustments, { brightness: .15, contrast: -.1, saturation: .2, temperature: -.4, blur: .02 });
    assert.equal(image.mask, "rounded");
    assert.equal(image.opacity, .7);
    assert.equal(image.angle, 12);
    assert.equal(image.flipX, true);
  }
  const snapshot = buildStudioEditorState(reopened, "front", ["creative-image"], 3);
  assert.deepEqual(snapshot.layers[0].geometry.adjustments, { brightness: .15, contrast: -.1, saturation: .2, temperature: -.4, blur: .02 });
  const editor = readFileSync("app/(partner)/partner/canvas/product-editor.tsx", "utf8");
  assert.match(editor, /function imageFiltersFor[\s\S]*?filters\.BlendColor/);
  assert.match(editor, /function setImageAdjustment[\s\S]*?checkpoint\(\)[\s\S]*?applyFilters\(\)/);
  assert.match(editor, /case "set_image_adjustment": return setImageAdjustment\(action\.field, action\.value, record\)/);
  assert.match(editor, /onApply=\{\(px\) => void executeEditorCommand\(\{ type: "crop_image", \.\.\.px \}\)\}/);
  assert.match(editor, /function capture\(\)[\s\S]*?\.\.\.base,[\s\S]*?scheduleMockups\(\)/);
  const cropDialog = readFileSync("app/(partner)/partner/canvas/crop-dialog.tsx", "utf8");
  assert.match(cropDialog, /initialCroppedAreaPixels=\{initial\}/);
});

test("saved Studio designs instantiate independent rights-safe copies and preserve production layout", () => {
  const allowedId = "00000000-0000-4000-8000-000000000001";
  const revokedId = "00000000-0000-4000-8000-000000000002";
  const groupId = "00000000-0000-4000-8000-000000000010";
  const source = studioLayoutSchema.parse({ ...base, surfaces: [{
    ...base.surfaces[0],
    assetId: allowedId,
    imageRole: "production_blank",
    printRegions: [{ id: "safe-print", name: "Safe print", bounds: { x: .15, y: .2, width: .7, height: .6 }, shape: "rectangle", dimensions: { width: 12, height: 10, unit: "in" } }],
    layers: [
      { id: "copy-text", kind: "text", text: "SweetOh", color: "#173e39", font: "retired-font", fontSize: 34, bold: true, textAlign: "center", x: 32, y: 28, scaleX: 1, scaleY: 1, angle: 0, groupId },
      { id: "approved-image", kind: "image", assetId: allowedId, x: 50, y: 70, scaleX: 1, scaleY: 1, angle: 0, crop: { x: 2, y: 3, width: 40, height: 50 }, adjustments: { brightness: .2, temperature: -.1 } },
      { id: "revoked-image", kind: "image", assetId: revokedId, x: 80, y: 90, scaleX: .7, scaleY: .7, angle: 12 },
    ],
  }] });
  const prepared = prepareStudioTemplateCopy(source, new Set([allowedId]));
  assert.equal(prepared.removedAssetCount, 1);
  assert.equal(prepared.fontFallbackCount, 1);
  const persistedCopy = studioLayoutSchema.parse(JSON.parse(JSON.stringify(prepared.layout)));
  assert.deepEqual(persistedCopy.surfaces[0].layers.map((layer) => layer.id), ["copy-text", "approved-image"]);
  assert.equal(persistedCopy.surfaces[0].imageRole, "production_blank");
  assert.equal(persistedCopy.surfaces[0].printRegions?.[0].id, "safe-print");
  const text = persistedCopy.surfaces[0].layers[0];
  assert.equal(text.kind === "text" && text.font, "inter");
  assert.equal(text.kind === "text" && text.groupId, groupId);
  const image = persistedCopy.surfaces[0].layers[1];
  assert.equal(image.kind === "image" && image.assetId, allowedId);
  assert.deepEqual(image.kind === "image" && image.crop, { x: 2, y: 3, width: 40, height: 50 });
  assert.deepEqual(image.kind === "image" && image.adjustments, { brightness: .2, temperature: -.1 });
  if (persistedCopy.surfaces[0].layers[0].kind === "text") persistedCopy.surfaces[0].layers[0].text = "Independent copy";
  assert.equal(source.surfaces[0].layers[0].kind === "text" && source.surfaces[0].layers[0].text, "SweetOh");

  const editor = readFileSync("app/(partner)/partner/canvas/product-editor.tsx", "utf8");
  const page = readFileSync("app/(partner)/partner/canvas/page.tsx", "utf8");
  const action = readFileSync("app/(partner)/partner/actions/library.ts", "utf8");
  assert.match(page, /query\.template \?\? query\.composition/);
  assert.match(editor, /\?template=\$\{d\.id\}/);
  assert.match(editor, /draftScope/);
  assert.match(action, /getCreativeLibraryAsset\(\{ ventureId: session\.ventureId, assetId \}\)/);
  assert.match(action, /canInsertCreativeLibraryAsset\(creativeAsset, session\.ventureId\)/);
  assert.match(action, /resolveStudioFontKey\(layer\.font\)/);
});

test("product draft artwork links to the editable composition and persists exact production geometry separately", () => {
  const sourceId = "00000000-0000-4000-8000-000000000001";
  const draftId = "00000000-0000-4000-8000-000000000002";
  const studio = studioLayoutSchema.parse({ ...base, surfaces: [{
    ...base.surfaces[0], id: "front", position: "front", assetId: sourceId, imageRole: "production_blank",
    area: { x: .18, y: .11, width: .62, height: .72 },
    printRegions: [{ id: "front-print", name: "Front print", bounds: { x: .2, y: .16, width: .5, height: .6 }, shape: "rectangle", dimensions: { width: 10, height: 12, unit: "in" } }],
    layers: [{ id: "source-text", kind: "text", text: "Original artwork", color: "#173e39", font: "montserrat", fontSize: 32, x: 90, y: 80, scaleX: 1, scaleY: 1, angle: 0 }],
  }] });
  const productArea = productPrintAreaFromStudio(studio);
  assert.equal(studioMatchesProductPrintArea(studio, productArea), true);
  const reorderedProductArea = {
    ...productArea,
    surfaces: productArea.surfaces.map((surface) => ({
      ...surface,
      area: { height: surface.area.height, width: surface.area.width, y: surface.area.y, x: surface.area.x },
      printRegions: surface.printRegions?.map((region) => ({
        ...region,
        bounds: { height: region.bounds.height, width: region.bounds.width, y: region.bounds.y, x: region.bounds.x },
        dimensions: region.dimensions ? { unit: region.dimensions.unit, height: region.dimensions.height, width: region.dimensions.width } : undefined,
      })),
    })),
  };
  assert.equal(studioMatchesProductPrintArea(studio, reorderedProductArea), true, "database-style key ordering does not change validated geometry");
  assert.equal(studioMatchesProductPrintArea(studio, { ...productArea, surfaces: productArea.surfaces.map((surface) => ({ ...surface, area: { ...surface.area, x: .01 } })) }), false);
  assert.equal(studioMatchesProductPrintArea(studio, { ...productArea, surfaces: productArea.surfaces.map((surface) => ({ ...surface, printRegions: surface.printRegions?.map((region) => ({ ...region, dimensions: region.dimensions ? { ...region.dimensions, width: region.dimensions.width + 1 } : undefined })) })) }), false, "changed physical print dimensions remain incompatible");
  const serializedDesign = JSON.parse(JSON.stringify({ blankProductId: draftId, studio }));
  const reopenedDesign = studioLayoutSchema.parse(serializedDesign.studio);
  assert.equal(serializedDesign.blankProductId, draftId);
  assert.equal(reopenedDesign.surfaces[0].layers[0].kind === "text" && reopenedDesign.surfaces[0].layers[0].text, "Original artwork");
  assert.deepEqual(productArea.surfaces[0].area, studio.surfaces[0].area);
  assert.deepEqual(productArea.surfaces[0].printRegions, studio.surfaces[0].printRegions);
  assert.equal("layers" in productArea.surfaces[0], false);
  assert.equal(studio.surfaces[0].layers.length, 1, "linking a product does not flatten or mutate the source composition");

  const action = readFileSync("app/(partner)/partner/actions/library.ts", "utf8");
  const draftActions = readFileSync("app/(partner)/partner/actions/drafts.ts", "utf8");
  const canvasPage = readFileSync("app/(partner)/partner/canvas/page.tsx", "utf8");
  const review = readFileSync("app/(partner)/partner/review/[id]/page.tsx", "utf8");
  const editor = readFileSync("app/(partner)/partner/canvas/product-editor.tsx", "utf8");
  const readiness = readFileSync("lib/domains/catalog/service.ts", "utf8");
  assert.match(action, /getActorProductDraft\(\{ ventureId: session\.ventureId, actorUserId: session\.appUser\.id, productId:/);
  assert.match(action, /isDeepStrictEqual\(source\.compositionLayout\.studio, studio\)/);
  assert.match(action, /blankProductId: applyTarget\?\.product\.id \?\? blankProductId/);
  assert.match(action, /sourceAssetId: composition\.id/);
  assert.match(action, /productPrintAreaFromStudio\(studio\)/);
  assert.match(action, /markProductDraftReviewed\(\{ ventureId: session\.ventureId, productId: target\.id/);
  assert.match(action, /redirect\(`\/partner\/review\/\$\{target\.id\}\?success=/);
  assert.match(draftActions, /updatePartnerDraftAction[\s\S]*?reviewDetailPath\(productId, \{[\s\S]*?success:/);
  assert.match(draftActions, /markPartnerDraftReadyAction[\s\S]*?reviewDetailPath\(productId, \{/);
  assert.match(action, /studioMatchesProductPrintArea\(studio, applyTarget\.product\.printArea\)/);
  assert.match(canvasPage, /draft\.id === query\.targetDraft/);
  assert.match(canvasPage, /editorBlanks\.length === 0/);
  assert.match(canvasPage, /initialApplyTargetId=\{compatibleProductDrafts\.some\(\(draft\) => draft\.id === query\.targetDraft\)/);
  assert.match(action, /return \{ error: getActionErrorMessage\(error\) \}/);
  assert.match(editor, /applyToProductDraftId/);
  assert.match(review, /compositionLayout\?\.studio/);
  assert.match(readiness, /isSweetohPathValid[\s\S]*?isApprovedAssetStatus\(sourceAsset\.status\)/);
});

test("Studio product readiness rechecks current design rights, verified blanks, and exact geometry", () => {
  const blankId = "00000000-0000-4000-8000-000000000001";
  const layerId = "00000000-0000-4000-8000-000000000003";
  const sourceId = "00000000-0000-4000-8000-000000000004";
  const studio = studioLayoutSchema.parse({ ...base, surfaces: [{
    ...base.surfaces[0], id: "front", assetId: blankId, imageRole: "production_blank",
    layers: [{ id: "product-art", kind: "image", assetId: layerId, x: 30, y: 40, scaleX: 1, scaleY: 1, angle: 0 }],
  }] });
  const metadata = {
    kind: "illustration" as const, category: "Artwork", tags: [], productionMethods: [], sourceKind: "partner_upload" as const,
    sourceName: "Partner upload", sourceUrl: null, evidenceUrl: null, licenseId: null, licenseUrl: null,
    commercialUse: false, modificationAllowed: false, redistributionAllowed: false,
    attributionRequired: false, attributionText: null, rightsVerifiedAt: null, rightsVerifiedById: null,
  };
  const creative = (assetId: string): CreativeLibraryAsset => ({
    assetId, ventureId: "venture", ownerId: "owner", assetType: "sweetoh_design", status: "approved",
    authorityLevel: "canonical", name: "Artwork", notes: null, mimeType: "image/png", metadata,
  });
  const design = creative(sourceId);
  const layer = creative(layerId);
  const productSurface = productPrintAreaFromStudio(studio);
  const production = new Map([[blankId, { id: blankId, assetType: "product_asset", status: "approved", notes: "Background removed; reusable blank view." }]]);
  assert.equal(studioProductArtworkIssue({ ventureId: "venture", studio, printArea: productSurface, design, productionAssets: production, layerAssets: new Map([[layerId, layer]]) }), null);
  const revokedLayer = { ...layer, metadata: { ...metadata, sourceKind: "licensed_external" as const, sourceName: "External", sourceUrl: "https://example.com/art", evidenceUrl: "https://example.com/license", licenseId: "revoked", rightsVerifiedAt: null, rightsVerifiedById: null } };
  assert.match(studioProductArtworkIssue({ ventureId: "venture", studio, printArea: productSurface, design, productionAssets: production, layerAssets: new Map([[layerId, revokedLayer]]) }) ?? "", /commercial product use/);
  assert.match(studioProductArtworkIssue({ ventureId: "venture", studio, printArea: productSurface, design, productionAssets: new Map([[blankId, { ...production.get(blankId)!, status: "draft" }]]), layerAssets: new Map([[layerId, layer]]) }) ?? "", /production blank/);
  const wrongGeometry = { ...productSurface, surfaces: productSurface.surfaces.map((surface) => ({ ...surface, area: { ...surface.area, x: .01 } })) };
  assert.match(studioProductArtworkIssue({ ventureId: "venture", studio, printArea: wrongGeometry, design, productionAssets: production, layerAssets: new Map([[layerId, layer]]) }) ?? "", /print area/);

  const service = readFileSync("lib/domains/catalog/service.ts", "utf8");
  const review = readFileSync("app/(partner)/partner/review/[id]/page.tsx", "utf8");
  assert.match(service, /evaluateProductPublishReadiness[\s\S]*?validateProductStudioArtwork\(existing\)/);
  assert.match(service, /publishProduct[\s\S]*?validateProductStudioArtwork\(existing\)[\s\S]*?throw new ValidationError\(studioArtwork\.issue\)/);
  assert.match(review, /Associated Studio design/);
  assert.match(review, /verified production blank/);
  assert.match(review, /Reopen the associated Studio design to correct it/);
  assert.match(review, /composition=\$\{product\.sourceAssetId\}&targetDraft=\$\{product\.id\}/);
  assert.match(review, /Product workspace/);
  assert.match(review, /Customer listing/);
  assert.match(review, /Production surface &amp; placement/);
  assert.match(review, /id="listing-settings"/);
  assert.match(review, /id="production-overview"/);
  assert.match(review, /id="readiness-details"/);
  assert.match(review, /publishNow/);
  const readinessTransition = service.slice(service.indexOf("export async function markProductDraftReviewed"));
  assert.match(readinessTransition, /const readiness = await evaluateProductPublishReadiness\(input\)/);
  assert.match(readinessTransition, /readiness\.canPublish\s*\?\s*"approved"\s*:\s*"needs_work"/);
  const unpublish = service.slice(service.indexOf("export async function unpublishProduct"), service.indexOf("export async function", service.indexOf("export async function unpublishProduct") + 20));
  assert.match(unpublish, /active: false,\s*draftStatus: nextDraftStatus/);
  assert.doesNotMatch(unpublish, /sourceAssetId\s*:/);
});

test("new shape, image and typography controls stay serializable across save/reopen", () => {
  const layout = structuredClone(base) as typeof base & { surfaces: { layers: Record<string, unknown>[] }[] };
  layout.surfaces[0].layers.push(
    { id: "outlined", kind: "shape", shape: "hexagon", fill: "#ffffff", stroke: "#173e39", strokeWidth: 8, gradient: { from: "#ef476f", to: "#ffd166", direction: "diagonal" }, x: 10, y: 10, scaleX: 1, scaleY: 1, angle: 0, width: 100, height: 90 },
    { id: "image", kind: "image", assetId: "00000000-0000-4000-8000-000000000001", mask: "circle", shadow: { color: "#000000", opacity: .25, blur: 20, offsetX: 0, offsetY: 8 }, adjustments: { brightness: .2, contrast: -.1, saturation: .4, blur: .02 }, x: 10, y: 10, scaleX: 1, scaleY: 1, angle: 0 },
    { id: "type", kind: "text", text: "PLAY", color: "#173e39", fontSize: 40, font: "anton", bold: true, letterSpacing: 40, outline: "#ffffff", outlineWidth: 2, x: 10, y: 10, scaleX: 1, scaleY: 1, angle: 0 },
    { id: "stroke", kind: "drawing", pathData: "M 0 0 Q 10 20 30 30", stroke: "#173e39", strokeWidth: 8, opacity: .45, x: 10, y: 10, scaleX: 1, scaleY: 1, angle: 0 },
  );
  const parsed = studioLayoutSchema.parse(layout);
  const reopened = studioLayoutSchema.parse(JSON.parse(JSON.stringify(parsed)));
  assert.equal(parsed.surfaces[0].layers[0].kind, "shape");
  assert.equal(parsed.surfaces[0].layers[1].kind, "image");
  assert.equal(parsed.surfaces[0].layers[2].kind, "text");
  assert.equal(parsed.surfaces[0].layers[1].kind === "image" && parsed.surfaces[0].layers[1].mask, "circle");
  assert.equal(reopened.surfaces[0].layers[3].kind, "drawing");
  assert.equal(reopened.surfaces[0].layers[3].opacity, .45);
  const stroke = reopened.surfaces[0].layers[3];
  assert.equal(stroke.kind, "drawing");
  assert.deepEqual(stroke.kind === "drawing" && stroke.brush, undefined); // prior freehand documents retain their pencil appearance
  const unsafePath = structuredClone(layout) as { surfaces: { layers: { pathData?: string }[] }[] };
  unsafePath.surfaces[0].layers[3].pathData = "<svg onload=alert(1)>";
  assert.equal(studioLayoutSchema.safeParse(unsafePath).success, false);
  const invalid = structuredClone(layout) as { surfaces: { layers: { adjustments?: unknown }[] }[] };
  invalid.surfaces[0].layers[1].adjustments = { brightness: 4 };
  assert.equal(studioLayoutSchema.safeParse(invalid).success, false);
});

test("drawing brush identity and opacity survive save/reopen with stable built-in behavior", () => {
  assert.deepEqual(STUDIO_DRAW_BRUSHES.map(({ id }) => id), ["pencil", "marker", "dashed"]);
  assert.equal(drawingDashPattern("pencil", 8), undefined);
  assert.equal(drawingDashPattern("marker", 8), undefined);
  assert.deepEqual(drawingDashPattern("dashed", 8), [13.6, 9.2]);
  const layout = studioLayoutSchema.parse({ ...base, surfaces: [{ ...base.surfaces[0], layers: [
    { id: "marker-stroke", kind: "drawing", pathData: "M 0 0 Q 10 20 30 30", stroke: "#173e39", strokeWidth: 16, brush: "marker", opacity: 0.42, x: 10, y: 10, scaleX: 1, scaleY: 1, angle: 0 },
    { id: "dotted-stroke", kind: "drawing", pathData: "M 0 0 Q 10 20 30 30", stroke: "#173e39", strokeWidth: 6, brush: "dashed", x: 10, y: 10, scaleX: 1, scaleY: 1, angle: 0 },
  ] }] });
  const reopened = studioLayoutSchema.parse(JSON.parse(JSON.stringify(layout)));
  assert.deepEqual(reopened.surfaces[0].layers.map((layer) => layer.kind === "drawing" ? layer.brush : undefined), ["marker", "dashed"]);
  assert.equal(reopened.surfaces[0].layers[0].kind === "drawing" && reopened.surfaces[0].layers[0].opacity, 0.42);
  assert.equal(studioLayoutSchema.safeParse({ ...layout, surfaces: [{ ...layout.surfaces[0], layers: [{ ...layout.surfaces[0].layers[0], kind: "drawing", brush: "airbrush" }] }] }).success, false);
});

test("stylus pressure changes persisted brush segments with mouse/touch fallback and bounded samples", () => {
  assert.equal(pointerPressure({ pointerType: "pen", pressure: 0.2 }), 0.2);
  assert.equal(pointerPressure({ pointerType: "mouse", pressure: 0.9 }), 0.5);
  assert.equal(pointerPressure({ pointerType: "touch", pressure: 0.8 }), 0.5);
  const light = pressureSegment({ x: 0, y: 0, pressure: 0.2 }, { x: 8, y: 0, pressure: 0.2 }, 10, "pencil");
  const firm = pressureSegment({ x: 0, y: 0, pressure: 0.9 }, { x: 8, y: 0, pressure: 0.9 }, 10, "pencil");
  assert.ok(firm.width > light.width);
  assert.ok(pressureSegment({ x: 0, y: 0, pressure: 0.9 }, { x: 8, y: 0, pressure: 0.9 }, 10, "marker").opacity > pressureSegment({ x: 0, y: 0, pressure: 0.2 }, { x: 8, y: 0, pressure: 0.2 }, 10, "marker").opacity);
  assert.equal(compactPressureSamples(Array.from({ length: 500 }, (_, x) => ({ x, y: x / 2, pressure: x / 500 }))).length, 240);
  const layout = studioLayoutSchema.parse({ ...base, surfaces: [{ ...base.surfaces[0], layers: [
    { id: "pressed", kind: "drawing", pathData: "M 0 0 Q 10 20 30 30", stroke: "#173e39", strokeWidth: 10, brush: "pencil", pressurePoints: [{ x: 0, y: 1, pressure: .2 }, { x: 14, y: 8, pressure: .9 }], x: 40, y: 60, scaleX: 1, scaleY: 1, angle: 0 },
  ] }] });
  const reopened = studioLayoutSchema.parse(JSON.parse(JSON.stringify(layout)));
  assert.deepEqual(reopened.surfaces[0].layers[0].kind === "drawing" && reopened.surfaces[0].layers[0].pressurePoints, [{ x: 0, y: 1, pressure: .2 }, { x: 14, y: 8, pressure: .9 }]);
});

test("reusable texture brush presets retain provenance and artwork snapshots across reopen", () => {
  assert.ok(STUDIO_DRAW_TEXTURES.length >= 2);
  for (const texture of STUDIO_DRAW_TEXTURES) assert.ok(texture.source && texture.license);
  const preset = studioBrushPresetSchema.parse({ id: "local-1", name: "Soft weave", baseBrush: "marker", textureId: "sweetoh-woven", textureScale: 1.4, pressureMode: "size-opacity" });
  assert.equal(studioBrushPresetSchema.safeParse({ ...preset, textureId: "remote-image-url" }).success, false);
  assert.ok(pressureSegment({ x: 0, y: 0, pressure: .9 }, { x: 8, y: 0, pressure: .9 }, 10, "marker", preset).width > 10);
  const layout = studioLayoutSchema.parse({ ...base, surfaces: [{ ...base.surfaces[0], layers: [
    { id: "textured-stroke", kind: "drawing", pathData: "M 0 0 Q 10 20 30 30", stroke: "#173e39", strokeWidth: 10, brush: "marker", brushPreset: preset, pressurePoints: [{ x: 1, y: 2, pressure: .2 }, { x: 12, y: 18, pressure: .9 }], x: 40, y: 60, scaleX: 1, scaleY: 1, angle: 0 },
  ] }] });
  const reopened = studioLayoutSchema.parse(JSON.parse(JSON.stringify(layout)));
  assert.deepEqual(reopened.surfaces[0].layers[0].kind === "drawing" && reopened.surfaces[0].layers[0].brushPreset, preset);
  assert.deepEqual(reopened.surfaces[0].layers[0].kind === "drawing" && reopened.surfaces[0].layers[0].pressurePoints?.map(({ pressure }) => pressure), [.2, .9]);
});

test("editor command boundary rejects unvetted resources and malformed actions", () => {
  assert.equal(studioEditorCommandSchema.safeParse({ type: "add_graphic", assetKey: STUDIO_ASSETS[0].id }).success, true);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "add_graphic", assetKey: "remote.svg" }).success, false);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "add_text", text: "" }).success, false);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "add_background", color: "#173e39" }).success, true);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "add_background", color: "url(remote)" }).success, false);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "delete", productId: "other" }).success, false);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "set_image_adjustment", field: "brightness", value: 0.3 }).success, true);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "set_image_adjustment", field: "blur", value: 2 }).success, false);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "set_image_adjustment", field: "blur", value: -.1 }).success, false);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "move", dx: 12, dy: -8 }).success, true);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "resize", width: 120, height: 60, keepRatio: true }).success, true);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "set_shape_gradient", from: "#ef476f", to: "#ffd166" }).success, true);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "set_image_mask", mask: "circle" }).success, true);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "set_shadow", enabled: true, blur: 22 }).success, true);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "crop_image", x: 0, y: 0, width: 250, height: 250 }).success, true);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "crop_image", x: -1, y: 0, width: 250, height: 250 }).success, false);
});

test("mockup templates require versioned identity and documented photo rights", () => {
  const template = { id: "sample-v1", version: 1, blankId: "blank-1", position: "front", photo: { reference: "photo-id", rights: "documented_permission", attribution: "Original SweetOh photo" }, quad: [{x:.2,y:.2},{x:.8,y:.2},{x:.8,y:.8},{x:.2,y:.8}] };
  assert.equal(mockupTemplateSchema.safeParse(template).success, true);
  assert.equal(mockupTemplateSchema.safeParse({ ...template, photo: { ...template.photo, rights: "unknown" } }).success, false);
  assert.equal(mockupTemplateSchema.safeParse({ ...template, quad: [{x:-1,y:0}, ...template.quad.slice(1)] }).success, false);
});

test("AI-facing canvas state is a validated read-only serializable snapshot", () => {
  const layout = studioLayoutSchema.parse({ ...base, surfaces: [{ ...base.surfaces[0], layers: [{ id: "t1", kind: "text", text: "Hello", color: "#173e39", fontSize: 48, x: 22, y: 30, scaleX: 1, scaleY: 1, angle: 0 }] }] });
  const state = buildStudioEditorState(layout, "front", ["t1"], 7);
  assert.equal(state.revision, 7);
  assert.equal(state.layers[0].name, "Hello");
  assert.deepEqual(state.selectedLayerIds, ["t1"]);
  assert.doesNotThrow(() => JSON.stringify(state));
  assert.throws(() => buildStudioEditorState(layout, "missing", [], 0));
});

test("assistant asset search returns only vetted, provenance-labelled Studio resources", () => {
  const results = findStudioAssets({ query: "ocean", kind: "any", limit: 10 });
  assert.ok(results.some((asset) => asset.id === "so-wave-v1"));
  assert.ok(results.every((asset) => asset.source && asset.license));
  assert.equal(studioAssetSearchSchema.safeParse({ query: "x", limit: 500 }).success, false);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "set_text_style", font: "made-up-font" }).success, false);
  assert.equal(studioEditorProposalSchema.safeParse({ summary: "Darken the selected image", actions: [{ targetLayerIds: ["img"], command: { type: "set_image_adjustment", field: "brightness", value: -.25 } }] }).success, true);
  assert.equal(studioEditorProposalSchema.safeParse({ summary: "Raw mutation", actions: [{ command: { type: "set_raw_canvas", value: {} } }] }).success, false);
});

test("font notices are bundled for every font in the Studio", () => {
  for (const font of Object.values(STUDIO_FONT_PROVENANCE)) {
    assert.ok(font.source.startsWith("https://github.com/google/fonts/"));
    assert.match(readFileSync(font.notice, "utf8"), font.license.startsWith("Apache") ? /Apache License/i : /SIL OPEN FONT LICENSE/i);
  }
});
