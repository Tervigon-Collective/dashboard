/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  trailingSlash: true,
  // Removed output: "export" to support dynamic routes with Azure Static Web Apps
  images: { unoptimized: true },
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.resolve.fallback = { ...config.resolve.fallback, fs: false };
    }

    // Disable webpack cache warnings for better performance
    if (dev) {
      config.infrastructureLogging = {
        level: "error",
      };
    }

    // Optimize CSS processing
    config.module.rules.forEach((rule) => {
      if (rule.oneOf) {
        rule.oneOf.forEach((oneOfRule) => {
          if (oneOfRule.use && Array.isArray(oneOfRule.use)) {
            oneOfRule.use.forEach((useItem) => {
              if (useItem.loader && useItem.loader.includes("postcss-loader")) {
                useItem.options = {
                  ...useItem.options,
                  postcssOptions: {
                    ...useItem.options?.postcssOptions,
                    plugins: [
                      ...(useItem.options?.postcssOptions?.plugins || []),
                      // Add a plugin to handle empty URLs gracefully
                      ["postcss-url", { url: "rebase" }],
                    ],
                  },
                };
              }
            });
          }
        });
      }
    });

    return config;
  },
};

module.exports = nextConfig;
