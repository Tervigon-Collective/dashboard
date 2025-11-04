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

  // Parse error response and create user-friendly error message
  async parseErrorResponse(response) {
    let errorData = {};
    const contentType = response.headers.get("content-type");
    
    try {
      if (contentType && contentType.includes("application/json")) {
        const text = await response.text();
        errorData = text ? JSON.parse(text) : {};
      } else {
        const text = await response.text();
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
        message: errorData.message || "Your session has expired. Please sign in again.",
        error: errorData,
      };
    }

    // Handle other errors
    return {
      success: false,
      message: errorData.message || errorData.error || `Request failed with status ${response.status}`,
      error: errorData,
    };
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

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...defaultOptions,
        ...options,
      });

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
        // HTTP status indicates error - parse the result we already got
        const errorResult = {
          success: false,
          message: result.message || result.error || "Request failed",
          validationErrors: result.validationErrors || (result.details ? result.details.map((detail) => {
            const field = detail.path || detail.field || "field";
            const message = detail.msg || detail.message || "Invalid value";
            return `${field}: ${message}`;
          }) : undefined),
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
          validationErrors: result.validationErrors || (result.details ? result.details.map((detail) => {
            const field = detail.path || detail.field || "field";
            const message = detail.msg || detail.message || "Invalid value";
            return `${field}: ${message}`;
          }) : undefined),
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
        const networkError = new Error("Network error: Unable to connect to the server. Please check your connection.");
        networkError.result = {
          success: false,
          message: "Network error: Unable to connect to the server. Please check your connection.",
          error: { networkError: true },
        };
        throw networkError;
      }

      // Re-throw other errors
      throw error;
    }
  }

  // Create vendor
  async createVendor(vendorData) {
    return this.makeRequest("/masters/vendor", {
      method: "POST",
      body: JSON.stringify(vendorData),
    });
  }

  // Get all vendors
  async getAllVendors(page = 1, limit = 20, options = {}) {
    const params = new URLSearchParams({ page, limit });
    
    // Add search parameter (searches across all vendor fields)
    if (options.search && options.search.trim()) {
      params.append("search", options.search.trim());
    }
    
    // Add filter parameters
    if (options.status && options.status !== "all") {
      params.append("status", options.status);
    }
    
    if (options.commonNameFilter && options.commonNameFilter !== "all") {
      params.append("commonNameFilter", options.commonNameFilter);
    }
    
    // Add sorting parameters
    if (options.sortField) {
      params.append("sortBy", options.sortField);
      params.append("sortOrder", options.sortDirection || "asc");
    }

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
