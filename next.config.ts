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
  // Baseline hardening on every response. (No strict Content-Security-Policy yet: it needs a nonce
  // pass over inline scripts, Stripe and Supabase before it can be turned on safely.)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // The storefront Studio uses the microphone for voice input; nothing uses camera or location.
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
        ],
      },
    ];
  },
  // Parent /Users/dave/package-lock.json confuses Turbopack workspace root detection.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
