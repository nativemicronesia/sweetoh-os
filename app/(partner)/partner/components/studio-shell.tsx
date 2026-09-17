"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { StudioChat } from "./studio-chat";
export function StudioShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [help, setHelp] = useState(false);
  const editor = path === "/partner/canvas";
  return <div className="studio-main">
    <header className="studio-topbar"><span className="studio-breadcrumb">Your workspace <span>/</span> <strong>{editor ? "Design studio" : path.includes("builder") ? "Create a product" : path.includes("review") ? "Listings" : path.includes("library") ? "Artwork library" : "Sweet’Oh Studio"}</strong></span>
      <div className="flex items-center gap-3"><Link href="/" target="_blank" className="studio-shop-link">View shop ↗</Link><button className="studio-help" aria-expanded={help} onClick={() => setHelp(!help)}>{help ? "Close assistant" : "✦ Ask Sweet’Oh"}</button></div>
    </header>
    <div hidden={!help} className="studio-assistant"><StudioChat /></div>
    <main className={editor ? "studio-content studio-content-editor" : "studio-content"}>{children}</main>
  </div>;
}
