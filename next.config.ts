import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enables `.next/standalone` for copying a self-contained build to USB / server (see scripts/export-standalone-to-usb.ps1).
  output: "standalone",
  experimental: {
    /** Large multimodal JSON bodies (self-hosted Node). Vercel still imposes lower request limits. */
    serverActions: {
      bodySizeLimit: "512mb",
    },
  },
};

export default nextConfig;
