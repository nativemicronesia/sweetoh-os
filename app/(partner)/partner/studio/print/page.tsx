import { redirect } from "next/navigation";

/** Print mode lives at jobs for now — same queue, Studio language. */
export default function StudioPrintPage() {
  redirect("/partner/jobs");
}
