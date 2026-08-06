import { redirect } from "next/navigation";

/** Queue job detail folded into the Orders job detail screen. */
export default async function PartnerQueueJobRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/partner/orders/${id}`);
}
