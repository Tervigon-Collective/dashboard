import { apiClient } from "./api";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import config from "../config";

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

/**
 * Get authentication token for streaming requests
 * @returns {Promise<string|null>} Auth token
 */
async function getAuthToken() {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      // Wait briefly for auth state to resolve
      return new Promise((resolve) => {
        const unsub = onAuthStateChanged(auth, async (u) => {
          unsub();
          if (u) {
            try {
              const token = await u.getIdToken();
              resolve(token);
            } catch (error) {
              console.error("Error getting ID token:", error);
              resolve(null);
            }
          } else {
            resolve(null);
          }
        });
        setTimeout(() => {
          unsub();
          resolve(null);
        }, 2500);
      });
    }
    
    return await user.getIdToken();
  } catch (error) {
    console.error("Error getting auth token:", error);
    return null;
  }
}

/**
 * Explain data using the streaming insights API endpoint
 * @param {Object} data - The data to analyze
 * @param {Object} context - Context information (data_type, domain, date_range, etc.)
 * @param {Object} options - Additional options
 * @param {Function} options.onChunk - Callback function called with each chunk of data
 * @param {Function} options.onComplete - Callback function called when stream completes
 * @param {Function} options.onError - Callback function called on error
 * @param {number} options.timeout - Request timeout in milliseconds (default: 60000)
 * @returns {Promise<Object>} Final insights response
 */
export async function explainDataStream(data, context = {}, options = {}) {
  const {
    onChunk = null,
    onComplete = null,
    onError = null,
    timeout = 60000, // 60 seconds default for streaming
  } = options;

  // Prepare request payload
  const requestPayload = {
    data,
    context,
  };

  let abortController = null;
  let timeoutId = null;

  // Construct streaming URL - using Node.js backend which proxies to Python backend
  // Streaming endpoints require HTTPS, so ensure the URL uses HTTPS
  let baseURL = config.api.baseURL;
  // Force HTTPS for streaming endpoints (required by backend)
  if (baseURL.toLowerCase().startsWith('http://') && !baseURL.includes('localhost')) {
    baseURL = baseURL.replace(/^http:\/\//i, 'https://');
  }
  const streamURL = `${baseURL}/api/v1/insights/explain/stream`;

  try {
    // Get authentication token
    const token = await getAuthToken();
    if (!token) {
      throw new Error("Authentication required. Please sign in again.");
    }

    // Create abort controller for cancellation
    abortController = new AbortController();

    // Set up timeout
    timeoutId = setTimeout(() => {
      if (abortController) {
        abortController.abort();
      }
      const error = new Error(
        "Streaming request timed out. The analysis is taking longer than expected."
      );
      if (onError) {
        onError(error);
      }
      throw error;
    }, timeout);
    
    // Make the fetch request with proper error handling
    let response;
    try {
      response = await fetch(
        streamURL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestPayload),
          signal: abortController.signal,
        }
      );
    } catch (fetchError) {
      // Handle fetch errors (network errors, CORS, etc.)
      console.error("[InsightsAPI] Fetch error details:", {
        name: fetchError.name,
        message: fetchError.message,
        stack: fetchError.stack,
        url: streamURL,
        aborted: abortController?.signal.aborted,
      });
      
      // Check if it's an abort error
      if (fetchError.name === "AbortError" || abortController?.signal.aborted) {
        const abortError = new Error("Request was cancelled or timed out.");
        if (onError) {
          onError(abortError);
        }
        throw abortError;
      }
      
      // Provide more helpful error message
      const isLocalhost = streamURL.includes('localhost') || streamURL.includes('127.0.0.1');
      let errorMessage = `Network error: ${fetchError.message}`;
      if (isLocalhost) {
        errorMessage += `. Please ensure the backend server is running at ${streamURL}`;
      } else {
        errorMessage += `. Please check your connection and try again.`;
      }
      
      const networkError = new Error(errorMessage);
      if (onError) {
        onError(networkError);
      }
      throw networkError;
    }

    // Check if response is ok
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}: ${errorText}`;
      let parsedError = null;

      // Try to parse error JSON for more details
      try {
        parsedError = JSON.parse(errorText);
        if (parsedError.message) {
          errorMessage = parsedError.message;
        } else if (parsedError.error) {
          errorMessage = parsedError.error;
        }
      } catch (e) {
        // Not JSON, use the text as-is
      }

      if (response.status === 401) {
        errorMessage = "Your session expired. Please sign in again to get insights.";
      } else if (response.status === 404) {
        errorMessage = "Insights streaming service is not available. Please contact support.";
      } else if (response.status === 500) {
        errorMessage = "An error occurred while generating insights. Please try again later.";
      } else if (response.status === 503) {
        errorMessage = parsedError?.message || "The analytics service is temporarily unavailable. Please try again later.";
      } else if (response.status === 400) {
        // Use the parsed error message if available
        errorMessage = parsedError?.message || errorMessage;
      }

      const error = new Error(errorMessage);
      error.status = response.status;
      error.response = parsedError || { error: errorText };
      if (onError) {
        onError(error);
      }
      throw error;
    }

    // Check if response is streaming (text/event-stream or application/x-ndjson)
    const contentType = response.headers.get("content-type") || "";
    const isStreaming = contentType.includes("text/event-stream") || 
                       contentType.includes("application/x-ndjson") ||
                       contentType.includes("application/json");

    if (!isStreaming) {
      // If not streaming, parse as regular JSON
      const result = await response.json();
      if (onComplete) {
        onComplete(result);
      }
      return result;
    }

    // Handle streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let accumulatedInsights = {
      explanation: "",
      key_points: [],
      recommendations: [],
      statistics: {},
    };

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Decode chunk
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines (for NDJSON or SSE format)
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            let jsonData = null;

            // Handle Server-Sent Events (SSE) format
            if (line.startsWith("data: ")) {
              const dataStr = line.substring(6).trim();
              if (dataStr === "[DONE]") {
                continue;
              }
              jsonData = JSON.parse(dataStr);
            } 
            // Handle NDJSON format (newline-delimited JSON)
            else {
              jsonData = JSON.parse(line);
            }

            // Process the chunk
            if (jsonData) {
              // Debug: Log incoming chunk data
              if (process.env.NODE_ENV === 'development') {
                console.log('Received chunk:', { 
                  hasChunk: !!jsonData.chunk, 
                  hasAccumulated: !!jsonData.accumulated,
                  chunkType: typeof jsonData.chunk,
                  accumulatedType: typeof jsonData.accumulated,
                  accumulatedPreview: typeof jsonData.accumulated === 'string' 
                    ? jsonData.accumulated.substring(0, 200) 
                    : jsonData.accumulated
                });
              }

              // Handle API format with 'chunk' and 'accumulated' fields
              let shouldUpdateAccumulated = true;
              if (jsonData.accumulated) {
                // If accumulated is a string, try to parse it
                let parsedAccumulated = jsonData.accumulated;
                if (typeof jsonData.accumulated === 'string') {
                  try {
                    // Check if the string looks like it might be complete JSON
                    // A complete JSON object should have balanced braces
                    const trimmed = jsonData.accumulated.trim();
                    const openBraces = (trimmed.match(/{/g) || []).length;
                    const closeBraces = (trimmed.match(/}/g) || []).length;
                    
                    // Only try to parse if braces are balanced (complete JSON)
                    if (openBraces === closeBraces && trimmed.length > 0) {
                      parsedAccumulated = JSON.parse(jsonData.accumulated);
                      if (process.env.NODE_ENV === 'development') {
                        console.log('Successfully parsed accumulated:', parsedAccumulated);
                      }
                    } else {
                      // Incomplete JSON - skip updating for now, will be complete in later chunks
                      if (process.env.NODE_ENV === 'development') {
                        console.log('Skipping incomplete accumulated JSON (braces not balanced)');
                      }
                      shouldUpdateAccumulated = false;
                    }
                  } catch (e) {
                    // If parsing fails, check if it's because JSON is incomplete
                    const errorMsg = e.message || '';
                    if (errorMsg.includes('Unexpected end') || errorMsg.includes('in JSON') || errorMsg.includes('position')) {
                      // Incomplete JSON - skip updating for now
                      if (process.env.NODE_ENV === 'development') {
                        console.log('Skipping incomplete accumulated JSON (parse error):', errorMsg);
                      }
                      shouldUpdateAccumulated = false;
                    } else {
                      // Other parse error - log and try to use as explanation
                      console.warn("Failed to parse accumulated string:", e, "Raw preview:", jsonData.accumulated.substring(0, 200));
                      // If parsing fails completely, treat the string as the explanation
                      parsedAccumulated = { explanation: jsonData.accumulated };
                    }
                  }
                }
                
                // Only update accumulatedInsights if we have valid parsed data
                if (shouldUpdateAccumulated) {
                  // Handle different possible structures
                  // Case 1: Direct structure { explanation, key_points, etc. }
                  // Case 2: Nested structure { success: true, explanation: "..." }
                  // Case 3: Nested structure { insights: { explanation, key_points, etc. } }
                  // Case 4: Just explanation string
                  if (typeof parsedAccumulated === 'string') {
                    accumulatedInsights.explanation = parsedAccumulated;
                  } else if (parsedAccumulated && typeof parsedAccumulated === 'object') {
                  // Check for nested insights structure first
                  let insightsData = parsedAccumulated;
                  if (parsedAccumulated.insights && typeof parsedAccumulated.insights === 'object') {
                    insightsData = parsedAccumulated.insights;
                  } else if (parsedAccumulated.success && parsedAccumulated.explanation) {
                    // Handle { success: true, explanation: "..." } structure
                    insightsData = parsedAccumulated;
                  }
                  
                  // Extract explanation - check multiple possible locations
                  const extractedExplanation = 
                    insightsData.explanation || 
                    insightsData.answer || 
                    insightsData.summary ||
                    parsedAccumulated.explanation ||
                    parsedAccumulated.answer ||
                    parsedAccumulated.summary ||
                    "";
                  
                  // Extract key points
                  const extractedKeyPoints = 
                    insightsData.key_points || 
                    insightsData.findings || 
                    insightsData.keyPoints ||
                    parsedAccumulated.key_points ||
                    parsedAccumulated.findings ||
                    parsedAccumulated.keyPoints ||
                    [];
                  
                  // Extract recommendations
                  const extractedRecommendations = 
                    insightsData.recommendations || 
                    insightsData.suggestions ||
                    parsedAccumulated.recommendations ||
                    parsedAccumulated.suggestions ||
                    [];
                  
                  // Extract statistics
                  const extractedStatistics = 
                    insightsData.statistics || 
                    insightsData.stats ||
                    parsedAccumulated.statistics ||
                    parsedAccumulated.stats ||
                    {};
                  
                  // Update accumulated insights - merge with existing to preserve data
                  accumulatedInsights = {
                    explanation: extractedExplanation || accumulatedInsights.explanation || "",
                    key_points: Array.isArray(extractedKeyPoints) && extractedKeyPoints.length > 0 
                      ? extractedKeyPoints 
                      : accumulatedInsights.key_points || [],
                    recommendations: Array.isArray(extractedRecommendations) && extractedRecommendations.length > 0
                      ? extractedRecommendations
                      : accumulatedInsights.recommendations || [],
                    statistics: extractedStatistics && typeof extractedStatistics === 'object' && Object.keys(extractedStatistics).length > 0
                      ? { ...accumulatedInsights.statistics, ...extractedStatistics }
                      : accumulatedInsights.statistics || {},
                  };
                  
                  if (process.env.NODE_ENV === 'development') {
                    console.log('Updated accumulatedInsights:', {
                      explanationLength: accumulatedInsights.explanation?.length || 0,
                      keyPointsCount: accumulatedInsights.key_points?.length || 0,
                      recommendationsCount: accumulatedInsights.recommendations?.length || 0,
                      statisticsKeys: Object.keys(accumulatedInsights.statistics || {}).length,
                      fullObject: accumulatedInsights
                    });
                  }
                  }
                }
              } else if (jsonData.chunk) {
                // If we only have chunk (no accumulated), append to explanation
                accumulatedInsights.explanation = (accumulatedInsights.explanation || "") + (jsonData.chunk || "");
              } else {
                // Fallback: accumulate insights manually (for backward compatibility)
                if (jsonData.explanation) {
                  accumulatedInsights.explanation = (accumulatedInsights.explanation || "") + jsonData.explanation;
                }
                if (jsonData.key_points && Array.isArray(jsonData.key_points)) {
                  accumulatedInsights.key_points.push(...jsonData.key_points);
                }
                if (jsonData.recommendations && Array.isArray(jsonData.recommendations)) {
                  accumulatedInsights.recommendations.push(...jsonData.recommendations);
                }
                if (jsonData.statistics) {
                  Object.assign(accumulatedInsights.statistics, jsonData.statistics);
                }
              }

              // Always call onChunk callback with current state to enable real-time UI updates
              // This ensures the UI updates regularly even when JSON is incomplete
              if (onChunk) {
                onChunk({
                  chunk: jsonData.chunk,
                  ...jsonData,
                  accumulated: { ...accumulatedInsights }, // Always pass current accumulated state
                });
              }
            }
          } catch (parseError) {
            // Skip invalid JSON lines (might be SSE metadata or other non-JSON content)
            if (line.trim() && !line.startsWith("event:") && !line.startsWith("id:")) {
              console.warn("Failed to parse chunk:", line, parseError);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Clear timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Finalize accumulated insights
    const finalInsights = {
      ...accumulatedInsights,
      explanation: accumulatedInsights.explanation.trim(),
      key_points: [...new Set(accumulatedInsights.key_points)], // Remove duplicates
      recommendations: [...new Set(accumulatedInsights.recommendations)], // Remove duplicates
    };

    // Call onComplete callback if provided
    if (onComplete) {
      onComplete(finalInsights);
    }

    return finalInsights;
  } catch (error) {
    // Clear timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Handle abort errors
    if (error.name === "AbortError" || abortController?.signal.aborted) {
      const abortError = new Error("Request was cancelled or timed out.");
      if (onError) {
        onError(abortError);
      }
      throw abortError;
    }

    // Handle network errors (fetch API doesn't have error.response like axios)
    // Check if it's a network error (no response received) vs an HTTP error (response received but not ok)
    if (error.message) {
      let errorMessage = error.message;
      
      // Provide more specific error messages for network-level failures
      if (error.message.includes("Failed to fetch") || 
          (error.name === "TypeError" && error.message.includes("fetch"))) {
        // More detailed error message for debugging
        const isLocalhost = streamURL.includes('localhost') || streamURL.includes('127.0.0.1');
        if (isLocalhost) {
          errorMessage = `Network error: Cannot connect to backend server at ${streamURL}. Please ensure the backend server is running on port 8081.`;
        } else {
          errorMessage = `Network error. Please check your connection and try again. (URL: ${streamURL})`;
        }
      } else if (error.message.includes("aborted") || error.name === "AbortError") {
        errorMessage = "Request was cancelled or timed out.";
      }
      
      // Log the full error for debugging
      console.error("[InsightsAPI] Network error details:", {
        error: error,
        name: error.name,
        message: error.message,
        stack: error.stack,
        url: streamURL,
      });
      
      const networkError = new Error(errorMessage);
      // Add response property for compatibility if available
      if (error.response) {
        networkError.response = error.response;
      }
      if (onError) {
        onError(networkError);
      }
      throw networkError;
    }

    // Handle other errors
    if (onError) {
      onError(error);
    }
    throw error;
  }
}
