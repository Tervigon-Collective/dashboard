"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { Modal, Button } from "react-bootstrap";
import { toast } from "react-toastify";

import MasterLayout from "@/masterLayout/MasterLayout";
import SidebarPermissionGuard from "@/components/SidebarPermissionGuard";
import inventoryManagementApi from "@/services/inventoryManagementApi";

const formatNumber = (value) => {
  if (value === null || value === undefined) return "-";
  return Number(value).toLocaleString();
};

const InventoryDetailModal = ({ item, ledger, isOpen, onClose, loading }) => {
  if (!item) return null;

  return (
    <Modal show={isOpen} onHide={onClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Inventory Detail</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <div className="text-muted small">Product</div>
            <div className="fw-semibold">{item.product_name}</div>
            <div className="small text-muted">HSN: {item.hsn_code || "-"}</div>
          </div>
          <div className="col-md-6">
            <div className="text-muted small">Variant</div>
            <div className="fw-semibold">{item.variant_display_name}</div>
            <div className="small text-muted">SKU: {item.sku || "-"}</div>
          </div>
        </div>
        <div className="row g-3 mb-3">
          {[
            { label: "Available", value: item.available_quantity },
            { label: "Committed", value: item.committed_quantity },
            { label: "Net Available", value: item.net_available ?? (item.available_quantity - item.committed_quantity) },
            { label: "Cancelled", value: item.cancelled_quantity },
            {
              label: "Approved Returns",
              value: item.approved_returns_quantity,
            },
            { label: "Damaged", value: item.damaged_quantity },
            { label: "Total Received", value: item.total_received_quantity },
          ].map((metric) => (
            <div className="col-6 col-md-4" key={metric.label}>
              <div className="text-muted small">{metric.label}</div>
              <div className="fw-semibold">{formatNumber(metric.value)}</div>
            </div>
          ))}
        </div>

        {/* Thresholds Section (Read-Only) */}
        {(item.reorder_point !== null || item.minimum_stock_level !== null || item.safety_stock !== null) && (
          <div className="mt-4 pt-3 border-top">
            <h6 className="mb-3">
              Inventory Thresholds
              <span className="badge bg-info ms-2" style={{ fontSize: "0.7rem" }}>
                Auto-calculated
              </span>
            </h6>
            <div className="row g-3">
              {[
                { label: "Reorder Point", value: item.reorder_point, tooltip: "When to reorder" },
                { label: "Minimum Stock Level", value: item.minimum_stock_level, tooltip: "Critical threshold" },
                { label: "Safety Stock", value: item.safety_stock, tooltip: "Buffer stock" },
                { label: "Average Daily Sales", value: item.average_daily_sales, tooltip: "Based on 90 days of sales", format: (v) => v !== null && v !== undefined ? v.toFixed(2) : "-" },
                { label: "Lead Time (Days)", value: item.lead_time_days, tooltip: "Expected delivery time" },
              ].map((metric) => (
                <div className="col-6 col-md-4" key={metric.label}>
                  <div className="text-muted small">
                    {metric.label}
                    {metric.tooltip && (
                      <span
                        data-bs-toggle="tooltip"
                        data-bs-placement="top"
                        data-bs-title={metric.tooltip}
                        style={{ cursor: "help", marginLeft: "4px" }}
                      >
                        <Icon
                          icon="lucide:info"
                          width="12"
                          height="12"
                        />
                      </span>
                    )}
                  </div>
                  <div className="fw-semibold">
                    {metric.format ? metric.format(metric.value) : formatNumber(metric.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4">
          <h6 className="mb-3">Recent Ledger Entries</h6>
          {loading ? (
            <div className="d-flex justify-content-center py-4">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : !ledger?.data?.length ? (
            <div className="text-center text-muted py-3">
              No ledger entries found.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-bordered">
                <thead className="table-light">
                  <tr>
                    <th>Event</th>
                    <th>Delta Available</th>
                    <th>Delta Committed</th>
                    <th>Source</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.data.map((entry) => (
                    <tr key={entry.ledger_entry_id}>
                      <td className="text-uppercase small fw-semibold">
                        {entry.event_type.replace(/_/g, " ")}
                      </td>
                      <td>{formatNumber(entry.delta_available)}</td>
                      <td>{formatNumber(entry.delta_committed)}</td>
                      <td className="small text-muted">
                        {entry.source_reference || "-"}
                      </td>
                      <td className="small text-muted">
                        {entry.created_at ? new Date(entry.created_at).toLocaleString() : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

const ReturnActionButtons = ({ row, onApprove, onReject, busy }) => {
  if (row.status !== "pending") {
    return (
      <div className="d-flex justify-content-end">
        <span className="badge bg-light text-secondary">{row.status}</span>
      </div>
    );
  }

  return (
    <div className="d-flex gap-2 justify-content-end">
      <button
        type="button"
        className="btn btn-sm btn-success"
        disabled={busy}
        onClick={() => onApprove(row)}
      >
        Approve
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-danger"
        disabled={busy}
        onClick={() => onReject(row)}
      >
        Reject
      </button>
    </div>
  );
};

const MoveToInventoryModal = ({
  variant,
  isOpen,
  onClose,
  onMove,
  loading,
}) => {
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [skuValidation, setSkuValidation] = useState(null);
  const [validatingSku, setValidatingSku] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSku("");
      setQuantity(1);
      setSkuValidation(null);
    }
  }, [isOpen]);

  const handleValidateSku = async () => {
    if (!sku.trim()) {
      setSkuValidation({ valid: false, message: "Please enter a SKU" });
      return;
    }

    setValidatingSku(true);
    try {
      const response = await inventoryManagementApi.validateSkuForSampleMove(
        sku.trim()
      );
      if (response.success && response.data.valid) {
        setSkuValidation({
          valid: true,
          message: "SKU validated successfully",
          ...response.data,
        });
      } else {
        setSkuValidation({
          valid: false,
          message: response.message || "SKU validation failed",
        });
      }
    } catch (error) {
      setSkuValidation({
        valid: false,
        message: error.message || "SKU not found in master product variants",
      });
    } finally {
      setValidatingSku(false);
    }
  };

  const handleConfirmMove = () => {
    if (!skuValidation?.valid) {
      toast.error("Please validate SKU first");
      return;
    }
    if (quantity <= 0 || quantity > variant.available_to_move) {
      toast.error("Invalid quantity");
      return;
    }
    onMove(variant, sku.trim(), quantity, skuValidation.variant_id);
  };

  const formatVariantType = (variantType) => {
    if (!variantType || typeof variantType !== "object") return "-";
    return Object.entries(variantType)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
  };

  if (!variant) return null;

  return (
    <Modal show={isOpen} onHide={onClose} size="md" centered>
      <Modal.Header closeButton>
        <Modal.Title>Move Sample to Inventory</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3">
          <div className="text-muted small">Product</div>
          <div className="fw-semibold">{variant.product_name}</div>
        </div>
        <div className="mb-3">
          <div className="text-muted small">Variant</div>
          <div className="fw-semibold">
            {formatVariantType(variant.variant_type)}
          </div>
        </div>
        <div className="mb-3">
          <div className="text-muted small">Available to Move</div>
          <div className="fw-semibold">{variant.available_to_move} units</div>
        </div>

        <div className="mb-3">
          <label className="form-label">
            SKU (from Master) <span className="text-danger">*</span>
          </label>
          <div className="input-group">
            <input
              type="text"
              className="form-control"
              placeholder="Enter SKU from product_variants"
              value={sku}
              onChange={(e) => {
                setSku(e.target.value);
                setSkuValidation(null);
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleValidateSku();
                }
              }}
            />
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={handleValidateSku}
              disabled={validatingSku || !sku.trim()}
            >
              {validatingSku ? (
                <span className="spinner-border spinner-border-sm" />
              ) : (
                "Validate"
              )}
            </button>
          </div>
          {skuValidation && (
            <div
              className={`mt-2 small ${
                skuValidation.valid ? "text-success" : "text-danger"
              }`}
            >
              {skuValidation.message}
            </div>
          )}
        </div>

        {skuValidation?.valid && (
          <div className="mb-3">
            <div className="text-muted small">Master Variant</div>
            <div className="fw-semibold">
              {skuValidation.variant_display_name || skuValidation.sku}
            </div>
          </div>
        )}

        <div className="mb-3">
          <label className="form-label">
            Quantity to Move <span className="text-danger">*</span>
          </label>
          <input
            type="number"
            className="form-control"
            min="1"
            max={variant.available_to_move}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value) || 1)}
          />
          <div className="form-text">
            Maximum: {variant.available_to_move} units
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleConfirmMove}
          disabled={
            loading ||
            !skuValidation?.valid ||
            quantity <= 0 ||
            quantity > variant.available_to_move
          }
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" />
              Moving...
            </>
          ) : (
            "Move to Inventory"
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

const QrCodeModal = ({
  qrCodeUrl,
  isOpen,
  onClose,
  productName,
  variantName,
}) => {
  const handleDownload = () => {
    if (!qrCodeUrl) return;
    const link = document.createElement("a");
    link.href = qrCodeUrl;
    link.download = `sample-qr-${productName}-${variantName}.png`.replace(
      /[^a-z0-9.-]/gi,
      "-"
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal show={isOpen} onHide={onClose} size="sm" centered>
      <Modal.Header closeButton>
        <Modal.Title>QR Code Generated</Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center">
        <div className="mb-3">
          <div className="text-muted small mb-2">Product: {productName}</div>
          <div className="text-muted small mb-3">Variant: {variantName}</div>
        </div>
        {qrCodeUrl && (
          <div className="mb-3">
            <img
              src={qrCodeUrl}
              alt="Sample Inventory QR Code"
              style={{
                maxWidth: "100%",
                height: "auto",
                border: "1px solid #dee2e6",
                borderRadius: "8px",
              }}
            />
          </div>
        )}
        <div className="text-muted small">
          This QR code can be scanned multiple times for dispatch (once per
          unit).
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        {qrCodeUrl && (
          <Button variant="primary" onClick={handleDownload}>
            <Icon icon="mdi:download" width={18} height={18} className="me-1" />
            Download QR Code
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

const StockManagementPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("inventory");
  const qrHandledRef = useRef(false);
  const [highlightedVariantId, setHighlightedVariantId] = useState(null);

  // Infinite scroll state for inventory
  const inventoryTableContainerRef = useRef(null);
  const inventoryInfiniteScrollRef = useRef(false);
  const inventoryPrevPageRef = useRef(1);
  const inventoryPrevSearchRef = useRef("");
  const inventoryPrevLimitRef = useRef(25);
  const inventoryStateRef = useRef(null); // Ref to track current state
  const [inventoryIsMounted, setInventoryIsMounted] = useState(false);

  // Inventory state
  const [inventoryState, setInventoryState] = useState({
    data: [],
    pagination: { page: 1, totalPages: 1, total: 0 },
    loading: false,
    search: "",
<<<<<<< HEAD
    limit: 25,
    displayedItemsCount: 25, // For infinite scroll
    isLoadingMore: false, // For infinite scroll
=======
    debouncedSearch: "",
    limit: 20,
    sortField: null,
    sortDirection: "asc",
    lowStockFilter: "all", // "all", "low", "normal"
>>>>>>> origin/master
  });

  // Infinite scroll state for inventory
  const [inventoryDisplayedCount, setInventoryDisplayedCount] = useState(20);
  const [inventoryLoadingMore, setInventoryLoadingMore] = useState(false);
  const inventoryLoadingMoreRef = useRef(false); // Ref for immediate synchronous access
  const inventoryTableRef = useRef(null);
  const inventoryItemsPerPage = 20;

  // Returns state
  const [returnsState, setReturnsState] = useState({
    data: [],
    pagination: { page: 1, totalPages: 1, total: 0 },
    loading: false,
    status: "pending",
    busyCaseId: null,
    sortField: null,
    sortDirection: "asc",
  });

  // Infinite scroll state for returns
  const [returnsDisplayedCount, setReturnsDisplayedCount] = useState(20);
  const [returnsLoadingMore, setReturnsLoadingMore] = useState(false);
  const returnsLoadingMoreRef = useRef(false); // Ref for immediate synchronous access
  const returnsTableRef = useRef(null);
  const returnsItemsPerPage = 20;

  const [inventoryDetail, setInventoryDetail] = useState({
    item: null,
    ledger: null,
    loadingLedger: false,
  });

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setInventoryState((prev) => ({ ...prev, debouncedSearch: prev.search }));
    }, 500);
    return () => clearTimeout(timer);
  }, [inventoryState.search]);

<<<<<<< HEAD
  const [sampleProductsState, setSampleProductsState] = useState({
    data: [],
    pagination: { page: 1, totalPages: 1 },
    loading: false,
    search: "",
    limit: 50,
  });

  const [moveModalState, setMoveModalState] = useState({
    isOpen: false,
    variant: null,
    loading: false,
    qrCodeUrl: null,
    showQrCode: false,
  });

  const [qrPreviewState, setQrPreviewState] = useState({
    isOpen: false,
    qrCodeUrl: null,
    productName: "",
    variantName: "",
    procurementVariantId: null,
    masterVariantId: null,
  });

  // Debounced search for inventory (like VendorMasterLayer)
  const [debouncedInventorySearch, setDebouncedInventorySearch] = useState("");

  // Keep ref in sync with state
  useEffect(() => {
    inventoryStateRef.current = inventoryState;
  }, [inventoryState]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedInventorySearch(inventoryState.search);
    }, 500);
    return () => clearTimeout(timer);
  }, [inventoryState.search]);

  const loadInventory = useCallback(
    async ({ page, limit, search, append = false } = {}) => {
      // Get current state from ref (updated in useEffect)
      const currentState = inventoryStateRef.current || {
        pagination: { page: 1, totalPages: 1, total: 0 },
        limit: 25,
        search: "",
      };

      if (!append) {
        setInventoryState((prev) => ({ ...prev, loading: true }));
      } else {
        setInventoryState((prev) => ({ ...prev, isLoadingMore: true }));
=======
  // Sort inventory data
  const sortInventoryData = useCallback(
    (dataArray, field = inventoryState.sortField, direction = inventoryState.sortDirection) => {
      if (!field || !Array.isArray(dataArray)) {
        return dataArray || [];
      }

      const sortedData = [...dataArray].sort((a, b) => {
        let valueA = a?.[field];
        let valueB = b?.[field];

        // Handle net_available - calculate if not present
        if (field === "net_available") {
          valueA = a?.net_available ?? (a?.available_quantity - a?.committed_quantity);
          valueB = b?.net_available ?? (b?.available_quantity - b?.committed_quantity);
        }

        if (valueA === valueB) return 0;
        if (valueA == null) return -1;
        if (valueB == null) return 1;

        // Handle dates
        if (/_at$/.test(field)) {
          const dateA = new Date(valueA).getTime();
          const dateB = new Date(valueB).getTime();
          return dateA - dateB;
        }

        // Handle numbers
        const numA = Number(valueA);
        const numB = Number(valueB);
        const bothNumbers = !Number.isNaN(numA) && !Number.isNaN(numB);

        if (bothNumbers) {
          return numA - numB;
        }

        return String(valueA)
          .toLocaleLowerCase()
          .localeCompare(String(valueB).toLocaleLowerCase(), undefined, {
            sensitivity: "base",
          });
      });

      if (direction === "desc") {
        sortedData.reverse();
      }

      return sortedData;
    },
    [inventoryState.sortField, inventoryState.sortDirection]
  );

  // Sort returns data
  const sortReturnsData = useCallback(
    (dataArray, field = returnsState.sortField, direction = returnsState.sortDirection) => {
      if (!field || !Array.isArray(dataArray)) {
        return dataArray || [];
      }

      const sortedData = [...dataArray].sort((a, b) => {
        const valueA = a?.[field];
        const valueB = b?.[field];

        if (valueA === valueB) return 0;
        if (valueA == null) return -1;
        if (valueB == null) return 1;

        // Handle dates
        if (/_at$/.test(field) || field === "reported_at") {
          const dateA = new Date(valueA).getTime();
          const dateB = new Date(valueB).getTime();
          return dateA - dateB;
        }

        // Handle numbers
        const numA = Number(valueA);
        const numB = Number(valueB);
        const bothNumbers = !Number.isNaN(numA) && !Number.isNaN(numB);

        if (bothNumbers) {
          return numA - numB;
        }

        return String(valueA)
          .toLocaleLowerCase()
          .localeCompare(String(valueB).toLocaleLowerCase(), undefined, {
            sensitivity: "base",
          });
      });

      if (direction === "desc") {
        sortedData.reverse();
      }

      return sortedData;
    },
    [returnsState.sortField, returnsState.sortDirection]
  );

  // Load inventory
  const loadInventory = useCallback(
    async ({ page, limit, search, append = false } = {}) => {
      if (!append) {
      setInventoryState((prev) => ({ ...prev, loading: true }));
>>>>>>> origin/master
      }

      try {
        const targetPage = page ?? currentState.pagination.page;
        const targetLimit = limit ?? currentState.limit;
        const targetSearch = search ?? currentState.search;

        const response = await inventoryManagementApi.listInventoryItems({
<<<<<<< HEAD
          page: targetPage,
          limit: targetLimit,
          search: targetSearch,
=======
          page: page ?? inventoryState.pagination.page,
          limit: limit ?? inventoryState.limit,
          search: search ?? inventoryState.debouncedSearch,
>>>>>>> origin/master
        });

        const data = Array.isArray(response?.data)
          ? response.data
          : response?.data?.data || [];
        const pagination = response?.pagination ||
          response?.data?.pagination || {
            page: 1,
            totalPages: 1,
            total: data.length,
          };

<<<<<<< HEAD
        setInventoryState((prev) => {
          // Re-read values in case they changed
          const finalPage = page ?? prev.pagination.page;
          const finalLimit = limit ?? prev.limit;
          const finalSearch = search ?? prev.search;

          if (append) {
            // Append mode: merge new data with existing
            return {
              ...prev,
              data: [...prev.data, ...data],
              pagination,
              isLoadingMore: false,
            };
          } else {
            // Replace mode: replace all data
            return {
              ...prev,
              data,
              pagination,
              loading: false,
              limit: finalLimit,
              search: finalSearch,
              displayedItemsCount: finalLimit, // Reset displayed count
            };
          }
        });
=======
        if (append) {
          // When appending during infinite scroll:
          // - If client-side sorting is active, don't append (sorting breaks pagination order)
          // - If no sorting, append and maintain API pagination order
          setInventoryState((prev) => {
            if (prev.sortField) {
              // Client-side sorting is active - don't append to preserve pagination order
              // User should remove sort or load all data first
              return {
                ...prev,
                loading: false,
              };
            }
            // No sorting active - safe to append and maintain API pagination order
            const combinedData = [...prev.data, ...data];
            return {
              ...prev,
              data: combinedData,
              pagination,
              loading: false,
            };
          });
        } else {
          // When not appending, sort the new data normally
          // Use state from setState callback to avoid stale closure issues
          setInventoryState((prev) => {
            const processedData = sortInventoryData(
              data,
              prev.sortField,
              prev.sortDirection
            );
            return {
              ...prev,
              data: processedData,
              pagination,
              loading: false,
              limit: limit ?? prev.limit,
              search: search !== undefined ? search : prev.search,
            };
          });
          setInventoryDisplayedCount(20);
        }
>>>>>>> origin/master
      } catch (error) {
        console.error("Failed to load inventory", error);
        toast.error(error.message || "Failed to load inventory");
        setInventoryState((prev) => ({
          ...prev,
          loading: false,
          isLoadingMore: false,
        }));
      }
    },
<<<<<<< HEAD
    [] // No dependencies - using functional updates
=======
    [
      inventoryState.pagination.page,
      inventoryState.limit,
      inventoryState.debouncedSearch,
      inventoryState.lowStockFilter,
      sortInventoryData,
    ]
>>>>>>> origin/master
  );

  // Load returns
  const loadReturns = useCallback(
    async ({ page, status, append = false } = {}) => {
      if (!append) {
      setReturnsState((prev) => ({ ...prev, loading: true }));
      }

      try {
        const response = await inventoryManagementApi.listReturnCases({
          status: status ?? returnsState.status,
          page: page ?? returnsState.pagination.page,
          limit: 20,
        });

        const data = Array.isArray(response?.data)
          ? response.data
          : response?.data?.data || [];
        const pagination = response?.pagination ||
          response?.data?.pagination || {
            page: 1,
            totalPages: 1,
            total: data.length,
          };

        if (append) {
          // When appending during infinite scroll:
          // - If client-side sorting is active, don't append (sorting breaks pagination order)
          // - If no sorting, append and maintain API pagination order
          setReturnsState((prev) => {
            if (prev.sortField) {
              // Client-side sorting is active - don't append to preserve pagination order
              // User should remove sort or load all data first
              return {
                ...prev,
                loading: false,
              };
            }
            // No sorting active - safe to append and maintain API pagination order
            const combinedData = [...prev.data, ...data];
            return {
              ...prev,
              data: combinedData,
              pagination,
              loading: false,
            };
          });
        } else {
          // When not appending, sort the new data normally
          // Use state from setState callback to avoid stale closure issues
          setReturnsState((prev) => {
            const processedData = sortReturnsData(
              data,
              prev.sortField,
              prev.sortDirection
            );
            return {
              ...prev,
              data: processedData,
              pagination,
              status: status ?? prev.status,
              loading: false,
            };
          });
          setReturnsDisplayedCount(20);
        }
      } catch (error) {
        console.error("Failed to load return cases", error);
        toast.error(error.message || "Failed to load return cases");
        setReturnsState((prev) => ({ ...prev, loading: false }));
      }
    },
    [returnsState.pagination.page, returnsState.status, sortReturnsData]
  );

<<<<<<< HEAD
  const loadSampleProducts = useCallback(
    async ({ page, search } = {}) => {
      setSampleProductsState((prev) => ({ ...prev, loading: true }));
      try {
        const response = await inventoryManagementApi.getSampleProducts({
          page: page ?? sampleProductsState.pagination.page,
          limit: sampleProductsState.limit,
          search: search ?? sampleProductsState.search,
        });

        const data = response?.data?.data || [];
        const pagination = response?.data?.pagination || {
          page: 1,
          totalPages: 1,
          total: data.length,
        };

        setSampleProductsState((prev) => ({
          ...prev,
          data,
          pagination,
          loading: false,
        }));
      } catch (error) {
        console.error("Failed to load sample products", error);
        toast.error(error.message || "Failed to load sample products");
        setSampleProductsState((prev) => ({ ...prev, loading: false }));
      }
    },
    [
      sampleProductsState.pagination.page,
      sampleProductsState.limit,
      sampleProductsState.search,
    ]
  );

  const handleMoveToInventory = (variant) => {
    setMoveModalState({ isOpen: true, variant, loading: false });
  };

  const handleCloseMoveModal = () => {
    // Clean up QR code URL if it exists
    if (moveModalState.qrCodeUrl) {
      URL.revokeObjectURL(moveModalState.qrCodeUrl);
    }
    setMoveModalState({
      isOpen: false,
      variant: null,
      loading: false,
      qrCodeUrl: null,
      showQrCode: false,
    });
  };

  const handleConfirmMove = async (variant, sku, quantity, masterVariantId) => {
    setMoveModalState((prev) => ({ ...prev, loading: true }));
    try {
      const response = await inventoryManagementApi.moveSampleToInventory(
        variant.procurement_variant_id,
        { sku, quantity }
      );

      if (response.success && response.data?.qr_code) {
        const qrCode = response.data.qr_code;
        toast.success(
          `Sample quantity moved to inventory successfully${
            qrCode.is_new ? " (QR code generated)" : " (QR code reused)"
          }`
        );

        // Close move modal first
        setMoveModalState((prev) => ({
          ...prev,
          isOpen: false,
          loading: false,
        }));

        // Show QR code modal
        if (masterVariantId) {
          try {
            const qrImageUrl = await inventoryManagementApi.getSampleQrCode({
              procurementVariantId: variant.procurement_variant_id,
              masterVariantId: masterVariantId,
            });
            setMoveModalState((prev) => ({
              ...prev,
              qrCodeUrl: qrImageUrl,
              showQrCode: true,
              variant: variant, // Keep variant for QR modal display
            }));
          } catch (qrError) {
            console.error("Failed to load QR code:", qrError);
            // Don't block the success - QR code generation succeeded, just display failed
            toast.warning(
              "QR code generated but could not be displayed. You can access it later."
            );
          }
        }
      } else {
        toast.success("Sample quantity moved to inventory successfully");
        handleCloseMoveModal();
      }

      loadSampleProducts({ page: sampleProductsState.pagination.page });
    } catch (error) {
      console.error("Failed to move sample to inventory", error);
      toast.error(error.message || "Failed to move sample to inventory");
      handleCloseMoveModal();
    } finally {
      setMoveModalState((prev) => ({ ...prev, loading: false }));
    }
  };

  // Initial load on mount
  useEffect(() => {
    if (activeTab === "inventory") {
      setInventoryIsMounted(true);
      loadInventory({ page: 1 });
      inventoryPrevPageRef.current = 1;
      inventoryPrevSearchRef.current = "";
      inventoryPrevLimitRef.current = 25;
    } else if (activeTab === "returns") {
=======
  // Track initial mount
  const [isMounted, setIsMounted] = useState(false);
  const prevInventoryFiltersRef = useRef({
    search: "",
    lowStock: "all",
    sort: null,
    sortDir: "asc",
  });
  const prevReturnsFiltersRef = useRef({
    status: "pending",
    sort: null,
    sortDir: "asc",
  });

  // Initial load
  useEffect(() => {
    setIsMounted(true);
      loadInventory({ page: 1 });
      loadReturns({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle inventory filter changes
  useEffect(() => {
    if (!isMounted) return;

    const currentFilters = {
      search: inventoryState.debouncedSearch,
      lowStock: inventoryState.lowStockFilter,
      sort: inventoryState.sortField,
      sortDir: inventoryState.sortDirection,
    };

    const prevFilters = prevInventoryFiltersRef.current;
    const filtersChanged =
      prevFilters.search !== currentFilters.search ||
      prevFilters.lowStock !== currentFilters.lowStock ||
      prevFilters.sort !== currentFilters.sort ||
      prevFilters.sortDir !== currentFilters.sortDir;

    if (filtersChanged) {
      prevInventoryFiltersRef.current = currentFilters;
      loadInventory({ page: 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isMounted,
    inventoryState.debouncedSearch,
    inventoryState.lowStockFilter,
    inventoryState.sortField,
    inventoryState.sortDirection,
  ]);

  // Handle returns filter changes
  useEffect(() => {
    if (!isMounted) return;

    const currentFilters = {
      status: returnsState.status,
      sort: returnsState.sortField,
      sortDir: returnsState.sortDirection,
    };

    const prevFilters = prevReturnsFiltersRef.current;
    const filtersChanged =
      prevFilters.status !== currentFilters.status ||
      prevFilters.sort !== currentFilters.sort ||
      prevFilters.sortDir !== currentFilters.sortDir;

    if (filtersChanged) {
      prevReturnsFiltersRef.current = currentFilters;
>>>>>>> origin/master
      loadReturns({ page: 1 });
    } else if (activeTab === "sample-products") {
      loadSampleProducts({ page: 1 });
    }
<<<<<<< HEAD
  }, [activeTab, loadReturns, loadSampleProducts]);

  // Handle QR code deep link - similar to receiving management
  useEffect(() => {
    if (!searchParams) return;
    if (qrHandledRef.current) return;

    const fromQr = searchParams.get("fromQr");
    const procurementVariantIdParam = searchParams.get("procurementVariantId");
    const masterVariantIdParam = searchParams.get("masterVariantId");
    const tokenParam = searchParams.get("token");

    if (!fromQr || !procurementVariantIdParam) {
      return;
    }

    const procurementVariantIdNum = Number(procurementVariantIdParam);

    if (!Number.isFinite(procurementVariantIdNum)) {
      qrHandledRef.current = true;
      return;
    }

    const openFromQr = async () => {
      try {
        // Switch to sample products tab
        setActiveTab("sample-products");

        // Load sample products if not already loaded
        if (sampleProductsState.data.length === 0) {
          await loadSampleProducts({ page: 1 });
        }

        // Find the variant in the loaded data
        let variantToHighlight = sampleProductsState.data.find(
          (v) => Number(v.procurement_variant_id) === procurementVariantIdNum
        );

        // If not found in current data, try loading it
        if (!variantToHighlight) {
          try {
            const response = await inventoryManagementApi.getSampleProducts({
              page: 1,
              limit: 1000, // Load more to find the variant
              search: "",
            });
            const allVariants = response?.data?.data || [];
            variantToHighlight = allVariants.find(
              (v) =>
                Number(v.procurement_variant_id) === procurementVariantIdNum
            );
            if (variantToHighlight) {
              // Update state with found variant
              setSampleProductsState((prev) => ({
                ...prev,
                data: allVariants,
              }));
            }
          } catch (error) {
            console.error("Failed to load variant for QR deep link:", error);
          }
        }

        // Highlight the variant
        if (variantToHighlight) {
          setHighlightedVariantId(procurementVariantIdNum);
          // Remove highlight after 3 seconds
          setTimeout(() => {
            setHighlightedVariantId(null);
          }, 3000);
        }

        // Mark as handled and remove query params
        setTimeout(() => {
          qrHandledRef.current = true;
          router.replace("/stock-management", { scroll: false });
        }, 100);
      } catch (error) {
        console.error("Error opening QR deep link:", error);
        // Don't mark as handled on error, so it can retry if needed
      }
    };

    openFromQr();
  }, [searchParams, sampleProductsState.data, loadSampleProducts, router]);

  // Handle inventory data loading with infinite scroll logic (similar to VendorMasterLayer)
  useEffect(() => {
    if (!inventoryIsMounted || activeTab !== "inventory") return;

    const currentSearch = debouncedInventorySearch;
    const currentLimit = inventoryState.limit;
    const currentPage = inventoryState.pagination.page;

    const prevSearch = inventoryPrevSearchRef.current;
    const prevLimit = inventoryPrevLimitRef.current;
    const prevPage = inventoryPrevPageRef.current;

    // Check if search or limit changed
    const searchChanged = prevSearch !== currentSearch;
    const limitChanged = prevLimit !== currentLimit;
    const pageChanged = prevPage !== currentPage;

    // If search or limit changed, reset to page 1 and load
    if (searchChanged || limitChanged) {
      inventoryPrevSearchRef.current = currentSearch;
      inventoryPrevLimitRef.current = currentLimit;
      inventoryInfiniteScrollRef.current = false;
      if (currentPage !== 1) {
        inventoryPrevPageRef.current = currentPage;
        setInventoryState((prev) => ({
          ...prev,
          pagination: { ...prev.pagination, page: 1 },
        }));
      } else {
        inventoryPrevPageRef.current = 1;
        loadInventory({ page: 1, search: currentSearch, limit: currentLimit });
      }
      return;
    }

    // If only page changed (not from infinite scroll), load that page
    if (pageChanged && currentPage > 0 && !inventoryInfiniteScrollRef.current) {
      inventoryPrevPageRef.current = currentPage;
      loadInventory({ page: currentPage });
    } else if (pageChanged && inventoryInfiniteScrollRef.current) {
      // Page changed from infinite scroll, just update the ref and reset flag
      inventoryPrevPageRef.current = currentPage;
      inventoryInfiniteScrollRef.current = false;
    }
  }, [
    inventoryIsMounted,
    activeTab,
    debouncedInventorySearch,
    inventoryState.limit,
    inventoryState.pagination.page,
    loadInventory,
  ]);
=======
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isMounted,
    returnsState.status,
    returnsState.sortField,
    returnsState.sortDirection,
  ]);

  // Reset displayed count when filters change
  useEffect(() => {
    setInventoryDisplayedCount(20);
  }, [inventoryState.debouncedSearch, inventoryState.lowStockFilter, inventoryState.sortField, inventoryState.sortDirection]);

  useEffect(() => {
    setReturnsDisplayedCount(20);
  }, [returnsState.status, returnsState.sortField, returnsState.sortDirection]);

  // Add custom scrollbar styles
  useEffect(() => {
    if (typeof document !== "undefined") {
      const styleId = "table-scrollbar-styles";
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
          .table-scroll-container::-webkit-scrollbar {
            width: 6px;
            height: 6px;
            -webkit-appearance: none;
          }
          .table-scroll-container::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.05);
            border-radius: 3px;
          }
          .table-scroll-container::-webkit-scrollbar-thumb {
            background: rgba(128, 128, 128, 0.5);
            border-radius: 3px;
            transition: background 0.2s ease;
          }
          .table-scroll-container::-webkit-scrollbar-thumb:hover {
            background: rgba(128, 128, 128, 0.7);
          }
          .table-scroll-container::-webkit-scrollbar-corner {
            background: rgba(0, 0, 0, 0.05);
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  // Initialize Bootstrap tooltips
  const initializeTooltips = useCallback(() => {
    if (typeof window === "undefined") return;

    import("bootstrap/dist/js/bootstrap.bundle.min.js").then(
      (bootstrapModule) => {
        // Wait for DOM to update
        setTimeout(() => {
          const Tooltip = bootstrapModule.Tooltip || (window.bootstrap && window.bootstrap.Tooltip);
          if (!Tooltip) return;

          const tooltipTriggerList = document.querySelectorAll(
            '[data-bs-toggle="tooltip"]'
          );
          
          // Dispose existing tooltips first
          tooltipTriggerList.forEach((el) => {
            const existingTooltip = Tooltip.getInstance(el);
            if (existingTooltip) {
              existingTooltip.dispose();
            }
          });

          // Initialize new tooltips
          [...tooltipTriggerList].forEach(
            (tooltipTriggerEl) => new Tooltip(tooltipTriggerEl)
          );
        }, 100);
      }
    );
  }, []);

  useEffect(() => {
    initializeTooltips();
  }, [inventoryState.data, returnsState.data, initializeTooltips]);

  // Initialize tooltips when modal opens
  useEffect(() => {
    if (inventoryDetail.item) {
      // Wait for modal to be fully rendered
      setTimeout(() => {
        initializeTooltips();
      }, 200);
    }
  }, [inventoryDetail.item, initializeTooltips]);

  // Get filtered inventory data (helper function)
  const getFilteredInventoryData = useCallback(() => {
    let filteredData = inventoryState.data;
    
    // Apply low stock filter based on thresholds
    if (inventoryState.lowStockFilter === "low") {
      filteredData = filteredData.filter((item) => {
        const netAvailable = item.net_available ?? (item.available_quantity - item.committed_quantity);
        return netAvailable <= 0 || 
               (item.minimum_stock_level !== null && item.minimum_stock_level !== undefined && netAvailable <= item.minimum_stock_level) ||
               (item.reorder_point !== null && item.reorder_point !== undefined && netAvailable <= item.reorder_point);
      });
    } else if (inventoryState.lowStockFilter === "normal") {
      filteredData = filteredData.filter((item) => {
        const netAvailable = item.net_available ?? (item.available_quantity - item.committed_quantity);
        // Normal stock: must be above minimum_stock_level (if exists) AND above reorder_point (if exists)
        return netAvailable > 0 && 
               (item.minimum_stock_level === null || item.minimum_stock_level === undefined || netAvailable > item.minimum_stock_level) &&
               (item.reorder_point === null || item.reorder_point === undefined || netAvailable > item.reorder_point);
      });
    }
    
    return filteredData;
  }, [inventoryState.data, inventoryState.lowStockFilter]);

  // Get displayed inventory data with filters applied
  const getDisplayedInventoryData = useCallback(() => {
    return getFilteredInventoryData().slice(0, inventoryDisplayedCount);
  }, [getFilteredInventoryData, inventoryDisplayedCount]);

  // Get displayed returns data
  const getDisplayedReturnsData = useCallback(() => {
    return returnsState.data.slice(0, returnsDisplayedCount);
  }, [returnsState.data, returnsDisplayedCount]);

  // Check if there's more inventory data
  const hasMoreInventoryData = useCallback(() => {
    // If client-side sorting is active, disable infinite scroll to preserve pagination order
    if (inventoryState.sortField) {
      return false;
    }
    
    const filteredData = getFilteredInventoryData();
    
    return (
      inventoryDisplayedCount < filteredData.length ||
      inventoryState.pagination.page < inventoryState.pagination.totalPages
    );
  }, [inventoryDisplayedCount, getFilteredInventoryData, inventoryState.pagination, inventoryState.sortField]);

  // Check if there's more returns data
  const hasMoreReturnsData = useCallback(() => {
    // If client-side sorting is active, disable infinite scroll to preserve pagination order
    if (returnsState.sortField) {
      return false;
    }
    
    return (
      returnsDisplayedCount < returnsState.data.length ||
      returnsState.pagination.page < returnsState.pagination.totalPages
    );
  }, [returnsDisplayedCount, returnsState.data.length, returnsState.pagination, returnsState.sortField]);

  // Load more inventory data
  const loadMoreInventoryData = useCallback(async () => {
    // Use ref for immediate synchronous check to prevent race conditions
    if (inventoryLoadingMoreRef.current || inventoryState.loading) return;

    // Set both ref and state - ref for immediate access, state for UI updates
    inventoryLoadingMoreRef.current = true;
    setInventoryLoadingMore(true);
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Check if we need to fetch more from API
    // Compare against filtered data length, not total unfiltered data
    const filteredData = getFilteredInventoryData();
    if (
      inventoryDisplayedCount >= filteredData.length &&
      inventoryState.pagination.page < inventoryState.pagination.totalPages
    ) {
      await loadInventory({
        page: inventoryState.pagination.page + 1,
        append: true,
      });
    }

    setInventoryDisplayedCount((prev) => prev + inventoryItemsPerPage);
    inventoryLoadingMoreRef.current = false;
    setInventoryLoadingMore(false);
  }, [
    inventoryState.loading,
    inventoryState.pagination,
    inventoryDisplayedCount,
    inventoryItemsPerPage,
    loadInventory,
    getFilteredInventoryData,
  ]);

  // Load more returns data
  const loadMoreReturnsData = useCallback(async () => {
    // Use ref for immediate synchronous check to prevent race conditions
    if (returnsLoadingMoreRef.current || returnsState.loading) return;

    // Set both ref and state - ref for immediate access, state for UI updates
    returnsLoadingMoreRef.current = true;
    setReturnsLoadingMore(true);
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Check if we need to fetch more from API
    if (
      returnsDisplayedCount >= returnsState.data.length &&
      returnsState.pagination.page < returnsState.pagination.totalPages
    ) {
      await loadReturns({
        page: returnsState.pagination.page + 1,
        append: true,
      });
    }

    setReturnsDisplayedCount((prev) => prev + returnsItemsPerPage);
    returnsLoadingMoreRef.current = false;
    setReturnsLoadingMore(false);
  }, [
    returnsState.loading,
    returnsState.data.length,
    returnsState.pagination,
    returnsDisplayedCount,
    returnsItemsPerPage,
    loadReturns,
  ]);

  // Handle inventory sort
  const handleInventorySort = (field) => {
    if (inventoryState.sortField === field) {
      setInventoryState((prev) => ({
        ...prev,
        sortDirection: prev.sortDirection === "asc" ? "desc" : "asc",
      }));
    } else {
      setInventoryState((prev) => ({
        ...prev,
        sortField: field,
        sortDirection: "asc",
      }));
    }
  };

  // Handle returns sort
  const handleReturnsSort = (field) => {
    if (returnsState.sortField === field) {
      setReturnsState((prev) => ({
        ...prev,
        sortDirection: prev.sortDirection === "asc" ? "desc" : "asc",
      }));
    } else {
      setReturnsState((prev) => ({
        ...prev,
        sortField: field,
        sortDirection: "asc",
      }));
    }
  };

  // Reset inventory filters
  const handleResetInventoryFilters = () => {
    setInventoryState((prev) => ({
      ...prev,
      search: "",
      debouncedSearch: "",
      lowStockFilter: "all",
      sortField: null,
      sortDirection: "asc",
    }));
    setInventoryDisplayedCount(20);
  };

  // Reset returns filters
  const handleResetReturnsFilters = () => {
    setReturnsState((prev) => ({
      ...prev,
      status: "pending",
      sortField: null,
      sortDirection: "asc",
    }));
    setReturnsDisplayedCount(20);
  };
>>>>>>> origin/master

  const openInventoryDetail = useCallback(async (item) => {
    setInventoryDetail({ item, ledger: null, loadingLedger: true });
    try {
      const [freshItem, ledger] = await Promise.all([
        inventoryManagementApi.getInventoryItem(item.inventory_item_id),
        inventoryManagementApi.getInventoryLedger(item.inventory_item_id, {
          limit: 10,
        }),
      ]);
      const resolvedItem = freshItem?.data || freshItem;
      // Normalize ledger structure: ensure it always has { data: [...] } format
      const resolvedLedger = ledger?.data 
        ? { data: Array.isArray(ledger.data) ? ledger.data : [ledger.data] }
        : { data: Array.isArray(ledger) ? ledger : (ledger ? [ledger] : []) };
      setInventoryDetail({
        item: resolvedItem,
        ledger: resolvedLedger,
        loadingLedger: false,
      });
    } catch (error) {
      console.error("Failed to load inventory detail", error);
      toast.error(error.message || "Failed to load inventory detail");
      setInventoryDetail((prev) => ({ ...prev, loadingLedger: false }));
    }
  }, []);

  const closeInventoryDetail = useCallback(() => {
    setInventoryDetail({ item: null, ledger: null, loadingLedger: false });
  }, []);

  const handleApproveReturn = useCallback(
    async (row) => {
      setReturnsState((prev) => ({ ...prev, busyCaseId: row.return_case_id }));
      try {
        await inventoryManagementApi.approveReturnCase(row.return_case_id);
        toast.success("Return approved");
        await loadReturns({ page: returnsState.pagination.page });
      } catch (error) {
        console.error("Failed to approve return", error);
        toast.error(error.message || "Failed to approve return");
      } finally {
        setReturnsState((prev) => ({ ...prev, busyCaseId: null }));
      }
    },
    [loadReturns, returnsState.pagination.page]
  );

  const handleRejectReturn = useCallback(
    async (row) => {
      setReturnsState((prev) => ({ ...prev, busyCaseId: row.return_case_id }));
      try {
        await inventoryManagementApi.rejectReturnCase(row.return_case_id);
        toast.success("Return rejected");
        await loadReturns({ page: returnsState.pagination.page });
      } catch (error) {
        console.error("Failed to reject return", error);
        toast.error(error.message || "Failed to reject return");
      } finally {
        setReturnsState((prev) => ({ ...prev, busyCaseId: null }));
      }
    },
    [loadReturns, returnsState.pagination.page]
  );

  const handleSyncReturnCases = useCallback(async () => {
    setReturnsState((prev) => ({ ...prev, loading: true }));
    try {
      await inventoryManagementApi.syncReturnCases(200);
      toast.success("Return cases synced from Shopify data");
      await loadReturns({ page: 1 });
    } catch (error) {
      console.error("Failed to sync return cases", error);
      toast.error(error.message || "Failed to sync return cases");
    } finally {
      setReturnsState((prev) => ({ ...prev, loading: false }));
    }
  }, [loadReturns]);

<<<<<<< HEAD
  // Infinite scroll helper functions for inventory
  const getDisplayedInventoryData = useCallback(
    (dataArray) => {
      return dataArray.slice(0, inventoryState.displayedItemsCount);
    },
    [inventoryState.displayedItemsCount]
  );

  const hasMoreInventoryData = useCallback(() => {
    return (
      inventoryState.displayedItemsCount < inventoryState.data.length ||
      inventoryState.pagination.page < inventoryState.pagination.totalPages
    );
  }, [
    inventoryState.displayedItemsCount,
    inventoryState.data.length,
    inventoryState.pagination.page,
    inventoryState.pagination.totalPages,
  ]);

  const loadMoreInventoryData = useCallback(async () => {
    if (
      inventoryState.isLoadingMore ||
      inventoryState.loading ||
      !hasMoreInventoryData()
    )
      return;

    setInventoryState((prev) => ({ ...prev, isLoadingMore: true }));
    // Simulate loading delay for skeleton effect
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Check if we need to fetch more from API
    if (
      inventoryState.displayedItemsCount >= inventoryState.data.length &&
      inventoryState.pagination.page < inventoryState.pagination.totalPages
    ) {
      // Set flag to indicate this page change is from infinite scroll
      inventoryInfiniteScrollRef.current = true;
      await loadInventory({
        page: inventoryState.pagination.page + 1,
        append: true,
      });
    }

    setInventoryState((prev) => ({
      ...prev,
      displayedItemsCount: prev.displayedItemsCount + prev.limit,
      isLoadingMore: false,
    }));
  }, [
    inventoryState.isLoadingMore,
    inventoryState.loading,
    inventoryState.displayedItemsCount,
    inventoryState.data.length,
    inventoryState.pagination.page,
    inventoryState.pagination.totalPages,
    inventoryState.limit,
    hasMoreInventoryData,
    loadInventory,
  ]);

  // Reset displayed items when search or limit changes
  useEffect(() => {
    if (activeTab === "inventory") {
      setInventoryState((prev) => ({
        ...prev,
        displayedItemsCount: prev.limit,
      }));
    }
  }, [activeTab, debouncedInventorySearch, inventoryState.limit]);

  // Scroll detection for infinite scroll (using event listeners)
  useEffect(() => {
    if (activeTab !== "inventory") return;

    const container = inventoryTableContainerRef.current;
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
          behavior: "auto",
        });
      } else if (e.deltaY < 0 && isAtTop) {
        window.scrollBy({
          top: e.deltaY,
          behavior: "auto",
        });
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: true });

    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [activeTab]);

  const inventoryTable = useMemo(() => {
    if (inventoryState.loading && inventoryState.data.length === 0) {
      return (
        <>
          {Array.from({ length: 5 }).map((_, rowIndex) => (
            <tr key={`skeleton-${rowIndex}`}>
              {Array.from({ length: 8 }).map((_, colIndex) => (
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
      );
    }

    const displayedData = getDisplayedInventoryData(inventoryState.data);

    if (!displayedData.length && !inventoryState.loading) {
      return (
        <tr>
          <td colSpan={8} className="text-center text-muted py-4">
            No inventory records found
          </td>
        </tr>
      );
    }

    return (
      <>
        {displayedData.map((item) => (
          <tr key={item.inventory_item_id}>
            <td>{item.product_name}</td>
            <td>{item.variant_display_name}</td>
            <td>{item.sku || "-"}</td>
            <td className="text-center">
              {formatNumber(item.available_quantity)}
            </td>
            <td className="text-center">
              {formatNumber(item.committed_quantity)}
            </td>
            <td className="text-center">
              {formatNumber(item.cancelled_quantity)}
            </td>
            <td className="text-center">
              {formatNumber(item.approved_returns_quantity)}
            </td>
            <td className="text-end">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => openInventoryDetail(item)}
              >
                <Icon icon="mdi:eye" width={16} height={16} />
              </button>
            </td>
          </tr>
        ))}
        {inventoryState.isLoadingMore && (
          <>
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <tr key={`skeleton-more-${rowIndex}`}>
                {Array.from({ length: 8 }).map((_, colIndex) => (
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
    );
  }, [inventoryState, openInventoryDetail, getDisplayedInventoryData]);

  const returnsTable = useMemo(() => {
    if (returnsState.loading) {
      return (
        <tr>
          <td colSpan={8} className="text-center py-5">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </td>
        </tr>
      );
    }

    if (!returnsState.data.length) {
      return (
        <tr>
          <td colSpan={8} className="text-center text-muted py-4">
            No return cases
          </td>
        </tr>
      );
    }

    return returnsState.data.map((row) => (
      <tr key={row.return_case_id}>
        <td>{row.order_id}</td>
        <td>{row.sku || row.shopify_variant_id || "-"}</td>
        <td>{row.variant_display_name || "-"}</td>
        <td className="text-center">{formatNumber(row.quantity)}</td>
        <td className="text-center">{row.status}</td>
        <td className="text-muted small">{row.reason || "-"}</td>
        <td className="text-muted small">
          {new Date(row.reported_at).toLocaleString()}
        </td>
        <td className="text-end">
          <ReturnActionButtons
            row={row}
            busy={returnsState.busyCaseId === row.return_case_id}
            onApprove={handleApproveReturn}
            onReject={handleRejectReturn}
          />
        </td>
      </tr>
    ));
  }, [returnsState, handleApproveReturn, handleRejectReturn]);

=======
>>>>>>> origin/master
  return (
    <SidebarPermissionGuard requiredSidebar="stockManagement">
      <MasterLayout>
        <div className="container-fluid py-4">
<<<<<<< HEAD
          <div className="card">
            <div className="card-header border-0 pb-0">
              <div className="d-flex gap-3">
                {[
                  { id: "inventory", label: "Inventory" },
                  { id: "returns", label: "Returns" },
                  { id: "sample-products", label: "Sample Products" },
=======
          <div className="card h-100 radius-8 border">
            <div className="card-body p-24">
              {/* Header */}
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="mb-0 fw-semibold">Stock Management</h5>
              </div>

              {/* Tab Navigation */}
              <div
                className="mb-4 border-bottom pb-0"
                style={{ overflowX: "auto", overflowY: "hidden" }}
              >
                <div
                  className="d-flex gap-2 gap-md-4"
                  style={{ minWidth: "max-content", flexWrap: "nowrap" }}
                >
                  {[
                    { id: "inventory", label: "INVENTORY", icon: "mdi:package-variant" },
                    { id: "returns", label: "RETURNS", icon: "mdi:arrow-left" },
>>>>>>> origin/master
                ].map((tab) => (
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
              {activeTab === "inventory" && (
                <div>
                  {/* Search, Filter, and Action Bar */}
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
                        placeholder="Search products, variants, SKU..."
                        value={inventoryState.search}
                        onChange={(e) =>
                          setInventoryState((prev) => ({
                            ...prev,
                            search: e.target.value,
                          }))
                        }
                        style={{
                          paddingLeft: "36px",
                          height: "36px",
                          fontSize: "0.875rem",
                        }}
                      />
                    </div>

                    {/* Low Stock Filter */}
                      <select
                      className="form-select form-select-sm"
                      value={inventoryState.lowStockFilter}
                      onChange={(e) =>
                          setInventoryState((prev) => ({
                            ...prev,
                          lowStockFilter: e.target.value,
                        }))
                      }
                      style={{
                        height: "36px",
                        width: "auto",
                        minWidth: "150px",
                        fontSize: "0.875rem",
                      }}
                    >
                      <option value="all">All Stock</option>
                      <option value="low">Low/Critical Stock</option>
                      <option value="normal">Normal Stock</option>
                      </select>
<<<<<<< HEAD
                    </div>
                    <div className="col-md-2 d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                          // Reset to page 1 and trigger search
                          setInventoryState((prev) => ({
                            ...prev,
                            pagination: { ...prev.pagination, page: 1 },
                          }));
                        }}
                        disabled={inventoryState.loading}
                      >
                        <Icon icon="mdi:magnify" width={18} height={18} />
                        Search
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => {
                          setInventoryState((prev) => ({
                            ...prev,
                            search: "",
                            pagination: { ...prev.pagination, page: 1 },
                          }));
                        }}
                        disabled={inventoryState.loading}
                      >
                        Clear
=======

                    {/* Sort Field */}
                    <select
                      className="form-select form-select-sm"
                      value={inventoryState.sortField || ""}
                      onChange={(e) =>
                        setInventoryState((prev) => ({
                          ...prev,
                          sortField: e.target.value || null,
                        }))
                      }
                      style={{
                        height: "36px",
                        width: "auto",
                        minWidth: "170px",
                        fontSize: "0.875rem",
                      }}
                    >
                      <option value="">Sort By</option>
                      <option value="product_name">Product Name</option>
                      <option value="variant_display_name">Variant</option>
                      <option value="sku">SKU</option>
                      <option value="available_quantity">Available Qty</option>
                      <option value="committed_quantity">Committed Qty</option>
                      <option value="net_available">Net Available</option>
                      <option value="reorder_point">Reorder Point</option>
                    </select>

                    {/* Sort Order */}
                    <select
                      className="form-select form-select-sm"
                      value={inventoryState.sortDirection}
                      onChange={(e) =>
                          setInventoryState((prev) => ({
                            ...prev,
                          sortDirection: e.target.value,
                        }))
                      }
                      style={{
                        height: "36px",
                        width: "auto",
                        minWidth: "130px",
                        fontSize: "0.875rem",
                      }}
                    >
                      <option value="asc">Ascending</option>
                      <option value="desc">Descending</option>
                    </select>

                    {/* Reset Button */}
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={handleResetInventoryFilters}
                      title="Reset filters"
                      style={{
                        height: "36px",
                        padding: "6px 12px",
                        fontSize: "0.875rem",
                      }}
                    >
                      <Icon icon="lucide:x" width="14" height="14" />
>>>>>>> origin/master
                      </button>

                    {/* Count */}
                    <span
                      className="text-muted ms-auto"
                      style={{ fontSize: "0.8125rem", whiteSpace: "nowrap" }}
                    >
                      Showing {getDisplayedInventoryData().length} of{" "}
                      {inventoryState.lowStockFilter === "all"
                        ? inventoryState.pagination.total
                        : getFilteredInventoryData().length}{" "}
                      items
                    </span>
                  </div>

<<<<<<< HEAD
                  <div
                    ref={inventoryTableContainerRef}
=======
                  {/* Inventory Table */}
                  <div
                    ref={inventoryTableRef}
>>>>>>> origin/master
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
<<<<<<< HEAD
                      scrollbarWidth: "none",
                      msOverflowStyle: "none",
=======
                      scrollbarWidth: "thin",
                      scrollbarColor: "rgba(128, 128, 128, 0.5) rgba(0, 0, 0, 0.05)",
>>>>>>> origin/master
                    }}
                    onScroll={(e) => {
                      const target = e.target;
                      const scrollTop = target.scrollTop;
                      const scrollHeight = target.scrollHeight;
                      const clientHeight = target.clientHeight;

                      if (scrollTop + clientHeight >= scrollHeight * 0.8) {
<<<<<<< HEAD
                        if (
                          hasMoreInventoryData() &&
                          !inventoryState.isLoadingMore &&
                          !inventoryState.loading
                        ) {
=======
                        if (hasMoreInventoryData() && !inventoryLoadingMoreRef.current && !inventoryState.loading) {
>>>>>>> origin/master
                          loadMoreInventoryData();
                        }
                      }
                    }}
<<<<<<< HEAD
                    onWheel={(e) => {
                      const target = e.currentTarget;
                      const scrollTop = target.scrollTop;
                      const scrollHeight = target.scrollHeight;
                      const clientHeight = target.clientHeight;
                      const isAtTop = scrollTop <= 1;
                      const isAtBottom =
                        scrollTop + clientHeight >= scrollHeight - 1;

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
                    <table className="table table-hover mb-0">
                      <thead
                        className="table-light"
=======
                  >
                    <table className="table bordered-table mb-0">
                      <thead
>>>>>>> origin/master
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
                            onClick={() => handleInventorySort("product_name")}
                            style={{ cursor: "pointer", userSelect: "none" }}
                          >
                            <div className="d-flex align-items-center gap-2">
                              Product
                              {inventoryState.sortField === "product_name" && (
                                <Icon
                                  icon={
                                    inventoryState.sortDirection === "asc"
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
                            onClick={() => handleInventorySort("variant_display_name")}
                            style={{ cursor: "pointer", userSelect: "none" }}
                          >
                            <div className="d-flex align-items-center gap-2">
                              Variant
                              {inventoryState.sortField === "variant_display_name" && (
                                <Icon
                                  icon={
                                    inventoryState.sortDirection === "asc"
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
                            onClick={() => handleInventorySort("sku")}
                            style={{ cursor: "pointer", userSelect: "none" }}
                          >
                            <div className="d-flex align-items-center gap-2">
                              SKU
                              {inventoryState.sortField === "sku" && (
                                <Icon
                                  icon={
                                    inventoryState.sortDirection === "asc"
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
                            className="text-center"
                            onClick={() => handleInventorySort("available_quantity")}
                            style={{ cursor: "pointer", userSelect: "none" }}
                          >
                            <div className="d-flex align-items-center gap-2 justify-content-center">
                              Available
                              {inventoryState.sortField === "available_quantity" && (
                                <Icon
                                  icon={
                                    inventoryState.sortDirection === "asc"
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
                            className="text-center"
                            onClick={() => handleInventorySort("committed_quantity")}
                            style={{ cursor: "pointer", userSelect: "none" }}
                          >
                            <div className="d-flex align-items-center gap-2 justify-content-center">
                              Committed
                              {inventoryState.sortField === "committed_quantity" && (
                                <Icon
                                  icon={
                                    inventoryState.sortDirection === "asc"
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
                            className="text-center"
                            onClick={() => handleInventorySort("net_available")}
                            style={{ cursor: "pointer", userSelect: "none" }}
                          >
                            <div className="d-flex align-items-center gap-2 justify-content-center">
                              Net Available
                              {inventoryState.sortField === "net_available" && (
                                <Icon
                                  icon={
                                    inventoryState.sortDirection === "asc"
                                      ? "lucide:chevron-up"
                                      : "lucide:chevron-down"
                                  }
                                  width="14"
                                  height="14"
                                />
                              )}
                            </div>
                          </th>
                          <th scope="col" className="text-center">
                            Status
                          </th>
                          <th
                            scope="col"
                            className="text-center"
                            onClick={() => handleInventorySort("reorder_point")}
                            style={{ cursor: "pointer", userSelect: "none" }}
                          >
                            <div className="d-flex align-items-center gap-2 justify-content-center">
                              Reorder Point
                              {inventoryState.sortField === "reorder_point" && (
                                <Icon
                                  icon={
                                    inventoryState.sortDirection === "asc"
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
                            className="text-end"
                            style={{ width: "100px" }}
                          >
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventoryState.loading && inventoryState.data.length === 0 ? (
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
                        ) : (inventoryState.data.length === 0 || getFilteredInventoryData().length === 0) ? (
                          <tr>
                            <td colSpan="9" className="text-center py-4 text-muted">
                              <div className="d-flex flex-column align-items-center">
                                <p className="text-muted mb-0">
                                  {inventoryState.search || inventoryState.lowStockFilter !== "all"
                                    ? "No inventory items match your search criteria."
                                    : "No inventory items found."}
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          <>
                            {getDisplayedInventoryData().map((item, index) => {
                              const netAvailable = item.net_available ?? (item.available_quantity - item.committed_quantity);
                              
                              // Determine stock status based on thresholds
                              const getStockStatus = () => {
                                if (netAvailable <= 0) {
                                  return { status: 'out_of_stock', label: 'OUT OF STOCK', color: '#dc3545', bgColor: '#f8d7da' };
                                }
                                if (item.minimum_stock_level !== null && item.minimum_stock_level !== undefined && netAvailable <= item.minimum_stock_level) {
                                  return { status: 'critical', label: 'CRITICAL', color: '#fd7e14', bgColor: '#fff3cd' };
                                }
                                if (item.reorder_point !== null && item.reorder_point !== undefined && netAvailable <= item.reorder_point) {
                                  return { status: 'low_stock', label: 'LOW STOCK', color: '#ffc107', bgColor: '#fff3cd' };
                                }
                                return { status: 'in_stock', label: 'IN STOCK', color: '#198754', bgColor: '#d1e7dd' };
                              };
                              
                              const stockStatus = getStockStatus();
                              
                              return (
                                <tr key={item.inventory_item_id}>
                                  <td>
                                    <span className="text-secondary-light">
                                      {index + 1}
                                    </span>
                                  </td>
                                  <td>
                                    <span className="text-secondary-light fw-medium">
                                      {item.product_name}
                                    </span>
                                  </td>
                                  <td>
                                    <span className="text-secondary-light">
                                      {item.variant_display_name}
                                    </span>
                                  </td>
                                  <td>
                                    <span className="text-secondary-light">
                                      {item.sku || "-"}
                                    </span>
                                  </td>
                                  <td className="text-center">
                                    <span className="fw-semibold">
                                      {formatNumber(item.available_quantity)}
                                    </span>
                                  </td>
                                  <td className="text-center">
                                    <span className="text-secondary-light">
                                      {formatNumber(item.committed_quantity)}
                                    </span>
                                  </td>
                                  <td className="text-center">
                                    <span className={`fw-semibold ${
                                      stockStatus.status === 'out_of_stock' ? 'text-danger' :
                                      stockStatus.status === 'critical' ? 'text-warning' :
                                      stockStatus.status === 'low_stock' ? 'text-warning' : ''
                                    }`}>
                                      {formatNumber(netAvailable)}
                                    </span>
                                  </td>
                                  <td className="text-center">
                                    <span
                                      className="badge"
                                      style={{
                                        backgroundColor: stockStatus.bgColor,
                                        color: stockStatus.color,
                                        fontSize: "0.75rem",
                                        padding: "4px 8px",
                                        fontWeight: "600",
                                      }}
                                    >
                                      {stockStatus.label}
                                    </span>
                                  </td>
                                  <td className="text-center">
                                    <span className="text-secondary-light small">
                                      {item.reorder_point !== null && item.reorder_point !== undefined
                                        ? formatNumber(item.reorder_point)
                                        : "-"}
                                    </span>
                                  </td>
                                  <td className="text-end">
                      <button
                        type="button"
                                      className="btn btn-sm"
                                      style={{
                                        border: "1px solid #dee2e6",
                                        background: "white",
                                        padding: "4px 8px",
                                        color: "#495057",
                                        borderRadius: "4px",
                                      }}
                                      onClick={() => openInventoryDetail(item)}
                                      title="View Details"
                                    >
                                      <Icon icon="lucide:eye" width="14" height="14" />
                      </button>
                                  </td>
                                </tr>
                              );
                            })}
                            {inventoryLoadingMore && (
                              <>
                                {Array.from({ length: 5 }).map((_, rowIndex) => (
                                  <tr key={`skeleton-more-${rowIndex}`}>
                                    {Array.from({ length: 9 }).map((_, colIndex) => (
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
                    </div>

                  {/* Infinite Scroll Footer */}
                  {inventoryState.pagination.total > 0 && (
                    <div
                      className="d-flex justify-content-between align-items-center px-3 py-2"
                      style={{
                        backgroundColor: "#f8f9fa",
                        borderRadius: "0 0 8px 8px",
                        marginTop: "0",
<<<<<<< HEAD
                        borderTop: "1px solid #e5e7eb",
                      }}
                    >
                      <div style={{ fontSize: "0.875rem", color: "#6c757d" }}>
                        Showing{" "}
                        <strong>
                          {
                            getDisplayedInventoryData(inventoryState.data)
                              .length
                          }
                        </strong>{" "}
                        of <strong>{inventoryState.pagination.total}</strong>{" "}
                        items
                      </div>
                      {hasMoreInventoryData() && (
                        <div style={{ fontSize: "0.875rem", color: "#6c757d" }}>
                          Scroll down to load more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "sample-products" && (
                <div>
                  <div className="row g-3 align-items-end mb-3">
                    <div className="col-md-4">
                      <label className="form-label small">Search</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Product name or SKU"
                        value={sampleProductsState.search}
                        onChange={(event) =>
                          setSampleProductsState((prev) => ({
                            ...prev,
                            search: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="col-md-2 d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => loadSampleProducts({ page: 1 })}
                        disabled={sampleProductsState.loading}
                      >
                        <Icon icon="mdi:magnify" width={18} height={18} />
                        Search
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() =>
                          setSampleProductsState((prev) => ({
                            ...prev,
                            search: "",
                          }))
                        }
                        disabled={sampleProductsState.loading}
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-light">
                        <tr>
                          <th>Product Name</th>
                          <th>Variant</th>
                          <th>Procurement SKU</th>
                          <th className="text-center">Total Sample Qty</th>
                          <th className="text-center">Moved to Inventory</th>
                          <th className="text-center">Available to Move</th>
                          <th>Last Moved</th>
                          <th>QR Code</th>
                          <th className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sampleProductsState.loading ? (
                          <tr>
                            <td colSpan="9" className="text-center py-4">
                              <div className="spinner-border" role="status">
                                <span className="visually-hidden">
                                  Loading...
                                </span>
                              </div>
                            </td>
                          </tr>
                        ) : sampleProductsState.data.length === 0 ? (
                          <tr>
                            <td
                              colSpan="9"
                              className="text-center text-muted py-4"
                            >
                              No sample products found
                            </td>
                          </tr>
                        ) : (
                          sampleProductsState.data.map((variant) => {
                            const formatVariantType = (variantType) => {
                              if (
                                !variantType ||
                                typeof variantType !== "object"
                              )
                                return "-";
                              return Object.entries(variantType)
                                .map(([key, value]) => `${key}: ${value}`)
                                .join(", ");
                            };

                            const isHighlighted =
                              highlightedVariantId ===
                              variant.procurement_variant_id;

                            return (
                              <tr
                                key={variant.procurement_variant_id}
                                className={isHighlighted ? "table-warning" : ""}
                                style={
                                  isHighlighted
                                    ? {
                                        animation: "highlight 2s ease-in-out",
                                        backgroundColor: "#fff3cd",
                                      }
                                    : {}
                                }
                              >
                                <td>{variant.product_name}</td>
                                <td>
                                  {formatVariantType(variant.variant_type)}
                                </td>
                                <td>{variant.sku || "—"}</td>
                                <td className="text-center">
                                  {variant.sample_quantity}
                                </td>
                                <td className="text-center">
                                  {variant.sample_quantity_in_inventory}
                                </td>
                                <td className="text-center">
                                  <span
                                    className={`badge ${
                                      variant.available_to_move > 0
                                        ? "bg-success"
                                        : "bg-secondary"
                                    }`}
                                  >
                                    {variant.available_to_move}
                                  </span>
                                </td>
                                <td>
                                  {variant.sample_moved_to_inventory_at
                                    ? new Date(
                                        variant.sample_moved_to_inventory_at
                                      ).toLocaleDateString()
                                    : "—"}
                                </td>
                                <td>
                                  {variant.has_qr_code ? (
                                    <div className="d-flex gap-1">
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-primary"
                                        onClick={async () => {
                                          try {
                                            const qrImageUrl =
                                              await inventoryManagementApi.getSampleQrCode(
                                                {
                                                  procurementVariantId:
                                                    variant.procurement_variant_id,
                                                  masterVariantId:
                                                    variant.master_variant_id_for_qr,
                                                }
                                              );
                                            setQrPreviewState({
                                              isOpen: true,
                                              qrCodeUrl: qrImageUrl,
                                              productName: variant.product_name,
                                              variantName: formatVariantType(
                                                variant.variant_type
                                              ),
                                              procurementVariantId:
                                                variant.procurement_variant_id,
                                              masterVariantId:
                                                variant.master_variant_id_for_qr,
                                            });
                                          } catch (error) {
                                            console.error(
                                              "Failed to load QR code:",
                                              error
                                            );
                                            toast.error(
                                              error.message ||
                                                "Failed to load QR code"
                                            );
                                          }
                                        }}
                                        title="View QR Code"
                                      >
                                        <Icon
                                          icon="mdi:eye"
                                          width={16}
                                          height={16}
                                        />
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-secondary"
                                        onClick={async () => {
                                          try {
                                            const qrImageUrl =
                                              await inventoryManagementApi.getSampleQrCode(
                                                {
                                                  procurementVariantId:
                                                    variant.procurement_variant_id,
                                                  masterVariantId:
                                                    variant.master_variant_id_for_qr,
                                                }
                                              );
                                            const link =
                                              document.createElement("a");
                                            link.href = qrImageUrl;
                                            link.download = `sample-qr-${
                                              variant.product_name
                                            }-${formatVariantType(
                                              variant.variant_type
                                            )}.png`.replace(
                                              /[^a-z0-9.-]/gi,
                                              "-"
                                            );
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                            URL.revokeObjectURL(qrImageUrl);
                                            toast.success("QR code downloaded");
                                          } catch (error) {
                                            console.error(
                                              "Failed to download QR code:",
                                              error
                                            );
                                            toast.error(
                                              error.message ||
                                                "Failed to download QR code"
                                            );
                                          }
                                        }}
                                        title="Download QR Code"
                                      >
                                        <Icon
                                          icon="mdi:download"
                                          width={16}
                                          height={16}
                                        />
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-muted small">
                                      Not generated
                                    </span>
                                  )}
                                </td>
                                <td className="text-end">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-primary"
                                    onClick={() =>
                                      handleMoveToInventory(variant)
                                    }
                                    disabled={variant.available_to_move === 0}
                                  >
                                    Move to Inventory
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <div className="text-muted small">
                      Page {sampleProductsState.pagination.page} of{" "}
                      {sampleProductsState.pagination.totalPages}
                    </div>
                    <div className="btn-group">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        disabled={
                          sampleProductsState.loading ||
                          sampleProductsState.pagination.page <= 1
                        }
                        onClick={() =>
                          loadSampleProducts({
                            page: sampleProductsState.pagination.page - 1,
                          })
                        }
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        disabled={
                          sampleProductsState.loading ||
                          sampleProductsState.pagination.page >=
                            sampleProductsState.pagination.totalPages
                        }
                        onClick={() =>
                          loadSampleProducts({
                            page: sampleProductsState.pagination.page + 1,
                          })
                        }
                      >
                        Next
                      </button>
                    </div>
=======
                      }}
                    >
                      <div style={{ fontSize: "0.875rem", color: "#6c757d" }}>
                        Showing <strong>{getDisplayedInventoryData().length}</strong> of{" "}
                        <strong>
                          {inventoryState.lowStockFilter === "all"
                            ? inventoryState.pagination.total
                            : getFilteredInventoryData().length}
                        </strong>{" "}
                        items
>>>>>>> origin/master
                  </div>
                      {hasMoreInventoryData() && (
                        <div style={{ fontSize: "0.875rem", color: "#6c757d" }}>
                          Scroll down to load more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "returns" && (
                <div>
                  {/* Search, Filter, and Action Bar */}
                  <div className="d-flex align-items-center gap-2 mb-4 flex-wrap">
                    {/* Status Filter */}
                      <select
                      className="form-select form-select-sm"
                        value={returnsState.status}
                      onChange={(e) =>
                        setReturnsState((prev) => ({
                          ...prev,
                          status: e.target.value,
                        }))
                      }
                      style={{
                        height: "36px",
                        width: "auto",
                        minWidth: "150px",
                        fontSize: "0.875rem",
                      }}
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="">All</option>
                      </select>

                    {/* Sort Field */}
                    <select
                      className="form-select form-select-sm"
                      value={returnsState.sortField || ""}
                      onChange={(e) =>
                        setReturnsState((prev) => ({
                          ...prev,
                          sortField: e.target.value || null,
                        }))
                      }
                      style={{
                        height: "36px",
                        width: "auto",
                        minWidth: "170px",
                        fontSize: "0.875rem",
                      }}
                    >
                      <option value="">Sort By</option>
                      <option value="order_id">Order ID</option>
                      <option value="sku">SKU</option>
                      <option value="variant_display_name">Variant</option>
                      <option value="quantity">Quantity</option>
                      <option value="status">Status</option>
                      <option value="reported_at">Reported At</option>
                    </select>

                    {/* Sort Order */}
                    <select
                      className="form-select form-select-sm"
                      value={returnsState.sortDirection}
                      onChange={(e) =>
                        setReturnsState((prev) => ({
                          ...prev,
                          sortDirection: e.target.value,
                        }))
                      }
                      style={{
                        height: "36px",
                        width: "auto",
                        minWidth: "130px",
                        fontSize: "0.875rem",
                      }}
                    >
                      <option value="asc">Ascending</option>
                      <option value="desc">Descending</option>
                    </select>

                    {/* Reset Button */}
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={handleResetReturnsFilters}
                      title="Reset filters"
                      style={{
                        height: "36px",
                        padding: "6px 12px",
                        fontSize: "0.875rem",
                      }}
                    >
                      <Icon icon="lucide:x" width="14" height="14" />
                    </button>

                    {/* Sync Button */}
                      <button
                        type="button"
                      className="btn btn-outline-secondary btn-sm"
                        onClick={handleSyncReturnCases}
                        disabled={returnsState.loading}
                      style={{
                        height: "36px",
                        padding: "6px 12px",
                        fontSize: "0.875rem",
                      }}
                      >
                      <Icon icon="mdi:refresh" width="16" height="16" />
                        Sync
                      </button>

                    {/* Count */}
                    <span
                      className="text-muted ms-auto"
                      style={{ fontSize: "0.8125rem", whiteSpace: "nowrap" }}
                    >
                      Showing {getDisplayedReturnsData().length} of{" "}
                      {returnsState.pagination.total} returns
                    </span>
                  </div>

                  {/* Returns Table */}
                  <div
                    ref={returnsTableRef}
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
                      scrollbarWidth: "thin",
                      scrollbarColor: "rgba(128, 128, 128, 0.5) rgba(0, 0, 0, 0.05)",
                    }}
                    onScroll={(e) => {
                      const target = e.target;
                      const scrollTop = target.scrollTop;
                      const scrollHeight = target.scrollHeight;
                      const clientHeight = target.clientHeight;

                      if (scrollTop + clientHeight >= scrollHeight * 0.8) {
                        if (hasMoreReturnsData() && !returnsLoadingMoreRef.current && !returnsState.loading) {
                          loadMoreReturnsData();
                        }
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
                            onClick={() => handleReturnsSort("order_id")}
                            style={{ cursor: "pointer", userSelect: "none" }}
                          >
                            <div className="d-flex align-items-center gap-2">
                              Order
                              {returnsState.sortField === "order_id" && (
                                <Icon
                                  icon={
                                    returnsState.sortDirection === "asc"
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
                            onClick={() => handleReturnsSort("sku")}
                            style={{ cursor: "pointer", userSelect: "none" }}
                          >
                            <div className="d-flex align-items-center gap-2">
                              SKU
                              {returnsState.sortField === "sku" && (
                                <Icon
                                  icon={
                                    returnsState.sortDirection === "asc"
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
                            onClick={() => handleReturnsSort("variant_display_name")}
                            style={{ cursor: "pointer", userSelect: "none" }}
                          >
                            <div className="d-flex align-items-center gap-2">
                              Variant
                              {returnsState.sortField === "variant_display_name" && (
                                <Icon
                                  icon={
                                    returnsState.sortDirection === "asc"
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
                            className="text-center"
                            onClick={() => handleReturnsSort("quantity")}
                            style={{ cursor: "pointer", userSelect: "none" }}
                          >
                            <div className="d-flex align-items-center gap-2 justify-content-center">
                              Qty
                              {returnsState.sortField === "quantity" && (
                                <Icon
                                  icon={
                                    returnsState.sortDirection === "asc"
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
                            className="text-center"
                            onClick={() => handleReturnsSort("status")}
                            style={{ cursor: "pointer", userSelect: "none" }}
                          >
                            <div className="d-flex align-items-center gap-2 justify-content-center">
                              Status
                              {returnsState.sortField === "status" && (
                                <Icon
                                  icon={
                                    returnsState.sortDirection === "asc"
                                      ? "lucide:chevron-up"
                                      : "lucide:chevron-down"
                                  }
                                  width="14"
                                  height="14"
                                />
                              )}
                            </div>
                          </th>
                          <th scope="col">Reason</th>
                          <th
                            scope="col"
                            onClick={() => handleReturnsSort("reported_at")}
                            style={{ cursor: "pointer", userSelect: "none" }}
                          >
                            <div className="d-flex align-items-center gap-2">
                              Reported At
                              {returnsState.sortField === "reported_at" && (
                                <Icon
                                  icon={
                                    returnsState.sortDirection === "asc"
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
                            className="text-end"
                            style={{ width: "150px" }}
                          >
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {returnsState.loading && returnsState.data.length === 0 ? (
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
                        ) : returnsState.data.length === 0 ? (
                          <tr>
                            <td colSpan="9" className="text-center py-4 text-muted">
                              <div className="d-flex flex-column align-items-center">
                                <p className="text-muted mb-0">
                                  {returnsState.status !== ""
                                    ? "No return cases match your filter criteria."
                                    : "No return cases found."}
                                </p>
                    </div>
                            </td>
                          </tr>
                        ) : (
                          <>
                            {getDisplayedReturnsData().map((row, index) => (
                              <tr key={row.return_case_id}>
                                <td>
                                  <span className="text-secondary-light">
                                    {index + 1}
                                  </span>
                                </td>
                                <td>
                                  <span className="text-secondary-light fw-medium">
                                    {row.order_id}
                                  </span>
                                </td>
                                <td>
                                  <span className="text-secondary-light">
                                    {row.sku || row.shopify_variant_id || "-"}
                                  </span>
                                </td>
                                <td>
                                  <span className="text-secondary-light">
                                    {row.variant_display_name || "-"}
                                  </span>
                                </td>
                                <td className="text-center">
                                  <span className="text-secondary-light">
                                    {formatNumber(row.quantity)}
                                  </span>
                                </td>
                                <td className="text-center">
                                  <span
                                    className={`badge ${
                                      row.status === "approved"
                                        ? "bg-success"
                                        : row.status === "rejected"
                                        ? "bg-danger"
                                        : row.status === "pending"
                                        ? "bg-warning"
                                        : "bg-secondary"
                                    }`}
                                    style={{ fontSize: "0.75rem", padding: "4px 8px" }}
                                  >
                                    {row.status}
                                  </span>
                                </td>
                                <td>
                                  <span
                                    className="text-secondary-light text-truncate d-inline-block"
                                    style={{ maxWidth: "200px" }}
                                    title={row.reason || "-"}
                                  >
                                    {row.reason || "-"}
                                  </span>
                                </td>
                                <td>
                                  <span className="text-secondary-light small">
                                    {row.reported_at ? new Date(row.reported_at).toLocaleString() : "-"}
                                  </span>
                                </td>
                                <td className="text-end">
                                  <ReturnActionButtons
                                    row={row}
                                    busy={
                                      returnsState.busyCaseId === row.return_case_id
                                    }
                                    onApprove={handleApproveReturn}
                                    onReject={handleRejectReturn}
                                  />
                                </td>
                              </tr>
                            ))}
                            {returnsLoadingMore && (
                              <>
                                {Array.from({ length: 5 }).map((_, rowIndex) => (
                                  <tr key={`skeleton-more-${rowIndex}`}>
                                    {Array.from({ length: 9 }).map((_, colIndex) => (
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
                  </div>

                  {/* Infinite Scroll Footer */}
                  {returnsState.pagination.total > 0 && (
                    <div
                      className="d-flex justify-content-between align-items-center px-3 py-2"
                      style={{
                        backgroundColor: "#f8f9fa",
                        borderRadius: "0 0 8px 8px",
                        marginTop: "0",
                      }}
                    >
                      <div style={{ fontSize: "0.875rem", color: "#6c757d" }}>
                        Showing <strong>{getDisplayedReturnsData().length}</strong> of{" "}
                        <strong>{returnsState.pagination.total}</strong> returns
                      </div>
                      {hasMoreReturnsData() && (
                        <div style={{ fontSize: "0.875rem", color: "#6c757d" }}>
                          Scroll down to load more
                </div>
              )}
            </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <InventoryDetailModal
          item={inventoryDetail.item}
          ledger={inventoryDetail.ledger}
          isOpen={Boolean(inventoryDetail.item)}
          onClose={closeInventoryDetail}
          loading={inventoryDetail.loadingLedger}
        />

        <MoveToInventoryModal
          variant={moveModalState.variant}
          isOpen={moveModalState.isOpen}
          onClose={handleCloseMoveModal}
          onMove={handleConfirmMove}
          loading={moveModalState.loading}
        />
        <QrCodeModal
          qrCodeUrl={moveModalState.qrCodeUrl}
          isOpen={moveModalState.showQrCode}
          onClose={() => {
            if (moveModalState.qrCodeUrl) {
              URL.revokeObjectURL(moveModalState.qrCodeUrl);
            }
            setMoveModalState((prev) => ({
              ...prev,
              showQrCode: false,
              qrCodeUrl: null,
            }));
          }}
          productName={moveModalState.variant?.product_name || ""}
          variantName={
            moveModalState.variant?.variant_type
              ? Object.entries(moveModalState.variant.variant_type)
                  .map(([key, value]) => `${key}: ${value}`)
                  .join(", ")
              : ""
          }
        />
        <QrCodeModal
          qrCodeUrl={qrPreviewState.qrCodeUrl}
          isOpen={qrPreviewState.isOpen}
          onClose={() => {
            if (qrPreviewState.qrCodeUrl) {
              URL.revokeObjectURL(qrPreviewState.qrCodeUrl);
            }
            setQrPreviewState({
              isOpen: false,
              qrCodeUrl: null,
              productName: "",
              variantName: "",
              procurementVariantId: null,
              masterVariantId: null,
            });
          }}
          productName={qrPreviewState.productName}
          variantName={qrPreviewState.variantName}
        />
      </MasterLayout>
    </SidebarPermissionGuard>
  );
};

export default StockManagementPage;
