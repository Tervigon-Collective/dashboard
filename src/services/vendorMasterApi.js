import config from "../config";

class VendorMasterApiService {
  constructor() {
    this.baseURL = config.api.baseURL + "/api"; // Add /api prefix here
    console.log(
      "VendorMasterApiService initialized with baseURL:",
      this.baseURL
    );
  }

  // Get authentication token
  getAuthToken() {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("idToken") || localStorage.getItem("firebaseToken")
      );
    }
    return null;
  }

  // Make authenticated request
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

  // Create vendor
  async createVendor(vendorData) {
    return this.makeRequest("/masters/vendor", {
      method: "POST",
      body: JSON.stringify(vendorData),
    });
  }

  // Get all vendors
  async getAllVendors(page = 1, limit = 20, status = null) {
    const params = new URLSearchParams({ page, limit });
    if (status) params.append("status", status);

    return this.makeRequest(`/masters/vendor?${params}`);
  }

  // Get vendor by ID
  async getVendorById(vendorId) {
    return this.makeRequest(`/masters/vendor/${vendorId}`);
  }

  // Update vendor
  async updateVendor(vendorId, updateData) {
    return this.makeRequest(`/masters/vendor/${vendorId}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    });
  }

  // Delete vendor
  async deleteVendor(vendorId) {
    return this.makeRequest(`/masters/vendor/${vendorId}`, {
      method: "DELETE",
    });
  }
}

// Export singleton instance
const vendorMasterApi = new VendorMasterApiService();
export default vendorMasterApi;
