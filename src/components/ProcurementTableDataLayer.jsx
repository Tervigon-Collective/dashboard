"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react/dist/iconify.js";
import Modal from "react-modal";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ProcurementApiService from "../services/procurementApi";

// Only set Modal app element on the client side
if (typeof window !== "undefined") {
  Modal.setAppElement("body");
}

// Toast notifications
const handleSuccess = (action) => {
  toast.success(`${action} successfully!`, {
    position: "top-right",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  });
};

const handleError = (action) => {
  toast.error(`Failed to ${action}. Please try again.`, {
    position: "top-right",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  });
};

const ProcurementTableDataLayer = () => {
  const router = useRouter();
  const [productData, setProductData] = useState([]);
  const [confirmModalIsOpen, setConfirmModalIsOpen] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewModalIsOpen, setViewModalIsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [imageModalIsOpen, setImageModalIsOpen] = useState(false);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [imageUrlCache, setImageUrlCache] = useState(new Map());

  // Status update states
  const [statusModalIsOpen, setStatusModalIsOpen] = useState(false);
  const [selectedProductForStatus, setSelectedProductForStatus] =
    useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Search and pagination states
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch data from API
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const response = await ProcurementApiService.getAllProducts();

      if (response.success) {
        const transformedData = transformProductData(response.data.products);
        setProductData(transformedData);
      } else {
        console.error("Failed to fetch products:", response.message);
        handleError("load products");
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      handleError("load products");
    } finally {
      setIsLoading(false);
    }
  };

  // Transform product data for table display - One row per product
  const transformProductData = (products) => {
    const transformedData = [];

    products.forEach((product) => {
      // Calculate summary data from all variants
      let totalVariants = product.variants ? product.variants.length : 0;
      let totalQuantity = 0;
      let mrpRange = "N/A";
      let cogsRange = "N/A";
      let variantTypes = [];

      if (product.variants && product.variants.length > 0) {
        totalQuantity = product.variants.reduce(
          (sum, variant) => sum + (variant.quantity || 0),
          0
        );

        // Calculate MRP range
        const mrpValues = product.variants
          .map((variant) => variant.mrp || 0)
          .filter((mrp) => mrp > 0);
        if (mrpValues.length > 0) {
          const minMRP = Math.min(...mrpValues);
          const maxMRP = Math.max(...mrpValues);
          mrpRange =
            minMRP === maxMRP ? minMRP.toString() : `${minMRP}-${maxMRP}`;
        }

        // Calculate COGS range
        const cogsValues = product.variants
          .map((variant) => variant.cogs || 0)
          .filter((cogs) => cogs > 0);
        if (cogsValues.length > 0) {
          const minCOGS = Math.min(...cogsValues);
          const maxCOGS = Math.max(...cogsValues);
          cogsRange =
            minCOGS === maxCOGS ? minCOGS.toString() : `${minCOGS}-${maxCOGS}`;
        }

        // Collect unique variant types
        product.variants.forEach((variant) => {
          if (variant.variant_type) {
            const typeStr = Object.entries(variant.variant_type)
              .map(([key, value]) => `${key}: ${value}`)
              .join(", ");
            if (!variantTypes.includes(typeStr)) {
              variantTypes.push(typeStr);
            }
          }
        });
      }

      // Create one row per product
      transformedData.push({
        product_id: product.product_id,
        product_name: product.product_name,
        product_category: product.product_category,
        status: product.status,
        product_price_category: product.product_price_category,
        total_variants: totalVariants,
        total_quantity: totalQuantity,
        mrp_range: mrpRange,
        cogs_range: cogsRange,
        variant_types: variantTypes.join("; "),
        variants: product.variants || [],
        vendor:
          product.vendors && product.vendors.length > 0
            ? product.vendors[0]
            : null,
        images: product.images || [],
        created_at: product.created_at,
      });
    });

    return transformedData;
  };

  // Load data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return productData;

    return productData.filter(
      (product) =>
        product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.product_category
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (product.sku &&
          product.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.status &&
          product.status.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.vendor &&
          product.vendor.vendor_name &&
          product.vendor.vendor_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()))
    );
  }, [productData, searchTerm]);

  // Pagination calculations
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  // Pagination handlers
  const goToFirst = () => setCurrentPage(1);
  const goToPrevious = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const goToNext = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const goToLast = () => setCurrentPage(totalPages);

  // Navigate to add product page
  const handleAddProduct = () => {
    router.push("/procurement/add-products");
  };

  // Handle edit
  const handleEdit = (product) => {
    if (!product) return;
    router.push(`/procurement/edit-products/${product.product_id}`);
  };

  // Handle view
  const handleView = (product) => {
    setSelectedProduct(product);
    setViewModalIsOpen(true);
  };

  // Handle image view
  const handleImageView = async (image) => {
    try {
      setIsLoadingImage(true);

      // If image has image_id, get secure URL from backend
      if (image.image_id) {
        // Check cache first
        if (imageUrlCache.has(image.image_id)) {
          const cachedUrl = imageUrlCache.get(image.image_id);
          // Check if URL is still valid (not expired)
          if (cachedUrl && !cachedUrl.includes("exp=")) {
            setSelectedImageUrl(cachedUrl);
            setImageModalIsOpen(true);
            setIsLoadingImage(false);
            return;
          }
        }

        const response = await ProcurementApiService.getImageViewUrl(
          image.image_id
        );

        if (response.success) {
          const secureUrl = response.data.secureUrl;
          // Cache the URL
          setImageUrlCache((prev) =>
            new Map(prev).set(image.image_id, secureUrl)
          );
          setSelectedImageUrl(secureUrl);
          setImageModalIsOpen(true);
        } else {
          toast.error("Failed to load image");
        }
      } else if (image.image_url) {
        // Fallback for direct URL (shouldn't happen with new implementation)
        setSelectedImageUrl(image.image_url);
        setImageModalIsOpen(true);
      } else {
        toast.error("No image available");
      }
    } catch (error) {
      console.error("Error loading image:", error);
      toast.error(
        "Failed to load image. The image might be too large or corrupted."
      );
    } finally {
      setIsLoadingImage(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const response = await ProcurementApiService.deleteProduct(
        deleteProductId
      );

      if (response.success) {
        handleSuccess("Delete Product");
        await fetchData(); // Refresh data
        setConfirmModalIsOpen(false); // Close modal on success
      } else {
        handleError("delete product");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      handleError("delete product");
    } finally {
      setDeleteProductId(null);
      setIsDeleting(false);
    }
  };

  // Handle status update click
  const handleStatusClick = (product) => {
    if (product.status === "pending") {
      setSelectedProductForStatus(product);
      setStatusModalIsOpen(true);
    }
  };

  // Handle status update
  const handleStatusUpdate = async (status) => {
    if (!selectedProductForStatus) return;

    try {
      setIsUpdatingStatus(true);

      const response = await ProcurementApiService.updateProductStatus(
        selectedProductForStatus.product_id,
        status
      );

      if (response.success) {
        toast.success(`Product ${status} successfully!`);
        await fetchData(); // Refresh the list
        setStatusModalIsOpen(false);
        setSelectedProductForStatus(null);
      } else {
        toast.error(`Failed to ${status} product`);
      }
    } catch (error) {
      console.error(`Error updating status to ${status}:`, error);
      toast.error(`Error updating status: ${error.message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Format variant type display
  const formatVariantType = (variantType) => {
    if (!variantType || typeof variantType !== "object") return "N/A";

    return Object.entries(variantType)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
  };

  // Format status badge
  const getStatusBadge = (status, product = null) => {
    const statusConfig = {
      pending: { class: "bg-warning", text: "Pending" },
      approved: { class: "bg-success", text: "Approved" },
      rejected: { class: "bg-danger", text: "Rejected" },
      active: { class: "bg-success", text: "Active" },
      inactive: { class: "bg-warning", text: "Inactive" },
      discontinued: { class: "bg-danger", text: "Discontinued" },
    };

    const config = statusConfig[status] || {
      class: "bg-secondary",
      text: status || "N/A",
    };

    // Make pending status clickable
    if (status === "pending" && product) {
      return (
        <span
          className={`badge ${config.class} cursor-pointer`}
          onClick={() => handleStatusClick(product)}
          style={{ cursor: "pointer" }}
          title="Click to approve or reject"
        >
          {config.text}
        </span>
      );
    }

    return <span className={`badge ${config.class}`}>{config.text}</span>;
  };

  // Simple table row component
  const TableRow = ({ product, onEdit, onDelete, onView, uniqueKey }) => (
    <tr key={uniqueKey}>
      <td>
        <div className="fw-medium">{product.product_name}</div>
        <small className="text-muted">ID: {product.product_id}</small>
      </td>
      <td>
        <span className="badge bg-light text-dark">
          {product.product_category}
        </span>
      </td>
      <td>{getStatusBadge(product.status, product)}</td>
      <td>
        <span
          className={`badge ${
            product.product_price_category === "A"
              ? "bg-success"
              : product.product_price_category === "B"
              ? "bg-warning"
              : "bg-info"
          }`}
        >
          Category {product.product_price_category}
        </span>
      </td>
      <td>
        <div className="d-flex align-items-center">
          <span className="badge bg-primary me-1">
            {product.total_variants} variants
          </span>
          {product.variant_types && (
            <small className="text-muted" title={product.variant_types}>
              <Icon icon="lucide:info" width="14" height="14" />
            </small>
          )}
        </div>
      </td>
      <td>₹{product.mrp_range}</td>
      <td>₹{product.cogs_range}</td>
      <td>
        <span className="badge bg-light text-dark">
          {product.total_quantity} units
        </span>
      </td>
      <td>
        <div className="d-flex gap-1">
          <button
            className="btn btn-sm btn-outline-info"
            onClick={() => onView(product)}
            title="View Product Details"
          >
            <Icon icon="lucide:eye" width="16" height="16" />
          </button>
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={() => onEdit(product)}
            title="Edit Product"
          >
            <Icon icon="lucide:edit" width="16" height="16" />
          </button>
          <button
            className="btn btn-sm btn-outline-danger"
            onClick={() => onDelete(product)}
            title="Delete Product"
          >
            <Icon icon="lucide:trash-2" width="16" height="16" />
          </button>
        </div>
      </td>
    </tr>
  );

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
    <div className="card basic-data-table">
      <div className="card-header d-flex align-items-center justify-content-between">
        <h5 className="card-title mb-0">Procurement Products</h5>
        <button
          onClick={handleAddProduct}
          className="btn btn-primary d-inline-flex align-items-center"
          style={{ gap: "4px" }}
        >
          <Icon icon="lucide:plus" width="20" height="20" />
          Add New Product
        </button>
      </div>

      <div className="card-body">
        {/* Search and Filter Controls */}
        <div className="row mb-3">
          <div className="col-md-6">
            <div className="input-group">
              <span className="input-group-text">
                <Icon icon="lucide:search" width="16" height="16" />
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-6">
            <div className="d-flex justify-content-end align-items-center gap-2">
              <label htmlFor="itemsPerPage" className="form-label mb-0">
                Show:
              </label>
              <select
                id="itemsPerPage"
                className="form-select"
                style={{ width: "auto" }}
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Product Category</th>
                <th>Status</th>
                <th>Product Price Category</th>
                <th>Variants</th>
                <th>Selling Price Range</th>
                <th>COGS Range</th>
                <th>Total Quantity</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {currentData.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-4">
                    <div className="d-flex flex-column align-items-center">
                      <Icon
                        icon="lucide:package"
                        width="48"
                        height="48"
                        className="text-muted mb-2"
                      />
                      <p className="text-muted mb-0">No products found</p>
                      {searchTerm && (
                        <small className="text-muted">
                          Try adjusting your search terms
                        </small>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                currentData.map((product, index) => (
                  <TableRow
                    key={`${product.product_id}-${index}`}
                    product={product}
                    onEdit={handleEdit}
                    onView={handleView}
                    onDelete={(product) => {
                      setDeleteProductId(product.product_id);
                      setConfirmModalIsOpen(true);
                    }}
                    uniqueKey={`${product.product_id}-${
                      product.variant_id || "no-variant"
                    }-${index}`}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="d-flex justify-content-between align-items-center mt-3">
            <div className="text-muted">
              Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of{" "}
              {totalItems} entries
            </div>
            <div className="d-flex gap-1">
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={goToFirst}
                disabled={currentPage === 1}
              >
                <Icon icon="lucide:chevrons-left" width="16" height="16" />
              </button>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={goToPrevious}
                disabled={currentPage === 1}
              >
                <Icon icon="lucide:chevron-left" width="16" height="16" />
              </button>
              <span className="btn btn-outline-primary btn-sm disabled">
                {currentPage} of {totalPages}
              </span>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={goToNext}
                disabled={currentPage === totalPages}
              >
                <Icon icon="lucide:chevron-right" width="16" height="16" />
              </button>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={goToLast}
                disabled={currentPage === totalPages}
              >
                <Icon icon="lucide:chevrons-right" width="16" height="16" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal - Full Screen */}
      <Modal
        isOpen={confirmModalIsOpen}
        onRequestClose={() => setConfirmModalIsOpen(false)}
        className="delete-confirmation-modal"
        overlayClassName="delete-confirmation-overlay"
        contentLabel="Delete Confirmation"
        style={{
          overlay: {
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          },
          content: {
            position: "relative",
            top: "auto",
            left: "auto",
            right: "auto",
            bottom: "auto",
            border: "none",
            background: "transparent",
            overflow: "auto",
            borderRadius: "0",
            outline: "none",
            padding: "0",
            width: "100%",
            height: "100%",
            maxWidth: "none",
            maxHeight: "none",
            margin: "0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          },
        }}
      >
        <div
          className="delete-confirmation-container"
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            className="delete-confirmation-card"
            style={{
              background: "white",
              borderRadius: "16px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              maxWidth: "450px",
              width: "100%",
              maxHeight: "70vh",
              overflow: "hidden",
              animation: "slideIn 0.3s ease-out",
              position: "relative",
            }}
          >
            {/* Close Button */}
            <button
              type="button"
              className="btn-close"
              onClick={() => setConfirmModalIsOpen(false)}
              disabled={isDeleting}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                fontSize: "18px",
                opacity: isDeleting ? 0.5 : 1,
                cursor: isDeleting ? "not-allowed" : "pointer",
                background: "none",
                border: "none",
                color: "#6c757d",
                zIndex: 1,
                width: "30px",
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) => {
                if (!isDeleting) {
                  e.target.style.background = "#f8f9fa";
                  e.target.style.color = "#dc3545";
                }
              }}
              onMouseOut={(e) => {
                if (!isDeleting) {
                  e.target.style.background = "none";
                  e.target.style.color = "#6c757d";
                }
              }}
            >
              ×
            </button>

            {/* Body */}
            <div
              className="delete-confirmation-body"
              style={{
                padding: "50px 40px 40px 40px",
                textAlign: "center",
              }}
            >
              <div
                className="warning-message"
                style={{
                  fontSize: "18px",
                  color: "#374151",
                  lineHeight: "1.6",
                  marginBottom: "24px",
                }}
              >
                Are you absolutely sure you want to delete this product?
              </div>

              <div
                className="warning-details"
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "12px",
                  padding: "20px",
                  marginBottom: "32px",
                }}
              >
                <div
                  className="warning-icon"
                  style={{
                    fontSize: "24px",
                    marginBottom: "12px",
                  }}
                >
                  🗑️
                </div>
                <div
                  className="warning-text"
                  style={{
                    fontSize: "14px",
                    color: "#991b1b",
                    fontWeight: "500",
                  }}
                >
                  This will permanently delete:
                </div>
                <ul
                  className="warning-list"
                  style={{
                    listStyle: "none",
                    padding: "0",
                    margin: "8px 0 0 0",
                    fontSize: "14px",
                    color: "#7f1d1d",
                  }}
                >
                  <li>• Product information</li>
                  <li>• All variants and their data</li>
                  <li>• Associated images</li>
                  <li>• Vendor information</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div
                className="delete-actions"
                style={{
                  display: "flex",
                  gap: "16px",
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setConfirmModalIsOpen(false)}
                  disabled={isDeleting}
                  style={{
                    padding: "12px 32px",
                    fontSize: "16px",
                    fontWeight: "500",
                    borderRadius: "8px",
                    border: "2px solid #6c757d",
                    background: "white",
                    color: "#6c757d",
                    transition: "all 0.2s ease",
                    minWidth: "120px",
                    opacity: isDeleting ? 0.5 : 1,
                    cursor: isDeleting ? "not-allowed" : "pointer",
                  }}
                  onMouseOver={(e) => {
                    if (!isDeleting) {
                      e.target.style.background = "#6c757d";
                      e.target.style.color = "white";
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isDeleting) {
                      e.target.style.background = "white";
                      e.target.style.color = "#6c757d";
                    }
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  style={{
                    padding: "12px 32px",
                    fontSize: "16px",
                    fontWeight: "600",
                    borderRadius: "8px",
                    background: isDeleting
                      ? "linear-gradient(135deg, #6c757d 0%, #5a6268 100%)"
                      : "linear-gradient(135deg, #dc3545 0%, #c82333 100%)",
                    border: "none",
                    color: "white",
                    transition: "all 0.2s ease",
                    minWidth: "120px",
                    boxShadow: isDeleting
                      ? "0 2px 8px rgba(108, 117, 125, 0.3)"
                      : "0 4px 12px rgba(220, 53, 69, 0.3)",
                    cursor: isDeleting ? "not-allowed" : "pointer",
                    opacity: isDeleting ? 0.7 : 1,
                  }}
                  onMouseOver={(e) => {
                    if (!isDeleting) {
                      e.target.style.transform = "translateY(-2px)";
                      e.target.style.boxShadow =
                        "0 6px 16px rgba(220, 53, 69, 0.4)";
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isDeleting) {
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow =
                        "0 4px 12px rgba(220, 53, 69, 0.3)";
                    }
                  }}
                >
                  {isDeleting ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      Deleting...
                    </>
                  ) : (
                    "Delete Forever"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* View Product Details Modal */}
      <Modal
        isOpen={viewModalIsOpen}
        onRequestClose={() => setViewModalIsOpen(false)}
        className="view-product-modal"
        overlayClassName="view-product-overlay"
        contentLabel="View Product Details"
        style={{
          overlay: {
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          },
          content: {
            position: "relative",
            top: "auto",
            left: "auto",
            right: "auto",
            bottom: "auto",
            border: "none",
            background: "transparent",
            overflow: "auto",
            borderRadius: "0",
            outline: "none",
            padding: "0",
            width: "100%",
            height: "100%",
            maxWidth: "none",
            maxHeight: "none",
            margin: "0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          },
        }}
      >
        <div
          className="view-product-container"
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            className="view-product-card"
            style={{
              background: "white",
              borderRadius: "16px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              maxWidth: "1000px",
              width: "100%",
              maxHeight: "90vh",
              overflow: "hidden",
              animation: "slideIn 0.3s ease-out",
              position: "relative",
            }}
          >
            {/* Close Button */}
            <button
              type="button"
              className="btn-close"
              onClick={() => setViewModalIsOpen(false)}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                fontSize: "18px",
                background: "none",
                border: "none",
                color: "#6c757d",
                zIndex: 1,
                width: "30px",
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) => {
                e.target.style.background = "#f8f9fa";
                e.target.style.color = "#dc3545";
              }}
              onMouseOut={(e) => {
                e.target.style.background = "none";
                e.target.style.color = "#6c757d";
              }}
            >
              ×
            </button>

            {/* Modal Content */}
            <div
              style={{ padding: "40px", maxHeight: "90vh", overflowY: "auto" }}
            >
              {selectedProduct && (
                <>
                  {/* Product Header */}
                  <div className="mb-4">
                    <h3 className="mb-2">{selectedProduct.product_name}</h3>
                    <div className="d-flex gap-2 mb-3">
                      <span className="badge bg-light text-dark">
                        {selectedProduct.product_category}
                      </span>
                      {getStatusBadge(selectedProduct.status)}
                      <span
                        className={`badge ${
                          selectedProduct.product_price_category === "A"
                            ? "bg-success"
                            : selectedProduct.product_price_category === "B"
                            ? "bg-warning"
                            : "bg-info"
                        }`}
                      >
                        Category {selectedProduct.product_price_category}
                      </span>
                    </div>
                    <p className="text-muted mb-0">
                      Product ID: {selectedProduct.product_id}
                    </p>
                  </div>

                  {/* Vendor Information */}
                  {selectedProduct.vendor && (
                    <div className="mb-4">
                      <h5 className="mb-3">Vendor Information</h5>
                      <div className="card">
                        <div className="card-body">
                          <div className="row">
                            <div className="col-md-6">
                              <p className="mb-2">
                                <strong>Vendor Name:</strong>{" "}
                                {selectedProduct.vendor.vendor_name}
                              </p>
                              <p className="mb-2">
                                <strong>Common Name:</strong>{" "}
                                {selectedProduct.vendor.common_name}
                              </p>
                            </div>
                            <div className="col-md-6">
                              <p className="mb-2">
                                <strong>Manufactured By:</strong>{" "}
                                {selectedProduct.vendor.manufactured_by}
                              </p>
                              <p className="mb-2">
                                <strong>Status:</strong>
                                <span
                                  className={`badge ms-2 ${
                                    selectedProduct.vendor.vendor_status ===
                                    "active"
                                      ? "bg-success"
                                      : selectedProduct.vendor.vendor_status ===
                                        "inactive"
                                      ? "bg-danger"
                                      : "bg-warning"
                                  }`}
                                >
                                  {selectedProduct.vendor.vendor_status ||
                                    "N/A"}
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Variants Information */}
                  {selectedProduct.variants &&
                    selectedProduct.variants.length > 0 && (
                      <div className="mb-4">
                        <h5 className="mb-3">
                          Product Variants ({selectedProduct.variants.length})
                        </h5>
                        <div className="table-responsive">
                          <table className="table table-sm">
                            <thead>
                              <tr>
                                <th>SKU</th>
                                <th>Variant Type</th>
                                <th>MRP</th>
                                <th>COGS</th>
                                <th>Margin</th>
                                <th>Quantity</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedProduct.variants.map(
                                (variant, index) => (
                                  <tr key={index}>
                                    <td>{variant.sku || "N/A"}</td>
                                    <td>
                                      <small className="text-muted">
                                        {formatVariantType(
                                          variant.variant_type
                                        )}
                                      </small>
                                    </td>
                                    <td>₹{variant.mrp}</td>
                                    <td>₹{variant.cogs}</td>
                                    <td>
                                      ₹{(variant.mrp - variant.cogs).toFixed(2)}
                                    </td>
                                    <td>{variant.quantity}</td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                  {/* Images Section */}
                  {selectedProduct.images &&
                    selectedProduct.images.length > 0 && (
                      <div className="mb-4">
                        <h5 className="mb-3">
                          Product Images ({selectedProduct.images.length})
                        </h5>
                        <div className="row">
                          {selectedProduct.images.map((image, index) => (
                            <div key={index} className="col-md-4 mb-3">
                              <div className="card">
                                <div className="card-body p-2">
                                  <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                      <small className="text-muted d-block">
                                        {image.alt_text || `Image ${index + 1}`}
                                      </small>
                                      <small className="text-muted">
                                        {image.is_primary && (
                                          <span className="badge bg-primary me-1">
                                            Primary
                                          </span>
                                        )}
                                        Sort: {image.sort_order}
                                      </small>
                                    </div>
                                    <button
                                      className="btn btn-sm btn-outline-info"
                                      onClick={() => handleImageView(image)}
                                      title="View Image"
                                      disabled={isLoadingImage}
                                    >
                                      {isLoadingImage ? (
                                        <div
                                          className="spinner-border spinner-border-sm"
                                          role="status"
                                          aria-hidden="true"
                                        ></div>
                                      ) : (
                                        <Icon
                                          icon="lucide:eye"
                                          width="16"
                                          height="16"
                                        />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Summary Stats */}
                  <div className="row">
                    <div className="col-md-3">
                      <div className="card text-center">
                        <div className="card-body">
                          <h6 className="card-title">Total Variants</h6>
                          <h4 className="text-primary">
                            {selectedProduct.total_variants}
                          </h4>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="card text-center">
                        <div className="card-body">
                          <h6 className="card-title">Total Quantity</h6>
                          <h4 className="text-success">
                            {selectedProduct.total_quantity}
                          </h4>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="card text-center">
                        <div className="card-body">
                          <h6 className="card-title">COGS Range</h6>
                          <h4 className="text-warning">
                            ₹{selectedProduct.cogs_range}
                          </h4>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-2"></div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Image View Modal */}
      <Modal
        isOpen={imageModalIsOpen}
        onRequestClose={() => setImageModalIsOpen(false)}
        className="image-view-modal"
        overlayClassName="image-view-overlay"
        contentLabel="View Image"
        style={{
          overlay: {
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          },
          content: {
            position: "relative",
            top: "auto",
            left: "auto",
            right: "auto",
            bottom: "auto",
            border: "none",
            background: "transparent",
            overflow: "auto",
            borderRadius: "0",
            outline: "none",
            padding: "0",
            width: "100%",
            height: "100%",
            maxWidth: "none",
            maxHeight: "none",
            margin: "0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          },
        }}
      >
        <div
          className="image-view-container"
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            className="image-view-card"
            style={{
              background: "white",
              borderRadius: "16px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              maxWidth: "90vw",
              maxHeight: "90vh",
              overflow: "hidden",
              animation: "slideIn 0.3s ease-out",
              position: "relative",
            }}
          >
            {/* Close Button */}
            <button
              type="button"
              className="btn-close"
              onClick={() => setImageModalIsOpen(false)}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                fontSize: "18px",
                background: "rgba(0, 0, 0, 0.5)",
                border: "none",
                color: "white",
                zIndex: 1,
                width: "40px",
                height: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) => {
                e.target.style.background = "rgba(0, 0, 0, 0.8)";
              }}
              onMouseOut={(e) => {
                e.target.style.background = "rgba(0, 0, 0, 0.5)";
              }}
            >
              ×
            </button>

            {/* Image */}
            {isLoadingImage ? (
              <div style={{ padding: "40px", textAlign: "center" }}>
                <div
                  className="spinner-border text-primary"
                  role="status"
                  style={{ width: "3rem", height: "3rem" }}
                >
                  <span className="visually-hidden">Loading image...</span>
                </div>
                <p className="mt-3 text-muted">
                  Loading large image, please wait...
                </p>
                <small className="text-muted">
                  This may take a moment for large files
                </small>
              </div>
            ) : selectedImageUrl ? (
              <div style={{ padding: "20px", textAlign: "center" }}>
                <img
                  src={selectedImageUrl}
                  alt="Product Image"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "80vh",
                    objectFit: "contain",
                    borderRadius: "8px",
                  }}
                  onError={(e) => {
                    console.error("Image failed to load:", selectedImageUrl);
                    e.target.style.display = "none";
                    const errorDiv = e.target.nextSibling;
                    if (errorDiv) errorDiv.style.display = "block";
                  }}
                />
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
            ) : (
              <div style={{ padding: "40px", textAlign: "center" }}>
                <div className="alert alert-info">
                  <i className="icon-info me-2"></i>
                  No image available
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Status Update Modal */}
      <Modal
        isOpen={statusModalIsOpen}
        onRequestClose={() => setStatusModalIsOpen(false)}
        className="status-update-modal"
        overlayClassName="status-update-overlay"
        contentLabel="Update Product Status"
        style={{
          overlay: {
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          },
          content: {
            position: "relative",
            top: "auto",
            left: "auto",
            right: "auto",
            bottom: "auto",
            border: "none",
            borderRadius: "12px",
            padding: "0",
            maxWidth: "400px",
            width: "90%",
            maxHeight: "80vh",
            overflow: "auto",
            background: "white",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
            animation: "slideIn 0.3s ease-out",
          },
        }}
      >
        <div className="p-4">
          <div className="text-center mb-4">
            <h5 className="mb-2">Update Product Status</h5>
            <p className="text-muted mb-0">
              Product: <strong>{selectedProductForStatus?.product_name}</strong>
            </p>
          </div>

          <div className="d-grid gap-2">
            <button
              className="btn btn-success btn-lg"
              onClick={() => handleStatusUpdate("approved")}
              disabled={isUpdatingStatus}
              style={{
                padding: "12px 24px",
                fontSize: "16px",
                fontWeight: "500",
              }}
            >
              {isUpdatingStatus ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Approving...
                </>
              ) : (
                <>
                  <i className="icon-check me-2"></i>
                  Approve Product
                </>
              )}
            </button>

            <button
              className="btn btn-danger btn-lg"
              onClick={() => handleStatusUpdate("rejected")}
              disabled={isUpdatingStatus}
              style={{
                padding: "12px 24px",
                fontSize: "16px",
                fontWeight: "500",
              }}
            >
              {isUpdatingStatus ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Rejecting...
                </>
              ) : (
                <>
                  <i className="icon-x me-2"></i>
                  Reject Product
                </>
              )}
            </button>

            <button
              className="btn btn-outline-secondary"
              onClick={() => setStatusModalIsOpen(false)}
              disabled={isUpdatingStatus}
              style={{
                padding: "8px 16px",
                fontSize: "14px",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <ToastContainer />
    </div>
  );
};

export default ProcurementTableDataLayer;
