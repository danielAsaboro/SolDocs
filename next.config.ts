import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@solana/web3.js", "@anthropic-ai/sdk", "pako"],
  output: "standalone",
};

export default nextConfig;
