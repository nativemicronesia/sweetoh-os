import assert from "node:assert/strict";
import test from "node:test";
import {
  canReadPrivateProductMedia,
  isPublishedProductMedia,
  productMediaAccessUrl,
} from "../lib/domains/catalog/product-media-access";

const product = {
  id: "p1",
  ventureId: "v1",
  active: false,
  draftStatus: "draft",
  brandVentureSlug: "sweetoh",
};
const media = { assetId: "private-source-1", objectKey: null };

test("private draft media denies anonymous access and requires venture-scoped authorization", () => {
  assert.equal(isPublishedProductMedia(product, media, "sweetoh"), false);
  assert.equal(canReadPrivateProductMedia({
    role: null, sessionVentureId: null, productVentureId: "v1", ownsDraft: false, draftStatus: "draft",
  }), false);
  assert.equal(canReadPrivateProductMedia({
    role: "partner", sessionVentureId: "v1", productVentureId: "v1", ownsDraft: true, draftStatus: "draft",
  }), true);
  assert.equal(canReadPrivateProductMedia({
    role: "partner", sessionVentureId: "v2", productVentureId: "v1", ownsDraft: true, draftStatus: "draft",
  }), false);
});

test("only published storefront media receives anonymous representation", () => {
  assert.equal(isPublishedProductMedia({ ...product, active: true, draftStatus: "published" }, media, "sweetoh"), true);
  assert.equal(isPublishedProductMedia({ ...product, active: true, draftStatus: "published" }, media, "other-shop"), false);
  assert.equal(isPublishedProductMedia({ ...product, active: true, draftStatus: "approved" }, media, "sweetoh"), false);
  assert.equal(productMediaAccessUrl("media-1"), "/api/storefront/product-media/media-1");
});

test("unpublishing revokes anonymous media access without changing the private source link", () => {
  const published = { ...product, active: true, draftStatus: "published" };
  const privateSourceId = media.assetId;
  assert.equal(isPublishedProductMedia(published, media, "sweetoh"), true);

  const unpublished = { ...published, active: false, draftStatus: "approved" };
  assert.equal(isPublishedProductMedia(unpublished, media, "sweetoh"), false);
  assert.equal(media.assetId, privateSourceId);
  assert.equal(canReadPrivateProductMedia({
    role: "partner", sessionVentureId: "v1", productVentureId: "v1", ownsDraft: true, draftStatus: "approved",
  }), true);
});
