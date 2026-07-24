import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/domains/identity/service";
import { signInAction } from "../actions/auth";

type PartnerLoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function PartnerLoginPage({
  searchParams,
}: PartnerLoginPageProps) {
  const session = await getSessionUser();

  if (session?.role === "partner" || session?.role === "owner") {
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
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-6">
      <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold tracking-wide text-emerald-800">
          Sweet&apos;Oh Operations
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-neutral-900">
          Partner sign in
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Sign in to manage Sweet&apos;Oh production, uploads, and the AI Product
          Builder.
        </p>

        {accessError ? (
          <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {accessError}
          </p>
        ) : null}

        <form action={signInAction} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-neutral-700">Email</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="w-full rounded border border-neutral-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-neutral-700">Password</span>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="w-full rounded border border-neutral-300 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-900"
          >
            Sign in
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-neutral-500">
          <Link href="/" className="hover:text-emerald-800">
            Back to storefront
          </Link>
        </p>
      </div>
    </div>
  );
}
