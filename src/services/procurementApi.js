import config from "../config";

class ProcurementApiService {
  constructor() {
    this.baseURL = config.api.baseURL + "/api"; // Add /api prefix here
    this.tokenRefreshInterval = null;
    console.log(
      "ProcurementApiService initialized with baseURL:",
      this.baseURL
    );
    
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
          console.log("Performing periodic token refresh...");
          const newToken = await currentUser.getIdToken(true);
          localStorage.setItem("idToken", newToken);
          console.log("Periodic token refresh completed");
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
      
      console.log("🔍 Checking Firebase auth state...");
      console.log("🔍 Current user:", currentUser ? "exists" : "null");
      
      // If no current user, wait for auth state
      if (!currentUser) {
        console.log("⏳ No current user, waiting for auth state...");
        currentUser = await this.waitForAuthState();
        console.log("🔍 After waiting, user:", currentUser ? "exists" : "null");
      }
      
      if (!currentUser) {
        console.log("❌ No authenticated user found in Firebase");
        return false;
      }

      // Check if user is actually signed in
      if (currentUser.uid === null || currentUser.uid === undefined) {
        console.log("❌ User UID is null/undefined");
        return false;
      }

      console.log("✅ User UID:", currentUser.uid);

      // Try to get a fresh token to ensure it's valid
      try {
        const freshToken = await currentUser.getIdToken(false); // Don't force refresh initially
        console.log("✅ User is authenticated with valid token");
        
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
      console.log("Authentication data cleared");
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

      console.log("Refreshing Firebase token...");
      
      // Force refresh the token
      const newToken = await currentUser.getIdToken(true);
      
      // Update localStorage with new token
      localStorage.setItem("idToken", newToken);
      
      console.log("Token refreshed successfully");
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
    console.log("🔐 Starting authentication check for API request...");
    
    // Check if user is authenticated first
    const isAuth = await this.isAuthenticated();
    console.log("🔐 Authentication check result:", isAuth);
    
    if (!isAuth) {
      // Try to refresh token once more
      console.log("🔄 Authentication failed, attempting token refresh...");
      const refreshedToken = await this.refreshToken();
      
      if (!refreshedToken) {
        console.error("❌ Token refresh failed, user needs to sign in again");
        throw new Error(
          "AUTHENTICATION_ERROR: No authenticated user found. Please sign in again."
        );
      }
      console.log("✅ Token refresh successful");
    }

    // Get fresh token before making request
    let token = await this.getFreshToken();
    console.log("🔑 Fresh token obtained:", !!token);
    
    if (!token) {
      console.error("❌ Unable to get fresh token");
      throw new Error(
        "AUTHENTICATION_ERROR: Unable to get authentication token. Please sign in again."
      );
    }

    console.log("Auth token available:", !!token);
    console.log(
      "Token preview:",
      token ? `${token.substring(0, 20)}...` : "No token"
    );

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

    console.log("Making API request to:", url);
    console.log("Request headers:", requestOptions.headers);

    try {
      const response = await fetch(url, requestOptions);

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

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
    console.log("getAllProducts - Final URL being called:", url);
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
