import { notFound } from "next/navigation";
import { StudioLab } from "./studio-lab";

/**
 * A logged-out Studio editor for the automated browser tests (scripts/e2e).
 * It exists only when STUDIO_LAB=1, so it is a 404 in production.
 */
export const dynamic = "force-dynamic";

export default function StudioLabPage() {
  if (process.env.STUDIO_LAB !== "1") notFound();
  return <StudioLab />;
}
