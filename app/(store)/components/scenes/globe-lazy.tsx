"use client";

import dynamic from "next/dynamic";
import type { GlobeDestination } from "./globe";

/** The globe carries real geography, so it loads only when the page reaches it. */
const Globe = dynamic(() => import("./globe").then((m) => m.Globe), {
  ssr: false,
  loading: () => <div className="sx-globe" aria-hidden />,
});

export function GlobeLazy({ destinations, estimates }: { destinations?: GlobeDestination[]; estimates?: Record<string, string> }) {
  return <Globe destinations={destinations} estimates={estimates} />;
}
