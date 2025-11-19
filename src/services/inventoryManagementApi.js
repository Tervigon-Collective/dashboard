import config from "../config";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  handleAuthError,
  isOnline,
  waitForOnline,
  retryWithBackoff,
} from "../utils/authErrorHandler";

class InventoryManagementApiService {
  constructor() {
    this.baseURL = `${config.api.baseURL}/api/inventory`;
    // Token refresh queue management
    this.isRefreshing = false;
    this.failedQueue = [];
  }

  // Process queued requests after token refresh
  processQueue(error, token = null) {
    this.failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });
    this.failedQueue = [];
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
    // Check network connectivity before making request
    if (typeof window !== "undefined" && !isOnline()) {
      try {
        await waitForOnline(10000); // Wait up to 10 seconds for network
      } catch (networkError) {
        throw new Error(
          "Network error: Unable to connect. Please check your internet connection."
        );
      }
    }

    // Get fresh token from Firebase (not from localStorage)
    const token = await this.getAuthToken();

    if (!token) {
      const error = new Error(
        "No authentication token available. Please sign in again."
      );
      error.code = "auth/no-token";

      // Handle auth error with consistent error handling
      if (typeof window !== "undefined") {
        await handleAuthError(error, {
          enableRedirect: true,
          showNotification: true,
        });
      }

      throw error;
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
      // Make request with retry logic for network failures
      let response;
      try {
        response = await fetch(`${this.baseURL}${endpoint}`, requestOptions);
      } catch (fetchError) {
        // Network error - retry with backoff
        if (
          fetchError.message?.includes("network") ||
          fetchError.message?.includes("fetch") ||
          fetchError.name === "NetworkError" ||
          !isOnline()
        ) {
          response = await retryWithBackoff(
            async () => {
              // Wait for network if offline
              if (!isOnline()) {
                await waitForOnline(10000);
              }
              return await fetch(`${this.baseURL}${endpoint}`, requestOptions);
            },
            { maxRetries: 3, initialDelay: 1000 }
          );
        } else {
          throw fetchError;
        }
      }

      // Handle 401 errors (expired token) with queue system
      if (response.status === 401 && !options._retry) {
        // If already refreshing, queue this request
        if (this.isRefreshing) {
          return new Promise((resolve, reject) => {
            this.failedQueue.push({ resolve, reject });
          })
            .then((newToken) => {
              return this.makeRequest(endpoint, {
                ...options,
                _retry: true,
                headers: {
                  ...defaultHeaders,
                  Authorization: `Bearer ${newToken}`,
                },
              });
            })
            .catch((err) => {
              throw err;
            });
        }

        // Start token refresh process
        options._retry = true;
        this.isRefreshing = true;

        try {
          const auth = getAuth();
          const user = auth.currentUser;

          if (!user) {
            // No authenticated user - handle gracefully
            const error = new Error("No authenticated user found");
            error.code = "auth/no-user";

            const handled = await handleAuthError(error, {
              enableRedirect: true,
              showNotification: true,
            });

            this.processQueue(error, null);
            this.isRefreshing = false;

            if (handled.handled) {
              throw error;
            }
            throw error;
          }

          // Check network connectivity before attempting refresh
          if (!isOnline()) {
            await waitForOnline(10000); // Wait up to 10 seconds
          }

          // Retry token refresh with exponential backoff for network issues
          const newToken = await retryWithBackoff(
            async () => {
              // Force refresh the token
              const token = await user.getIdToken(true);
              return token;
            },
            { maxRetries: 3, initialDelay: 1000 }
          );

          // Update localStorage with new token
          localStorage.setItem("idToken", newToken);

          // Process queued requests
          this.processQueue(null, newToken);

          // Retry the original request with new token
          return this.makeRequest(endpoint, {
            ...options,
            _retry: true,
            headers: {
              ...defaultHeaders,
              Authorization: `Bearer ${newToken}`,
            },
          });
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);

          // Handle the error with appropriate recovery strategy
          const errorInfo = await handleAuthError(refreshError, {
            enableRedirect: true,
            showNotification: true,
            retryCount: 0,
          });

          // Process queue with error
          this.processQueue(refreshError, null);

          // If error was handled (redirected), throw with handled flag
          if (errorInfo.handled) {
            const handledError = new Error(
              "Authentication failed - redirecting to sign in"
            );
            handledError.handled = true;
            handledError.code = refreshError.code || "auth/refresh-failed";
            throw handledError;
          }

          throw refreshError;
        } finally {
          this.isRefreshing = false;
        }
      }

      if (!response.ok) {
        const text = await response.text();
        const error = new Error(text || `HTTP ${response.status}`);
        error.status = response.status;
        throw error;
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return response.json();
      }

      return response;
    } catch (error) {
      // Don't retry on auth errors (already handled above)
      if (
        error.code === "auth/no-user" ||
        error.code === "auth/no-token" ||
        error.code === "auth/refresh-failed" ||
        error.handled
      ) {
        throw error;
      }

      // Handle network errors with retry logic
      const isNetworkError =
        error.message?.includes("network") ||
        error.message?.includes("fetch") ||
        error.message?.includes("Network error") ||
        error.name === "NetworkError";

      if (isNetworkError) {
        console.error("Inventory API network error:", error);
        // Retry logic is already handled by retryWithBackoff above
        throw error;
      }

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
