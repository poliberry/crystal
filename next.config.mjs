/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utfs.io",
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
  serverExternalPackages: ['cassandra-driver'],
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      // More aggressive client-side exclusions
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        dns: false,
        'cassandra-driver': false,
        'long': false,
        'util': false,
        'path': false,
        'url': false,
        'stream': false,
        'os': false,
        'child_process': false,
        'events': false,
        'buffer': false,
      };
      
      // Add module replacement rules
      config.resolve.alias = {
        ...config.resolve.alias,
        'cassandra-driver': false,
        'dns': false,
      };
      
      // Configure externals to ignore these modules
      const originalExternals = config.externals || [];
      config.externals = [
        ...originalExternals,
        ({ request }, callback) => {
          if (request === 'cassandra-driver' || request === 'dns' || request === 'net' || request === 'tls') {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        }
      ];
    }
    
    return config;
  },
};

export default nextConfig;
