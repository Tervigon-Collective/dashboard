// config.js

const parseBoolean = (value, defaultValue) => {
  if (value === undefined) {
    return defaultValue;
  }
  return ["true", "1", "yes", "on"].includes(String(value).toLowerCase());
};

const DEFAULT_API_BASE_URL =
  "https://dashbackend-a3cbagbzg0hydhen.centralindia-01.azurewebsites.net";
const DEFAULT_PYTHON_API_BASE_URL =
  "https://contentgeneratorbackend-gvcpgcd6enavdag9.centralindia-01.azurewebsites.net";

const config = {
  api: {
    baseURL:
      process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL,
  },
  pythonApi: {
    baseURL:
      process.env.NEXT_PUBLIC_PYTHON_API_BASE_URL?.trim() ||
      DEFAULT_PYTHON_API_BASE_URL,
  },
  fallback: {
    enabled: parseBoolean(process.env.NEXT_PUBLIC_FALLBACK_ENABLED, true),
    defaultRole: process.env.NEXT_PUBLIC_FALLBACK_ROLE?.trim() || "user",
    offlineMode: parseBoolean(process.env.NEXT_PUBLIC_OFFLINE_MODE, true),
  },
};

export default config;
