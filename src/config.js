// config.js

const config = {
  api: {
    baseURL:
      // "https://dashbackend-a3cbagbzg0hydhen.centralindia-01.azurewebsites.net",
      "http://localhost:8080",
  },
  // Python backend URL for content generation
  pythonApi: {
    baseURL:
      "https://contentgeneratorbackend-gvcpgcd6enavdag9.centralindia-01.azurewebsites.net",
  },
  // Fallback configuration for offline mode
  fallback: {
    enabled: true,
    defaultRole: "user",
    offlineMode: true,
  },
};

export default config;
