import type { NextConfig } from "next";
import dotenv from "dotenv";

dotenv.config();

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  transpilePackages: ["@bytebot/shared"],
};

export default nextConfig;
