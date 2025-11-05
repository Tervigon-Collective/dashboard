"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Icon } from "@iconify/react";
import productMasterApi from "../services/productMasterApi";
import VariantOptionsManager from "./VariantOptionsManager";
import { generateVariantCombinations } from "../utils/variantCombinationGenerator";

const ProductMasterLayer = () => {
  const [products, setProducts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    productName: "",
    itemDescription: "",
    hsnCode: "",
  });
  // Variant management state
  const [variantOptions, setVariantOptions] = useState([]);
  const [variants, setVariants] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
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

  // Form validation errors
  const [formErrors, setFormErrors] = useState({});

  // Search, filter, and sort states
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [hsnCodeFilter, setHsnCodeFilter] = useState("all"); // all, with, without
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");

  // Debounce search term (industry best practice: 500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load products from API with server-side search, filters, and pagination
  const loadProducts = async (page = 1, resetPage = false, append = false) => {
    try {
      if (!append) {
        setIsLoading(true);
      }

      const targetPage = resetPage ? 1 : page;

      const options = {
        search: debouncedSearchTerm || undefined,
        hsnCodeFilter: hsnCodeFilter !== "all" ? hsnCodeFilter : undefined,
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
          setProducts((prev) => [...prev, ...(result.data || [])]);
        } else {
          setProducts(result.data || []);
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
    }
  };

  // Track initial mount
  const [isMounted, setIsMounted] = useState(false);
  const prevPageRef = useRef(1);
  const prevFiltersRef = useRef({
    search: "",
    filter: "all",
    sort: null,
    sortDir: "asc",
  });

  // Initial load on mount
  useEffect(() => {
    setIsMounted(true);
    loadProducts(1, false);
    prevPageRef.current = 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Single effect to handle all data loading
  useEffect(() => {
    if (!isMounted) return;

    const currentFilters = {
      search: debouncedSearchTerm,
      filter: hsnCodeFilter,
      sort: sortField,
      sortDir: sortDirection,
    };

    const prevFilters = prevFiltersRef.current;
    const prevPage = prevPageRef.current;

    // Check if filters changed
    const filtersChanged =
      prevFilters.search !== currentFilters.search ||
      prevFilters.filter !== currentFilters.filter ||
      prevFilters.sort !== currentFilters.sort ||
      prevFilters.sortDir !== currentFilters.sortDir;

    // Check if page changed
    const pageChanged = prevPage !== currentPage;

    // If filters changed, reset to page 1 and load
    if (filtersChanged) {
      prevFiltersRef.current = currentFilters;
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

    // If only page changed (not filters), load that page
    if (pageChanged && currentPage > 0) {
      prevPageRef.current = currentPage;
      loadProducts(currentPage, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isMounted,
    debouncedSearchTerm,
    hsnCodeFilter,
    sortField,
    sortDirection,
    currentPage,
  ]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setHsnCodeFilter("all");
    setSortField(null);
    setSortDirection("asc");
    setCurrentPage(1);
    setDisplayedItemsCount(20);
  };

  // Get displayed data for infinite scroll
  const getDisplayedData = (dataArray) => {
    return dataArray.slice(0, displayedItemsCount);
  };

  // Check if there's more data to load
  const hasMoreData = useCallback((dataArray) => {
    return displayedItemsCount < dataArray.length || currentPage < totalPages;
  }, [displayedItemsCount, currentPage, totalPages]);

  // Load more data callback
  const loadMoreData = useCallback(async () => {
    if (isLoadingMore || isLoading) return;
    
    setIsLoadingMore(true);
    // Simulate loading delay for skeleton effect
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if we need to fetch more from API
    if (displayedItemsCount >= products.length && currentPage < totalPages) {
      await loadProducts(currentPage + 1, false, true);
    }
    
    setDisplayedItemsCount(prev => prev + itemsPerPage);
    setIsLoadingMore(false);
  }, [isLoadingMore, isLoading, displayedItemsCount, products.length, currentPage, totalPages, itemsPerPage, loadProducts]);

  // Reset displayed items when search term or filters change
  useEffect(() => {
    setDisplayedItemsCount(20);
  }, [debouncedSearchTerm, hsnCodeFilter, sortField, sortDirection]);

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
          behavior: 'auto'
        });
      } else if (e.deltaY < 0 && isAtTop) {
        window.scrollBy({
          top: e.deltaY,
          behavior: 'auto'
        });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: true });
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Handle column sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

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
            item_description: "itemDescription",
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

  // Handle variant change (for SKU input)
  const handleVariantChange = (index, field, value) => {
    const updatedVariants = [...variants];
    updatedVariants[index] = {
      ...updatedVariants[index],
      [field]: value,
    };
    setVariants(updatedVariants);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const apiData = {
        product_name: formData.productName,
        item_description: formData.itemDescription || null,
        hsn_code: formData.hsnCode?.trim() || null,
      };

      // Include variants data if there are variants
      if (variants && variants.length > 0) {
        apiData.variants = variants.map((variant) => ({
          ...(variant.variant_id && { variant_id: variant.variant_id }), // Include if exists
          variant_type: variant.variant_type,
          variant_display_name: variant.displayName,
          sku: variant.sku,
        }));
      }

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
          itemDescription: "",
          hsnCode: "",
        });
        setFormErrors({});

        setModalOpen(false);
        setIsEditMode(false);
        setEditingProduct(null);
        setVariantOptions([]);
        setVariants([]);

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
    setVariants([]);
    setFormErrors({});
    setFormData({
      productName: "",
      itemDescription: "",
      hsnCode: "",
    });
  };

  const handleEditProduct = async (product) => {
    setEditingProduct(product);
    setIsEditMode(true);
    setFormErrors({});
    setFormData({
      productName: product.product_name,
      itemDescription: product.item_description || "",
      hsnCode: product.hsn_code || "",
    });

    // Load full product data with variants if not already loaded
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

    // Set variants for editing
    if (
      productWithVariants.variants &&
      productWithVariants.variants.length > 0
    ) {
      setVariants(
        productWithVariants.variants.map((variant, index) => {
          const variantType = variant.variant_type || {};
          const variantTypeKeys = Object.keys(variantType);

          return {
            id: `edit_variant_${index}`,
            variant_id: variant.variant_id,
            variant_type: variantType,
            displayName:
              variantTypeKeys.length > 0
                ? Object.values(variantType).join(" × ")
                : `Variant ${index + 1}`,
            sku: variant.sku || "",
          };
        })
      );

      // Extract variant options from existing variants
      const optionTypes = {};
      productWithVariants.variants.forEach((variant) => {
        if (variant.variant_type) {
          Object.keys(variant.variant_type).forEach((key) => {
            if (!optionTypes[key]) {
              optionTypes[key] = new Set();
            }
          });
        }
      });

      if (Object.keys(optionTypes).length > 0) {
        const options = Object.keys(optionTypes).map((type) => ({
          id: `option_${type}`,
          type: type,
          label: type.charAt(0).toUpperCase() + type.slice(1),
          icon: "mdi:tag",
          values: [],
        }));

        // Extract values for each option type
        productWithVariants.variants.forEach((variant) => {
          if (variant.variant_type) {
            Object.keys(variant.variant_type).forEach((type) => {
              const option = options.find((opt) => opt.type === type);
              if (option && variant.variant_type[type]) {
                if (!option.values.includes(variant.variant_type[type])) {
                  option.values.push(variant.variant_type[type]);
                }
              }
            });
          }
        });

        setVariantOptions(options);
      }
    } else {
      setVariantOptions([]);
      setVariants([]);
    }

    setModalOpen(true);
  };

  const handleDeleteProduct = async (product) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${product.product_name}"?`
      )
    ) {
      try {
        const result = await productMasterApi.deleteProduct(product.product_id);

        if (result.success) {
          // Reload products list to show updated data
          await loadProducts(currentPage);
          console.log("Product deleted successfully:", result.data);
        } else {
          console.error("API Error:", result.message);
          if (result.validationErrors && result.validationErrors.length > 0) {
            alert(`Validation Error:\n${result.validationErrors.join("\n")}`);
          } else {
            alert(`Error: ${result.message}`);
          }
        }
      } catch (error) {
        console.error("Error deleting product:", error);
        if (error.result) {
          alert(`Error: ${error.result.message || error.message}`);
        } else {
          alert(
            `Error: ${
              error.message || "Failed to delete product. Please try again."
            }`
          );
        }
      }
    }
  };

  // Handle sync products from Shopify
  const handleSyncProducts = async () => {
    if (
      window.confirm(
        "This will sync all active products from Shopify to your database. Do you want to continue?"
      )
    ) {
      try {
        setIsSyncing(true);
        const result = await productMasterApi.syncProducts();

        if (result.success) {
          const { data } = result;
          const message = `Sync completed successfully!\n\nProducts: ${data.products.inserted} inserted, ${data.products.updated} updated\nVariants: ${data.variants.inserted} inserted, ${data.variants.updated} updated`;
          alert(message);

          // Reload products list to show synced data with current filters
          await loadProducts(currentPage, false);
        } else {
          console.error("API Error:", result.message);
          alert(
            `Error: ${
              result.message || result.error || "Failed to sync products"
            }`
          );
        }
      } catch (error) {
        console.error("Error syncing products:", error);
        alert("Failed to sync products. Please try again.");
      } finally {
        setIsSyncing(false);
      }
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

        {/* Filter Dropdown */}
        <select
          className="form-select form-select-sm"
          value={hsnCodeFilter}
          onChange={(e) => setHsnCodeFilter(e.target.value)}
          style={{
            height: "36px",
            width: "auto",
            minWidth: "150px",
            fontSize: "0.875rem",
          }}
        >
          <option value="all">All HSN Codes</option>
          <option value="with">With HSN Code</option>
          <option value="without">Without HSN Code</option>
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
          Showing {products.length} of {totalRecords} products
        </span>

        {/* Sync Button */}
        <button
          onClick={handleSyncProducts}
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
              <span className="d-none d-sm-inline">Syncing...</span>
              <span className="d-sm-none">Syncing...</span>
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
          onClick={() => {
            setFormErrors({});
            setModalOpen(true);
          }}
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
              behavior: 'auto'
            });
          } else if (e.deltaY < 0 && isAtTop) {
            window.scrollBy({
              top: e.deltaY,
              behavior: 'auto'
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
              <th scope="col">Item Description</th>
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
                    {Array.from({ length: 5 }).map((_, colIndex) => (
                      <td key={`skeleton-${rowIndex}-${colIndex}`}>
                        <div
                          className="skeleton"
                          style={{
                            height: "20px",
                            backgroundColor: "#e5e7eb",
                            borderRadius: "4px",
                            animation: "skeletonPulse 1.5s ease-in-out infinite",
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-4 text-muted">
                  <div className="d-flex flex-column align-items-center">
                    <p className="text-muted mb-0">
                      {searchTerm || hsnCodeFilter !== "all"
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
                      <span className="text-secondary-light">
                        {index + 1}
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
                      <span
                        className="text-secondary-light text-truncate d-inline-block"
                        style={{ maxWidth: "200px" }}
                        title={product.item_description}
                      >
                        {product.item_description || "-"}
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
                          onClick={() => handleDeleteProduct(product)}
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
                        {Array.from({ length: 5 }).map((_, colIndex) => (
                          <td key={`skeleton-more-${rowIndex}-${colIndex}`}>
                            <div
                              className="skeleton"
                              style={{
                                height: "20px",
                                backgroundColor: "#e5e7eb",
                                borderRadius: "4px",
                                animation: "skeletonPulse 1.5s ease-in-out infinite",
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

                  <div className="mb-3">
                    <label className="form-label">Item Description</label>
                    <textarea
                      className={`form-control ${
                        formErrors.itemDescription ? "is-invalid" : ""
                      }`}
                      name="itemDescription"
                      rows="3"
                      value={formData.itemDescription}
                      onChange={handleInputChange}
                      placeholder="Enter product description..."
                    />
                    {formErrors.itemDescription && (
                      <div className="invalid-feedback d-block">
                        {formErrors.itemDescription}
                      </div>
                    )}
                  </div>

                  {/* Variant Options Manager */}
                  <div className="mb-3">
                    <label className="form-label">
                      <strong>Variant Options</strong>
                    </label>
                    <VariantOptionsManager
                      onOptionsChange={handleVariantOptionsChange}
                      initialOptions={variantOptions}
                      hideHeader={true}
                    />
                  </div>

                  {/* Variants SKU Input */}
                  {variants.length > 0 && (
                    <div className="mb-3">
                      <label className="form-label">Variants SKU</label>
                      <div
                        className="border rounded p-3"
                        style={{ backgroundColor: "#f8f9fa" }}
                      >
                        {variants.map((variant, index) => (
                          <div key={variant.id} className="mb-2">
                            <label className="form-label small">
                              {variant.displayName}
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              value={variant.sku || ""}
                              onChange={(e) =>
                                handleVariantChange(
                                  index,
                                  "sku",
                                  e.target.value
                                )
                              }
                              placeholder={`Enter SKU for ${variant.displayName}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
