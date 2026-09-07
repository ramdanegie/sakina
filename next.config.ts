import type { NextConfig } from "next";

/**
 * Two build targets from one codebase:
 *
 *   BUILD_TARGET=static      → `out/` full of index.html, for any static host
 *                              (cPanel, Netlify, Cloudflare Pages, S3, nginx)
 *   BUILD_TARGET=standalone  → `.next/standalone`, for Node hosting
 *                              (Passenger, PM2, Docker)
 *
 * Static is the default because this app has no server work to do: every page
 * is client-rendered and all data is fetched from public CDNs in the browser.
 */
const target = process.env.BUILD_TARGET ?? "static";
const isStatic = target === "static";

const nextConfig: NextConfig = {
  output: isStatic ? "export" : "standalone",

  // Pin the workspace root. Without this, Turbopack walks up and finds a
  // stray lock file in the home directory, then warns on every build.
  turbopack: {
    root: import.meta.dirname,
  },

  // Subdirectory deploys (e.g. example.com/quran) need the asset prefix set.
  // Leave BASE_PATH unset when serving from a domain root.
  basePath: process.env.BASE_PATH || undefined,

  // Emits `about/index.html` rather than `about.html`, which is what shared
  // hosting and nginx expect for clean URLs without rewrite rules.
  trailingSlash: isStatic,

  images: {
    // The static export has no server, so there is no image optimiser to run.
    unoptimized: isStatic,
    remotePatterns: [
      { protocol: "https", hostname: "**.mp3quran.net" },
      { protocol: "https", hostname: "**.quranicaudio.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },

  // `headers()` requires a server. On the static target the equivalent
  // caching rules live in the generated .htaccess (see deploy.sh).
  ...(isStatic
    ? {}
    : {
        async headers() {
          return [
            {
              source: "/_next/static/:path*",
              headers: [
                {
                  key: "Cache-Control",
                  value: "public, max-age=31536000, immutable",
                },
              ],
            },
          ];
        },
      }),
};

export default nextConfig;
