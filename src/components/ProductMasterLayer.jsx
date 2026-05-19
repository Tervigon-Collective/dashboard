"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Icon } from "@iconify/react";
import productMasterApi from "../services/productMasterApi";
import VariantOptionsManager from "./VariantOptionsManager";
import { generateVariantCombinations } from "../utils/variantCombinationGenerator";
import { parseSkuSuffixes } from "../utils/skuSuffixParser";

const DEFAULT_VARIANT_TITLE = "Default Title";

const sanitizeVariantType = (variantType) => {
  if (
    variantType &&
    typeof variantType === "object" &&
    Object.keys(variantType).length > 0
  ) {
    return variantType;
  }

  return { title: DEFAULT_VARIANT_TITLE };
};

const createDefaultVariant = (overrides = {}) => {
  const variant_type = sanitizeVariantType(overrides.variant_type);
  const derivedDisplayName =
    overrides.displayName ||
    overrides.variant_display_name ||
    (Object.values(variant_type).length > 0
      ? Object.values(variant_type).join(" × ")
      : DEFAULT_VARIANT_TITLE);

  return {
    id: overrides.id || `default_variant_${Date.now()}`,
    variant_id: overrides.variant_id ?? null,
    variant_type,
    displayName: derivedDisplayName || DEFAULT_VARIANT_TITLE,
    sku: typeof overrides.sku === "string" ? overrides.sku : "",
    groupBy: overrides.groupBy || "Default",
  };
};

const cloneVariant = (variant) => {
  if (!variant) return null;
  return {
    ...variant,
    variant_type: variant.variant_type
      ? { ...variant.variant_type }
      : sanitizeVariantType(undefined),
  };
};

const cloneVariantOptions = (options) => {
  if (!Array.isArray(options)) return [];
  return options.map((option) => ({
    ...option,
    values: Array.isArray(option.values) ? [...option.values] : [],
  }));
};

const isDefaultVariantRecord = (variant) => {
  if (!variant) return false;

  const variantType = sanitizeVariantType(variant.variant_type);
  const keys = Object.keys(variantType);

  if (keys.length === 0) return true;

  if (
    keys.length === 1 &&
    keys[0].toLowerCase() === "title" &&
    String(variantType[keys[0]] || "")
      .toLowerCase()
      .includes(DEFAULT_VARIANT_TITLE.toLowerCase())
  ) {
    return true;
  }

  const displayName =
    variant.variant_display_name ||
    variant.displayName ||
    variant.groupBy ||
    "";

  return (
    keys.length === 1 &&
    keys[0].toLowerCase() === "title" &&
    displayName.toLowerCase().includes("default")
  );
};

const ProductMasterLayer = () => {
  const [products, setProducts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [brands, setBrands] = useState([]);
  const [brandFilter, setBrandFilter] = useState("");
  const [formData, setFormData] = useState({
    productName: "",
    hsnCode: "",
    commonName: "",
    brandId: "",
  });
  // Variant management state
  const [variantOptions, setVariantOptions] = useState([]);
  const [variants, setVariants] = useState(() => [
    createDefaultVariant({ id: "default_variant" }),
  ]);
  const [variantMode, setVariantMode] = useState("default");

  const defaultVariantCacheRef = useRef(
    createDefaultVariant({ id: "default_variant" })
  );
  const customVariantCacheRef = useRef([]);
  const customOptionsCacheRef = useRef([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncBrandId, setSyncBrandId] = useState("");
  const [syncModalError, setSyncModalError] = useState("");
  const [syncResult, setSyncResult] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [backfillModalOpen, setBackfillModalOpen] = useState(false);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState(null);
  const [backfillError, setBackfillError] = useState("");
  const [backfillBrandIds, setBackfillBrandIds] = useState([]);

  const [suffixExpansion, setSuffixExpansion] = useState(null);
  const [suffixExpansionLoading, setSuffixExpansionLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Infinite scroll state
  const [displayedItemsCount, setDisplayedItemsCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const tableContainerRef = useRef(null);
  const itemsPerPage = 20;
  // Track if page change is from infinite scroll (should not trigger replacement)
  const isInfiniteScrollRef = useRef(false);
  const loadProductsInFlightRef = useRef(false);

  // Form validation errors
  const [formErrors, setFormErrors] = useState({});

  // Search, filter, and sort states
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");

  const getPrimarySku = useCallback((product) => {
    if (!product) return "";

    const normalizeSku = (value) =>
      typeof value === "string" ? value.trim() : "";

    const directSku = normalizeSku(product.sku);
    if (directSku) return directSku;

    const defaultSku = normalizeSku(product.default_sku);
    if (defaultSku) return defaultSku;

    if (Array.isArray(product.variants)) {
      for (const variant of product.variants) {
        const variantSku = normalizeSku(variant?.sku);
        if (variantSku) {
          return variantSku;
        }
      }
    }

    return "";
  }, []);

  // Debounce search term (industry best practice: 500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const sortProductData = useCallback(
    (dataArray, field = sortField, direction = sortDirection) => {
      if (!field || !Array.isArray(dataArray)) {
        return dataArray || [];
      }

      const sortedData = [...dataArray].sort((a, b) => {
        const valueA = field === "sku" ? getPrimarySku(a) : a?.[field];
        const valueB = field === "sku" ? getPrimarySku(b) : b?.[field];

        if (valueA === valueB) return 0;
        if (valueA == null) return -1;
        if (valueB == null) return 1;

        // Handle dates
        if (/_at$/.test(field)) {
          const dateA = new Date(valueA).getTime();
          const dateB = new Date(valueB).getTime();
          return dateA - dateB;
        }

        // Handle numbers
        const numA = Number(valueA);
        const numB = Number(valueB);
        const bothNumbers = !Number.isNaN(numA) && !Number.isNaN(numB);

        if (bothNumbers) {
          return numA - numB;
        }

        return String(valueA)
          .toLocaleLowerCase()
          .localeCompare(String(valueB).toLocaleLowerCase(), undefined, {
            sensitivity: "base",
          });
      });

      if (direction === "desc") {
        sortedData.reverse();
      }

      return sortedData;
    },
    [sortField, sortDirection, getPrimarySku]
  );

  // Load products from API with server-side search, filters, and pagination
  const loadProducts = async (page = 1, resetPage = false, append = false) => {
    if (loadProductsInFlightRef.current) {
      return;
    }
    loadProductsInFlightRef.current = true;

    try {
      if (!append) {
        setIsLoading(true);
      }

      const targetPage = resetPage ? 1 : page;

      const options = {
        search: debouncedSearchTerm || undefined,
        brand_id: brandFilter || undefined,
        sortField: sortField || undefined,
        sortDirection: sortDirection || undefined,
      };

      const result = await productMasterApi.getAllProducts(
        targetPage,
        20,
        options
      );

      if (result.success) {
        if (append) {
          setProducts((prev) => {
            const combined = [...prev, ...(result.data || [])];
            return sortProductData(combined);
          });
        } else {
          setProducts(sortProductData(result.data || []));
          setDisplayedItemsCount(20); // Reset displayed items
        }
        setCurrentPage(result.pagination?.page || targetPage);
        setTotalPages(result.pagination?.totalPages || 1);
        setTotalRecords(result.pagination?.total || 0);
      } else {
        console.error("Failed to load products:", result.message);
        if (!append) {
          setProducts([]);
        }
      }
    } catch (error) {
      console.error("Error loading products:", error);
      if (!append) {
        setProducts([]);
      }
    } finally {
      setIsLoading(false);
      loadProductsInFlightRef.current = false;
    }
  };

  // Track initial mount
  const [isMounted, setIsMounted] = useState(false);
  const prevPageRef = useRef(1);
  const prevFiltersRef = useRef({
    search: "",
    brand: "",
    sort: null,
    sortDir: "asc",
  });

  const loadBrands = useCallback(async () => {
    try {
      const result = await productMasterApi.getBrands();
      if (result.success && Array.isArray(result.data)) {
        setBrands(result.data);
      }
    } catch (error) {
      console.error("Error loading brands:", error);
    }
  }, []);

  // Initial load on mount
  useEffect(() => {
    setIsMounted(true);
    loadBrands();
    loadProducts(1, false);
    prevPageRef.current = 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Single effect to handle all data loading
  useEffect(() => {
    if (!isMounted) return;

    const currentFilters = {
      search: debouncedSearchTerm,
      brand: brandFilter,
      sort: sortField,
      sortDir: sortDirection,
    };

    const prevFilters = prevFiltersRef.current;
    const prevPage = prevPageRef.current;

    // Check if filters changed
    const filtersChanged =
      prevFilters.search !== currentFilters.search ||
      prevFilters.brand !== currentFilters.brand ||
      prevFilters.sort !== currentFilters.sort ||
      prevFilters.sortDir !== currentFilters.sortDir;

    // Check if page changed
    const pageChanged = prevPage !== currentPage;

    // If filters changed, reset to page 1 and load
    if (filtersChanged) {
      prevFiltersRef.current = currentFilters;
      isInfiniteScrollRef.current = false; // Reset flag
      if (currentPage !== 1) {
        // Reset page first, let the page change trigger reload
        prevPageRef.current = currentPage;
        setCurrentPage(1);
      } else {
        // Already on page 1, load immediately
        prevPageRef.current = 1;
        loadProducts(1, true);
      }
      return;
    }

    // If only page changed (not filters), and it's NOT from infinite scroll, load that page
    // Skip if page change is from infinite scroll (data already loaded via append)
    if (pageChanged && currentPage > 0 && !isInfiniteScrollRef.current) {
      prevPageRef.current = currentPage;
      loadProducts(currentPage, false);
    } else if (pageChanged && isInfiniteScrollRef.current) {
      // Page changed from infinite scroll, just update the ref and reset flag
      prevPageRef.current = currentPage;
      isInfiniteScrollRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isMounted,
    debouncedSearchTerm,
    brandFilter,
    sortField,
    sortDirection,
    currentPage,
  ]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setBrandFilter("");
    setSortField(null);
    setSortDirection("asc");
    setCurrentPage(1);
    setDisplayedItemsCount(20);
    isInfiniteScrollRef.current = false; // Reset flag
  };

  // Get displayed data for infinite scroll
  const getDisplayedData = (dataArray) => {
    return dataArray.slice(0, displayedItemsCount);
  };

  useEffect(() => {
    setProducts((prev) => sortProductData(prev));
  }, [sortProductData]);

  // Check if there's more data to load
  const hasMoreData = useCallback(
    (dataArray) => {
      return displayedItemsCount < dataArray.length || currentPage < totalPages;
    },
    [displayedItemsCount, currentPage, totalPages]
  );

  // Load more data callback
  const loadMoreData = useCallback(async () => {
    if (isLoadingMore || isLoading) return;

    setIsLoadingMore(true);
    // Simulate loading delay for skeleton effect
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Check if we need to fetch more from API
    if (displayedItemsCount >= products.length && currentPage < totalPages) {
      // Set flag to indicate this page change is from infinite scroll
      isInfiniteScrollRef.current = true;
      await loadProducts(currentPage + 1, false, true);
    }

    setDisplayedItemsCount((prev) => prev + itemsPerPage);
    setIsLoadingMore(false);
  }, [
    isLoadingMore,
    isLoading,
    displayedItemsCount,
    products.length,
    currentPage,
    totalPages,
    itemsPerPage,
    loadProducts,
  ]);

  // Reset displayed items when search term or filters change
  useEffect(() => {
    setDisplayedItemsCount(20);
  }, [debouncedSearchTerm, sortField, sortDirection]);

  // Scroll detection for infinite scroll (using event listeners in addition to onScroll/onWheel)
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    // Handle wheel events to allow page scrolling when table reaches boundaries
    const handleWheel = (e) => {
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      const isAtTop = scrollTop <= 1;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

      if (e.deltaY > 0 && isAtBottom) {
        window.scrollBy({
          top: e.deltaY,
          behavior: "auto",
        });
      } else if (e.deltaY < 0 && isAtTop) {
        window.scrollBy({
          top: e.deltaY,
          behavior: "auto",
        });
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: true });

    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, []);

  // Handle column sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
      setDisplayedItemsCount(20);
      isInfiniteScrollRef.current = false;
      if (currentPage !== 1) {
        prevPageRef.current = currentPage;
        setCurrentPage(1);
      }
    }
  };

  const handleSortFieldSelect = (value) => {
    const newSortField = value || null;
    setSortField(newSortField);
    setDisplayedItemsCount(20);
    isInfiniteScrollRef.current = false;
    if (currentPage !== 1) {
      prevPageRef.current = currentPage;
      setCurrentPage(1);
    }
  };

  const handleSortDirectionSelect = (value) => {
    setSortDirection(value);
    setDisplayedItemsCount(20);
    isInfiniteScrollRef.current = false;
    if (currentPage !== 1) {
      prevPageRef.current = currentPage;
      setCurrentPage(1);
    }
  };

  const extractBaseSku = useCallback((variant, hasMultipleVariants = false) => {
    const rawSku = variant?.sku;
    if (!rawSku || typeof rawSku !== "string") return null;

    const escapeRegExp = (string) =>
      string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const collectVariantStrings = () => {
      const collected = [];

      if (variant?.variant_type) {
        Object.values(variant.variant_type).forEach((value) => {
          if (typeof value === "string" && value.trim()) {
            collected.push(value.trim());
          }
        });
      }

      if (typeof variant?.variant_display_name === "string") {
        variant.variant_display_name
          .split(/[×x,\/]/i)
          .flatMap((part) => part.split("-"))
          .map((part) => part.trim())
          .filter(Boolean)
          .forEach((part) => collected.push(part));
      }

      const derived = [];
      collected.forEach((value) => {
        if (!value) return;
        derived.push(value);
        const upperValue = value.toUpperCase();
        if (upperValue !== value) {
          derived.push(upperValue);
        }

        const compact = value.replace(/\s+/g, "");
        if (compact && compact !== value) {
          derived.push(compact);
          derived.push(compact.toUpperCase());
        }

        const firstLetters = value
          .split(/\s+/)
          .map((word) => word[0])
          .join("");
        if (firstLetters && firstLetters.length > 0) {
          derived.push(firstLetters);
          derived.push(firstLetters.toUpperCase());
        }
      });

      return Array.from(
        new Set(derived.map((value) => value.trim()).filter(Boolean))
      );
    };

    let baseSku = rawSku.trim();
    const candidateValues = collectVariantStrings();

    candidateValues.forEach((value) => {
      const escapedValue = escapeRegExp(value);

      const patterns = [
        new RegExp(`\\s*-\\s*${escapedValue}$`, "i"),
        new RegExp(`-${escapedValue}$`, "i"),
        new RegExp(`\\s*\\(${escapedValue}\\)$`, "i"),
      ];

      patterns.forEach((pattern) => {
        if (pattern.test(baseSku)) {
          baseSku = baseSku.replace(pattern, "");
        }
      });
    });

    if (
      hasMultipleVariants &&
      /-[A-Z]{1,3}$/.test(baseSku) &&
      !candidateValues.some((value) =>
        new RegExp(`-${escapeRegExp(value)}$`, "i").test(baseSku)
      )
    ) {
      baseSku = baseSku.replace(/-([A-Z]{1,3})$/, "");
    }

    baseSku = baseSku.replace(/\s*-\s*$/, "").trim();
    return baseSku || rawSku.trim();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Parse validation errors and map to form fields
  const parseValidationErrors = (validationErrors) => {
    const errors = {};
    if (validationErrors && Array.isArray(validationErrors)) {
      validationErrors.forEach((error) => {
        // Parse error message like "hsn_code: HSN code must be between 4 and 50 characters"
        const match = error.match(/^(\w+):\s*(.+)$/);
        if (match) {
          const fieldName = match[1];
          const message = match[2];

          // Map backend field names to frontend field names
          const fieldMap = {
            product_name: "productName",
            hsn_code: "hsnCode",
            common_name: "commonName",
            brand_id: "brandId",
          };

          const frontendField = fieldMap[fieldName] || fieldName;
          errors[frontendField] = message;
        } else {
          // If format doesn't match, show general error
          errors.general = error;
        }
      });
    }
    return errors;
  };

  // Handle variant options change
  const handleVariantOptionsChange = (options) => {
    if (variantMode !== "custom") {
      setVariantOptions([]);
      return;
    }

    setVariantOptions(options);

    // In edit mode, don't regenerate existing variants
    if (isEditMode && variants.length > 0) {
      // Only generate if no options or all options have no values
      if (!options || options.length === 0) {
        return; // Keep existing variants as is
      }

      const allOptionsHaveValues = options.every(
        (opt) => opt.values && opt.values.length > 0
      );

      if (!allOptionsHaveValues) {
        return; // Keep existing variants as is
      }

      // Generate new variants from combinations
      const generatedVariants = generateVariantCombinations(options);

      // Filter out duplicates - only add variants that don't already exist
      const newVariants = generatedVariants.filter((newVariant) => {
        return !variants.some((existingVariant) => {
          // Compare variant_type objects
          const existingType = existingVariant.variant_type || {};
          const newType = newVariant.variant_type || {};

          // Check if all keys and values match
          const existingKeys = Object.keys(existingType).sort();
          const newKeys = Object.keys(newType).sort();

          if (existingKeys.length !== newKeys.length) return false;

          return existingKeys.every(
            (key) => existingType[key] === newType[key]
          );
        });
      });

      // Add new variants to existing ones
      setVariants([...variants, ...newVariants]);
    } else {
      // In add mode, just generate new variants
      if (options && options.length > 0) {
        const allOptionsHaveValues = options.every(
          (opt) => opt.values && opt.values.length > 0
        );
        if (allOptionsHaveValues) {
          const generatedVariants = generateVariantCombinations(options);
          setVariants(generatedVariants);
        } else {
          setVariants([]);
        }
      } else {
        setVariants([]);
      }
    }
  };

  const handleVariantModeChange = (mode) => {
    if (mode === variantMode) return;

    if (mode === "default") {
      if (variantMode === "custom") {
        customVariantCacheRef.current = Array.isArray(variants)
          ? variants.map((variant) => cloneVariant(variant)).filter(Boolean)
          : [];
        customOptionsCacheRef.current = cloneVariantOptions(variantOptions);
      }

      const cachedDefault = cloneVariant(defaultVariantCacheRef.current);
      const defaultVariant =
        cachedDefault ||
        createDefaultVariant({
          id: "default_variant",
        });

      setVariantMode("default");
      setVariantOptions([]);
      setVariants([
        createDefaultVariant({
          id: defaultVariant.id || "default_variant",
          variant_id: defaultVariant.variant_id ?? null,
          variant_type: defaultVariant.variant_type,
          displayName: defaultVariant.displayName,
          sku: defaultVariant.sku,
          groupBy: defaultVariant.groupBy,
        }),
      ]);
    } else {
      if (variantMode === "default") {
        const currentDefault = variants?.[0];
        if (currentDefault) {
          defaultVariantCacheRef.current = cloneVariant(currentDefault);
        }
      }

      setVariantMode("custom");
      const restoredVariants = customVariantCacheRef.current || [];
      const restoredOptions = customOptionsCacheRef.current || [];

      setVariantOptions(cloneVariantOptions(restoredOptions));
      setVariants(
        restoredVariants.length > 0
          ? restoredVariants
              .map((variant) => cloneVariant(variant))
              .filter(Boolean)
          : []
      );
    }
  };

  useEffect(() => {
    if (!formErrors.variants) return;
    if (Array.isArray(variants) && variants.length > 0) {
      setFormErrors((prev) => {
        if (!prev.variants) return prev;
        const { variants: _ignored, ...rest } = prev;
        return rest;
      });
    }
  }, [variants, formErrors.variants]);

  // Handle variant change (for SKU input)
  const handleVariantChange = (index, field, value) => {
    const updatedVariants = [...variants];
    const next = {
      ...updatedVariants[index],
      [field]: value,
    };
    if (field === "sku") {
      const suffixes = parseSkuSuffixes(value);
      next.sku_product_suffix = suffixes.sku_product_suffix;
      next.sku_variant_suffix = suffixes.sku_variant_suffix;
    }
    updatedVariants[index] = next;
    setVariants(updatedVariants);
  };

  useEffect(() => {
    if (
      variantMode === "default" &&
      Array.isArray(variants) &&
      variants.length > 0
    ) {
      defaultVariantCacheRef.current = cloneVariant(variants[0]);
    }
  }, [variantMode, variants]);

  useEffect(() => {
    if (variantMode === "custom") {
      customVariantCacheRef.current = Array.isArray(variants)
        ? variants.map((variant) => cloneVariant(variant)).filter(Boolean)
        : [];
    }
  }, [variantMode, variants]);

  useEffect(() => {
    if (variantMode === "custom") {
      customOptionsCacheRef.current = cloneVariantOptions(variantOptions);
    }
  }, [variantMode, variantOptions]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const trimmedName = formData.productName?.trim() || "";
      if (!trimmedName) {
        setFormErrors((prev) => ({
          ...prev,
          productName: "Product name is required.",
        }));
        setIsSubmitting(false);
        return;
      }

      const brandId = formData.brandId ? Number(formData.brandId) : null;
      if (!brandId) {
        setFormErrors((prev) => ({
          ...prev,
          brandId: "Brand is required.",
        }));
        setIsSubmitting(false);
        return;
      }

      if (!variants || variants.length === 0) {
        setFormErrors((prev) => ({
          ...prev,
          variants: "At least one SKU is required.",
        }));
        setIsSubmitting(false);
        return;
      }

      const apiData = {
        product_name: trimmedName,
        brand_id: brandId,
        hsn_code: formData.hsnCode?.trim() || null,
        common_name: formData.commonName?.trim() || null,
        item_description: null,
        variants: variants.map((variant, index) => {
          const variantType = sanitizeVariantType(variant.variant_type);
          const displayName =
            variant.displayName ||
            variant.variant_display_name ||
            (Object.values(variantType).length > 0
              ? Object.values(variantType).join(" × ")
              : `${DEFAULT_VARIANT_TITLE} ${index + 1}`);
          const sku =
            typeof variant.sku === "string" ? variant.sku.trim() : "";
          const suffixes = parseSkuSuffixes(sku);

          return {
            ...(variant.variant_id && { variant_id: variant.variant_id }),
            variant_type: variantType,
            variant_display_name: displayName,
            sku,
            sku_product_suffix: suffixes.sku_product_suffix,
            sku_variant_suffix: suffixes.sku_variant_suffix,
          };
        }),
      };

      // Call the backend API using the service
      let result;
      if (isEditMode && editingProduct) {
        // Update existing product
        result = await productMasterApi.updateProduct(
          editingProduct.product_id,
          apiData
        );
      } else {
        // Create new product
        result = await productMasterApi.createProduct(apiData);
      }

      if (result.success) {
        // Reset form and close modal
        setFormData({
          productName: "",
          hsnCode: "",
          commonName: "",
          brandId: "",
        });
        setFormErrors({});

        setModalOpen(false);
        setIsEditMode(false);
        setEditingProduct(null);
        setVariantOptions([]);
        setVariantMode("default");
        setVariants([createDefaultVariant({ id: "default_variant" })]);

        // Reload products list to show updated data with current filters
        await loadProducts(currentPage, false);

        console.log(
          isEditMode
            ? "Product updated successfully:"
            : "Product added successfully:",
          result.data
        );
      } else {
        console.error("API Error:", result.message);
        // Parse and display validation errors
        if (result.validationErrors && result.validationErrors.length > 0) {
          const parsedErrors = parseValidationErrors(result.validationErrors);
          setFormErrors(parsedErrors);
        } else {
          setFormErrors({ general: result.message || "An error occurred" });
        }
      }
    } catch (error) {
      console.error("Error adding/updating product:", error);

      if (error.status === 409) {
        setFormErrors({
          productName:
            error.result?.message ||
            "A product with this name already exists for the selected brand.",
        });
        setIsSubmitting(false);
        return;
      }

      // Handle formatted errors from API service
      if (error.result) {
        if (
          error.result.validationErrors &&
          error.result.validationErrors.length > 0
        ) {
          const parsedErrors = parseValidationErrors(
            error.result.validationErrors
          );
          setFormErrors(parsedErrors);
        } else {
          setFormErrors({
            general:
              error.result.message || error.message || "An error occurred",
          });
        }
      } else {
        setFormErrors({
          general:
            error.message || "Failed to add/update product. Please try again.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setIsEditMode(false);
    setEditingProduct(null);
    setVariantOptions([]);
    setVariantMode("default");
    setVariants([createDefaultVariant({ id: "default_variant" })]);
    setFormErrors({});
    setFormData({
      productName: "",
      hsnCode: "",
      commonName: "",
      brandId: "",
    });
    setSuffixExpansion(null);
    setSuffixExpansionLoading(false);
  };

  const handleAddProductClick = () => {
    setIsEditMode(false);
    setEditingProduct(null);
    setFormErrors({});
    setFormData({
      productName: "",
      hsnCode: "",
      commonName: "",
      brandId: brandFilter || "",
    });
    setVariantOptions([]);
    setVariantMode("default");
    setVariants([createDefaultVariant({ id: "default_variant" })]);
    setSuffixExpansion(null);
    setSuffixExpansionLoading(false);
    setModalOpen(true);
  };

  const handleEditProduct = async (product) => {
    setEditingProduct(product);
    setIsEditMode(true);
    setFormErrors({});
    setFormData({
      productName: product.product_name || "",
      hsnCode: product.hsn_code || "",
      commonName: product.common_name || "",
      brandId: product.brand_id != null ? String(product.brand_id) : "",
    });

    let productWithVariants = product;
    if (!product.variants || product.variants.length === 0) {
      try {
        const result = await productMasterApi.getProductById(
          product.product_id
        );
        if (result.success && result.data) {
          productWithVariants = result.data;
        }
      } catch (error) {
        console.error("Error loading product details:", error);
      }
    }

    const apiVariants = Array.isArray(productWithVariants.variants)
      ? productWithVariants.variants
      : [];

    if (apiVariants.length === 0) {
      setVariantMode("default");
      setVariantOptions([]);
      setVariants([
        createDefaultVariant({
          id: "default_variant",
          sku: "",
        }),
      ]);
    } else {
      const defaultOnly =
        apiVariants.length === 1 && isDefaultVariantRecord(apiVariants[0]);

      if (defaultOnly) {
        setVariantMode("default");
        setVariantOptions([]);
        setVariants([
          createDefaultVariant({
            id: `edit_variant_${apiVariants[0].variant_id || Date.now()}`,
            variant_id: apiVariants[0].variant_id ?? null,
            variant_type: apiVariants[0].variant_type,
            variant_display_name:
              apiVariants[0].variant_display_name || DEFAULT_VARIANT_TITLE,
            sku: apiVariants[0].sku || "",
            ...parseSkuSuffixes(apiVariants[0].sku || ""),
          }),
        ]);
      } else {
        setVariantMode("custom");

        const mappedVariants = apiVariants.map((variant, index) => {
          const variantType = sanitizeVariantType(variant.variant_type);
          const displayName =
            variant.variant_display_name ||
            (Object.values(variantType).length > 0
              ? Object.values(variantType).join(" × ")
              : `Variant ${index + 1}`);

          const sku = variant.sku || "";
          return {
            id: `edit_variant_${variant.variant_id || index}`,
            variant_id: variant.variant_id,
            variant_type: variantType,
            displayName,
            sku,
            sku_product_suffix:
              variant.sku_product_suffix ||
              parseSkuSuffixes(sku).sku_product_suffix,
            sku_variant_suffix:
              variant.sku_variant_suffix ||
              parseSkuSuffixes(sku).sku_variant_suffix,
          };
        });

        setVariants(mappedVariants);

        const optionTypesMap = {};
        apiVariants.forEach((variant) => {
          if (variant.variant_type) {
            Object.entries(variant.variant_type).forEach(([type, value]) => {
              if (!optionTypesMap[type]) {
                optionTypesMap[type] = new Set();
              }
              if (value) {
                optionTypesMap[type].add(value);
              }
            });
          }
        });

        const options = Object.keys(optionTypesMap).map((type) => ({
          id: `option_${type}`,
          type,
          label: type.charAt(0).toUpperCase() + type.slice(1),
          icon: "mdi:tag",
          values: Array.from(optionTypesMap[type]),
        }));

        setVariantOptions(options);
      }
    }

    setSuffixExpansion(null);
    setSuffixExpansionLoading(true);
    setModalOpen(true);

    try {
      const expandRes = await productMasterApi.expandByProductSuffix(
        productWithVariants.product_id
      );
      if (expandRes.success) {
        setSuffixExpansion(expandRes.data);
      }
    } catch (error) {
      console.error("Error loading suffix expansion:", error);
    } finally {
      setSuffixExpansionLoading(false);
    }
  };

  const openDeleteModal = (product) => {
    setProductToDelete(product);
    setDeleteError("");
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (isDeleting) return;
    setDeleteModalOpen(false);
    setProductToDelete(null);
    setDeleteError("");
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;

    setDeleteError("");
    setIsDeleting(true);

    try {
      const result = await productMasterApi.deleteProduct(
        productToDelete.product_id
      );

      if (result.success) {
        closeDeleteModal();
        await loadProducts(currentPage, false);
      } else {
        setDeleteError(result.message || "Failed to delete product.");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      setDeleteError(
        error.result?.message ||
          error.message ||
          "Failed to delete product. Please try again."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const openBackfillModal = () => {
    setBackfillError("");
    setBackfillResult(null);
    setBackfillBrandIds(brandFilter ? [String(brandFilter)] : []);
    setBackfillModalOpen(true);
  };

  const closeBackfillModal = () => {
    if (isBackfilling) return;
    setBackfillModalOpen(false);
    setBackfillError("");
    setBackfillResult(null);
    setBackfillBrandIds([]);
  };

  const toggleBackfillBrand = (brandId) => {
    const id = String(brandId);
    setBackfillBrandIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
    if (backfillError) setBackfillError("");
  };

  const selectAllBackfillBrands = () => {
    setBackfillBrandIds(brands.map((brand) => String(brand.brand_id)));
    if (backfillError) setBackfillError("");
  };

  const clearBackfillBrands = () => {
    setBackfillBrandIds([]);
    if (backfillError) setBackfillError("");
  };

  const confirmBackfillCatalog = async () => {
    if (backfillBrandIds.length === 0) {
      setBackfillError("Select at least one brand to backfill.");
      return;
    }

    setBackfillError("");
    setBackfillResult(null);
    setIsBackfilling(true);

    try {
      const result = await productMasterApi.backfillCatalog(
        backfillBrandIds.map((id) => Number(id))
      );
      if (result.success || result.data?.summary?.brands_succeeded > 0) {
        setBackfillResult(result.data);
        await loadProducts(currentPage, false);
      } else {
        setBackfillError(result.message || "Backfill failed for all brands.");
        if (result.data) setBackfillResult(result.data);
      }
    } catch (error) {
      console.error("Error backfilling catalog:", error);
      setBackfillError(
        error.result?.message ||
          error.message ||
          "Failed to backfill catalog. Please try again."
      );
      if (error.result?.data) setBackfillResult(error.result.data);
    } finally {
      setIsBackfilling(false);
    }
  };

  const openSyncModal = () => {
    setSyncModalError("");
    setSyncResult(null);
    setSyncBrandId(brandFilter || "");
    setSyncModalOpen(true);
  };

  const closeSyncModal = () => {
    if (isSyncing) return;
    setSyncModalOpen(false);
    setSyncModalError("");
    setSyncResult(null);
    setSyncBrandId("");
  };

  const getSyncBrandLabel = (brandId) =>
    brands.find((b) => String(b.brand_id) === String(brandId))?.brand_name ||
    "Selected brand";

  const handleConfirmSync = async () => {
    if (!syncBrandId) {
      setSyncModalError("Please select a brand to sync products from Shopify.");
      return;
    }

    setSyncModalError("");
    setSyncResult(null);

    try {
      setIsSyncing(true);
      const result = await productMasterApi.syncProducts({
        brand_id: syncBrandId,
      });

      if (result.success) {
        setSyncResult(result.data || {});
        await loadProducts(currentPage, false);
      } else {
        setSyncModalError(
          result.message || result.error || "Failed to sync products."
        );
      }
    } catch (error) {
      console.error("Error syncing products:", error);
      setSyncModalError(
        error.result?.message ||
          error.message ||
          "Failed to sync products. Please try again."
      );
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div>
      {/* Search, Filter, and Action Bar - Single Line */}
      <div className="d-flex align-items-center gap-2 mb-4 flex-wrap">
        {/* Search Input */}
        <div
          className="position-relative"
          style={{ flex: "1 1 250px", minWidth: "200px" }}
        >
          <Icon
            icon="lucide:search"
            width="16"
            height="16"
            className="position-absolute top-50 translate-middle-y"
            style={{ left: "12px", color: "#6c757d", zIndex: 1 }}
          />
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              paddingLeft: "36px",
              height: "36px",
              fontSize: "0.875rem",
            }}
          />
        </div>

        <select
          className="form-select form-select-sm"
          value={brandFilter}
          onChange={(e) => {
            setBrandFilter(e.target.value);
            setDisplayedItemsCount(20);
            isInfiniteScrollRef.current = false;
            if (currentPage !== 1) {
              setCurrentPage(1);
            }
          }}
          style={{
            height: "34px",
            width: "auto",
            minWidth: "170px",
            fontSize: "0.8125rem",
          }}
        >
          <option value="">All brands</option>
          {brands.map((brand) => (
            <option key={brand.brand_id} value={String(brand.brand_id)}>
              {brand.brand_name}
            </option>
          ))}
        </select>

        {/* Sort Field */}
        <select
          className="form-select form-select-sm"
          value={sortField || ""}
          onChange={(e) => handleSortFieldSelect(e.target.value)}
          style={{
            height: "34px",
            width: "auto",
            minWidth: "160px",
            fontSize: "0.8125rem",
            lineHeight: "1.1",
          }}
        >
          <option value="">Sort By</option>
          <option value="product_name">Product Name</option>
          <option value="hsn_code">HSN Code</option>
          <option value="sku">SKU</option>
          <option value="created_at">Created At</option>
          <option value="updated_at">Updated At</option>
        </select>

        {/* Sort Order */}
        <select
          className="form-select form-select-sm"
          value={sortDirection}
          onChange={(e) => handleSortDirectionSelect(e.target.value)}
          style={{
            height: "34px",
            width: "auto",
            minWidth: "110px",
            fontSize: "0.8125rem",
            lineHeight: "1.1",
          }}
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>

        {/* Reset Button */}
        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={handleResetFilters}
          title="Reset filters"
          style={{ height: "36px", padding: "6px 12px", fontSize: "0.875rem" }}
        >
          <Icon icon="lucide:x" width="14" height="14" />
        </button>

        {/* Product Count */}
        <span
          className="text-muted ms-auto"
          style={{ fontSize: "0.8125rem", whiteSpace: "nowrap" }}
        >
          Showing {getDisplayedData(products).length} of {totalRecords} products
        </span>

        <button
          type="button"
          onClick={openBackfillModal}
          className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center"
          style={{
            gap: "4px",
            padding: "6px 14px",
            height: "36px",
            fontSize: "0.875rem",
          }}
          title="Import product catalog from Shopify for selected brands"
        >
          <Icon icon="lucide:database" width="16" height="16" />
          <span className="d-none d-md-inline">Backfill catalog</span>
        </button>

        {/* Sync Button */}
        <button
          type="button"
          onClick={openSyncModal}
          className="btn btn-outline-primary btn-sm d-inline-flex align-items-center"
          style={{
            gap: "4px",
            padding: "6px 14px",
            height: "36px",
            fontSize: "0.875rem",
          }}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <>
              <span
                className="spinner-border spinner-border-sm"
                role="status"
                aria-hidden="true"
              ></span>
              <span>Syncing...</span>
            </>
          ) : (
            <>
              <Icon icon="lucide:refresh-cw" width="16" height="16" />
              <span className="d-none d-sm-inline">Sync Product</span>
              <span className="d-sm-none">Sync</span>
            </>
          )}
        </button>

        {/* Add Button */}
        <button
          onClick={handleAddProductClick}
          className="btn btn-primary btn-sm d-inline-flex align-items-center"
          style={{
            gap: "4px",
            padding: "6px 14px",
            height: "36px",
            fontSize: "0.875rem",
          }}
        >
          <Icon icon="lucide:plus" width="16" height="16" />
          <span>Add Product</span>
        </button>
      </div>

      {/* Products List */}
      <div
        ref={tableContainerRef}
        className="table-responsive scroll-sm table-scroll-container"
        style={{
          maxHeight: "600px",
          overflowY: "auto",
          overflowX: "auto",
          position: "relative",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          scrollBehavior: "smooth",
          overscrollBehavior: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
        onScroll={(e) => {
          const target = e.target;
          const scrollTop = target.scrollTop;
          const scrollHeight = target.scrollHeight;
          const clientHeight = target.clientHeight;

          if (scrollTop + clientHeight >= scrollHeight * 0.8) {
            if (hasMoreData(products) && !isLoadingMore && !isLoading) {
              loadMoreData();
            }
          }
        }}
        onWheel={(e) => {
          const target = e.currentTarget;
          const scrollTop = target.scrollTop;
          const scrollHeight = target.scrollHeight;
          const clientHeight = target.clientHeight;
          const isAtTop = scrollTop <= 1;
          const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

          if (e.deltaY > 0 && isAtBottom) {
            window.scrollBy({
              top: e.deltaY,
              behavior: "auto",
            });
          } else if (e.deltaY < 0 && isAtTop) {
            window.scrollBy({
              top: e.deltaY,
              behavior: "auto",
            });
          }
        }}
      >
        <table className="table bordered-table mb-0">
          <thead
            style={{
              position: "sticky",
              top: 0,
              zIndex: 10,
              backgroundColor: "#f8f9fa",
            }}
          >
            <tr>
              <th scope="col" style={{ width: "60px" }}>
                #
              </th>
              <th scope="col">Brand</th>
              <th
                scope="col"
                onClick={() => handleSort("product_name")}
                style={{ cursor: "pointer", userSelect: "none" }}
              >
                <div className="d-flex align-items-center gap-2">
                  Product Name
                  {sortField === "product_name" && (
                    <Icon
                      icon={
                        sortDirection === "asc"
                          ? "lucide:chevron-up"
                          : "lucide:chevron-down"
                      }
                      width="14"
                      height="14"
                    />
                  )}
                </div>
              </th>
              <th
                scope="col"
                onClick={() => handleSort("hsn_code")}
                style={{ cursor: "pointer", userSelect: "none" }}
              >
                <div className="d-flex align-items-center gap-2">
                  HSN Code
                  {sortField === "hsn_code" && (
                    <Icon
                      icon={
                        sortDirection === "asc"
                          ? "lucide:chevron-up"
                          : "lucide:chevron-down"
                      }
                      width="14"
                      height="14"
                    />
                  )}
                </div>
              </th>
              <th scope="col">Common Name</th>
              <th
                scope="col"
                onClick={() => handleSort("sku")}
                style={{ cursor: "pointer", userSelect: "none" }}
              >
                <div className="d-flex align-items-center gap-2">
                  SKU
                  {sortField === "sku" && (
                    <Icon
                      icon={
                        sortDirection === "asc"
                          ? "lucide:chevron-up"
                          : "lucide:chevron-down"
                      }
                      width="14"
                      height="14"
                    />
                  )}
                </div>
              </th>
              <th
                scope="col"
                className="text-center"
                style={{ width: "120px" }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && products.length === 0 ? (
              <>
                {Array.from({ length: 5 }).map((_, rowIndex) => (
                  <tr key={`skeleton-${rowIndex}`}>
                    {Array.from({ length: 7 }).map((_, colIndex) => (
                      <td key={`skeleton-${rowIndex}-${colIndex}`}>
                        <div
                          className="skeleton"
                          style={{
                            height: "20px",
                            backgroundColor: "#e5e7eb",
                            borderRadius: "4px",
                            animation:
                              "skeletonPulse 1.5s ease-in-out infinite",
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-4 text-muted">
                  <div className="d-flex flex-column align-items-center">
                    <p className="text-muted mb-0">
                      {searchTerm
                        ? "No products match your search criteria."
                        : 'No products found. Click "Add New Product" to get started.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              <>
                {getDisplayedData(products).map((product, index) => (
                  <tr key={product.product_id}>
                    <td>
                      <span className="text-secondary-light">{index + 1}</span>
                    </td>
                    <td>
                      <span className="text-secondary-light">
                        {product.brand_name || "-"}
                      </span>
                    </td>
                    <td>
                      <span className="text-secondary-light fw-medium">
                        {product.product_name}
                      </span>
                    </td>
                    <td>
                      <span className="text-secondary-light">
                        {product.hsn_code || "-"}
                      </span>
                    </td>
                    <td>
                      <span className="text-secondary-light">
                        {product.common_name || "-"}
                      </span>
                    </td>
                    <td>
                      <span
                        className="text-secondary-light text-truncate d-inline-block"
                        style={{ maxWidth: "220px" }}
                        title={
                          Array.isArray(product.variants) &&
                          product.variants.length
                            ? Array.from(
                                new Set(
                                  product.variants
                                    .map(
                                      (variant) =>
                                        extractBaseSku(
                                          variant,
                                          product.variants.length > 1
                                        ) ?? variant?.sku
                                    )
                                    .filter(Boolean)
                                )
                              ).join(", ")
                            : "-"
                        }
                      >
                        {Array.isArray(product.variants) &&
                        product.variants.length
                          ? (() => {
                              const skuList = Array.from(
                                new Set(
                                  product.variants
                                    .map(
                                      (variant) =>
                                        extractBaseSku(
                                          variant,
                                          product.variants.length > 1
                                        ) ?? variant?.sku
                                    )
                                    .filter(Boolean)
                                )
                              );
                              if (!skuList.length) return "-";
                              if (skuList.length === 1) return skuList[0];
                              return `${skuList[0]} (+${
                                skuList.length - 1
                              } more)`;
                            })()
                          : "-"}
                      </span>
                    </td>
                    <td className="text-center">
                      <div className="d-flex gap-2 justify-content-center">
                        <button
                          className="btn btn-sm"
                          style={{
                            border: "1px solid #dee2e6",
                            background: "white",
                            padding: "4px 8px",
                            color: "#495057",
                            borderRadius: "4px",
                          }}
                          title="Edit"
                          onClick={() => handleEditProduct(product)}
                        >
                          <Icon icon="lucide:pencil" width="14" height="14" />
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{
                            border: "1px solid #dc3545",
                            background: "white",
                            padding: "4px 8px",
                            color: "#dc3545",
                            borderRadius: "4px",
                          }}
                          title="Delete"
                          onClick={() => openDeleteModal(product)}
                        >
                          <Icon icon="lucide:trash-2" width="14" height="14" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {isLoadingMore && (
                  <>
                    {Array.from({ length: 5 }).map((_, rowIndex) => (
                      <tr key={`skeleton-more-${rowIndex}`}>
                        {Array.from({ length: 7 }).map((_, colIndex) => (
                          <td key={`skeleton-more-${rowIndex}-${colIndex}`}>
                            <div
                              className="skeleton"
                              style={{
                                height: "20px",
                                backgroundColor: "#e5e7eb",
                                borderRadius: "4px",
                                animation:
                                  "skeletonPulse 1.5s ease-in-out infinite",
                              }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Infinite Scroll Footer */}
      {totalRecords > 0 && (
        <div
          className="d-flex justify-content-between align-items-center px-3 py-2"
          style={{
            backgroundColor: "#f8f9fa",
            borderRadius: "0 0 8px 8px",
            marginTop: "0",
            position: "sticky",
            bottom: 0,
            zIndex: 5,
          }}
        >
          <div style={{ fontSize: "0.875rem", color: "#6c757d" }}>
            Showing <strong>{getDisplayedData(products).length}</strong> of{" "}
            <strong>{totalRecords}</strong> products
          </div>
          {hasMoreData(products) && (
            <div style={{ fontSize: "0.875rem", color: "#6c757d" }}>
              Scroll down to load more
            </div>
          )}
        </div>
      )}

      {/* Delete Product Modal */}
      {deleteModalOpen && productToDelete && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={closeDeleteModal}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-danger">Delete product</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeDeleteModal}
                  disabled={isDeleting}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <p className="mb-2">
                  Are you sure you want to delete{" "}
                  <strong>{productToDelete.product_name}</strong>?
                </p>
                {productToDelete.brand_name && (
                  <p className="small text-muted mb-0">
                    Brand: {productToDelete.brand_name}
                  </p>
                )}
                <p className="small text-muted mt-2 mb-0">
                  This removes all variants for this listing. This cannot be
                  undone.
                </p>
                {deleteError && (
                  <div className="alert alert-danger mt-3 mb-0" role="alert">
                    {deleteError}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeDeleteModal}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger d-inline-flex align-items-center gap-2"
                  onClick={confirmDeleteProduct}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backfill Suffixes Modal */}
      {backfillModalOpen && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={closeBackfillModal}
        >
          <div
            className="modal-dialog modal-dialog-centered modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title d-flex align-items-center gap-2">
                  <Icon icon="lucide:database" width="18" height="18" />
                  Backfill product catalog
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeBackfillModal}
                  disabled={isBackfilling}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                {backfillResult ? (
                  <>
                    <div className="alert alert-success mb-0" role="alert">
                      Backfill finished for{" "}
                      <strong>
                        {backfillResult.summary?.brands_succeeded ?? 0}
                      </strong>{" "}
                      of{" "}
                      <strong>
                        {backfillResult.summary?.brands_requested ?? 0}
                      </strong>{" "}
                      brand(s).
                    </div>
                    {Array.isArray(backfillResult.brands) &&
                      backfillResult.brands.length > 0 && (
                        <div className="table-responsive mt-3">
                          <table className="table table-sm table-bordered mb-0">
                            <thead className="table-light">
                              <tr>
                                <th>Brand</th>
                                <th>Status</th>
                                <th>Products</th>
                                <th>Variants</th>
                              </tr>
                            </thead>
                            <tbody>
                              {backfillResult.brands.map((row) => (
                                <tr key={row.brand_id}>
                                  <td>{row.brand_name}</td>
                                  <td>
                                    {row.success ? (
                                      <span className="text-success">OK</span>
                                    ) : (
                                      <span
                                        className="text-danger"
                                        title={row.error}
                                      >
                                        Failed
                                      </span>
                                    )}
                                  </td>
                                  <td>
                                    {row.success
                                      ? `${row.products?.inserted ?? 0} new, ${
                                          row.products?.updated ?? 0
                                        } updated`
                                      : row.error || "—"}
                                  </td>
                                  <td>
                                    {row.success
                                      ? `${row.variants?.inserted ?? 0} new, ${
                                          row.variants?.updated ?? 0
                                        } updated`
                                      : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                  </>
                ) : (
                  <>
                    <p className="text-muted small mb-3">
                      Select one or more brands. For each store, active Shopify
                      products are imported into product master and product
                      variants (brand_id and cross-brand SKU suffixes per V3).
                    </p>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <label className="form-label mb-0">
                        Brands <span className="text-danger">*</span>
                      </label>
                      <div className="btn-group btn-group-sm">
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={selectAllBackfillBrands}
                          disabled={isBackfilling || brands.length === 0}
                        >
                          Select all
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={clearBackfillBrands}
                          disabled={isBackfilling}
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <div
                      className="border rounded p-3"
                      style={{ maxHeight: "240px", overflowY: "auto" }}
                    >
                      {brands.map((brand) => {
                        const id = String(brand.brand_id);
                        const checked = backfillBrandIds.includes(id);
                        return (
                          <label
                            key={brand.brand_id}
                            className={`d-flex align-items-center gap-2 py-2 px-2 rounded mb-1 ${
                              checked ? "bg-primary-subtle" : ""
                            }`}
                            style={{ cursor: "pointer" }}
                          >
                            <input
                              type="checkbox"
                              className="form-check-input mt-0"
                              checked={checked}
                              disabled={isBackfilling}
                              onChange={() => toggleBackfillBrand(id)}
                            />
                            <span>{brand.brand_name}</span>
                          </label>
                        );
                      })}
                    </div>
                    {backfillBrandIds.length > 0 && (
                      <p className="small text-muted mt-2 mb-0">
                        {backfillBrandIds.length} brand(s) selected.
                      </p>
                    )}
                  </>
                )}
                {backfillError && (
                  <div className="alert alert-danger mt-3 mb-0" role="alert">
                    {backfillError}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                {backfillResult ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={closeBackfillModal}
                  >
                    Done
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={closeBackfillModal}
                      disabled={isBackfilling}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary d-inline-flex align-items-center gap-2"
                      onClick={confirmBackfillCatalog}
                      disabled={isBackfilling || brands.length === 0}
                    >
                      {isBackfilling ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm"
                            role="status"
                            aria-hidden="true"
                          ></span>
                          Backfilling...
                        </>
                      ) : (
                        <>
                          <Icon icon="lucide:download" width="16" height="16" />
                          Start backfill
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sync from Shopify Modal */}
      {syncModalOpen && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={closeSyncModal}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title d-flex align-items-center gap-2">
                  <Icon icon="lucide:refresh-cw" width="18" height="18" />
                  Sync products from Shopify
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeSyncModal}
                  disabled={isSyncing}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                {syncResult ? (
                  <div>
                    <div className="alert alert-success mb-3" role="alert">
                      <strong>Sync completed</strong> for{" "}
                      {getSyncBrandLabel(syncBrandId)}.
                    </div>
                    <div className="row g-3">
                      <div className="col-6">
                        <div className="border rounded p-3 h-100 bg-body-tertiary">
                          <div className="small text-muted mb-1">Products</div>
                          <div className="fw-semibold">
                            {syncResult.products?.inserted ?? 0} inserted
                          </div>
                          <div className="text-secondary small">
                            {syncResult.products?.updated ?? 0} updated
                          </div>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="border rounded p-3 h-100 bg-body-tertiary">
                          <div className="small text-muted mb-1">Variants</div>
                          <div className="fw-semibold">
                            {syncResult.variants?.inserted ?? 0} inserted
                          </div>
                          <div className="text-secondary small">
                            {syncResult.variants?.updated ?? 0} updated
                          </div>
                        </div>
                      </div>
                    </div>
                    {(syncResult.products?.errors?.length > 0 ||
                      syncResult.variants?.errors?.length > 0) && (
                      <div className="alert alert-warning mt-3 mb-0 small">
                        Some items had errors during sync. Check server logs for
                        details.
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="text-muted small mb-3">
                      Choose which brand store to pull active products from.
                      Products are saved under that brand with SKU suffixes
                      computed automatically.
                    </p>
                    <label className="form-label">
                      Brand <span className="text-danger">*</span>
                    </label>
                    <select
                      className={`form-select ${
                        syncModalError && !syncBrandId ? "is-invalid" : ""
                      }`}
                      value={syncBrandId}
                      onChange={(e) => {
                        setSyncBrandId(e.target.value);
                        if (syncModalError) setSyncModalError("");
                      }}
                      disabled={isSyncing}
                    >
                      <option value="">Select brand</option>
                      {brands.map((brand) => (
                        <option
                          key={brand.brand_id}
                          value={String(brand.brand_id)}
                        >
                          {brand.brand_name}
                        </option>
                      ))}
                    </select>
                    {syncBrandId && (
                      <p className="small text-muted mt-2 mb-0">
                        Fetching from{" "}
                        <strong>{getSyncBrandLabel(syncBrandId)}</strong>{" "}
                        Shopify store.
                      </p>
                    )}
                  </>
                )}
                {syncModalError && (
                  <div className="alert alert-danger mt-3 mb-0" role="alert">
                    {syncModalError}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                {syncResult ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={closeSyncModal}
                  >
                    Done
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={closeSyncModal}
                      disabled={isSyncing}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary d-inline-flex align-items-center gap-2"
                      onClick={handleConfirmSync}
                      disabled={isSyncing || brands.length === 0}
                    >
                      {isSyncing ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm"
                            role="status"
                            aria-hidden="true"
                          ></span>
                          Syncing...
                        </>
                      ) : (
                        <>
                          <Icon icon="lucide:download" width="16" height="16" />
                          Start sync
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {modalOpen && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {isEditMode ? "Edit Product" : "Add New Product"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleModalClose}
                ></button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleSubmit}>
                  {/* General Error Message */}
                  {formErrors.general && (
                    <div className="alert alert-danger" role="alert">
                      {formErrors.general}
                    </div>
                  )}

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">
                        Brand <span className="text-danger">*</span>
                      </label>
                      <select
                        className={`form-select ${
                          formErrors.brandId ? "is-invalid" : ""
                        }`}
                        name="brandId"
                        value={formData.brandId}
                        onChange={handleInputChange}
                        required
                        disabled={isEditMode}
                      >
                        <option value="">Select brand</option>
                        {brands.map((brand) => (
                          <option
                            key={brand.brand_id}
                            value={String(brand.brand_id)}
                          >
                            {brand.brand_name}
                          </option>
                        ))}
                      </select>
                      {formErrors.brandId && (
                        <div className="invalid-feedback d-block">
                          {formErrors.brandId}
                        </div>
                      )}
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">
                        Product Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${
                          formErrors.productName ? "is-invalid" : ""
                        }`}
                        name="productName"
                        value={formData.productName}
                        onChange={handleInputChange}
                        required
                      />
                      {formErrors.productName && (
                        <div className="invalid-feedback d-block">
                          {formErrors.productName}
                        </div>
                      )}
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">HSN Code</label>
                      <input
                        type="text"
                        className={`form-control ${
                          formErrors.hsnCode ? "is-invalid" : ""
                        }`}
                        name="hsnCode"
                        value={formData.hsnCode}
                        onChange={handleInputChange}
                      />
                      {formErrors.hsnCode && (
                        <div className="invalid-feedback d-block">
                          {formErrors.hsnCode}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Common Name</label>
                      <input
                        type="text"
                        className={`form-control ${
                          formErrors.commonName ? "is-invalid" : ""
                        }`}
                        name="commonName"
                        value={formData.commonName}
                        onChange={handleInputChange}
                      />
                      {formErrors.commonName && (
                        <div className="invalid-feedback d-block">
                          {formErrors.commonName}
                        </div>
                      )}
                    </div>
                  </div>

                  {isEditMode && (
                    <div className="mb-3">
                      <label className="form-label">
                        <strong>Cross-brand variants</strong>
                      </label>
                      {suffixExpansionLoading ? (
                        <div className="small text-muted">
                          Loading linked SKUs…
                        </div>
                      ) : suffixExpansion?.variant_groups?.length > 0 ? (
                        <div className="border rounded bg-body-tertiary p-3 small">
                          {suffixExpansion.variant_groups.map((group) => (
                            <div
                              key={
                                group.sku_variant_suffix ||
                                group.variant_display_name
                              }
                              className="mb-3"
                            >
                              <div className="fw-semibold mb-1">
                                {group.variant_display_name ||
                                  group.sku_variant_suffix}
                                {group.sku_variant_suffix && (
                                  <span className="text-muted fw-normal">
                                    {" "}
                                    ({group.sku_variant_suffix})
                                  </span>
                                )}
                              </div>
                              <ul className="mb-0 ps-3">
                                {group.skus.map((row) => (
                                  <li key={row.variant_id}>
                                    <span className="text-muted">
                                      {row.brand_name || "Brand"}:
                                    </span>{" "}
                                    <code>{row.sku}</code>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="small text-muted mb-0">
                          No cross-brand suffix matches yet. Backfill catalog
                          for more brands or align SKUs to the V3 convention.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Variant Mode & Options */}
                  <div className="mb-3">
                    <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center gap-2 gap-lg-3 mb-3">
                      <label className="form-label mb-0">
                        <strong>Variants</strong>{" "}
                        <span className="text-danger">*</span>
                      </label>
                      <div className="btn-group btn-group-sm" role="group">
                        <input
                          type="radio"
                          className="btn-check"
                          name="variantMode"
                          id="variantModeDefault"
                          value="default"
                          checked={variantMode === "default"}
                          onChange={() => handleVariantModeChange("default")}
                        />
                        <label
                          className={`btn btn-outline-secondary px-3 ${
                            variantMode === "default"
                              ? "active text-primary border-primary"
                              : ""
                          }`}
                          htmlFor="variantModeDefault"
                        >
                          Single SKU
                        </label>
                        <input
                          type="radio"
                          className="btn-check"
                          name="variantMode"
                          id="variantModeCustom"
                          value="custom"
                          checked={variantMode === "custom"}
                          onChange={() => handleVariantModeChange("custom")}
                        />
                        <label
                          className={`btn btn-outline-secondary px-3 ${
                            variantMode === "custom"
                              ? "active text-primary border-primary"
                              : ""
                          }`}
                          htmlFor="variantModeCustom"
                        >
                          Multiple Variants
                        </label>
                      </div>
                    </div>

                    {variantMode === "custom" ? (
                      <div className="border rounded px-3 py-3 bg-body-tertiary">
                        <VariantOptionsManager
                          key={`custom-variant-options-${variantOptions.length}`}
                          onOptionsChange={handleVariantOptionsChange}
                          initialOptions={variantOptions}
                          hideHeader={true}
                        />
                      </div>
                    ) : (
                      <div className="bg-body-tertiary border rounded px-3 py-2 small text-muted">
                        Single SKU mode keeps one default option. Switch to
                        Multiple Variants to configure combinations.
                      </div>
                    )}
                  </div>

                  {/* Variants SKU Input */}
                  <div className="mb-3">
                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mb-2">
                      <label className="form-label mb-0">
                        {variantMode === "default" ? (
                          <>
                            SKU <span className="text-danger">*</span>
                          </>
                        ) : (
                          <>
                            Variants SKU <span className="text-danger">*</span>
                          </>
                        )}
                      </label>
                    </div>
                    <div className="border rounded px-3 py-3 bg-body-tertiary">
                      {variants.length === 0 && (
                        <div className="text-muted small">
                          {variantMode === "custom"
                            ? "Add variant options to generate SKUs."
                            : "Provide a SKU for this product."}
                        </div>
                      )}
                      {variants.map((variant, index) => (
                        <div
                          key={variant.id || `variant_${index}`}
                          className={
                            index === variants.length - 1 ? "" : "mb-3"
                          }
                        >
                          <label className="form-label small text-uppercase text-muted mb-1">
                            {variant.displayName ||
                              `${DEFAULT_VARIANT_TITLE} ${index + 1}`}
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={variant.sku || ""}
                            onChange={(e) =>
                              handleVariantChange(index, "sku", e.target.value)
                            }
                            placeholder={`Enter SKU for ${
                              variant.displayName ||
                              `${DEFAULT_VARIANT_TITLE} ${index + 1}`
                            }`}
                          />
                          {(variant.sku_product_suffix ||
                            variant.sku_variant_suffix) && (
                            <div className="small text-muted mt-1">
                              Product suffix:{" "}
                              <strong>
                                {variant.sku_product_suffix || "—"}
                              </strong>
                              {" · "}
                              Variant suffix:{" "}
                              <strong>
                                {variant.sku_variant_suffix || "—"}
                              </strong>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {formErrors.variants && (
                      <div className="invalid-feedback d-block">
                        {formErrors.variants}
                      </div>
                    )}
                  </div>

                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleModalClose}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                            aria-hidden="true"
                          ></span>
                          {isEditMode ? "Updating..." : "Saving..."}
                        </>
                      ) : isEditMode ? (
                        "Update Product"
                      ) : (
                        "Save Product"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductMasterLayer;
