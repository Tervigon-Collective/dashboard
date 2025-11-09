import axios from "axios";
import config from "../config";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  handleAuthError,
  isOnline,
  waitForOnline,
  retryWithBackoff,
} from "../utils/authErrorHandler";

// Create an axios instance with the base URL
const apiClient = axios.create({
  baseURL: config.api.baseURL,
});

// Token refresh queue management
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

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
        // getIdToken() automatically refreshes expired tokens
        // Firebase SDK handles token refresh internally
        tokenToUse = await user.getIdToken();
      } catch (error) {
        console.error("Error getting ID token:", error);
        // Don't fallback to localStorage - it might be expired
        // Let backend return 401, which will trigger refresh in response interceptor
      }
    }

    // Only use token if we got it from Firebase user
    // REMOVED: localStorage fallback to prevent expired tokens
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

// Add a response interceptor to handle 401 errors and refresh tokens
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is due to expired token
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      typeof window !== "undefined"
    ) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
          // No authenticated user - handle gracefully
          const error = new Error("No authenticated user found");
          error.code = "auth/no-user";

          const handled = await handleAuthError(error, {
            enableRedirect: true,
            showNotification: true,
          });

          if (handled.handled) {
            processQueue(error, null);
            return Promise.reject(error);
          }
          throw error;
        }

        // Check network connectivity before attempting refresh
        if (!isOnline()) {
          await waitForOnline(10000); // Wait up to 10 seconds
        }

        // Retry token refresh with exponential backoff for network issues
        const newToken = await retryWithBackoff(
          async () => {
            // Force refresh the token
            const token = await user.getIdToken(true);
            return token;
          },
          { maxRetries: 3, initialDelay: 1000 }
        );

        // Update localStorage with new token (for compatibility with other parts of the app)
        if (typeof window !== "undefined") {
          localStorage.setItem("idToken", newToken);
        }

        // Update the original request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        // Process queued requests
        processQueue(null, newToken);

        // Retry the original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);

        // Handle the error with appropriate recovery strategy
        const errorInfo = await handleAuthError(refreshError, {
          enableRedirect: true,
          showNotification: true,
          retryCount: 0,
        });

        // Process queue with error
        processQueue(refreshError, null);

        // If error was handled (redirected), reject with handled flag
        if (errorInfo.handled) {
          const handledError = new Error(
            "Authentication failed - redirecting to sign in"
          );
          handledError.handled = true;
          handledError.code = refreshError.code || "auth/refresh-failed";
          return Promise.reject(handledError);
        }

        // Return the original error if refresh fails
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
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
