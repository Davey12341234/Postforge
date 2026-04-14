import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    /** Large multimodal JSON bodies (self-hosted Node). Vercel still imposes lower request limits. */
    serverActions: {
      bodySizeLimit: "512mb",
    },
  },
};

export default nextConfig;
