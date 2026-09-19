"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { getShopRequest, setAcceptingRequests, updateShopRequest } from "@/lib/domains/creator/print-requests";

const PATH = "/partner/creator-requests";

function done(message: string, kind: "success" | "error" = "success"): never {
  revalidatePath(PATH);
  revalidatePath("/partner");
  redirect(`${PATH}?${kind}=${encodeURIComponent(message)}`);
}

export async function setAcceptingAction(form: FormData) {
  await requirePartnerWorkspace();
  const on = form.get("accepting") === "on";
  await setAcceptingRequests(on);
  done(on ? "You're taking creator print requests." : "Creator print requests are paused. Creators will be told to use Printify for now.");
}

export async function quoteRequestAction(form: FormData) {
  const session = await requirePartnerWorkspace();
  const id = z.string().uuid().parse(form.get("id"));
  const dollars = Number(String(form.get("quote") ?? "").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(dollars) || dollars < 1 || dollars > 50000) done("Enter the total price for this order, e.g. 240.", "error");
  const note = String(form.get("note") ?? "").trim().slice(0, 1000) || null;
  const { request } = await getShopRequest(session.ventureId, id);
  if (!["new", "quoted"].includes(request.status)) done("This request has already moved on.", "error");
  await updateShopRequest(session.ventureId, id, { status: "quoted", quoteCents: Math.round(dollars * 100), partnerNote: note });
  done("Quote sent. The creator can pay it from their Studio.");
}

export async function declineRequestAction(form: FormData) {
  const session = await requirePartnerWorkspace();
  const id = z.string().uuid().parse(form.get("id"));
  const note = String(form.get("note") ?? "").trim().slice(0, 1000) || "Sweet'Oh can't take this one right now.";
  const { request } = await getShopRequest(session.ventureId, id);
  if (!["new", "quoted"].includes(request.status)) done("This request has already moved on.", "error");
  await updateShopRequest(session.ventureId, id, { status: "declined", partnerNote: note });
  done("Request declined.");
}

export async function advanceRequestAction(form: FormData) {
  const session = await requirePartnerWorkspace();
  const id = z.string().uuid().parse(form.get("id"));
  const next = z.enum(["in_production", "shipped"]).parse(form.get("status"));
  const { request } = await getShopRequest(session.ventureId, id);
  const allowed = next === "in_production" ? request.status === "paid" : request.status === "in_production";
  if (!allowed) done("That step isn't available yet.", "error");
  await updateShopRequest(session.ventureId, id, { status: next });
  done(next === "shipped" ? "Marked as shipped." : "Marked as printing.");
}
