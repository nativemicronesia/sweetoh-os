import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserFast } from "@/lib/domains/identity/service";
import { creditSnapshot, getCreatorProfile, spendCredits } from "@/lib/domains/creator/credits";
import { creditsForUsage, isAiConfigured, resolveModel, tokenLimit } from "@/lib/ai/router";
import { findStudioAssets, studioEditorProposalSchema, studioEditorStateSchema } from "@/lib/studio/editor-commands";
import { CONFIRMED_SHOP_METHODS, KNOWLEDGE_ONLY_METHODS } from "@/lib/domains/production/methods";

const requestSchema = z.object({
  request: z.string().trim().min(4).max(1200),
  state: studioEditorStateSchema,
}).strict();

export async function POST(request: NextRequest) {
  const session = await getSessionUserFast();
  if (!session || !["creator", "partner", "owner"].includes(session.role)) return NextResponse.json({ error: "Sign in to ask SweetOh AI for Studio help." }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "The Studio state or request was invalid." }, { status: 400 });
  if (!isAiConfigured()) return NextResponse.json({ error: "SweetOh AI is not configured." }, { status: 503 });
  const { request: creatorRequest, state } = parsed.data;
  const known = new Set(state.layers.map((layer) => layer.id));
  const layerById = new Map(state.layers.map((layer) => [layer.id, layer]));
  let balance: number | undefined;
  if (session.role === "creator") {
    const profile = await getCreatorProfile(session.appUser.id);
    const snapshot = await creditSnapshot(session.appUser.id, profile);
    balance = snapshot.balance;
    if (balance < 0.2) return NextResponse.json({ error: "You're out of credits this month." }, { status: 402 });
  }
  try {
    const model = resolveModel("chat", "smart");
    const result = await model.client.chat.completions.create({
      model: model.model,
      response_format: { type: "json_object" },
      ...tokenLimit(model, 1200),
      messages: [
        { role: "system", content: `You are SweetOh AI, shared specialized Studio intelligence. You propose atomic edits through the supplied typed command list. You do not execute edits. Confirmed SweetOh shop methods are ${CONFIRMED_SHOP_METHODS.join(" and ")}. ${KNOWLEDGE_ONLY_METHODS.join(", ")} are general knowledge only and never current shop capability. Use only the supplied canvas state and licensed asset search results. For a request to find assets, use add_graphic only with an exact supplied assetKey; available assets are listed below. Prefer short coordinated proposals. For streetwear text, style existing selected text using set_text_style; use only supplied fonts. To group/alignment select IDs with group_selection or align_selection. For darker image, use set_image_adjustment on an existing image selection; if no image is selected, explain in summary that one must be selected and return an empty action list. For sublimation preparation, only use prepare_artwork with an existing print region. Never invent print sizes, product geometry, assets, layers, or unsupported commands. Do not propose undo or redo. Respond as JSON {"summary":"...","actions":[{"targetLayerIds":[],"command":{...}}]}.` },
        { role: "user", content: JSON.stringify({ request: creatorRequest, canvas: state, selectedLayers: state.layers.filter((layer) => state.selectedLayerIds.includes(layer.id)), licensedAssets: findStudioAssets({ query: creatorRequest, kind: "any", limit: 16 }) }) },
      ],
    });
    const content = result.choices[0]?.message?.content;
    if (!content) return NextResponse.json({ error: "SweetOh AI returned an empty proposal." }, { status: 502 });
    const proposal = studioEditorProposalSchema.safeParse(JSON.parse(content));
    if (!proposal.success) return NextResponse.json({ error: "SweetOh AI returned edits the Studio cannot safely apply." }, { status: 502 });
    for (const item of proposal.data.actions) {
      if (item.targetLayerIds.some((id) => !known.has(id))) return NextResponse.json({ error: "The proposal referenced an unknown canvas layer." }, { status: 502 });
      const command = item.command;
      if (command.type === "undo" || command.type === "redo") return NextResponse.json({ error: "History actions must be requested directly by the creator." }, { status: 502 });
      const mutatesLayers = command.type !== "set_layer_flags";
      if (mutatesLayers && item.targetLayerIds.some((id) => layerById.get(id)?.locked || layerById.get(id)?.hidden)) return NextResponse.json({ error: "The proposal targeted a hidden or locked layer." }, { status: 502 });
      if (command.type === "prepare_artwork" && !state.printRegions.some((region) => region.id === command.regionId)) return NextResponse.json({ error: "The proposal referenced an unknown print area." }, { status: 502 });
      if (command.type === "set_text_style" && !item.targetLayerIds.every((id) => state.layers.find((layer) => layer.id === id)?.kind === "text")) return NextResponse.json({ error: "Text styling can only target text layers." }, { status: 502 });
      if (command.type === "set_image_adjustment" && !item.targetLayerIds.every((id) => state.layers.find((layer) => layer.id === id)?.kind === "image")) return NextResponse.json({ error: "Image adjustments can only target image layers." }, { status: 502 });
      if (["group_selection", "ungroup_selection", "align_selection", "distribute_selection"].includes(command.type) && "layerIds" in command && command.layerIds.some((id) => !known.has(id) || layerById.get(id)?.locked || layerById.get(id)?.hidden)) return NextResponse.json({ error: "The proposal referenced an unavailable canvas layer." }, { status: 502 });
    }
    // Empty proposals are useful when the user must select a compatible object first.
    if (session.role === "creator" && balance !== undefined) {
      const credits = creditsForUsage(model.route, result.usage);
      if (credits > 0) await spendCredits({ userId: session.appUser.id, amount: credits, reason: "Studio edit proposal", metadata: { model: result.model }, allowOverdraft: true });
    }
    return NextResponse.json({ proposal: proposal.data, revision: state.revision });
  } catch (error) {
    console.error("studio_editor_proposal_failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "SweetOh AI could not prepare a safe Studio proposal." }, { status: 502 });
  }
}
