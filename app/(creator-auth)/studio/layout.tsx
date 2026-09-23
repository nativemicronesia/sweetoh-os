import { redirect } from "next/navigation";
import { creatorSideOpen } from "@/lib/domains/creator/access";
import "@/app/(creator)/studio/creator.css";

export default function CreatorAuthLayout({ children }: { children: React.ReactNode }) {
  if (!creatorSideOpen()) redirect("/");
  return <div className="cs">{children}</div>;
}
