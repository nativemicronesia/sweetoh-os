import { redirect } from "next/navigation";

/** Legacy uploads path — Design library is the partner home for artwork. */
export default function PartnerUploadsRedirectPage() {
  redirect("/partner/library");
}
