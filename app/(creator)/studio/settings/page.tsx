import { ExternalLink, ShieldCheck, Store } from "lucide-react";
import { requireCreator } from "@/lib/domains/identity/service";
import { getCreatorProfile } from "@/lib/domains/creator/credits";
import { PrintifyConnect } from "./printify-connect";

export const metadata = { title: "Printify & account" };

export default async function SettingsPage() {
  const session = await requireCreator();
  const profile = await getCreatorProfile(session.appUser.id);
  return (
    <div className="cs-stack" style={{ gap: 24, maxWidth: 820 }}>
      <header>
        <div className="cs-eyebrow">Printify & account</div>
        <h1 className="cs-h1">Your store, your money</h1>
        <p className="cs-sub">Sweet&apos;Oh sends finished products into <strong>your own</strong> Printify store. From Printify you can publish to Etsy, Shopify, TikTok Shop, eBay and more — sales and payouts go straight to you.</p>
      </header>

      <section className="cs-card cs-pad">
        <div className="cs-row" style={{ marginBottom: 14 }}>
          <Store size={22} color="var(--cs-green)" />
          <h2 className="cs-h2">Printify</h2>
          {profile?.printifyShopId ? <span className="cs-badge cs-badge-green">Connected</span> : <span className="cs-badge">Not connected</span>}
        </div>
        <PrintifyConnect connected={Boolean(profile?.printifyTokenEnc)} shopTitle={profile?.printifyShopTitle ?? null} shopChosen={Boolean(profile?.printifyShopId)} />
      </section>

      <section className="cs-card cs-pad">
        <h2 className="cs-h2" style={{ marginBottom: 10 }}>How to get your Printify token</h2>
        <ol style={{ margin: 0, paddingLeft: 20, color: "var(--cs-ink-2)", display: "grid", gap: 6 }}>
          <li>Create a free account at <a className="cs-link" href="https://printify.com" target="_blank" rel="noreferrer">printify.com <ExternalLink size={12} /></a> and add a store (you can connect Etsy or Shopify later).</li>
          <li>In Printify, open <strong>My account → Connections</strong>.</li>
          <li>Under <strong>API tokens</strong>, choose <strong>Generate</strong>, name it “Sweet&apos;Oh”, and give it full access.</li>
          <li>Copy the token and paste it here. Printify only shows it once.</li>
        </ol>
        <p className="cs-muted" style={{ fontSize: 13, marginTop: 12, display: "flex", gap: 6, alignItems: "flex-start" }}>
          <ShieldCheck size={16} style={{ flex: "none", marginTop: 2 }} /> Your token is encrypted, used only to create products you send, and never to place orders or read your sales. Disconnect any time — or revoke it in Printify.
        </p>
      </section>

      <section className="cs-card cs-pad">
        <h2 className="cs-h2" style={{ marginBottom: 10 }}>Account</h2>
        <dl style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "8px 16px", margin: 0, fontSize: 14 }}>
          <dt className="cs-muted">Name</dt><dd style={{ margin: 0 }}>{session.appUser.name ?? "—"}</dd>
          <dt className="cs-muted">Email</dt><dd style={{ margin: 0 }}>{session.appUser.email}</dd>
          <dt className="cs-muted">Member since</dt><dd style={{ margin: 0 }}>{session.appUser.createdAt.toLocaleDateString()}</dd>
        </dl>
      </section>
    </div>
  );
}
