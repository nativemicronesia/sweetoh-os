import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/domains/identity/service";
import { signInAction } from "@/app/(partner)/partner/actions/auth";

type PartnerLoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

/**
 * Public partner login — outside the authed partner layout so unauthenticated
 * users can reach the form (her Sweet'Oh domain front door).
 */
export default async function PartnerLoginPage({
  searchParams,
}: PartnerLoginPageProps) {
  let session = null;
  try {
    session = await getSessionUser();
  } catch {
    // DB/auth blips should not block the login form.
    session = null;
  }

  if (
    session?.role === "partner" ||
    session?.role === "owner" ||
    session?.role === "creator"
  ) {
    redirect("/partner");
  }

  const params = await searchParams;
  const accessError =
    params.error === "partner_only"
      ? "This account does not have partner access."
      : params.error
        ? decodeURIComponent(params.error)
        : null;

  return (
    <div
      className="flex min-h-screen items-center justify-center px-6"
      style={{ background: "var(--so-black)" }}
    >
      <div
        className="w-full max-w-md rounded-xl border p-8"
        style={{
          borderColor: "var(--so-border)",
          background: "var(--so-dark)",
        }}
      >
        <p
          className="text-sm font-semibold tracking-wide"
          style={{ color: "var(--so-gold)" }}
        >
          Sweet&apos;Oh
        </p>
        <h1
          className="mt-2 text-2xl font-semibold"
          style={{ color: "var(--so-cream)" }}
        >
          Partner sign in
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--so-cream-dim)" }}>
          Your Studio — create, print, list, and ship. This is your Sweet&apos;Oh
          workspace, not NMH.
        </p>

        {accessError ? (
          <p
            className="mt-4 rounded-lg border px-3 py-2 text-sm"
            style={{
              borderColor: "var(--so-rose-dim)",
              background: "rgba(196,103,122,0.12)",
              color: "var(--so-cream)",
            }}
          >
            {accessError}
          </p>
        ) : null}

        <form action={signInAction} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block" style={{ color: "var(--so-cream-dim)" }}>
              Email
            </span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border px-3 py-2"
              style={{
                borderColor: "var(--so-border)",
                background: "var(--so-surface)",
                color: "var(--so-cream)",
              }}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block" style={{ color: "var(--so-cream-dim)" }}>
              Password
            </span>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border px-3 py-2"
              style={{
                borderColor: "var(--so-border)",
                background: "var(--so-surface)",
                color: "var(--so-cream)",
              }}
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-full px-4 py-2.5 text-sm font-medium"
            style={{ background: "var(--so-gold)", color: "var(--so-black)" }}
          >
            Sign in to Studio
          </button>
        </form>

        <p
          className="mt-6 text-center text-xs"
          style={{ color: "var(--so-cream-dim)" }}
        >
          <Link href="/" className="hover:underline" style={{ color: "var(--so-cream)" }}>
            Back to storefront
          </Link>
        </p>
      </div>
    </div>
  );
}
