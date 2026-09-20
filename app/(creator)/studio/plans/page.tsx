import { Check, Coins, Sparkles } from "lucide-react";
import { requireCreator } from "@/lib/domains/identity/service";
import { getCreatorProfile, getCreditBalance, recentCreditActivity } from "@/lib/domains/creator/credits";
import { ACTION_CREDITS, PLANS, TOPUP, formatCredits, formatUsd } from "@/lib/domains/creator/plans";
import { billingPortalAction, startSubscriptionAction, topUpAction } from "../actions/billing";
import { SubmitButton } from "../components/submit-button";

export const metadata = { title: "Plans & credits" };

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ success?: string; topup?: string; error?: string; canceled?: string }> }) {
  const session = await requireCreator();
  const [query, { balance, plan, status, monthly, wallet }, profile, activity] = await Promise.all([
    searchParams,
    getCreditBalance(session.appUser.id),
    getCreatorProfile(session.appUser.id),
    recentCreditActivity(session.appUser.id, 15),
  ]);
  const paid = plan.id !== "free";
  const trialing = status === "trialing";

  return (
    <div className="cs-stack" style={{ gap: 26 }}>
      <header>
        <div className="cs-eyebrow">Plans & credits</div>
        <h1 className="cs-h1">Grow with Skink</h1>
        <p className="cs-sub">Credits are Skink&apos;s AI capacity. Chatting barely uses any; AI designs, research and the most capable models use more. Designing by hand, saving and exporting are always free.</p>
      </header>

      {query.success && <p className="cs-note" role="status">You&apos;re on {PLANS[query.success as "creator" | "pro"]?.name ?? "your new plan"} — welcome! Your credits are ready (it can take a few seconds to show).</p>}
      {query.topup && <p className="cs-note" role="status">Top-up received — {TOPUP.credits} credits are on their way.</p>}
      {query.error && <p className="cs-alert" role="alert">{query.error}</p>}

      <section className="cs-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))" }}>
        <div className="cs-card cs-pad">
          <div className="cs-muted" style={{ fontSize: 13 }}>Your plan</div>
          <div className="cs-display" style={{ fontSize: 28, margin: "4px 0" }}>{plan.name}{profile?.founding ? " · Founding" : ""}</div>
          <div className="cs-muted" style={{ fontSize: 14 }}>
            {trialing && profile?.currentPeriodEnd
              ? `Free until ${profile.currentPeriodEnd.toLocaleDateString()}`
              : paid && profile?.currentPeriodEnd
                ? `Renews ${profile.currentPeriodEnd.toLocaleDateString()}`
                : paid ? "Active" : "Free forever"}
            {profile?.planStatus === "past_due" && " · payment needs attention"}
          </div>
          {profile?.stripeCustomerId && (
            <form action={billingPortalAction} style={{ marginTop: 14 }}>
              <SubmitButton className="cs-btn cs-btn-ghost cs-btn-sm">Manage billing</SubmitButton>
            </form>
          )}
        </div>
        <div className="cs-card cs-pad">
          <div className="cs-muted" style={{ fontSize: 13 }}>Credits left</div>
          <div className="cs-display" style={{ fontSize: 28, margin: "4px 0" }}><Coins size={22} color="var(--cs-gold)" style={{ verticalAlign: -2 }} /> {formatCredits(balance)}</div>
          <div className="cs-muted" style={{ fontSize: 14 }}>
            {formatCredits(monthly)} of this month&apos;s {(trialing && plan.trialCredits ? plan.trialCredits : plan.monthlyCredits).toLocaleString()}
            {wallet > 0 ? ` · ${formatCredits(wallet)} top-up credits (these never expire)` : ""}
          </div>
          <div className="cs-muted" style={{ fontSize: 13, marginTop: 6 }}>Monthly credits refresh on the 1st — whatever&apos;s left doesn&apos;t carry over.</div>
          {paid && (
            <form action={topUpAction} style={{ marginTop: 14 }}>
              <SubmitButton className="cs-btn cs-btn-ghost cs-btn-sm">Top up {TOPUP.credits} for {formatUsd(TOPUP.cents)}</SubmitButton>
            </form>
          )}
        </div>
        <div className="cs-card cs-pad">
          <div className="cs-muted" style={{ fontSize: 13 }}>What credits buy</div>
          <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0", fontSize: 14, display: "grid", gap: 4 }}>
            <li className="cs-between"><span>Chat with Skink</span><strong>~0.1 each</strong></li>
            <li className="cs-between"><span>AI design or pattern</span><strong>{ACTION_CREDITS.design}</strong></li>
            <li className="cs-between"><span>AI edit / remove background</span><strong>{ACTION_CREDITS.edit}</strong></li>
            <li className="cs-between"><span>Deep research question</span><strong>varies</strong></li>
          </ul>
        </div>
      </section>

      {plan.id === "free" && (
        <div className="cs-founding">
          <div>
            <strong>Try Creator free for 3 months</strong>
            <p className="cs-muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
              Skink helps you set up your store, find your niche, design products and write your listings. Card up front, nothing charged until month four, cancel any time.
            </p>
          </div>
          <Sparkles size={34} color="var(--cs-coral)" />
        </div>
      )}

      <section className="cs-plans">
        {(["free", "creator", "pro"] as const).map((id) => {
          const p = PLANS[id];
          const current = plan.id === id;
          const featured = id === "creator";
          return (
            <article key={id} className={`cs-plan${featured ? " featured" : ""}`}>
              {featured && <span className="cs-ribbon">Most popular</span>}
              <div className="cs-between">
                <h2 className="cs-h2">{p.name}</h2>
                {current && <span className="cs-badge cs-badge-green">Current</span>}
              </div>
              <p className="cs-muted" style={{ margin: "4px 0 0", fontSize: 14 }}>{p.tagline}</p>
              <div className="cs-plan-price">{p.monthlyCents ? formatUsd(p.monthlyCents) : "$0"}<small> /month</small></div>
              {p.monthlyCents > 0 && (
                <div className="cs-muted" style={{ fontSize: 13 }}>
                  {p.trialDays ? `Free for ${Math.round(p.trialDays / 30)} months, then ${formatUsd(p.monthlyCents)}/month` : `or ${formatUsd(p.yearlyCents)}/year — 6 months free`}
                </div>
              )}
              <ul>
                {p.features.map((f) => (
                  <li key={f}><Check size={16} /> {f}</li>
                ))}
              </ul>
              <div className="cs-plan-actions">
                {id === "free" ? (
                  <span className="cs-muted" style={{ fontSize: 13, textAlign: "center" }}>{current ? "You're on Free" : "Always available"}</span>
                ) : current && profile?.planStatus === "active" ? (
                  <span className="cs-badge cs-badge-green" style={{ justifyContent: "center", padding: 10 }}>Your plan</span>
                ) : (
                  <>
                    <form action={startSubscriptionAction}>
                      <input type="hidden" name="plan" value={id} />
                      <input type="hidden" name="interval" value="month" />
                      <SubmitButton className={`cs-btn ${featured ? "cs-btn-primary" : "cs-btn-lime"}`} style={{ width: "100%" }}>
                        {p.trialDays ? "Start 3 months free" : `Monthly · ${formatUsd(p.monthlyCents)}`}
                      </SubmitButton>
                    </form>
                    {p.yearlyCents > 0 && (
                      <form action={startSubscriptionAction}>
                        <input type="hidden" name="plan" value={id} />
                        <input type="hidden" name="interval" value="year" />
                        <SubmitButton className="cs-btn cs-btn-ghost" style={{ width: "100%" }}>Yearly · {formatUsd(p.yearlyCents)} (6 months free)</SubmitButton>
                      </form>
                    )}
                  </>
                )}
              </div>
            </article>
          );
        })}
      </section>

      {activity.length > 0 && (
        <section className="cs-card">
          <div className="cs-pad" style={{ paddingBottom: 8 }}><h2 className="cs-h2">Recent credit activity</h2></div>
          <div className="cs-list">
            {activity.map((a) => (
              <div key={a.id} className="cs-between" style={{ fontSize: 14 }}>
                <span>{a.reason} <span className="cs-muted">· {a.createdAt.toLocaleDateString()}</span></span>
                <strong style={{ color: Number(a.delta) >= 0 ? "var(--cs-green)" : "var(--cs-ink-2)" }}>{Number(a.delta) >= 0 ? "+" : "−"}{Math.abs(Number(a.delta)) < 1 ? Math.abs(Number(a.delta)).toFixed(2) : formatCredits(Math.abs(Number(a.delta)))}</strong>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
