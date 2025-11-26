import { useState, useCallback, useRef } from "react";
import { explainData, explainDataStream } from "../api/insightsApi";

/**
 * React hook for managing AI insights state and operations
 * @returns {Object} Hook state and methods
 */
export function useInsights() {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  /**
   * Generate insights for the provided data and context
   * @param {Object} data - The data to analyze
   * @param {Object} context - Context information
   * @param {Object} options - Additional options for explainData
   * @returns {Promise<Object>} Insights result
   */
  const generateInsights = useCallback(
    async (data, context = {}, options = {}) => {
      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      setLoading(true);
      setError(null);
      setInsights(null);

      try {
        const result = await explainData(data, context, options);

        // Check if request was aborted (component unmounted)
        if (abortControllerRef.current?.signal.aborted) {
          return null;
        }

        setInsights(result);
        return result;
      } catch (err) {
        // Ignore abort errors
        if (err.name === "AbortError" || abortControllerRef.current?.signal.aborted) {
          return null;
        }

        const errorMessage =
          err.message ||
          "An unexpected error occurred while generating insights.";

        setError(errorMessage);
        throw err;
      } finally {
        // Only clear loading if request wasn't aborted
        if (!abortControllerRef.current?.signal.aborted) {
          setLoading(false);
        }
        abortControllerRef.current = null;
      }
    },
    []
  );

  /**
   * Clear insights and error state
   */
  const clearInsights = useCallback(() => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setInsights(null);
    setError(null);
    setLoading(false);
  }, []);

  /**
   * Generate insights using streaming endpoint
   * @param {Object} data - The data to analyze
   * @param {Object} context - Context information
   * @param {Object} options - Additional options for explainDataStream
   * @returns {Promise<Object>} Final insights result
   */
  const generateInsightsStream = useCallback(
    async (data, context = {}, options = {}) => {
      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      setLoading(true);
      setError(null);
      setInsights(null);

      try {
        const result = await explainDataStream(data, context, {
          ...options,
          onChunk: (chunk) => {
            // Direct state update - React should handle batching automatically
            // But we ensure each update creates a new object reference
            setInsights((prevInsights) => {
              // Start with previous state or empty object
              const currentInsights = prevInsights || {
                explanation: "",
                key_points: [],
                recommendations: [],
                statistics: {},
              };

              // Update insights incrementally as chunks arrive
              // The chunk.accumulated is always an object (parsed from API) containing the current state
              if (chunk.accumulated && typeof chunk.accumulated === 'object') {
                // Use accumulated data directly from API as the source of truth
                // The API sends the complete accumulated state, so we should use it directly
                const updatedInsights = {
                  explanation: chunk.accumulated.explanation !== undefined && chunk.accumulated.explanation !== null
                    ? String(chunk.accumulated.explanation)
                    : (currentInsights.explanation || ""),
                  key_points: Array.isArray(chunk.accumulated.key_points) && chunk.accumulated.key_points.length > 0
                    ? [...chunk.accumulated.key_points] // Create new array reference
                    : (Array.isArray(currentInsights.key_points) && currentInsights.key_points.length > 0
                        ? [...currentInsights.key_points] // Create new array reference
                        : []),
                  recommendations: Array.isArray(chunk.accumulated.recommendations) && chunk.accumulated.recommendations.length > 0
                    ? [...chunk.accumulated.recommendations] // Create new array reference
                    : (Array.isArray(currentInsights.recommendations) && currentInsights.recommendations.length > 0
                        ? [...currentInsights.recommendations] // Create new array reference
                        : []),
                  statistics: chunk.accumulated.statistics && typeof chunk.accumulated.statistics === 'object' && Object.keys(chunk.accumulated.statistics).length > 0
                    ? { ...chunk.accumulated.statistics } // Create new object reference
                    : (currentInsights.statistics && Object.keys(currentInsights.statistics).length > 0
                        ? { ...currentInsights.statistics } // Create new object reference
                        : {}),
                  // Add timestamp to force re-render detection
                  _updateTimestamp: Date.now(),
                  // Preserve any other fields from accumulated
                  ...Object.fromEntries(
                    Object.entries(chunk.accumulated).filter(([key]) => 
                      !['explanation', 'key_points', 'recommendations', 'statistics'].includes(key)
                    )
                  ),
                };
                
                // Debug logging (remove in production)
                if (process.env.NODE_ENV === 'development') {
                  console.log('🔄 Streaming chunk received:', {
                    hasAccumulated: !!chunk.accumulated,
                    explanationLength: updatedInsights.explanation?.length || 0,
                    keyPointsCount: updatedInsights.key_points?.length || 0,
                    recommendationsCount: updatedInsights.recommendations?.length || 0,
                    explanationPreview: updatedInsights.explanation?.substring(0, 150),
                    timestamp: updatedInsights._updateTimestamp
                  });
                }

                return updatedInsights;
              } else if (chunk.chunk) {
                // Fallback: if we only have chunk text (no accumulated), append to explanation
                const updatedInsights = {
                  ...currentInsights,
                  explanation: (currentInsights.explanation || "") + (chunk.chunk || ""),
                  _updateTimestamp: Date.now(), // Force re-render
                };
                
                if (process.env.NODE_ENV === 'development') {
                  console.log('📝 Appended chunk text, new explanation length:', updatedInsights.explanation?.length || 0);
                }
                
                return updatedInsights;
              }

              // If no valid data, return previous state (but create new reference to trigger re-render)
              return { ...currentInsights, _updateTimestamp: Date.now() };
            });
            
            // Debug logging (remove in production)
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ State update triggered for chunk');
            }

            // Call user's onChunk callback if provided
            if (options.onChunk) {
              options.onChunk(chunk);
            }
          },
          onComplete: (finalInsights) => {
            setInsights(finalInsights);
            setLoading(false);

            // Call user's onComplete callback if provided
            if (options.onComplete) {
              options.onComplete(finalInsights);
            }
          },
          onError: (err) => {
            const errorMessage =
              err.message ||
              "An unexpected error occurred while generating insights.";

            setError(errorMessage);
            setLoading(false);

            // Call user's onError callback if provided
            if (options.onError) {
              options.onError(err);
            }
          },
        });

        return result;
      } catch (err) {
        // Ignore abort errors
        if (err.name === "AbortError") {
          return null;
        }

        const errorMessage =
          err.message ||
          "An unexpected error occurred while generating insights.";

        setError(errorMessage);
        setLoading(false);
        throw err;
      }
    },
    []
  );

  /**
   * Cancel any pending insight generation request
   */
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
    }
  }, []);

  return {
    loading,
    insights,
    error,
    generateInsights,
    generateInsightsStream,
    clearInsights,
    cancelRequest,
  };
}
