import config from "../config";
import { getAuth, onAuthStateChanged } from "firebase/auth";

class QualityCheckApiService {
  constructor() {
    this.baseURL = config.api.baseURL + "/api";
  }

  async getAuthToken() {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const auth = getAuth();
      let user = auth.currentUser;

      // If no current user, wait for auth state to be ready
      if (!user) {
        user = await new Promise((resolve) => {
          const unsubscribe = onAuthStateChanged(auth, (u) => {
            unsubscribe();
            resolve(u);
          });
          // Timeout after 3 seconds
          setTimeout(() => {
            unsubscribe();
            resolve(null);
          }, 3000);
        });
      }

      if (!user) {
        return null;
      }

      // getIdToken() automatically refreshes expired tokens
      const token = await user.getIdToken();

      // Update localStorage for compatibility with other parts of the app
      localStorage.setItem("idToken", token);

      return token;
    } catch (error) {
      console.error("Error getting auth token:", error);
      return null;
    }
  }

  async makeRequest(endpoint, options = {}) {
    // Get fresh token from Firebase (not from localStorage)
    const token = await this.getAuthToken();

    // If no token, throw a clear error before making the request
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

    let response = await fetch(`${this.baseURL}${endpoint}`, {
      ...defaultOptions,
      ...options,
    });

    // Handle 401 errors (expired token) and retry once
    if (response.status === 401 && !options._retry) {
      try {
        const auth = getAuth();
        const user = auth.currentUser;

        if (user) {
          // Force refresh the token
          const newToken = await user.getIdToken(true);

          // Update localStorage
          localStorage.setItem("idToken", newToken);

          // Retry the request with new token
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

  // Documents: upload (base64 JSON), list, delete
  async uploadDocument(
    requestId,
    { docType, itemId = null, file, invoiceNumber = null }
  ) {
    const content_base64 = await this.readFileAsBase64(file);
    const body = {
      doc_type: docType,
      item_id: itemId,
      invoice_number: invoiceNumber,
      file_name: file.name,
      mime_type: file.type,
      content_base64,
    };
    return this.makeRequest(`/receiving/quality-check/${requestId}/documents`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async listDocuments(requestId) {
    return this.makeRequest(`/receiving/quality-check/${requestId}/documents`);
  }

  async deleteDocument(documentId) {
    return this.makeRequest(
      `/receiving/quality-check/documents/${documentId}`,
      {
        method: "DELETE",
      }
    );
  }

  getDocumentContentUrl(documentId) {
    return `${this.baseURL}/receiving/quality-check/documents/${documentId}/content`;
  }

  async fetchDocumentBlob(documentId) {
    // Get fresh token from Firebase (not from localStorage)
    const token = await this.getAuthToken();

    // If no token, throw a clear error before making the request
    if (!token) {
      throw new Error(
        "No authentication token available. Please sign in again."
      );
    }

    let response = await fetch(
      `${this.baseURL}/receiving/quality-check/documents/${documentId}/content`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    // Handle 401 errors (expired token) and retry once
    if (response.status === 401) {
      try {
        const auth = getAuth();
        const user = auth.currentUser;

        if (user) {
          // Force refresh the token
          const newToken = await user.getIdToken(true);

          // Update localStorage
          localStorage.setItem("idToken", newToken);

          // Retry the request with new token
          response = await fetch(
            `${this.baseURL}/receiving/quality-check/documents/${documentId}/content`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${newToken}`,
              },
            }
          );

          // If still 401 after refresh, throw error
          if (response.status === 401) {
            throw new Error("Authentication failed. Please sign in again.");
          }
        } else {
          throw new Error("No authenticated user found");
        }
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        throw new Error("Authentication failed. Please sign in again.");
      }
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }
    return response.blob();
  }

  readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        const base64 = result.split(",")[1] || result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // GRN PDF methods
  /**
   * Generate GRN PDF for a request
   * @param {number} requestId - Purchase request ID
   * @returns {Promise<Object>} GRN info
   */
  async generateGrnPdf(requestId) {
    return this.makeRequest(
      `/receiving/quality-check/${requestId}/generate-grn`,
      {
        method: "POST",
      }
    );
  }

  /**
   * Check if GRN PDF exists for a request
   * @param {number} requestId - Purchase request ID
   * @returns {Promise<boolean>} True if GRN exists
   */
  async checkGrnExists(requestId) {
    try {
      const result = await this.makeRequest(
        `/receiving/quality-check/${requestId}/check-grn`
      );
      return result.success && result.exists === true;
    } catch (error) {
      console.error("Error checking GRN existence:", error);
      return false;
    }
  }

  /**
   * Get GRN info (metadata without PDF data)
   * @param {number} requestId - Purchase request ID
   * @returns {Promise<Object>} GRN metadata
   */
  async getGrnInfo(requestId) {
    return this.makeRequest(`/receiving/quality-check/${requestId}/grn-info`);
  }

  /**
   * Download GRN PDF
   * @param {number} requestId - Purchase request ID
   * @returns {Promise<Blob>} PDF blob
   */
  async downloadGrnPdf(requestId) {
    // Get fresh token from Firebase (not from localStorage)
    const token = await this.getAuthToken();

    // If no token, throw a clear error before making the request
    if (!token) {
      throw new Error(
        "No authentication token available. Please sign in again."
      );
    }

    let response = await fetch(
      `${this.baseURL}/receiving/quality-check/${requestId}/download-grn`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    // Handle 401 errors (expired token) and retry once
    if (response.status === 401) {
      try {
        const auth = getAuth();
        const user = auth.currentUser;

        if (user) {
          // Force refresh the token
          const newToken = await user.getIdToken(true);

          // Update localStorage
          localStorage.setItem("idToken", newToken);

          // Retry the request with new token
          response = await fetch(
            `${this.baseURL}/receiving/quality-check/${requestId}/download-grn`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${newToken}`,
              },
            }
          );

          // If still 401 after refresh, throw error
          if (response.status === 401) {
            throw new Error("Authentication failed. Please sign in again.");
          }
        } else {
          throw new Error("No authenticated user found");
        }
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        throw new Error("Authentication failed. Please sign in again.");
      }
    }

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("GRN PDF not found");
      }
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.blob();
  }
}

export default new QualityCheckApiService();
