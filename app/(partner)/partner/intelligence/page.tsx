import { redirect } from "next/navigation";

/** Text-draft lane folded into the unified Create screen. */
export default function PartnerIntelligenceRedirectPage() {
  redirect("/partner/create");
}
