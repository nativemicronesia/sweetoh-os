/**
 * Creator sign-ups are closed until launch, so the shop can go live for the
 * partner first. Flip `CREATOR_SIGNUPS=open` when the creator side launches.
 * Existing creators can always sign in; only new sign-ups are gated.
 */
export function creatorSignupsOpen(): boolean {
  return (process.env.CREATOR_SIGNUPS ?? "").trim().toLowerCase() === "open";
}
