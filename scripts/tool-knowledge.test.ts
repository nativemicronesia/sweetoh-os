import assert from "node:assert/strict";
import test from "node:test";
import { TOOLS } from "../lib/domains/skink/handoff";
import { guideText, knowledgeFor, recommendFor, TOOL_KNOWLEDGE } from "../lib/domains/skink/tool-knowledge";

test("every tool Skink can hand work to has real knowledge, except 'other'", () => {
  for (const tool of TOOLS.filter((t) => t.id !== "other")) {
    const k = knowledgeFor(tool.id);
    assert.ok(k, `${tool.id} has no knowledge entry`);
    assert.ok(k.strengths.length >= 1 && k.limits.length >= 1 && k.recipes.length >= 1, tool.id);
    assert.ok(k.confirmOnSite.length >= 1, `${tool.id} must tell creators what to confirm on the site`);
    for (const recipe of k.recipes) assert.ok(recipe.steps.length >= 3, `${tool.id}/${recipe.id} needs real steps`);
  }
  assert.equal(new Set(TOOL_KNOWLEDGE.map((k) => k.id)).size, TOOL_KNOWLEDGE.length);
  assert.ok(knowledgeFor("kittl"), "Kittl is covered");
});

test("design tools say how to export for Studio", () => {
  for (const tool of TOOLS.filter((t) => t.kind === "design" && t.id !== "capcut")) assert.ok(knowledgeFor(tool.id)?.exportAdvice, tool.id);
});

test("knowledge never states prices, fees or policy numbers", () => {
  const text = JSON.stringify(TOOL_KNOWLEDGE);
  assert.doesNotMatch(text, /\$\s?\d|\d\s?%|per month|\/mo\b/i);
});

test("knowledge is reviewed on schedule: this fails after a reviewBy date passes", () => {
  const now = new Date().toISOString().slice(0, 10);
  for (const k of TOOL_KNOWLEDGE) assert.ok(k.reviewBy > now, `${k.id} knowledge is past its review date ${k.reviewBy}; re-check it and move the date`);
});

test("recommendations favor the tool the creator already has, and Studio only for product jobs", () => {
  assert.deepEqual(recommendFor("typography-art", ["kittl", "canva"]), { where: "own-tool", tool: "kittl", why: "You already have it, so this costs no Sweet'Oh credits." });
  assert.equal(recommendFor("typography-art", ["canva"]).tool, "canva");
  assert.equal(recommendFor("print-fit", ["canva"]).where, "studio");
  assert.equal(recommendFor("mockups", []).where, "studio");
  assert.equal(recommendFor("research", []).where, "skink");
  assert.equal(recommendFor("video", ["capcut"]).where, "own-tool");
});

test("a guide leads with steps for the goal and always points back to Studio", () => {
  const guide = guideText("kittl", "badge for a tee")!;
  assert.match(guide, /badge/i);
  assert.match(guide, /Bring it back to Studio/);
  assert.match(guide, /confirm on the tool's own site/);
  assert.equal(guideText("nope"), null);
});

test("Picsart is covered: photo jobs go to it first, and its steps lead back to Studio", () => {
  assert.ok(TOOLS.some((t) => t.id === "picsart"));
  assert.equal(recommendFor("photo-cutout", ["picsart", "canva"]).tool, "picsart");
  assert.equal(recommendFor("photo-edit", ["photoshop", "picsart"]).tool, "picsart");
  assert.equal(recommendFor("photo-cutout", []).where, "skink");
  const guide = guideText("picsart", "cutout sticker from a photo")!;
  assert.match(guide, /remove the background/i);
  assert.match(guide, /die-cut/i);
  assert.match(guide, /watermark/i);
});
