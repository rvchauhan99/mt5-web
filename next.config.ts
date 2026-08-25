import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/notifications", destination: "/dashboard", permanent: false }];
  },
};

export default nextConfig;
