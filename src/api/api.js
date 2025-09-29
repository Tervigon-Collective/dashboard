import axios from "axios";
import config from "../config";

// Create an axios instance with the base URL
const apiClient = axios.create({
  baseURL: config.api.baseURL,
});

// Add a request interceptor to inject the idToken for secure API calls
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const idToken = localStorage.getItem("idToken");
      if (idToken) {
        config.headers.Authorization = `Bearer ${idToken}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Function to fetch all product metrics
export const fetchProductMetrics = async () => {
  try {
    const response = await apiClient.get("/product_metrics");
    return response.data;
  } catch (error) {
    console.error("Error fetching product metrics:", error);
    throw error;
  }
};

// Export the axios instance if needed
export { apiClient };
