import config from "../config";
import { getAuth, onAuthStateChanged } from "firebase/auth";

class OrderManagementApiService {
  constructor() {
    this.baseURL = config.api.baseURL + "/api/order-management";
  }

  async getAuthToken() {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const auth = getAuth();
      let user = auth.currentUser;

      if (!user) {
        user = await new Promise((resolve) => {
          const unsubscribe = onAuthStateChanged(auth, (u) => {
            unsubscribe();
            resolve(u);
          });
          setTimeout(() => {
            unsubscribe();
            resolve(null);
          }, 3000);
        });
      }

      if (!user) {
        return null;
      }

      const token = await user.getIdToken();
      localStorage.setItem("idToken", token);
      return token;
    } catch (error) {
      console.error("Error getting auth token:", error);
      return null;
    }
  }

  async makeRequest(endpoint, options = {}) {
    const token = await this.getAuthToken();
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

      if (response.status === 401 && !options._retry) {
        try {
          const auth = getAuth();
          const user = auth.currentUser;

          if (user) {
            const newToken = await user.getIdToken(true);
            localStorage.setItem("idToken", newToken);

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
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return response.json();
      }

      return response;
    } catch (error) {
      console.error("Order management API request failed:", error);
      throw error;
    }
  }

  async getRecentOrders(limit = 20) {
    const params = new URLSearchParams({ limit });
    return this.makeRequest(`/orders?${params.toString()}`);
  }

  async getOrderDetails(orderId) {
    const encodedOrderId = encodeURIComponent(orderId);
    return this.makeRequest(`/orders/${encodedOrderId}`);
  }

  async dispatchOrderItem(orderId, orderLineItemId, payload) {
    const encodedOrderId = encodeURIComponent(orderId);
    const encodedLineItemId = encodeURIComponent(orderLineItemId);

    return this.makeRequest(
      `/orders/${encodedOrderId}/line-items/${encodedLineItemId}/dispatch`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  }
}

export default new OrderManagementApiService();
