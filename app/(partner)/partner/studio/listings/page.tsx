import { redirect } from "next/navigation";

/** Listings folded into Print — decide/accept now lives there. */
export default function StudioListingsRedirectPage() {
  redirect("/partner/studio/print");
}
