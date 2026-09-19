"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCreator } from "@/lib/domains/identity/service";
import { archiveAsset } from "@/lib/domains/assets/service";

export async function deleteDesignAction(id: string) {
  const session = await requireCreator();
  await archiveAsset({ ventureId: session.ventureId, assetId: z.string().uuid().parse(id), actorUserId: session.appUser.id, reason: "Deleted by creator" });
  revalidatePath("/studio/designs");
  revalidatePath("/studio");
}
