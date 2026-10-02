import assert from "node:assert/strict";
import test from "node:test";
import { buildPlan, encodePlan, parsePlanBody, planText, WORKFLOWS } from "../lib/domains/skink/workflows";

test("every workflow step has a job and a result, and ids are unique per workflow", () => {
  for (const w of WORKFLOWS) {
    assert.ok(w.steps.length >= 6, w.id);
    assert.equal(new Set(w.steps.map((s) => s.id)).size, w.steps.length, w.id);
    for (const s of w.steps) assert.ok(s.title && s.outcome && s.job, `${w.id}/${s.id}`);
  }
});

test("steps go to the creator's own tool first, Studio for product jobs, Skink otherwise", () => {
  const withTools = buildPlan("first-product", ["kittl", "gemini", "etsy"])!;
  const by = Object.fromEntries(withTools.steps.map((s) => [s.id, s]));
  assert.equal(by.artwork.where, "own-tool");
  assert.equal(by.artwork.tool, "kittl");
  assert.equal(by.niche.tool, "gemini");
  assert.equal(by.sell.tool, "etsy");
  assert.equal(by.fit.where, "studio");
  assert.equal(by.mockups.where, "studio");
  assert.equal(by.listing.where, "skink");
  assert.ok(withTools.ownToolSteps >= 3);
  const bare = buildPlan("first-product", [])!;
  assert.equal(bare.ownToolSteps, 0);
  assert.equal(bare.steps.find((s) => s.id === "artwork")!.where, "skink");
});

test("progress round-trips through the stored memory text and picks the next step", () => {
  const body = encodePlan("collection", "island sunsets; for tees", ["niche", "concept"]);
  assert.ok(body.length < 600);
  const parsed = parsePlanBody(body)!;
  assert.equal(parsed.workflowId, "collection");
  assert.deepEqual(parsed.done, ["niche", "concept"]);
  assert.ok(!parsed.goal.includes(";"));
  const plan = buildPlan(parsed.workflowId, ["canva"], parsed.goal, parsed.done)!;
  assert.equal(plan.next!.id, "artwork");
  assert.match(planText(plan), /NEXT STEP: Make the hero artwork in Canva/);
  assert.match(planText(plan), /\[done\] 1\./);
});

test("bad or hostile stored text is ignored safely", () => {
  assert.equal(parsePlanBody("wf=nope; goal=x; done="), null);
  assert.equal(parsePlanBody("hello"), null);
  assert.deepEqual(parsePlanBody("wf=first-product; goal=x; done=niche,../etc,bogus")!.done, ["niche"]);
  assert.equal(buildPlan("nope", []), null);
  assert.ok(encodePlan("first-product", "x".repeat(5000), []).length < 400);
});

test("a finished plan says so", () => {
  const all = buildPlan("seasonal-drop", [], "", WORKFLOWS.find((w) => w.id === "seasonal-drop")!.steps.map((s) => s.id))!;
  assert.equal(all.next, null);
  assert.match(planText(all), /All steps are done/);
});

test("Skink is wired to plan workflows and tells creators to favor their own tools", async () => {
  const { readFileSync } = await import("node:fs");
  const agent = readFileSync("lib/domains/skink/agent.ts", "utf8");
  assert.match(agent, /name: "workflow_plan"/);
  assert.match(agent, /case "workflow_plan"/);
  assert.match(agent, /call workflow_plan first/);
  assert.match(agent, /name: "tool_guide"/);
  for (const w of WORKFLOWS) assert.ok(agent.includes("WORKFLOWS.map"), w.id);
});
