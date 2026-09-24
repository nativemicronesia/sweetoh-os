"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { draftReply } from "@/lib/domains/inbox/ai-draft";
import { sendFromShop, updateThread } from "@/lib/domains/inbox/service";
import { AppError } from "@/lib/shared/errors";

export type InboxFormState = { error?: string; sent?: boolean; draft?: string } | null;

function problem(error: unknown) {
  return error instanceof AppError ? error.message : "Something went wrong. Try again in a moment.";
}

export async function sendReplyAction(_prev: InboxFormState, form: FormData): Promise<InboxFormState> {
  const session = await requirePartnerWorkspace();
  const threadId = z.string().uuid().optional().parse(form.get("threadId") || undefined);
  let id: string;
  try {
    id = await sendFromShop(session, {
      threadId,
      to: String(form.get("to") ?? ""),
      subject: String(form.get("subject") ?? ""),
      body: String(form.get("body") ?? ""),
    });
  } catch (error) {
    return { error: problem(error) };
  }
  revalidatePath("/partner/inbox");
  if (!threadId) redirect(`/partner/inbox?folder=sent&t=${id}`);
  return { sent: true };
}

export async function draftReplyAction(_prev: InboxFormState, form: FormData): Promise<InboxFormState> {
  const session = await requirePartnerWorkspace();
  const threadId = z.string().uuid().parse(form.get("threadId"));
  try {
    const draft = await draftReply(session, threadId, String(form.get("hint") ?? ""));
    return draft ? { draft } : { error: "Sweet'Oh AI came back empty — try again." };
  } catch (error) {
    return { error: problem(error) };
  }
}

const CHANGE = z.object({
  threadId: z.string().uuid(),
  op: z.enum(["star", "unstar", "archive", "unarchive", "spam", "notspam", "unread", "move"]),
  category: z.enum(["customers", "orders", "services", "other"]).optional(),
  back: z.string().startsWith("/partner/inbox").optional(),
});

export async function threadAction(form: FormData) {
  const session = await requirePartnerWorkspace();
  const { threadId, op, category, back } = CHANGE.parse(Object.fromEntries(form));
  await updateThread(session, threadId, {
    ...(op === "star" && { starred: true }),
    ...(op === "unstar" && { starred: false }),
    ...(op === "archive" && { archived: true }),
    ...(op === "unarchive" && { archived: false }),
    ...(op === "spam" && { spam: true }),
    ...(op === "notspam" && { spam: false }),
    ...(op === "unread" && { unread: true }),
    ...(op === "move" && category && { category }),
  });
  revalidatePath("/partner/inbox");
  revalidatePath("/partner", "layout");
  // Leaving the conversation after archive/spam/unread, like any mail app.
  if (back && ["archive", "spam", "unread"].includes(op)) redirect(back);
}
