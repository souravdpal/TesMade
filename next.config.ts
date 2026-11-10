import type { NextConfig } from "next";
import { off } from "process";

const nextConfig: NextConfig = {
  devIndicators:false,
  serverExternalPackages: ["argon2"],
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    return [
      {
        source : "/signup",
        destination :"/outh/u/signup",
        permanent : false
       
      },
      {
        source : "/login",
        destination :"/outh/u/login",
        permanent : false
       
      },
      {
        source : "/",
        destination :"/home",
        permanent : false
       
      }
    ]
  }
};

export default nextConfig;
