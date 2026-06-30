import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/domains/identity/service";

export default async function RootPage() {
  const session = await getSessionUser();

  if (session?.role === "partner") {
    redirect("/partner");
  }

  if (session?.role === "owner") {
    redirect("/partner"); // owner can also view partner dashboard for now
  }

  redirect("/partner/login");
}
