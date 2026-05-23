import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.109.1",
    "192.168.0.0/16",
  ],
};

export default nextConfig;
