import assert from "node:assert/strict";
import test from "node:test";
import { studioEditorCommandSchema } from "../lib/studio/editor-commands";
import { studioLayoutSchema } from "../lib/domains/catalog/studio-layout";
import { TEXT_WARP_PRESETS, TEXT_EFFECT_CONTROLS, TEXT_EFFECT_KINDS, TEXT_EFFECT_NAMES, TEXT_EFFECT_PRESETS } from "../lib/studio/text-effects";

test("every text effect kind has a name, controls and at least two presets", () => {
  for (const kind of TEXT_EFFECT_KINDS) {
    assert.ok(TEXT_EFFECT_NAMES[kind], kind);
    assert.ok(TEXT_EFFECT_CONTROLS[kind].amount, kind);
    assert.ok(TEXT_EFFECT_PRESETS.filter((preset) => preset.effect.kind === kind).length >= 1, kind);
  }
  assert.ok(TEXT_EFFECT_PRESETS.length >= 30);
  assert.equal(new Set(TEXT_EFFECT_PRESETS.map((preset) => preset.id)).size, TEXT_EFFECT_PRESETS.length);
});

test("effect presets are valid editor commands and valid saved text layers", () => {
  for (const preset of TEXT_EFFECT_PRESETS) {
    assert.ok(studioEditorCommandSchema.safeParse({ type: "set_text_effect", effect: preset.effect, color: preset.face }).success, preset.id);
    const layout = { version: 1, surfaces: [{ id: "design", name: "Design", assetId: null, position: "design", area: { x: 0, y: 0, width: 1, height: 1 }, layers: [{ id: "t1", kind: "text", text: "Hi", x: 0, y: 0, scaleX: 1, scaleY: 1, angle: 0, color: preset.face, fontSize: 48, effect: preset.effect }] }] };
    assert.ok(studioLayoutSchema.safeParse(layout).success, preset.id);
  }
  assert.ok(studioEditorCommandSchema.safeParse({ type: "set_text_effect", effect: null }).success);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "set_text_effect", effect: { kind: "nope" } }).success, false);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "set_text_effect", effect: { kind: "neon", color: "red" } }).success, false);
});

test("text warps are valid commands and saved layer fields", () => {
  assert.ok(TEXT_WARP_PRESETS.length >= 6);
  for (const preset of TEXT_WARP_PRESETS) {
    assert.ok(studioEditorCommandSchema.safeParse({ type: "set_text_warp", warp: preset.warp }).success, preset.id);
    const layout = { version: 1, surfaces: [{ id: "design", name: "Design", assetId: null, position: "design", area: { x: 0, y: 0, width: 1, height: 1 }, layers: [{ id: "t1", kind: "text", text: "Hi", x: 0, y: 0, scaleX: 1, scaleY: 1, angle: 0, color: "#101828", fontSize: 48, warp: preset.warp }] }] };
    assert.ok(studioLayoutSchema.safeParse(layout).success, preset.id);
  }
  assert.ok(studioEditorCommandSchema.safeParse({ type: "set_text_warp", warp: null }).success);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "set_text_warp", warp: { kind: "wave", amount: 400 } }).success, false);
});
