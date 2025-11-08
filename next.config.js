const requiredEnvVars = [
  "NEXT_PUBLIC_API_BASE_URL",
  "NEXT_PUBLIC_PYTHON_API_BASE_URL",
];

const missingEnvVars = requiredEnvVars.filter(
  (key) => !process.env[key] || process.env[key].length === 0,
);

if (missingEnvVars.length > 0) {
  // Fail fast so misconfigured environments do not produce broken builds
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`,
  );
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  trailingSlash: true,
  output: "export", // Disabled to allow dynamic routes like receiving/qr/[requestId]/[itemId]/[token]
  distDir: "out",
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_PYTHON_API_BASE_URL:
      process.env.NEXT_PUBLIC_PYTHON_API_BASE_URL,
    NEXT_PUBLIC_FALLBACK_ENABLED: process.env.NEXT_PUBLIC_FALLBACK_ENABLED,
    NEXT_PUBLIC_FALLBACK_ROLE: process.env.NEXT_PUBLIC_FALLBACK_ROLE,
    NEXT_PUBLIC_OFFLINE_MODE: process.env.NEXT_PUBLIC_OFFLINE_MODE,
  },
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
