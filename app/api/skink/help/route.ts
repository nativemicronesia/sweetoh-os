import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDefaultVenture } from "@/lib/domains/identity/service";
import { getCurrentCustomer } from "@/lib/domains/customers/account";
import { answerShopQuestion } from "@/lib/domains/shop-help/skink-help";

/**
 * Skink in the shop. No AI model behind this — answers come from the shop's
 * own FAQ, product list and (signed in + confirmed) the customer's orders —
 * so it costs nothing to run no matter how many people use it.
 */
const bodySchema = z.object({ message: z.string().trim().min(1).max(500) });

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Type a question first." }, { status: 400 });
  const [venture, shopper] = await Promise.all([getDefaultVenture(), getCurrentCustomer()]);
  const answer = await answerShopQuestion({ message: parsed.data.message, ventureId: venture.id, customer: shopper });
  return NextResponse.json({ ...answer, signedIn: Boolean(shopper), name: shopper?.name?.split(" ")[0] ?? null });
}
