import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
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
