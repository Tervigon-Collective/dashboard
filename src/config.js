// config.js

const DEFAULT_API_BASE_URL =
  // "http://localhost:8081";
  "https://node.seleric.cloud";
const DEFAULT_PYTHON_API_BASE_URL =
  "https://python.seleric.cloud/content-generation";
  // "http://localhost:8000";
const DEFAULT_FALLBACK_ENABLED = true;
const DEFAULT_FALLBACK_ROLE = "";
const DEFAULT_OFFLINE_MODE = true;

const config = {
  api: {
    baseURL: DEFAULT_API_BASE_URL,
  },
  pythonApi: {
    baseURL: DEFAULT_PYTHON_API_BASE_URL,
  },
  fallback: {
    enabled: DEFAULT_FALLBACK_ENABLED,
    defaultRole: DEFAULT_FALLBACK_ROLE,
    offlineMode: DEFAULT_OFFLINE_MODE,
  },
};

export default config;
