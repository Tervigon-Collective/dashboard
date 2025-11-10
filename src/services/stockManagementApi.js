import config from "../config";
import { getAuth, onAuthStateChanged } from "firebase/auth";

class StockManagementApiService {
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

  async makeRequest(endpoint, options = {}) {
    // Get fresh token from Firebase (not from localStorage)
    const token = await this.getAuthToken();

    // If no token, throw a clear error before making the request
    if (!token) {
      throw new Error(
        "No authentication token available. Please sign in again."
      );
    }

    const defaultOptions = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    };

    const requestOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(
        `${this.baseURL}${endpoint}`,
        requestOptions
      );

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
            });
          }
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
          throw new Error("Authentication failed. Please sign in again.");
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return response.json();
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }

  /**
   * Get inventory for a specific variant
   */
  async getVariantInventory(variantId) {
    return this.makeRequest(
      `/stock-management/variants/${variantId}/inventory`
    );
  }

  /**
   * Get inventory for all variants with pagination
   */
  async getAllVariantsInventory(page = 1, limit = 50) {
    const params = new URLSearchParams({ page, limit });
    return this.makeRequest(`/stock-management/variants/inventory?${params}`);
  }

  /**
   * Get pending returns for approval
   */
  async getPendingReturns(page = 1, limit = 50) {
    const params = new URLSearchParams({ page, limit });
    return this.makeRequest(`/stock-management/returns/pending?${params}`);
  }

  /**
   * Get all returns with optional status filter
   */
  async getAllReturns(page = 1, limit = 50, status = null) {
    const params = new URLSearchParams({ page, limit });
    if (status) {
      params.append("status", status);
    }
    return this.makeRequest(`/stock-management/returns?${params}`);
  }

  /**
   * Approve a return
   */
  async approveReturn(eventId) {
    return this.makeRequest(`/stock-management/returns/${eventId}/approve`, {
      method: "POST",
    });
  }

  /**
   * Reject a return
   */
  async rejectReturn(eventId, rejectionReason = null) {
    return this.makeRequest(`/stock-management/returns/${eventId}/reject`, {
      method: "POST",
      body: JSON.stringify({ rejection_reason: rejectionReason }),
    });
  }
}

export default new StockManagementApiService();
