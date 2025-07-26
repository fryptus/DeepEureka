import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 禁用图片优化
  images: {
    unoptimized: true,
  },

  // 禁用不必要的功能
  poweredByHeader: false,
  
  // 确保静态文件正确处理
  trailingSlash: false,
  
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
