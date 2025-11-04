"use client";
import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import Breadcrumb from "../../../components/Breadcrumb";
import MasterLayout from "../../../masterLayout/MasterLayout";
import SidebarPermissionGuard from "../../../components/SidebarPermissionGuard";
import Link from "next/link";
import productMasterApi from "../../../services/productMasterApi";
import VariantOptionsManager from "../../../components/VariantOptionsManager";
import { generateVariantCombinations } from "../../../utils/variantCombinationGenerator";

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

  // Load products from API
  const loadProducts = async (page = 1) => {
    try {
      setIsLoading(true);
      const result = await productMasterApi.getAllProducts(page, 20);

      if (result.success) {
        setProducts(result.data);
        setCurrentPage(result.pagination.page);
        setTotalPages(result.pagination.totalPages);
        setTotalRecords(result.pagination.total);
      } else {
        console.error("Failed to load products:", result.message);
      }
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load products on component mount
  useEffect(() => {
    loadProducts();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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
        item_description: formData.itemDescription,
        hsn_code: formData.hsnCode,
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

        setModalOpen(false);
        setIsEditMode(false);
        setEditingProduct(null);
        setVariantOptions([]);
        setVariants([]);

        // Reload products list to show updated data
        await loadProducts(currentPage);

        console.log(
          isEditMode
            ? "Product updated successfully:"
            : "Product added successfully:",
          result.data
        );
      } else {
        console.error("API Error:", result.message);
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error("Error adding product:", error);
      alert("Failed to add product. Please try again.");
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
    setFormData({
      productName: "",
      itemDescription: "",
      hsnCode: "",
    });
  };

  const handleEditProduct = async (product) => {
    setEditingProduct(product);
    setIsEditMode(true);
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
          alert(`Error: ${result.message}`);
        }
      } catch (error) {
        console.error("Error deleting product:", error);
        alert("Failed to delete product. Please try again.");
      }
    }
  };

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

          // Reload products list to show synced data
          await loadProducts(currentPage);
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
    <div className="card h-100 radius-8 border">
      <div className="card-body p-24">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-20">
          <div className="d-flex align-items-center">
            <h6 className="mb-0 me-2">Product Master</h6>
          </div>
          <div className="d-flex gap-2">
            <button
              onClick={handleSyncProducts}
              className="btn btn-outline-primary d-inline-flex align-items-center"
              style={{ gap: "6px", padding: "8px 16px" }}
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
                  <Icon icon="lucide:refresh-cw" width="18" height="18" />
                  <span className="d-none d-sm-inline">Sync Product</span>
                  <span className="d-sm-none">Sync</span>
                </>
              )}
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="btn btn-primary d-inline-flex align-items-center"
              style={{ gap: "6px", padding: "8px 16px" }}
            >
              <Icon icon="lucide:plus" width="18" height="18" />
              <span className="d-none d-sm-inline">Add New Product</span>
              <span className="d-sm-none">Add</span>
            </button>
          </div>
        </div>

        {/* Products List */}
        <div className="table-responsive">
          <table
            className="table mb-0"
            style={{ borderCollapse: "separate", borderSpacing: 0 }}
          >
            <thead style={{ backgroundColor: "#f8f9fa" }}>
              <tr>
                <th
                  style={{
                    border: "none",
                    padding: "12px 16px",
                    fontWeight: "600",
                    color: "#495057",
                  }}
                >
                  #
                </th>
                <th
                  style={{
                    border: "none",
                    padding: "12px 16px",
                    fontWeight: "600",
                    color: "#495057",
                  }}
                >
                  Product Name
                </th>
                <th
                  style={{
                    border: "none",
                    padding: "12px 16px",
                    fontWeight: "600",
                    color: "#495057",
                  }}
                >
                  HSN Code
                </th>
                <th
                  style={{
                    border: "none",
                    padding: "12px 16px",
                    fontWeight: "600",
                    color: "#495057",
                  }}
                >
                  Item Description
                </th>
                <th
                  style={{
                    border: "none",
                    padding: "12px 16px",
                    fontWeight: "600",
                    color: "#495057",
                  }}
                >
                  Operate
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="text-center py-4">
                    <div className="d-flex justify-content-center align-items-center">
                      <div
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                      >
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      Loading products...
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-4 text-muted">
                    <div className="d-flex flex-column align-items-center">
                      <Icon
                        icon="mdi:package-variant-outline"
                        width="48"
                        height="48"
                        className="text-muted mb-2"
                      />
                      No products found. Click "Add New Product" to get started.
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((product, index) => (
                  <tr
                    key={product.product_id}
                    style={{ borderBottom: "1px solid #e9ecef" }}
                  >
                    <td
                      style={{
                        border: "none",
                        padding: "12px 16px",
                        color: "#495057",
                      }}
                    >
                      {index + 1}
                    </td>
                    <td
                      style={{
                        border: "none",
                        padding: "12px 16px",
                        color: "#495057",
                      }}
                    >
                      <div className="d-flex align-items-center">
                        <Icon
                          icon="mdi:package-variant"
                          className="me-2 text-primary"
                          width="16"
                          height="16"
                        />
                        <span className="fw-medium">
                          {product.product_name}
                        </span>
                      </div>
                    </td>
                    <td
                      style={{
                        border: "none",
                        padding: "12px 16px",
                        color: "#495057",
                      }}
                    >
                      {product.hsn_code || "-"}
                    </td>
                    <td
                      style={{
                        border: "none",
                        padding: "12px 16px",
                        color: "#495057",
                      }}
                    >
                      <span
                        className="text-truncate d-inline-block"
                        style={{ maxWidth: "200px" }}
                        title={product.item_description}
                      >
                        {product.item_description || "-"}
                      </span>
                    </td>
                    <td
                      style={{
                        border: "none",
                        padding: "12px 16px",
                        color: "#495057",
                      }}
                    >
                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-sm"
                          style={{
                            border: "none",
                            background: "none",
                            padding: "4px",
                            color: "#495057",
                          }}
                          title="Edit"
                          onClick={() => handleEditProduct(product)}
                        >
                          <Icon icon="mdi:pencil" width="16" height="16" />
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{
                            border: "none",
                            background: "none",
                            padding: "4px",
                            color: "#dc3545",
                          }}
                          title="Delete"
                          onClick={() => handleDeleteProduct(product)}
                        >
                          <Icon icon="mdi:delete" width="16" height="16" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalRecords > 0 && (
          <div
            className="d-flex justify-content-between align-items-center px-3 py-2"
            style={{
              backgroundColor: "#f8f9fa",
              borderRadius: "0 0 8px 8px",
              marginTop: "0",
            }}
          >
            <div className="d-flex align-items-center gap-2">
              <button
                className="btn btn-sm"
                style={{ border: "none", background: "none", color: "#495057" }}
                onClick={() => loadProducts(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <Icon icon="mdi:chevron-left" width="16" height="16" />
              </button>

              {/* Page Numbers */}
              <div className="d-flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      className="btn btn-sm"
                      style={{
                        border: "none",
                        background:
                          pageNum === currentPage ? "#6f42c1" : "transparent",
                        color: pageNum === currentPage ? "white" : "#495057",
                        borderRadius: "4px",
                        padding: "4px 8px",
                        minWidth: "32px",
                      }}
                      onClick={() => loadProducts(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                {totalPages > 5 && (
                  <>
                    <span className="px-2" style={{ color: "#495057" }}>
                      ...
                    </span>
                    <button
                      className="btn btn-sm"
                      style={{
                        border: "none",
                        background:
                          totalPages === currentPage
                            ? "#6f42c1"
                            : "transparent",
                        color: totalPages === currentPage ? "white" : "#495057",
                        borderRadius: "4px",
                        padding: "4px 8px",
                        minWidth: "32px",
                      }}
                      onClick={() => loadProducts(totalPages)}
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>

              <button
                className="btn btn-sm"
                style={{ border: "none", background: "none", color: "#495057" }}
                onClick={() => loadProducts(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <Icon icon="mdi:chevron-right" width="16" height="16" />
              </button>
            </div>

            <div className="d-flex align-items-center gap-3">
              <div className="d-flex align-items-center gap-2">
                <span style={{ color: "#495057", fontSize: "0.875rem" }}>
                  20/page
                </span>
                <Icon
                  icon="mdi:chevron-down"
                  width="16"
                  height="16"
                  style={{ color: "#495057" }}
                />
              </div>
              <span style={{ color: "#495057", fontSize: "0.875rem" }}>
                Total {totalRecords} record{totalRecords !== 1 ? "s" : ""}
              </span>
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
                    <Icon icon="mdi:package-variant" className="me-2" />
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
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">
                          Product Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="productName"
                          value={formData.productName}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">HSN Code</label>
                        <input
                          type="text"
                          className="form-control"
                          name="hsnCode"
                          value={formData.hsnCode}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Item Description</label>
                      <textarea
                        className="form-control"
                        name="itemDescription"
                        rows="3"
                        value={formData.itemDescription}
                        onChange={handleInputChange}
                        placeholder="Enter product description..."
                      />
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
    </div>
  );
};

const ProductMasterPage = () => {
  return (
    <>
      <SidebarPermissionGuard requiredSidebar="masters">
        {/* MasterLayout */}
        <MasterLayout>
          {/* Breadcrumb */}
          <Breadcrumb title="Components / Manage Masters / Product Master" />

          {/* ProductMasterLayer */}
          <ProductMasterLayer />
        </MasterLayout>
      </SidebarPermissionGuard>
    </>
  );
};

export default ProductMasterPage;
