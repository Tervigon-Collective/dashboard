import config from "../config";

class ProcurementApiService {
  constructor() {
    this.baseURL = config.api.baseURL + "/api"; // Add /api prefix here
    console.log(
      "ProcurementApiService initialized with baseURL:",
      this.baseURL
    );
  }

  // Helper method to get auth token (using userToken like existing dashboard)
  getAuthToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("userToken");
  }

  // Helper method for making authenticated requests
  async makeRequest(url, options = {}) {
    const token = this.getAuthToken();

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

    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error Response:", {
        status: response.status,
        statusText: response.statusText,
        url: url,
        response: errorText,
      });
      throw new Error(
        `HTTP error! status: ${response.status} - ${response.statusText}. URL: ${url}`
      );
    }

    return response.json();
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
}

export default new ProcurementApiService();
