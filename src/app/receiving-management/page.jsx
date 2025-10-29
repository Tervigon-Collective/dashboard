"use client";
import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import Breadcrumb from "../../components/Breadcrumb";
import MasterLayout from "../../masterLayout/MasterLayout";
import SidebarPermissionGuard from "../../components/SidebarPermissionGuard";
import purchaseRequestApi from "../../services/purchaseRequestApi";
import vendorMasterApi from "../../services/vendorMasterApi";
import productMasterApi from "../../services/productMasterApi";
import qualityCheckApi from "../../services/qualityCheckApi";

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

  // Receipt Details Tab Component (one row per request, aggregated totals)
  const ReceiptDetailsTab = ({
    requests,
    isLoading,
    currentPage,
    totalPages,
    totalRecords,
    loadReceiptDetailsRequests,
    handleViewRequest,
    viewModalOpen,
    setViewModalOpen,
    selectedRequest,
  }) => {
    return (
      <>
        {/* Card */}
        <div className="card basic-data-table">
          <div className="card-header d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-2">
            <h5 className="card-title mb-0">Receipt Details</h5>
          </div>

          <div className="card-body">
            {/* Table */}
            <div className="table-responsive">
              <table
                className="table table-hover"
                style={{ fontSize: "clamp(12px, 2.5vw, 14px)" }}
              >
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
                      Sr No
                    </th>
                    <th
                      style={{
                        fontWeight: "600",
                        color: "#374151",
                        padding: "12px",
                      }}
                    >
                      Vendor Name
                    </th>
                    <th
                      style={{
                        fontWeight: "600",
                        color: "#374151",
                        padding: "12px",
                      }}
                    >
                      Order Date
                    </th>
                    <th
                      style={{
                        fontWeight: "600",
                        color: "#374151",
                        padding: "12px",
                      }}
                    >
                      Delivery Date
                    </th>
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
                      Invoice Qty
                    </th>
                    <th
                      style={{
                        fontWeight: "600",
                        color: "#374151",
                        padding: "12px",
                      }}
                    >
                      Sorted Qty
                    </th>
                    <th
                      style={{
                        fontWeight: "600",
                        color: "#374151",
                        padding: "12px",
                      }}
                    >
                      Damage Qty
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
                  {isLoading ? (
                    <tr>
                      <td colSpan="9" className="text-center py-4">
                        <div className="d-flex justify-content-center align-items-center">
                          <div
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                          >
                            <span className="visually-hidden">Loading...</span>
                          </div>
                          Loading receipt details...
                        </div>
                      </td>
                    </tr>
                  ) : requests.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-4">
                        <div className="d-flex flex-column align-items-center">
                          <Icon
                            icon="mdi:file-cabinet"
                            width="48"
                            height="48"
                            className="text-muted mb-2"
                          />
                          <p className="text-muted mb-0">
                            No receipt details found
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    requests.map((request, index) => (
                      <tr key={request.request_id}>
                        <td
                          style={{
                            padding: "clamp(8px, 2vw, 12px)",
                            color: "#374151",
                            fontSize: "clamp(11px, 2.5vw, 14px)",
                          }}
                        >
                          {index + 1}
                        </td>
                        <td
                          style={{
                            padding: "clamp(8px, 2vw, 12px)",
                            color: "#374151",
                            fontSize: "clamp(11px, 2.5vw, 14px)",
                          }}
                        >
                          {request.vendor_name || "-"}
                        </td>
                        <td
                          style={{
                            padding: "clamp(8px, 2vw, 12px)",
                            color: "#374151",
                            fontSize: "clamp(11px, 2.5vw, 14px)",
                          }}
                        >
                          {new Date(request.order_date).toLocaleDateString()}
                        </td>
                        <td
                          style={{
                            padding: "clamp(8px, 2vw, 12px)",
                            color: "#374151",
                            fontSize: "clamp(11px, 2.5vw, 14px)",
                          }}
                        >
                          {new Date(request.delivery_date).toLocaleDateString()}
                        </td>
                        <td
                          style={{
                            padding: "clamp(8px, 2vw, 12px)",
                            color: "#374151",
                            fontSize: "clamp(11px, 2.5vw, 14px)",
                          }}
                        >
                          {request.aggregated?.productNames || "-"}
                        </td>
                        <td
                          style={{
                            padding: "clamp(8px, 2vw, 12px)",
                            color: "#374151",
                            fontSize: "clamp(11px, 2.5vw, 14px)",
                          }}
                        >
                          {request.aggregated?.totalInvoiceQty ?? 0}
                        </td>
                        <td
                          style={{
                            padding: "clamp(8px, 2vw, 12px)",
                            color: "#374151",
                            fontSize: "clamp(11px, 2.5vw, 14px)",
                          }}
                        >
                          {request.aggregated?.totalSortedQty ?? 0}
                        </td>
                        <td
                          style={{
                            padding: "clamp(8px, 2vw, 12px)",
                            color: "#374151",
                            fontSize: "clamp(11px, 2.5vw, 14px)",
                          }}
                        >
                          {request.aggregated?.totalDamageQty ?? 0}
                        </td>
                        <td style={{ padding: "12px" }}>
                          <div className="d-flex flex-wrap gap-1 gap-sm-2">
                            <button
                              className="btn btn-sm"
                              style={{
                                border: "none",
                                background: "none",
                                padding: "4px",
                                color: "#0d6efd",
                              }}
                              title="View"
                              onClick={() =>
                                handleViewRequest(request, "quality-check")
                              }
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

            {/* Pagination - Responsive */}
            {totalRecords > 0 && (
              <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center pt-3 gap-2">
                <div className="d-flex align-items-center gap-2">
                  <button
                    className="btn btn-sm"
                    style={{
                      border: "none",
                      background: "none",
                      color: "#495057",
                    }}
                    onClick={() => loadReceiptDetailsRequests(currentPage - 1)}
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
                              pageNum === currentPage
                                ? "#6f42c1"
                                : "transparent",
                            color:
                              pageNum === currentPage ? "white" : "#495057",
                            borderRadius: "4px",
                            padding: "4px 8px",
                            minWidth: "32px",
                          }}
                          onClick={() => loadReceiptDetailsRequests(pageNum)}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    className="btn btn-sm"
                    style={{
                      border: "none",
                      background: "none",
                      color: "#495057",
                    }}
                    onClick={() => loadReceiptDetailsRequests(currentPage + 1)}
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
        </div>
      </>
    );
  };

  const [editingRequest, setEditingRequest] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusConfirmModal, setStatusConfirmModal] = useState(false);
  const [requestToUpdate, setRequestToUpdate] = useState(null);
  const [statusUpdateTarget, setStatusUpdateTarget] =
    useState("to_be_delivered");

  // Quality Check Inspection Modal state
  const [inspectionModalOpen, setInspectionModalOpen] = useState(false);
  const [requestToInspect, setRequestToInspect] = useState(null);
  const [inspectionData, setInspectionData] = useState([]);
  const [isSavingInspection, setIsSavingInspection] = useState(false);
  const [qualityCheckerName, setQualityCheckerName] = useState("");
  const [inspectionDate, setInspectionDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // To Be Delivered tab state
  const [toBeDeliveredRequests, setToBeDeliveredRequests] = useState([]);
  const [toBeDeliveredLoading, setToBeDeliveredLoading] = useState(true);
  const [toBeDeliveredCurrentPage, setToBeDeliveredCurrentPage] = useState(1);
  const [toBeDeliveredTotalPages, setToBeDeliveredTotalPages] = useState(1);
  const [toBeDeliveredTotalRecords, setToBeDeliveredTotalRecords] = useState(0);

  // Quality Check tab state
  const [qualityCheckRequests, setQualityCheckRequests] = useState([]);
  const [qualityCheckLoading, setQualityCheckLoading] = useState(true);
  const [qualityCheckCurrentPage, setQualityCheckCurrentPage] = useState(1);
  const [qualityCheckTotalPages, setQualityCheckTotalPages] = useState(1);
  const [qualityCheckTotalRecords, setQualityCheckTotalRecords] = useState(0);

  // Receipt Details tab state
  const [receiptRequests, setReceiptRequests] = useState([]);
  const [receiptLoading, setReceiptLoading] = useState(true);
  const [receiptCurrentPage, setReceiptCurrentPage] = useState(1);
  const [receiptTotalPages, setReceiptTotalPages] = useState(1);
  const [receiptTotalRecords, setReceiptTotalRecords] = useState(0);

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

  // Load quality check (arrived) requests
  const loadQualityCheckRequests = async (page = 1) => {
    try {
      setQualityCheckLoading(true);
      const result = await purchaseRequestApi.getAllPurchaseRequests(page, 20);

      if (result.success) {
        // Filter only requests with status "arrived"
        const filteredRequests = result.data.filter(
          (request) => request.status === "arrived"
        );
        setQualityCheckRequests(filteredRequests);
        setQualityCheckCurrentPage(result.pagination.page);
        setQualityCheckTotalPages(result.pagination.totalPages);
        setQualityCheckTotalRecords(filteredRequests.length);
      }
    } catch (error) {
      console.error("Error loading quality check requests:", error);
    } finally {
      setQualityCheckLoading(false);
    }
  };

  // Load receipt details (fulfilled) requests with QC aggregation
  const loadReceiptDetailsRequests = async (page = 1) => {
    try {
      setReceiptLoading(true);
      const result = await purchaseRequestApi.getAllPurchaseRequests(page, 20);

      if (result.success) {
        // Filter only requests with status "fulfilled"
        const fulfilled = result.data.filter(
          (request) => request.status === "fulfilled"
        );

        // For each request, fetch QC items and aggregate totals
        const enriched = await Promise.all(
          fulfilled.map(async (req) => {
            try {
              const qcRes = await qualityCheckApi.getQualityChecksByRequestId(
                req.request_id
              );

              const qcItems = qcRes?.success ? qcRes.data : [];

              // Build a map item_id -> qc
              const itemIdToQc = new Map(qcItems.map((qc) => [qc.item_id, qc]));

              // Aggregate totals
              let totalInvoiceQty = 0;
              let totalSortedQty = 0;
              let totalDamageQty = 0;

              req.items.forEach((item) => {
                const qc = itemIdToQc.get(item.item_id);
                // Invoice qty prefer qc.invoice_quantity else fallback to item.quantity
                totalInvoiceQty +=
                  parseInt(qc?.invoice_quantity ?? item.quantity ?? 0) || 0;
                // Sorted and Damage only from QC
                totalSortedQty += parseInt(qc?.sorted_quantity ?? 0) || 0;
                totalDamageQty += parseInt(qc?.damage_quantity ?? 0) || 0;
              });

              // Unique product names
              const productNames =
                req.items && req.items.length > 0
                  ? [
                      ...new Set(
                        req.items.map((it) => it.product_name).filter(Boolean)
                      ),
                    ].join(", ")
                  : "-";

              return {
                ...req,
                aggregated: {
                  productNames,
                  totalInvoiceQty,
                  totalSortedQty,
                  totalDamageQty,
                },
              };
            } catch (e) {
              // If QC call fails, fallback to invoice from item.quantity
              const productNames =
                req.items && req.items.length > 0
                  ? [
                      ...new Set(
                        req.items.map((it) => it.product_name).filter(Boolean)
                      ),
                    ].join(", ")
                  : "-";
              const totalInvoiceQty = req.items.reduce(
                (sum, it) => sum + (parseInt(it.quantity || 0) || 0),
                0
              );
              return {
                ...req,
                aggregated: {
                  productNames,
                  totalInvoiceQty,
                  totalSortedQty: 0,
                  totalDamageQty: 0,
                },
              };
            }
          })
        );

        setReceiptRequests(enriched);
        setReceiptCurrentPage(result.pagination.page);
        setReceiptTotalPages(result.pagination.totalPages);
        setReceiptTotalRecords(enriched.length);
      }
    } catch (error) {
      console.error("Error loading receipt details:", error);
    } finally {
      setReceiptLoading(false);
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
    if (activeTab === "quality-check") {
      loadQualityCheckRequests();
    }
    if (activeTab === "receipt-details") {
      loadReceiptDetailsRequests();
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
          {
            ...variant,
            quantity: 1,
            ord_qty: 0,
            rate: 0,
            taxable_amt: 0,
            igst_percent: 0,
            sgst_percent: 0,
            cgst_percent: 0,
            gst_amt: 0,
            net_amount: 0,
          },
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
              ord_qty: variant.ord_qty || 0,
              rate: variant.rate || 0,
              taxable_amt: variant.taxable_amt || 0,
              igst_percent: variant.igst_percent || 0,
              sgst_percent: variant.sgst_percent || 0,
              cgst_percent: variant.cgst_percent || 0,
              gst_amt: variant.gst_amt || 0,
              net_amount: variant.net_amount || 0,
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
  const handleViewRequest = async (request, sourceTab = null) => {
    try {
      // If viewing from quality-check tab, fetch with quality check data
      if (sourceTab === "quality-check") {
        const result = await purchaseRequestApi.getPurchaseRequestById(
          request.request_id,
          true // include_quality_check=true
        );
        if (result.success) {
          setSelectedRequest(result.data);
        } else {
          // Fallback to existing request data if API fails
          setSelectedRequest(request);
        }
      } else {
        // Default behavior - use existing request data
        setSelectedRequest(request);
      }
      setViewModalOpen(true);
    } catch (error) {
      console.error("Error loading request details:", error);
      // Fallback to existing request data if API call fails
      setSelectedRequest(request);
      setViewModalOpen(true);
    }
  };

  // Handle settings icon click (open status confirmation modal)
  const handleSettingsClick = (request, targetStatus = "to_be_delivered") => {
    setRequestToUpdate(request);
    setStatusUpdateTarget(targetStatus);
    setStatusConfirmModal(true);
  };

  // Get status label for modal display
  const getStatusLabel = (status) => {
    const statusLabels = {
      to_be_delivered: "TO BE DELIVERED",
      arrived: "QUALITY CHECK",
      fulfilled: "RECEIPT DETAILS",
    };
    return statusLabels[status] || status.toUpperCase().replace(/_/g, " ");
  };

  // Handle status update confirmation
  const handleStatusUpdateConfirm = async () => {
    if (!requestToUpdate) return;

    try {
      const result = await purchaseRequestApi.updateStatus(
        requestToUpdate.request_id,
        statusUpdateTarget
      );

      if (result.success) {
        // Close modal
        setStatusConfirmModal(false);
        setRequestToUpdate(null);

        // Switch tab based on target
        let targetTab = "to-be-delivered"; // default
        if (statusUpdateTarget === "arrived") {
          targetTab = "quality-check";
        } else if (statusUpdateTarget === "fulfilled") {
          targetTab = "receipt-details";
        }
        setActiveTab(targetTab);

        // Reload lists
        await loadPurchaseRequests(currentPage);
        await loadToBeDeliveredRequests();
        await loadQualityCheckRequests();
        await loadReceiptDetailsRequests();

        console.log("Purchase request status updated successfully");
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error("Error updating purchase request status:", error);
      alert("Failed to update purchase request status. Please try again.");
    }
  };

  // Handle inspect button click - open inspection modal
  const handleInspectClick = async (request) => {
    setRequestToInspect(request);
    setInspectionModalOpen(true);

    try {
      // Load existing quality checks if any
      const result = await qualityCheckApi.getQualityChecksByRequestId(
        request.request_id
      );

      if (result.success && result.data.length > 0) {
        // Pre-populate with existing data
        const inspectionItems = request.items.map((item) => {
          const existingCheck = result.data.find(
            (qc) => qc.item_id === item.item_id
          );
          return {
            item_id: item.item_id,
            invoice_quantity: item.quantity || 0,
            actual_quantity: existingCheck?.actual_quantity || 0,
            sorted_quantity: existingCheck?.sorted_quantity || 0,
            damage_quantity: existingCheck?.damage_quantity || 0,
            notes: existingCheck?.notes || "",
          };
        });
        setInspectionData(inspectionItems);
        setQualityCheckerName(result.data[0]?.quality_checker_name || "");
        setInspectionDate(
          result.data[0]?.inspection_date ||
            new Date().toISOString().split("T")[0]
        );
      } else {
        // Initialize with empty data
        const inspectionItems = request.items.map((item) => ({
          item_id: item.item_id,
          invoice_quantity: item.quantity || 0,
          actual_quantity: 0,
          sorted_quantity: 0,
          damage_quantity: 0,
          notes: "",
        }));
        setInspectionData(inspectionItems);
        setQualityCheckerName("");
        setInspectionDate(new Date().toISOString().split("T")[0]);
      }
    } catch (error) {
      console.error("Error loading quality checks:", error);
      // Initialize with empty data
      const inspectionItems = request.items.map((item) => ({
        item_id: item.item_id,
        invoice_quantity: item.quantity || 0,
        actual_quantity: 0,
        sorted_quantity: 0,
        damage_quantity: 0,
        notes: "",
      }));
      setInspectionData(inspectionItems);
    }
  };

  // Handle inspection data update
  const handleInspectionDataChange = (itemId, field, value) => {
    setInspectionData((prev) =>
      prev.map((item) =>
        item.item_id === itemId ? { ...item, [field]: value } : item
      )
    );
  };

  // Handle save inspection
  const handleSaveInspection = async () => {
    if (!requestToInspect) return;

    // Validation: Check if at least one item has actual quantity
    const hasData = inspectionData.some(
      (item) => item.actual_quantity > 0 || item.sorted_quantity > 0
    );

    if (!hasData) {
      alert("Please enter at least one quantity value before saving.");
      return;
    }

    if (!qualityCheckerName.trim()) {
      alert("Please enter Quality Checker Name.");
      return;
    }

    setIsSavingInspection(true);

    try {
      const items = inspectionData.map((item) => ({
        item_id: item.item_id,
        invoice_quantity: item.invoice_quantity,
        actual_quantity: parseInt(item.actual_quantity) || 0,
        sorted_quantity: parseInt(item.sorted_quantity) || 0,
        damage_quantity: parseInt(item.damage_quantity) || 0,
        quality_checker_name: qualityCheckerName.trim(),
        inspection_date: inspectionDate,
        notes: item.notes || null,
        status: "completed",
      }));

      const result = await qualityCheckApi.bulkCreateOrUpdateQualityCheck(
        requestToInspect.request_id,
        items
      );

      if (result.success) {
        setInspectionModalOpen(false);
        setRequestToInspect(null);
        await loadQualityCheckRequests();
        alert("Quality check inspection saved successfully!");
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error("Error saving quality check:", error);
      alert("Failed to save quality check. Please try again.");
    } finally {
      setIsSavingInspection(false);
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
      id: "quality-check",
      label: "QUALITY CHECK",
      icon: "mdi:shield-check",
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

        {/* Tab Navigation - Responsive */}
        <div
          className="mb-4 border-bottom pb-0"
          style={{ overflowX: "auto", overflowY: "hidden" }}
        >
          <div
            className="d-flex gap-2 gap-md-4"
            style={{ minWidth: "max-content", flexWrap: "nowrap" }}
          >
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={`d-flex align-items-center gap-2 px-2 px-md-3 py-2 cursor-pointer position-relative ${
                  activeTab === tab.id ? "text-primary" : "text-muted"
                }`}
                onClick={() => setActiveTab(tab.id)}
                style={{ cursor: "pointer", whiteSpace: "nowrap" }}
              >
                <Icon
                  icon={tab.icon}
                  className="icon"
                  style={{ flexShrink: 0 }}
                />
                <span
                  className="fw-medium"
                  style={{ fontSize: "clamp(12px, 2.5vw, 14px)" }}
                >
                  {tab.label}
                </span>
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
              handleSettingsClick={handleSettingsClick}
              viewModalOpen={viewModalOpen}
              setViewModalOpen={setViewModalOpen}
              selectedRequest={selectedRequest}
            />
          )}
          {activeTab === "quality-check" && (
            <QualityCheckTab
              requests={qualityCheckRequests}
              isLoading={qualityCheckLoading}
              currentPage={qualityCheckCurrentPage}
              totalPages={qualityCheckTotalPages}
              totalRecords={qualityCheckTotalRecords}
              loadQualityCheckRequests={loadQualityCheckRequests}
              handleViewRequest={(request) =>
                handleViewRequest(request, "quality-check")
              }
              handleInspectClick={handleInspectClick}
              handleSettingsClick={handleSettingsClick}
              viewModalOpen={viewModalOpen}
              setViewModalOpen={setViewModalOpen}
              selectedRequest={selectedRequest}
            />
          )}
          {activeTab === "receipt-details" && (
            <ReceiptDetailsTab
              requests={receiptRequests}
              isLoading={receiptLoading}
              currentPage={receiptCurrentPage}
              totalPages={receiptTotalPages}
              totalRecords={receiptTotalRecords}
              loadReceiptDetailsRequests={loadReceiptDetailsRequests}
              handleViewRequest={handleViewRequest}
              viewModalOpen={viewModalOpen}
              setViewModalOpen={setViewModalOpen}
              selectedRequest={selectedRequest}
            />
          )}
        </div>

        {/* View Purchase Request Modal - Shared by both tabs */}
        {viewModalOpen && selectedRequest && (
          <div
            className="modal show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
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
                <div
                  className="modal-body"
                  style={{ maxHeight: "70vh", overflowY: "auto" }}
                >
                  <div className="row mb-4">
                    <div className="col-12 col-md-6 mb-3 mb-md-0">
                      <h6 className="text-muted mb-3">Vendor Information</h6>
                      <div className="d-flex flex-column gap-2">
                        <div className="d-flex flex-column flex-sm-row justify-content-between gap-1">
                          <span className="text-muted">Vendor Name:</span>
                          <span className="fw-medium text-break">
                            {selectedRequest.vendor_name}
                          </span>
                        </div>
                        <div className="d-flex flex-column flex-sm-row justify-content-between gap-1">
                          <span className="text-muted">Phone No.:</span>
                          <span className="fw-medium text-break">
                            {selectedRequest.vendor_phone_no}
                          </span>
                        </div>
                        <div className="d-flex flex-column flex-sm-row justify-content-between gap-1">
                          <span className="text-muted">GST Number:</span>
                          <span className="fw-medium text-break">
                            {selectedRequest.vendor_gst_number}
                          </span>
                        </div>
                        <div className="d-flex flex-column flex-sm-row justify-content-between gap-1">
                          <span className="text-muted">Address:</span>
                          <span className="fw-medium">
                            {selectedRequest.vendor_address}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="col-12 col-md-6">
                      <h6 className="text-muted mb-3">Delivery Information</h6>
                      <div className="d-flex flex-column gap-2">
                        <div className="d-flex flex-column flex-sm-row justify-content-between gap-1">
                          <span className="text-muted">Order Date:</span>
                          <span className="fw-medium">
                            {new Date(
                              selectedRequest.order_date
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="d-flex flex-column flex-sm-row justify-content-between gap-1">
                          <span className="text-muted">Delivery Date:</span>
                          <span className="fw-medium">
                            {new Date(
                              selectedRequest.delivery_date
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="d-flex flex-column flex-sm-row justify-content-between gap-1">
                          <span className="text-muted">Status:</span>
                          <span
                            className={`badge ${
                              selectedRequest.status === "Pending" ||
                              selectedRequest.status?.toLowerCase() ===
                                "pending"
                                ? "bg-warning"
                                : selectedRequest.status ===
                                    "to_be_delivered" ||
                                  selectedRequest.status?.toLowerCase() ===
                                    "to_be_delivered"
                                ? "bg-info"
                                : selectedRequest.status === "arrived" ||
                                  selectedRequest.status?.toLowerCase() ===
                                    "arrived"
                                ? "bg-primary"
                                : selectedRequest.status === "fulfilled" ||
                                  selectedRequest.status?.toLowerCase() ===
                                    "fulfilled"
                                ? "bg-success"
                                : "bg-secondary"
                            }`}
                            style={{
                              fontSize: "clamp(11px, 2vw, 13px)",
                              padding: "6px 12px",
                            }}
                          >
                            {selectedRequest.status === "Pending"
                              ? "Pending"
                              : selectedRequest.status === "to_be_delivered"
                              ? "To Be Delivered"
                              : selectedRequest.status === "arrived"
                              ? "Arrived"
                              : selectedRequest.status === "fulfilled"
                              ? "Fulfilled"
                              : selectedRequest.status}
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
                                <th className="small">ORD Qty</th>
                                <th className="small">Rate</th>
                                <th className="small">Taxable Amt</th>
                                <th className="small">IGST %</th>
                                <th className="small">SGST %</th>
                                <th className="small">CGST %</th>
                                <th className="small">GST Amt</th>
                                <th className="small">Net Amount</th>
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
                                  <td className="small">{item.ord_qty || 0}</td>
                                  <td className="small">
                                    {item.rate
                                      ? `₹${parseFloat(item.rate).toFixed(2)}`
                                      : "-"}
                                  </td>
                                  <td className="small">
                                    {item.taxable_amt
                                      ? `₹${parseFloat(
                                          item.taxable_amt
                                        ).toFixed(2)}`
                                      : "-"}
                                  </td>
                                  <td className="small">
                                    {item.igst_percent
                                      ? `${parseFloat(
                                          item.igst_percent
                                        ).toFixed(2)}%`
                                      : "-"}
                                  </td>
                                  <td className="small">
                                    {item.sgst_percent
                                      ? `${parseFloat(
                                          item.sgst_percent
                                        ).toFixed(2)}%`
                                      : "-"}
                                  </td>
                                  <td className="small">
                                    {item.cgst_percent
                                      ? `${parseFloat(
                                          item.cgst_percent
                                        ).toFixed(2)}%`
                                      : "-"}
                                  </td>
                                  <td className="small">
                                    {item.gst_amt
                                      ? `₹${parseFloat(item.gst_amt).toFixed(
                                          2
                                        )}`
                                      : "-"}
                                  </td>
                                  <td className="small">
                                    {item.net_amount
                                      ? `₹${parseFloat(item.net_amount).toFixed(
                                          2
                                        )}`
                                      : "-"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                  {/* Quality Check Inspection Results - Only show if quality check data exists */}
                  {selectedRequest.items &&
                    selectedRequest.items.some(
                      (item) =>
                        item.quality_check !== null &&
                        item.quality_check !== undefined
                    ) && (
                      <div className="mb-3 mt-4">
                        <h6 className="text-muted mb-3">
                          <Icon
                            icon="mdi:clipboard-check"
                            className="me-2"
                            style={{ color: "#28a745" }}
                          />
                          Quality Inspection Results
                        </h6>
                        <div className="table-responsive">
                          <table className="table table-sm table-bordered">
                            <thead className="table-light">
                              <tr>
                                <th className="small">Product Name</th>
                                <th className="small">Variant</th>
                                <th className="small">Invoice Qty</th>
                                <th className="small">Actual Qty</th>
                                <th className="small">Sorted Qty</th>
                                <th className="small">Damage Qty</th>
                                <th className="small">Shortfall</th>
                                <th className="small">Extra</th>
                                <th className="small">Checker</th>
                                <th className="small">Inspection Date</th>
                                <th className="small">Notes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedRequest.items
                                .filter(
                                  (item) =>
                                    item.quality_check !== null &&
                                    item.quality_check !== undefined
                                )
                                .map((item, index) => {
                                  const qc = item.quality_check || {};
                                  return (
                                    <tr key={index}>
                                      <td className="small">
                                        {item.product_name || "-"}
                                      </td>
                                      <td className="small">
                                        {item.variant_display_name || "-"}
                                      </td>
                                      <td className="small text-center">
                                        <span className="badge bg-info">
                                          {qc.invoice_quantity || 0}
                                        </span>
                                      </td>
                                      <td className="small text-center">
                                        {qc.actual_quantity || 0}
                                      </td>
                                      <td className="small text-center">
                                        <span className="badge bg-success">
                                          {qc.sorted_quantity || 0}
                                        </span>
                                      </td>
                                      <td className="small text-center">
                                        {qc.damage_quantity > 0 ? (
                                          <span className="badge bg-danger">
                                            {qc.damage_quantity}
                                          </span>
                                        ) : (
                                          "0"
                                        )}
                                      </td>
                                      <td className="small text-center">
                                        {qc.shortfall_quantity > 0 ? (
                                          <span className="badge bg-warning">
                                            {qc.shortfall_quantity}
                                          </span>
                                        ) : (
                                          "0"
                                        )}
                                      </td>
                                      <td className="small text-center">
                                        {qc.extra_quantity > 0 ? (
                                          <span className="badge bg-info">
                                            {qc.extra_quantity}
                                          </span>
                                        ) : (
                                          "0"
                                        )}
                                      </td>
                                      <td className="small">
                                        {qc.quality_checker_name || "-"}
                                      </td>
                                      <td className="small">
                                        {qc.inspection_date
                                          ? new Date(
                                              qc.inspection_date
                                            ).toLocaleDateString()
                                          : "-"}
                                      </td>
                                      <td className="small">
                                        {qc.notes || "-"}
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
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
                  <span style={{ fontWeight: 600 }}>
                    {" "}
                    {getStatusLabel(statusUpdateTarget)}
                  </span>
                  ?
                </p>

                {/* Buttons */}
                <div className="d-flex flex-column flex-sm-row gap-2">
                  <button
                    onClick={() => {
                      setStatusConfirmModal(false);
                      setRequestToUpdate(null);
                    }}
                    className="w-100 w-sm-auto"
                    style={{
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
                    className="w-100 w-sm-auto"
                    style={{
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

        {/* Quality Check Inspection Modal */}
        {inspectionModalOpen && requestToInspect && (
          <div
            className="modal show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}
          >
            <div
              className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable"
              style={{ maxWidth: "min(1200px, 95vw)", margin: "1rem auto" }}
            >
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <Icon icon="mdi:clipboard-check" className="me-2" />
                    Quality Check Inspection
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setInspectionModalOpen(false);
                      setRequestToInspect(null);
                    }}
                  ></button>
                </div>
                <div
                  className="modal-body"
                  style={{ maxHeight: "70vh", overflowY: "auto" }}
                >
                  {/* Request Info */}
                  <div className="row mb-4">
                    <div className="col-md-6">
                      <h6 className="text-muted mb-3">Request Information</h6>
                      <div className="d-flex flex-column gap-2">
                        <div className="d-flex justify-content-between">
                          <span className="text-muted">Vendor:</span>
                          <span className="fw-medium">
                            {requestToInspect.vendor_name}
                          </span>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span className="text-muted">Order Date:</span>
                          <span className="fw-medium">
                            {new Date(
                              requestToInspect.order_date
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span className="text-muted">Delivery Date:</span>
                          <span className="fw-medium">
                            {new Date(
                              requestToInspect.delivery_date
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <h6 className="text-muted mb-3">Inspection Details</h6>
                      <div className="d-flex flex-column gap-2">
                        <div>
                          <label className="form-label small text-muted">
                            Quality Checker Name *
                          </label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={qualityCheckerName}
                            onChange={(e) =>
                              setQualityCheckerName(e.target.value)
                            }
                            placeholder="Enter checker name"
                            required
                          />
                        </div>
                        <div>
                          <label className="form-label small text-muted">
                            Inspection Date *
                          </label>
                          <input
                            type="date"
                            className="form-control form-control-sm"
                            value={inspectionDate}
                            onChange={(e) => setInspectionDate(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Items Inspection Table */}
                  <div className="mb-3">
                    <h6 className="text-muted mb-3">Item Inspection Details</h6>
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered">
                        <thead className="table-light">
                          <tr>
                            <th className="small">Product Name</th>
                            <th className="small">Variant</th>
                            <th className="small">SKU</th>
                            <th className="small">Invoice Qty</th>
                            <th className="small">Actual Qty *</th>
                            <th className="small">Sorted Qty *</th>
                            <th className="small">Damage Qty</th>
                            <th className="small">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inspectionData.map((item, index) => {
                            const requestItem = requestToInspect.items?.find(
                              (i) => i.item_id === item.item_id
                            );
                            return (
                              <tr key={item.item_id}>
                                <td className="small">
                                  {requestItem?.product_name || "-"}
                                </td>
                                <td className="small">
                                  {requestItem?.variant_display_name || "-"}
                                </td>
                                <td className="small">
                                  {requestItem?.sku || "-"}
                                </td>
                                <td className="small text-center">
                                  <span className="badge bg-info">
                                    {item.invoice_quantity || 0}
                                  </span>
                                </td>
                                <td className="small">
                                  <input
                                    type="number"
                                    className="form-control form-control-sm"
                                    min="0"
                                    value={item.actual_quantity || ""}
                                    onChange={(e) =>
                                      handleInspectionDataChange(
                                        item.item_id,
                                        "actual_quantity",
                                        e.target.value
                                      )
                                    }
                                    placeholder="0"
                                  />
                                </td>
                                <td className="small">
                                  <input
                                    type="number"
                                    className="form-control form-control-sm"
                                    min="0"
                                    max={item.actual_quantity || 0}
                                    value={item.sorted_quantity || ""}
                                    onChange={(e) =>
                                      handleInspectionDataChange(
                                        item.item_id,
                                        "sorted_quantity",
                                        e.target.value
                                      )
                                    }
                                    placeholder="0"
                                  />
                                </td>
                                <td className="small">
                                  <input
                                    type="number"
                                    className="form-control form-control-sm"
                                    min="0"
                                    max={item.actual_quantity || 0}
                                    value={item.damage_quantity || ""}
                                    onChange={(e) =>
                                      handleInspectionDataChange(
                                        item.item_id,
                                        "damage_quantity",
                                        e.target.value
                                      )
                                    }
                                    placeholder="0"
                                  />
                                </td>
                                <td className="small">
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={item.notes || ""}
                                    onChange={(e) =>
                                      handleInspectionDataChange(
                                        item.item_id,
                                        "notes",
                                        e.target.value
                                      )
                                    }
                                    placeholder="Add notes..."
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div
                      className="alert alert-info mt-3"
                      style={{ fontSize: "12px" }}
                    >
                      <strong>Note:</strong> Invoice Quantity is the ordered
                      quantity. Actual Quantity is what was physically received.
                      Sorted Quantity is what passed inspection. Damage Quantity
                      includes all damaged items found.
                    </div>
                  </div>
                </div>
                <div className="modal-footer d-flex flex-column flex-sm-row gap-2 justify-content-end">
                  <button
                    type="button"
                    className="btn btn-secondary w-100 w-sm-auto"
                    onClick={() => {
                      setInspectionModalOpen(false);
                      setRequestToInspect(null);
                    }}
                    disabled={isSavingInspection}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary w-100 w-sm-auto"
                    onClick={handleSaveInspection}
                    disabled={isSavingInspection}
                  >
                    {isSavingInspection ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        ></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Icon icon="mdi:content-save" className="me-2" />
                        Save Inspection
                      </>
                    )}
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
      <div className="card basic-data-table">
        <div className="card-header d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-2">
          <h5 className="card-title mb-0">Purchase Requests</h5>
          <div className="d-flex gap-2 align-items-center">
            <button
              onClick={() => setModalOpen(true)}
              className="btn btn-primary d-inline-flex align-items-center"
              style={{ gap: "6px", padding: "8px 16px" }}
            >
              <Icon icon="lucide:plus" width="18" height="18" />
            </button>
          </div>
        </div>

        <div className="card-body">
          {/* Search */}
          <div className="row g-3 mb-4">
            <div className="col-12 col-md-4">
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <Icon icon="lucide:search" width="16" height="16" />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by vendor or product..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="table-responsive">
            <table
              className="table table-hover"
              style={{ fontSize: "clamp(12px, 2.5vw, 14px)" }}
            >
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
                      padding: "clamp(8px, 2vw, 12px)",
                      fontSize: "clamp(11px, 2.5vw, 14px)",
                    }}
                  >
                    #
                  </th>
                  <th
                    style={{
                      fontWeight: "600",
                      color: "#374151",
                      padding: "clamp(8px, 2vw, 12px)",
                      fontSize: "clamp(11px, 2.5vw, 14px)",
                    }}
                  >
                    Vendor Name
                  </th>
                  <th
                    style={{
                      fontWeight: "600",
                      color: "#374151",
                      padding: "clamp(8px, 2vw, 12px)",
                      fontSize: "clamp(11px, 2.5vw, 14px)",
                    }}
                  >
                    Order Date
                  </th>
                  <th
                    style={{
                      fontWeight: "600",
                      color: "#374151",
                      padding: "clamp(8px, 2vw, 12px)",
                      fontSize: "clamp(11px, 2.5vw, 14px)",
                    }}
                  >
                    Delivery Date
                  </th>
                  <th
                    style={{
                      fontWeight: "600",
                      color: "#374151",
                      padding: "clamp(8px, 2vw, 12px)",
                      fontSize: "clamp(11px, 2.5vw, 14px)",
                    }}
                  >
                    Product Name
                  </th>
                  <th
                    style={{
                      fontWeight: "600",
                      color: "#374151",
                      padding: "clamp(8px, 2vw, 12px)",
                      fontSize: "clamp(11px, 2.5vw, 14px)",
                    }}
                  >
                    HSN Code
                  </th>
                  <th
                    style={{
                      fontWeight: "600",
                      color: "#374151",
                      padding: "clamp(8px, 2vw, 12px)",
                      fontSize: "clamp(11px, 2.5vw, 14px)",
                    }}
                  >
                    Action
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
                    <td colSpan="7" className="text-center py-4">
                      <div className="d-flex flex-column align-items-center">
                        <Icon
                          icon="lucide:file-text"
                          width="48"
                          height="48"
                          className="text-muted mb-2"
                        />
                        <p className="text-muted mb-0">
                          No purchase requests found
                        </p>
                        {searchTerm && (
                          <small className="text-muted">
                            Try adjusting your search terms
                          </small>
                        )}
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
                      <tr key={request.request_id}>
                        <td
                          style={{
                            padding: "clamp(8px, 2vw, 12px)",
                            color: "#374151",
                            fontSize: "clamp(11px, 2.5vw, 14px)",
                          }}
                        >
                          {index + 1}
                        </td>
                        <td
                          style={{
                            padding: "clamp(8px, 2vw, 12px)",
                            color: "#374151",
                            fontSize: "clamp(11px, 2.5vw, 14px)",
                          }}
                        >
                          {request.vendor_name || "-"}
                        </td>
                        <td
                          style={{
                            padding: "clamp(8px, 2vw, 12px)",
                            color: "#374151",
                            fontSize: "clamp(11px, 2.5vw, 14px)",
                          }}
                        >
                          {new Date(request.order_date).toLocaleDateString()}
                        </td>
                        <td
                          style={{
                            padding: "clamp(8px, 2vw, 12px)",
                            color: "#374151",
                            fontSize: "clamp(11px, 2.5vw, 14px)",
                          }}
                        >
                          {new Date(request.delivery_date).toLocaleDateString()}
                        </td>
                        <td
                          style={{
                            padding: "clamp(8px, 2vw, 12px)",
                            color: "#374151",
                            fontSize: "clamp(11px, 2.5vw, 14px)",
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
                            padding: "clamp(8px, 2vw, 12px)",
                            color: "#374151",
                            fontSize: "clamp(11px, 2.5vw, 14px)",
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
                        <td style={{ padding: "12px" }}>
                          <div className="d-flex flex-wrap gap-1 gap-sm-2">
                            <button
                              className="btn btn-sm"
                              style={{
                                border: "none",
                                background: "none",
                                padding: "4px",
                                color: "#0d6efd",
                                minWidth: "32px",
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
                            {/* Only show Settings icon if status is "Pending" */}
                            {(request.status === "Pending" ||
                              request.status?.toLowerCase() === "pending") && (
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
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination - Responsive */}
          {totalRecords > 0 && (
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center pt-3 gap-2">
              <div className="d-flex align-items-center gap-2">
                <button
                  className="btn btn-sm"
                  style={{
                    border: "none",
                    background: "none",
                    color: "#495057",
                  }}
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
                            totalPages === currentPage
                              ? "#6f42c1"
                              : "transparent",
                          color:
                            totalPages === currentPage ? "white" : "#495057",
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
                  style={{
                    border: "none",
                    background: "none",
                    color: "#495057",
                  }}
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
        </div>
      </div>

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
      <div
        className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable"
        style={{ maxWidth: "min(800px, 95vw)", margin: "1rem auto" }}
      >
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

                              // Helper function to calculate financial fields
                              const calculateFinancialFields = (
                                variantData
                              ) => {
                                const quantity =
                                  parseFloat(variantData.quantity) || 0;
                                const rate = parseFloat(variantData.rate) || 0;
                                const igstPercent =
                                  parseFloat(variantData.igst_percent) || 0;
                                const sgstPercent =
                                  parseFloat(variantData.sgst_percent) || 0;
                                const cgstPercent =
                                  parseFloat(variantData.cgst_percent) || 0;

                                // Calculate taxable amount (Rate × Quantity)
                                const taxableAmt = rate * quantity;

                                // Calculate GST amount (Taxable Amount × Total GST %)
                                const totalGstPercent =
                                  igstPercent + sgstPercent + cgstPercent;
                                const gstAmt =
                                  (taxableAmt * totalGstPercent) / 100;

                                // Calculate net amount (Taxable Amount + GST Amount)
                                const netAmount = taxableAmt + gstAmt;

                                return {
                                  taxable_amt: taxableAmt,
                                  gst_amt: gstAmt,
                                  net_amount: netAmount,
                                };
                              };

                              // Helper function to update variant field
                              const updateVariantField = (fieldName, value) => {
                                setFormData((prev) => {
                                  const newProducts = [...prev.products];
                                  const product = {
                                    ...newProducts[productIndex],
                                  };
                                  product.selectedVariants =
                                    product.selectedVariants.map((v) => {
                                      if (v.variant_id === variant.variant_id) {
                                        const updatedVariant = {
                                          ...v,
                                          [fieldName]: value,
                                        };

                                        // Auto-calculate financial fields if relevant fields change
                                        if (
                                          [
                                            "quantity",
                                            "rate",
                                            "igst_percent",
                                            "sgst_percent",
                                            "cgst_percent",
                                          ].includes(fieldName)
                                        ) {
                                          const calculated =
                                            calculateFinancialFields(
                                              updatedVariant
                                            );
                                          return {
                                            ...updatedVariant,
                                            ...calculated,
                                          };
                                        }

                                        return updatedVariant;
                                      }
                                      return v;
                                    });
                                  newProducts[productIndex] = product;
                                  return { ...prev, products: newProducts };
                                });
                              };

                              return (
                                <div key={variant.variant_id} className="mb-4">
                                  <div className="row align-items-center mb-3">
                                    <div className="col-md-12">
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
                                        <label className="form-check-label fw-semibold">
                                          {variant.variant_display_name ||
                                            "N/A"}
                                          {variant.sku &&
                                            ` (SKU: ${variant.sku})`}
                                        </label>
                                      </div>
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <div className="row g-2">
                                      {/* Quantity */}
                                      <div className="col-6 col-md-3">
                                        <label className="form-label small mb-1">
                                          Quantity
                                        </label>
                                        <input
                                          type="number"
                                          className="form-control form-control-sm"
                                          placeholder="Qty"
                                          min="0"
                                          value={
                                            selectedVariant?.quantity || ""
                                          }
                                          onChange={(e) =>
                                            updateVariantField(
                                              "quantity",
                                              parseInt(e.target.value) || ""
                                            )
                                          }
                                          required
                                        />
                                      </div>
                                      {/* ORD Qty */}
                                      <div className="col-6 col-md-3">
                                        <label className="form-label small mb-1">
                                          ORD Qty
                                        </label>
                                        <input
                                          type="number"
                                          className="form-control form-control-sm"
                                          placeholder="ORD Qty"
                                          min="0"
                                          value={selectedVariant?.ord_qty || ""}
                                          onChange={(e) =>
                                            updateVariantField(
                                              "ord_qty",
                                              parseFloat(e.target.value) || 0
                                            )
                                          }
                                        />
                                      </div>
                                      {/* Rate */}
                                      <div className="col-6 col-md-3">
                                        <label className="form-label small mb-1">
                                          Rate
                                        </label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          className="form-control form-control-sm"
                                          placeholder="Rate"
                                          min="0"
                                          value={selectedVariant?.rate || ""}
                                          onChange={(e) =>
                                            updateVariantField(
                                              "rate",
                                              parseFloat(e.target.value) || 0
                                            )
                                          }
                                        />
                                      </div>
                                      {/* Taxable Amt */}
                                      <div className="col-6 col-md-3">
                                        <label className="form-label small mb-1">
                                          Taxable Amt
                                        </label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          className="form-control form-control-sm"
                                          placeholder="Taxable Amt"
                                          min="0"
                                          value={
                                            selectedVariant?.taxable_amt || ""
                                          }
                                          readOnly
                                          style={{ backgroundColor: "#f8f9fa" }}
                                        />
                                      </div>
                                      {/* IGST % */}
                                      <div className="col-6 col-md-3">
                                        <label className="form-label small mb-1">
                                          IGST %
                                        </label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          className="form-control form-control-sm"
                                          placeholder="IGST %"
                                          min="0"
                                          value={
                                            selectedVariant?.igst_percent || ""
                                          }
                                          onChange={(e) =>
                                            updateVariantField(
                                              "igst_percent",
                                              parseFloat(e.target.value) || 0
                                            )
                                          }
                                        />
                                      </div>
                                      {/* SGST % */}
                                      <div className="col-6 col-md-3">
                                        <label className="form-label small mb-1">
                                          SGST %
                                        </label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          className="form-control form-control-sm"
                                          placeholder="SGST %"
                                          min="0"
                                          value={
                                            selectedVariant?.sgst_percent || ""
                                          }
                                          onChange={(e) =>
                                            updateVariantField(
                                              "sgst_percent",
                                              parseFloat(e.target.value) || 0
                                            )
                                          }
                                        />
                                      </div>
                                      {/* CGST % */}
                                      <div className="col-6 col-md-3">
                                        <label className="form-label small mb-1">
                                          CGST %
                                        </label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          className="form-control form-control-sm"
                                          placeholder="CGST %"
                                          min="0"
                                          value={
                                            selectedVariant?.cgst_percent || ""
                                          }
                                          onChange={(e) =>
                                            updateVariantField(
                                              "cgst_percent",
                                              parseFloat(e.target.value) || 0
                                            )
                                          }
                                        />
                                      </div>
                                      {/* GST Amt */}
                                      <div className="col-6 col-md-3">
                                        <label className="form-label small mb-1">
                                          GST Amt
                                        </label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          className="form-control form-control-sm"
                                          placeholder="GST Amt"
                                          min="0"
                                          value={selectedVariant?.gst_amt || ""}
                                          readOnly
                                          style={{ backgroundColor: "#f8f9fa" }}
                                        />
                                      </div>
                                      {/* Net Amount */}
                                      <div className="col-6 col-md-3">
                                        <label className="form-label small mb-1">
                                          Net Amount
                                        </label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          className="form-control form-control-sm"
                                          placeholder="Net Amount"
                                          min="0"
                                          value={
                                            selectedVariant?.net_amount || ""
                                          }
                                          readOnly
                                          style={{ backgroundColor: "#f8f9fa" }}
                                        />
                                      </div>
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

              <div className="modal-footer d-flex flex-column flex-sm-row gap-2 justify-content-end">
                <button
                  type="button"
                  className="btn btn-secondary w-100 w-sm-auto"
                  onClick={handleModalClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary w-100 w-sm-auto"
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
  handleSettingsClick,
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
                        <button
                          className="btn btn-sm"
                          style={{
                            border: "none",
                            background: "none",
                            padding: "4px",
                            color: "#6c757d",
                          }}
                          title="Settings"
                          onClick={() =>
                            handleSettingsClick(request, "arrived")
                          }
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

// Quality Check Tab Component
const QualityCheckTab = ({
  requests,
  isLoading,
  currentPage,
  totalPages,
  totalRecords,
  loadQualityCheckRequests,
  handleViewRequest,
  handleInspectClick,
  handleSettingsClick,
  viewModalOpen,
  setViewModalOpen,
  selectedRequest,
}) => {
  return (
    <>
      {/* Card */}
      <div className="card basic-data-table">
        <div className="card-header d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-2">
          <h5 className="card-title mb-0">Quality Check</h5>
        </div>

        <div className="card-body">
          {/* Table */}
          <div className="table-responsive">
            <table
              className="table table-hover"
              style={{ fontSize: "clamp(12px, 2.5vw, 14px)" }}
            >
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
                    Sr No
                  </th>
                  <th
                    style={{
                      fontWeight: "600",
                      color: "#374151",
                      padding: "12px",
                    }}
                  >
                    Vendor Name
                  </th>
                  <th
                    style={{
                      fontWeight: "600",
                      color: "#374151",
                      padding: "12px",
                    }}
                  >
                    Order Date
                  </th>
                  <th
                    style={{
                      fontWeight: "600",
                      color: "#374151",
                      padding: "12px",
                    }}
                  >
                    Delivery Date
                  </th>
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
                    Action
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
                        Loading quality check requests...
                      </div>
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4">
                      <div className="d-flex flex-column align-items-center">
                        <Icon
                          icon="mdi:shield-check"
                          width="48"
                          height="48"
                          className="text-muted mb-2"
                        />
                        <p className="text-muted mb-0">
                          No quality check requests found
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  requests.map((request, index) => (
                    <tr key={request.request_id}>
                      <td style={{ padding: "12px", color: "#374151" }}>
                        {index + 1}
                      </td>
                      <td style={{ padding: "12px", color: "#374151" }}>
                        {request.vendor_name || "-"}
                      </td>
                      <td style={{ padding: "12px", color: "#374151" }}>
                        {new Date(request.order_date).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "12px", color: "#374151" }}>
                        {new Date(request.delivery_date).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "12px", color: "#374151" }}>
                        {request.items && request.items.length > 0
                          ? [
                              ...new Set(
                                request.items.map((item) => item.product_name)
                              ),
                            ].join(", ")
                          : "-"}
                      </td>
                      <td style={{ padding: "12px" }}>
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
                              color: "#28a745",
                            }}
                            title="Inspect"
                            onClick={() => handleInspectClick(request)}
                          >
                            <Icon
                              icon="mdi:clipboard-check"
                              width="16"
                              height="16"
                            />
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
                            onClick={() =>
                              handleSettingsClick(request, "fulfilled")
                            }
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

          {/* Pagination - Responsive */}
          {totalRecords > 0 && (
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center pt-3 gap-2">
              <div className="d-flex align-items-center gap-2">
                <button
                  className="btn btn-sm"
                  style={{
                    border: "none",
                    background: "none",
                    color: "#495057",
                  }}
                  onClick={() => loadQualityCheckRequests(currentPage - 1)}
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
                        onClick={() => loadQualityCheckRequests(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  className="btn btn-sm"
                  style={{
                    border: "none",
                    background: "none",
                    color: "#495057",
                  }}
                  onClick={() => loadQualityCheckRequests(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <Icon icon="mdi:chevron-right" width="16" height="16" />
                </button>
              </div>

              <div
                style={{
                  fontSize: "clamp(12px, 2.5vw, 14px)",
                  color: "#6c757d",
                  textAlign: "center",
                }}
              >
                Showing <strong>{requests.length}</strong> of{" "}
                <strong>{totalRecords}</strong> requests
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ReceivingManagementPage;
