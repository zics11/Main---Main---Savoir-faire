import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      // Fiche edits can submit several photos in one multipart request
      // (each validated up to 10 MB in lib/upload.ts) — well above the
      // 1 MB default for Server Action bodies.
      bodySizeLimit: "40mb",
    },
    // /admin routes go through proxy.ts, which has its own separate 10 MB
    // body limit (defaults independently of serverActions.bodySizeLimit
    // above) — without raising this too, large uploads get silently
    // truncated by the proxy and fail deep in multipart parsing with a
    // confusing "Unexpected end of form" error.
    proxyClientMaxBodySize: "40mb",
  },
};

export default nextConfig;
