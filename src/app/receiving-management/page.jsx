"use client";
import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import Breadcrumb from "../../components/Breadcrumb";
import MasterLayout from "../../masterLayout/MasterLayout";
import SidebarPermissionGuard from "../../components/SidebarPermissionGuard";
import purchaseRequestApi from "../../services/purchaseRequestApi";
import vendorMasterApi from "../../services/vendorMasterApi";
import productMasterApi from "../../services/productMasterApi";

const ReceivingManagementLayer = () => {
  const [activeTab, setActiveTab] = useState("purchase-request");
  const [modalOpen, setModalOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [formData, setFormData] = useState({
    selectedVendor: null,
    selectedProduct: null,
    selectedVariants: [],
    orderDate: "",
    deliveryDate: "",
  });

  const [editingRequest, setEditingRequest] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Vendor form fields (auto-filled from dropdown)
  const [vendorData, setVendorData] = useState({
    vendorName: "",
    vendorPhoneNo: "",
    vendorGSTNumber: "",
    vendorAddress: "",
  });

  // Product form fields (auto-filled from dropdown)
  const [productData, setProductData] = useState({
    productName: "",
    hsnCode: "",
    variants: [],
  });

  // Load purchase requests
  const loadPurchaseRequests = async (page = 1) => {
    try {
      setIsLoading(true);
      const result = await purchaseRequestApi.getAllPurchaseRequests(page, 20);

      if (result.success) {
        setRequests(result.data);
        setCurrentPage(result.pagination.page);
        setTotalPages(result.pagination.totalPages);
        setTotalRecords(result.pagination.total);
      }
    } catch (error) {
      console.error("Error loading purchase requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load vendors for dropdown
  const loadVendors = async () => {
    try {
      const result = await vendorMasterApi.getAllVendors(1, 100);
      if (result.success) {
        setVendors(result.data);
      }
    } catch (error) {
      console.error("Error loading vendors:", error);
      // Set empty array to prevent errors
      setVendors([]);
    }
  };

  // Load products for dropdown
  const loadProducts = async () => {
    try {
      const result = await productMasterApi.getAllProducts(1, 100);
      if (result.success) {
        setProducts(result.data);
      }
    } catch (error) {
      console.error("Error loading products:", error);
      // Set empty array to prevent errors
      setProducts([]);
    }
  };

  useEffect(() => {
    loadPurchaseRequests();
    loadVendors();
    loadProducts();
  }, []);

  // Handle vendor selection
  const handleVendorSelect = (vendorId) => {
    const vendor = vendors.find((v) => v.vendor_id === vendorId);
    if (vendor) {
      setFormData({ ...formData, selectedVendor: vendorId });
      setVendorData({
        vendorName: vendor.vendor_name,
        vendorPhoneNo: vendor.vendor_phone_no,
        vendorGSTNumber: vendor.vendor_gst_number,
        vendorAddress: vendor.vendor_address,
      });
    }
  };

  // Handle product selection
  const handleProductSelect = (productId) => {
    const product = products.find((p) => p.product_id === productId);
    if (product) {
      setFormData({ ...formData, selectedProduct: productId });
      setProductData({
        productName: product.product_name,
        hsnCode: product.hsn_code,
        variants: product.variants || [],
      });
      // Reset variant selections
      setFormData((prev) => ({ ...prev, selectedVariants: [] }));
    }
  };

  // Handle variant selection (can select multiple)
  const handleVariantSelect = (variantId) => {
    setFormData((prev) => {
      const variantIndex = prev.selectedVariants.findIndex(
        (v) => v.variant_id === variantId
      );

      if (variantIndex >= 0) {
        // Remove if already selected
        return {
          ...prev,
          selectedVariants: prev.selectedVariants.filter(
            (v) => v.variant_id !== variantId
          ),
        };
      } else {
        // Add to selection
        const variant = productData.variants.find(
          (v) => v.variant_id === variantId
        );
        return {
          ...prev,
          selectedVariants: [
            ...prev.selectedVariants,
            { ...variant, quantity: 1 },
          ],
        };
      }
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Prepare request data
      const requestData = {
        vendor_id: formData.selectedVendor,
        order_date: formData.orderDate,
        delivery_date: formData.deliveryDate,
        items: formData.selectedVariants
          .filter((variant) => variant.quantity > 0)
          .map((variant) => ({
            product_id: formData.selectedProduct,
            variant_id: variant.variant_id,
            quantity: variant.quantity || 1,
          })),
      };

      let result;
      // Check if we're in edit mode
      if (isEditMode && editingRequest) {
        // Update existing purchase request
        result = await purchaseRequestApi.updatePurchaseRequest(
          editingRequest.request_id,
          requestData
        );
      } else {
        // Create new purchase request
        result = await purchaseRequestApi.createPurchaseRequest(requestData);
      }

      if (result.success) {
        // Reset form
        setFormData({
          selectedVendor: null,
          selectedProduct: null,
          selectedVariants: [],
          orderDate: "",
          deliveryDate: "",
        });
        setVendorData({
          vendorName: "",
          vendorPhoneNo: "",
          vendorGSTNumber: "",
          vendorAddress: "",
        });
        setProductData({
          productName: "",
          hsnCode: "",
          variants: [],
        });

        setModalOpen(false);
        setIsEditMode(false);
        setEditingRequest(null);
        await loadPurchaseRequests(currentPage);

        console.log(
          `Purchase request ${
            isEditMode ? "updated" : "created"
          } successfully:`,
          result.data
        );
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error(
        `Error ${isEditMode ? "updating" : "creating"} purchase request:`,
        error
      );
      alert(
        `Failed to ${
          isEditMode ? "update" : "create"
        } purchase request. Please try again.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setIsEditMode(false);
    setEditingRequest(null);
    setFormData({
      selectedVendor: null,
      selectedProduct: null,
      selectedVariants: [],
      orderDate: "",
      deliveryDate: "",
    });
    setVendorData({
      vendorName: "",
      vendorPhoneNo: "",
      vendorGSTNumber: "",
      vendorAddress: "",
    });
    setProductData({
      productName: "",
      hsnCode: "",
      variants: [],
    });
  };

  // Handle edit purchase request
  const handleEditRequest = (request) => {
    setEditingRequest(request);
    setIsEditMode(true);

    // Set form data from the request
    setFormData({
      selectedVendor: request.vendor_id,
      selectedProduct: request.items[0]?.product_id || null,
      selectedVariants: request.items.map((item) => ({
        variant_id: item.variant_id,
        quantity: item.quantity || 1,
        ...item, // Spread item to get all variant details
      })),
      // Parse dates - handle timezone properly
      // PostgreSQL returns dates as ISO strings with timezone
      // Split on 'T' to get just the date part (YYYY-MM-DD)
      orderDate: request.order_date ? request.order_date.split("T")[0] : "",
      deliveryDate: request.delivery_date
        ? request.delivery_date.split("T")[0]
        : "",
    });

    // Set vendor data
    setVendorData({
      vendorName: request.vendor_name,
      vendorPhoneNo: request.vendor_phone_no,
      vendorGSTNumber: request.vendor_gst_number,
      vendorAddress: request.vendor_address,
    });

    // Set product data
    if (request.items && request.items.length > 0) {
      const firstItem = request.items[0];
      const product = products.find(
        (p) => p.product_id === firstItem.product_id
      );
      if (product) {
        setProductData({
          productName: product.product_name,
          hsnCode: product.hsn_code,
          variants: product.variants || [],
        });
      }
    }

    setModalOpen(true);
  };

  // Handle delete purchase request
  const handleDeleteRequest = async (request) => {
    if (
      window.confirm(`Are you sure you want to delete this purchase request?`)
    ) {
      try {
        const result = await purchaseRequestApi.deletePurchaseRequest(
          request.request_id
        );

        if (result.success) {
          await loadPurchaseRequests(currentPage);
          console.log("Purchase request deleted successfully");
        } else {
          alert(`Error: ${result.message}`);
        }
      } catch (error) {
        console.error("Error deleting purchase request:", error);
        alert("Failed to delete purchase request. Please try again.");
      }
    }
  };

  // Handle view purchase request
  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    setViewModalOpen(true);
  };

  const tabs = [
    {
      id: "purchase-request",
      label: "PURCHASE REQUEST",
      icon: "mdi:file-document-outline",
    },
    {
      id: "to-be-delivered",
      label: "TO BE DELIVERED",
      icon: "mdi:truck-delivery",
    },
    {
      id: "receipt-details",
      label: "RECEIPT DETAILS",
      icon: "mdi:file-cabinet",
    },
  ];

  return (
    <div className="card h-100 radius-8 border">
      <div className="card-body p-24">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-20">
          <div className="d-flex align-items-center">
            <h6 className="mb-0 me-2">Receiving Management</h6>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="d-flex gap-4 mb-4 border-bottom pb-0">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`d-flex align-items-center gap-2 px-3 py-2 cursor-pointer position-relative ${
                activeTab === tab.id ? "text-primary" : "text-muted"
              }`}
              onClick={() => setActiveTab(tab.id)}
              style={{ cursor: "pointer" }}
            >
              <Icon icon={tab.icon} className="icon" />
              <span className="fw-medium">{tab.label}</span>
              {activeTab === tab.id && (
                <div
                  className="position-absolute bottom-0 start-0 end-0"
                  style={{
                    height: "2px",
                    backgroundColor: "#0d6efd",
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === "purchase-request" && (
            <PurchaseRequestTab
              modalOpen={modalOpen}
              setModalOpen={setModalOpen}
              requests={requests}
              isLoading={isLoading}
              currentPage={currentPage}
              totalPages={totalPages}
              totalRecords={totalRecords}
              loadPurchaseRequests={loadPurchaseRequests}
              vendors={vendors}
              products={products}
              formData={formData}
              setFormData={setFormData}
              vendorData={vendorData}
              productData={productData}
              setVendorData={setVendorData}
              setProductData={setProductData}
              handleVendorSelect={handleVendorSelect}
              handleProductSelect={handleProductSelect}
              handleVariantSelect={handleVariantSelect}
              handleSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              handleModalClose={handleModalClose}
              handleEditRequest={handleEditRequest}
              handleDeleteRequest={handleDeleteRequest}
              handleViewRequest={handleViewRequest}
              isEditMode={isEditMode}
              viewModalOpen={viewModalOpen}
              setViewModalOpen={setViewModalOpen}
              selectedRequest={selectedRequest}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
            />
          )}
          {activeTab === "to-be-delivered" && (
            <div>{/* To Be Delivered content will go here */}</div>
          )}
          {activeTab === "receipt-details" && (
            <div>{/* Receipt Details content will go here */}</div>
          )}
        </div>
      </div>
    </div>
  );
};

const PurchaseRequestTab = ({
  modalOpen,
  setModalOpen,
  requests,
  isLoading,
  currentPage,
  totalPages,
  totalRecords,
  loadPurchaseRequests,
  vendors,
  products,
  formData,
  setFormData,
  vendorData,
  productData,
  setVendorData,
  setProductData,
  handleVendorSelect,
  handleProductSelect,
  handleVariantSelect,
  handleSubmit,
  isSubmitting,
  handleModalClose,
  handleEditRequest,
  handleDeleteRequest,
  handleViewRequest,
  isEditMode,
  viewModalOpen,
  setViewModalOpen,
  selectedRequest,
  searchTerm,
  setSearchTerm,
}) => {
  return (
    <>
      {/* Action Buttons and Search */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex gap-2 align-items-center">
          <button
            onClick={() => setModalOpen(true)}
            className="btn btn-sm btn-primary d-inline-flex align-items-center"
            style={{ gap: "6px", padding: "6px 12px" }}
          >
            <Icon icon="lucide:plus" width="18" height="18" />
          </button>
        </div>
        <div
          className="d-flex align-items-center"
          style={{ maxWidth: "300px" }}
        >
          <Icon
            icon="mdi:magnify"
            className="me-2"
            style={{ color: "#6c757d" }}
          />
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Search by vendor or product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Requests Table */}
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
                Vendor Name
              </th>
              <th
                style={{
                  border: "none",
                  padding: "12px 16px",
                  fontWeight: "600",
                  color: "#495057",
                }}
              >
                Order Date
              </th>
              <th
                style={{
                  border: "none",
                  padding: "12px 16px",
                  fontWeight: "600",
                  color: "#495057",
                }}
              >
                Delivery Date
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
                Operate
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="7" className="text-center py-4">
                  <div className="d-flex justify-content-center align-items-center">
                    <div
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                    >
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    Loading purchase requests...
                  </div>
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-4 text-muted">
                  <div className="d-flex flex-column align-items-center">
                    <Icon
                      icon="mdi:file-document-outline"
                      width="48"
                      height="48"
                      className="text-muted mb-2"
                    />
                    No purchase requests found. Click "+" to create one.
                  </div>
                </td>
              </tr>
            ) : (
              requests
                .filter((request) => {
                  if (!searchTerm) return true;
                  const search = searchTerm.toLowerCase();

                  // Search by vendor name
                  if (request.vendor_name?.toLowerCase().includes(search)) {
                    return true;
                  }

                  // Search by product names
                  if (request.items && request.items.length > 0) {
                    return request.items.some((item) =>
                      item.product_name?.toLowerCase().includes(search)
                    );
                  }

                  return false;
                })
                .map((request, index) => (
                  <tr
                    key={request.request_id}
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
                      {request.vendor_name || "-"}
                    </td>
                    <td
                      style={{
                        border: "none",
                        padding: "12px 16px",
                        color: "#495057",
                      }}
                    >
                      {new Date(request.order_date).toLocaleDateString()}
                    </td>
                    <td
                      style={{
                        border: "none",
                        padding: "12px 16px",
                        color: "#495057",
                      }}
                    >
                      {new Date(request.delivery_date).toLocaleDateString()}
                    </td>
                    <td
                      style={{
                        border: "none",
                        padding: "12px 16px",
                        color: "#495057",
                      }}
                    >
                      {request.items && request.items.length > 0
                        ? [
                            ...new Set(
                              request.items.map((item) => item.product_name)
                            ),
                          ].join(", ")
                        : "-"}
                    </td>
                    <td
                      style={{
                        border: "none",
                        padding: "12px 16px",
                        color: "#495057",
                      }}
                    >
                      {request.items && request.items.length > 0
                        ? [
                            ...new Set(
                              request.items.map((item) => item.hsn_code)
                            ),
                          ].join(", ")
                        : "-"}
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
                            color: "#0d6efd",
                          }}
                          title="View"
                          onClick={() => handleViewRequest(request)}
                        >
                          <Icon icon="mdi:eye" width="16" height="16" />
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{
                            border: "none",
                            background: "none",
                            padding: "4px",
                            color: "#495057",
                          }}
                          title="Edit"
                          onClick={() => handleEditRequest(request)}
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
                          onClick={() => handleDeleteRequest(request)}
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
              onClick={() => loadPurchaseRequests(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <Icon icon="mdi:chevron-left" width="16" height="16" />
            </button>

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
                    onClick={() => loadPurchaseRequests(pageNum)}
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
                        totalPages === currentPage ? "#6f42c1" : "transparent",
                      color: totalPages === currentPage ? "white" : "#495057",
                      borderRadius: "4px",
                      padding: "4px 8px",
                      minWidth: "32px",
                    }}
                    onClick={() => loadPurchaseRequests(totalPages)}
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>

            <button
              className="btn btn-sm"
              style={{ border: "none", background: "none", color: "#495057" }}
              onClick={() => loadPurchaseRequests(currentPage + 1)}
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

      {/* Add Purchase Request Modal */}
      {modalOpen && (
        <PurchaseRequestModal
          formData={formData}
          setFormData={setFormData}
          vendorData={vendorData}
          productData={productData}
          vendors={vendors}
          products={products}
          handleVendorSelect={handleVendorSelect}
          handleProductSelect={handleProductSelect}
          handleVariantSelect={handleVariantSelect}
          selectedVariants={formData.selectedVariants}
          handleSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          handleModalClose={handleModalClose}
          isEditMode={isEditMode}
        />
      )}

      {/* View Purchase Request Modal */}
      {viewModalOpen && selectedRequest && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <Icon icon="mdi:file-document" className="me-2" />
                  Purchase Request Details
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setViewModalOpen(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row mb-4">
                  <div className="col-md-6">
                    <h6 className="text-muted mb-3">Vendor Information</h6>
                    <div className="d-flex flex-column gap-2">
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Vendor Name:</span>
                        <span className="fw-medium">
                          {selectedRequest.vendor_name}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Phone No.:</span>
                        <span className="fw-medium">
                          {selectedRequest.vendor_phone_no}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">GST Number:</span>
                        <span className="fw-medium">
                          {selectedRequest.vendor_gst_number}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Address:</span>
                        <span className="fw-medium">
                          {selectedRequest.vendor_address}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-muted mb-3">Delivery Information</h6>
                    <div className="d-flex flex-column gap-2">
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Order Date:</span>
                        <span className="fw-medium">
                          {new Date(
                            selectedRequest.order_date
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Delivery Date:</span>
                        <span className="fw-medium">
                          {new Date(
                            selectedRequest.delivery_date
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Status:</span>
                        <span
                          className={`badge ${
                            selectedRequest.status === "Pending"
                              ? "bg-warning"
                              : selectedRequest.status === "Completed"
                              ? "bg-success"
                              : "bg-secondary"
                          }`}
                        >
                          {selectedRequest.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                {selectedRequest.items && selectedRequest.items.length > 0 && (
                  <div className="mb-3">
                    <h6 className="text-muted mb-3">Product Items</h6>
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered">
                        <thead className="table-light">
                          <tr>
                            <th className="small">Product Name</th>
                            <th className="small">HSN Code</th>
                            <th className="small">Variant</th>
                            <th className="small">SKU</th>
                            <th className="small">Quantity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedRequest.items.map((item, index) => (
                            <tr key={index}>
                              <td className="small fw-medium">
                                {item.product_name}
                              </td>
                              <td className="small">{item.hsn_code}</td>
                              <td className="small">
                                {item.variant_display_name || "-"}
                              </td>
                              <td className="small">{item.sku || "-"}</td>
                              <td className="small">{item.quantity || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setViewModalOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const PurchaseRequestModal = ({
  formData,
  setFormData,
  vendorData,
  productData,
  vendors,
  products,
  handleVendorSelect,
  handleProductSelect,
  handleVariantSelect,
  selectedVariants,
  handleSubmit,
  isSubmitting,
  handleModalClose,
  isEditMode,
}) => {
  return (
    <div
      className="modal show d-block"
      tabIndex="-1"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <Icon icon="mdi:file-document" className="me-2" />
              {isEditMode ? "Edit Purchase Request" : "Add Purchase Request"}
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={handleModalClose}
            ></button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit}>
              {/* Vendor Section */}
              <div className="mb-4">
                <h6 className="fw-semibold mb-3">Vendor Details</h6>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">
                      Vendor Name <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={formData.selectedVendor || ""}
                      onChange={(e) =>
                        handleVendorSelect(parseInt(e.target.value))
                      }
                      required
                    >
                      <option value="">Select vendor...</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.vendor_id} value={vendor.vendor_id}>
                          {vendor.vendor_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Vendor Phone No.</label>
                    <input
                      type="text"
                      className="form-control"
                      value={vendorData.vendorPhoneNo}
                      disabled
                    />
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Vendor GST Number</label>
                    <input
                      type="text"
                      className="form-control"
                      value={vendorData.vendorGSTNumber}
                      disabled
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Vendor Address</label>
                    <input
                      type="text"
                      className="form-control"
                      value={vendorData.vendorAddress}
                      disabled
                    />
                  </div>
                </div>
              </div>

              {/* Product Section */}
              <div className="mb-4">
                <h6 className="fw-semibold mb-3">Product Details</h6>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">
                      Product Name <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={formData.selectedProduct || ""}
                      onChange={(e) =>
                        handleProductSelect(parseInt(e.target.value))
                      }
                      required
                    >
                      <option value="">Select product...</option>
                      {products.map((product) => (
                        <option
                          key={product.product_id}
                          value={product.product_id}
                        >
                          {product.product_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">HSN Code</label>
                    <input
                      type="text"
                      className="form-control"
                      value={productData.hsnCode}
                      disabled
                    />
                  </div>
                </div>

                {/* Variants Selection */}
                {productData.variants && productData.variants.length > 0 && (
                  <div className="mb-3">
                    <label className="form-label">Product Variants</label>
                    <div
                      className="border rounded p-3"
                      style={{ backgroundColor: "#f8f9fa" }}
                    >
                      {productData.variants.map((variant) => {
                        const isSelected = selectedVariants.some(
                          (v) => v.variant_id === variant.variant_id
                        );
                        const selectedVariant = selectedVariants.find(
                          (v) => v.variant_id === variant.variant_id
                        );
                        const quantity = selectedVariant?.quantity || "";

                        return (
                          <div
                            key={variant.variant_id}
                            className="row mb-2 align-items-center"
                          >
                            <div className="col-md-6">
                              <div className="form-check">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() =>
                                    handleVariantSelect(variant.variant_id)
                                  }
                                />
                                <label className="form-check-label">
                                  {variant.variant_display_name || "N/A"}
                                  {variant.sku && ` (SKU: ${variant.sku})`}
                                </label>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="col-md-6">
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  placeholder="Quantity"
                                  min="0"
                                  value={quantity}
                                  onChange={(e) => {
                                    const qty = parseInt(e.target.value) || "";
                                    const updatedVariants =
                                      selectedVariants.map((v) =>
                                        v.variant_id === variant.variant_id
                                          ? { ...v, quantity: qty }
                                          : v
                                      );
                                    setFormData((prev) => ({
                                      ...prev,
                                      selectedVariants: updatedVariants,
                                    }));
                                  }}
                                  required
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Delivery Details */}
              <div className="mb-3">
                <h6 className="fw-semibold mb-3">Delivery Details</h6>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">
                      Order Date <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.orderDate}
                      onChange={(e) =>
                        setFormData({ ...formData, orderDate: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">
                      Delivery Date <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.deliveryDate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          deliveryDate: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>
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
                  disabled={
                    isSubmitting ||
                    selectedVariants.length === 0 ||
                    selectedVariants.every(
                      (v) => !v.quantity || v.quantity === 0
                    )
                  }
                >
                  {isSubmitting ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      {isEditMode ? "Updating..." : "Creating..."}
                    </>
                  ) : isEditMode ? (
                    "Update Request"
                  ) : (
                    "Create Request"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

const ReceivingManagementPage = () => {
  return (
    <>
      <SidebarPermissionGuard requiredSidebar="receivingManagement">
        {/* MasterLayout */}
        <MasterLayout>
          {/* Breadcrumb */}
          <Breadcrumb title="Components / Receiving Management" />

          {/* ReceivingManagementLayer */}
          <ReceivingManagementLayer />
        </MasterLayout>
      </SidebarPermissionGuard>
    </>
  );
};

export default ReceivingManagementPage;
