import test from "node:test";
import assert from "node:assert/strict";
import { groundResearch, safeSourceUrl, builderRecord } from "../lib/domains/intelligence/product-research-schema";
import { assertBuilderRole } from "../lib/domains/intelligence/partner-builder";
import { unpublishPartnerProduct } from "../lib/domains/catalog/partner-listings";
import { updatePartnerJobStatus } from "../lib/domains/fulfillment/partner-jobs";
import type { SessionUser } from "../lib/domains/identity/types";
import { parsePartnerProductFields, validatePartnerProductFields } from "../lib/domains/catalog/product-form";

const url = "https://manufacturer.example/products/tee";
const research = { title: "Cotton tee", description: "A plain tee.", category: "apparel", identity: "matched", brand: "Example", model: "4000", evidence: "Visible label", specifications: [{ label: "Material", value: "Cotton", sourceUrl: url }], sources: [{ title: "Manufacturer", url }], unknowns: [], mockupPrompt: "A plain tee" };

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
test("creators cannot use partner research, unpublish products or change fulfillment", async () => {
  const creator = { role: "creator", ventureId: "unused", appUser: { id: "unused" } } as SessionUser;
  assert.throws(() => assertBuilderRole(creator), /partner or owner/);
  await assert.rejects(() => unpublishPartnerProduct(creator, "unused"), /partner or owner/);
  await assert.rejects(() => updatePartnerJobStatus(creator, { jobId: "unused", status: "shipped" }), /partner or owner/);
});
