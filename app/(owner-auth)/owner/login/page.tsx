import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/domains/identity/service";
import { signInOwnerAction } from "@/app/(partner)/partner/actions/auth";
import "@/app/(partner-auth)/partner/login/login.css";

export const metadata = { title: "NMH owner sign in · Sweet’Oh" };

type OwnerLoginPageProps = { searchParams: Promise<{ error?: string }> };

export default async function OwnerLoginPage({ searchParams }: OwnerLoginPageProps) {
  let session = null;
  try {
    session = await getSessionUser();
  } catch {
    session = null;
  }
  if (session?.role === "owner") redirect("/partner");

  const { error } = await searchParams;
  const message = error === "owner_only"
    ? "This sign-in is for the NMH owner account. The shop partner has a separate sign-in."
    : error
      ? decodeURIComponent(error)
      : null;

  return (
    <div className="login login-single">
      <section className="login-form-side">
        <Link href="/" className="login-logo">Sweet&apos;Oh <em>Creations</em></Link>
        <div className="login-form-wrap">
          <p className="login-kicker">NMH owner access</p>
          <h1>Welcome to your shop.</h1>
          <p className="login-sub">Sign in with your own owner account to manage Sweet&apos;Oh. Your partner keeps her separate login and workspace identity.</p>
          {message && <p role="alert" className="login-error">{message}</p>}
          <form action={signInOwnerAction} className="login-form">
            <label><span>Email</span><input type="email" name="email" required autoComplete="username" placeholder="you@example.com" /></label>
            <label><span>Password</span><input type="password" name="password" required autoComplete="current-password" placeholder="••••••••" /></label>
            <button type="submit">Sign in as owner</button>
          </form>
          <Link href="/partner/forgot" className="login-back">Forgot your password?</Link>
          <Link href="/partner/login" className="login-back" style={{ display: "block", marginTop: 10 }}>Partner sign-in →</Link>
        </div>
      </section>
    </div>
  );
}
