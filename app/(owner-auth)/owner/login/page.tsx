import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/domains/identity/service";
import { OwnerSignupForm } from "../../../(partner-auth)/partner/password-forms";
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
          <p className="login-sub">Enter your email and we&apos;ll send a one-time sign-in link. Your partner keeps her separate login and workspace identity.</p>
          {message && <p role="alert" className="login-error">{message}</p>}
          <OwnerSignupForm />
          <Link href="/partner/login" className="login-back" style={{ display: "block", marginTop: 10 }}>Partner sign-in →</Link>
        </div>
      </section>
    </div>
  );
}
