import { redirect } from "next/navigation";

/** Assist is now the persistent Studio chat bar, present on every screen. */
export default function PartnerAssistRedirectPage() {
  redirect("/partner");
}
