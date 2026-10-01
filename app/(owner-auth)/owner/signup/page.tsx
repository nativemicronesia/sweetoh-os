import { redirect } from "next/navigation";

/** Owner sign-in is one passwordless flow; the old signup address lands there. */
export default function OwnerSignupPage(): never {
  redirect("/owner/login");
}
