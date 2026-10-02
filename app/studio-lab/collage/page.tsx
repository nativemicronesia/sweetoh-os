import { notFound } from "next/navigation";
import { CollageMaker } from "../../(partner)/partner/studio/collage/collage-maker";

/** The photo collage page without a login, for the browser tests only (404 unless STUDIO_LAB=1). */
export const dynamic = "force-dynamic";

export default function CollageLabPage() {
  if (process.env.STUDIO_LAB !== "1") notFound();
  return <CollageMaker />;
}
