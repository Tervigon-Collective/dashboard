import config from "../config";

class QualityCheckApiService {
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
  async uploadDocument(requestId, { docType, itemId = null, file }) {
    const content_base64 = await this.readFileAsBase64(file);
    const body = {
      doc_type: docType,
      item_id: itemId,
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
    const token = this.getAuthToken();
    const response = await fetch(
      `${this.baseURL}/receiving/quality-check/documents/${documentId}/content`,
      {
        method: "GET",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      }
    );
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
}

export default new QualityCheckApiService();
