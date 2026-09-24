import Link from "next/link";
import { ResetForm } from "../password-forms";
import "../login/login.css";

export const metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div className="login login-single">
      <section className="login-form-side">
        <Link href="/" className="login-logo">
          Sweet&apos;Oh <em>Creations</em>
        </Link>
        <div className="login-form-wrap">
          <h1>Choose a new password</h1>
          {token ? (
            <>
              <p className="login-sub">Pick something you&apos;ll remember — at least 8 characters.</p>
              <ResetForm token={token} />
            </>
          ) : (
            <p className="login-sub">
              This link is missing its code. <Link href="/partner/forgot">Ask for a new reset link</Link>.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
