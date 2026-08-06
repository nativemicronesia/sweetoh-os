import { redirect } from "next/navigation";

/** Studio Print (the approve/reject queue) folded into Review. */
export default function StudioPrintRedirectPage() {
  redirect("/partner/review");
}
