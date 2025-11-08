// config.js

const requiredEnvVar = (key) => {
  const value = process.env[key];
  if (!value) {
    const message = `[config] Missing required environment variable: ${key}`;
    if (typeof window === "undefined") {
      throw new Error(message);
    }
    console.error(message);
  }
  return value ?? "";
};

const parseBoolean = (value, defaultValue) => {
  if (value === undefined) {
    return defaultValue;
  }
  return ["true", "1", "yes", "on"].includes(String(value).toLowerCase());
};

const config = {
  api: {
    baseURL: requiredEnvVar("NEXT_PUBLIC_API_BASE_URL"),
  },
  pythonApi: {
    baseURL: requiredEnvVar("NEXT_PUBLIC_PYTHON_API_BASE_URL"),
  },
  fallback: {
    enabled: parseBoolean(process.env.NEXT_PUBLIC_FALLBACK_ENABLED, true),
    defaultRole: process.env.NEXT_PUBLIC_FALLBACK_ROLE ?? "",
    offlineMode: parseBoolean(process.env.NEXT_PUBLIC_OFFLINE_MODE, true),
  },
};

export default config;
