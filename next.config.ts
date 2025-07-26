import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  // 启用独立输出模式，生成自包含的服务器
  output: 'standalone',
  
  images: {
    unoptimized: true,
  },

  // 禁用不兼容的功能
  poweredByHeader: false,

  // Webpack 配置
  webpack: (config, { isServer }) => {
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
