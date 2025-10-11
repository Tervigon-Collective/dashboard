"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Icon } from "@iconify/react";
import procurementApi from "@/services/procurementApi";
import VariantTypeManager from "./VariantTypeManager";

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

  const [variants, setVariants] = useState([
    {
      id: 1,
      mrp: "",
      cogs: "",
      margin: "",
      variant_type: {},
      quantity: "",
      dimension_with_packing: "",
      dimension_without_packing: "",
      sku: "",
      images: [],
    },
  ]);

  const [vendors, setVendors] = useState([
    {
      id: 1,
      vendor_name: "",
      common_name: "",
      manufactured_by: "",
      manufacturing_date: "",
      vendor_status: "",
      imported_by: "",
    },
  ]);

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
            product.variants.map((variant, index) => ({
              id: index + 1,
              variant_id: variant.variant_id, // Store the actual variant_id from database
              mrp: variant.mrp || "",
              cogs: variant.cogs || "",
              margin:
                variant.mrp && variant.cogs
                  ? (variant.mrp - variant.cogs).toFixed(2)
                  : "",
              variant_type: variant.variant_type || {},
              quantity: variant.quantity || "",
              dimension_with_packing: variant.dimension_with_packing || "",
              dimension_without_packing:
                variant.dimension_without_packing || "",
              sku: variant.sku || "",
            }))
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

  // Handle vendor input changes
  const handleVendorInputChange = (vendorId, e) => {
    const { name, value } = e.target;
    setVendors((prevVendors) =>
      prevVendors.map((vendor) =>
        vendor.id === vendorId ? { ...vendor, [name]: value } : vendor
      )
    );
  };

  // Add new vendor
  const addVendor = () => {
    const newId = Math.max(...vendors.map((v) => v.id), 0) + 1;
    setVendors([
      ...vendors,
      {
        id: newId,
        vendor_name: "",
        common_name: "",
        manufactured_by: "",
        manufacturing_date: "",
        vendor_status: "",
        imported_by: "",
      },
    ]);
  };

  // Remove vendor
  const removeVendor = (vendorId) => {
    if (vendors.length > 1) {
      setVendors(vendors.filter((vendor) => vendor.id !== vendorId));
    }
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

  // Handle variant input changes
  const handleVariantInputChange = (variantIndex, e) => {
    const { name, value } = e.target;
    setVariants((prev) => {
      const updatedVariants = [...prev];
      const variant = { ...updatedVariants[variantIndex] };

      if (name === "mrp" || name === "cogs") {
        variant[name] = value;
        if (variant.mrp && variant.cogs) {
          variant.margin = (Number(variant.mrp) - Number(variant.cogs)).toFixed(
            2
          );
        }
      } else {
        variant[name] = value;
      }

      updatedVariants[variantIndex] = variant;
      return updatedVariants;
    });
  };

  // Add new variant
  const addVariant = () => {
    const newVariant = {
      id: Date.now(),
      mrp: "",
      cogs: "",
      margin: "",
      variant_type: {},
      quantity: "",
      dimension_with_packing: "",
      dimension_without_packing: "",
      sku: "",
      images: [],
    };
    setVariants((prev) => [...prev, newVariant]);
  };

  // Remove variant
  const removeVariant = (variantIndex) => {
    if (variants.length > 1) {
      setVariants((prev) => prev.filter((_, index) => index !== variantIndex));
    }
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
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h4 className="card-title mb-0">
                {mode === "edit" ? "Edit Product" : "Add New Product"}
              </h4>
            </div>
            <div className="card-body">
              {errorMsg && (
                <div className="alert alert-danger" role="alert">
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
                {/* Product Information */}
                <div className="mb-4">
                  <h5 className="mb-3">Product Information</h5>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="product_name" className="form-label">
                        Product Name *
                      </label>
                      <input
                        type="text"
                        id="product_name"
                        name="product_name"
                        className="form-control"
                        value={newProduct.product_name}
                        onChange={handleProductInputChange}
                        required
                        placeholder="Enter product name"
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="product_category" className="form-label">
                        Product Category *
                      </label>
                      <input
                        type="text"
                        id="product_category"
                        name="product_category"
                        className="form-control"
                        value={newProduct.product_category}
                        onChange={handleProductInputChange}
                        required
                        placeholder="Enter product category"
                      />
                    </div>
                  </div>
                </div>

                {/* Vendors Information */}
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h5 className="mb-0">Vendor Information</h5>
                      <small className="text-muted">
                        Add one or more vendors for this product
                      </small>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={addVendor}
                    >
                      <i className="fas fa-plus me-1"></i>
                      Add Vendor
                    </button>
                  </div>

                  {vendors.map((vendor, index) => (
                    <div
                      key={vendor.id}
                      className="border rounded p-3 mb-3 position-relative"
                      style={{ backgroundColor: "#f8f9fa" }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="mb-0">Vendor #{index + 1}</h6>
                        {vendors.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => removeVendor(vendor.id)}
                            title="Delete Vendor"
                          >
                            <Icon
                              icon="lucide:trash-2"
                              width="16"
                              height="16"
                            />
                          </button>
                        )}
                      </div>

                      <div className="row">
                        <div className="col-md-6 mb-3">
                          <label
                            htmlFor={`vendor_name_${vendor.id}`}
                            className="form-label"
                          >
                            Vendor Name
                          </label>
                          <input
                            type="text"
                            id={`vendor_name_${vendor.id}`}
                            name="vendor_name"
                            className="form-control"
                            value={vendor.vendor_name}
                            onChange={(e) =>
                              handleVendorInputChange(vendor.id, e)
                            }
                            placeholder="Enter vendor name"
                          />
                        </div>
                        <div className="col-md-6 mb-3">
                          <label
                            htmlFor={`common_name_${vendor.id}`}
                            className="form-label"
                          >
                            Common Name
                          </label>
                          <input
                            type="text"
                            id={`common_name_${vendor.id}`}
                            name="common_name"
                            className="form-control"
                            value={vendor.common_name}
                            onChange={(e) =>
                              handleVendorInputChange(vendor.id, e)
                            }
                            placeholder="Enter common name"
                          />
                        </div>
                        <div className="col-md-6 mb-3">
                          <label
                            htmlFor={`manufactured_by_${vendor.id}`}
                            className="form-label"
                          >
                            Manufactured By
                          </label>
                          <input
                            type="text"
                            id={`manufactured_by_${vendor.id}`}
                            name="manufactured_by"
                            className="form-control"
                            value={vendor.manufactured_by}
                            onChange={(e) =>
                              handleVendorInputChange(vendor.id, e)
                            }
                            placeholder="Enter manufacturer"
                          />
                        </div>
                        <div className="col-md-6 mb-3">
                          <label
                            htmlFor={`manufacturing_date_${vendor.id}`}
                            className="form-label"
                          >
                            Manufacturing Date
                          </label>
                          <input
                            type="date"
                            id={`manufacturing_date_${vendor.id}`}
                            name="manufacturing_date"
                            className="form-control"
                            value={vendor.manufacturing_date}
                            onChange={(e) =>
                              handleVendorInputChange(vendor.id, e)
                            }
                          />
                        </div>
                        <div className="col-md-6 mb-3">
                          <label
                            htmlFor={`vendor_status_${vendor.id}`}
                            className="form-label"
                          >
                            Vendor Status
                          </label>
                          <select
                            id={`vendor_status_${vendor.id}`}
                            name="vendor_status"
                            className="form-select"
                            value={vendor.vendor_status}
                            onChange={(e) =>
                              handleVendorInputChange(vendor.id, e)
                            }
                          >
                            <option value="">Select Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </div>
                        <div className="col-md-6 mb-3">
                          <label
                            htmlFor={`imported_by_${vendor.id}`}
                            className="form-label"
                          >
                            Imported By
                          </label>
                          <input
                            type="text"
                            id={`imported_by_${vendor.id}`}
                            name="imported_by"
                            className="form-control"
                            value={vendor.imported_by}
                            onChange={(e) =>
                              handleVendorInputChange(vendor.id, e)
                            }
                            placeholder="Enter importer name"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Variants Section */}
                <div className="mb-4">
                  <div className="mb-3">
                    <h5 className="mb-0">Product Variants</h5>
                    <small className="text-muted">
                      Add different variants of this product (e.g., different
                      colors, sizes)
                    </small>
                  </div>

                  {variants.map((variant, index) => (
                    <div key={variant.id} className="border rounded p-3 mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="mb-0">Variant {index + 1}</h6>
                        {variants.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => removeVariant(index)}
                          >
                            Remove Variant
                          </button>
                        )}
                      </div>

                      <div className="row">
                        <div className="col-md-6 mb-3">
                          <label className="form-label">MRP *</label>
                          <input
                            type="number"
                            step="0.01"
                            name="mrp"
                            className="form-control"
                            value={variant.mrp}
                            onChange={(e) => handleVariantInputChange(index, e)}
                            required
                            placeholder="Enter MRP"
                          />
                        </div>
                        <div className="col-md-6 mb-3">
                          <label className="form-label">COGS *</label>
                          <input
                            type="number"
                            step="0.01"
                            name="cogs"
                            className="form-control"
                            value={variant.cogs}
                            onChange={(e) => handleVariantInputChange(index, e)}
                            required
                            placeholder="Enter COGS"
                          />
                        </div>
                        {/* Dynamic Variant Type Manager */}
                        <div className="col-12 mb-3">
                          <VariantTypeManager
                            variantIndex={index}
                            variant={variant}
                            onVariantChange={handleVariantInputChange}
                          />
                        </div>

                        <div className="col-md-6 mb-3">
                          <label className="form-label">Quantity</label>
                          <input
                            type="number"
                            name="quantity"
                            className="form-control"
                            value={variant.quantity}
                            onChange={(e) => handleVariantInputChange(index, e)}
                            placeholder="Enter quantity"
                          />
                        </div>
                        <div className="col-md-6 mb-3">
                          <label className="form-label">SKU</label>
                          <input
                            type="text"
                            name="sku"
                            className="form-control"
                            value={variant.sku}
                            onChange={(e) => handleVariantInputChange(index, e)}
                            placeholder="Enter variant SKU"
                          />
                        </div>
                        <div className="col-md-6 mb-3">
                          <label className="form-label">
                            Dimension (with packing)
                          </label>
                          <input
                            type="text"
                            name="dimension_with_packing"
                            className="form-control"
                            value={variant.dimension_with_packing}
                            onChange={(e) => handleVariantInputChange(index, e)}
                            placeholder="Enter dimensions with packing"
                          />
                        </div>
                        <div className="col-md-6 mb-3">
                          <label className="form-label">
                            Dimension (without packing)
                          </label>
                          <input
                            type="text"
                            name="dimension_without_packing"
                            className="form-control"
                            value={variant.dimension_without_packing}
                            onChange={(e) => handleVariantInputChange(index, e)}
                            placeholder="Enter dimensions without packing"
                          />
                        </div>
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Margin</label>
                          <input
                            type="number"
                            step="0.01"
                            name="margin"
                            className="form-control"
                            value={variant.margin}
                            readOnly
                            placeholder="Auto-calculated"
                          />
                        </div>
                      </div>

                      {/* Add Another Variant Button */}
                      {index === variants.length - 1 && (
                        <div className="text-end mb-3">
                          <button
                            type="button"
                            className="btn btn-outline-primary"
                            onClick={addVariant}
                          >
                            Add Another Variant
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Product Images Section */}
                <div className="mb-4">
                  <h5 className="mb-3">Product Images</h5>
                  <div
                    className="border border-2 border-dashed rounded p-4 text-center"
                    style={{
                      borderColor: "#dee2e6",
                      backgroundColor: "#f8f9fa",
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
                      className="btn btn-outline-primary mb-2"
                      style={{ cursor: "pointer" }}
                    >
                      Choose Product Images
                    </label>
                    <p className="mb-0 text-muted">
                      Supports: JPG, JPEG, PNG, WebP, GIF
                    </p>
                  </div>

                  {/* Display existing images (edit mode) */}
                  {mode === "edit" && existingImages.length > 0 && (
                    <div className="mt-3">
                      <h6>Existing Images:</h6>
                      <div className="row">
                        {existingImages.map((image) => (
                          <div key={image.image_id} className="col-md-3 mb-2">
                            <div className="card">
                              <div className="card-body p-2">
                                <div className="d-flex justify-content-between align-items-start">
                                  <div className="flex-grow-1">
                                    <small className="text-muted d-block">
                                      {image.alt_text ||
                                        `Image ${image.image_id}`}
                                    </small>
                                    <small className="text-muted">
                                      {image.is_primary && (
                                        <span className="badge bg-primary me-1">
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
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Display selected images (new uploads) */}
                  {productImages.length > 0 && (
                    <div className="mt-3">
                      <h6>New Images to Upload:</h6>
                      <div className="row">
                        {productImages.map((image, imageIndex) => (
                          <div key={imageIndex} className="col-md-3 mb-2">
                            <div className="card">
                              <div className="card-body p-2">
                                <small className="text-muted d-block">
                                  {image.name}
                                </small>
                                <small className="text-muted">
                                  {(image.size / 1024 / 1024).toFixed(2)} MB
                                  {image.size > 10 * 1024 * 1024 && (
                                    <span className="text-warning ms-1">
                                      <i className="icon-alert-triangle"></i>{" "}
                                      Large
                                    </span>
                                  )}
                                </small>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger mt-1 w-100"
                                  onClick={() => removeProductImage(imageIndex)}
                                  title="Remove Image"
                                >
                                  <Icon
                                    icon="lucide:trash-2"
                                    width="16"
                                    height="16"
                                    className="me-1"
                                  />
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Upload Progress */}
                {uploadProgress && (
                  <div className="alert alert-info">
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
                      <small className="text-muted">
                        Large images may take several seconds to upload. Please
                        do not close this page.
                      </small>
                    </div>
                  </div>
                )}

                {/* Form Actions */}
                <div className="d-flex justify-content-end gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
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
            </div>
          </div>
        </div>
      </div>

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
                      console.error("Image failed to load:", selectedImageUrl);
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
                  This image failed to load. It might be too large or corrupted.
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
  );
};

export default ProductForm;
