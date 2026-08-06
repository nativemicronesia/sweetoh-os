import { redirect } from "next/navigation";

/** Drafts list folded into Review. */
export default function PartnerDraftsRedirectPage() {
  redirect("/partner/review");
}
