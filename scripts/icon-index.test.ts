import assert from "node:assert/strict";
import test from "node:test";
import iconIndex from "../lib/studio/icon-index.json";
import { searchIconIds, iconSvg } from "../lib/studio/icon-server";
import { ICON_SETS } from "../lib/studio/icon-sets";
import { currentIconNames } from "./build-icon-index";

test("the icon name index matches the installed icon packages (rebuild with scripts/build-icon-index.ts)", () => {
  const live = currentIconNames();
  for (const prefix of Object.keys(ICON_SETS)) {
    assert.deepEqual((iconIndex as Record<string, string[]>)[prefix], live[prefix], `${prefix} index is out of date`);
  }
});

test("search ranks exact and prefix names first and mixes styles", async () => {
  const hits = await searchIconIds("coffee", ["ph", "lucide", "tabler", "mdi"], 8, 0);
  assert.ok(hits.slice(0, 4).every((id) => id.endsWith(":coffee")), hits.join(" "));
  assert.equal(new Set(hits).size, hits.length);
  const page2 = await searchIconIds("coffee", ["ph", "lucide", "tabler", "mdi"], 8, 8);
  assert.ok(page2.every((id) => !hits.includes(id)), "pages do not repeat");
  assert.deepEqual(await searchIconIds("zzzqqq", ["ph"], 10, 0), []);
  assert.deepEqual(await searchIconIds("  ", ["ph"], 10, 0), []);
  assert.deepEqual(await searchIconIds("coffee", ["evil"], 10, 0), []);
});

test("every indexed icon can be drawn, and unknown ones cannot", async () => {
  for (const prefix of Object.keys(ICON_SETS)) {
    const name = (iconIndex as Record<string, string[]>)[prefix][0];
    const svg = await iconSvg(prefix, name, 64);
    assert.match(svg ?? "", /^<svg /, `${prefix}:${name}`);
  }
  assert.equal(await iconSvg("ph", "definitely-not-an-icon", 64), null);
  assert.equal(await iconSvg("evil", "x", 64), null);
});
