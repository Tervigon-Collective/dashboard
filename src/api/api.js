import axios from "axios";
import config from "../config";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// Create an axios instance with the base URL
const apiClient = axios.create({
  baseURL: config.api.baseURL,
});

// Add a request interceptor to inject the idToken for secure API calls
apiClient.interceptors.request.use(
  async (config) => {
    const auth = getAuth();
    let user = auth.currentUser;
    if (!user && typeof window !== "undefined") {
      user = await new Promise((resolve) => {
        const unsub = onAuthStateChanged(auth, (u) => {
          unsub();
          resolve(u);
        });
        setTimeout(() => {
          unsub();
          resolve(null);
        }, 2500);
      });
    }
    let tokenToUse = null;
    if (user) {
      try {
        tokenToUse = await user.getIdToken();
      } catch (_) {
        // let backend return 401
      }
    }
    if (!tokenToUse && typeof window !== "undefined") {
      // fallback to previously stored token if available
      tokenToUse =
        localStorage.getItem("idToken") ||
        localStorage.getItem("firebaseToken");
    }
    if (tokenToUse) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${tokenToUse}`;
    }
    if (process.env.NODE_ENV !== "production") {
      try {
        const urlStr = (config.baseURL || "") + (config.url || "");
        if (urlStr.includes("/api/customer-orders")) {
          // Lightweight debug to confirm header presence for this route
          // eslint-disable-next-line no-console
          console.debug(
            "[apiClient] customer-orders auth attached:",
            !!config.headers?.Authorization
          );
        }
      } catch (_) {}
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
