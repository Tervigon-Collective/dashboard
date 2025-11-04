import config from "../config";

class StockManagementApiService {
  constructor() {
    this.baseURL = config.api.baseURL + "/api";
  }

  getAuthToken() {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("idToken") || localStorage.getItem("firebaseToken")
      );
    }
    return null;
  }

  async makeRequest(endpoint, options = {}) {
    const token = this.getAuthToken();

    const defaultOptions = {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...defaultOptions,
        ...options,
      });

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
