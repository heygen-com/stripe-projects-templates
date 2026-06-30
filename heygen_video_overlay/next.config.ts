import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The pipeline shells out to the hyperframes CLI and reads/writes files on disk,
  // so the generate route must run on the Node.js runtime (not edge).
  serverExternalPackages: ["ffmpeg-static"],
};

export default nextConfig;
