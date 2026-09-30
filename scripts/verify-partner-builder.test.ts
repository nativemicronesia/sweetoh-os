import test from "node:test";
import assert from "node:assert/strict";
import { groundResearch, safeSourceUrl, builderRecord } from "../lib/domains/intelligence/product-research-schema";
import { assertBuilderRole } from "../lib/domains/intelligence/partner-builder";
import { publishPartnerDraft, assertPartnerPublishReadyStatus, unpublishPartnerProduct, assertProductCanBeUnpublished } from "../lib/domains/catalog/partner-listings";
import { updatePartnerJobStatus } from "../lib/domains/fulfillment/partner-jobs";
import { buildFulfillmentJobStatusUpdate } from "../lib/domains/fulfillment/service";
import type { SessionUser } from "../lib/domains/identity/types";
import { parsePartnerProductFields, validatePartnerProductFields } from "../lib/domains/catalog/product-form";
import { colorHex, defaultUpcharges, sortSizes, variantOptionsSchema } from "../lib/domains/catalog/variants";
import { resolveInactiveDraftStatus } from "../lib/domains/catalog/draft-status";
import { partnerProductNextAction, partnerProductWorkspaceState } from "../lib/domains/catalog/partner-product-workspace";
import { printRegionSchema } from "../lib/domains/catalog/studio-layout";

const url = "https://manufacturer.example/products/tee";
const research = { title: "Cotton tee", description: "A plain tee.", category: "apparel", identity: "matched", brand: "Example", model: "4000", evidence: "Visible label", specifications: [{ label: "Material", value: "Cotton", sourceUrl: url }], sources: [{ title: "Manufacturer", url }], unknowns: [], mockupPrompt: "A plain tee" };

test("status-only fulfillment updates preserve existing tracking and notes", () => {
  const updatedAt = new Date("2026-01-01T00:00:00.000Z");
  assert.deepEqual(buildFulfillmentJobStatusUpdate({ status: "shipped" }, updatedAt), {
    status: "shipped",
    updatedAt,
  });
  assert.deepEqual(buildFulfillmentJobStatusUpdate({ status: "shipped", trackingUrl: null, notes: "" }, updatedAt), {
    status: "shipped",
    updatedAt,
    trackingUrl: null,
    notes: "",
  });
});

test("research retains retrieved sources and their specifications", () => {
  const result = groundResearch(research, [url]);
  assert.equal(result.identity, "matched"); assert.equal(result.specifications.length, 1);
});
test("invented sources cannot establish product identity or specifications", () => {
  const result = groundResearch(research, []);
  assert.equal(result.identity, "unknown"); assert.deepEqual(result.sources, []); assert.deepEqual(result.specifications, []);
  assert.ok(result.unknowns.length);
});
test("a specification needs its own retrieved evidence", () => {
  const result = groundResearch({ ...research, specifications: [{ label: "Size", value: "XXL", sourceUrl: "https://invented.example/size" }] }, [url]);
  assert.deepEqual(result.specifications, []);
});
test("unsafe source protocols and local references are rejected", () => {
  for (const value of ["javascript:alert(1)", "http://example.com", "https://localhost/a", "https://127.0.0.1/a", "https://user:pass@example.com", "https://printer.local"]) assert.equal(safeSourceUrl(value), false);
  assert.equal(safeSourceUrl(url), true);
});
test("malformed AI output is rejected", () => {
  assert.throws(() => groundResearch({ ...research, category: "invented" }, [url]));
  assert.equal(builderRecord({ title: "Legacy AI draft" }), null);
});
test("partner prices use dollars without silently accepting fractional cents", () => {
  const form = new FormData(); form.set("name", "Tee"); form.set("category", "apparel"); form.set("priceDollars", "29.95");
  const parsed = parsePartnerProductFields(form);
  assert.equal(parsed.priceCents, 2995); validatePartnerProductFields(parsed);
  form.set("priceDollars", "1.999"); assert.throws(() => parsePartnerProductFields(form), /decimal/);
  form.set("priceDollars", "-4"); assert.throws(() => parsePartnerProductFields(form), /dollars/);
});
test("a private new-product draft can wait for real pricing, while publication still needs a price", () => {
  const form = new FormData(); form.set("name", "First real item"); form.set("category", "custom"); form.set("priceDollars", "");
  const parsed = parsePartnerProductFields(form);
  assert.equal(parsed.priceCents, 0);
  assert.doesNotThrow(() => validatePartnerProductFields(parsed));
  assert.throws(() => printRegionSchema.parse({ id: "engraving-area", name: "Front engraving", productionMethod: "dtf", bounds: { x: 0, y: 0, width: 1, height: 1 }, shape: "rectangle" }));
});
test("production regions preserve the confirmed sublimation and engraving methods", () => {
  const base = { id: "front-area", name: "Front print", bounds: { x: 0, y: 0, width: 1, height: 1 }, shape: "rectangle" as const };
  assert.equal(printRegionSchema.parse({ ...base, productionMethod: "sublimation" }).productionMethod, "sublimation");
  assert.equal(printRegionSchema.parse({ ...base, productionMethod: "engraving" }).productionMethod, "engraving");
});
test("partner product edits retain a selected production asset and catalog-compatible options", () => {
  const assetId = "00000000-0000-4000-8000-000000000001";
  const form = new FormData(); form.set("name", "Studio tee"); form.set("category", "apparel"); form.set("priceDollars", "24.00"); form.set("sourceAssetId", assetId);
  assert.equal(parsePartnerProductFields(form).sourceAssetId, assetId);
  assert.equal(parsePartnerProductFields(new FormData()).sourceAssetId, undefined);
  const sizes = sortSizes(["XL", "M", "2XL"]);
  assert.deepEqual(sizes, ["M", "XL", "2XL"]);
  assert.deepEqual(variantOptionsSchema.parse({ colors: [{ name: "Black", hex: colorHex("Black") }], sizes, sizeUpchargeCents: defaultUpcharges(sizes) }).sizeUpchargeCents, { "2XL": 200 });
});
test("readiness approval remains private and loses approval when required production data becomes invalid", () => {
  assert.equal(resolveInactiveDraftStatus({ hasAiSession: false, canPublish: true, currentStatus: "draft" }), "draft");
  assert.equal(resolveInactiveDraftStatus({ hasAiSession: false, canPublish: true, currentStatus: "approved" }), "approved");
  assert.equal(resolveInactiveDraftStatus({ hasAiSession: false, canPublish: false, currentStatus: "approved" }), "needs_work");
});
test("partner publication accepts only the approved private status; creators cannot publish", async () => {
  assert.doesNotThrow(() => assertPartnerPublishReadyStatus("approved"));
  for (const status of ["draft", "needs_work", "pending_review", "published"] as const) {
    assert.throws(() => assertPartnerPublishReadyStatus(status), /Mark this product ready/);
  }
  const creator = { role: "creator", ventureId: "unused", appUser: { id: "unused" } } as SessionUser;
  await assert.rejects(() => publishPartnerDraft(creator, "unused"), /Sweet'Oh partner approves listings/);
});
test("creators build only in their own workspace and cannot unpublish shop products or change fulfillment", async () => {
  const creator = { role: "creator", ventureId: "unused", appUser: { id: "unused" } } as SessionUser;
  // Blanks are scoped to session.ventureId, which for a creator is their private workspace.
  assert.doesNotThrow(() => assertBuilderRole(creator));
  await assert.rejects(() => unpublishPartnerProduct(creator, "unused"), /partner or owner/);
  await assert.rejects(() => updatePartnerJobStatus(creator, { jobId: "unused", status: "shipped" }), /partner or owner/);
});
test("unpublishing accepts only an active published listing", () => {
  assert.doesNotThrow(() => assertProductCanBeUnpublished({ active: true, draftStatus: "published" }));
  assert.throws(() => assertProductCanBeUnpublished({ active: false, draftStatus: "draft" }), /Only your own published products/);
  assert.throws(() => assertProductCanBeUnpublished({ active: false, draftStatus: "approved" }), /Only your own published products/);
});
test("partner product lifecycle groups map to existing next-step routes", () => {
  const states = [
    [{ active: false, draftStatus: "needs_work", isBlank: false }, "private"],
    [{ active: false, draftStatus: "approved", isBlank: false }, "ready"],
    [{ active: true, draftStatus: "published", isBlank: false }, "live"],
    [{ active: false, draftStatus: "pending_review", isBlank: false }, "review"],
    [{ active: false, draftStatus: "draft", isBlank: true }, "blank"],
  ] as const;
  for (const [input, expected] of states) assert.equal(partnerProductWorkspaceState(input), expected);
  assert.deepEqual(partnerProductNextAction({ id: "p1", state: "private", confirmedBlank: false }), { href: "/partner/review/p1", label: "Continue editing" });
  assert.deepEqual(partnerProductNextAction({ id: "p1", state: "ready", confirmedBlank: false }), { href: "/partner/review/p1", label: "Review readiness & publish" });
  assert.deepEqual(partnerProductNextAction({ id: "p1", state: "live", confirmedBlank: false }), { href: "/partner/review/p1", label: "Inspect live & manage" });
  assert.deepEqual(partnerProductNextAction({ id: "p1", state: "blank", confirmedBlank: true }), { href: "/partner/canvas?blank=p1", label: "Continue designing" });
});
