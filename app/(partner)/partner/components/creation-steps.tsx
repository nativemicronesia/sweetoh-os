import Link from "next/link";
export function CreationSteps({
  current,
  productHref,
}: {
  current: number;
  productHref?: string;
}) {
  return (
    <nav aria-label="Product creation progress" className="creation-steps">
      {[
        "Catalog",
        "Design",
        "Preview",
        "Details & pricing",
        "Publish",
      ].map((label, i) => (
        <span
          key={label}
          className={
            i + 1 === current ? "current" : i + 1 < current ? "complete" : ""
          }
          aria-current={i + 1 === current ? "step" : undefined}
        >
          <b>{i + 1 < current ? "✓" : i + 1}</b>
          {i === 0 && current > 1 ? (
            <Link href={productHref ?? "/partner/catalog"}>{label}</Link>
          ) : (
            label
          )}
          {i < 4 && <i />}
        </span>
      ))}
    </nav>
  );
}
