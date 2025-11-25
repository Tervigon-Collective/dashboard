"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as brandkitApi from "../services/contentGenerationApi";

const BrandkitContext = createContext({});

/**
 * Hook to use Brandkit context
 * @returns {Object} Brandkit context value
 */
export const useBrandkit = () => {
  const context = useContext(BrandkitContext);
  if (!context) {
    throw new Error("useBrandkit must be used within BrandkitProvider");
  }
  return context;
};

/**
 * Brandkit Context Provider
 * Manages state for brandkit selection and management
 */
export const BrandkitProvider = ({ children }) => {
  const [activeBrandkit, setActiveBrandkit] = useState(null);
  const [brandkits, setBrandkits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load active brandkit on mount
  const loadActiveBrandkit = useCallback(async () => {
    try {
      setIsLoading(true);
      const active = await brandkitApi.getActiveBrandkit();
      setActiveBrandkit(active);
      // Persist to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("activeBrandkitId", active.brand_id);
      }
    } catch (err) {
      console.error("Error loading active brandkit:", err);
      setError(err.message || "Failed to load active brandkit");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load all brandkits
  const loadBrandkits = useCallback(async () => {
    try {
      const response = await brandkitApi.getBrandkits();
      setBrandkits(response.brandkits || []);
    } catch (err) {
      console.error("Error loading brandkits:", err);
      setError(err.message || "Failed to load brandkits");
    }
  }, []);

  // Switch active brandkit
  const switchBrandkit = useCallback(
    async (brandId) => {
      try {
        setIsLoading(true);
        await brandkitApi.activateBrandkit(brandId);
        await loadActiveBrandkit();
        await loadBrandkits();
      } catch (err) {
        console.error("Error switching brandkit:", err);
        throw new Error(err.message || "Failed to switch brandkit");
      } finally {
        setIsLoading(false);
      }
    },
    [loadActiveBrandkit, loadBrandkits]
  );

  // Refresh all brandkit data
  const refresh = useCallback(async () => {
    await Promise.all([loadActiveBrandkit(), loadBrandkits()]);
  }, [loadActiveBrandkit, loadBrandkits]);

  // Initialize on mount
  useEffect(() => {
    loadActiveBrandkit();
    loadBrandkits();
  }, [loadActiveBrandkit, loadBrandkits]);

  return (
    <BrandkitContext.Provider
      value={{
        activeBrandkit,
        brandkits,
        isLoading,
        error,
        switchBrandkit,
        refresh,
      }}
    >
      {children}
    </BrandkitContext.Provider>
  );
};

