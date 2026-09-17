import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Include Sharp's native libraries in serverless bundles as well as its JS.
  outputFileTracingIncludes: {
    "/**": ["./node_modules/@img/**/*", "./node_modules/sharp/**/*"],
  },
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  // Parent /Users/dave/package-lock.json confuses Turbopack workspace root detection.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
