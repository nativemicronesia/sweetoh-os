import { notFound } from "next/navigation";
import { StudioLab } from "./studio-lab";

/**
 * A logged-out Studio editor for the automated browser tests (scripts/e2e).
 * It exists only when STUDIO_LAB=1, so it is a 404 in production.
 * `?photo=1` starts the design with one photo-like cutout layer.
 */
export const dynamic = "force-dynamic";

export default async function StudioLabPage({ searchParams }: { searchParams: Promise<{ photo?: string }> }) {
  if (process.env.STUDIO_LAB !== "1") notFound();
  const { photo } = await searchParams;
  return <StudioLab photo={photo === "1"} />;
}
