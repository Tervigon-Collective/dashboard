import axios from "axios";
import config from "../config";
import { getAuth } from "firebase/auth";
import {
  handleAuthError,
  isOnline,
  waitForOnline,
  retryWithBackoff,
} from "../utils/authErrorHandler";

// Create axios instance for content generation API
const apiClient = axios.create({
  baseURL: config.api.baseURL,
});

// Token refresh queue management
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Add auth interceptor - use Firebase auth instead of localStorage
apiClient.interceptors.request.use(
  async (config) => {
    if (typeof window !== "undefined") {
      try {
        const auth = getAuth();
        const user = auth.currentUser;

        if (user) {
          // getIdToken() automatically refreshes expired tokens
          const idToken = await user.getIdToken();
          config.headers.Authorization = `Bearer ${idToken}`;

          // Update localStorage for compatibility with other parts of the app
          localStorage.setItem("idToken", idToken);
        }
      } catch (error) {
        console.error("Error getting ID token:", error);
        // Let backend return 401, which will trigger refresh in response interceptor
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle 401 errors and refresh tokens
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is due to expired token
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      typeof window !== "undefined"
    ) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

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

          if (handled.handled) {
            processQueue(error, null);
            return Promise.reject(error);
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

        // Update the original request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        // Process queued requests
        processQueue(null, newToken);

        // Retry the original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);

        // Handle the error with appropriate recovery strategy
        const errorInfo = await handleAuthError(refreshError, {
          enableRedirect: true,
          showNotification: true,
          retryCount: 0,
        });

        // Process queue with error
        processQueue(refreshError, null);

        // If error was handled (redirected), reject with handled flag
        if (errorInfo.handled) {
          const handledError = new Error(
            "Authentication failed - redirecting to sign in"
          );
          handledError.handled = true;
          handledError.code = refreshError.code || "auth/refresh-failed";
          return Promise.reject(handledError);
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ========== Creative Briefs ==========

/**
 * Get all creative briefs
 * @returns {Promise<Array>} Array of brief summaries
 */
export const getBriefs = async () => {
  const response = await apiClient.get("/api/content-generation/briefs");
  return response.data;
};

/**
 * Get a single brief by ID
 * @param {string} briefId - Brief ID
 * @returns {Promise<Object>} Brief data
 */
export const getBrief = async (briefId) => {
  const response = await apiClient.get(
    `/api/content-generation/briefs/${briefId}`
  );
  return response.data;
};

/**
 * Create a new brief
 * @param {Object} briefData - Brief data
 * @returns {Promise<Object>} Created brief
 */
export const createBrief = async (briefData) => {
  const response = await apiClient.post(
    "/api/content-generation/briefs",
    briefData
  );
  return response.data;
};

/**
 * Update an existing brief
 * @param {string} briefId - Brief ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated brief
 */
export const updateBrief = async (briefId, updates) => {
  const response = await apiClient.put(
    `/api/content-generation/briefs/${briefId}`,
    updates
  );
  return response.data;
};

/**
 * Delete a brief
 * @param {string} briefId - Brief ID
 * @returns {Promise<Object>} Deletion response
 */
export const deleteBrief = async (briefId) => {
  const response = await apiClient.delete(
    `/api/content-generation/briefs/${briefId}`
  );
  return response.data;
};

// ========== Content Generation ==========

/**
 * Generate video content from a brief
 * @param {string} briefId - Brief ID
 * @returns {Promise<Object>} Generation job response {job_id, status}
 */
export const generateVideo = async (briefId) => {
  const response = await apiClient.post(
    "/api/content-generation/generate/video",
    { brief_id: briefId }
  );
  return response.data;
};

/**
 * Generate graphic content from a brief
 * @param {string} briefId - Brief ID
 * @returns {Promise<Object>} Generation job response {job_id, status}
 */
export const generateGraphic = async (briefId) => {
  const response = await apiClient.post(
    "/api/content-generation/generate/graphic",
    { brief_id: briefId }
  );
  return response.data;
};

/**
 * Quick generate content from form data (direct to Python backend)
 * @param {Object} formData - Generation form data
 * @returns {Promise<Object>} Generation job response {job_id, status}
 */
export const quickGenerate = async (formData) => {
  // Call Python backend directly
  const response = await axios.post(
    `${config.pythonApi.baseURL}/api/generate/quick`,
    formData
  );
  return response.data;
};

/**
 * Get generation job status (direct to Python backend)
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} Status response {status, progress, result?, error?}
 */
export const getGenerationStatus = async (jobId) => {
  // Call Python backend directly
  const response = await axios.get(
    `${config.pythonApi.baseURL}/api/generate/status/${jobId}`
  );
  return response.data;
};

/**
 * Get generation results (direct to Python backend)
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} Generation results
 */
export const getGenerationResults = async (jobId) => {
  // Call Python backend directly
  const response = await axios.get(
    `${config.pythonApi.baseURL}/api/generate/results/${jobId}`
  );
  return response.data;
};

/**
 * Get all generation jobs (direct to Python backend)
 * @returns {Promise<Object>} All jobs {jobs: Array}
 */
export const getGenerationJobs = async () => {
  // Call Python backend directly
  const response = await axios.get(
    `${config.pythonApi.baseURL}/api/generate/jobs`
  );
  return response.data;
};

/**
 * Retry image generation for a specific artifact (direct to Python backend)
 * @param {string} jobId - Job ID
 * @param {string} artifactId - Artifact ID
 * @returns {Promise<Object>} Retry response
 */
export const retryImageGeneration = async (jobId, artifactId) => {
  // Call Python backend directly
  const response = await axios.post(
    `${config.pythonApi.baseURL}/api/generate/retry-image/${jobId}/${artifactId}`
  );
  return response.data;
};

// ========== Review Workflow ==========

/**
 * Get prompts for review (direct to Python backend)
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} Review data with prompts
 */
export const getReviewPrompts = async (jobId) => {
  // Call Python backend directly
  const response = await axios.get(
    `${config.pythonApi.baseURL}/api/generate/review/${jobId}`
  );
  return response.data;
};

/**
 * Update prompts for review (direct to Python backend)
 * @param {string} jobId - Job ID
 * @param {Object} data - Updated prompts data
 * @returns {Promise<Object>} Update response
 */
export const updateReviewPrompts = async (jobId, data) => {
  try {
    // Call Python backend directly
    const response = await axios.put(
      `${config.pythonApi.baseURL}/api/generate/review/${jobId}/prompts`,
      data,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Update prompts error details:", {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: `${config.pythonApi.baseURL}/api/generate/review/${jobId}/prompts`,
    });
    throw error;
  }
};

/**
 * Approve and continue generation (direct to Python backend)
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} Approval response
 */
export const approveReview = async (jobId) => {
  try {
    // Call Python backend directly
    const response = await axios.post(
      `${config.pythonApi.baseURL}/api/generate/review/${jobId}/approve`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Approve error details:", {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: `${config.pythonApi.baseURL}/api/generate/review/${jobId}/approve`,
    });
    throw error;
  }
};

// ========== File Upload ==========

/**
 * Upload multiple images (direct to Python backend)
 * @param {Array<File>} files - Array of image files
 * @returns {Promise<Object>} Upload response {urls: Array}
 */
export const uploadImages = async (files) => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("images", file);
  });

  // Call Python backend directly
  const response = await axios.post(
    `${config.pythonApi.baseURL}/api/upload/images`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};

/**
 * Upload a logo
 * @param {File} file - Logo file
 * @returns {Promise<Object>} Upload response {url: string}
 */
export const uploadLogo = async (file) => {
  const formData = new FormData();
  formData.append("logo", file);

  const response = await apiClient.post(
    "/api/content-generation/upload/logo",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};

// ========== Generated Content ==========

/**
 * Get all generated content (direct to Python backend)
 * @returns {Promise<Object>} Generated content {content: Array}
 */
export const getGeneratedContent = async () => {
  // Call Python backend directly since Node.js proxy isn't working
  const response = await axios.get(
    `${config.pythonApi.baseURL}/api/content/generated`
  );
  return response.data;
};

/**
 * Get content preview URL
 * @param {string} runId - Run ID
 * @param {string} artifactId - Artifact ID
 * @returns {string} Preview URL
 */
export const getContentPreviewUrl = (runId, artifactId) => {
  return `${config.api.baseURL}/api/content-generation/content/preview/${runId}/${artifactId}`;
};

/**
 * Get content download URL
 * @param {string} runId - Run ID
 * @param {string} artifactId - Artifact ID
 * @returns {string} Download URL
 */
export const getContentDownloadUrl = (runId, artifactId) => {
  return `${config.api.baseURL}/api/content-generation/content/download/${runId}/${artifactId}`;
};

/**
 * Edit an existing generated image with modifications (direct to Python backend)
 * @param {string} runId - Run ID
 * @param {string} artifactId - Artifact ID
 * @param {string} editPrompt - User's modification request
 * @returns {Promise<Object>} Edit job response {job_id, status}
 */
export const editImage = async (runId, artifactId, editPrompt) => {
  const response = await axios.post(
    `${config.pythonApi.baseURL}/api/content/edit-image`,
    {
      run_id: runId,
      artifact_id: artifactId,
      edit_prompt: editPrompt,
    }
  );
  return response.data;
};

// ========== Assets ==========

/**
 * Get all uploaded assets
 * @returns {Promise<Array>} Array of assets
 */
export const getAssets = async () => {
  const response = await apiClient.get("/api/content-generation/assets");
  return response.data;
};

/**
 * Delete an asset
 * @param {string} assetId - Asset ID
 * @returns {Promise<Object>} Deletion response
 */
export const deleteAsset = async (assetId) => {
  const response = await apiClient.delete(
    `/api/content-generation/assets/${assetId}`
  );
  return response.data;
};

// Export client for custom requests if needed
export { apiClient };
