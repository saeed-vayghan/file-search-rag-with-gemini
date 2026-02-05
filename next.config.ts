import type { NextConfig } from "next";
import { MAX_FILE_SIZE_BYTES } from "./src/config/limits";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: MAX_FILE_SIZE_BYTES,
    },
  },
};

export default nextConfig;
