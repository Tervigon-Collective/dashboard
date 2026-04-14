import config from "../config";
import { getAuth, onAuthStateChanged } from "firebase/auth";

class BrandMasterApiService {
  constructor() {
    this.baseURL = config.api.baseURL + "/api";
  }

  async getAuthToken() {
    if (typeof window === "undefined") return null;

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

      if (!user) return null;
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
      throw new Error("No authentication token available. Please sign in again.");
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });

    const contentType = response.headers.get("content-type");
    const result =
      contentType && contentType.includes("application/json")
        ? await response.json()
        : { success: response.ok, message: await response.text() };

    if (!response.ok || result?.success === false) {
      throw new Error(result?.message || "Request failed.");
    }

    return result;
  }

  async getAllBrands(page = 1, limit = 20, search = "") {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    if (search && search.trim()) {
      params.append("search", search.trim());
    }

    return this.makeRequest(`/masters/brand?${params.toString()}`);
  }

  async startOAuth({ shop_domain, brand_name }) {
    return this.makeRequest("/masters/brand/oauth/start", {
      method: "POST",
      body: JSON.stringify({ shop_domain, brand_name }),
    });
  }
}

const brandMasterApi = new BrandMasterApiService();
export default brandMasterApi;
