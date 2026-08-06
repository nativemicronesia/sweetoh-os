import Link from "next/link";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { resolvePartnerWorkspacePack } from "@/lib/domains/workspace/packs";

/**
 * Minimal v1 — read-only profile and workspace info from the session already
 * loaded by `requirePartnerWorkspace()`. Deliberately no write surface: account,
 * billing, and email settings belong to the auth/Stripe/Resend work that is
 * being done separately.
 */
export default async function PartnerSettingsPage() {
  const session = await requirePartnerWorkspace();
  const pack = resolvePartnerWorkspacePack({
    role: session.role,
    ventureSlug: session.ventureSlug,
  });

  const rows: { label: string; value: string }[] = [
    { label: "Name", value: session.appUser.name ?? "—" },
    { label: "Email", value: session.appUser.email },
    { label: "Role", value: session.role },
    { label: "Workspace", value: pack.label },
    { label: "Venture", value: session.ventureSlug },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--so-cream)" }}>
          Settings
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
          Who you are signed in as, and which workspace this desk is pointed at.
        </p>
      </div>

      <section
        className="rounded-xl border"
        style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
      >
        <dl className="divide-y" style={{ borderColor: "var(--so-border)" }}>
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
            >
              <dt className="text-sm" style={{ color: "var(--so-cream-dim)" }}>
                {row.label}
              </dt>
              <dd className="text-sm" style={{ color: "var(--so-cream)" }}>
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section
        className="rounded-xl border px-5 py-4"
        style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
      >
        <p className="text-sm font-medium" style={{ color: "var(--so-cream)" }}>
          Design uploads
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
          Raw design files you upload for the library live under{" "}
          <Link href="/partner/uploads" className="underline">
            Uploads
          </Link>
          .
        </p>
      </section>

      <p className="text-xs" style={{ color: "var(--so-cream-dim)" }}>
        Account, billing, and email settings are handled outside this desk for now.
      </p>
    </div>
  );
}
