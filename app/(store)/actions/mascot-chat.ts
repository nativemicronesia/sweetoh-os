"use server";

import { answerCustomerQuestion } from "@/lib/integrations/ai/openai";

export type MascotChatTurn = { role: "user" | "assistant"; content: string };

export async function askMascot(input: {
  message: string;
  history?: MascotChatTurn[];
}): Promise<{ reply: string } | { error: string }> {
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
