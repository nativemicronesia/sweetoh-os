import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/domains/identity/service";
import { signInAction } from "@/app/(partner)/partner/actions/auth";
import { listBestsellerBlueprints } from "@/lib/integrations/printify/catalog";
import { MadeToOrderSticker } from "@/app/(store)/components/store-hero";
import { ISLAND_GREETINGS } from "@/lib/shared/island-greetings";
import "./login.css";

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

  if (session?.role === "partner") {
    redirect("/partner");
  }

  const params = await searchParams;
  const accessError =
    params.error === "partner_only"
      ? "This login is only for the Sweet’Oh partner."
      : params.error
        ? decodeURIComponent(params.error)
        : null;

  const picks = await listBestsellerBlueprints();
  const greeting = ISLAND_GREETINGS[Math.floor(Date.now() / 86_400_000) % ISLAND_GREETINGS.length];

  return (
    <div className="login">
      <section className="login-form-side">
        <Link href="/" className="login-logo">
          Sweet&apos;Oh <em>Creations</em>
        </Link>
        <div className="login-form-wrap">
          <p className="login-kicker">{greeting.greeting} — {greeting.place}</p>
          <h1>Welcome back to your shop.</h1>
          <p className="login-sub">Sign in to your Sweet&apos;Oh back office — orders, mail and everything you make.</p>

          {accessError ? (
            <p role="alert" className="login-error">
              {accessError}
            </p>
          ) : null}

          <form action={signInAction} className="login-form">
            <label>
              <span>Email</span>
              <input type="email" name="email" required autoComplete="email" placeholder="you@example.com" />
            </label>
            <label>
              <span>Password</span>
              <input type="password" name="password" required autoComplete="current-password" placeholder="••••••••" />
            </label>
            <button type="submit">Sign in</button>
          </form>
          <Link href="/partner/forgot" className="login-back">
            Forgot your password?
          </Link>
          <Link href="/" className="login-back" style={{ display: "block", marginTop: 10 }}>
            ← Back to the storefront
          </Link>
        </div>
      </section>
      <aside className="login-brand" aria-hidden="true">
        <span className="so-pattern-layer" style={{ ["--pattern-ink" as string]: "rgba(255,255,255,.09)" }} />
        <div className="login-brand-copy">
          <p className="login-kicker">Sweet&apos;Oh Creations · Lacey, WA</p>
          <h2>
            Print the islands.
            <br />
            Run the <em>shop</em>.
          </h2>
          <p>Made to order, Micronesian-owned. Everything behind the storefront lives here.</p>
        </div>
        <MadeToOrderSticker id="login-sticker" className="login-sticker" />
        {picks.length > 0 && (
          <div className="login-collage">
            {picks.map((b) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={b.id} src={b.images[0]} alt="" />
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
