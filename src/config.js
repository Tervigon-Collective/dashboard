// config.js

const config = {
  api: {
    baseURL: process.env.NODE_ENV === 'production' 
      ? "https://dashbackend-a3cbagbzg0hydhen.centralindia-01.azurewebsites.net"
      : "http://localhost:8080",
  },
};

export default config;
