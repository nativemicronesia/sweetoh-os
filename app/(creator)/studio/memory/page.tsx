import { requireCreator } from "@/lib/domains/identity/service";
import { listMemories, MEMORY_KINDS, MEMORY_KIND_LABEL } from "@/lib/domains/skink/memory";
import { MemoryBoard } from "./memory-board";

export const metadata = { title: "What Skink knows" };

export default async function MemoryPage() {
  const session = await requireCreator();
  const memories = await listMemories(session.appUser.id, 200);
  return (
    <div className="cs-stack" style={{ gap: 22 }}>
      <header>
        <div className="cs-eyebrow">Your private memory</div>
        <h1 className="cs-h1">What Skink knows about you</h1>
        <p className="cs-sub">
          Skink keeps short notes about your brand, goals and decisions so it gets better at helping you over time. This isn&apos;t your chat history — it&apos;s what Skink chose to remember. Only you can see it. Edit, pin or delete anything.
        </p>
      </header>
      <MemoryBoard
        memories={memories.map((m) => ({ id: m.id, kind: m.kind, title: m.title, body: m.body, pinned: m.pinned, source: m.source, updatedAt: m.updatedAt.toISOString() }))}
        kinds={MEMORY_KINDS.map((k) => ({ id: k, label: MEMORY_KIND_LABEL[k] }))}
      />
    </div>
  );
}
