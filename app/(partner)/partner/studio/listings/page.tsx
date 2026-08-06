import { redirect } from "next/navigation";

/** Listings folded into Review. */
export default function StudioListingsRedirectPage() {
  redirect("/partner/review");
}
