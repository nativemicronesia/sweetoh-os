import { redirect } from "next/navigation";

/** Draft detail folded into the Review detail screen. */
export default async function PartnerDraftDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/partner/review/${id}`);
}
