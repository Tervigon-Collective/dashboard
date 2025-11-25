import { apiClient } from "./api";

// Simple in-memory cache
const insightsCache = new Map();

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Generate a cache key from data and context
 * @param {Object} data - The data to analyze
 * @param {Object} context - Context information
 * @returns {string} Cache key
 */
function getCacheKey(data, context) {
  // Create a stable hash from data and context
  try {
    const keyData = {
      dataHash: JSON.stringify(data),
      contextHash: JSON.stringify(context),
    };
    return JSON.stringify(keyData);
  } catch (error) {
    // If serialization fails, use a timestamp-based key (no caching)
    return `nocache_${Date.now()}_${Math.random()}`;
  }
}

/**
 * Explain data using the insights API endpoint
 * @param {Object} data - The data to analyze
 * @param {Object} context - Context information (data_type, domain, date_range, etc.)
 * @param {Object} options - Additional options (timeout, useCache, etc.)
 * @returns {Promise<Object>} Insights response
 */
export async function explainData(data, context = {}, options = {}) {
  const {
    timeout = 30000, // 30 seconds default timeout
    useCache = true,
    forceRefresh = false,
  } = options;

  // Check cache first (if enabled and not forcing refresh)
  if (useCache && !forceRefresh) {
    const cacheKey = getCacheKey(data, context);
    const cached = insightsCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.insights;
    }
  }

  // Prepare request payload
  const requestPayload = {
    data,
    context,
  };

  try {
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            "Insights request timed out. The analysis is taking longer than expected. Please try again."
          )
        );
      }, timeout);
    });

    // Create the API request promise
    const apiPromise = apiClient.post(
      "/api/v1/insights/explain",
      requestPayload,
      {
        timeout,
      }
    );

    // Race between API call and timeout
    const response = await Promise.race([apiPromise, timeoutPromise]);
    const insights = response.data;

    // Cache the result if caching is enabled
    if (useCache) {
      const cacheKey = getCacheKey(data, context);
      insightsCache.set(cacheKey, {
        insights,
        timestamp: Date.now(),
      });
    }

    return insights;
  } catch (error) {
    // Handle different error types
    const normalizedMessage = (error?.message || "").toLowerCase();

    if (normalizedMessage.includes("timeout") || error?.code === "ECONNABORTED") {
      throw new Error(
        "Insights request timed out. The analysis is taking longer than expected. Please try again."
      );
    }

    if (error?.response?.status === 401) {
      throw new Error(
        "Your session expired. Please sign in again to get insights."
      );
    }

    if (error?.response?.status === 404) {
      throw new Error(
        "Insights service is not available. Please contact support or try again later."
      );
    }

    if (error?.response?.status === 500) {
      throw new Error(
        "An error occurred while generating insights. Please try again later."
      );
    }

    if (error?.response?.data?.message) {
      throw new Error(error.response.data.message);
    }

    // Network errors
    if (!error?.response) {
      throw new Error(
        "Network error. Please check your connection and try again."
      );
    }

    // Fallback error
    throw new Error(
      error.message || "Failed to generate insights. Please try again."
    );
  }
}

/**
 * Clear the insights cache
 * @param {Object} data - Optional: clear cache for specific data
 * @param {Object} context - Optional: clear cache for specific context
 */
export function clearInsightsCache(data = null, context = null) {
  if (data && context) {
    const cacheKey = getCacheKey(data, context);
    insightsCache.delete(cacheKey);
  } else {
    // Clear entire cache
    insightsCache.clear();
  }
}

/**
 * Get cache statistics (for debugging)
 * @returns {Object} Cache stats
 */
export function getCacheStats() {
  return {
    size: insightsCache.size,
    entries: Array.from(insightsCache.entries()).map(([key, value]) => ({
      key,
      age: Date.now() - value.timestamp,
      expiresIn: CACHE_TTL - (Date.now() - value.timestamp),
    })),
  };
}
