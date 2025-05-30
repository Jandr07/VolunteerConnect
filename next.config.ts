import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Your existing config options here */
  // Add the ESLint configuration below
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors. This is strongly discouraged for most cases.
    ignoreDuringBuilds: true,
  },
  // reactStrictMode: true, // Example of another common option you might have
};

export default nextConfig;