"use client";
import { createContext, useContext, useState, useCallback } from "react";
import * as contentApi from "../services/contentGenerationApi";

const BriefContext = createContext({});

/**
 * Hook to use Brief context
 * @returns {Object} Brief context value
 */
export const useBrief = () => {
  const context = useContext(BriefContext);
  if (!context) {
    throw new Error("useBrief must be used within BriefProvider");
  }
  return context;
};

/**
 * Brief Context Provider
 * Manages state for creative briefs
 */
export const BriefProvider = ({ children }) => {
  const [briefs, setBriefs] = useState([]);
  const [currentBrief, setCurrentBrief] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // ========== API Actions ==========

  /**
   * Fetch all briefs
   */
  const fetchBriefs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await contentApi.getBriefs();
      setBriefs(data);
      setIsLoading(false);
    } catch (error) {
      setError(error.message);
      setIsLoading(false);
      console.error("Error fetching briefs:", error);
    }
  }, []);

  /**
   * Fetch a single brief by ID
   * @param {string} briefId - Brief ID to fetch
   */
  const fetchBrief = useCallback(async (briefId) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await contentApi.getBrief(briefId);
      setCurrentBrief(data);
      setIsLoading(false);
    } catch (error) {
      setError(error.message);
      setIsLoading(false);
      console.error("Error fetching brief:", error);
    }
  }, []);

  /**
   * Create a new brief
   * @param {Object} briefData - Brief data to create
   */
  const createBrief = useCallback(async (briefData) => {
    setIsLoading(true);
    setError(null);

    try {
      const createdBrief = await contentApi.createBrief(briefData);

      // Add to briefs list
      setBriefs((prev) => [createdBrief, ...prev]);

      setIsLoading(false);
      return createdBrief;
    } catch (error) {
      setError(error.message);
      setIsLoading(false);
      console.error("Error creating brief:", error);
      throw error;
    }
  }, []);

  /**
   * Update an existing brief
   * @param {string} briefId - Brief ID to update
   * @param {Object} updates - Updates to apply
   */
  const updateBrief = useCallback(
    async (briefId, updates) => {
      setIsLoading(true);
      setError(null);

      try {
        const updatedBrief = await contentApi.updateBrief(briefId, updates);

        // Update in briefs list
        setBriefs((prev) =>
          prev.map((brief) =>
            brief.brief_id === briefId ? updatedBrief : brief
          )
        );

        // Update current brief if it's the one being updated
        if (currentBrief && currentBrief.brief_id === briefId) {
          setCurrentBrief(updatedBrief);
        }

        setIsLoading(false);
        return updatedBrief;
      } catch (error) {
        setError(error.message);
        setIsLoading(false);
        console.error("Error updating brief:", error);
        throw error;
      }
    },
    [currentBrief]
  );

  /**
   * Delete a brief
   * @param {string} briefId - Brief ID to delete
   */
  const deleteBrief = useCallback(
    async (briefId) => {
      setIsLoading(true);
      setError(null);

      try {
        await contentApi.deleteBrief(briefId);

        // Remove from briefs list
        setBriefs((prev) => prev.filter((brief) => brief.brief_id !== briefId));

        // Clear current brief if it's the one being deleted
        if (currentBrief && currentBrief.brief_id === briefId) {
          setCurrentBrief(null);
        }

        setIsLoading(false);
      } catch (error) {
        setError(error.message);
        setIsLoading(false);
        console.error("Error deleting brief:", error);
        throw error;
      }
    },
    [currentBrief]
  );

  // ========== Local State Actions ==========

  /**
   * Set briefs list (for manual updates)
   * @param {Array} briefsList - Array of briefs
   */
  const setBriefsList = useCallback((briefsList) => {
    setBriefs(briefsList);
  }, []);

  /**
   * Add a brief to the list (for optimistic updates)
   * @param {Object} brief - Brief to add
   */
  const addBrief = useCallback((brief) => {
    setBriefs((prev) => [brief, ...prev]);
  }, []);

  /**
   * Remove a brief from the list (for optimistic updates)
   * @param {string} briefId - Brief ID to remove
   */
  const removeBrief = useCallback((briefId) => {
    setBriefs((prev) => prev.filter((brief) => brief.brief_id !== briefId));
  }, []);

  // ========== Getters ==========

  /**
   * Get brief by ID from local state
   * @param {string} briefId - Brief ID
   * @returns {Object|null} Brief or null
   */
  const getBriefById = useCallback(
    (briefId) => {
      return briefs.find((brief) => brief.brief_id === briefId) || null;
    },
    [briefs]
  );

  /**
   * Get briefs by status
   * @param {string} status - Brief status
   * @returns {Array} Filtered briefs
   */
  const getBriefsByStatus = useCallback(
    (status) => {
      return briefs.filter((brief) => brief.status === status);
    },
    [briefs]
  );

  /**
   * Get briefs by priority
   * @param {number} priority - Priority level
   * @returns {Array} Filtered briefs
   */
  const getBriefsByPriority = useCallback(
    (priority) => {
      return briefs.filter((brief) => brief.priority === priority);
    },
    [briefs]
  );

  // Context value
  const value = {
    // State
    briefs,
    currentBrief,
    isLoading,
    error,

    // API Actions
    fetchBriefs,
    fetchBrief,
    createBrief,
    updateBrief,
    deleteBrief,

    // Local State Actions
    setBriefsList,
    setCurrentBrief,
    addBrief,
    removeBrief,

    // Getters
    getBriefById,
    getBriefsByStatus,
    getBriefsByPriority,
  };

  return (
    <BriefContext.Provider value={value}>{children}</BriefContext.Provider>
  );
};
