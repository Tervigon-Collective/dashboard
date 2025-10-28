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
    products: [{ product_id: null, selectedVariants: [] }], // Start with one empty product
    orderDate: "",
    deliveryDate: "",
  });

  const [editingRequest, setEditingRequest] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusConfirmModal, setStatusConfirmModal] = useState(false);
  const [requestToUpdate, setRequestToUpdate] = useState(null);

  // To Be Delivered tab state
  const [toBeDeliveredRequests, setToBeDeliveredRequests] = useState([]);
  const [toBeDeliveredLoading, setToBeDeliveredLoading] = useState(true);
  const [toBeDeliveredCurrentPage, setToBeDeliveredCurrentPage] = useState(1);
  const [toBeDeliveredTotalPages, setToBeDeliveredTotalPages] = useState(1);
  const [toBeDeliveredTotalRecords, setToBeDeliveredTotalRecords] = useState(0);

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

  // Load to-be-delivered requests
  const loadToBeDeliveredRequests = async (page = 1) => {
    try {
      setToBeDeliveredLoading(true);
      const result = await purchaseRequestApi.getAllPurchaseRequests(page, 20);

      if (result.success) {
        // Filter only requests with status "to_be_delivered"
        const filteredRequests = result.data.filter(
          (request) => request.status === "to_be_delivered"
        );
        setToBeDeliveredRequests(filteredRequests);
        setToBeDeliveredCurrentPage(result.pagination.page);
        setToBeDeliveredTotalPages(result.pagination.totalPages);
        setToBeDeliveredTotalRecords(filteredRequests.length);
      }
    } catch (error) {
      console.error("Error loading to-be-delivered requests:", error);
    } finally {
      setToBeDeliveredLoading(false);
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

  // Load to-be-delivered requests when switching to that tab
  useEffect(() => {
    if (activeTab === "to-be-delivered") {
      loadToBeDeliveredRequests();
    }
  }, [activeTab]);

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

  // Handle product selection - add product to the array
  const handleProductSelect = (productId, index) => {
    const product = products.find((p) => p.product_id === productId);
    if (product) {
      setFormData((prev) => {
        const newProducts = [...prev.products];
        if (index >= 0 && index < newProducts.length) {
          // Update existing product
          newProducts[index] = {
            product_id: productId,
            selectedVariants: [],
          };
        } else {
          // Add new product
          newProducts.push({
            product_id: productId,
            selectedVariants: [],
          });
        }
        return { ...prev, products: newProducts };
      });
    }
  };

  // Add new product entry
  const handleAddProduct = () => {
    setFormData((prev) => ({
      ...prev,
      products: [...prev.products, { product_id: null, selectedVariants: [] }],
    }));
  };

  // Remove product entry
  const handleRemoveProduct = (index) => {
    setFormData((prev) => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index),
    }));
  };

  // Handle variant selection (can select multiple) - now works with product index
  const handleVariantSelect = (variantId, productIndex, allVariants) => {
    setFormData((prev) => {
      const newProducts = [...prev.products];
      const product = newProducts[productIndex];

      if (!product) return prev;

      const variantIndex = product.selectedVariants.findIndex(
        (v) => v.variant_id === variantId
      );

      if (variantIndex >= 0) {
        // Remove if already selected
        product.selectedVariants = product.selectedVariants.filter(
          (v) => v.variant_id !== variantId
        );
      } else {
        // Add to selection
        const variant = allVariants.find((v) => v.variant_id === variantId);
        product.selectedVariants = [
          ...product.selectedVariants,
          { ...variant, quantity: 1 },
        ];
      }

      newProducts[productIndex] = product;
      return { ...prev, products: newProducts };
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Prepare items from all products
      const items = [];
      formData.products.forEach((product) => {
        product.selectedVariants
          .filter((variant) => variant.quantity > 0)
          .forEach((variant) => {
            items.push({
              product_id: product.product_id,
              variant_id: variant.variant_id,
              quantity: variant.quantity || 1,
            });
          });
      });

      // Prepare request data
      const requestData = {
        vendor_id: formData.selectedVendor,
        order_date: formData.orderDate,
        delivery_date: formData.deliveryDate,
        items: items,
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
      products: [{ product_id: null, selectedVariants: [] }],
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

    // Group items by product_id and build products array
    const productsMap = {};
    request.items.forEach((item) => {
      if (!productsMap[item.product_id]) {
        productsMap[item.product_id] = [];
      }
      productsMap[item.product_id].push({
        variant_id: item.variant_id,
        quantity: item.quantity || 1,
        ...item, // Spread item to get all variant details
      });
    });

    // Convert map to array
    const productsArray = Object.keys(productsMap).map((productId) => ({
      product_id: parseInt(productId),
      selectedVariants: productsMap[productId],
    }));

    // Set form data from the request
    setFormData({
      selectedVendor: request.vendor_id,
      products: productsArray,
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

  // Handle settings icon click (open status confirmation modal)
  const handleSettingsClick = (request) => {
    setRequestToUpdate(request);
    setStatusConfirmModal(true);
  };

  // Handle status update confirmation
  const handleStatusUpdateConfirm = async () => {
    if (!requestToUpdate) return;

    try {
      const result = await purchaseRequestApi.updateStatus(
        requestToUpdate.request_id,
        "to_be_delivered"
      );

      if (result.success) {
        // Close modal
        setStatusConfirmModal(false);
        setRequestToUpdate(null);

        // Switch to TO BE DELIVERED tab
        setActiveTab("to-be-delivered");

        // Reload purchase requests
        await loadPurchaseRequests(currentPage);
        // Also reload to-be-delivered requests
        await loadToBeDeliveredRequests();

        console.log("Purchase request status updated successfully");
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error("Error updating purchase request status:", error);
      alert("Failed to update purchase request status. Please try again.");
    }
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
              handleAddProduct={handleAddProduct}
              handleRemoveProduct={handleRemoveProduct}
              handleSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              handleModalClose={handleModalClose}
              handleEditRequest={handleEditRequest}
              handleDeleteRequest={handleDeleteRequest}
              handleViewRequest={handleViewRequest}
              handleSettingsClick={handleSettingsClick}
              isEditMode={isEditMode}
              viewModalOpen={viewModalOpen}
              setViewModalOpen={setViewModalOpen}
              selectedRequest={selectedRequest}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
            />
          )}
          {activeTab === "to-be-delivered" && (
            <ToBeDeliveredTab
              requests={toBeDeliveredRequests}
              isLoading={toBeDeliveredLoading}
              currentPage={toBeDeliveredCurrentPage}
              totalPages={toBeDeliveredTotalPages}
              totalRecords={toBeDeliveredTotalRecords}
              loadToBeDeliveredRequests={loadToBeDeliveredRequests}
              handleViewRequest={handleViewRequest}
              viewModalOpen={viewModalOpen}
              setViewModalOpen={setViewModalOpen}
              selectedRequest={selectedRequest}
            />
          )}
          {activeTab === "receipt-details" && (
            <div>{/* Receipt Details content will go here */}</div>
          )}
        </div>

        {/* View Purchase Request Modal - Shared by both tabs */}
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
                  {selectedRequest.items &&
                    selectedRequest.items.length > 0 && (
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
                                  <td className="small">
                                    {item.product_name || "-"}
                                  </td>
                                  <td className="small">
                                    {item.hsn_code || "-"}
                                  </td>
                                  <td className="small">
                                    {item.variant_display_name || "-"}
                                  </td>
                                  <td className="small">{item.sku || "-"}</td>
                                  <td className="small">
                                    {item.quantity || 0}
                                  </td>
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

        {/* Status Update Confirmation Modal (Procurement-style UI) */}
        {statusConfirmModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1050,
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "520px",
                background: "white",
                borderRadius: "12px",
                boxShadow:
                  "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
                position: "relative",
              }}
            >
              {/* Close button */}
              <button
                onClick={() => {
                  setStatusConfirmModal(false);
                  setRequestToUpdate(null);
                }}
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
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s",
                  fontSize: "20px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f3f4f6";
                  e.currentTarget.style.color = "#374151";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#6b7280";
                }}
                aria-label="Close"
              >
                ×
              </button>

              {/* Content */}
              <div style={{ padding: "28px" }}>
                {/* Icon */}
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "10px",
                    background: "#eef2ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#4f46e5",
                    marginBottom: "16px",
                  }}
                >
                  <Icon icon="mdi:cog" width="22" height="22" />
                </div>

                {/* Title */}
                <h5
                  style={{
                    margin: 0,
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#111827",
                  }}
                >
                  Change Request Status
                </h5>

                {/* Description */}
                <p
                  style={{
                    marginTop: "8px",
                    marginBottom: "20px",
                    color: "#4b5563",
                  }}
                >
                  Are you sure you want to move this purchase request to
                  <span style={{ fontWeight: 600 }}> TO BE DELIVERED</span>?
                </p>

                {/* Buttons */}
                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    onClick={() => {
                      setStatusConfirmModal(false);
                      setRequestToUpdate(null);
                    }}
                    style={{
                      flex: 1,
                      padding: "12px 18px",
                      fontSize: "15px",
                      fontWeight: 600,
                      border: "1px solid #e5e7eb",
                      borderRadius: "10px",
                      background: "white",
                      color: "#374151",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#f9fafb";
                      e.currentTarget.style.borderColor = "#d1d5db";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "white";
                      e.currentTarget.style.borderColor = "#e5e7eb";
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleStatusUpdateConfirm}
                    style={{
                      flex: 1,
                      padding: "12px 18px",
                      fontSize: "15px",
                      fontWeight: 600,
                      border: "none",
                      borderRadius: "10px",
                      background: "#4f46e5",
                      color: "white",
                      cursor: "pointer",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#4338ca";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#4f46e5";
                    }}
                  >
                    Yes, Change Status
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
  handleAddProduct,
  handleRemoveProduct,
  handleSubmit,
  isSubmitting,
  handleModalClose,
  handleEditRequest,
  handleDeleteRequest,
  handleViewRequest,
  handleSettingsClick,
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
                        <button
                          className="btn btn-sm"
                          style={{
                            border: "none",
                            background: "none",
                            padding: "4px",
                            color: "#6c757d",
                          }}
                          title="Settings"
                          onClick={() => handleSettingsClick(request)}
                        >
                          <Icon icon="mdi:cog" width="16" height="16" />
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
          vendors={vendors}
          products={products}
          handleVendorSelect={handleVendorSelect}
          handleProductSelect={handleProductSelect}
          handleVariantSelect={handleVariantSelect}
          handleAddProduct={handleAddProduct}
          handleRemoveProduct={handleRemoveProduct}
          handleSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          handleModalClose={handleModalClose}
          isEditMode={isEditMode}
        />
      )}
    </>
  );
};

const PurchaseRequestModal = ({
  formData,
  setFormData,
  vendorData,
  vendors,
  products,
  handleVendorSelect,
  handleProductSelect,
  handleVariantSelect,
  handleAddProduct,
  handleRemoveProduct,
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

              {/* Product Section - Multiple Products */}
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-semibold mb-0">Product Details</h6>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary d-inline-flex align-items-center"
                    onClick={handleAddProduct}
                    style={{ gap: "4px" }}
                  >
                    <Icon icon="lucide:plus" width="14" height="14" />
                    Add Product
                  </button>
                </div>

                {formData.products.map((productEntry, productIndex) => {
                  const selectedProduct = products.find(
                    (p) => p.product_id === productEntry.product_id
                  );
                  const productVariants = selectedProduct?.variants || [];

                  return (
                    <div
                      key={productIndex}
                      className="border rounded p-3 mb-3"
                      style={{ backgroundColor: "#f8f9fa" }}
                    >
                      {/* Product Header */}
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="fw-semibold mb-0">
                          Product #{productIndex + 1}
                        </h6>
                        {formData.products.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => handleRemoveProduct(productIndex)}
                          >
                            <Icon icon="mdi:delete" width="16" height="16" />
                          </button>
                        )}
                      </div>

                      {/* Product Name Dropdown */}
                      <div className="row mb-3">
                        <div className="col-md-12">
                          <label className="form-label">
                            Product Name <span className="text-danger">*</span>
                          </label>
                          <select
                            className="form-select"
                            value={productEntry.product_id || ""}
                            onChange={(e) =>
                              handleProductSelect(
                                parseInt(e.target.value),
                                productIndex
                              )
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
                      </div>

                      {/* HSN Code */}
                      {selectedProduct && (
                        <div className="row mb-3">
                          <div className="col-md-12">
                            <label className="form-label">HSN Code</label>
                            <input
                              type="text"
                              className="form-control"
                              value={selectedProduct.hsn_code || ""}
                              disabled
                            />
                          </div>
                        </div>
                      )}

                      {/* Variants Selection */}
                      {selectedProduct && productVariants.length > 0 && (
                        <div>
                          <label className="form-label">Product Variants</label>
                          <div
                            className="border rounded p-3"
                            style={{ backgroundColor: "white" }}
                          >
                            {productVariants.map((variant) => {
                              const isSelected =
                                productEntry.selectedVariants.some(
                                  (v) => v.variant_id === variant.variant_id
                                );
                              const selectedVariant =
                                productEntry.selectedVariants.find(
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
                                          handleVariantSelect(
                                            variant.variant_id,
                                            productIndex,
                                            productVariants
                                          )
                                        }
                                      />
                                      <label className="form-check-label">
                                        {variant.variant_display_name || "N/A"}
                                        {variant.sku &&
                                          ` (SKU: ${variant.sku})`}
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
                                          const qty =
                                            parseInt(e.target.value) || "";
                                          setFormData((prev) => {
                                            const newProducts = [
                                              ...prev.products,
                                            ];
                                            const product = {
                                              ...newProducts[productIndex],
                                            };
                                            product.selectedVariants =
                                              product.selectedVariants.map(
                                                (v) =>
                                                  v.variant_id ===
                                                  variant.variant_id
                                                    ? { ...v, quantity: qty }
                                                    : v
                                              );
                                            newProducts[productIndex] = product;
                                            return {
                                              ...prev,
                                              products: newProducts,
                                            };
                                          });
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
                  );
                })}
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
                    formData.products.length === 0 ||
                    formData.products.every(
                      (product) =>
                        !product.product_id ||
                        product.selectedVariants.length === 0 ||
                        product.selectedVariants.every(
                          (v) => !v.quantity || v.quantity === 0
                        )
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

// To Be Delivered Tab Component
const ToBeDeliveredTab = ({
  requests,
  isLoading,
  currentPage,
  totalPages,
  totalRecords,
  loadToBeDeliveredRequests,
  handleViewRequest,
  viewModalOpen,
  setViewModalOpen,
  selectedRequest,
}) => {
  return (
    <>
      {/* Table */}
      <div
        className="border rounded overflow-hidden"
        style={{ backgroundColor: "white" }}
      >
        <div className="table-responsive">
          <table className="table mb-0">
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
                  Sr No
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
                  Operate
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="text-center py-4">
                    <div className="d-flex justify-content-center align-items-center">
                      <div
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                      >
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      Loading delivery requests...
                    </div>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-muted">
                    <div className="d-flex flex-column align-items-center">
                      <Icon
                        icon="mdi:truck-delivery"
                        width="48"
                        height="48"
                        className="text-muted mb-2"
                      />
                      No delivery requests found.
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map((request, index) => (
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
                onClick={() => loadToBeDeliveredRequests(currentPage - 1)}
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
                      onClick={() => loadToBeDeliveredRequests(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                className="btn btn-sm"
                style={{ border: "none", background: "none", color: "#495057" }}
                onClick={() => loadToBeDeliveredRequests(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <Icon icon="mdi:chevron-right" width="16" height="16" />
              </button>
            </div>

            <div style={{ fontSize: "14px", color: "#6c757d" }}>
              Showing <strong>{requests.length}</strong> of{" "}
              <strong>{totalRecords}</strong> requests
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ReceivingManagementPage;
