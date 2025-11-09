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

  /**
   * Download Purchase Order PDF
   * @param {number} requestId - Purchase request ID
   * @returns {Promise<Blob>} PDF blob
   */
  async downloadPurchaseOrderPdf(requestId) {
    // Get fresh token from Firebase (not from localStorage)
    const token = await this.getAuthToken();

    // If no token, throw a clear error before making the request
    if (!token) {
      throw new Error(
        "No authentication token available. Please sign in again."
      );
    }

    let response = await fetch(
      `${this.baseURL}/receiving/purchase-request/${requestId}/purchase-order-pdf`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    // Handle 401 errors (expired token) and retry once
    if (response.status === 401) {
      try {
        const auth = getAuth();
        const user = auth.currentUser;

        if (user) {
          // Force refresh the token
          const newToken = await user.getIdToken(true);

          // Update localStorage
          localStorage.setItem("idToken", newToken);

          // Retry the request with new token
          response = await fetch(
            `${this.baseURL}/receiving/purchase-request/${requestId}/purchase-order-pdf`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${newToken}`,
              },
            }
          );

          // If still 401 after refresh, throw error
          if (response.status === 401) {
            throw new Error("Authentication failed. Please sign in again.");
          }
        } else {
          throw new Error("No authenticated user found");
        }
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        throw new Error("Authentication failed. Please sign in again.");
      }
    }

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Purchase Order PDF not found");
      }
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.blob();
  }

  async generateQrCodes(requestId) {
    return this.makeRequest(
      `/receiving/purchase-request/${requestId}/generate-qr-codes`,
      {
        method: "POST",
      }
    );
  }

  async downloadQrCodesZip(requestId) {
    const token = await this.getAuthToken();

    if (!token) {
      throw new Error(
        "No authentication token available. Please sign in again."
      );
    }

    let response = await fetch(
      `${this.baseURL}/receiving/purchase-request/${requestId}/qr-codes/download`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 401) {
      try {
        const auth = getAuth();
        const user = auth.currentUser;

        if (user) {
          const newToken = await user.getIdToken(true);
          localStorage.setItem("idToken", newToken);
          response = await fetch(
            `${this.baseURL}/receiving/purchase-request/${requestId}/qr-codes/download`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${newToken}`,
              },
            }
          );

          if (response.status === 401) {
            throw new Error("Authentication failed. Please sign in again.");
          }
        } else {
          throw new Error("No authenticated user found");
        }
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        throw new Error("Authentication failed. Please sign in again.");
      }
    }

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("No QR codes found for this request");
      }
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.blob();
  }

  async getQrDetail(requestId, itemId, token) {
    return this.makeRequest(`/receiving/qr/${requestId}/${itemId}/${token}`);
  }

  /**
   * Get Purchase Order metadata (without PDF data)
   * @param {number} requestId - Purchase request ID
   * @returns {Promise<Object>} Purchase Order metadata
   */
  async getPurchaseOrderInfo(requestId) {
    return this.makeRequest(
      `/receiving/purchase-request/${requestId}/purchase-order-info`
    );
  }

  /**
   * Check if Purchase Order PDF exists
   * @param {number} requestId - Purchase request ID
   * @returns {Promise<boolean>} True if PDF exists
   */
  async checkPurchaseOrderExists(requestId) {
    try {
      const result = await this.makeRequest(
        `/receiving/purchase-request/${requestId}/purchase-order-exists`
      );
      return result.data?.purchase_order_exists || false;
    } catch (error) {
      console.error("Error checking Purchase Order existence:", error);
      return false;
    }
  }
}

export default new PurchaseRequestApiService();
