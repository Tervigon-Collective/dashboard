"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import { Icon } from "@iconify/react";
import procurementApi from "@/services/procurementApi";
import VendorMasterList from "./VendorMasterList";
import VariantOptionsManager from "./VariantOptionsManager";
import VariantGroupDisplay from "./VariantGroupDisplay";
import {
  generateVariantCombinations,
  groupVariants,
} from "@/utils/variantCombinationGenerator";
import "@/styles/shopify-style.css";

const ProductForm = ({ mode = "add", productId = null }) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [errorMsg, setErrorMsg] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");

  const [newProduct, setNewProduct] = useState({
    product_name: "",
    product_category: "",
  });

  // NEW: Variant options (Color, Size, etc.) and their values
  const [variantOptions, setVariantOptions] = useState([]);

  // NEW: Generated variants from combinations
  const [variants, setVariants] = useState([]);

  const [vendors, setVendors] = useState([]);

  const [productImages, setProductImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState("");
  const [imageModalIsOpen, setImageModalIsOpen] = useState(false);

  // Load product data for editing
  useEffect(() => {
    if (mode === "edit" && productId) {
      loadProductForEdit();
    }
  }, [mode, productId]);

  const loadProductForEdit = async () => {
    try {
      setIsLoading(true);
      const response = await procurementApi.getProductById(productId);

      if (response.success && response.data) {
        const product = response.data;
        setNewProduct({
          product_name: product.product_name || "",
          product_category: product.product_category || "",
        });

        // Set variant data for editing
        if (product.variants && product.variants.length > 0) {
          setVariants(
            product.variants.map((variant, index) => {
              const variantType = variant.variant_type || {};
              const variantTypeKeys = Object.keys(variantType);

              // Create groupBy key for existing variants
              let groupBy = "Existing Variants";
              if (variantTypeKeys.length > 0) {
                // Use first variant type value as group key
                groupBy =
                  variantType[variantTypeKeys[0]] || "Existing Variants";
              } else {
                // If no variant type, group by variant ID or index
                groupBy = `Variant ${index + 1}`;
              }

              return {
                id: index + 1,
                variant_id: variant.variant_id, // Store the actual variant_id from database
                mrp: variant.mrp || "",
                cogs: variant.cogs || "",
                margin:
                  variant.mrp && variant.cogs
                    ? (variant.mrp - variant.cogs).toFixed(2)
                    : "",
                variant_type: variantType,
                quantity: variant.quantity || "",
                dimension_with_packing: variant.dimension_with_packing || "",
                dimension_without_packing:
                  variant.dimension_without_packing || "",
                sku: variant.sku || "",
                vendor_pricing: variant.vendor_pricing || [], // NEW: Load vendor pricing
                groupBy: groupBy, // Add groupBy for proper grouping
                displayName:
                  variantTypeKeys.length > 0
                    ? Object.values(variantType).join(" × ")
                    : `Variant ${index + 1}`, // Fallback display name
              };
            })
          );
        }

        // Set product images for editing
        if (product.images && product.images.length > 0) {
          // Store existing images for display and management
          setExistingImages(product.images);
        }

        // Set vendors data for editing
        if (product.vendors && product.vendors.length > 0) {
          setVendors(
            product.vendors.map((vendor, index) => ({
              id: index + 1,
              vendor_id: vendor.vendor_id, // Store the actual vendor_id from database
              vendor_name: vendor.vendor_name || "",
              common_name: vendor.common_name || "",
              manufactured_by: vendor.manufactured_by || "",
              manufacturing_date: vendor.manufacturing_date || "",
              vendor_status: vendor.vendor_status || "",
              imported_by: vendor.imported_by || "",
            }))
          );
        }
      }
    } catch (error) {
      console.error("Error loading product:", error);
      toast.error("Failed to load product data");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle product input changes
  const handleProductInputChange = (e) => {
    const { name, value } = e.target;
    setNewProduct((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Vendor Management (for VendorMasterList)
  const handleAddVendor = (newVendor) => {
    setVendors((prev) => [...prev, newVendor]);
    toast.success("Vendor added successfully");
  };

  const handleUpdateVendor = (vendorId, updatedData) => {
    setVendors((prev) =>
      prev.map((vendor) =>
        vendor.id === vendorId ? { ...vendor, ...updatedData } : vendor
      )
    );
    toast.success("Vendor updated successfully");
  };

  const handleRemoveVendor = (vendorId) => {
    // Check if vendor is used in any variant
    const isUsed = variants.some((variant) =>
      variant.vendor_pricing?.some((vp) => vp.vendor_id == vendorId)
    );

    if (isUsed) {
      toast.error(
        "This vendor is assigned to one or more variants. Please remove the assignments first."
      );
      return;
    }

    setVendors((prev) => prev.filter((vendor) => vendor.id !== vendorId));
    toast.success("Vendor removed successfully");
  };

  // Calculate product_price_category based on variant MRP averages
  const calculateProductPriceCategory = (variants) => {
    if (!variants || variants.length === 0) return "C"; // Default to C if no variants

    // Calculate average MRP
    const totalMRP = variants.reduce((sum, variant) => {
      const mrp = parseFloat(variant.mrp) || 0;
      return sum + mrp;
    }, 0);

    const averageMRP = totalMRP / variants.length;

    // Determine category based on average MRP
    if (averageMRP >= 1000) {
      return "A";
    } else if (averageMRP >= 700) {
      return "B";
    } else {
      return "C";
    }
  };

  // Handle variant options change (when user selects types and values)
  const handleVariantOptionsChange = (options) => {
    setVariantOptions(options);

    // In edit mode, preserve existing variants and add new combinations
    if (mode === "edit") {
      // If no options are selected, keep existing variants as they are
      if (!options || options.length === 0) {
        return; // Don't change existing variants
      }

      // Only generate variants if ALL selected options have values
      const allOptionsHaveValues = options.every(
        (opt) => opt.values && opt.values.length > 0
      );

      if (!allOptionsHaveValues) {
        console.log(
          "DEBUG: Not all options have values, skipping variant generation"
        );
        return; // Don't generate variants until all options have values
      }

      // Generate new variants from combinations
      console.log(
        "DEBUG: Options passed to generateVariantCombinations:",
        options
      );
      const generatedVariants = generateVariantCombinations(options);
      console.log("DEBUG: Generated variants:", generatedVariants);

      // Keep existing variants and add new ones
      console.log("DEBUG: Current variants before adding new ones:", variants);
      console.log("DEBUG: Generated variants:", generatedVariants);

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

      console.log(
        "DEBUG: New variants after filtering duplicates:",
        newVariants
      );
      console.log("DEBUG: Final variants to set:", [
        ...variants,
        ...newVariants,
      ]);

      setVariants([...variants, ...newVariants]);
    } else {
      // In add mode, just generate new variants
      const generatedVariants = generateVariantCombinations(options);
      setVariants(generatedVariants);
    }
  };

  // Handle single variant change
  const handleVariantChange = (updatedVariant) => {
    setVariants((prev) =>
      prev.map((v) => (v.id === updatedVariant.id ? updatedVariant : v))
    );
  };

  // Handle multiple variants change (bulk update)
  const handleVariantsChange = (updatedVariants) => {
    setVariants((prev) => {
      const updatedIds = updatedVariants.map((v) => v.id);
      const unchanged = prev.filter((v) => !updatedIds.includes(v.id));
      return [...unchanged, ...updatedVariants];
    });
  };

  // Handle product image upload
  const handleProductImageUpload = (e) => {
    const files = Array.from(e.target.files);

    // Validate file sizes
    const maxSize = 50 * 1024 * 1024; // 50MB limit
    const oversizedFiles = files.filter((file) => file.size > maxSize);

    if (oversizedFiles.length > 0) {
      toast.error(
        `Some files are too large. Maximum size is 50MB. Large files: ${oversizedFiles
          .map((f) => f.name)
          .join(", ")}`
      );
      return;
    }

    // Warn about large files
    const largeFiles = files.filter((file) => file.size > 10 * 1024 * 1024); // 10MB
    if (largeFiles.length > 0) {
      toast.warning(
        `Large files detected (${largeFiles.length} files). These may take longer to upload and view.`
      );
    }

    setProductImages((prev) => [...prev, ...files]);
  };

  // Remove product image
  const removeProductImage = (imageIndex) => {
    setProductImages((prev) => prev.filter((_, index) => index !== imageIndex));
  };

  // Delete existing image
  const deleteExistingImage = async (imageId) => {
    try {
      const response = await procurementApi.deleteImage(imageId);
      if (response.success) {
        setExistingImages((prev) =>
          prev.filter((img) => img.image_id !== imageId)
        );
        toast.success("Image deleted successfully");
      } else {
        toast.error("Failed to delete image");
      }
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error("Failed to delete image");
    }
  };

  // View existing image
  const handleViewImage = async (image) => {
    try {
      if (image.image_id) {
        const response = await procurementApi.getImageViewUrl(image.image_id);
        if (response.success) {
          setSelectedImageUrl(response.data.secureUrl);
          setImageModalIsOpen(true);
        } else {
          toast.error("Failed to load image");
        }
      } else if (image.image_url) {
        setSelectedImageUrl(image.image_url);
        setImageModalIsOpen(true);
      } else {
        toast.error("No image available");
      }
    } catch (error) {
      console.error("Error loading image:", error);
      toast.error("Failed to load image");
    }
  };

  // Handle image uploads to Azure
  const handleImageUploads = async (uploadUrls) => {
    console.log("🚀 Starting image upload process...");
    console.log("📋 Upload URLs received:", uploadUrls);

    setUploadProgress("Uploading images...");
    let successCount = 0;
    let failCount = 0;

    for (const uploadData of uploadUrls) {
      try {
        console.log("🔄 Processing upload data:", uploadData);

        const imageFile = getImageFileByIndex(uploadData.sortOrder);
        console.log("📁 Image file found:", imageFile);

        if (!imageFile) {
          console.warn(
            `❌ Image file not found for index ${uploadData.sortOrder}`
          );
          failCount++;
          continue;
        }

        console.log("🌐 Uploading to SAS URL:", uploadData.sasUrl);
        console.log("📤 File details:", {
          name: imageFile.name,
          type: imageFile.type,
          size: imageFile.size,
        });

        // Upload to Azure Blob Storage
        const uploadResponse = await fetch(uploadData.sasUrl, {
          method: "PUT",
          headers: {
            "x-ms-blob-type": "BlockBlob",
            "Content-Type": imageFile.type,
          },
          body: imageFile,
        });

        console.log("📡 Upload response:", {
          status: uploadResponse.status,
          statusText: uploadResponse.statusText,
          ok: uploadResponse.ok,
        });

        if (uploadResponse.ok) {
          console.log("✅ Upload successful, confirming in database...");
          // Confirm upload in database
          await procurementApi.confirmImageUpload(
            uploadData.imageId,
            uploadData.publicUrl
          );
          successCount++;
          console.log("✅ Database confirmation successful");
        } else {
          const errorText = await uploadResponse.text();
          console.error("❌ Azure upload failed:", {
            status: uploadResponse.status,
            statusText: uploadResponse.statusText,
            error: errorText,
          });
          failCount++;
        }
      } catch (error) {
        console.error("❌ Error uploading image:", error);
        failCount++;
      }
    }

    setUploadProgress("");
    if (successCount > 0) {
      toast.success(`${successCount} image(s) uploaded successfully!`);
    }
    if (failCount > 0) {
      toast.error(`${failCount} image(s) failed to upload`);
    }
  };

  // Helper function to get image file by global index
  const getImageFileByIndex = (globalIndex) => {
    return productImages[globalIndex] || null;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent multiple submissions
    if (isSubmitting) {
      console.log(
        "Form is already being submitted, ignoring duplicate submission"
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    const { product_name, product_category } = newProduct;

    // Basic validation
    if (!product_name || !product_category) {
      setErrorMsg("Product name and category are required.");
      setIsSubmitting(false);
      return;
    }

    // Validate variants - MRP and COGS are required
    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i];
      if (!variant.mrp || !variant.cogs) {
        setErrorMsg(`Variant ${i + 1}: MRP and COGS are required.`);
        setIsSubmitting(false);
        return;
      }
    }

    try {
      // Prepare variants data for API
      const variantsData = variants.map((variant) => ({
        ...(variant.variant_id && { variant_id: variant.variant_id }), // Include variant_id if it exists
        mrp: Number(variant.mrp),
        cogs: Number(variant.cogs),
        variant_type: variant.variant_type,
        quantity: Number(variant.quantity) || 0,
        dimension_with_packing: variant.dimension_with_packing,
        dimension_without_packing: variant.dimension_without_packing,
        sku: variant.sku,
        vendor_pricing: variant.vendor_pricing || [], // Include vendor assignments
      }));

      // Prepare image requests from selected product images
      const imageRequests = [];
      if (productImages && productImages.length > 0) {
        productImages.forEach((image, imageIndex) => {
          imageRequests.push({
            fileName: image.name,
            contentType: image.type,
            fileSize: image.size,
            altText: `${product_name} - Image ${imageIndex + 1}`,
            isPrimary: imageIndex === 0,
            sortOrder: imageIndex,
          });
        });
      }

      console.log("Image requests prepared:", imageRequests);
      console.log("Total images to upload:", imageRequests.length);

      // Calculate product_price_category based on variant MRP averages
      const productPriceCategory = calculateProductPriceCategory(variants);

      // Prepare vendors data - only include vendors with at least vendor_name
      const vendorsData = vendors
        .filter((vendor) => vendor.vendor_name && vendor.vendor_name.trim())
        .map((vendor) => {
          const vendorObj = {};
          if (vendor.vendor_id) vendorObj.vendor_id = vendor.vendor_id; // Include vendor_id for updates
          if (vendor.vendor_name) vendorObj.vendor_name = vendor.vendor_name;
          if (vendor.common_name) vendorObj.common_name = vendor.common_name;
          if (vendor.manufactured_by)
            vendorObj.manufactured_by = vendor.manufactured_by;
          if (vendor.manufacturing_date)
            vendorObj.manufacturing_date = vendor.manufacturing_date;
          if (vendor.vendor_status)
            vendorObj.vendor_status = vendor.vendor_status;
          if (vendor.imported_by) vendorObj.imported_by = vendor.imported_by;
          return vendorObj;
        });

      // Prepare data for API
      const productData = {
        product: {
          product_name: product_name,
          product_category: product_category,
          status: mode === "add" ? "pending" : newProduct.status, // Auto-set to "pending" for new products
          product_price_category: productPriceCategory, // Auto-calculated
        },
        variants: variantsData,
        vendors: vendorsData,
        imageRequests: imageRequests,
      };

      if (mode === "edit") {
        // Update existing product
        const updateData = {
          product: {
            product_name: product_name,
            product_category: product_category,
            status: newProduct.status,
            product_price_category: productPriceCategory, // Auto-calculated
          },
          variants: variantsData,
          vendors: vendorsData,
        };

        // Add image requests if there are new images to upload
        if (imageRequests.length > 0) {
          updateData.imageRequests = imageRequests;
        }

        const updateResponse = await procurementApi.updateProduct(
          productId,
          updateData
        );

        // Handle image uploads if there are any new images
        if (imageRequests.length > 0 && updateResponse.success) {
          console.log("🚀 Starting image upload process for update...");
          console.log(
            "📋 Upload URLs received:",
            updateResponse.data.uploadUrls
          );

          await handleImageUploads(updateResponse.data.uploadUrls);
        }

        toast.success("Product updated successfully!");
      } else {
        // Create new product
        const createResponse = await procurementApi.createProduct(productData);

        if (createResponse.success) {
          toast.success("Product created successfully!");

          // Handle image uploads if there are any
          console.log(
            "🔍 Checking for upload URLs:",
            createResponse.data?.uploadUrls
          );
          if (
            createResponse.data?.uploadUrls &&
            createResponse.data.uploadUrls.length > 0
          ) {
            console.log("✅ Upload URLs found, calling handleImageUploads...");
            await handleImageUploads(createResponse.data.uploadUrls);
          } else {
            console.log("❌ No upload URLs found in response");
          }
        }
      }

      // Navigate back to procurement list
      router.push("/procurement");
    } catch (error) {
      console.error("Error saving product:", error);
      setErrorMsg(error.message || "Failed to save product");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    router.push("/procurement");
  };

  if (isLoading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "400px" }}
      >
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="shopify-product-form">
      <div className="form-container">
        {/* Page Header with Back Button */}
        <div className="shopify-page-header d-flex justify-content-between align-items-center">
          <h4 className="shopify-heading-2 mb-0">
            {mode === "edit" ? "Edit Product" : "Add New Product"}
          </h4>
          <Link
            href="/procurement"
            className="btn btn-outline-secondary btn-sm"
          >
            <i className="icon-arrow-left me-2"></i>
            Back to Procurement
          </Link>
        </div>

        {errorMsg && (
          <div className="shopify-banner shopify-banner-warning">
            <Icon icon="mdi:alert-circle" width="18" />
            {errorMsg}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{
            opacity: isSubmitting ? 0.7 : 1,
            pointerEvents: isSubmitting ? "none" : "auto",
          }}
        >
          {/* Product Information Card */}
          <div className="shopify-card">
            <div className="shopify-card-header">
              <h5 className="shopify-heading-3">Product Information</h5>
            </div>
            <div className="shopify-card-body">
              <div className="shopify-form-grid shopify-form-grid-2">
                <div>
                  <label htmlFor="product_name" className="shopify-label">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    id="product_name"
                    name="product_name"
                    className="shopify-input"
                    value={newProduct.product_name}
                    onChange={handleProductInputChange}
                    required
                    placeholder="Enter product name"
                  />
                </div>
                <div>
                  <label htmlFor="product_category" className="shopify-label">
                    Product Category *
                  </label>
                  <input
                    type="text"
                    id="product_category"
                    name="product_category"
                    className="shopify-input"
                    value={newProduct.product_category}
                    onChange={handleProductInputChange}
                    required
                    placeholder="Enter product category"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Vendors Information - NEW: VendorMasterList */}
          <VendorMasterList
            vendors={vendors}
            onAddVendor={handleAddVendor}
            onUpdateVendor={handleUpdateVendor}
            onRemoveVendor={handleRemoveVendor}
          />

          {/* Variant Options Manager - NEW: Auto-generate variants */}
          <VariantOptionsManager
            onOptionsChange={handleVariantOptionsChange}
            initialOptions={variantOptions}
          />

          {/* Display Generated Variants in Collapsible Groups */}
          {variants.length > 0 && (
            <VariantGroupDisplay
              groupedVariants={groupVariants(variants)}
              vendors={vendors}
              onVariantChange={handleVariantChange}
              onVariantsChange={handleVariantsChange}
            />
          )}

          {/* Product Images Section */}
          <div className="shopify-card">
            <div className="shopify-card-header">
              <h5 className="shopify-heading-3">Product Images</h5>
              <p className="shopify-text-muted mb-0">
                Upload product images to showcase your product
              </p>
            </div>
            <div className="shopify-card-body">
              <div
                className="border border-2 border-dashed rounded p-4 text-center"
                style={{
                  borderColor: "#c9cccf",
                  backgroundColor: "#f6f6f7",
                }}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleProductImageUpload(e)}
                  className="d-none"
                  id="product-image-upload"
                />
                <label
                  htmlFor="product-image-upload"
                  className="shopify-btn shopify-btn-secondary mb-2"
                  style={{ cursor: "pointer" }}
                >
                  <Icon icon="mdi:cloud-upload" className="me-2" width="18" />
                  Choose Product Images
                </label>
                <p className="mb-0 shopify-text-small">
                  Supports: JPG, JPEG, PNG, WebP, GIF
                </p>
              </div>

              {/* Display existing images (edit mode) */}
              {mode === "edit" && existingImages.length > 0 && (
                <div className="mt-3">
                  <h6 className="shopify-text-muted mb-2">Existing Images:</h6>
                  <div className="row">
                    {existingImages.map((image) => (
                      <div key={image.image_id} className="col-md-3 mb-2">
                        <div
                          className="border rounded p-2"
                          style={{ borderColor: "#c9cccf" }}
                        >
                          <div className="d-flex justify-content-between align-items-start">
                            <div className="flex-grow-1">
                              <small className="shopify-text-small d-block">
                                {image.alt_text || `Image ${image.image_id}`}
                              </small>
                              <small className="shopify-text-small">
                                {image.is_primary && (
                                  <span className="shopify-badge me-1">
                                    Primary
                                  </span>
                                )}
                                ID: {image.image_id}
                              </small>
                            </div>
                            <div className="d-flex gap-1">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-info"
                                onClick={() => handleViewImage(image)}
                                title="View Image"
                              >
                                <Icon
                                  icon="lucide:eye"
                                  width="16"
                                  height="16"
                                />
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() =>
                                  deleteExistingImage(image.image_id)
                                }
                                title="Delete Image"
                              >
                                <Icon
                                  icon="lucide:trash-2"
                                  width="16"
                                  height="16"
                                />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Display selected images (new uploads) */}
              {productImages.length > 0 && (
                <div className="mt-3">
                  <h6 className="shopify-text-muted mb-2">
                    New Images to Upload:
                  </h6>
                  <div className="row">
                    {productImages.map((image, imageIndex) => (
                      <div key={imageIndex} className="col-md-3 mb-2">
                        <div
                          className="border rounded p-2"
                          style={{ borderColor: "#c9cccf" }}
                        >
                          <small className="shopify-text-small d-block">
                            {image.name}
                          </small>
                          <small className="shopify-text-small">
                            {(image.size / 1024 / 1024).toFixed(2)} MB
                            {image.size > 10 * 1024 * 1024 && (
                              <span className="text-warning ms-1">
                                <i className="icon-alert-triangle"></i> Large
                              </span>
                            )}
                          </small>
                          <button
                            type="button"
                            className="shopify-btn shopify-btn-danger mt-1 w-100"
                            onClick={() => removeProductImage(imageIndex)}
                            title="Remove Image"
                            style={{ fontSize: "12px", padding: "4px 8px" }}
                          >
                            <Icon
                              icon="lucide:trash-2"
                              width="14"
                              height="14"
                              className="me-1"
                            />
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Upload Progress */}
          {uploadProgress && (
            <div className="shopify-banner shopify-banner-info">
              <div className="d-flex align-items-center">
                <div
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                >
                  <span className="visually-hidden">Loading...</span>
                </div>
                {uploadProgress}
              </div>
              <div className="mt-2">
                <small className="shopify-text-small">
                  Large images may take several seconds to upload. Please do not
                  close this page.
                </small>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="shopify-actions-footer">
            <button
              type="button"
              className="shopify-btn shopify-btn-secondary"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="shopify-btn shopify-btn-primary"
              disabled={isSubmitting}
              style={{
                position: "relative",
                minWidth: "150px",
              }}
            >
              {isSubmitting ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  {mode === "edit"
                    ? "Updating..."
                    : productImages.length > 0
                    ? "Creating & Uploading..."
                    : "Creating..."}
                </>
              ) : mode === "edit" ? (
                "Update Product"
              ) : (
                "Create Product"
              )}
            </button>
          </div>
        </form>

        {/* Image View Modal */}
        {imageModalIsOpen && (
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">View Image</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setImageModalIsOpen(false)}
                  ></button>
                </div>
                <div className="modal-body text-center">
                  {selectedImageUrl ? (
                    <img
                      src={selectedImageUrl}
                      alt="Product Image"
                      className="img-fluid"
                      style={{ maxHeight: "70vh", maxWidth: "100%" }}
                      onError={(e) => {
                        console.error(
                          "Image failed to load:",
                          selectedImageUrl
                        );
                        e.target.style.display = "none";
                        const errorDiv = e.target.nextSibling;
                        if (errorDiv) errorDiv.style.display = "block";
                      }}
                    />
                  ) : (
                    <div className="alert alert-info">
                      <i className="icon-info me-2"></i>
                      No image available
                    </div>
                  )}
                  <div
                    style={{ display: "none" }}
                    className="alert alert-warning mt-3"
                  >
                    <i className="icon-alert-triangle me-2"></i>
                    This image failed to load. It might be too large or
                    corrupted.
                    <br />
                    <small>
                      Try refreshing the page or contact support if the issue
                      persists.
                    </small>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setImageModalIsOpen(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductForm;
