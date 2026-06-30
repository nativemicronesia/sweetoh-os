import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./modules/intelligence/product-engine/db/schema.ts",
  out: "./modules/intelligence/product-engine/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DEKAZ_DATABASE_URL!,
  },
});
