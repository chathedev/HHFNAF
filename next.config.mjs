/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // Removed unoptimized: true to allow Next.js image optimization
    remotePatterns: [
      {
        protocol: "https",
        hostname: "az316141.cdn.laget.se",
      },
      {
        protocol: "https",
        hostname: "i.ibb.co",
      },
      {
        protocol: "https",
        hostname: "highcon.se",
      },
      {
        protocol: "https",
        hostname: "az729104.cdn.laget.se",
      },
      {
        protocol: "https",
        hostname: "westerlinds.nu",
      },
      {
        protocol: "https",
        hostname: "d3sjey3kqst1or.cloudfront.net",
      },
      {
        protocol: "https",
        hostname: "files.builder.misssite.com",
      },
    ],
  },
}

export default nextConfig
