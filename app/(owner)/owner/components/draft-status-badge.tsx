import {
  displayProductDraftStatus,
  draftStatusBadgeClass,
  formatProductDraftStatus,
  type ProductDraftStatus,
} from "@/lib/domains/catalog/draft-status";

export function DraftStatusBadge({
  draftStatus,
  active,
}: {
  draftStatus: ProductDraftStatus;
  active: boolean;
}) {
  const status = displayProductDraftStatus({ active, draftStatus });

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${draftStatusBadgeClass(status)}`}
    >
      {formatProductDraftStatus(status)}
    </span>
  );
}
