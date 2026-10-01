import Link from "next/link";
import { verifyOwnerAction } from "@/app/(partner)/partner/actions/auth";
import "@/app/(partner-auth)/partner/login/login.css";

export const metadata = { title: "NMH owner sign in · Sweet’Oh" };

type OwnerVerifyPageProps = { searchParams: Promise<{ token?: string }> };

export default async function OwnerVerifyPage({ searchParams }: OwnerVerifyPageProps) {
  const { token } = await searchParams;
  return (
    <div className="login login-single">
      <section className="login-form-side">
        <Link href="/" className="login-logo">Sweet&apos;Oh <em>Creations</em></Link>
        <div className="login-form-wrap">
          <p className="login-kicker">NMH owner access</p>
          <h1>Finish signing in.</h1>
          {token ? (
            <form action={verifyOwnerAction} className="login-form">
              <input type="hidden" name="token" value={token} />
              <button type="submit">Sign in as owner</button>
            </form>
          ) : (
            <p className="login-error" role="alert">That sign-in link is incomplete. <Link href="/owner/login">Ask for a new one</Link>.</p>
          )}
        </div>
      </section>
    </div>
  );
}
