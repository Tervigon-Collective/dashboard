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
 * Delete a specific generated content item (direct to Python backend)
 * @param {string} runId - Run ID
 * @param {string} artifactId - Artifact ID
 * @returns {Promise<Object>} Deletion response {status, message, content_type}
 */
export const deleteGeneratedContent = async (runId, artifactId) => {
  // Call Python backend directly
  const response = await axios.delete(
    `${config.pythonApi.baseURL}/api/content/generated/${runId}/${artifactId}`
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
 * @param {Object} options - Optional parameters
 * @param {string} options.aspect_ratio - Aspect ratio (e.g., "square_1_1", "widescreen_16_9")
 * @param {number} options.guidance_scale - Guidance scale (0-20, default: 2.5)
 * @param {number} options.seed - Seed for reproducibility (optional)
 * @returns {Promise<Object>} Edit job response {job_id, status}
 */
export const editImage = async (runId, artifactId, editPrompt, options = {}) => {
  const requestBody = {
    run_id: runId,
    artifact_id: artifactId,
    // Allow empty prompt for aspect ratio-only changes
    edit_prompt: editPrompt || "",
  };

  // Always include aspect_ratio (required by backend)
  if (options.aspect_ratio) {
    requestBody.aspect_ratio = options.aspect_ratio;
  }
  
  // Add optional parameters if provided
  if (options.guidance_scale !== undefined) {
    requestBody.guidance_scale = options.guidance_scale;
  }
  if (options.seed !== undefined && options.seed !== null) {
    requestBody.seed = options.seed;
  }

  // Debug log
  console.log("editImage API call - Request body:", requestBody);

  const response = await axios.post(
    `${config.pythonApi.baseURL}/api/content/edit-image`,
    requestBody
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

// ========== Brandkit Management ==========

/**
 * Get all brandkits
 * @returns {Promise<Object>} Brandkits response {brandkits: Array}
 */
export const getBrandkits = async () => {
  const response = await axios.get(`${config.pythonApi.baseURL}/api/brandkits`);
  // Backend returns array directly, wrap it for consistency
  const brandkits = Array.isArray(response.data) ? response.data : response.data.brandkits || [];
  return { brandkits };
};

/**
 * Get active brandkit
 * @returns {Promise<Object>} Active brandkit data
 */
export const getActiveBrandkit = async () => {
  const response = await axios.get(
    `${config.pythonApi.baseURL}/api/brandkits/active`
  );
  return response.data;
};

/**
 * Get a specific brandkit by ID
 * @param {string} brandId - Brand ID
 * @returns {Promise<Object>} Brandkit data
 */
export const getBrandkit = async (brandId) => {
  const response = await axios.get(
    `${config.pythonApi.baseURL}/api/brandkits/${brandId}`
  );
  return response.data;
};

/**
 * Create a new brandkit
 * @param {Object} brandkitData - Brandkit data
 * @returns {Promise<Object>} Created brandkit response
 */
export const createBrandkit = async (brandkitData) => {
  console.log('createBrandkit - Data before sending:', brandkitData);
  console.log('createBrandkit - Data type checks:', {
    style_guide_dos: Array.isArray(brandkitData.style_guide?.dos),
    hero_words: Array.isArray(brandkitData.brand_vocabulary?.hero_words),
    color_palette: Array.isArray(brandkitData.color_palette),
  });
  
  const response = await axios.post(
    `${config.pythonApi.baseURL}/api/brandkits`,
    brandkitData,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

/**
 * Update an existing brandkit
 * @param {string} brandId - Brand ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Update response
 */
export const updateBrandkit = async (brandId, updates) => {
  console.log('updateBrandkit - Data before sending:', updates);
  
  const response = await axios.put(
    `${config.pythonApi.baseURL}/api/brandkits/${brandId}`,
    updates,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

/**
 * Delete a brandkit
 * @param {string} brandId - Brand ID
 * @returns {Promise<Object>} Deletion response
 */
export const deleteBrandkit = async (brandId) => {
  const response = await axios.delete(
    `${config.pythonApi.baseURL}/api/brandkits/${brandId}`
  );
  return response.data;
};

/**
 * Activate a brandkit (switch to it)
 * @param {string} brandId - Brand ID
 * @returns {Promise<Object>} Activation response
 */
export const activateBrandkit = async (brandId) => {
  const response = await axios.post(
    `${config.pythonApi.baseURL}/api/brandkits/${brandId}/activate`
  );
  return response.data;
};

/**
 * Upload a logo for a brandkit
 * @param {string} brandId - Brand ID
 * @param {File} logoFile - Logo file
 * @returns {Promise<Object>} Upload response
 */
export const uploadBrandkitLogo = async (brandId, logoFile) => {
  const formData = new FormData();
  formData.append("file", logoFile);
  const response = await axios.post(
    `${config.pythonApi.baseURL}/api/brandkits/${brandId}/logo`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};

// ========== New Brandkit Creation System ==========

/**
 * Extract website data for existing brand continuation
 * @param {string} url - Website URL
 * @returns {Promise<Object>} Extracted brand data
 */
export const extractWebsiteData = async (url) => {
  const response = await axios.post(
    `${config.pythonApi.baseURL}/api/brandkits/extract-website`,
    { url }
  );
  return response.data;
};

/**
 * Generate a single field using AI
 * @param {string} fieldName - Field name (brand_name, tagline, color_palette, typography, target_audience, icp_generic, icp_name, icp_age_range, icp_region, icp_gender, icp_title, icp_all_fields)
 * @param {string} brandType - Brand type
 * @param {Object} context - Additional context
 * @param {Object} existingData - Existing form data
 * @param {Object} extraParams - Extra parameters (e.g., color_tone, regenerate)
 * @returns {Promise<Object>} Generated field data
 */
export const generateField = async (fieldName, brandType, context = {}, existingData = {}, extraParams = {}) => {
  const response = await axios.post(
    `${config.pythonApi.baseURL}/api/brandkits/generate-field`,
    {
      field_name: fieldName,
      brand_type: brandType,
      context,
      existing_data: existingData,
      regenerate: extraParams.regenerate || false,
      ...extraParams, // Include color_tone and other extra params
    }
  );
  return response.data;
};

/**
 * Generate full brandkit using AI
 * @param {string} brandType - Brand type
 * @param {Object} context - Additional context (industry, target_market, etc.)
 * @param {Object} existingData - Existing form data
 * @param {boolean} regenerate - Whether this is a regeneration (default: false)
 * @returns {Promise<Object>} Generated brandkit data
 */
export const generateGlobalBrandkit = async (brandType, context = {}, existingData = {}, regenerate = false) => {
  const response = await axios.post(
    `${config.pythonApi.baseURL}/api/brandkits/generate-global`,
    {
      brand_type: brandType,
      context,
      existing_data: existingData,
      regenerate,
    }
  );
  return response.data;
};

/**
 * Generate logo using AI
 * @param {string} brandName - Brand name
 * @param {string} brandType - Brand type
 * @param {Array<string>} colorPalette - Color palette
 * @param {string} prompt - Optional custom prompt
 * @param {string} method - Generation method (gemini or seedream)
 * @returns {Promise<Object>} Logo generation response {success, task_id, logo_path, method}
 */
export const generateLogo = async (brandName, brandType, colorPalette = [], prompt = "", method = "gemini") => {
  const response = await axios.post(
    `${config.pythonApi.baseURL}/api/brandkits/generate-logo`,
    {
      brand_name: brandName,
      brand_type: brandType,
      color_palette: colorPalette,
      prompt,
      method,
    }
  );
  return response.data;
};

/**
 * Generate ICP from database
 * @param {Object} connectionConfig - Database connection configuration
 * @param {Object} timeRange - Time range filter
 * @param {string|Object} brandTypeOrExistingData - Brand type string OR existing_data object with brand_type
 * @returns {Promise<Object>} Generated ICP persona
 */
export const generateICPFromDatabase = async (connectionConfig, timeRange, brandTypeOrExistingData) => {
  // Build request payload with robust brand_type extraction
  let brandType = null;
  let existingData = null;
  
  // Handle both string (brand_type) and object (existing_data) inputs
  if (typeof brandTypeOrExistingData === 'string') {
    brandType = brandTypeOrExistingData || null;
  } else if (typeof brandTypeOrExistingData === 'object' && brandTypeOrExistingData !== null) {
    existingData = brandTypeOrExistingData;
    // Extract brand_type from existing_data if present
    brandType = existingData.brand_type || existingData.niche || null;
  }
  
  // Build request payload
  const requestPayload = {
    connection_config: connectionConfig,
    time_range: timeRange,
  };
  
  // Include brand_type directly if available
  if (brandType) {
    requestPayload.brand_type = brandType;
  }
  
  // Include existing_data if provided
  if (existingData) {
    requestPayload.existing_data = existingData;
  }
  
  // Debug logging
  console.log('[generateICPFromDatabase] Request payload:', {
    has_connection_config: !!requestPayload.connection_config,
    has_time_range: !!requestPayload.time_range,
    brand_type: requestPayload.brand_type || null,
    has_existing_data: !!requestPayload.existing_data,
    existing_data_keys: requestPayload.existing_data ? Object.keys(requestPayload.existing_data) : [],
  });
  
  const response = await axios.post(
    `${config.pythonApi.baseURL}/api/brandkits/generate-icp-from-db`,
    requestPayload,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

/**
 * Get Google Fonts list
 * @returns {Promise<Object>} Google Fonts data {success: boolean, fonts: Array, error: string|null}
 */
export const getGoogleFonts = async () => {
  const response = await axios.get(
    `${config.pythonApi.baseURL}/api/brandkits/google-fonts`
  );
  return response.data;
};

/**
 * Create new brandkit (Mode 1: New Brand Creation)
 * @param {Object} brandkitData - Complete brandkit data
 * @returns {Promise<Object>} Created brandkit
 */
export const createNewBrandkit = async (brandkitData) => {
  const response = await axios.post(
    `${config.pythonApi.baseURL}/api/brandkits/create/new`,
    brandkitData,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

/**
 * Create existing brandkit (Mode 2: Existing Brand Continuation)
 * @param {Object} brandkitData - Complete brandkit data
 * @returns {Promise<Object>} Created brandkit
 */
export const createExistingBrandkit = async (brandkitData) => {
  const response = await axios.post(
    `${config.pythonApi.baseURL}/api/brandkits/create/existing`,
    brandkitData,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

/**
 * Remove logo from a brandkit
 * @param {string} brandId - Brand ID
 * @returns {Promise<Object>} Updated brandkit
 */
export const removeBrandkitLogo = async (brandId) => {
  const response = await axios.delete(
    `${config.pythonApi.baseURL}/api/brandkits/${brandId}/logo`
  );
  return response.data;
};

/**
 * Generate brandkit from description
 * @param {string} description - Brand description
 * @param {string} brandType - Optional brand type
 * @returns {Promise<Object>} Generated brandkit data
 */
export const generateFromDescription = async (description, brandType = null) => {
  const response = await axios.post(
    `${config.pythonApi.baseURL}/api/brandkits/generate-from-description`,
    {
      description,
      brand_type: brandType,
    }
  );
  return response.data;
};

/**
 * Fetch database schema
 * @param {Object} connectionConfig - Database connection configuration
 * @returns {Promise<Object>} Schema data with tables and columns
 */
export const fetchDatabaseSchema = async (connectionConfig) => {
  const response = await axios.post(
    `${config.pythonApi.baseURL}/api/brandkits/fetch-db-schema`,
    connectionConfig
  );
  return response.data;
};

// Export client for custom requests if needed
export { apiClient };
