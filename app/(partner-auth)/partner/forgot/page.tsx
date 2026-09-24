import Link from "next/link";
import { ForgotForm } from "../password-forms";
import "../login/login.css";

export const metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <div className="login login-single">
      <section className="login-form-side">
        <Link href="/" className="login-logo">
          Sweet&apos;Oh <em>Creations</em>
        </Link>
        <div className="login-form-wrap">
          <h1>Forgot your password?</h1>
          <p className="login-sub">Enter your back office email and we&apos;ll send you a link to choose a new one.</p>
          <ForgotForm />
          <Link href="/partner/login" className="login-back">← Back to sign in</Link>
        </div>
      </section>
    </div>
  );
}
