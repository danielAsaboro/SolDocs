import type { NextConfig } from "next";
import path from "path";

const backendPath = path.resolve(__dirname, "../src");

const nextConfig: NextConfig = {
  serverExternalPackages: ["@solana/web3.js", "@anthropic-ai/sdk", "pako"],
  turbopack: {
    resolveAlias: {
      "@backend": backendPath,
    },
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@backend": backendPath,
    };
    if (isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
