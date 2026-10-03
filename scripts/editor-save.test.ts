import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

/**
 * Pressing Save must never do nothing. A background autosave that is already running is
 * skipped, but an explicit Save waits for it and then saves (found in a signed-in run:
 * the click was ignored and a freshly typed name was left behind).
 */
test("an explicit Save waits for an in-flight autosave instead of being dropped", () => {
  const source = readFileSync("app/(partner)/partner/canvas/product-editor.tsx", "utf8");
  const start = source.indexOf("async function saveStandalone(");
  const body = source.slice(start, source.indexOf("async function runStandaloneSave(", start));
  assert.ok(start > 0 && body.length > 50);
  assert.match(body, /if \(saveInFlight\.current\) \{\s*if \(silent\) return;/, "autosave yields, explicit save does not");
  assert.match(body, /await saveInFlight\.current\.catch/, "explicit save waits for the running save");
  assert.match(body, /const run = runStandaloneSave\(silent\)/);
  assert.doesNotMatch(source, /if \(savingRef\.current\) return;/, "the old silent drop is gone");
});

test("a save that waits behind an autosave updates the same design instead of creating a second one", () => {
  const source = readFileSync("app/(partner)/partner/canvas/product-editor.tsx", "utf8");
  assert.match(source, /const designIdRef = useRef<string \| null>\(savedDesignId\)/);
  assert.match(source, /if \(designIdRef\.current\) form\.set\("designId", designIdRef\.current\)/);
  assert.match(source, /designIdRef\.current = result\.saved\.id;/);
  assert.doesNotMatch(source, /if \(designId\) form\.set\("designId", designId\)/, "the stale closure value must not be used");
});
