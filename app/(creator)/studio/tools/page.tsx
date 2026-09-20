import { requireCreator } from "@/lib/domains/identity/service";
import { getCreatorProfile } from "@/lib/domains/creator/credits";
import { HANDOFF_TASKS, TOOLS } from "@/lib/domains/skink/handoff";
import { MyTools } from "./my-tools";

export const metadata = { title: "My tools" };

export default async function ToolsPage() {
  const session = await requireCreator();
  const profile = await getCreatorProfile(session.appUser.id);
  return (
    <div className="cs-stack" style={{ gap: 22 }}>
      <header>
        <div className="cs-eyebrow">Use what you already pay for</div>
        <h1 className="cs-h1">My tools</h1>
        <p className="cs-sub">
          Already paying for ChatGPT, Claude, Gemini or Canva? Tell Skink. He&apos;ll prepare the exact prompt and everything he knows about your brand, you run it in your own tool, and he picks the work back up from there — without spending your Sweet&apos;Oh credits.
        </p>
      </header>
      <MyTools tools={TOOLS} tasks={HANDOFF_TASKS.map((t) => ({ id: t.id, label: t.label, blurb: t.blurb, askFor: t.askFor, kinds: t.kinds }))} mine={profile?.tools ?? []} />
    </div>
  );
}
