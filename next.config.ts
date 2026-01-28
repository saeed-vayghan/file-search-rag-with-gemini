import type { NextConfig } from "next";
import { MAX_FILE_SIZE_BYTES } from "./src/config/limits";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  reactCompiler: true,
  experimental: {
    serverActions: {
      bodySizeLimit: MAX_FILE_SIZE_BYTES,
    },
  },
};

export default nextConfig;
