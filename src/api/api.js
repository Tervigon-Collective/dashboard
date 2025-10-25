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

// Entity Report API functions
export const fetchGoogleEntityReport = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams(params);
    const response = await apiClient.get(
      `/api/google_entity_report_aggregated?${queryParams}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching Google Entity report:", error);
    throw error;
  }
};

export const fetchMetaEntityReportHierarchy = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams(params);
    const response = await apiClient.get(
      `/api/meta_entity_report_hierarchy?${queryParams}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching Meta Entity report hierarchy:", error);
    throw error;
  }
};

export const fetchOrganicEntityReport = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams(params);
    const response = await apiClient.get(
      `/api/organic_entity_report?${queryParams}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching Organic Entity report:", error);
    throw error;
  }
};

export const fetchAmazonEntityReport = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams(params);
    const response = await apiClient.get(
      `/api/amazon_entity_report?${queryParams}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching Amazon Entity report:", error);
    throw error;
  }
};

// Export the axios instance if needed
export { apiClient };
