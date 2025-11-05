import config from "../config";

class ProcurementApiService {
  constructor() {
    this.baseURL = config.api.baseURL + "/api"; // Add /api prefix here
    this.tokenRefreshInterval = null;

    // Start periodic token refresh
    this.startTokenRefresh();
  }

  // Start periodic token refresh every 45 minutes (tokens expire in 1 hour)
  startTokenRefresh() {
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
    }

    this.tokenRefreshInterval = setInterval(async () => {
      try {
        const { auth } = await import("../helper/firebase");
        const currentUser = auth.currentUser;

        if (currentUser) {
          const newToken = await currentUser.getIdToken(true);
          localStorage.setItem("idToken", newToken);
        }
      } catch (error) {
        console.error("Periodic token refresh failed:", error);
      }
    }, 45 * 60 * 1000); // 45 minutes
  }

  // Stop token refresh interval
  stopTokenRefresh() {
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
      this.tokenRefreshInterval = null;
    }
  }

  // Helper method to get auth token (using idToken like Entity Report API)
  getAuthToken() {
    if (typeof window === "undefined") return null;
    const token = localStorage.getItem("idToken");

    // Basic token validation
    if (token && !token.startsWith("eyJ")) {
      console.warn("Invalid token format detected, clearing token");
      localStorage.removeItem("idToken");
      return null;
    }

    return token;
  }

  // Helper method to wait for auth state to be ready
  async waitForAuthState() {
    return new Promise(async (resolve) => {
      const { auth } = await import("../helper/firebase");
      const { onAuthStateChanged } = await import("firebase/auth");

      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        unsubscribe();
        resolve(null);
      }, 5000);
    });
  }

  // Helper method to check if user is authenticated and get fresh token
  async isAuthenticated() {
    try {
      const { auth } = await import("../helper/firebase");
      let currentUser = auth.currentUser;

      // If no current user, wait for auth state
      if (!currentUser) {
        currentUser = await this.waitForAuthState();
      }

      if (!currentUser) {
        return false;
      }

      // Check if user is actually signed in
      if (currentUser.uid === null || currentUser.uid === undefined) {
        return false;
      }

      // Try to get a fresh token to ensure it's valid
      try {
        const freshToken = await currentUser.getIdToken(false); // Don't force refresh initially

        // Update localStorage with fresh token
        localStorage.setItem("idToken", freshToken);

        return true;
      } catch (tokenError) {
        console.error("❌ Token validation failed:", tokenError);
        return false;
      }
    } catch (error) {
      console.error("❌ Error checking authentication:", error);
      return false;
    }
  }

  // Helper method to clear authentication data
  clearAuthData() {
    try {
      localStorage.removeItem("idToken");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userData");
    } catch (error) {
      console.error("Error clearing auth data:", error);
    }
  }

  // Helper method to get fresh token
  async getFreshToken() {
    try {
      const { auth } = await import("../helper/firebase");
      const currentUser = auth.currentUser;

      if (!currentUser) {
        console.error("No authenticated user found");
        return null;
      }

      // Get fresh token
      const token = await currentUser.getIdToken(false);

      // Update localStorage with fresh token
      localStorage.setItem("idToken", token);

      return token;
    } catch (error) {
      console.error("Error getting fresh token:", error);
      return null;
    }
  }

  // Helper method to use UserContext refreshToken if available
  async refreshTokenViaContext() {
    try {
      // Try to get UserContext refreshToken function
      const { useUser } = await import("../helper/UserContext");

      // This won't work in a service class, so we'll use direct Firebase approach
      return await this.refreshToken();
    } catch (error) {
      console.error("Error using context refresh:", error);
      return await this.refreshToken();
    }
  }

  // Helper method to refresh Firebase token
  async refreshToken() {
    try {
      // Import Firebase auth dynamically to avoid circular dependencies
      const { auth } = await import("../helper/firebase");
      const currentUser = auth.currentUser;

      if (!currentUser) {
        console.error("No authenticated user found for token refresh");
        return null;
      }

      // Force refresh the token
      const newToken = await currentUser.getIdToken(true);

      // Update localStorage with new token
      localStorage.setItem("idToken", newToken);

      return newToken;
    } catch (error) {
      console.error("Error refreshing token:", error);
      // Clear invalid auth data
      this.clearAuthData();
      return null;
    }
  }

  // Helper method for making authenticated requests
  async makeRequest(url, options = {}) {
    // Check if user is authenticated first
    const isAuth = await this.isAuthenticated();

    if (!isAuth) {
      // Try to refresh token once more
      const refreshedToken = await this.refreshToken();

      if (!refreshedToken) {
        console.error("Token refresh failed, user needs to sign in again");
        throw new Error(
          "AUTHENTICATION_ERROR: No authenticated user found. Please sign in again."
        );
      }
    }

    // Get fresh token before making request
    let token = await this.getFreshToken();

    if (!token) {
      console.error("Unable to get fresh token");
      throw new Error(
        "AUTHENTICATION_ERROR: Unable to get authentication token. Please sign in again."
      );
    }

    const defaultOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
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
      let response = await fetch(url, requestOptions);

      // Handle 401 errors (expired token) and retry once
      if (response.status === 401 && !options._retry) {
        try {
          // Force refresh the token
          const newToken = await this.refreshToken();

          if (newToken) {
            // Update request options with new token
            requestOptions.headers.Authorization = `Bearer ${newToken}`;

            // Retry the request with new token
            response = await fetch(url, {
              ...requestOptions,
              _retry: true,
            });
          } else {
            throw new Error("Failed to refresh token");
          }
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
          throw new Error(
            "AUTHENTICATION_ERROR: Your session has expired. Please sign in again."
          );
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response Details:");
        console.error("  Status:", response.status);
        console.error("  Status Text:", response.statusText);
        console.error("  URL:", url);
        console.error("  Response Body:", errorText);

        // Handle 401 Unauthorized specifically
        if (response.status === 401) {
          throw new Error(
            "AUTHENTICATION_ERROR: Your session has expired. Please sign in again."
          );
        }

        throw new Error(
          `HTTP error! status: ${response.status} - ${response.statusText}. URL: ${url}. Response: ${errorText}`
        );
      }

      return response.json();
    } catch (error) {
      // Network error or fetch failed
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        console.error("Network Error - Cannot reach server:");
        console.error("  URL:", url);
        console.error("  Error:", error.message);
        throw new Error(
          `Network error: Cannot reach server at ${url}. Please check if the backend is running.`
        );
      }
      // Re-throw other errors
      throw error;
    }
  }

  // Get all products
  async getAllProducts(params = {}) {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);

    const url = `${this.baseURL}/procurement/products${
      queryParams.toString() ? "?" + queryParams.toString() : ""
    }`;
    return this.makeRequest(url);
  }

  // Get product by ID
  async getProductById(productId) {
    const url = `${this.baseURL}/procurement/products/${productId}`;
    return this.makeRequest(url);
  }

  // Search products
  async searchProducts(searchTerm, params = {}) {
    const queryParams = new URLSearchParams();
    queryParams.append("q", searchTerm);

    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);

    const url = `${
      this.baseURL
    }/procurement/products/search?${queryParams.toString()}`;
    return this.makeRequest(url);
  }

  // Create product
  async createProduct(productData) {
    const url = `${this.baseURL}/procurement/products`;
    return this.makeRequest(url, {
      method: "POST",
      body: JSON.stringify(productData),
    });
  }

  // Update product
  async updateProduct(productId, productData) {
    const url = `${this.baseURL}/procurement/products/${productId}`;
    return this.makeRequest(url, {
      method: "PUT",
      body: JSON.stringify(productData),
    });
  }

  // Delete product
  async deleteProduct(productId) {
    const url = `${this.baseURL}/procurement/products/${productId}`;
    return this.makeRequest(url, {
      method: "DELETE",
    });
  }

  // Get secure image view URL
  async getImageViewUrl(imageId) {
    const url = `${this.baseURL}/procurement/images/${imageId}/view`;
    return this.makeRequest(url, {
      method: "GET",
    });
  }

  // Delete image
  async deleteImage(imageId) {
    const url = `${this.baseURL}/procurement/images/${imageId}`;
    return this.makeRequest(url, {
      method: "DELETE",
    });
  }

  // Delete variant
  async deleteVariant(variantId) {
    const url = `${this.baseURL}/procurement/variants/${variantId}`;
    return this.makeRequest(url, {
      method: "DELETE",
    });
  }

  // Delete image
  async deleteImage(imageId) {
    const url = `${this.baseURL}/procurement/images/${imageId}`;
    return this.makeRequest(url, {
      method: "DELETE",
    });
  }

  // Generate upload URLs for images
  async generateUploadUrls(productId, imageRequests) {
    const url = `${this.baseURL}/procurement/products/${productId}/images/upload-urls`;
    return this.makeRequest(url, {
      method: "POST",
      body: JSON.stringify({ imageRequests }),
    });
  }

  // Confirm image upload
  async confirmImageUpload(imageId, publicUrl) {
    const url = `${this.baseURL}/procurement/images/${imageId}/confirm`;
    return this.makeRequest(url, {
      method: "POST",
      body: JSON.stringify({ publicUrl }),
    });
  }

  // Update product status
  async updateProductStatus(productId, status, reason = null) {
    const url = `${this.baseURL}/procurement/products/${productId}/status`;
    return this.makeRequest(url, {
      method: "PUT",
      body: JSON.stringify({ status, reason }),
    });
  }

  // ===== Vendor APIs =====

  // Create vendor for a product
  async createVendor(productId, vendorData) {
    const url = `${this.baseURL}/procurement/products/${productId}/vendors`;
    return this.makeRequest(url, {
      method: "POST",
      body: JSON.stringify(vendorData),
    });
  }

  // Get all vendors for a product
  async getVendorsByProductId(productId) {
    const url = `${this.baseURL}/procurement/products/${productId}/vendors`;
    return this.makeRequest(url);
  }

  // Get vendor by ID
  async getVendorById(vendorId) {
    const url = `${this.baseURL}/procurement/vendors/${vendorId}`;
    return this.makeRequest(url);
  }

  // Update vendor
  async updateVendor(vendorId, vendorData) {
    const url = `${this.baseURL}/procurement/vendors/${vendorId}`;
    return this.makeRequest(url, {
      method: "PUT",
      body: JSON.stringify(vendorData),
    });
  }

  // Delete vendor
  async deleteVendor(vendorId) {
    const url = `${this.baseURL}/procurement/vendors/${vendorId}`;
    return this.makeRequest(url, {
      method: "DELETE",
    });
  }

  // Search vendors
  async searchVendors(searchTerm, params = {}) {
    const queryParams = new URLSearchParams();
    queryParams.append("q", searchTerm);

    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);

    const url = `${
      this.baseURL
    }/procurement/vendors/search?${queryParams.toString()}`;
    return this.makeRequest(url);
  }
}

export default new ProcurementApiService();
