import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async headers() {
    return [
      {
        source: "/games/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; form-action 'none'; frame-ancestors 'self'; base-uri 'none'",
          },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), clipboard-read=(), clipboard-write=()" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
