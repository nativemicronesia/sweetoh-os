import { redirect } from "next/navigation";

/** Ship queue folded into the Orders board's Catalog tab. */
export default function PartnerQueueRedirectPage() {
  redirect("/partner/orders?tab=catalog");
}
