import config from "../config";

class QualityCheckApiService {
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

  // Bulk create/update quality checks for multiple items
  async bulkCreateOrUpdateQualityCheck(requestId, items) {
    return this.makeRequest("/receiving/quality-check/bulk", {
      method: "POST",
      body: JSON.stringify({ request_id: requestId, items }),
    });
  }

  // Get quality checks by request ID
  async getQualityChecksByRequestId(requestId) {
    return this.makeRequest(`/receiving/quality-check/request/${requestId}`);
  }
}

export default new QualityCheckApiService();
