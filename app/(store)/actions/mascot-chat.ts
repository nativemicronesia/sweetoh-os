"use server";

import { answerCustomerQuestion } from "@/lib/integrations/ai/openai";
import { getSessionUser } from "@/lib/domains/identity/service";

export type MascotChatTurn = { role: "user" | "assistant"; content: string };

export async function askMascot(input: {
  message: string;
  history?: MascotChatTurn[];
}): Promise<{ reply: string } | { error: string }> {
  const session = await getSessionUser();
  if (!session || (session.role !== "partner" && session.role !== "owner")) return { reply: "Welcome to Sweet’Oh! Browse our collections to see what’s available. Our customer design studio is coming later." };
  const message = input.message.trim();
  if (!message) return { error: "Ask me something!" };

  const reply = await answerCustomerQuestion({
    message,
    history: input.history ?? [],
  });

  if (!reply) {
    return { error: "Sweet'Oh AI is taking a break — try again in a bit." };
  }

  return { reply };
}
