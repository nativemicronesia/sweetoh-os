import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { emailSignup } from "@/lib/db/schema";
import { ValidationError } from "@/lib/shared/errors";

const emailSchema = z.string().trim().toLowerCase().email();

export async function subscribeEmail(input: {
  ventureId: string;
  email: string;
  source?: string | null;
}) {
  const parsed = emailSchema.safeParse(input.email);

  if (!parsed.success) {
    throw new ValidationError("Enter a valid email address.");
  }

  const db = getDb();

  const [row] = await db
    .insert(emailSignup)
    .values({
      ventureId: input.ventureId,
      email: parsed.data,
      source: input.source ?? null,
    })
    .onConflictDoNothing({
      target: [emailSignup.ventureId, emailSignup.email],
    })
    .returning();

  return row ?? null;
}
