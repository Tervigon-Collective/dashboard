import axios from "axios";
import config from "../config";

// Create axios instance for content generation API
const apiClient = axios.create({
  baseURL: config.api.baseURL,
});

// Add auth interceptor
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const idToken = localStorage.getItem("idToken");
    if (idToken) {
      config.headers.Authorization = `Bearer ${idToken}`;
    }
  }
  return config;
});

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
    "http://localhost:8000/api/generate/quick",
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
    `http://localhost:8000/api/generate/status/${jobId}`
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
    `http://localhost:8000/api/generate/results/${jobId}`
  );
  return response.data;
};

/**
 * Get all generation jobs (direct to Python backend)
 * @returns {Promise<Object>} All jobs {jobs: Array}
 */
export const getGenerationJobs = async () => {
  // Call Python backend directly
  const response = await axios.get("http://localhost:8000/api/generate/jobs");
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
    `http://localhost:8000/api/generate/retry-image/${jobId}/${artifactId}`
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
    `http://localhost:8000/api/generate/review/${jobId}`
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
    console.log("Updating prompts for jobId:", jobId);
    console.log("Prompts data:", data);
    // Call Python backend directly
    const response = await axios.put(
      `http://localhost:8000/api/generate/review/${jobId}/prompts`,
      data,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    console.log("Update prompts response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Update prompts error details:", {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: `http://localhost:8000/api/generate/review/${jobId}/prompts`
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
    console.log("Approving review for jobId:", jobId);
    // Call Python backend directly
    const response = await axios.post(
      `http://localhost:8000/api/generate/review/${jobId}/approve`,
      {},
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    console.log("Approve response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Approve error details:", {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: `http://localhost:8000/api/generate/review/${jobId}/approve`
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
    "http://localhost:8000/api/upload/images",
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
    "http://localhost:8000/api/content/generated"
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
