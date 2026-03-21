import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Local dev backend
      { protocol: 'http', hostname: 'localhost', port: '8000', pathname: '/uploads/**' },
      // Render production backend (*.onrender.com)
      { protocol: 'https', hostname: '**.onrender.com', pathname: '/uploads/**' },
    ],
  },
};

export default nextConfig;
