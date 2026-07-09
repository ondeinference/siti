import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required by the smbCloud `nextjs-ssr` deploy path: produces `.next/standalone`.
  output: "standalone",

  // Serve the App Store screenshots as-is. Disabling the optimizer keeps the
  // standalone server free of a runtime `sharp` dependency and the /_next/image
  // route, which simplifies the multi-tenant smbCloud deploy.
  images: {
    unoptimized: true,
  },

  // This app lives in a pnpm workspace. Pin the tracing root to the repo root so
  // Next.js traces hoisted dependencies deterministically instead of guessing from
  // multiple lockfiles. Because the root is above this app, the standalone output
  // preserves the source path (`.next/standalone/web/server.js`); the smbCloud CLI
  // handles this nested runtime layout.
  outputFileTracingRoot: path.join(__dirname, ".."),
};

export default nextConfig;
