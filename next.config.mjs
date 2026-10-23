import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  // Fix workspace root warning
  outputFileTracingRoot: __dirname,
  // Add empty turbopack config to silence warnings and enable Turbopack compatibility
  turbopack: {},
  images: {
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
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
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'assets.vercel.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: "https",
        hostname: "laget001.blob.core.windows.net", // Added for news images
      },
    ],
  },
  // Ticket sales via ClubMate ended 2026-10-01; old links and search results land on the match page.
  // Short public URLs for images, so the network tab shows /i/1920/l2/123.jpg
  // instead of long encoded query strings. Codes must match IMAGE_HOSTS in lib/image-loader.ts.
  async rewrites() {
    const hosts = {
      l1: 'az316141.cdn.laget.se', l2: 'az729104.cdn.laget.se', lb: 'laget001.blob.core.windows.net',
      ib: 'i.ibb.co', hc: 'highcon.se', wl: 'westerlinds.nu', cf: 'd3sjey3kqst1or.cloudfront.net',
      bm: 'files.builder.misssite.com', us: 'images.unsplash.com', up: 'plus.unsplash.com',
      va: 'assets.vercel.com', gh: 'avatars.githubusercontent.com', gg: 'lh3.googleusercontent.com',
    };
    return {
      beforeFiles: [
        ...Object.entries(hosts).map(([code, host]) => ({
          source: `/i/:w(\\d{1,4})/${code}/:path+`,
          destination: `/_next/image?url=https://${host}/:path*&w=:w&q=75`,
        })),
        { source: '/i/:w(\\d{1,4})/:path+', destination: '/_next/image?url=/:path*&w=:w&q=75' },
      ],
    };
  },
  async redirects() {
    return [
      { source: '/kop-biljett', destination: '/matcher', permanent: true },
      { source: '/kop-biljett/:path*', destination: '/matcher', permanent: true },
    ];
  },
  webpack: (config, { isServer }) => {
    // Add a rule to handle .mjs files
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: 'javascript/auto',
    });

    // Resolve 'fs' module for client-side if needed (e.g., for tinacms)
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }

    return config;
  },
};

export default nextConfig;
