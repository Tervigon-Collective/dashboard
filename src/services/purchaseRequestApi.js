import config from "../config";
import { getAuth, onAuthStateChanged } from "firebase/auth";

class PurchaseRequestApiService {
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

  async createPurchaseRequest(requestData) {
    return this.makeRequest("/receiving/purchase-request", {
      method: "POST",
      body: JSON.stringify(requestData),
    });
  }

  async getAllPurchaseRequests(page = 1, limit = 20) {
    const params = new URLSearchParams({ page, limit });

    return this.makeRequest(`/receiving/purchase-request?${params}`);
  }

  async getPurchaseRequestById(requestId, includeQualityCheck = false) {
    const url = includeQualityCheck
      ? `/receiving/purchase-request/${requestId}?include_quality_check=true`
      : `/receiving/purchase-request/${requestId}`;
    return this.makeRequest(url);
  }

  async updatePurchaseRequest(requestId, requestData) {
    return this.makeRequest(`/receiving/purchase-request/${requestId}`, {
      method: "PUT",
      body: JSON.stringify(requestData),
    });
  }

  async deletePurchaseRequest(requestId) {
    return this.makeRequest(`/receiving/purchase-request/${requestId}`, {
      method: "DELETE",
    });
  }

  async updateStatus(requestId, status) {
    return this.makeRequest(`/receiving/purchase-request/${requestId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }
}

export default new PurchaseRequestApiService();
