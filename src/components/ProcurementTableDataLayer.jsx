"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react/dist/iconify.js";
import Modal from "react-modal";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ProcurementApiService from "../services/procurementApi";
import { useUser } from "@/helper/UserContext";

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
  const { hasOperation } = useUser();
  const [productData, setProductData] = useState([]);
  const [confirmModalIsOpen, setConfirmModalIsOpen] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
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

  // Filter states
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Fetch data from API
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setAuthError(null); // Clear any previous auth errors
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

      // Handle authentication errors specifically
      if (error.message.includes("AUTHENTICATION_ERROR")) {
        setAuthError(error.message.replace("AUTHENTICATION_ERROR: ", ""));
      } else {
        handleError("load products");
      }
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
        vendors: product.vendors || [],
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

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, categoryFilter]);

  // Define all possible Product Price Categories
  const allCategories = ["A", "B", "C"];

  // Filter data based on search term, status, and category
  const filteredData = useMemo(() => {
    return productData.filter((product) => {
      // Search filter
      const matchesSearch =
        !searchTerm ||
        product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.product_category
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (product.sku &&
          product.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.status &&
          product.status.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.vendors &&
          product.vendors.some(
            (vendor) =>
              vendor.vendor_name &&
              vendor.vendor_name
                .toLowerCase()
                .includes(searchTerm.toLowerCase())
          ));

      // Status filter
      const matchesStatus =
        statusFilter === "all" ||
        product.status?.toLowerCase() === statusFilter.toLowerCase();

      // Category filter (Product Price Category)
      const matchesCategory =
        categoryFilter === "all" ||
        product.product_price_category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [productData, searchTerm, statusFilter, categoryFilter]);

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

  // Reset all filters and search
  const handleReset = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setCurrentPage(1);
    fetchData(); // Refresh data
  };

  // Navigate to add product page
  const handleAddProduct = () => {
    router.push("/procurement/add-products");
  };

  // Handle edit
  const handleEdit = (product) => {
    if (!product) return;
    router.push(`/procurement/edit-product?id=${product.product_id}`);
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

  // Handle status update click (triggered by gear icon)
  const handleStatusClick = (product) => {
    setSelectedProductForStatus(product);
    setStatusModalIsOpen(true);
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
      pending: {
        bg: "#fef3c7",
        color: "#92400e",
        text: "Pending",
        icon: "mdi:clock-outline",
      },
      approved: {
        bg: "#d1fae5",
        color: "#065f46",
        text: "Approved",
        icon: "mdi:check-circle",
      },
      rejected: {
        bg: "#fee2e2",
        color: "#991b1b",
        text: "Rejected",
        icon: "mdi:close-circle",
      },
      active: {
        bg: "#d1fae5",
        color: "#065f46",
        text: "Active",
        icon: "mdi:check-circle",
      },
      inactive: {
        bg: "#fef3c7",
        color: "#92400e",
        text: "Inactive",
        icon: "mdi:clock-outline",
      },
      discontinued: {
        bg: "#fee2e2",
        color: "#991b1b",
        text: "Discontinued",
        icon: "mdi:close-circle",
      },
    };

    const config = statusConfig[status] || {
      bg: "#f3f4f6",
      color: "#374151",
      text: status || "N/A",
      icon: "mdi:help-circle",
    };

    // Status badge is NOT clickable - use gear icon in Actions column to approve/reject
    return (
      <span
        className="badge d-inline-flex align-items-center gap-1"
        style={{
          backgroundColor: config.bg,
          color: config.color,
          fontSize: "13px",
          fontWeight: "500",
          padding: "6px 12px",
        }}
      >
        <Icon icon={config.icon} width="14" height="14" />
        {config.text}
      </span>
    );
  };

  // Simple table row component
  const TableRow = ({ product, onEdit, onDelete, onView, uniqueKey }) => (
    <tr key={uniqueKey} style={{ borderBottom: "1px solid #e5e7eb" }}>
      <td style={{ padding: "12px", verticalAlign: "middle" }}>
        <div className="fw-medium" style={{ fontSize: "14px" }}>
          {product.product_name}
        </div>
        <small className="text-muted" style={{ fontSize: "12px" }}>
          ID: {product.product_id}
        </small>
      </td>
      <td style={{ padding: "12px", verticalAlign: "middle" }}>
        <span
          className="badge"
          style={{
            backgroundColor: "#f1f1f1",
            color: "#333",
            fontWeight: "500",
            fontSize: "13px",
          }}
        >
          {product.product_category}
        </span>
      </td>
      <td style={{ padding: "12px", verticalAlign: "middle" }}>
        {getStatusBadge(product.status, product)}
      </td>
      <td style={{ padding: "12px", verticalAlign: "middle" }}>
        <span style={{ fontSize: "14px", fontWeight: "500" }}>
          {product.product_price_category}
        </span>
      </td>
      <td style={{ padding: "12px", verticalAlign: "middle" }}>
        <span style={{ fontSize: "14px", color: "#666" }}>
          {product.total_variants} variant
          {product.total_variants !== 1 ? "s" : ""}
        </span>
      </td>
      <td style={{ padding: "12px", verticalAlign: "middle" }}>
        <span style={{ fontSize: "14px", color: "#16a34a", fontWeight: "500" }}>
          ₹{product.mrp_range}
        </span>
      </td>
      <td style={{ padding: "12px", verticalAlign: "middle" }}>
        <span style={{ fontSize: "14px", color: "#666" }}>
          ₹{product.cogs_range}
        </span>
      </td>
      <td style={{ padding: "12px", verticalAlign: "middle" }}>
        <span style={{ fontSize: "14px", color: "#2563eb", fontWeight: "500" }}>
          {product.total_quantity} unit{product.total_quantity !== 1 ? "s" : ""}
        </span>
      </td>
      <td style={{ padding: "12px", verticalAlign: "middle" }}>
        <div className="d-flex gap-2">
          <button
            className="btn btn-sm"
            onClick={() => onView(product)}
            title="View Product Details"
            style={{
              width: "32px",
              height: "32px",
              padding: "0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              backgroundColor: "white",
            }}
          >
            <Icon
              icon="lucide:eye"
              width="16"
              height="16"
              style={{ color: "#3b82f6" }}
            />
          </button>
          {hasOperation("procurement", "update") && (
            <button
              className="btn btn-sm"
              onClick={() => onEdit(product)}
              title="Edit Product"
              style={{
                width: "32px",
                height: "32px",
                padding: "0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                backgroundColor: "white",
              }}
            >
              <Icon
                icon="lucide:edit"
                width="16"
                height="16"
                style={{ color: "#3b82f6" }}
              />
            </button>
          )}
          <button
            className="btn btn-sm"
            onClick={() => handleStatusClick(product)}
            title="Update Status"
            style={{
              width: "32px",
              height: "32px",
              padding: "0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              backgroundColor: "white",
            }}
          >
            <Icon
              icon="lucide:settings"
              width="16"
              height="16"
              style={{ color: "#f59e0b" }}
            />
          </button>
          {hasOperation("procurement", "delete") && (
            <button
              className="btn btn-sm"
              onClick={() => onDelete(product)}
              title="Delete Product"
              style={{
                width: "32px",
                height: "32px",
                padding: "0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                backgroundColor: "white",
              }}
            >
              <Icon
                icon="lucide:trash-2"
                width="16"
                height="16"
                style={{ color: "#ef4444" }}
              />
            </button>
          )}
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

  // Show authentication error if present
  if (authError) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="text-center py-5">
            <div
              className="mb-4"
              style={{
                fontSize: "64px",
                color: "#f59e0b",
              }}
            >
              <Icon icon="mdi:lock-alert" width="64" height="64" />
            </div>
            <h4 className="mb-3" style={{ color: "#dc2626" }}>
              Authentication Required
            </h4>
            <p
              className="text-muted mb-4"
              style={{ maxWidth: "500px", margin: "0 auto" }}
            >
              {authError}
            </p>
            <div className="d-flex gap-3 justify-content-center">
              <button
                className="btn btn-primary"
                onClick={() => router.push("/sign-in")}
                style={{
                  padding: "12px 32px",
                  fontSize: "16px",
                  fontWeight: "500",
                }}
              >
                <Icon
                  icon="mdi:login"
                  width="20"
                  height="20"
                  className="me-2"
                />
                Sign In with Real Account
              </button>
              <button
                className="btn btn-outline-secondary"
                onClick={() => router.push("/")}
                style={{
                  padding: "12px 32px",
                  fontSize: "16px",
                  fontWeight: "500",
                }}
              >
                <Icon icon="mdi:home" width="20" height="20" className="me-2" />
                Go to Dashboard
              </button>
            </div>
            <div className="mt-4">
              <small className="text-muted">
                <Icon
                  icon="mdi:information"
                  width="16"
                  height="16"
                  className="me-1"
                />
                The procurement API requires Firebase authentication. Please
                sign in with your account.
              </small>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid px-3 px-md-4 py-3">
      <div className="card basic-data-table">
        <div className="card-header d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-2">
          <h5 className="card-title mb-0">Procurement Products</h5>
          {hasOperation("procurement", "create") && (
            <button
              onClick={handleAddProduct}
              className="btn btn-primary d-inline-flex align-items-center"
              style={{ gap: "6px", padding: "8px 16px" }}
            >
              <Icon icon="lucide:plus" width="18" height="18" />
              <span className="d-none d-sm-inline">Add New Product</span>
              <span className="d-sm-none">Add</span>
            </button>
          )}
        </div>

        <div className="card-body">
          {/* Search and Filter Controls */}
          <div className="row g-3 mb-4">
            <div className="col-12 col-md-3">
              <div className="input-group">
                <span className="input-group-text bg-white">
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
            <div className="col-6 col-md-2">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1); // Reset to first page when filtering
                }}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="col-6 col-md-2">
              <select
                className="form-select"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1); // Reset to first page when filtering
                }}
              >
                <option value="all">All Categories</option>
                {allCategories.map((category) => (
                  <option key={category} value={category}>
                    Category {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-6 col-md-2">
              <select
                className="form-select"
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
              >
                <option value={5}>5 Items</option>
                <option value={10}>10 Items</option>
                <option value={25}>25 Items</option>
                <option value={50}>50 Items</option>
              </select>
            </div>
            <div className="col-6 col-md-3">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={handleReset}
              >
                <Icon
                  icon="lucide:rotate-ccw"
                  width="16"
                  height="16"
                  className="me-2"
                />
                <span className="d-none d-sm-inline">Reset Filters</span>
                <span className="d-sm-none">Reset</span>
              </button>
            </div>
          </div>

          {/* Showing entries count */}
          <div className="mb-3">
            <small className="text-muted">
              Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of{" "}
              {totalItems} entries
            </small>
          </div>

          {/* Table */}
          <div className="table-responsive">
            <table className="table table-hover" style={{ fontSize: "14px" }}>
              <thead
                style={{
                  backgroundColor: "#f9fafb",
                  borderBottom: "2px solid #e5e7eb",
                }}
              >
                <tr>
                  <th
                    style={{
                      fontWeight: "600",
                      color: "#374151",
                      padding: "12px",
                    }}
                  >
                    Product Name
                  </th>
                  <th
                    style={{
                      fontWeight: "600",
                      color: "#374151",
                      padding: "12px",
                    }}
                  >
                    Product Category
                  </th>
                  <th
                    style={{
                      fontWeight: "600",
                      color: "#374151",
                      padding: "12px",
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      fontWeight: "600",
                      color: "#374151",
                      padding: "12px",
                    }}
                  >
                    Product Price Category
                  </th>
                  <th
                    style={{
                      fontWeight: "600",
                      color: "#374151",
                      padding: "12px",
                    }}
                  >
                    Variants
                  </th>
                  <th
                    style={{
                      fontWeight: "600",
                      color: "#374151",
                      padding: "12px",
                    }}
                  >
                    Selling Price Range
                  </th>
                  <th
                    style={{
                      fontWeight: "600",
                      color: "#374151",
                      padding: "12px",
                    }}
                  >
                    COGS Range
                  </th>
                  <th
                    style={{
                      fontWeight: "600",
                      color: "#374151",
                      padding: "12px",
                    }}
                  >
                    Total Quantity
                  </th>
                  <th
                    style={{
                      fontWeight: "600",
                      color: "#374151",
                      padding: "12px",
                    }}
                  >
                    Action
                  </th>
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

        {/* Product View Modal */}
        {viewModalIsOpen && (
          <div
            className="modal fade show d-block"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <Icon icon="mdi:package-variant" className="me-2" />
                    Product Information - {selectedProduct?.product_name}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setViewModalIsOpen(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  {selectedProduct && (
                    <>
                      {/* Product Info Summary - Two Column Layout */}
                      <div className="row mb-4">
                        <div className="col-md-6">
                          <h6 className="text-muted mb-3">
                            Product Information
                          </h6>
                          <div className="d-flex flex-column gap-2">
                            <div className="d-flex justify-content-between">
                              <span className="text-muted">Product Name:</span>
                              <span className="fw-medium">
                                {selectedProduct.product_name}
                              </span>
                            </div>
                            <div className="d-flex justify-content-between">
                              <span className="text-muted">Product ID:</span>
                              <span className="fw-medium">
                                {selectedProduct.product_id}
                              </span>
                            </div>
                            <div className="d-flex justify-content-between">
                              <span className="text-muted">Category:</span>
                              <span className="fw-medium">
                                {selectedProduct.product_category}
                              </span>
                            </div>
                            <div className="d-flex justify-content-between">
                              <span className="text-muted">
                                Price Category:
                              </span>
                              <span
                                className={`badge ${
                                  selectedProduct.product_price_category === "A"
                                    ? "bg-success"
                                    : selectedProduct.product_price_category ===
                                      "B"
                                    ? "bg-warning"
                                    : "bg-info"
                                }`}
                              >
                                Category{" "}
                                {selectedProduct.product_price_category}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <h6 className="text-muted mb-3">Summary</h6>
                          <div className="d-flex flex-column gap-2">
                            <div className="d-flex justify-content-between">
                              <span className="text-muted">Status:</span>
                              {getStatusBadge(selectedProduct.status)}
                            </div>
                            <div className="d-flex justify-content-between">
                              <span className="text-muted">
                                Total Variants:
                              </span>
                              <span className="fw-medium">
                                {selectedProduct.total_variants}
                              </span>
                            </div>
                            <div className="d-flex justify-content-between">
                              <span className="text-muted">
                                Total Quantity:
                              </span>
                              <span className="fw-medium">
                                {selectedProduct.total_quantity}
                              </span>
                            </div>
                            <div className="d-flex justify-content-between">
                              <span className="text-muted">COGS Range:</span>
                              <span className="fw-medium">
                                ₹{selectedProduct.cogs_range}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Vendors Table */}
                      {selectedProduct.vendors &&
                        selectedProduct.vendors.length > 0 && (
                          <div className="mb-3">
                            <h6 className="text-muted mb-3">Vendors</h6>
                            <div className="table-responsive">
                              <table className="table table-sm table-bordered">
                                <thead className="table-light">
                                  <tr>
                                    <th className="small">Vendor Name</th>
                                    <th className="small">Common Name</th>
                                    <th className="small">Manufactured By</th>
                                    <th className="small d-none d-md-table-cell">
                                      Mfg Date
                                    </th>
                                    <th className="small d-none d-lg-table-cell">
                                      Imported By
                                    </th>
                                    <th className="small text-center">
                                      Status
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedProduct.vendors.map(
                                    (vendor, index) => (
                                      <tr key={index}>
                                        <td className="small fw-medium">
                                          {vendor.vendor_name || "N/A"}
                                        </td>
                                        <td className="small">
                                          {vendor.common_name || "N/A"}
                                        </td>
                                        <td className="small">
                                          {vendor.manufactured_by || "N/A"}
                                        </td>
                                        <td className="small d-none d-md-table-cell">
                                          {vendor.manufacturing_date || "N/A"}
                                        </td>
                                        <td className="small d-none d-lg-table-cell">
                                          {vendor.imported_by || "N/A"}
                                        </td>
                                        <td className="small text-center">
                                          <span
                                            className={`badge ${
                                              vendor.vendor_status === "active"
                                                ? "bg-success"
                                                : "bg-secondary"
                                            }`}
                                          >
                                            {vendor.vendor_status || "N/A"}
                                          </span>
                                        </td>
                                      </tr>
                                    )
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                      {/* Variants Table */}
                      {selectedProduct.variants &&
                        selectedProduct.variants.length > 0 && (
                          <div className="mb-3">
                            <h6 className="text-muted mb-3">
                              Product Variants
                            </h6>
                            <div className="table-responsive">
                              <table className="table table-sm table-bordered">
                                <thead className="table-light">
                                  <tr>
                                    <th className="small">Variant</th>
                                    <th className="small text-center d-none d-md-table-cell">
                                      SKU
                                    </th>
                                    <th className="small text-end">MRP</th>
                                    <th className="small text-end">COGS</th>
                                    <th className="small text-end">Margin</th>
                                    <th className="small text-center">Qty</th>
                                    <th className="small">Vendor</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedProduct.variants.map(
                                    (variant, index) => (
                                      <tr key={index}>
                                        <td className="small">
                                          <div className="fw-medium">
                                            {formatVariantType(
                                              variant.variant_type
                                            )}
                                          </div>
                                          <div
                                            className="text-muted d-md-none"
                                            style={{ fontSize: "11px" }}
                                          >
                                            SKU: {variant.sku || "N/A"}
                                          </div>
                                        </td>
                                        <td className="small text-center d-none d-md-table-cell">
                                          <span className="badge bg-light text-dark">
                                            {variant.sku || "N/A"}
                                          </span>
                                        </td>
                                        <td className="small text-end">
                                          ₹{variant.mrp}
                                        </td>
                                        <td className="small text-end">
                                          ₹{variant.cogs}
                                        </td>
                                        <td className="small text-end fw-medium">
                                          ₹
                                          {(variant.mrp - variant.cogs).toFixed(
                                            2
                                          )}
                                        </td>
                                        <td className="small text-center">
                                          <span className="badge bg-primary rounded-pill">
                                            {variant.quantity}
                                          </span>
                                        </td>
                                        <td className="small">
                                          {variant.vendor_pricing &&
                                          variant.vendor_pricing.length > 0
                                            ? variant.vendor_pricing
                                                .map(
                                                  (vp) =>
                                                    vp.vendor_name || "N/A"
                                                )
                                                .join(", ")
                                            : "Not Assigned"}
                                        </td>
                                      </tr>
                                    )
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                      {/* Product Images */}
                      {selectedProduct.images &&
                        selectedProduct.images.length > 0 && (
                          <div className="mb-3">
                            <h6 className="text-muted mb-3">Product Images</h6>
                            <div className="row g-2">
                              {selectedProduct.images.map((image, index) => (
                                <div key={index} className="col-md-4 col-6">
                                  <div className="card bg-light border-0">
                                    <div className="card-body p-2">
                                      <div className="d-flex justify-content-between align-items-center">
                                        <div className="flex-grow-1">
                                          <div className="fw-medium small">
                                            {image.alt_text ||
                                              `Image ${index + 1}`}
                                          </div>
                                          <div
                                            className="text-muted"
                                            style={{ fontSize: "11px" }}
                                          >
                                            {image.is_primary && (
                                              <span
                                                className="badge bg-primary me-1"
                                                style={{ fontSize: "9px" }}
                                              >
                                                Primary
                                              </span>
                                            )}
                                            Sort: {image.sort_order}
                                          </div>
                                        </div>
                                        <button
                                          className="btn btn-sm btn-outline-primary rounded-pill px-2"
                                          onClick={() => handleImageView(image)}
                                          title="View Image"
                                          disabled={isLoadingImage}
                                        >
                                          {isLoadingImage ? (
                                            <div
                                              className="spinner-border spinner-border-sm"
                                              role="status"
                                              aria-hidden="true"
                                              style={{
                                                width: "12px",
                                                height: "12px",
                                              }}
                                            ></div>
                                          ) : (
                                            <Icon
                                              icon="lucide:eye"
                                              width="14"
                                              height="14"
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
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

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
                    This image failed to load. It might be too large or
                    corrupted.
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
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              zIndex: 10000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(4px)",
            },
            content: {
              position: "relative",
              top: "auto",
              left: "auto",
              right: "auto",
              bottom: "auto",
              border: "none",
              borderRadius: "16px",
              padding: "0",
              maxWidth: "480px",
              width: "90%",
              maxHeight: "90vh",
              overflow: "hidden",
              background: "white",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              animation: "slideIn 0.3s ease-out",
            },
          }}
        >
          {/* Close button */}
          <button
            onClick={() => setStatusModalIsOpen(false)}
            disabled={isUpdatingStatus}
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              width: "32px",
              height: "32px",
              border: "none",
              borderRadius: "8px",
              background: "transparent",
              color: "#6b7280",
              cursor: isUpdatingStatus ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
              fontSize: "20px",
              zIndex: 1,
            }}
            onMouseEnter={(e) => {
              if (!isUpdatingStatus) {
                e.target.style.background = "#f3f4f6";
                e.target.style.color = "#374151";
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "transparent";
              e.target.style.color = "#6b7280";
            }}
          >
            ×
          </button>

          {/* Modal content */}
          <div style={{ padding: "32px" }}>
            {/* Icon */}
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px",
                boxShadow: "0 10px 25px rgba(16, 185, 129, 0.3)",
              }}
            >
              <Icon
                icon="mdi:check-circle"
                width="36"
                height="36"
                style={{ color: "white" }}
              />
            </div>

            {/* Title */}
            <h4
              style={{
                textAlign: "center",
                marginBottom: "12px",
                fontSize: "24px",
                fontWeight: "600",
                color: "#111827",
              }}
            >
              Update Product Status
            </h4>

            {/* Description */}
            <p
              style={{
                textAlign: "center",
                color: "#6b7280",
                fontSize: "15px",
                marginBottom: "8px",
                lineHeight: "1.6",
              }}
            >
              Choose to approve or reject this product
            </p>

            {/* Product name */}
            <div
              style={{
                textAlign: "center",
                background: "#f9fafb",
                padding: "12px 16px",
                borderRadius: "10px",
                marginBottom: "32px",
                border: "1px solid #e5e7eb",
              }}
            >
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: "600",
                  color: "#111827",
                }}
              >
                {selectedProductForStatus?.product_name}
              </span>
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => handleStatusUpdate("rejected")}
                disabled={isUpdatingStatus}
                style={{
                  flex: 1,
                  padding: "14px 24px",
                  fontSize: "15px",
                  fontWeight: "600",
                  border: "none",
                  borderRadius: "10px",
                  background: isUpdatingStatus
                    ? "#9ca3af"
                    : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                  color: "white",
                  cursor: isUpdatingStatus ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  boxShadow: isUpdatingStatus
                    ? "none"
                    : "0 4px 12px rgba(239, 68, 68, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
                onMouseEnter={(e) => {
                  if (!isUpdatingStatus) {
                    e.target.style.transform = "translateY(-1px)";
                    e.target.style.boxShadow =
                      "0 6px 16px rgba(239, 68, 68, 0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow =
                    "0 4px 12px rgba(239, 68, 68, 0.3)";
                }}
              >
                {isUpdatingStatus ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm"
                      role="status"
                      aria-hidden="true"
                      style={{ width: "16px", height: "16px" }}
                    ></span>
                    <span>Rejecting...</span>
                  </>
                ) : (
                  <>
                    <Icon icon="mdi:close-circle" width="20" height="20" />
                    <span>Reject Product</span>
                  </>
                )}
              </button>
              <button
                onClick={() => handleStatusUpdate("approved")}
                disabled={isUpdatingStatus}
                style={{
                  flex: 1,
                  padding: "14px 24px",
                  fontSize: "15px",
                  fontWeight: "600",
                  border: "none",
                  borderRadius: "10px",
                  background: isUpdatingStatus
                    ? "#9ca3af"
                    : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  color: "white",
                  cursor: isUpdatingStatus ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  boxShadow: isUpdatingStatus
                    ? "none"
                    : "0 4px 12px rgba(16, 185, 129, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
                onMouseEnter={(e) => {
                  if (!isUpdatingStatus) {
                    e.target.style.transform = "translateY(-1px)";
                    e.target.style.boxShadow =
                      "0 6px 16px rgba(16, 185, 129, 0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow =
                    "0 4px 12px rgba(16, 185, 129, 0.3)";
                }}
              >
                {isUpdatingStatus ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm"
                      role="status"
                      aria-hidden="true"
                      style={{ width: "16px", height: "16px" }}
                    ></span>
                    <span>Approving...</span>
                  </>
                ) : (
                  <>
                    <Icon icon="mdi:check" width="20" height="20" />
                    <span>Approve Product</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>

        <ToastContainer />
      </div>
    </div>
  );
};

export default ProcurementTableDataLayer;
