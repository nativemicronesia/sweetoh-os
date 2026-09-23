import { NextResponse, type NextRequest } from "next/server";
import { getCurrentCustomer } from "@/lib/domains/customers/account";
import { sendVerification } from "@/lib/domains/customers/verify";

/** Skink's "send the link again" button. */
export async function GET(request: NextRequest) {
  const shopper = await getCurrentCustomer();
  if (!shopper) return NextResponse.redirect(new URL("/account?mode=login&next=/", request.url));
  if (!shopper.emailVerifiedAt) await sendVerification(shopper).catch(() => undefined);
  return NextResponse.redirect(new URL("/account/verify?sent=1", request.url));
}
