/** Initialize catalog structure only. Real products come from the partner catalog. */
import { config } from "dotenv";
config({ path: ".env.local" });
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { venture } from "@/lib/db/schema";
import { getServerEnv } from "@/lib/config/env";
import { syncAutomaticCollections } from "@/lib/domains/catalog/service";
async function main() {
  const [row] = await getDb()
    .select()
    .from(venture)
    .where(eq(venture.slug, getServerEnv().ventureSlug))
    .limit(1);
  if (!row) throw new Error("Run db:seed to initialize the venture first.");
  await syncAutomaticCollections(row.id);
  console.log(
    "Catalog categories initialized. No sample products or images created.",
  );
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
