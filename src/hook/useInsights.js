import { useState, useCallback, useRef } from "react";
import { explainData } from "../api/insightsApi";

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
    clearInsights,
    cancelRequest,
  };
}
