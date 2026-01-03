/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utfs.io",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  devIndicators: false,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent client-side loading of prisma
      config.resolve.alias = {
        ...config.resolve.alias,
        '.prisma/client/index-browser': false,
        '@prisma/client/index-browser': false,
        '@prisma/client': false,
      };
      
      // Handle Node.js specific modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    
    return config;
  },
};

export default nextConfig;
