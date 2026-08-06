import { redirect } from "next/navigation";

/** Custom production board folded into the Orders board's Custom tab. */
export default function PartnerJobsRedirectPage() {
  redirect("/partner/orders?tab=custom");
}
