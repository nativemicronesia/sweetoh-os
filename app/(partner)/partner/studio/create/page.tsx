import { redirect } from "next/navigation";

/** Studio Create doors page replaced by the unified Create screen. */
export default function StudioCreateRedirectPage() {
  redirect("/partner/create");
}
