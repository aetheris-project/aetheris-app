/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  experimental: {
    serverComponentsExternalPackages: ["bullmq", "ioredis", "@prisma/client"]
  }
};

export default nextConfig;
