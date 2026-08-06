import { redirect } from "next/navigation";

/** Visual intake folded into the unified Create screen's photo lane. */
export default function PartnerVisualIntakeRedirectPage() {
  redirect("/partner/create");
}
