"use client";

import { useMemo } from "react";
import { ProductEditor } from "@/app/(partner)/partner/canvas/product-editor";
import { makePublishPanel, type PublishContext } from "./publish-panel";

type EditorProps = Omit<React.ComponentProps<typeof ProductEditor>, "mode" | "PublishPanel">;

/** The partner's product editor in creator mode, with the creator "Sell it" panel. */
export function CreatorEditor({ publish, ...props }: EditorProps & { publish: PublishContext }) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const PublishPanel = useMemo(() => makePublishPanel(publish), [publish.printifyShop, publish.acceptingRequests, publish.canRequestPrint]);
  return <ProductEditor {...props} mode="creator" PublishPanel={PublishPanel} />;
}
