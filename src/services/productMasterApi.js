import config from "../config";

class ProductMasterApiService {
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

  async createProduct(productData) {
    return this.makeRequest("/masters/product", {
      method: "POST",
      body: JSON.stringify(productData),
    });
  }

  async getAllProducts(page = 1, limit = 20) {
    const params = new URLSearchParams({ page, limit });

    return this.makeRequest(`/masters/product?${params}`);
  }

  async getProductById(productId) {
    return this.makeRequest(`/masters/product/${productId}`);
  }

  async updateProduct(productId, productData) {
    return this.makeRequest(`/masters/product/${productId}`, {
      method: "PUT",
      body: JSON.stringify(productData),
    });
  }

  async deleteProduct(productId) {
    return this.makeRequest(`/masters/product/${productId}`, {
      method: "DELETE",
    });
  }
}

export default new ProductMasterApiService();
