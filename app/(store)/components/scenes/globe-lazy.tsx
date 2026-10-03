"use client";

import dynamic from "next/dynamic";

/** The globe carries real geography, so it loads only when the page reaches it. */
const Globe = dynamic(() => import("./globe").then((m) => m.Globe), {
  ssr: false,
  loading: () => <div className="sx-globe" aria-hidden />,
});

export function GlobeLazy() {
  return <Globe />;
}
