import config from "../config";

class PurchaseRequestApiService {
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

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...defaultOptions,
      ...options,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.json();
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

  async getPurchaseRequestById(requestId) {
    return this.makeRequest(`/receiving/purchase-request/${requestId}`);
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
