"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import MasterLayout from "../../masterLayout/MasterLayout";
import SidebarPermissionGuard from "../../components/SidebarPermissionGuard";
import purchaseRequestApi from "../../services/purchaseRequestApi";
import vendorMasterApi from "../../services/vendorMasterApi";
import productMasterApi from "../../services/productMasterApi";
import qualityCheckApi from "../../services/qualityCheckApi";
import { useUser } from "@/helper/UserContext";
import { Combobox } from "@headlessui/react";
import { useRouter, useSearchParams } from "next/navigation";

const QualityCheckDocumentsSection = ({ requestId }) => {
  const [docType] = useState("invoice");
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");

  const refresh = async () => {
    try {
      const res = await qualityCheckApi.listDocuments(requestId);
      if (res.success) setDocuments(res.data);
    } catch (e) {
      console.error("Failed to load documents", e);
    }
  };

  useEffect(() => {
    if (requestId) refresh();
  }, [requestId]);

  const onFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    setFiles(selected);
  };

  const onUpload = async () => {
    if (!files.length) return;
    if (docType === "invoice" && !invoiceNumber.trim()) {
      setError("Invoice number is required for invoice documents.");
      return;
    }
    setIsUploading(true);
    setError("");
    try {
      for (const f of files) {
        await qualityCheckApi.uploadDocument(requestId, {
          docType,
          itemId: null,
          file: f,
          invoiceNumber: invoiceNumber.trim() || null,
        });
      }
      setFiles([]);
      setInvoiceNumber("");
      await refresh();
    } catch (e) {
      console.error(e);
      setError(e.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const onDelete = async (documentId) => {
    try {
      await qualityCheckApi.deleteDocument(documentId);
      await refresh();
    } catch (e) {
      console.error("Failed to delete document", e);
    }
  };

  return (
    <div className="border rounded p-3" style={{ backgroundColor: "#f8f9fa" }}>
      <div className="row g-2 align-items-end">
        <div className="col-md-3">
          <label className="form-label small mb-1">Document Type</label>
          <div className="form-control form-control-sm bg-light">Invoice</div>
        </div>
        <div className="col-md-5">
          <label className="form-label small mb-1">Select Files</label>
          <input
            type="file"
            className="form-control form-control-sm"
            accept=".pdf,image/*"
            multiple
            onChange={onFileChange}
          />
        </div>
        <div className="col-md-2">
          <label className="form-label small mb-1">
            Invoice Number <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Enter invoice no."
            value={invoiceNumber}
            onChange={(e) => {
              setInvoiceNumber(e.target.value);
              if (error) {
                setError("");
              }
            }}
          />
        </div>
        <div className="col-md-2 d-flex gap-2 align-items-end">
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={onUpload}
            disabled={isUploading || files.length === 0}
          >
            {isUploading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Uploading...
              </>
            ) : (
              <>Upload</>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div
          className="alert alert-danger mt-2 py-2 mb-2"
          style={{ fontSize: "12px" }}
        >
          {error}
        </div>
      )}

      <div className="table-responsive mt-3">
        <table className="table table-sm table-bordered mb-0">
          <thead className="table-light">
            <tr>
              <th className="small">Type</th>
              <th className="small">Name</th>
              <th className="small">Invoice No.</th>
              <th className="small">Size</th>
              <th className="small">Uploaded</th>
              <th className="small">Action</th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td className="small text-center" colSpan="6">
                  No documents uploaded
                </td>
              </tr>
            ) : (
              documents.map((d) => (
                <tr key={d.document_id}>
                  <td className="small text-capitalize">
                    {d.doc_type?.replace(/_/g, " ")}
                  </td>
                  <td className="small">{d.file_name}</td>
                  <td className="small">{d.invoice_number || "-"}</td>
                  <td className="small">
                    {Math.ceil((d.file_size_bytes || 0) / 1024)} KB
                  </td>
                  <td className="small">
                    {d.uploaded_at
                      ? new Date(d.uploaded_at).toLocaleString()
                      : "-"}
                  </td>
                  <td className="small">
                    <button
                      type="button"
                      className="btn btn-sm"
                      style={{
                        border: "none",
                        background: "none",
                        color: "#dc3545",
                      }}
                      title="Delete"
                      onClick={() => onDelete(d.document_id)}
                    >
                      <Icon icon="mdi:delete" width="16" height="16" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ReceivingManagementLayer = () => {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const qrHandledRef = useRef(false);
  const [highlightedItemId, setHighlightedItemId] = useState(null);
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

  // Infinite scroll state for Purchase Request tab
  const [purchaseRequestDisplayedItems, setPurchaseRequestDisplayedItems] =
    useState([]);
  const [purchaseRequestLoadingMore, setPurchaseRequestLoadingMore] =
    useState(false);
  const purchaseRequestContainerRef = useRef(null);
  const ITEMS_PER_LOAD = 50; // Items to load per scroll
  const INITIAL_ITEMS_TO_SHOW = 50; // Initial items to display

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
    handleViewRequest,
    viewModalOpen,
    setViewModalOpen,
    selectedRequest,
    searchTerm,
    setSearchTerm,
    displayedItems,
    isLoadingMore,
    containerRef,
    getDisplayedData,
    hasMoreData,
    loadMoreData,
  }) => {
    // Filter data based on search term
    const filteredData = requests.filter((request) => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      // Search by company or vendor name
      const supplierName = `${request.company_name || ""} ${
        request.vendor_name || ""
      }`
        .trim()
        .toLowerCase();
      if (supplierName && supplierName.includes(search)) {
        return true;
      }
      // Search by aggregated product names (if present)
      const names =
        request.aggregated?.productNames ||
        (request.items && request.items.length > 0
          ? [
              ...new Set(
                request.items.map((it) => it.product_name).filter(Boolean)
              ),
            ].join(", ")
          : "");
      return names.toLowerCase().includes(search);
    });

    const displayedData = filteredData.slice(0, displayedItems.length);
    return (
      <>
        {/* Card */}
        <div className="card basic-data-table">
          <div className="card-header d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-2">
            <h5 className="card-title mb-0">Receipt Details</h5>
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
                    placeholder="Search by company or product..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
            {/* Table */}
            <div
              ref={containerRef}
              className="table-scroll-container"
              style={{
                maxHeight: "600px",
                overflowY: "auto",
                overflowX: "auto",
                scrollBehavior: "smooth",
                overscrollBehavior: "auto",
              }}
              onScroll={(e) => {
                const target = e.currentTarget;
                const scrollTop = target.scrollTop;
                const scrollHeight = target.scrollHeight;
                const clientHeight = target.clientHeight;

                if (
                  scrollTop + clientHeight >= scrollHeight - 10 &&
                  displayedData.length < filteredData.length &&
                  !isLoadingMore &&
                  !isLoading
                ) {
                  loadMoreData();
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
              <div className="table-responsive">
                <table
                  className="table table-hover"
                  style={{ fontSize: "clamp(12px, 2.5vw, 14px)" }}
                >
                  <thead
                    style={{
                      backgroundColor: "#f9fafb",
                      borderBottom: "2px solid #e5e7eb",
                      position: "sticky",
                      top: 0,
                      zIndex: 10,
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
                        PR No
                      </th>
                      <th
                        style={{
                          fontWeight: "600",
                          color: "#374151",
                          padding: "12px",
                        }}
                      >
                        Company Name
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
                      <>
                        {Array.from({ length: 5 }).map((_, rowIndex) => (
                          <tr key={`skeleton-${rowIndex}`}>
                            {Array.from({ length: 9 }).map((_, colIndex) => (
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
                    ) : displayedData.length === 0 ? (
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
                      <>
                        {displayedData.map((request, index) => (
                          <tr key={request.request_id}>
                            <td className="small">
                              {request.pr_number ||
                                `PR-${String(request.request_id).padStart(
                                  3,
                                  "0"
                                )}`}
                            </td>
                            <td className="small">
                              {request.company_name ||
                                request.vendor_name ||
                                "-"}
                            </td>
                            <td className="small">
                              {request.order_date
                                ? new Date(
                                    request.order_date
                                  ).toLocaleDateString()
                                : "-"}
                            </td>
                            <td className="small">
                              {request.delivery_date
                                ? new Date(
                                    request.delivery_date
                                  ).toLocaleDateString()
                                : "-"}
                            </td>
                            <td className="small">
                              {request.aggregated?.productNames || "-"}
                            </td>
                            <td className="small">
                              {request.aggregated?.totalInvoiceQty ?? 0}
                            </td>
                            <td className="small">
                              {request.aggregated?.totalSortedQty ?? 0}
                            </td>
                            <td className="small">
                              {request.aggregated?.totalDamageQty ?? 0}
                            </td>
                            <td className="small">
                              <button
                                className="btn btn-sm"
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  padding: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  border: "1px solid #e5e7eb",
                                  borderRadius: "6px",
                                  backgroundColor: "white",
                                }}
                                title="View"
                                onClick={() => handleViewRequest(request)}
                              >
                                <Icon
                                  icon="lucide:eye"
                                  width="16"
                                  height="16"
                                  style={{ color: "#3b82f6" }}
                                />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Infinite Scroll Footer */}
              {filteredData.length > 0 && (
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
                    Showing <strong>{displayedData.length}</strong> of{" "}
                    <strong>{filteredData.length}</strong> entries
                  </div>
                  {displayedData.length < filteredData.length && (
                    <div style={{ fontSize: "0.875rem", color: "#6c757d" }}>
                      Scroll down to load more
                    </div>
                  )}
                </div>
              )}
            </div>
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
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Reset loading state when modal opens or request changes
  useEffect(() => {
    if (statusConfirmModal) {
      setIsUpdatingStatus(false);
    } else {
      // Also reset when modal closes to ensure clean state
      setIsUpdatingStatus(false);
    }
  }, [statusConfirmModal, requestToUpdate]);

  // Quality Check Inspection Modal state
  const [inspectionModalOpen, setInspectionModalOpen] = useState(false);
  const [requestToInspect, setRequestToInspect] = useState(null);
  const [inspectionData, setInspectionData] = useState([]);
  const [isSavingInspection, setIsSavingInspection] = useState(false);
  const [isEditingInspection, setIsEditingInspection] = useState(false);
  const [isLoadingInspection, setIsLoadingInspection] = useState(false);
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

  // Infinite scroll state for To Be Delivered tab
  const [toBeDeliveredDisplayedItems, setToBeDeliveredDisplayedItems] =
    useState([]);
  const [toBeDeliveredLoadingMore, setToBeDeliveredLoadingMore] =
    useState(false);
  const toBeDeliveredContainerRef = useRef(null);

  // Quality Check tab state
  const [qualityCheckRequests, setQualityCheckRequests] = useState([]);
  const [qualityCheckLoading, setQualityCheckLoading] = useState(true);
  const [qualityCheckCurrentPage, setQualityCheckCurrentPage] = useState(1);
  const [qualityCheckTotalPages, setQualityCheckTotalPages] = useState(1);
  const [qualityCheckTotalRecords, setQualityCheckTotalRecords] = useState(0);

  // Infinite scroll state for Quality Check tab
  const [qualityCheckDisplayedItems, setQualityCheckDisplayedItems] = useState(
    []
  );
  const [qualityCheckLoadingMore, setQualityCheckLoadingMore] = useState(false);
  const qualityCheckContainerRef = useRef(null);

  // Receipt Details tab state
  const [receiptRequests, setReceiptRequests] = useState([]);
  const [receiptLoading, setReceiptLoading] = useState(true);
  const [receiptCurrentPage, setReceiptCurrentPage] = useState(1);
  const [receiptTotalPages, setReceiptTotalPages] = useState(1);
  const [receiptTotalRecords, setReceiptTotalRecords] = useState(0);

  // Infinite scroll state for Receipt Details tab
  const [receiptDisplayedItems, setReceiptDisplayedItems] = useState([]);
  const [receiptLoadingMore, setReceiptLoadingMore] = useState(false);
  const receiptContainerRef = useRef(null);

  // Track if data has been loaded for each tab (to prevent unnecessary refetching)
  const [purchaseRequestsLoaded, setPurchaseRequestsLoaded] = useState(false);
  const [toBeDeliveredLoaded, setToBeDeliveredLoaded] = useState(false);
  const [qualityCheckLoaded, setQualityCheckLoaded] = useState(false);
  const [receiptDetailsLoaded, setReceiptDetailsLoaded] = useState(false);

  // Vendor form fields (auto-filled from dropdown)
  const [vendorData, setVendorData] = useState({
    companyName: "",
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
  const loadPurchaseRequests = async (
    page = 1,
    append = false,
    force = false
  ) => {
    // Skip if already loaded and not forcing a refresh
    if (purchaseRequestsLoaded && !force && !append) {
      return;
    }

    try {
      setIsLoading(true);
      // Use large limit to fetch all data at once for infinite scrolling
      const result = await purchaseRequestApi.getAllPurchaseRequests(
        page,
        1000
      );

      if (result.success) {
        // Filter only requests with status "Pending" or "pending"
        const filteredRequests = result.data.filter(
          (request) =>
            request.status === "Pending" ||
            request.status?.toLowerCase() === "pending"
        );

        if (append) {
          setRequests((prev) => [...prev, ...filteredRequests]);
        } else {
          setRequests(filteredRequests);
          // Show initial batch, infinite scroll will handle progressive loading
          setPurchaseRequestDisplayedItems(
            filteredRequests.slice(0, INITIAL_ITEMS_TO_SHOW)
          );
        }
        setCurrentPage(result.pagination.page);
        setTotalPages(result.pagination.totalPages);
        setTotalRecords(filteredRequests.length);
        setPurchaseRequestsLoaded(true);
      }
    } catch (error) {
      console.error("Error loading purchase requests:", error);
      // Handle rate limiting errors
      if (error.message && error.message.includes("429")) {
        const retryAfter = 60; // Default 60 seconds
        alert(
          `Too many requests. Please wait ${retryAfter} seconds before trying again.`
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load to-be-delivered requests
  const loadToBeDeliveredRequests = async (
    page = 1,
    append = false,
    force = false
  ) => {
    // Skip if already loaded and not forcing a refresh
    if (toBeDeliveredLoaded && !force && !append) {
      return;
    }

    try {
      setToBeDeliveredLoading(true);
      // Use large limit to fetch all data at once for infinite scrolling
      const result = await purchaseRequestApi.getAllPurchaseRequests(
        page,
        1000
      );

      if (result.success) {
        // Filter only requests with status "to_be_delivered"
        const filteredRequests = result.data.filter(
          (request) => request.status === "to_be_delivered"
        );
        if (append) {
          setToBeDeliveredRequests((prev) => [...prev, ...filteredRequests]);
        } else {
          setToBeDeliveredRequests(filteredRequests);
          // Show initial batch, infinite scroll will handle progressive loading
          setToBeDeliveredDisplayedItems(
            filteredRequests.slice(0, INITIAL_ITEMS_TO_SHOW)
          );
        }
        setToBeDeliveredCurrentPage(result.pagination.page);
        setToBeDeliveredTotalPages(result.pagination.totalPages);
        setToBeDeliveredTotalRecords(filteredRequests.length);
        setToBeDeliveredLoaded(true);
      }
    } catch (error) {
      console.error("Error loading to-be-delivered requests:", error);
      // Handle rate limiting errors
      if (error.message && error.message.includes("429")) {
        const retryAfter = 60; // Default 60 seconds
        console.warn(`Rate limit exceeded. Please wait ${retryAfter} seconds.`);
      }
    } finally {
      setToBeDeliveredLoading(false);
    }
  };

  // Load quality check (arrived) requests
  const loadQualityCheckRequests = async (
    page = 1,
    append = false,
    force = false
  ) => {
    // Skip if already loaded and not forcing a refresh
    if (qualityCheckLoaded && !force && !append) {
      return;
    }

    try {
      setQualityCheckLoading(true);
      // Use large limit to fetch all data at once for infinite scrolling
      const result = await purchaseRequestApi.getAllPurchaseRequests(
        page,
        1000
      );

      if (result.success) {
        // Filter only requests with status "arrived"
        const filteredRequests = result.data.filter(
          (request) => request.status === "arrived"
        );
        if (append) {
          setQualityCheckRequests((prev) => [...prev, ...filteredRequests]);
        } else {
          setQualityCheckRequests(filteredRequests);
          // Show initial batch, infinite scroll will handle progressive loading
          setQualityCheckDisplayedItems(
            filteredRequests.slice(0, INITIAL_ITEMS_TO_SHOW)
          );
        }
        setQualityCheckCurrentPage(result.pagination.page);
        setQualityCheckTotalPages(result.pagination.totalPages);
        setQualityCheckTotalRecords(filteredRequests.length);
        setQualityCheckLoaded(true);
      }
    } catch (error) {
      console.error("Error loading quality check requests:", error);
      // Handle rate limiting errors
      if (error.message && error.message.includes("429")) {
        const retryAfter = 60; // Default 60 seconds
        console.warn(`Rate limit exceeded. Please wait ${retryAfter} seconds.`);
      }
    } finally {
      setQualityCheckLoading(false);
    }
  };

  // Load receipt details (fulfilled) requests with QC aggregation
  const loadReceiptDetailsRequests = async (
    page = 1,
    append = false,
    force = false
  ) => {
    // Skip if already loaded and not forcing a refresh
    if (receiptDetailsLoaded && !force && !append) {
      return;
    }

    try {
      setReceiptLoading(true);
      // Use large limit to fetch all data at once for infinite scrolling
      const result = await purchaseRequestApi.getAllPurchaseRequests(
        page,
        1000
      );

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

        if (append) {
          setReceiptRequests((prev) => [...prev, ...enriched]);
        } else {
          setReceiptRequests(enriched);
          // Show initial batch, infinite scroll will handle progressive loading
          setReceiptDisplayedItems(enriched.slice(0, INITIAL_ITEMS_TO_SHOW));
        }
        setReceiptCurrentPage(result.pagination.page);
        setReceiptTotalPages(result.pagination.totalPages);
        setReceiptTotalRecords(enriched.length);
        setReceiptDetailsLoaded(true);
      }
    } catch (error) {
      console.error("Error loading receipt details:", error);
      // Handle rate limiting errors
      if (error.message && error.message.includes("429")) {
        const retryAfter = 60; // Default 60 seconds
        console.warn(`Rate limit exceeded. Please wait ${retryAfter} seconds.`);
      }
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
      // Handle rate limiting errors
      if (
        error.status === 429 ||
        (error.message && error.message.includes("429"))
      ) {
        const retryAfter = error.result?.retryAfter || 60;
        console.warn(`Rate limit exceeded. Please wait ${retryAfter} seconds.`);
        // Don't show alert for vendor loading as it's not critical
      }
      // Set empty array to prevent errors
      setVendors([]);
    }
  };

  // Load products for dropdown - initial load without search
  const loadProducts = async (searchTerm = "", limit = 100) => {
    try {
      const result = await productMasterApi.getAllProducts(1, limit, {
        search: searchTerm,
      });
      if (result.success) {
        return result.data;
      }
      return [];
    } catch (error) {
      console.error("Error loading products:", error);
      return [];
    }
  };

  useEffect(() => {
    loadPurchaseRequests();
    loadVendors();
    // Load initial products without search (first 100)
    loadProducts("", 100).then((productsList) => {
      setProducts(productsList);
    });
  }, []);

  // Load to-be-delivered requests when switching to that tab (only if not already loaded)
  useEffect(() => {
    if (activeTab === "to-be-delivered" && !toBeDeliveredLoaded) {
      loadToBeDeliveredRequests();
    }
    if (activeTab === "quality-check" && !qualityCheckLoaded) {
      loadQualityCheckRequests();
    }
    if (activeTab === "receipt-details" && !receiptDetailsLoaded) {
      loadReceiptDetailsRequests();
    }
  }, [
    activeTab,
    toBeDeliveredLoaded,
    qualityCheckLoaded,
    receiptDetailsLoaded,
  ]);

  // Reset displayed items when search term or active tab changes
  useEffect(() => {
    if (activeTab === "purchase-request") {
      // Show initial batch, infinite scroll will handle progressive loading
      setPurchaseRequestDisplayedItems(
        requests.slice(0, INITIAL_ITEMS_TO_SHOW)
      );
    } else if (activeTab === "to-be-delivered") {
      // Show initial batch, infinite scroll will handle progressive loading
      setToBeDeliveredDisplayedItems(
        toBeDeliveredRequests.slice(0, INITIAL_ITEMS_TO_SHOW)
      );
    } else if (activeTab === "quality-check") {
      // Show initial batch, infinite scroll will handle progressive loading
      setQualityCheckDisplayedItems(
        qualityCheckRequests.slice(0, INITIAL_ITEMS_TO_SHOW)
      );
    } else if (activeTab === "receipt-details") {
      // Show initial batch, infinite scroll will handle progressive loading
      setReceiptDisplayedItems(receiptRequests.slice(0, INITIAL_ITEMS_TO_SHOW));
    }
  }, [
    searchTerm,
    activeTab,
    requests,
    toBeDeliveredRequests,
    qualityCheckRequests,
    receiptRequests,
  ]);

  // Infinite scroll helper functions for Purchase Request tab
  const getPurchaseRequestDisplayedData = useCallback(() => {
    return purchaseRequestDisplayedItems;
  }, [purchaseRequestDisplayedItems]);

  const hasMorePurchaseRequestData = useCallback(
    (filteredArray) => {
      return purchaseRequestDisplayedItems.length < filteredArray.length;
    },
    [purchaseRequestDisplayedItems.length]
  );

  const loadMorePurchaseRequests = useCallback(async () => {
    if (purchaseRequestLoadingMore || isLoading) return;

    setPurchaseRequestLoadingMore(true);
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Load more items progressively
    const nextItems = requests.slice(
      purchaseRequestDisplayedItems.length,
      purchaseRequestDisplayedItems.length + ITEMS_PER_LOAD
    );
    setPurchaseRequestDisplayedItems((prev) => [...prev, ...nextItems]);
    setPurchaseRequestLoadingMore(false);
  }, [
    purchaseRequestLoadingMore,
    isLoading,
    requests,
    purchaseRequestDisplayedItems.length,
  ]);

  // Infinite scroll helper functions for To Be Delivered tab
  const getToBeDeliveredDisplayedData = useCallback(() => {
    return toBeDeliveredDisplayedItems;
  }, [toBeDeliveredDisplayedItems]);

  const hasMoreToBeDeliveredData = useCallback(() => {
    return toBeDeliveredDisplayedItems.length < toBeDeliveredRequests.length;
  }, [toBeDeliveredDisplayedItems.length, toBeDeliveredRequests.length]);

  const loadMoreToBeDelivered = useCallback(async () => {
    if (toBeDeliveredLoadingMore || toBeDeliveredLoading) return;

    setToBeDeliveredLoadingMore(true);
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Load more items progressively
    const nextItems = toBeDeliveredRequests.slice(
      toBeDeliveredDisplayedItems.length,
      toBeDeliveredDisplayedItems.length + ITEMS_PER_LOAD
    );
    setToBeDeliveredDisplayedItems((prev) => [...prev, ...nextItems]);
    setToBeDeliveredLoadingMore(false);
  }, [
    toBeDeliveredLoadingMore,
    toBeDeliveredLoading,
    toBeDeliveredRequests,
    toBeDeliveredDisplayedItems.length,
  ]);

  // Infinite scroll helper functions for Quality Check tab
  const getQualityCheckDisplayedData = useCallback(() => {
    return qualityCheckDisplayedItems;
  }, [qualityCheckDisplayedItems]);

  const hasMoreQualityCheckData = useCallback(() => {
    return qualityCheckDisplayedItems.length < qualityCheckRequests.length;
  }, [qualityCheckDisplayedItems.length, qualityCheckRequests.length]);

  const loadMoreQualityCheck = useCallback(async () => {
    if (qualityCheckLoadingMore || qualityCheckLoading) return;

    setQualityCheckLoadingMore(true);
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Load more items progressively
    const nextItems = qualityCheckRequests.slice(
      qualityCheckDisplayedItems.length,
      qualityCheckDisplayedItems.length + ITEMS_PER_LOAD
    );
    setQualityCheckDisplayedItems((prev) => [...prev, ...nextItems]);
    setQualityCheckLoadingMore(false);
  }, [
    qualityCheckLoadingMore,
    qualityCheckLoading,
    qualityCheckRequests,
    qualityCheckDisplayedItems.length,
  ]);

  // Infinite scroll helper functions for Receipt Details tab
  const getReceiptDisplayedData = useCallback(() => {
    return receiptDisplayedItems;
  }, [receiptDisplayedItems]);

  const hasMoreReceiptData = useCallback(() => {
    return receiptDisplayedItems.length < receiptRequests.length;
  }, [receiptDisplayedItems.length, receiptRequests.length]);

  const loadMoreReceipt = useCallback(async () => {
    if (receiptLoadingMore || receiptLoading) return;

    setReceiptLoadingMore(true);
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Load more items progressively
    const nextItems = receiptRequests.slice(
      receiptDisplayedItems.length,
      receiptDisplayedItems.length + ITEMS_PER_LOAD
    );
    setReceiptDisplayedItems((prev) => [...prev, ...nextItems]);
    setReceiptLoadingMore(false);
  }, [
    receiptLoadingMore,
    receiptLoading,
    receiptRequests,
    receiptDisplayedItems.length,
  ]);

  // Handle vendor selection
  const handleVendorSelect = (vendorId) => {
    if (!vendorId) {
      setFormData({ ...formData, selectedVendor: null });
      setVendorData({
        companyName: "",
        vendorName: "",
        vendorPhoneNo: "",
        vendorGSTNumber: "",
        vendorAddress: "",
      });
      return;
    }
    const vendor = vendors.find((v) => v.vendor_id === vendorId);
    if (vendor) {
      setFormData({ ...formData, selectedVendor: vendorId });
      setVendorData({
        companyName: vendor.company_name || vendor.vendor_name || "",
        vendorName: vendor.vendor_name,
        vendorPhoneNo: vendor.vendor_phone_no,
        vendorGSTNumber: vendor.vendor_gst_number,
        vendorAddress: vendor.vendor_address,
      });
    }
  };

  // Handle product selection - add product to the array
  const handleProductSelect = (productId, index, productObject = null) => {
    if (!productId) {
      setFormData((prev) => {
        const newProducts = [...prev.products];
        if (index >= 0 && index < newProducts.length) {
          newProducts[index] = { product_id: null, selectedVariants: [] };
        }
        return { ...prev, products: newProducts };
      });
      return;
    }

    // If product object is provided (from search results), use it; otherwise try to find in products array
    // This maintains backward compatibility - existing calls without productObject work the same way
    const product =
      productObject || products.find((p) => p.product_id === productId);

    // Original logic: only proceed if product is found (maintains exact same behavior)
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

      // If product was from search results and not in initial products, add it to products array
      // so it can be found later when displaying selected product
      if (productObject && !products.find((p) => p.product_id === productId)) {
        setProducts((prev) => [...prev, productObject]);
      }
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
      if (!formData.selectedVendor) {
        alert("Please select a company before submitting.");
        setIsSubmitting(false);
        return;
      }

      const missingProductIndex = formData.products.findIndex(
        (product) => !product.product_id
      );
      if (missingProductIndex !== -1) {
        alert(
          `Please select a product for Product #${missingProductIndex + 1}.`
        );
        setIsSubmitting(false);
        return;
      }

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
        await loadPurchaseRequests(currentPage, false, true); // force = true after create/update

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
      companyName: "",
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
      companyName: request.company_name || request.vendor_name || "",
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
          await loadPurchaseRequests(currentPage, false, true); // force = true after delete
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
  const [viewDocuments, setViewDocuments] = useState([]);
  const [docPreviewOpen, setDocPreviewOpen] = useState(false);
  const [docPreviewUrl, setDocPreviewUrl] = useState("");
  const [docPreviewName, setDocPreviewName] = useState("");
  const [purchaseOrderInfo, setPurchaseOrderInfo] = useState(null);
  const [isDownloadingPO, setIsDownloadingPO] = useState(false);
  const [grnInfo, setGrnInfo] = useState(null);
  const [isDownloadingGrn, setIsDownloadingGrn] = useState(false);
  const [qrPreviewData, setQrPreviewData] = useState(null);
  const [qrPreviewSku, setQrPreviewSku] = useState(null);
  const [qrGenerationStatus, setQrGenerationStatus] = useState({});

  useEffect(() => {
    return () => {
      if (docPreviewUrl && docPreviewUrl.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(docPreviewUrl);
        } catch (_) {}
      }
    };
  }, [docPreviewUrl]);
  const handleViewRequest = async (request, sourceTab = null, options = {}) => {
    const { highlightItemId = undefined, skipFetch = false } = options;
    // Normalize highlighted row tracking so comparisons are string-safe
    const normalizedHighlight =
      highlightItemId === undefined || highlightItemId === null
        ? null
        : String(highlightItemId);
    setHighlightedItemId(normalizedHighlight);

    try {
      const shouldIncludeQualityCheck =
        sourceTab === "quality-check" ||
        request?.status === "arrived" ||
        request?.status === "fulfilled";

      let fetchedRequest = request;
      if (!skipFetch && request?.request_id) {
        try {
          const result = await purchaseRequestApi.getPurchaseRequestById(
            request.request_id,
            shouldIncludeQualityCheck
          );
          if (result.success) {
            fetchedRequest = result.data;
          }
        } catch (fetchError) {
          console.error("Error refreshing purchase request data:", fetchError);
        }
      }

      if (!fetchedRequest && request?.request_id) {
        fetchedRequest = request;
      }

      if (!fetchedRequest) {
        console.error("No purchase request data available to display");
        return;
      }

      setSelectedRequest(fetchedRequest);

      // Load documents for this request
      try {
        const docs = await qualityCheckApi.listDocuments(
          fetchedRequest.request_id
        );
        setViewDocuments(docs.success ? docs.data : []);
      } catch (e) {
        setViewDocuments([]);
      }

      // Check if Purchase Order PDF exists
      try {
        const poExists = await purchaseRequestApi.checkPurchaseOrderExists(
          fetchedRequest.request_id
        );
        if (poExists) {
          const poInfo = await purchaseRequestApi.getPurchaseOrderInfo(
            fetchedRequest.request_id
          );
          if (poInfo.success) {
            setPurchaseOrderInfo(poInfo.data);
          }
        } else {
          setPurchaseOrderInfo(null);
        }
      } catch (e) {
        console.error("Error checking Purchase Order:", e);
        setPurchaseOrderInfo(null);
      }

      // Check if GRN PDF exists
      try {
        const grnExists = await qualityCheckApi.checkGrnExists(
          fetchedRequest.request_id
        );
        if (grnExists) {
          const grnInfoResult = await qualityCheckApi.getGrnInfo(
            fetchedRequest.request_id
          );
          if (grnInfoResult.success) {
            setGrnInfo(grnInfoResult.data);
          }
        } else {
          setGrnInfo(null);
        }
      } catch (e) {
        console.error("Error checking GRN:", e);
        setGrnInfo(null);
      }

      setViewModalOpen(true);
    } catch (error) {
      console.error("Error loading request details:", error);
      // Fallback to existing request data if API call fails
      if (request) {
        setSelectedRequest(request);
      }
      setViewModalOpen(true);
    }
  };

  useEffect(() => {
    if (!searchParams) return;
    if (qrHandledRef.current) return;

    const fromQr = searchParams.get("fromQr");
    const requestIdParam = searchParams.get("requestId");
    const itemIdParam = searchParams.get("itemId");

    if (!fromQr || !requestIdParam || !itemIdParam) {
      return;
    }

    const requestIdNum = Number(requestIdParam);
    const itemIdNum = Number(itemIdParam);

    if (!Number.isFinite(requestIdNum) || !Number.isFinite(itemIdNum)) {
      qrHandledRef.current = true;
      return;
    }

    // Don't set qrHandledRef here - set it only after modal is successfully opened

    const openFromQr = async () => {
      try {
        setActiveTab("purchase-request");

        let requestToOpen =
          requests.find((req) => Number(req.request_id) === requestIdNum) ||
          qualityCheckRequests.find(
            (req) => Number(req.request_id) === requestIdNum
          ) ||
          receiptRequests.find(
            (req) => Number(req.request_id) === requestIdNum
          ) ||
          toBeDeliveredRequests.find(
            (req) => Number(req.request_id) === requestIdNum
          );

        let shouldSkipFetch = false;

        if (!requestToOpen) {
          try {
            const result = await purchaseRequestApi.getPurchaseRequestById(
              requestIdNum,
              true
            );
            if (result.success) {
              requestToOpen = result.data;
              shouldSkipFetch = true;
            }
          } catch (error) {
            console.error("Failed to load request for QR deep link:", error);
          }
        }

        if (requestToOpen) {
          await handleViewRequest(requestToOpen, null, {
            highlightItemId: itemIdNum,
            skipFetch: shouldSkipFetch,
          });
        } else {
          await handleViewRequest(
            { request_id: requestIdNum, items: [] },
            null,
            {
              highlightItemId: itemIdNum,
            }
          );
        }

        // Only mark as handled and remove query params AFTER modal is opened
        // Use setTimeout to ensure modal state has updated
        setTimeout(() => {
          qrHandledRef.current = true;
          router.replace("/receiving-management", { scroll: false });
        }, 100);
      } catch (error) {
        console.error("Error opening QR deep link:", error);
        // Don't mark as handled on error, so it can retry if needed
      }
    };

    openFromQr();
  }, [
    searchParams,
    requests,
    qualityCheckRequests,
    receiptRequests,
    toBeDeliveredRequests,
    handleViewRequest,
    router,
  ]);

  // Helper function to add SKU text to QR code image
  const addSkuToQrImage = async (imageBlob, sku) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(imageBlob);

      img.onload = () => {
        URL.revokeObjectURL(url);

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const qrWidth = img.width;
        const qrHeight = img.height;
        const padding = 20;
        const textHeight = sku ? 40 : 0;
        const canvasWidth = qrWidth + padding * 2;
        const canvasHeight = qrHeight + padding * 2 + textHeight;

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // Fill white background
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Draw QR code image
        ctx.drawImage(img, padding, padding, qrWidth, qrHeight);

        // Add SKU text at the bottom if provided
        if (sku) {
          ctx.fillStyle = "#000000";
          ctx.font = "bold 16px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          const textY = qrHeight + padding + textHeight / 2;
          ctx.fillText(`SKU: ${sku}`, canvasWidth / 2, textY);
        }

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to create blob from canvas"));
          }
        }, "image/png");
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image"));
      };

      img.src = url;
    });
  };

  const handleGenerateQrCodes = async (request) => {
    if (!request) return;
    const requestId = request.request_id;

    // Check if QR codes already exist
    const hasQrCodes =
      request.items?.some(
        (item) => item.qr_code?.image_base64 || item.qr_code?.file_name
      ) || false;

    if (!hasQrCodes) {
      // Only show confirmation for generating new QR codes
      if (
        !window.confirm(
          "Are you sure you want to generate QR codes for this request?"
        )
      ) {
        return;
      }
    }

    setQrGenerationStatus((prev) => ({ ...prev, [requestId]: true }));

    try {
      // Only generate if QR codes don't exist
      if (!hasQrCodes) {
        await purchaseRequestApi.generateQrCodes(requestId);
      }

      try {
        // Reload the request to get updated QR codes with file names (or use existing if already generated)
        let updatedRequestResult;
        if (!hasQrCodes) {
          updatedRequestResult =
            await purchaseRequestApi.getPurchaseRequestById(requestId, true);
        } else {
          // Use existing request data if QR codes already exist
          updatedRequestResult = { success: true, data: request };
        }

        let itemsWithSku = [];
        const vendorId =
          updatedRequestResult.data?.vendor_id || request.vendor_id || "";
        const requestData = updatedRequestResult.data || request;
        if (requestData?.items) {
          itemsWithSku = requestData.items.map((item) => ({
            qrFileName: item.qr_code?.file_name,
            sku: item.sku,
            itemId: item.item_id,
          }));
        }

        // Download the ZIP
        const zipBlob = await purchaseRequestApi.downloadQrCodesZip(requestId);

        // Process ZIP to add SKU to each QR code
        try {
          // Dynamic import of JSZip
          const JSZip = (await import("jszip")).default;
          const zip = await JSZip.loadAsync(zipBlob);
          const newZip = new JSZip();

          // Collect all files first
          const fileEntries = [];
          zip.forEach((relativePath, file) => {
            if (!file.dir) {
              fileEntries.push({ relativePath, file });
            }
          });

          // Track used filenames to prevent collisions
          const usedFilenames = new Map();

          // Process each file sequentially to avoid race conditions with filename generation
          for (const { relativePath, file } of fileEntries) {
            if (relativePath.endsWith(".png")) {
              // Find matching SKU for this file
              const item = itemsWithSku.find(
                (item) =>
                  item.qrFileName === relativePath ||
                  relativePath.includes(
                    item.qrFileName?.replace(".png", "") || ""
                  ) ||
                  item.qrFileName?.includes(relativePath.replace(".png", "")) ||
                  relativePath.includes(String(item.itemId))
              );
              const sku = item?.sku ?? null;
              const itemId = item?.itemId ?? null;

              // Get the image blob
              const imageBlob = await file.async("blob");

              // Add SKU to the image
              const modifiedBlob = await addSkuToQrImage(imageBlob, sku);

              // Create new filename with vendor_id and SKU: QR-{vendor_id}-{sku}.png
              // Use itemId as fallback to ensure uniqueness when SKU is missing
              let newFileName = relativePath;
              if (sku && vendorId) {
                const sanitizedSku = sku.replace(/[^a-zA-Z0-9_-]/g, "_");
                const sanitizedVendorId = String(vendorId).replace(
                  /[^a-zA-Z0-9_-]/g,
                  "_"
                );
                newFileName = `QR-${sanitizedVendorId}-${sanitizedSku}.png`;
              } else if (sku) {
                const sanitizedSku = sku.replace(/[^a-zA-Z0-9_-]/g, "_");
                newFileName = `QR-${sanitizedSku}.png`;
              } else if (vendorId) {
                const sanitizedVendorId = String(vendorId).replace(
                  /[^a-zA-Z0-9_-]/g,
                  "_"
                );
                // Use itemId to ensure uniqueness when SKU is missing
                if (itemId !== null) {
                  const sanitizedItemId = String(itemId).replace(
                    /[^a-zA-Z0-9_-]/g,
                    "_"
                  );
                  newFileName = `QR-${sanitizedVendorId}-${sanitizedItemId}.png`;
                } else {
                  newFileName = `QR-${sanitizedVendorId}.png`;
                }
              } else if (itemId !== null) {
                // Fallback: use itemId if neither SKU nor vendorId exists
                const sanitizedItemId = String(itemId).replace(
                  /[^a-zA-Z0-9_-]/g,
                  "_"
                );
                newFileName = `QR-${sanitizedItemId}.png`;
              }

              // Ensure filename is unique (handle collisions by appending counter)
              let finalFileName = newFileName;
              let counter = 1;
              while (usedFilenames.has(finalFileName)) {
                const baseWithoutExt = newFileName.replace(/\.png$/, "");
                finalFileName = `${baseWithoutExt}-${counter}.png`;
                counter++;
              }
              usedFilenames.set(finalFileName, true);

              // Add to new ZIP with final unique filename
              newZip.file(finalFileName, modifiedBlob);
            } else {
              // Keep non-image files as-is
              const content = await file.async("blob");
              newZip.file(relativePath, content);
            }
          }

          // Generate the new ZIP
          const modifiedZipBlob = await newZip.generateAsync({ type: "blob" });

          // Download the modified ZIP
          const url = URL.createObjectURL(modifiedZipBlob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `QR-${requestId}.zip`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } catch (zipError) {
          console.error("Error processing ZIP with SKU:", zipError);
          // Fallback: download original ZIP if processing fails
          const url = URL.createObjectURL(zipBlob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `QR-${requestId}.zip`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      } catch (downloadError) {
        console.error("Error downloading QR codes:", downloadError);
        alert(
          downloadError.message ||
            "QR codes were generated but the download failed. Please try downloading again."
        );
      }

      await loadQualityCheckRequests(1, false, true); // force = true after QR generation

      if (selectedRequest && selectedRequest.request_id === requestId) {
        await handleViewRequest(request, "quality-check");
      }

      alert(
        hasQrCodes
          ? "QR codes downloaded successfully."
          : "QR codes generated successfully."
      );
    } catch (error) {
      console.error("Error generating QR codes:", error);
      alert(error.message || "Failed to generate QR codes. Please try again.");
    } finally {
      setQrGenerationStatus((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const handleDownloadQrImage = async (qrCode, sku = null) => {
    if (!qrCode?.image_base64) {
      return;
    }

    try {
      // Create an image element to load the QR code
      const img = new Image();
      img.crossOrigin = "anonymous";

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = qrCode.image_base64;
      });

      // ============================================
      // PRINTER SPECIFICATIONS FOR 2-UP QR LABELS
      // ============================================
      const DPI = 300; // Dots per inch for print quality
      const INCH_TO_PX = DPI;

      // Page dimensions (in inches, converted to pixels)
      const PAGE_WIDTH_IN = 3.15;  // Total page width
      const PAGE_HEIGHT_IN = 1.00; // Total page height
      const PAGE_WIDTH_PX = Math.round(PAGE_WIDTH_IN * INCH_TO_PX);  // 945px
      const PAGE_HEIGHT_PX = Math.round(PAGE_HEIGHT_IN * INCH_TO_PX); // 300px

      // Gap specifications (in inches, converted to pixels)
      const LEFT_GAP_IN = 0.04;   // Left edge gap
      const CENTER_GAP_IN = 0.08; // Center gap between labels
      const RIGHT_GAP_IN = 0.04;  // Right edge gap
      const LEFT_GAP_PX = Math.round(LEFT_GAP_IN * INCH_TO_PX);   // 12px
      const CENTER_GAP_PX = Math.round(CENTER_GAP_IN * INCH_TO_PX); // 24px
      const RIGHT_GAP_PX = Math.round(RIGHT_GAP_IN * INCH_TO_PX);  // 12px

      // Label dimensions (in inches, converted to pixels)
      const LABEL_WIDTH_IN = 1.50;  // Each label width
      const LABEL_HEIGHT_IN = 1.00; // Each label height
      const LABEL_WIDTH_PX = Math.round(LABEL_WIDTH_IN * INCH_TO_PX);  // 450px
      const LABEL_HEIGHT_PX = Math.round(LABEL_HEIGHT_IN * INCH_TO_PX); // 300px

      // QR code dimensions (scaled to fit with SKU text)
      const QR_WIDTH_IN = 0.85; // QR code width (leaves room for SKU text)
      const QR_WIDTH_PX = Math.round(QR_WIDTH_IN * INCH_TO_PX); // 255px
      // QR codes are square, so height equals width
      const QR_HEIGHT_PX = QR_WIDTH_PX; // 255px

      // SKU text dimensions
      const SKU_TEXT_HEIGHT_PX = 30; // Height allocated for SKU text
      const SKU_FONT_SIZE_PX = 20;   // Font size for SKU text
      const SKU_MARGIN_TOP_PX = 10;  // Margin above SKU text

      // Calculate label positions
      const LABEL1_START_X = LEFT_GAP_PX; // 12px
      const LABEL2_START_X = LABEL1_START_X + LABEL_WIDTH_PX + CENTER_GAP_PX; // 486px

      // Create canvas with exact printer specifications
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      canvas.width = PAGE_WIDTH_PX;  // 945px
      canvas.height = PAGE_HEIGHT_PX; // 300px

      // Enable high-quality rendering for printing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Fill white background
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, PAGE_WIDTH_PX, PAGE_HEIGHT_PX);

      // Helper function to draw a single QR code label
      const drawLabel = (labelStartX) => {
        // Calculate center position for QR code within label
        const labelCenterX = labelStartX + LABEL_WIDTH_PX / 2;
        const qrX = labelCenterX - QR_WIDTH_PX / 2;
        
        // Calculate vertical position: center QR code, leave space for SKU text below
        const availableHeight = LABEL_HEIGHT_PX - SKU_TEXT_HEIGHT_PX - SKU_MARGIN_TOP_PX;
        const qrY = (LABEL_HEIGHT_PX - availableHeight) / 2;

        // Draw QR code image (scaled to exact size)
        ctx.drawImage(
          img,
          qrX,                    // x position
          qrY,                    // y position
          QR_WIDTH_PX,            // width
          QR_HEIGHT_PX            // height
        );

        // Add SKU text at the bottom of the label if provided
        if (sku) {
          ctx.fillStyle = "#000000";
          ctx.font = `bold ${SKU_FONT_SIZE_PX}px Arial`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          // Position SKU text at bottom of label
          const skuTextY = LABEL_HEIGHT_PX - SKU_TEXT_HEIGHT_PX / 2;
          ctx.fillText(`SKU: ${sku}`, labelCenterX, skuTextY);
        }
      };

      // Draw first label (left side)
      drawLabel(LABEL1_START_X);
      
      // Draw second identical label (right side)
      drawLabel(LABEL2_START_X);

      // Convert canvas to blob and download (maximum quality for printing)
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error("Failed to create blob from canvas");
          // Fallback to original download
          const link = document.createElement("a");
          link.href = qrCode.image_base64;
          link.download = qrCode.file_name || "qr-code.png";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;

        // Create filename with vendor_id and SKU: QR-{vendor_id}-{sku}.png
        let fileName = "qr-code.png";
        if (sku) {
          const sanitizedSku = sku.replace(/[^a-zA-Z0-9_-]/g, "_");
          // Try to get vendor_id from selectedRequest or item
          const vendorId = selectedRequest?.vendor_id || "";
          if (vendorId) {
            const sanitizedVendorId = String(vendorId).replace(
              /[^a-zA-Z0-9_-]/g,
              "_"
            );
            fileName = `QR-${sanitizedVendorId}-${sanitizedSku}.png`;
          } else {
            fileName = `QR-${sanitizedSku}.png`;
          }
        } else {
          const vendorId = selectedRequest?.vendor_id || "";
          if (vendorId) {
            const sanitizedVendorId = String(vendorId).replace(
              /[^a-zA-Z0-9_-]/g,
              "_"
            );
            fileName = `QR-${sanitizedVendorId}.png`;
          }
        }

        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, "image/png", 1.0); // Maximum quality for printing
    } catch (error) {
      console.error("Error processing QR code with SKU:", error);
      // Fallback to original download method
      const link = document.createElement("a");
      link.href = qrCode.image_base64;
      link.download = qrCode.file_name || "qr-code.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Handle settings icon click (open status confirmation modal)
  const handleSettingsClick = async (
    request,
    targetStatus = "to_be_delivered"
  ) => {
    // If attempting arrived -> fulfilled, enforce QC + Documents + GRN + QR Codes presence
    if (targetStatus === "fulfilled") {
      try {
        // 1) Quality checks present
        const qcRes = await qualityCheckApi.getQualityChecksByRequestId(
          request.request_id
        );
        const hasAnyQC =
          qcRes?.success && Array.isArray(qcRes.data) && qcRes.data.length > 0;

        // 2) Documents present (invoice or PO preferred, but accept any)
        const docsRes = await qualityCheckApi.listDocuments(request.request_id);
        const docs =
          docsRes?.success && Array.isArray(docsRes.data) ? docsRes.data : [];
        const hasAnyDoc = docs.length > 0;

        // 3) GRN PDF exists
        const grnExists = await qualityCheckApi.checkGrnExists(request.request_id);

        // 4) QR codes exist - need to fetch fresh request data to check
        const requestData = await purchaseRequestApi.getPurchaseRequestById(
          request.request_id
        );
        const hasQrCodes = requestData?.success && requestData?.data?.items?.some(
          (item) => item.qr_code?.image_base64 || item.qr_code?.file_name
        ) || false;

        // Build validation message with all missing items
        const missingItems = [];
        if (!hasAnyQC) missingItems.push("Quality Check inspection");
        if (!hasAnyDoc) missingItems.push("at least one document (invoice/PO)");
        if (!grnExists) missingItems.push("GRN PDF");
        if (!hasQrCodes) missingItems.push("QR codes");

        if (missingItems.length > 0) {
          const msg = `⚠️ Cannot mark as Fulfilled!\n\nPlease complete the following:\n\n${missingItems.map((item, idx) => `  ${idx + 1}. ${item}`).join('\n')}\n\n📋 Required Workflow:\n  1. Complete Quality Check inspection (Inspect button)\n  2. Upload documents (invoice/PO) in View modal\n  3. Generate GRN PDF (button in Quality Check tab)\n  4. Generate QR codes (button in Quality Check tab)\n  5. Then mark as Fulfilled`;
          alert(msg);
          return; // Do not open confirmation modal
        }
      } catch (e) {
        console.error("Pre-check before fulfillment failed", e);
        alert(
          "Unable to verify requirements. Please try again in a moment."
        );
        return;
      }
    }

    setRequestToUpdate(request);
    setStatusUpdateTarget(targetStatus);
    setIsUpdatingStatus(false); // Reset loading state when opening modal
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
    if (!requestToUpdate || isUpdatingStatus) return;

    // Set loading state immediately - React will handle the re-render automatically
    setIsUpdatingStatus(true);

    try {
      const result = await purchaseRequestApi.updateStatus(
        requestToUpdate.request_id,
        statusUpdateTarget
      );

      if (result.success) {
        // Close modal
        setStatusConfirmModal(false);
        setRequestToUpdate(null);
        setIsUpdatingStatus(false); // Reset loading state on success

        // Switch tab based on target
        let targetTab = "to-be-delivered"; // default
        if (statusUpdateTarget === "arrived") {
          targetTab = "quality-check";
        } else if (statusUpdateTarget === "fulfilled") {
          targetTab = "receipt-details";
        }
        setActiveTab(targetTab);

        // Reload lists with delays to prevent rate limiting
        // Force reload after status update to get fresh data
        // Add small delays between API calls to avoid hitting rate limits
        try {
          await loadPurchaseRequests(currentPage, false, true); // force = true
          await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms delay

          await loadToBeDeliveredRequests(1, false, true); // force = true
          await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms delay

          await loadQualityCheckRequests(1, false, true); // force = true
          await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms delay

          await loadReceiptDetailsRequests(1, false, true); // force = true

          // If moving to to_be_delivered, wait a moment for PDF generation, then refresh
          if (statusUpdateTarget === "to_be_delivered") {
            setTimeout(async () => {
              try {
                await loadToBeDeliveredRequests(1, false, true); // force = true
              } catch (refreshError) {
                console.error(
                  "Error refreshing to-be-delivered requests:",
                  refreshError
                );
                // Don't show alert for background refresh errors
              }
            }, 2000); // Wait 2 seconds for PDF generation to complete
          }
        } catch (reloadError) {
          console.error(
            "Error reloading lists after status update:",
            reloadError
          );
          // Don't show alert here as the status update was successful
          // The lists will refresh when user switches tabs
        }

        console.log("Purchase request status updated successfully");
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error("Error updating purchase request status:", error);
      // Handle rate limiting errors specifically
      if (error.message && error.message.includes("429")) {
        const retryAfter = 60; // Default 60 seconds
        alert(
          `Too many requests. Please wait ${retryAfter} seconds before trying again.`
        );
      } else {
        alert("Failed to update purchase request status. Please try again.");
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle inspect button click - open inspection modal
  const handleInspectClick = async (request) => {
    // Reset all inspection state first to prevent showing stale data
    setInspectionData([]);
    setQualityCheckerName("");
    setInspectionDate(new Date().toISOString().split("T")[0]);
    setIsEditingInspection(false);
    setIsLoadingInspection(true);

    // Set request and open modal
    setRequestToInspect(request);
    setInspectionModalOpen(true);

    try {
      // Load existing quality checks if any
      const result = await qualityCheckApi.getQualityChecksByRequestId(
        request.request_id
      );

      if (result.success && result.data.length > 0) {
        // Pre-populate with existing data - editing mode
        setIsEditingInspection(true);
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
        const defaultCheckerName =
          user?.displayName?.trim() ||
          user?.email?.split("@")[0] ||
          "Quality Checker";
        setQualityCheckerName(
          result.data[0]?.quality_checker_name?.trim() || defaultCheckerName
        );
        setInspectionDate(
          result.data[0]?.inspection_date ||
            new Date().toISOString().split("T")[0]
        );
      } else {
        // Initialize with empty data - new inspection
        setIsEditingInspection(false);
        const inspectionItems = request.items.map((item) => ({
          item_id: item.item_id,
          invoice_quantity: item.quantity || 0,
          actual_quantity: 0,
          sorted_quantity: 0,
          damage_quantity: 0,
          notes: "",
        }));
        setInspectionData(inspectionItems);
        const defaultCheckerName =
          user?.displayName?.trim() ||
          user?.email?.split("@")[0] ||
          "Quality Checker";
        setQualityCheckerName(defaultCheckerName);
        setInspectionDate(new Date().toISOString().split("T")[0]);
      }
    } catch (error) {
      console.error("Error loading quality checks:", error);
      // Initialize with empty data - new inspection
      setIsEditingInspection(false);
      const inspectionItems = request.items.map((item) => ({
        item_id: item.item_id,
        invoice_quantity: item.quantity || 0,
        actual_quantity: 0,
        sorted_quantity: 0,
        damage_quantity: 0,
        notes: "",
      }));
      setInspectionData(inspectionItems);
      const defaultCheckerName =
        user?.displayName?.trim() ||
        user?.email?.split("@")[0] ||
        "Quality Checker";
      setQualityCheckerName(defaultCheckerName);
      setInspectionDate(new Date().toISOString().split("T")[0]);
    } finally {
      setIsLoadingInspection(false);
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
        await loadQualityCheckRequests(1, false, true); // force = true after saving inspection
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
              displayedItems={purchaseRequestDisplayedItems}
              isLoadingMore={purchaseRequestLoadingMore}
              containerRef={purchaseRequestContainerRef}
              getDisplayedData={getPurchaseRequestDisplayedData}
              hasMoreData={hasMorePurchaseRequestData}
              loadMoreData={loadMorePurchaseRequests}
            />
          )}
          {activeTab === "to-be-delivered" && (
            <ToBeDeliveredTab
              requests={toBeDeliveredRequests}
              isLoading={toBeDeliveredLoading}
              handleViewRequest={handleViewRequest}
              handleSettingsClick={handleSettingsClick}
              viewModalOpen={viewModalOpen}
              setViewModalOpen={setViewModalOpen}
              selectedRequest={selectedRequest}
              displayedItems={toBeDeliveredDisplayedItems}
              isLoadingMore={toBeDeliveredLoadingMore}
              containerRef={toBeDeliveredContainerRef}
              getDisplayedData={getToBeDeliveredDisplayedData}
              hasMoreData={hasMoreToBeDeliveredData}
              loadMoreData={loadMoreToBeDelivered}
            />
          )}
          {activeTab === "quality-check" && (
            <QualityCheckTab
              requests={qualityCheckRequests}
              isLoading={qualityCheckLoading}
              handleViewRequest={(request) =>
                handleViewRequest(request, "quality-check")
              }
              handleInspectClick={handleInspectClick}
              handleSettingsClick={handleSettingsClick}
              handleGenerateQrCodes={handleGenerateQrCodes}
              qrGenerationStatus={qrGenerationStatus}
              viewModalOpen={viewModalOpen}
              setViewModalOpen={setViewModalOpen}
              selectedRequest={selectedRequest}
              displayedItems={qualityCheckDisplayedItems}
              isLoadingMore={qualityCheckLoadingMore}
              containerRef={qualityCheckContainerRef}
              getDisplayedData={getQualityCheckDisplayedData}
              hasMoreData={hasMoreQualityCheckData}
              loadMoreData={loadMoreQualityCheck}
            />
          )}
          {activeTab === "receipt-details" && (
            <ReceiptDetailsTab
              requests={receiptRequests}
              isLoading={receiptLoading}
              handleViewRequest={handleViewRequest}
              viewModalOpen={viewModalOpen}
              setViewModalOpen={setViewModalOpen}
              selectedRequest={selectedRequest}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              displayedItems={receiptDisplayedItems}
              isLoadingMore={receiptLoadingMore}
              containerRef={receiptContainerRef}
              getDisplayedData={getReceiptDisplayedData}
              hasMoreData={hasMoreReceiptData}
              loadMoreData={loadMoreReceipt}
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
                    onClick={() => {
                      setViewModalOpen(false);
                      setPurchaseOrderInfo(null);
                      setGrnInfo(null);
                      setQrPreviewData(null);
                      setHighlightedItemId(null);
                    }}
                  ></button>
                </div>
                <div
                  className="modal-body"
                  style={{ maxHeight: "70vh", overflowY: "auto" }}
                >
                  <div className="row mb-4">
                    <div className="col-12 col-md-6 mb-3 mb-md-0">
                      <h6 className="text-muted mb-3">Company Information</h6>
                      <div className="d-flex flex-column gap-2">
                        <div className="d-flex flex-column flex-sm-row justify-content-between gap-1">
                          <span className="text-muted">Company Name:</span>
                          <span className="fw-medium text-break">
                            {selectedRequest.company_name ||
                              selectedRequest.vendor_name}
                          </span>
                        </div>
                        <div className="d-flex flex-column flex-sm-row justify-content-between gap-1">
                          <span className="text-muted">Contact Person:</span>
                          <span className="fw-medium text-break">
                            {selectedRequest.vendor_name || "-"}
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

                  {/* Purchase Order PDF Section */}
                  {purchaseOrderInfo && (
                    <div className="mb-3">
                      <h6 className="text-muted mb-3">
                        <Icon
                          icon="mdi:file-pdf-box"
                          className="me-2"
                          style={{ color: "#dc3545" }}
                        />
                        Purchase Order
                      </h6>
                      <div
                        className="p-3 border rounded"
                        style={{ backgroundColor: "#f8f9fa" }}
                      >
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
                          <div>
                            <div className="fw-medium">
                              PO Number:{" "}
                              {purchaseOrderInfo.purchase_order_number}
                            </div>
                            <small className="text-muted">
                              Generated:{" "}
                              {new Date(
                                purchaseOrderInfo.generated_at
                              ).toLocaleString()}
                            </small>
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            disabled={isDownloadingPO}
                            onClick={async () => {
                              if (!selectedRequest) return;
                              setIsDownloadingPO(true);
                              try {
                                const blob =
                                  await purchaseRequestApi.downloadPurchaseOrderPdf(
                                    selectedRequest.request_id
                                  );
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download =
                                  purchaseOrderInfo.file_name ||
                                  `${purchaseOrderInfo.purchase_order_number}.pdf`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                              } catch (error) {
                                console.error("Error downloading PDF:", error);
                                alert(
                                  "Failed to download Purchase Order PDF. Please try again."
                                );
                              } finally {
                                setIsDownloadingPO(false);
                              }
                            }}
                          >
                            {isDownloadingPO ? (
                              <>
                                <span
                                  className="spinner-border spinner-border-sm me-2"
                                  role="status"
                                  aria-hidden="true"
                                ></span>
                                Downloading...
                              </>
                            ) : (
                              <>
                                <Icon
                                  icon="mdi:download"
                                  className="me-1"
                                  width="16"
                                  height="16"
                                />
                                Download PDF
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* GRN PDF Section */}
                  {grnInfo && (
                    <div className="mb-3">
                      <h6 className="text-muted mb-3">
                        <Icon
                          icon="mdi:file-pdf-box"
                          className="me-2"
                          style={{ color: "#16a34a" }}
                        />
                        GRN (Goods Receipt Note)
                      </h6>
                      <div
                        className="p-3 border rounded"
                        style={{ backgroundColor: "#f8f9fa" }}
                      >
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
                          <div>
                            <div className="fw-medium">
                              GRN Number: {grnInfo.grn_number}
                            </div>
                            <small className="text-muted">
                              Generated:{" "}
                              {new Date(grnInfo.generated_at).toLocaleString()}
                            </small>
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{
                              backgroundColor: "#16a34a",
                              color: "white",
                            }}
                            disabled={isDownloadingGrn}
                            onClick={async () => {
                              if (!selectedRequest) return;
                              setIsDownloadingGrn(true);
                              try {
                                // Fetch the latest GRN info to ensure we have the correct grn_number
                                let currentGrnInfo = grnInfo;
                                if (
                                  !currentGrnInfo ||
                                  !currentGrnInfo.grn_number
                                ) {
                                  const exists =
                                    await qualityCheckApi.checkGrnExists(
                                      selectedRequest.request_id
                                    );
                                  if (exists) {
                                    const info =
                                      await qualityCheckApi.getGrnInfo(
                                        selectedRequest.request_id
                                      );
                                    if (info.success && info.data) {
                                      currentGrnInfo = info.data;
                                      setGrnInfo(currentGrnInfo);
                                    }
                                  }
                                }

                                const blob =
                                  await qualityCheckApi.downloadGrnPdf(
                                    selectedRequest.request_id
                                  );
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download =
                                  currentGrnInfo?.file_name ||
                                  (currentGrnInfo?.grn_number
                                    ? `${currentGrnInfo.grn_number}.pdf`
                                    : `GRN-${selectedRequest.request_id}.pdf`);
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                              } catch (error) {
                                console.error(
                                  "Error downloading GRN PDF:",
                                  error
                                );
                                alert(
                                  "Failed to download GRN PDF. Please try again."
                                );
                              } finally {
                                setIsDownloadingGrn(false);
                              }
                            }}
                          >
                            {isDownloadingGrn ? (
                              <>
                                <span
                                  className="spinner-border spinner-border-sm me-2"
                                  role="status"
                                  aria-hidden="true"
                                ></span>
                                Downloading...
                              </>
                            ) : (
                              <>
                                <Icon
                                  icon="mdi:download"
                                  className="me-1"
                                  width="16"
                                  height="16"
                                />
                                Download PDF
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Documents */}
                  <div className="mb-3">
                    <h6 className="text-muted mb-3">Documents</h6>
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered">
                        <thead className="table-light">
                          <tr>
                            <th className="small">Type</th>
                            <th className="small">Name</th>
                            <th className="small">Size</th>
                            <th className="small">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewDocuments.length === 0 ? (
                            <tr>
                              <td className="small text-center" colSpan="4">
                                No documents uploaded
                              </td>
                            </tr>
                          ) : (
                            viewDocuments.map((d) => (
                              <tr key={d.document_id}>
                                <td className="small text-capitalize">
                                  {d.doc_type?.replace(/_/g, " ")}
                                </td>
                                <td className="small">{d.file_name}</td>
                                <td className="small">
                                  {Math.ceil((d.file_size_bytes || 0) / 1024)}{" "}
                                  KB
                                </td>
                                <td className="small">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={async () => {
                                      try {
                                        const blob =
                                          await qualityCheckApi.fetchDocumentBlob(
                                            d.document_id
                                          );
                                        const url = URL.createObjectURL(blob);
                                        setDocPreviewUrl(url);
                                        setDocPreviewName(
                                          d.file_name || "Document"
                                        );
                                        setDocPreviewOpen(true);
                                      } catch (e) {
                                        console.error(
                                          "Failed to fetch document",
                                          e
                                        );
                                        alert("Unable to preview document.");
                                      }
                                    }}
                                  >
                                    View
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
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
                                <th className="small">Common Name</th>
                                <th className="small">HSN Code</th>
                                <th className="small">Variant</th>
                                <th className="small">SKU</th>
                                <th className="small">Quantity</th>
                                <th className="small">Rate</th>
                                <th className="small">Taxable Amt</th>
                                <th className="small">IGST %</th>
                                <th className="small">SGST %</th>
                                <th className="small">CGST %</th>
                                <th className="small">GST Amt</th>
                                <th className="small">Net Amount</th>
                                <th className="small">QR</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedRequest.items.map((item, index) => (
                                <tr
                                  key={index}
                                  className={
                                    highlightedItemId &&
                                    String(item.item_id) === highlightedItemId
                                      ? "table-warning"
                                      : ""
                                  }
                                >
                                  <td className="small">
                                    {item.product_name || "-"}
                                  </td>
                                  <td className="small">
                                    {item.common_name || "-"}
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
                                  <td className="small">
                                    {item.qr_code ? (
                                      <div className="d-flex flex-wrap gap-1">
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-outline-primary"
                                          onClick={() => {
                                            setQrPreviewData(item.qr_code);
                                            setQrPreviewSku(item.sku);
                                          }}
                                        >
                                          View
                                        </button>
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-outline-secondary"
                                          onClick={() =>
                                            handleDownloadQrImage(
                                              item.qr_code,
                                              item.sku
                                            )
                                          }
                                        >
                                          Download
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-muted">
                                        Not generated
                                      </span>
                                    )}
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
                                    <tr
                                      key={index}
                                      className={
                                        highlightedItemId &&
                                        String(item.item_id) ===
                                          highlightedItemId
                                          ? "table-warning"
                                          : ""
                                      }
                                    >
                                      <td className="small">
                                        {item.product_name || "-"}
                                      </td>
                                      <td className="small">
                                        {item.variant_display_name || "-"}
                                      </td>
                                      <td className="small text-center">
                                        {qc.invoice_quantity || 0}
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

        {docPreviewOpen && (
          <div
            className="modal show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            <div
              className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable"
              style={{ maxWidth: "min(1200px, 95vw)" }}
            >
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <Icon icon="mdi:eye" className="me-2" />
                    {docPreviewName || "Document"}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setDocPreviewOpen(false)}
                  ></button>
                </div>
                <div className="modal-body" style={{ height: "75vh" }}>
                  {docPreviewUrl ? (
                    <iframe
                      title="Document Preview"
                      src={docPreviewUrl}
                      style={{ width: "100%", height: "100%", border: 0 }}
                    />
                  ) : (
                    <div className="text-muted">No preview available.</div>
                  )}
                </div>
                <div className="modal-footer">
                  <a
                    href={docPreviewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary"
                  >
                    Open in new tab
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {qrPreviewData && (
          <div
            className="modal show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            <div className="modal-dialog modal-md modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <Icon icon="mdi:qrcode" className="me-2" />
                    QR Code Preview
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setQrPreviewData(null);
                      setQrPreviewSku(null);
                    }}
                  ></button>
                </div>
                <div className="modal-body d-flex flex-column align-items-center">
                  {qrPreviewData.image_base64 ? (
                    <>
                      <img
                        src={qrPreviewData.image_base64}
                        alt="QR Code"
                        style={{ maxWidth: "100%", height: "auto" }}
                      />
                      {qrPreviewSku && (
                        <div
                          className="mt-3 text-center"
                          style={{
                            fontSize: "16px",
                            fontWeight: "600",
                            color: "#1f2937",
                          }}
                        >
                          SKU: {qrPreviewSku}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-muted">No preview available.</div>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() =>
                      handleDownloadQrImage(qrPreviewData, qrPreviewSku)
                    }
                    disabled={!qrPreviewData.image_base64}
                  >
                    Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Update Confirmation Modal (Procurement-style UI) */}
        {statusConfirmModal && (
          <>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
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
                    if (!isUpdatingStatus) {
                      setStatusConfirmModal(false);
                      setRequestToUpdate(null);
                      setIsUpdatingStatus(false); // Reset loading state when closing
                    }
                  }}
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
                    color: isUpdatingStatus ? "#9ca3af" : "#6b7280",
                    cursor: isUpdatingStatus ? "not-allowed" : "pointer",
                    opacity: isUpdatingStatus ? 0.5 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s",
                    fontSize: "20px",
                  }}
                  onMouseEnter={(e) => {
                    if (!isUpdatingStatus) {
                      e.currentTarget.style.background = "#f3f4f6";
                      e.currentTarget.style.color = "#374151";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isUpdatingStatus) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#6b7280";
                    }
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
                        if (!isUpdatingStatus) {
                          setStatusConfirmModal(false);
                          setRequestToUpdate(null);
                          setIsUpdatingStatus(false); // Reset loading state when canceling
                        }
                      }}
                      className="w-100 w-sm-auto"
                      disabled={isUpdatingStatus}
                      style={{
                        padding: "12px 18px",
                        fontSize: "15px",
                        fontWeight: 600,
                        border: "1px solid #e5e7eb",
                        borderRadius: "10px",
                        background: "white",
                        color: "#374151",
                        cursor: isUpdatingStatus ? "not-allowed" : "pointer",
                        opacity: isUpdatingStatus ? 0.6 : 1,
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isUpdatingStatus) {
                          e.currentTarget.style.background = "#f9fafb";
                          e.currentTarget.style.borderColor = "#d1d5db";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isUpdatingStatus) {
                          e.currentTarget.style.background = "white";
                          e.currentTarget.style.borderColor = "#e5e7eb";
                        }
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleStatusUpdateConfirm}
                      className="w-100 w-sm-auto"
                      disabled={isUpdatingStatus}
                      style={{
                        padding: "12px 18px",
                        fontSize: "15px",
                        fontWeight: 600,
                        border: "none",
                        borderRadius: "10px",
                        background: isUpdatingStatus ? "#9ca3af" : "#4f46e5",
                        color: "white",
                        cursor: isUpdatingStatus ? "not-allowed" : "pointer",
                        opacity: isUpdatingStatus ? 0.7 : 1,
                        transition: "background 0.2s",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                      }}
                      onMouseEnter={(e) => {
                        if (!isUpdatingStatus) {
                          e.currentTarget.style.background = "#4338ca";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isUpdatingStatus) {
                          e.currentTarget.style.background = "#4f46e5";
                        }
                      }}
                    >
                      {isUpdatingStatus ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm"
                            role="status"
                            aria-hidden="true"
                            style={{
                              width: "14px",
                              height: "14px",
                              borderWidth: "2px",
                              flexShrink: 0,
                            }}
                          />
                          <span>Sending...</span>
                        </>
                      ) : (
                        "Yes, Change Status"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
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
                    GRN
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setInspectionModalOpen(false);
                      setRequestToInspect(null);
                      setIsLoadingInspection(false);
                      // Reset inspection state when closing
                      setInspectionData([]);
                      setQualityCheckerName("");
                      setInspectionDate(new Date().toISOString().split("T")[0]);
                      setIsEditingInspection(false);
                    }}
                  ></button>
                </div>
                <div
                  className="modal-body"
                  style={{ maxHeight: "70vh", overflowY: "auto" }}
                >
                  {isLoadingInspection ? (
                    <div className="d-flex justify-content-center align-items-center py-5">
                      <div className="text-center">
                        <div
                          className="spinner-border text-primary mb-3"
                          role="status"
                          style={{ width: "3rem", height: "3rem" }}
                        >
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="text-muted">
                          Loading inspection details...
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Request Info */}
                      <div className="row mb-4">
                        <div className="col-md-6">
                          <h6 className="text-muted mb-3">
                            Request Information
                          </h6>
                          <div className="d-flex flex-column gap-2">
                            <div className="d-flex justify-content-between">
                              <span className="text-muted">Company:</span>
                              <span className="fw-medium">
                                {requestToInspect.company_name ||
                                  requestToInspect.vendor_name}
                              </span>
                            </div>
                            <div className="d-flex justify-content-between">
                              <span className="text-muted">
                                Contact Person:
                              </span>
                              <span className="fw-medium">
                                {requestToInspect.vendor_name || "-"}
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
                          <h6 className="text-muted mb-3">
                            Inspection Details
                          </h6>
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
                                disabled
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
                                onChange={(e) =>
                                  setInspectionDate(e.target.value)
                                }
                                required
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Documents Upload */}
                      <div className="mb-4">
                        <h6 className="text-muted mb-3">Documents</h6>
                        <QualityCheckDocumentsSection
                          requestId={requestToInspect.request_id}
                        />
                      </div>

                      {/* Items Inspection Table */}
                      <div className="mb-3">
                        <h6 className="text-muted mb-3">
                          Item Inspection Details
                        </h6>
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
                                const requestItem =
                                  requestToInspect.items?.find(
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
                                      {item.invoice_quantity || 0}
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
                          quantity. Actual Quantity is what was physically
                          received. Sorted Quantity is what passed inspection.
                          Damage Quantity includes all damaged items found.
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="modal-footer d-flex flex-column flex-sm-row gap-2 justify-content-end">
                  <button
                    type="button"
                    className="btn btn-primary w-100 w-sm-auto"
                    onClick={handleSaveInspection}
                    disabled={isSavingInspection || isLoadingInspection}
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
  displayedItems,
  isLoadingMore,
  containerRef,
  getDisplayedData,
  hasMoreData,
  loadMoreData,
}) => {
  // Filter data based on search term
  const filteredData = requests.filter((request) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();

    // Search by company or vendor name
    const supplierName = `${request.company_name || ""} ${
      request.vendor_name || ""
    }`
      .trim()
      .toLowerCase();
    if (supplierName && supplierName.includes(search)) {
      return true;
    }

    // Search by product names
    if (request.items && request.items.length > 0) {
      return request.items.some((item) =>
        item.product_name?.toLowerCase().includes(search)
      );
    }

    return false;
  });

  // Get displayed data for infinite scroll - slice filtered data
  const displayedData = filteredData.slice(0, displayedItems.length);

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
                  placeholder="Search by company or product..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div
            ref={containerRef}
            className="table-responsive table-scroll-container"
            style={{
              maxHeight: "600px",
              overflowY: "auto",
              overflowX: "auto",
              scrollBehavior: "smooth",
              overscrollBehavior: "auto",
            }}
            onScroll={(e) => {
              const target = e.currentTarget;
              const scrollTop = target.scrollTop;
              const scrollHeight = target.scrollHeight;
              const clientHeight = target.clientHeight;

              if (
                scrollTop + clientHeight >= scrollHeight - 10 &&
                hasMoreData(filteredData) &&
                !isLoadingMore &&
                !isLoading
              ) {
                loadMoreData();
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
            <table
              className="table table-hover"
              style={{ fontSize: "clamp(12px, 2.5vw, 14px)" }}
            >
              <thead
                style={{
                  backgroundColor: "#f9fafb",
                  borderBottom: "2px solid #e5e7eb",
                  position: "sticky",
                  top: 0,
                  zIndex: 10,
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
                    PR No
                  </th>
                  <th
                    style={{
                      fontWeight: "600",
                      color: "#374151",
                      padding: "clamp(8px, 2vw, 12px)",
                      fontSize: "clamp(11px, 2.5vw, 14px)",
                    }}
                  >
                    Company Name
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
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <>
                    {Array.from({ length: 5 }).map((_, rowIndex) => (
                      <tr key={`skeleton-${rowIndex}`}>
                        {Array.from({ length: 6 }).map((_, colIndex) => (
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
                ) : displayedData.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4">
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
                  <>
                    {displayedData.map((request, index) => {
                      const productNames =
                        request.items && request.items.length > 0
                          ? [
                              ...new Set(
                                request.items
                                  .map((item) => item.product_name)
                                  .filter(Boolean)
                              ),
                            ].join(", ")
                          : "-";
                      const hsnCodes =
                        request.items && request.items.length > 0
                          ? [
                              ...new Set(
                                request.items
                                  .map((item) => item.hsn_code)
                                  .filter(Boolean)
                              ),
                            ].join(", ")
                          : "-";

                      return (
                        <tr key={request.request_id}>
                          <td
                            style={{
                              padding: "clamp(8px, 2vw, 12px)",
                              color: "#374151",
                              fontSize: "clamp(11px, 2.5vw, 14px)",
                            }}
                          >
                            {request.pr_number ||
                              `PR-${String(request.request_id).padStart(
                                3,
                                "0"
                              )}`}
                          </td>
                          <td
                            style={{
                              padding: "clamp(8px, 2vw, 12px)",
                              color: "#374151",
                              fontSize: "clamp(11px, 2.5vw, 14px)",
                            }}
                          >
                            {request.company_name || request.vendor_name || "-"}
                          </td>
                          <td
                            style={{
                              padding: "clamp(8px, 2vw, 12px)",
                              color: "#374151",
                              fontSize: "clamp(11px, 2.5vw, 14px)",
                            }}
                          >
                            {request.order_date
                              ? new Date(
                                  request.order_date
                                ).toLocaleDateString()
                              : "-"}
                          </td>
                          <td
                            style={{
                              padding: "clamp(8px, 2vw, 12px)",
                              color: "#374151",
                              fontSize: "clamp(11px, 2.5vw, 14px)",
                            }}
                          >
                            {request.delivery_date
                              ? new Date(
                                  request.delivery_date
                                ).toLocaleDateString()
                              : "-"}
                          </td>
                          <td
                            style={{
                              padding: "clamp(8px, 2vw, 12px)",
                              color: "#374151",
                              fontSize: "clamp(11px, 2.5vw, 14px)",
                            }}
                          >
                            {productNames}
                          </td>
                          <td style={{ padding: "12px" }}>
                            <div className="d-flex flex-wrap gap-1 gap-sm-2">
                              <button
                                className="btn btn-sm"
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  padding: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  border: "1px solid #e5e7eb",
                                  borderRadius: "6px",
                                  backgroundColor: "white",
                                }}
                                title="View"
                                onClick={() => handleViewRequest(request)}
                              >
                                <Icon
                                  icon="lucide:eye"
                                  width="16"
                                  height="16"
                                  style={{ color: "#3b82f6" }}
                                />
                              </button>
                              <button
                                className="btn btn-sm"
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  padding: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  border: "1px solid #e5e7eb",
                                  borderRadius: "6px",
                                  backgroundColor:
                                    request.status === "Pending" ||
                                    request.status?.toLowerCase() === "pending"
                                      ? "white"
                                      : "#f3f4f6",
                                  cursor:
                                    request.status === "Pending" ||
                                    request.status?.toLowerCase() === "pending"
                                      ? "pointer"
                                      : "not-allowed",
                                  opacity:
                                    request.status === "Pending" ||
                                    request.status?.toLowerCase() === "pending"
                                      ? 1
                                      : 0.5,
                                }}
                                title={
                                  request.status === "Pending" ||
                                  request.status?.toLowerCase() === "pending"
                                    ? "Edit"
                                    : "Cannot edit after status change"
                                }
                                onClick={() => {
                                  if (
                                    request.status === "Pending" ||
                                    request.status?.toLowerCase() === "pending"
                                  ) {
                                    handleEditRequest(request);
                                  }
                                }}
                                disabled={
                                  request.status !== "Pending" &&
                                  request.status?.toLowerCase() !== "pending"
                                }
                              >
                                <Icon
                                  icon="lucide:edit"
                                  width="16"
                                  height="16"
                                  style={{
                                    color:
                                      request.status === "Pending" ||
                                      request.status?.toLowerCase() ===
                                        "pending"
                                        ? "#3b82f6"
                                        : "#9ca3af",
                                  }}
                                />
                              </button>
                              <button
                                className="btn btn-sm"
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  padding: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  border: "1px solid #e5e7eb",
                                  borderRadius: "6px",
                                  backgroundColor:
                                    request.status === "Pending" ||
                                    request.status?.toLowerCase() === "pending"
                                      ? "white"
                                      : "#f3f4f6",
                                  cursor:
                                    request.status === "Pending" ||
                                    request.status?.toLowerCase() === "pending"
                                      ? "pointer"
                                      : "not-allowed",
                                  opacity:
                                    request.status === "Pending" ||
                                    request.status?.toLowerCase() === "pending"
                                      ? 1
                                      : 0.5,
                                }}
                                title={
                                  request.status === "Pending" ||
                                  request.status?.toLowerCase() === "pending"
                                    ? "Delete"
                                    : "Cannot delete after status change"
                                }
                                onClick={() => {
                                  if (
                                    request.status === "Pending" ||
                                    request.status?.toLowerCase() === "pending"
                                  ) {
                                    handleDeleteRequest(request);
                                  }
                                }}
                                disabled={
                                  request.status !== "Pending" &&
                                  request.status?.toLowerCase() !== "pending"
                                }
                              >
                                <Icon
                                  icon="lucide:trash-2"
                                  width="16"
                                  height="16"
                                  style={{
                                    color:
                                      request.status === "Pending" ||
                                      request.status?.toLowerCase() ===
                                        "pending"
                                        ? "#ef4444"
                                        : "#9ca3af",
                                  }}
                                />
                              </button>
                              {/* Only show Settings icon if status is "Pending" */}
                              {(request.status === "Pending" ||
                                request.status?.toLowerCase() ===
                                  "pending") && (
                                <button
                                  className="btn btn-sm"
                                  style={{
                                    width: "32px",
                                    height: "32px",
                                    padding: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: "6px",
                                    backgroundColor: "white",
                                  }}
                                  title="Settings"
                                  onClick={() => handleSettingsClick(request)}
                                >
                                  <Icon
                                    icon="lucide:settings"
                                    width="16"
                                    height="16"
                                    style={{ color: "#f59e0b" }}
                                  />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {isLoadingMore && (
                      <>
                        {Array.from({ length: 5 }).map((_, rowIndex) => (
                          <tr key={`skeleton-more-${rowIndex}`}>
                            {Array.from({ length: 6 }).map((_, colIndex) => (
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

            {/* Infinite Scroll Footer */}
            {filteredData.length > 0 && (
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
                  Showing <strong>{displayedData.length}</strong> of{" "}
                  <strong>{filteredData.length}</strong> entries
                </div>
                {hasMoreData(filteredData) && (
                  <div style={{ fontSize: "0.875rem", color: "#6c757d" }}>
                    Scroll down to load more
                  </div>
                )}
              </div>
            )}
          </div>
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
  const [vendorQuery, setVendorQuery] = useState("");
  const [productQueries, setProductQueries] = useState(() =>
    formData.products.map(() => "")
  );
  // Store search results for each product input (index -> products array)
  const [productSearchResults, setProductSearchResults] = useState({});
  // Track loading state for each product search
  const [productSearchLoading, setProductSearchLoading] = useState({});
  // Debounce timers for each product search
  const searchTimersRef = useRef({});

  useEffect(() => {
    setProductQueries((prev) =>
      formData.products.map((_, idx) => prev[idx] || "")
    );
    // Initialize search results for new products
    setProductSearchResults((prev) => {
      const newResults = { ...prev };
      formData.products.forEach((_, idx) => {
        if (!newResults[idx]) {
          newResults[idx] = [];
        }
      });
      return newResults;
    });
  }, [formData.products]);

  useEffect(() => {
    setVendorQuery("");
  }, [formData.selectedVendor]);

  // Debounced product search function
  const searchProducts = useCallback(async (searchTerm, productIndex) => {
    // Clear existing timer for this product index
    if (searchTimersRef.current[productIndex]) {
      clearTimeout(searchTimersRef.current[productIndex]);
    }

    // Set loading state
    setProductSearchLoading((prev) => ({
      ...prev,
      [productIndex]: true,
    }));

    // Debounce the API call
    searchTimersRef.current[productIndex] = setTimeout(async () => {
      try {
        // Use productMasterApi directly for server-side search
        const result = await productMasterApi.getAllProducts(1, 100, {
          search: searchTerm.trim(),
        });

        if (result.success) {
          setProductSearchResults((prev) => ({
            ...prev,
            [productIndex]: result.data || [],
          }));
        } else {
          setProductSearchResults((prev) => ({
            ...prev,
            [productIndex]: [],
          }));
        }
      } catch (error) {
        console.error("Error searching products:", error);
        setProductSearchResults((prev) => ({
          ...prev,
          [productIndex]: [],
        }));
      } finally {
        setProductSearchLoading((prev) => ({
          ...prev,
          [productIndex]: false,
        }));
      }
    }, 300); // 300ms debounce
  }, []);

  // Effect to trigger search when product query changes
  useEffect(() => {
    formData.products.forEach((_, productIndex) => {
      const query = productQueries[productIndex] || "";
      searchProducts(query, productIndex);
    });

    // Cleanup timers on unmount
    return () => {
      Object.values(searchTimersRef.current).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
    };
  }, [productQueries, formData.products, searchProducts]);

  const selectedVendor =
    vendors.find((vendor) => vendor.vendor_id === formData.selectedVendor) ||
    null;

  const filteredVendors =
    vendorQuery.trim() === ""
      ? vendors
      : vendors.filter((vendor) => {
          const label = vendor.company_name
            ? `${vendor.company_name} (${vendor.vendor_name})`
            : vendor.vendor_name;
          return label
            ?.toLowerCase()
            .includes(vendorQuery.trim().toLowerCase());
        });
  return (
    <div
      className="modal show d-block"
      tabIndex="-1"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            /* Hide number input spinners for Chrome, Safari, Edge */
            input[type="number"]::-webkit-inner-spin-button,
            input[type="number"]::-webkit-outer-spin-button {
              -webkit-appearance: none;
              margin: 0;
            }
          `,
        }}
      />
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
              {/* Company Section */}
              <div className="mb-4">
                <h6 className="fw-semibold mb-3">Company Details</h6>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">
                      Company Name <span className="text-danger">*</span>
                    </label>
                    <Combobox
                      value={selectedVendor}
                      onChange={(vendor) => {
                        setVendorQuery("");
                        handleVendorSelect(vendor ? vendor.vendor_id : null);
                      }}
                    >
                      <div className="position-relative">
                        <Combobox.Input
                          className="form-control"
                          placeholder="Select company..."
                          displayValue={(vendor) =>
                            vendor
                              ? vendor.company_name
                                ? `${vendor.company_name} (${vendor.vendor_name})`
                                : vendor.vendor_name
                              : ""
                          }
                          onChange={(event) =>
                            setVendorQuery(event.target.value)
                          }
                        />
                        <Combobox.Options
                          className="list-group position-absolute w-100 shadow-sm mt-1"
                          style={{
                            maxHeight: "240px",
                            overflowY: "auto",
                            zIndex: 1050,
                          }}
                        >
                          {filteredVendors.length === 0 ? (
                            <Combobox.Option
                              value={null}
                              disabled
                              className="list-group-item disabled"
                            >
                              No companies found
                            </Combobox.Option>
                          ) : (
                            filteredVendors.map((vendor) => (
                              <Combobox.Option
                                key={vendor.vendor_id}
                                value={vendor}
                                className={({ active }) =>
                                  `list-group-item list-group-item-action ${
                                    active ? "active" : ""
                                  }`
                                }
                              >
                                {vendor.company_name
                                  ? `${vendor.company_name} (${vendor.vendor_name})`
                                  : vendor.vendor_name}
                              </Combobox.Option>
                            ))
                          )}
                        </Combobox.Options>
                      </div>
                    </Combobox>
                    <input
                      type="hidden"
                      value={formData.selectedVendor || ""}
                      required
                      readOnly
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Contact Person</label>
                    <input
                      type="text"
                      className="form-control"
                      value={vendorData.vendorName}
                      disabled
                    />
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Phone No.</label>
                    <input
                      type="text"
                      className="form-control"
                      value={vendorData.vendorPhoneNo}
                      disabled
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">GST Number</label>
                    <input
                      type="text"
                      className="form-control"
                      value={vendorData.vendorGSTNumber}
                      disabled
                    />
                  </div>
                </div>
                <div className="row">
                  <div className="col-12 mb-3">
                    <label className="form-label">Address</label>
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
                  // Use search results if available, otherwise fall back to initial products
                  const searchResults = productSearchResults[productIndex];
                  const productsToShow =
                    searchResults !== undefined ? searchResults : products;
                  const selectedProduct =
                    productsToShow.find(
                      (p) => p.product_id === productEntry.product_id
                    ) ||
                    products.find(
                      (p) => p.product_id === productEntry.product_id
                    );
                  const productVariants = selectedProduct?.variants || [];
                  const productQuery = productQueries[productIndex] || "";
                  const isLoadingSearch = productSearchLoading[productIndex];
                  const filteredProducts = productsToShow;

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
                          <Combobox
                            value={selectedProduct || null}
                            onChange={(product) => {
                              if (product) {
                                handleProductSelect(
                                  product.product_id,
                                  productIndex,
                                  product
                                );
                                // Clear search query and reset search results for this product
                                setProductQueries((prev) => {
                                  const copy = [...prev];
                                  copy[productIndex] = "";
                                  return copy;
                                });
                                // Clear search results so it falls back to showing all products
                                setProductSearchResults((prev) => {
                                  const newResults = { ...prev };
                                  delete newResults[productIndex];
                                  return newResults;
                                });
                              } else {
                                handleProductSelect(null, productIndex);
                              }
                            }}
                          >
                            <div className="position-relative">
                              <Combobox.Input
                                className="form-control"
                                placeholder="Select product..."
                                displayValue={(product) => {
                                  if (!product) return "";
                                  if (product.common_name) {
                                    return `${product.product_name} (${product.common_name})`;
                                  }
                                  return product.product_name || "";
                                }}
                                onChange={(event) => {
                                  const term = event.target.value;
                                  setProductQueries((prev) => {
                                    const copy = [...prev];
                                    copy[productIndex] = term;
                                    return copy;
                                  });
                                }}
                              />
                              <Combobox.Options
                                className="list-group position-absolute w-100 shadow-sm mt-1"
                                style={{
                                  maxHeight: "240px",
                                  overflowY: "auto",
                                  zIndex: 1050,
                                }}
                              >
                                {isLoadingSearch ? (
                                  <Combobox.Option
                                    value={null}
                                    disabled
                                    className="list-group-item disabled"
                                  >
                                    <div className="d-flex align-items-center gap-2">
                                      <div
                                        className="spinner-border spinner-border-sm"
                                        role="status"
                                        style={{
                                          width: "1rem",
                                          height: "1rem",
                                        }}
                                      >
                                        <span className="visually-hidden">
                                          Loading...
                                        </span>
                                      </div>
                                      Searching products...
                                    </div>
                                  </Combobox.Option>
                                ) : filteredProducts.length === 0 ? (
                                  <Combobox.Option
                                    value={null}
                                    disabled
                                    className="list-group-item disabled"
                                  >
                                    {productQuery.trim()
                                      ? `No products found matching "${productQuery}"`
                                      : "No products found"}
                                  </Combobox.Option>
                                ) : (
                                  filteredProducts.map((product) => (
                                    <Combobox.Option
                                      key={product.product_id}
                                      value={product}
                                      className={({ active }) =>
                                        `list-group-item list-group-item-action ${
                                          active ? "active" : ""
                                        }`
                                      }
                                    >
                                      {product.common_name
                                        ? `${product.product_name} (${product.common_name})`
                                        : product.product_name}
                                    </Combobox.Option>
                                  ))
                                )}
                              </Combobox.Options>
                            </div>
                          </Combobox>
                          <input
                            type="hidden"
                            value={productEntry.product_id || ""}
                            required
                            readOnly
                          />
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
                                          onWheel={(e) => e.target.blur()}
                                          style={{
                                            MozAppearance: "textfield",
                                          }}
                                          required
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
                                          onWheel={(e) => e.target.blur()}
                                          style={{
                                            MozAppearance: "textfield",
                                          }}
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
                                          onWheel={(e) => e.target.blur()}
                                          style={{
                                            MozAppearance: "textfield",
                                          }}
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
                                          onWheel={(e) => e.target.blur()}
                                          style={{
                                            MozAppearance: "textfield",
                                          }}
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
                                          onWheel={(e) => e.target.blur()}
                                          style={{
                                            MozAppearance: "textfield",
                                          }}
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
  handleViewRequest,
  handleSettingsClick,
  viewModalOpen,
  setViewModalOpen,
  selectedRequest,
  displayedItems,
  isLoadingMore,
  containerRef,
  getDisplayedData,
  hasMoreData,
  loadMoreData,
}) => {
  const [downloadingPdf, setDownloadingPdf] = useState({});
  const [poInfoCache, setPoInfoCache] = useState({});

  // Check if PDF exists for a request
  const checkPdfExists = async (requestId) => {
    if (poInfoCache[requestId] !== undefined) {
      return poInfoCache[requestId];
    }
    try {
      const exists = await purchaseRequestApi.checkPurchaseOrderExists(
        requestId
      );
      if (exists) {
        const info = await purchaseRequestApi.getPurchaseOrderInfo(requestId);
        setPoInfoCache((prev) => ({
          ...prev,
          [requestId]: info.success ? info.data : null,
        }));
        return info.success ? info.data : null;
      } else {
        setPoInfoCache((prev) => ({
          ...prev,
          [requestId]: null,
        }));
        return null;
      }
    } catch (error) {
      console.error("Error checking PDF:", error);
      setPoInfoCache((prev) => ({
        ...prev,
        [requestId]: null,
      }));
      return null;
    }
  };

  // Download PDF handler
  const handleDownloadPdf = async (request) => {
    const requestId = request.request_id;
    setDownloadingPdf((prev) => ({ ...prev, [requestId]: true }));

    try {
      const blob = await purchaseRequestApi.downloadPurchaseOrderPdf(requestId);
      const poInfo = poInfoCache[requestId];
      const fileName = poInfo?.file_name || `PO-${requestId}.pdf`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert(
        "Failed to download Purchase Order PDF. Please try again or use the View button to access it."
      );
    } finally {
      setDownloadingPdf((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  // Check PDF existence for all requests on mount/update
  useEffect(() => {
    if (requests.length > 0) {
      requests.forEach((request) => {
        // Only check if not already cached
        if (poInfoCache[request.request_id] === undefined) {
          checkPdfExists(request.request_id).then((poInfo) => {
            if (poInfo) {
              console.log(
                `✅ PDF found for request ${request.request_id}:`,
                poInfo.purchase_order_number
              );
            } else {
              console.log(`ℹ️ No PDF found for request ${request.request_id}`);
            }
          });
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests]);

  const displayedData = getDisplayedData();

  return (
    <div className="card basic-data-table">
      <div className="card-header d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-2">
        <h5 className="card-title mb-0">To Be Delivered</h5>
      </div>

      <div className="card-body">
        <div
          ref={containerRef}
          className="table-scroll-container"
          style={{
            maxHeight: "600px",
            overflowY: "auto",
            overflowX: "auto",
            scrollBehavior: "smooth",
            overscrollBehavior: "auto",
          }}
          onScroll={(e) => {
            const target = e.currentTarget;
            const scrollTop = target.scrollTop;
            const scrollHeight = target.scrollHeight;
            const clientHeight = target.clientHeight;

            if (
              scrollTop + clientHeight >= scrollHeight - 10 &&
              hasMoreData() &&
              !isLoadingMore &&
              !isLoading
            ) {
              loadMoreData();
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
          <div className="table-responsive">
            <table
              className="table table-hover"
              style={{ fontSize: "clamp(12px, 2.5vw, 14px)" }}
            >
              <thead
                style={{
                  backgroundColor: "#f9fafb",
                  borderBottom: "2px solid #e5e7eb",
                  position: "sticky",
                  top: 0,
                  zIndex: 10,
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
                    PR No
                  </th>
                  <th
                    style={{
                      fontWeight: "600",
                      color: "#374151",
                      padding: "clamp(8px, 2vw, 12px)",
                      fontSize: "clamp(11px, 2.5vw, 14px)",
                    }}
                  >
                    Company Name
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
                    Operate
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <>
                    {Array.from({ length: 5 }).map((_, rowIndex) => (
                      <tr key={`skeleton-${rowIndex}`}>
                        {Array.from({ length: 6 }).map((_, colIndex) => (
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
                    <tr key={request.request_id}>
                      <td
                        style={{
                          padding: "clamp(8px, 2vw, 12px)",
                          color: "#374151",
                          fontSize: "clamp(11px, 2.5vw, 14px)",
                        }}
                      >
                        {request.pr_number ||
                          `PR-${String(request.request_id).padStart(3, "0")}`}
                      </td>
                      <td
                        style={{
                          padding: "clamp(8px, 2vw, 12px)",
                          color: "#374151",
                          fontSize: "clamp(11px, 2.5vw, 14px)",
                        }}
                      >
                        {request.company_name || request.vendor_name || "-"}
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
                      <td style={{ padding: "12px" }}>
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-sm"
                            style={{
                              width: "32px",
                              height: "32px",
                              padding: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: "1px solid #e5e7eb",
                              borderRadius: "6px",
                              backgroundColor: "white",
                            }}
                            title="View"
                            onClick={() => handleViewRequest(request)}
                          >
                            <Icon
                              icon="lucide:eye"
                              width="16"
                              height="16"
                              style={{ color: "#3b82f6" }}
                            />
                          </button>
                          {poInfoCache[request.request_id] ? (
                            <button
                              className="btn btn-sm"
                              style={{
                                width: "32px",
                                height: "32px",
                                padding: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "1px solid #e5e7eb",
                                borderRadius: "6px",
                                backgroundColor: "white",
                              }}
                              title={`Download Purchase Order PDF (${
                                poInfoCache[request.request_id]
                                  ?.purchase_order_number
                              })`}
                              onClick={() => handleDownloadPdf(request)}
                              disabled={downloadingPdf[request.request_id]}
                            >
                              {downloadingPdf[request.request_id] ? (
                                <span
                                  className="spinner-border spinner-border-sm"
                                  role="status"
                                  aria-hidden="true"
                                ></span>
                              ) : (
                                <Icon
                                  icon="mdi:file-pdf-box"
                                  width="16"
                                  height="16"
                                  style={{ color: "#dc3545" }}
                                />
                              )}
                            </button>
                          ) : poInfoCache[request.request_id] === undefined ? (
                            <span
                              className="spinner-border spinner-border-sm"
                              style={{
                                width: "16px",
                                height: "16px",
                                borderWidth: "2px",
                              }}
                              role="status"
                              aria-hidden="true"
                              title="Checking for PDF..."
                            ></span>
                          ) : null}
                          <button
                            className="btn btn-sm"
                            style={{
                              width: "32px",
                              height: "32px",
                              padding: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: "1px solid #e5e7eb",
                              borderRadius: "6px",
                              backgroundColor: "white",
                            }}
                            title="Settings"
                            onClick={() =>
                              handleSettingsClick(request, "arrived")
                            }
                          >
                            <Icon
                              icon="lucide:settings"
                              width="16"
                              height="16"
                              style={{ color: "#f59e0b" }}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {requests.length > 0 && (
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
                Showing <strong>{requests.length}</strong> entries
              </div>
              {hasMoreData() && (
                <div style={{ fontSize: "0.875rem", color: "#6c757d" }}>
                  Scroll down to load more
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Quality Check Tab Component
const QualityCheckTab = ({
  requests,
  isLoading,
  handleViewRequest,
  handleInspectClick,
  handleSettingsClick,
  handleGenerateQrCodes,
  qrGenerationStatus,
  viewModalOpen,
  setViewModalOpen,
  selectedRequest,
  displayedItems,
  isLoadingMore,
  containerRef,
  getDisplayedData,
  hasMoreData,
  loadMoreData,
}) => {
  const [downloadingGrn, setDownloadingGrn] = useState({});
  const [grnInfoCache, setGrnInfoCache] = useState({});
  const [generatingGrn, setGeneratingGrn] = useState({});

  // Check if GRN exists for a request
  const checkGrnExists = async (requestId) => {
    if (grnInfoCache[requestId] !== undefined) {
      return grnInfoCache[requestId];
    }
    try {
      const exists = await qualityCheckApi.checkGrnExists(requestId);
      if (exists) {
        const info = await qualityCheckApi.getGrnInfo(requestId);
        setGrnInfoCache((prev) => ({
          ...prev,
          [requestId]: info.success ? info.data : null,
        }));
        return info.success ? info.data : null;
      } else {
        setGrnInfoCache((prev) => ({
          ...prev,
          [requestId]: null,
        }));
        return null;
      }
    } catch (error) {
      console.error("Error checking GRN:", error);
      setGrnInfoCache((prev) => ({
        ...prev,
        [requestId]: null,
      }));
      return null;
    }
  };

  // Generate and download GRN PDF
  const handleGenerateAndDownloadGrn = async (request) => {
    const requestId = request.request_id;
    setGeneratingGrn((prev) => ({ ...prev, [requestId]: true }));

    try {
      // First, generate the GRN PDF
      const generateResult = await qualityCheckApi.generateGrnPdf(requestId);

      if (generateResult.success) {
        // Update cache
        setGrnInfoCache((prev) => ({
          ...prev,
          [requestId]: generateResult.data,
        }));

        // Then download it
        await handleDownloadGrn(request);
      } else {
        alert(
          `Error: ${generateResult.message || "Failed to generate GRN PDF"}`
        );
      }
    } catch (error) {
      console.error("Error generating GRN PDF:", error);
      alert("Failed to generate GRN PDF. Please try again.");
    } finally {
      setGeneratingGrn((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  // Download GRN PDF handler
  const handleDownloadGrn = async (request) => {
    const requestId = request.request_id;
    setDownloadingGrn((prev) => ({ ...prev, [requestId]: true }));

    try {
      // Fetch the latest GRN info to ensure we have the correct grn_number
      let grnInfo = grnInfoCache[requestId];
      if (!grnInfo || !grnInfo.grn_number) {
        const exists = await qualityCheckApi.checkGrnExists(requestId);
        if (exists) {
          const info = await qualityCheckApi.getGrnInfo(requestId);
          if (info.success && info.data) {
            grnInfo = info.data;
            // Update cache
            setGrnInfoCache((prev) => ({
              ...prev,
              [requestId]: info.data,
            }));
          }
        }
      }

      const blob = await qualityCheckApi.downloadGrnPdf(requestId);
      const fileName =
        grnInfo?.file_name ||
        (grnInfo?.grn_number
          ? `${grnInfo.grn_number}.pdf`
          : `GRN-${requestId}.pdf`);

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading GRN PDF:", error);
      alert(
        "Failed to download GRN PDF. Please try again or generate it first."
      );
    } finally {
      setDownloadingGrn((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const [qcStatusCache, setQcStatusCache] = useState({});
  const hasQualityCheckCompletedSync = (request) => {
    return qcStatusCache[request.request_id] === true;
  };

  // Refresh quality check status and GRN metadata whenever the list changes
  useEffect(() => {
    let isMounted = true;

    const refreshStatuses = async () => {
      if (requests.length === 0) {
        if (isMounted) {
          setQcStatusCache({});
          setGrnInfoCache({});
        }
        return;
      }

      const results = await Promise.all(
        requests.map(async (request) => {
          const requestId = request.request_id;
          let hasQC = false;
          let grnInfo = null;

          try {
            const qcResult = await qualityCheckApi.getQualityChecksByRequestId(
              requestId
            );
            hasQC = qcResult.success && qcResult.data?.length > 0;

            if (hasQC) {
              const exists = await qualityCheckApi.checkGrnExists(requestId);
              if (exists) {
                const info = await qualityCheckApi.getGrnInfo(requestId);
                grnInfo = info.success ? info.data : null;
              } else {
                grnInfo = null;
              }
            }
          } catch (error) {
            console.error(
              "Error refreshing QC/GRN status for request",
              requestId,
              error
            );
          }

          return { requestId, hasQC, grnInfo };
        })
      );

      if (!isMounted) return;

      const newQcStatus = {};
      const newGrnInfo = {};
      results.forEach(({ requestId, hasQC, grnInfo }) => {
        newQcStatus[requestId] = hasQC;
        newGrnInfo[requestId] = grnInfo;
      });

      setQcStatusCache(newQcStatus);
      setGrnInfoCache(newGrnInfo);
    };

    refreshStatuses();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests]);

  const displayedData = getDisplayedData();

  return (
    <>
      {/* Card */}
      <div className="card basic-data-table">
        <div className="card-header d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-2">
          <h5 className="card-title mb-0">Quality Check</h5>
        </div>

        <div className="card-body">
          {/* Table */}
          <div
            ref={containerRef}
            className="table-scroll-container"
            style={{
              maxHeight: "600px",
              overflowY: "auto",
              overflowX: "auto",
              scrollBehavior: "smooth",
              overscrollBehavior: "auto",
            }}
            onScroll={(e) => {
              const target = e.currentTarget;
              const scrollTop = target.scrollTop;
              const scrollHeight = target.scrollHeight;
              const clientHeight = target.clientHeight;

              if (
                scrollTop + clientHeight >= scrollHeight - 10 &&
                hasMoreData() &&
                !isLoadingMore &&
                !isLoading
              ) {
                loadMoreData();
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
            <div className="table-responsive">
              <table
                className="table table-hover"
                style={{ fontSize: "clamp(12px, 2.5vw, 14px)" }}
              >
                <thead
                  style={{
                    backgroundColor: "#f9fafb",
                    borderBottom: "2px solid #e5e7eb",
                    position: "sticky",
                    top: 0,
                    zIndex: 10,
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
                      PR No
                    </th>
                    <th
                      style={{
                        fontWeight: "600",
                        color: "#374151",
                        padding: "12px",
                      }}
                    >
                      Company Name
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
                    <>
                      {Array.from({ length: 5 }).map((_, rowIndex) => (
                        <tr key={`skeleton-${rowIndex}`}>
                          {Array.from({ length: 6 }).map((_, colIndex) => (
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
                  ) : displayedData.length === 0 ? (
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
                    <>
                      {displayedData.map((request, index) => {
                        const isGeneratingQr = Boolean(
                          qrGenerationStatus?.[request.request_id]
                        );
                        const qcCompleted =
                          hasQualityCheckCompletedSync(request);
                        const grnInfo = grnInfoCache[request.request_id];
                        const hasGrn = !!grnInfo;
                        // Check if QR codes are already generated
                        const hasQrCodes =
                          request.items?.some(
                            (item) =>
                              item.qr_code?.image_base64 ||
                              item.qr_code?.file_name
                          ) || false;
                        // QR button is only disabled if conditions aren't met (not if QR codes already exist)
                        const qrDisabled =
                          isGeneratingQr || !qcCompleted || !hasGrn;
                        const qrTitle = !qcCompleted
                          ? "Complete quality inspection to enable QR codes"
                          : !hasGrn
                          ? "First generate GRN, then generate QR codes"
                          : hasQrCodes
                          ? "Download QR codes"
                          : "Generate QR codes";

                        return (
                          <tr key={request.request_id}>
                            <td style={{ padding: "12px", color: "#374151" }}>
                              {request.pr_number ||
                                `PR-${String(request.request_id).padStart(
                                  3,
                                  "0"
                                )}`}
                            </td>
                            <td style={{ padding: "12px", color: "#374151" }}>
                              {request.company_name ||
                                request.vendor_name ||
                                "-"}
                            </td>
                            <td style={{ padding: "12px", color: "#374151" }}>
                              {new Date(
                                request.order_date
                              ).toLocaleDateString()}
                            </td>
                            <td style={{ padding: "12px", color: "#374151" }}>
                              {new Date(
                                request.delivery_date
                              ).toLocaleDateString()}
                            </td>
                            <td style={{ padding: "12px", color: "#374151" }}>
                              {request.items && request.items.length > 0
                                ? [
                                    ...new Set(
                                      request.items.map(
                                        (item) => item.product_name
                                      )
                                    ),
                                  ].join(", ")
                                : "-"}
                            </td>
                            <td style={{ padding: "12px" }}>
                              <div className="d-flex gap-2">
                                <button
                                  className="btn btn-sm"
                                  style={{
                                    width: "32px",
                                    height: "32px",
                                    padding: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: "6px",
                                    backgroundColor: "white",
                                  }}
                                  title="View"
                                  onClick={() => handleViewRequest(request)}
                                >
                                  <Icon
                                    icon="lucide:eye"
                                    width="16"
                                    height="16"
                                    style={{ color: "#3b82f6" }}
                                  />
                                </button>
                                <button
                                  className="btn btn-sm"
                                  style={{
                                    width: "32px",
                                    height: "32px",
                                    padding: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: "6px",
                                    backgroundColor: "white",
                                  }}
                                  title="Inspect"
                                  onClick={() => handleInspectClick(request)}
                                >
                                  <Icon
                                    icon="mdi:clipboard-check"
                                    width="16"
                                    height="16"
                                    style={{ color: "#16a34a" }}
                                  />
                                </button>
                                <div
                                  title={qrTitle}
                                  style={{
                                    display: "inline-block",
                                    position: "relative",
                                  }}
                                >
                                  <button
                                    className="btn btn-sm"
                                    style={{
                                      width: "32px",
                                      height: "32px",
                                      padding: 0,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      border: "1px solid #e5e7eb",
                                      borderRadius: "6px",
                                      backgroundColor: qrDisabled
                                        ? "#f3f4f6"
                                        : "white",
                                      opacity: qrDisabled ? 0.6 : 1,
                                      cursor: qrDisabled
                                        ? "not-allowed"
                                        : "pointer",
                                    }}
                                    onClick={() => {
                                      if (!qrDisabled) {
                                        handleGenerateQrCodes(request);
                                      }
                                    }}
                                    disabled={qrDisabled}
                                  >
                                    {isGeneratingQr ? (
                                      <span
                                        className="spinner-border spinner-border-sm"
                                        role="status"
                                        aria-hidden="true"
                                      />
                                    ) : (
                                      <Icon
                                        icon="mdi:qrcode"
                                        width="16"
                                        height="16"
                                        style={{
                                          color: qrDisabled
                                            ? "#9ca3af"
                                            : "#111827",
                                        }}
                                      />
                                    )}
                                  </button>
                                </div>
                                <button
                                  className="btn btn-sm"
                                  style={{
                                    width: "32px",
                                    height: "32px",
                                    padding: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: "6px",
                                    backgroundColor: "white",
                                  }}
                                  title="Settings"
                                  onClick={() =>
                                    handleSettingsClick(request, "fulfilled")
                                  }
                                >
                                  <Icon
                                    icon="lucide:settings"
                                    width="16"
                                    height="16"
                                    style={{ color: "#f59e0b" }}
                                  />
                                </button>
                                {/* GRN PDF Download Icon - Only show if quality check is completed */}
                                {hasQualityCheckCompletedSync(request) && (
                                  <>
                                    {grnInfoCache[request.request_id] ? (
                                      <button
                                        className="btn btn-sm"
                                        style={{
                                          width: "32px",
                                          height: "32px",
                                          padding: 0,
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          border: "1px solid #e5e7eb",
                                          borderRadius: "6px",
                                          backgroundColor: "white",
                                        }}
                                        title="Download GRN PDF"
                                        onClick={() =>
                                          handleDownloadGrn(request)
                                        }
                                        disabled={
                                          downloadingGrn[request.request_id]
                                        }
                                      >
                                        {downloadingGrn[request.request_id] ? (
                                          <span
                                            className="spinner-border spinner-border-sm"
                                            role="status"
                                            aria-hidden="true"
                                            style={{
                                              width: "12px",
                                              height: "12px",
                                            }}
                                          />
                                        ) : (
                                          <Icon
                                            icon="mdi:file-pdf-box"
                                            width="16"
                                            height="16"
                                            style={{ color: "#dc3545" }}
                                          />
                                        )}
                                      </button>
                                    ) : (
                                      <button
                                        className="btn btn-sm"
                                        style={{
                                          width: "32px",
                                          height: "32px",
                                          padding: 0,
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          border: "1px solid #e5e7eb",
                                          borderRadius: "6px",
                                          backgroundColor: "white",
                                        }}
                                        title="Generate and Download GRN PDF"
                                        onClick={() =>
                                          handleGenerateAndDownloadGrn(request)
                                        }
                                        disabled={
                                          generatingGrn[request.request_id]
                                        }
                                      >
                                        {generatingGrn[request.request_id] ? (
                                          <span
                                            className="spinner-border spinner-border-sm"
                                            role="status"
                                            aria-hidden="true"
                                            style={{
                                              width: "12px",
                                              height: "12px",
                                            }}
                                          />
                                        ) : (
                                          <Icon
                                            icon="mdi:file-document-outline"
                                            width="16"
                                            height="16"
                                            style={{ color: "#6c757d" }}
                                          />
                                        )}
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {isLoadingMore && (
                        <>
                          {Array.from({ length: 5 }).map((_, rowIndex) => (
                            <tr key={`skeleton-more-${rowIndex}`}>
                              {Array.from({ length: 6 }).map((_, colIndex) => (
                                <td
                                  key={`skeleton-more-${rowIndex}-${colIndex}`}
                                >
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
            {requests.length > 0 && (
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
                  Showing <strong>{displayedData.length}</strong> of{" "}
                  <strong>{requests.length}</strong> entries
                </div>
                {hasMoreData() && (
                  <div style={{ fontSize: "0.875rem", color: "#6c757d" }}>
                    Scroll down to load more
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ReceivingManagementPage;
