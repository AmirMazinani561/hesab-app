import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // سرور روی هاست شخصی هم باید بتواند اجرا شود
  output: process.env.STANDALONE ? "standalone" : undefined,
};

export default nextConfig;
