import config from "../config";
import { getAuth, onAuthStateChanged } from "firebase/auth";

class InventoryManagementApiService {
  constructor() {
    this.baseURL = `${config.api.baseURL}/api/inventory`;
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

    const defaultHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    };

    const requestOptions = {
      ...options,
      headers: defaultHeaders,
    };

    try {
      const response = await fetch(
        `${this.baseURL}${endpoint}`,
        requestOptions
      );

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
                ...defaultHeaders,
                Authorization: `Bearer ${newToken}`,
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
      console.error("Inventory API request failed:", error);
      throw error;
    }
  }

  listDispatchQueue(limit = 50) {
    const params = new URLSearchParams();
    if (limit) {
      params.append("limit", String(limit));
    }
    const query = params.toString();
    return this.makeRequest(`/dispatch-queue${query ? `?${query}` : ""}`);
  }

  dispatchScan(orderId, orderLineItemId, payload) {
    return this.makeRequest(
      `/orders/${encodeURIComponent(orderId)}/line-items/${encodeURIComponent(
        orderLineItemId
      )}/dispatch-scan`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  }

  syncReceiving(requestId) {
    return this.makeRequest(
      `/sync/receiving/${encodeURIComponent(requestId)}`,
      {
        method: "POST",
      }
    );
  }

  listInventoryItems({ page, limit, search } = {}) {
    const params = new URLSearchParams();
    if (page) params.append("page", String(page));
    if (limit) params.append("limit", String(limit));
    if (search) params.append("search", search);

    const query = params.toString();
    return this.makeRequest(`/items${query ? `?${query}` : ""}`);
  }

  getInventoryItem(inventoryItemId) {
    return this.makeRequest(`/items/${encodeURIComponent(inventoryItemId)}`);
  }

  getInventoryLedger(inventoryItemId, { page, limit } = {}) {
    const params = new URLSearchParams();
    if (page) params.append("page", String(page));
    if (limit) params.append("limit", String(limit));

    const query = params.toString();
    return this.makeRequest(
      `/items/${encodeURIComponent(inventoryItemId)}/ledger${
        query ? `?${query}` : ""
      }`
    );
  }

  listReturnCases({ status, page, limit } = {}) {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (page) params.append("page", String(page));
    if (limit) params.append("limit", String(limit));

    const query = params.toString();
    return this.makeRequest(`/returns/cases${query ? `?${query}` : ""}`);
  }

  syncReturnCases(maxRows) {
    const body = maxRows ? { maxRows } : undefined;
    return this.makeRequest(`/returns/cases/sync`, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  approveReturnCase(caseId, notes) {
    return this.makeRequest(`/returns/cases/${caseId}/approve`, {
      method: "POST",
      body: JSON.stringify({ notes: notes || null }),
    });
  }

  rejectReturnCase(caseId, notes) {
    return this.makeRequest(`/returns/cases/${caseId}/reject`, {
      method: "POST",
      body: JSON.stringify({ notes: notes || null }),
    });
  }
}

export default new InventoryManagementApiService();
