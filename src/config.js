// config.js

const DEFAULT_API_BASE_URL =
  "https://dashbackend-a3cbagbzg0hydhen.centralindia-01.azurewebsites.net";
// "http://localhost:8080";
const DEFAULT_PYTHON_API_BASE_URL =
  "https://contentgeneratorbackend-gvcpgcd6enavdag9.centralindia-01.azurewebsites.net";
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
