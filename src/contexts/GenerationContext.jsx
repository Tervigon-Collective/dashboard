"use client";
import { createContext, useContext, useState, useCallback } from "react";
import * as contentApi from "../services/contentGenerationApi";

const GenerationContext = createContext({});

/**
 * Hook to use Generation context
 * @returns {Object} Generation context value
 */
export const useGeneration = () => {
  const context = useContext(GenerationContext);
  if (!context) {
    throw new Error("useGeneration must be used within GenerationProvider");
  }
  return context;
};

/**
 * Generation Context Provider
 * Manages state for AI content generation jobs
 */
export const GenerationProvider = ({ children }) => {
  const [activeGenerations, setActiveGenerations] = useState([]);
  const [completedGenerations, setCompletedGenerations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // ========== Actions ==========

  /**
   * Start video generation
   * @param {string} briefId - Brief ID to generate from
   * @returns {Promise<string>} Job ID
   */
  const startVideoGeneration = useCallback(async (briefId) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await contentApi.generateVideo(briefId);
      const jobId = response.job_id;

      const job = {
        id: jobId,
        type: "video",
        planId: `video_plan_${briefId}`,
        status: "pending",
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setActiveGenerations((prev) => [job, ...prev]);
      setIsLoading(false);
      return jobId;
    } catch (error) {
      setError(error.message);
      setIsLoading(false);
      throw error;
    }
  }, []);

  /**
   * Start graphic generation
   * @param {string} briefId - Brief ID to generate from
   * @returns {Promise<string>} Job ID
   */
  const startGraphicGeneration = useCallback(async (briefId) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await contentApi.generateGraphic(briefId);
      const jobId = response.job_id;

      const job = {
        id: jobId,
        type: "graphic",
        planId: `graphic_plan_${briefId}`,
        status: "pending",
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setActiveGenerations((prev) => [job, ...prev]);
      setIsLoading(false);
      return jobId;
    } catch (error) {
      setError(error.message);
      setIsLoading(false);
      throw error;
    }
  }, []);

  /**
   * Check generation status and update state
   * @param {string} jobId - Job ID to check
   */
  const checkGenerationStatus = useCallback(async (jobId) => {
    try {
      const status = await contentApi.getGenerationStatus(jobId);

      if (status.status === "completed") {
        // Move to completed
        setActiveGenerations((prev) => {
          const job = prev.find((j) => j.id === jobId);
          if (!job) return prev;

          const completedJob = {
            ...job,
            status: "completed",
            progress: 100,
            result: status.result,
            updatedAt: new Date(),
          };

          setCompletedGenerations((prev) => [completedJob, ...prev]);
          return prev.filter((j) => j.id !== jobId);
        });
      } else if (status.status === "pending_review") {
        // Update to pending_review status - this stops polling but keeps job active for review modal
        setActiveGenerations((prev) =>
          prev.map((job) =>
            job.id === jobId
              ? {
                  ...job,
                  status: "pending_review",
                  progress: status.progress || 50,
                  result: status.result, // Include video prompts for review
                  updatedAt: new Date(),
                }
              : job
          )
        );
      } else if (status.status === "failed") {
        // Mark as failed
        setActiveGenerations((prev) =>
          prev.map((job) =>
            job.id === jobId
              ? {
                  ...job,
                  status: "failed",
                  error: status.error,
                  updatedAt: new Date(),
                }
              : job
          )
        );
      } else {
        // Update progress for other statuses (pending, in_progress, etc.)
        setActiveGenerations((prev) =>
          prev.map((job) =>
            job.id === jobId
              ? {
                  ...job,
                  status: status.status,
                  progress: status.progress || job.progress,
                  updatedAt: new Date(),
                }
              : job
          )
        );
      }
    } catch (error) {
      console.error("Error checking status:", error);
    }
  }, []);

  /**
   * Update progress for a job
   * @param {string} jobId - Job ID
   * @param {number} progress - Progress percentage (0-100)
   */
  const updateProgress = useCallback((jobId, progress) => {
    setActiveGenerations((prev) =>
      prev.map((job) =>
        job.id === jobId ? { ...job, progress, updatedAt: new Date() } : job
      )
    );
  }, []);

  /**
   * Complete a generation job
   * @param {string} jobId - Job ID
   * @param {Object} result - Generation result
   */
  const completeGeneration = useCallback((jobId, result) => {
    setActiveGenerations((prev) => {
      const job = prev.find((j) => j.id === jobId);
      if (!job) return prev;

      const completedJob = {
        ...job,
        status: "completed",
        progress: 100,
        result,
        updatedAt: new Date(),
      };

      setCompletedGenerations((prev) => [completedJob, ...prev]);
      return prev.filter((j) => j.id !== jobId);
    });
  }, []);

  /**
   * Mark a generation as failed
   * @param {string} jobId - Job ID
   * @param {string} errorMessage - Error message
   */
  const failGeneration = useCallback((jobId, errorMessage) => {
    setActiveGenerations((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? {
              ...job,
              status: "failed",
              error: errorMessage,
              updatedAt: new Date(),
            }
          : job
      )
    );
  }, []);

  /**
   * Remove a generation from state
   * @param {string} jobId - Job ID
   */
  const removeGeneration = useCallback((jobId) => {
    setActiveGenerations((prev) => prev.filter((job) => job.id !== jobId));
    setCompletedGenerations((prev) => prev.filter((job) => job.id !== jobId));
  }, []);

  // ========== Getters ==========

  /**
   * Get generations by type
   * @param {'video'|'graphic'} type - Generation type
   * @returns {Array} Filtered generations
   */
  const getGenerationsByType = useCallback(
    (type) => {
      return [...activeGenerations, ...completedGenerations].filter(
        (job) => job.type === type
      );
    },
    [activeGenerations, completedGenerations]
  );

  /**
   * Get generations by status
   * @param {string} status - Generation status
   * @returns {Array} Filtered generations
   */
  const getGenerationsByStatus = useCallback(
    (status) => {
      return [...activeGenerations, ...completedGenerations].filter(
        (job) => job.status === status
      );
    },
    [activeGenerations, completedGenerations]
  );

  /**
   * Get generation by ID
   * @param {string} jobId - Job ID
   * @returns {Object|null} Generation job or null
   */
  const getGenerationById = useCallback(
    (jobId) => {
      return (
        [...activeGenerations, ...completedGenerations].find(
          (job) => job.id === jobId
        ) || null
      );
    },
    [activeGenerations, completedGenerations]
  );

  /**
   * Get active generations count
   * @returns {number} Count of active generations
   */
  const getActiveGenerationsCount = useCallback(() => {
    return activeGenerations.length;
  }, [activeGenerations]);

  // Context value
  const value = {
    // State
    activeGenerations,
    completedGenerations,
    isLoading,
    error,

    // Actions
    startVideoGeneration,
    startGraphicGeneration,
    checkGenerationStatus,
    updateProgress,
    completeGeneration,
    failGeneration,
    removeGeneration,

    // Getters
    getGenerationsByType,
    getGenerationsByStatus,
    getGenerationById,
    getActiveGenerationsCount,
  };

  return (
    <GenerationContext.Provider value={value}>
      {children}
    </GenerationContext.Provider>
  );
};
