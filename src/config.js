// config.js

const config = {
  api: {
    baseURL:
      "https://dashbackend-a3cbagbzg0hydhen.centralindia-01.azurewebsites.net",
      // "http://localhost:8080",
  },
  // Fallback configuration for offline mode
  fallback: {
    enabled: true,
    defaultRole: "user",
    offlineMode: true,
  },
};

export default config;
