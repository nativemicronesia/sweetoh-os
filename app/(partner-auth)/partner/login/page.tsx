import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/domains/identity/service";
import { Inter } from "next/font/google";
import { signInAction } from "@/app/(partner)/partner/actions/auth";
import { listBestsellerBlueprints } from "@/lib/integrations/printify/catalog";
import "./login.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-partner" });

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

  return (
    <div className={`${inter.variable} login`}>
      <section className="login-form-side">
        <Link href="/" className="login-logo">
          Sweet&apos;Oh
        </Link>
        <div className="login-form-wrap">
          <h1>Welcome back</h1>
          <p className="login-sub">Sign in to manage your shop.</p>

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
          <Link href="/" className="login-back">
            ← Back to the storefront
          </Link>
        </div>
      </section>
      <aside className="login-brand" aria-hidden="true">
        <div className="login-brand-copy">
          <p className="login-kicker">Sweet&apos;Oh Studio</p>
          <h2>Design it. Sell it. Print it locally.</h2>
          <p>Pick a product, add your design, and publish to your shop in minutes.</p>
        </div>
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
