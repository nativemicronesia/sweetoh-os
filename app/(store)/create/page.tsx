import { redirect } from "next/navigation";

/** Legacy /create entry — Studio is the Printify-shaped design flow. */
export default function CreateRedirectPage() {
  redirect("/studio");
}
