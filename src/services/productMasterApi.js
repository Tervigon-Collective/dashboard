import config from "../config";
import { getAuth, onAuthStateChanged } from "firebase/auth";

class ProductMasterApiService {
  constructor() {
    this.baseURL = config.api.baseURL + "/api";
  }

  async getAuthToken() {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const auth = getAuth();
      let user = auth.currentUser;

      // If no current user, wait for auth state to be ready
      if (!user) {
        user = await new Promise((resolve) => {
          const unsubscribe = onAuthStateChanged(auth, (u) => {
            unsubscribe();
            resolve(u);
          });
          // Timeout after 3 seconds
          setTimeout(() => {
            unsubscribe();
            resolve(null);
          }, 3000);
        });
      }

      if (!user) {
        return null;
      }

      // getIdToken() automatically refreshes expired tokens
      const token = await user.getIdToken();

      // Update localStorage for compatibility with other parts of the app
      localStorage.setItem("idToken", token);

      return token;
    } catch (error) {
      console.error("Error getting auth token:", error);
      return null;
    }
  }

  // Parse error response and create user-friendly error message
  async parseErrorResponse(response) {
    let errorData = {};
    const contentType = response.headers.get("content-type");

    try {
      const text = await response.text();

      if (contentType && contentType.includes("application/json") && text) {
        errorData = JSON.parse(text);
      } else {
        errorData = { message: text || "An error occurred" };
      }
    } catch (parseError) {
      errorData = { message: "Failed to parse error response" };
    }

    // Extract validation errors
    if (errorData.details && Array.isArray(errorData.details)) {
      const validationMessages = errorData.details.map((detail) => {
        const field = detail.path || detail.field || "field";
        const message = detail.msg || detail.message || "Invalid value";
        return `${field}: ${message}`;
      });

      return {
        success: false,
        message: errorData.message || "Validation failed",
        validationErrors: validationMessages,
        error: errorData,
      };
    }

    // Handle authentication errors
    if (response.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("idToken");
        localStorage.removeItem("firebaseToken");
      }
      return {
        success: false,
        message:
          errorData.message ||
          "Your session has expired. Please sign in again.",
        error: errorData,
      };
    }

    // Handle other errors
    return {
      success: false,
      message:
        errorData.message ||
        errorData.error ||
        `Request failed with status ${response.status}`,
      error: errorData,
    };
  }

  async makeRequest(endpoint, options = {}) {
    // Get fresh token from Firebase (not from localStorage)
    const token = await this.getAuthToken();

    // If no token, throw a clear error before making the request
    if (!token) {
      const error = new Error(
        "No authentication token available. Please sign in again."
      );
      error.code = "auth/no-token";
      error.result = {
        success: false,
        message: "No authentication token available. Please sign in again.",
        error: { code: "auth/no-token" },
      };
      error.status = 401;
      throw error;
    }

    const defaultOptions = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    };

    try {
      let response = await fetch(`${this.baseURL}${endpoint}`, {
        ...defaultOptions,
        ...options,
      });

      // Handle 401 errors (expired token) and retry once
      if (response.status === 401 && !options._retry) {
        try {
          const auth = getAuth();
          const user = auth.currentUser;

          if (user) {
            // Force refresh the token
            const newToken = await user.getIdToken(true);

            // Update localStorage
            localStorage.setItem("idToken", newToken);

            // Retry the request with new token
            return this.makeRequest(endpoint, {
              ...options,
              _retry: true,
              headers: {
                ...defaultOptions.headers,
                Authorization: `Bearer ${newToken}`,
                ...options.headers,
              },
            });
          }
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
          // Clear auth data if refresh fails
          if (typeof window !== "undefined") {
            localStorage.removeItem("idToken");
            localStorage.removeItem("firebaseToken");
          }
          // Return authentication error
          const errorResult = {
            success: false,
            message: "Your session has expired. Please sign in again.",
            error: { code: "auth/id-token-expired" },
          };
          const error = new Error(errorResult.message);
          error.result = errorResult;
          error.status = 401;
          throw error;
        }
      }

      const contentType = response.headers.get("content-type");
      let result;

      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
      } else {
        const text = await response.text();
        result = { success: true, data: text };
      }

      // Check if response is ok AND result has success field
      if (!response.ok) {
        // HTTP status indicates error - use the result we already parsed
        const errorResult = {
          success: false,
          message: result.message || result.error || "Request failed",
          validationErrors:
            result.validationErrors ||
            (result.details
              ? result.details.map((detail) => {
                  const field = detail.path || detail.field || "field";
                  const message =
                    detail.msg || detail.message || "Invalid value";
                  return `${field}: ${message}`;
                })
              : undefined),
          error: result,
        };
        const error = new Error(errorResult.message);
        error.result = errorResult;
        error.status = response.status;
        throw error;
      }

      // Check if result has success: false even with 200 status
      if (result && result.success === false) {
        // API returned success: false in response body
        const errorResult = {
          success: false,
          message: result.message || result.error || "Request failed",
          validationErrors:
            result.validationErrors ||
            (result.details
              ? result.details.map((detail) => {
                  const field = detail.path || detail.field || "field";
                  const message =
                    detail.msg || detail.message || "Invalid value";
                  return `${field}: ${message}`;
                })
              : undefined),
          error: result,
        };
        const error = new Error(errorResult.message);
        error.result = errorResult;
        error.status = response.status;
        throw error;
      }

      // Return successful result
      return result;
    } catch (error) {
      // If it's already our formatted error, re-throw it
      if (error.result) {
        throw error;
      }

      // Handle network errors
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        const networkError = new Error(
          "Network error: Unable to connect to the server. Please check your connection."
        );
        networkError.result = {
          success: false,
          message:
            "Network error: Unable to connect to the server. Please check your connection.",
          error: { networkError: true },
        };
        throw networkError;
      }

      // Re-throw other errors
      throw error;
    }
  }

  async createProduct(productData) {
    return this.makeRequest("/masters/product", {
      method: "POST",
      body: JSON.stringify(productData),
    });
  }

  async getAllProducts(page = 1, limit = 20, options = {}) {
    const params = new URLSearchParams({ page, limit });

    // Add search parameter
    if (options.search && options.search.trim()) {
      params.append("search", options.search.trim());
    }

    if (options.sku && options.sku.trim()) {
      params.append("sku", options.sku.trim());
    }

    // Add sorting parameters
    if (options.sortField) {
      params.append("sortBy", options.sortField);
      params.append("sortOrder", options.sortDirection || "asc");
    }

    return this.makeRequest(`/masters/product?${params}`);
  }

  async getProductById(productId) {
    return this.makeRequest(`/masters/product/${productId}`);
  }

  async updateProduct(productId, productData) {
    return this.makeRequest(`/masters/product/${productId}`, {
      method: "PUT",
      body: JSON.stringify(productData),
    });
  }

  async deleteProduct(productId) {
    return this.makeRequest(`/masters/product/${productId}`, {
      method: "DELETE",
    });
  }

  async syncProducts() {
    return this.makeRequest("/products/sync", {
      method: "POST",
    });
  }
}

export default new ProductMasterApiService();
