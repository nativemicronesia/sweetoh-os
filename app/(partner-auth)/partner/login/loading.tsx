/**
 * The login page checks the session on every request (can't be cached), so
 * without this, navigating here — including "Back to storefront" bouncing
 * through a sign-out — has a silent dead pause before anything appears.
 */
export default function PartnerLoginLoading() {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-6"
      style={{ background: "var(--so-black)" }}
    >
      <div
        className="w-full max-w-md animate-pulse space-y-4 rounded-xl border p-8"
        style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
      >
        <div className="h-4 w-20 rounded" style={{ background: "var(--so-border)" }} />
        <div className="h-7 w-40 rounded" style={{ background: "var(--so-border)" }} />
        <div className="h-10 rounded-lg" style={{ background: "var(--so-border)" }} />
        <div className="h-10 rounded-lg" style={{ background: "var(--so-border)" }} />
        <div className="h-10 rounded-full" style={{ background: "var(--so-border)" }} />
      </div>
    </div>
  );
}
