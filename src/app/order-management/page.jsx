"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Icon } from "@iconify/react";
import { Modal, Button } from "react-bootstrap";
import { toast } from "react-toastify";

import MasterLayout from "@/masterLayout/MasterLayout";
import Breadcrumb from "@/components/Breadcrumb";
import SidebarPermissionGuard from "@/components/SidebarPermissionGuard";
import inventoryManagementApi from "@/services/inventoryManagementApi";

const Html5QrScanner = dynamic(() => import("@/components/Html5QrScanner"), {
  ssr: false,
});

// UUID validation regex: 8-4-4-4-12 hex digits
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Extract numeric ID from Shopify GID format
 * Handles both GID format (gid://shopify/Order/123) and plain numeric IDs
 * @param {string} gidOrId - GID string or numeric ID
 * @returns {string} - Numeric ID as string
 */
const extractNumericId = (gidOrId) => {
  if (!gidOrId) return gidOrId;

  const str = String(gidOrId);

  // If it's already a numeric string, return as-is
  if (/^\d+$/.test(str)) {
    return str;
  }

  // If it's a GID format, extract the numeric part
  // Format: gid://shopify/Order/123456 or gid://shopify/LineItem/123456
  const gidMatch = str.match(/gid:\/\/shopify\/(?:Order|LineItem)\/(\d+)/i);
  if (gidMatch && gidMatch[1]) {
    return gidMatch[1];
  }

  // If no match, return original (might be a different format)
  return str;
};

const parseQrToken = (rawValue) => {
  if (!rawValue) {
    throw new Error("QR payload is empty");
  }

  let token = null;

  if (rawValue.startsWith("http")) {
    try {
      const url = new URL(rawValue);
      const tokenFromQuery = url.searchParams.get("token");
      if (tokenFromQuery) {
        token = tokenFromQuery;
      } else {
        const segments = url.pathname.split("/").filter(Boolean);
        token = segments[segments.length - 1];
      }
    } catch (error) {
      console.warn("Failed to parse QR URL, falling back to raw value", error);
    }
  }

  if (!token) {
    const queryIndex = rawValue.indexOf("token=");
    if (queryIndex !== -1) {
      const params = new URLSearchParams(rawValue.slice(queryIndex));
      const tokenFromQuery = params.get("token");
      if (tokenFromQuery) {
        token = tokenFromQuery;
      }
    }
  }

  if (!token) {
    const tokens = rawValue.split("/").filter(Boolean);
    token = tokens[tokens.length - 1];
  }

  // Validate UUID format
  if (token && !UUID_REGEX.test(token)) {
    console.error("Invalid UUID format detected:", token);
    throw new Error(
      `Invalid QR token format. Expected UUID format (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx), got: ${token.substring(
        0,
        50
      )}${token.length > 50 ? "..." : ""}`
    );
  }

  return token;
};

const formatDateTime = (value) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return value;
  }
};

const DispatchScannerModal = ({
  isOpen,
  onClose,
  lineItem,
  onScan,
  scanError,
  isDispatching,
}) => {
  const scannerInputRef = useRef(null);
  const scanTimeoutRef = useRef(null);

  // Auto-focus input when modal opens, blur when closes
  useEffect(() => {
    if (isOpen && scannerInputRef.current && !isDispatching) {
      // Small delay to ensure modal is fully rendered
      const timeoutId = setTimeout(() => {
        scannerInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeoutId);
    } else if (!isOpen && scannerInputRef.current) {
      // Blur input when modal closes to prevent accidental scans
      scannerInputRef.current.blur();
      // Clear input value when modal closes
      scannerInputRef.current.value = "";
    }
  }, [isOpen, isDispatching]);

  // Helper function to check if value is a QR code URL
  const isQrCodeUrl = useCallback((value) => {
    if (!value || value.length === 0) return false;
    return (
      value.includes("receiving/qr") ||
      value.includes("sample-inventory/qr") ||
      value.includes("token=") ||
      value.startsWith("http") ||
      value.includes("/qr/")
    );
  }, []);

  // Handle input from USB barcode scanner
  const handleScannerInput = useCallback(
    (e) => {
      let value = e.target.value;

      // Remove any newlines, carriage returns, or other control characters
      value = value.replace(/[\r\n\t]/g, "").trim();

      // Clear any existing timeout
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }

      // USB scanners typically type very fast, so we wait a bit after typing stops
      // to detect the complete scan (usually ends with Enter or after a pause)
      scanTimeoutRef.current = setTimeout(() => {
        if (value && value.length > 0) {
          // Check if it looks like a QR code URL
          if (isQrCodeUrl(value)) {
            // Trigger the same scan handler
            onScan(value);
            // Clear input after processing
            e.target.value = "";
          } else {
            // Show error for non-QR barcodes
            toast.warning(
              "Please scan a QR code, not a regular barcode. QR codes contain URLs with 'receiving/qr' or 'token='.",
              { autoClose: 4000 }
            );
            // Clear input
            e.target.value = "";
          }
        }
      }, 300); // Increased to 300ms delay to ensure complete scan is captured
    },
    [onScan, isQrCodeUrl]
  );

  // Handle Enter key press (USB scanners often send Enter after scan)
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        let value = e.target.value;

        // Remove any newlines, carriage returns, or other control characters
        value = value.replace(/[\r\n\t]/g, "").trim();

        if (value && value.length > 0) {
          // Clear timeout since we're processing immediately
          if (scanTimeoutRef.current) {
            clearTimeout(scanTimeoutRef.current);
          }

          // Validate: Check if it looks like a QR code URL before processing
          if (isQrCodeUrl(value)) {
            // Trigger scan only if it's a valid QR code URL
            onScan(value);
          } else {
            // Show user-friendly error for non-QR barcodes
            toast.warning(
              "Please scan a QR code, not a regular barcode. QR codes contain URLs with 'receiving/qr' or 'token='.",
              { autoClose: 4000 }
            );
          }

          // Clear input regardless
          e.target.value = "";
        }
      }
    },
    [onScan, isQrCodeUrl]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  if (!lineItem) return null;

  return (
    <Modal show={isOpen} onHide={onClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Dispatch: {lineItem.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3">
          <div className="fw-semibold">Order</div>
          <div className="text-muted small">
            {lineItem.order_name || lineItem.order_id}
          </div>
        </div>
        <div className="row g-3 mb-3">
          <div className="col-6 col-md-3">
            <span className="text-muted small">Ordered</span>
            <div className="fw-semibold">{lineItem.quantity}</div>
          </div>
          <div className="col-6 col-md-3">
            <span className="text-muted small">Dispatched</span>
            <div className="fw-semibold text-success">
              {lineItem.dispatched_quantity || 0}
            </div>
          </div>
          <div className="col-6 col-md-3">
            <span className="text-muted small">Remaining</span>
            <div
              className={`fw-semibold ${
                lineItem.remaining_to_dispatch === 0
                  ? "text-success"
                  : "text-primary"
              }`}
            >
              {lineItem.remaining_to_dispatch || 0}
            </div>
          </div>
          <div className="col-6 col-md-3">
            <span className="text-muted small">Available</span>
            <div className="fw-semibold">
              {lineItem.available_quantity ?? "-"}
            </div>
          </div>
        </div>
        <div className="border rounded p-3 bg-light">
          {lineItem.remaining_to_dispatch === 0 ? (
            <div className="text-center py-4">
              <div className="text-success mb-3">
                <Icon icon="mdi:check-circle" width={64} height={64} />
              </div>
              <div className="fw-semibold text-success mb-2">
                All items dispatched successfully!
              </div>
              <div className="small text-muted">
                You can close the scanner now.
              </div>
            </div>
          ) : (
            <>
              <p className="mb-2 small text-muted">
                Scan the QR code using camera or USB scanner.{" "}
                <span className="fw-semibold text-primary">
                  {lineItem.remaining_to_dispatch} item
                  {lineItem.remaining_to_dispatch !== 1 ? "s" : ""} remaining.
                </span>
              </p>

              {/* USB barcode scanner input field */}
              <div className="mb-3">
                <label className="form-label small text-muted mb-1">
                  USB Scanner Input
                </label>
                <input
                  ref={scannerInputRef}
                  type="text"
                  className="form-control"
                  placeholder="Scan QR code with USB scanner..."
                  onChange={handleScannerInput}
                  onKeyDown={handleKeyDown}
                  disabled={isDispatching}
                  style={{
                    fontSize: "16px",
                    padding: "12px",
                    textAlign: "center",
                  }}
                  autoComplete="off"
                />
                <div className="small text-muted mt-1">
                  <Icon icon="mdi:information-outline" className="me-1" />
                  Point USB scanner here and scan QR code
                </div>
              </div>

              {isDispatching && (
                <div className="alert alert-info mb-2 py-2" role="alert">
                  <div className="d-flex align-items-center gap-2">
                    <div
                      className="spinner-border spinner-border-sm"
                      role="status"
                      style={{ width: "1rem", height: "1rem" }}
                    >
                      <span className="visually-hidden">Processing...</span>
                    </div>
                    <span className="small">Processing scan...</span>
                  </div>
                </div>
              )}

              <div className="text-center mb-2">
                <span className="small text-muted">OR</span>
              </div>

              {/* Camera scanner - existing */}
              <Html5QrScanner
                className="w-100"
                onScan={onScan}
                onError={(message) =>
                  console.warn("QR scanner warning", message)
                }
                qrbox={320}
              />
            </>
          )}
        </div>
        {scanError && (
          <div className="alert alert-danger mt-3" role="alert">
            {scanError}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} disabled={isDispatching}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

const OrderManagementPage = () => {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(50);
  const [activeTab, setActiveTab] = useState("pending"); // "pending", "in-progress", or "fully-dispatched"
  const [scannerState, setScannerState] = useState({
    isOpen: false,
    lineItem: null,
    scanError: "",
    isDispatching: false,
  });
  // Track last scanned token and timestamp to prevent duplicate scans
  const lastScanRef = useRef({
    token: null,
    timestamp: 0,
    orderLineItemId: null,
  });
  // Synchronous flag to prevent concurrent processing
  const isProcessingRef = useRef(false);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await inventoryManagementApi.listDispatchQueue(limit);
      setQueue(response?.data || response || []);
    } catch (err) {
      console.error("Failed to load dispatch queue", err);
      setError(err.message || "Failed to load dispatch queue");
      toast.error(err.message || "Failed to load dispatch queue");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const handleOpenScanner = useCallback((lineItem) => {
    // Reset scan tracking when opening scanner for a new line item
    lastScanRef.current = { token: null, timestamp: 0, orderLineItemId: null };
    isProcessingRef.current = false;
    setScannerState({
      isOpen: true,
      lineItem,
      scanError: "",
      isDispatching: false,
    });
  }, []);

  const handleCloseScanner = useCallback(() => {
    // Reset scan tracking when closing scanner
    lastScanRef.current = { token: null, timestamp: 0, orderLineItemId: null };
    isProcessingRef.current = false;
    setScannerState({
      isOpen: false,
      lineItem: null,
      scanError: "",
      isDispatching: false,
    });
  }, []);

  const handleScan = useCallback(
    async (value) => {
      // Synchronous check to prevent concurrent processing
      if (isProcessingRef.current) {
        console.log("Scan already processing, ignoring duplicate");
        return;
      }

      if (!scannerState.lineItem || scannerState.isDispatching) {
        return;
      }

      if (!value) {
        return;
      }

      let token;
      try {
        token = parseQrToken(value);
        if (!token) {
          throw new Error("Unable to extract QR token");
        }
      } catch (err) {
        console.error("Failed to parse QR", err);
        const errorMessage = err.message || "Invalid QR code";
        setScannerState((prev) => ({
          ...prev,
          scanError: errorMessage,
        }));
        // Show user-friendly error message
        if (errorMessage.includes("Invalid QR token format")) {
          toast.error(
            "Invalid QR code format. Please scan a valid QR code from the receiving management system.",
            { autoClose: 4000 }
          );
        } else {
          toast.error(errorMessage, { autoClose: 3000 });
        }
        return;
      }

      // Prevent duplicate scans: same token + same order line item within 2 seconds
      const currentOrderLineItemId = `${scannerState.lineItem.order_id}-${scannerState.lineItem.item_id}`;
      const now = Date.now();
      const timeSinceLastScan = now - lastScanRef.current.timestamp;
      const isDuplicate =
        lastScanRef.current.token === token &&
        lastScanRef.current.orderLineItemId === currentOrderLineItemId &&
        timeSinceLastScan < 2000; // 2 second debounce

      if (isDuplicate) {
        console.log("Duplicate scan ignored", { token, timeSinceLastScan });
        return;
      }

      // Set processing flag immediately (synchronous)
      isProcessingRef.current = true;

      try {
        setScannerState((prev) => ({
          ...prev,
          isDispatching: true,
          scanError: "",
        }));

        // Update last scan reference immediately to prevent duplicates
        lastScanRef.current = {
          token,
          timestamp: now,
          orderLineItemId: currentOrderLineItemId,
        };

        // Extract numeric IDs from GID format if needed
        const orderId = extractNumericId(scannerState.lineItem.order_id);
        const orderLineItemId = extractNumericId(scannerState.lineItem.item_id);

        const response = await inventoryManagementApi.dispatchScan(
          orderId,
          orderLineItemId,
          {
            qrToken: token,
            source: "order_management",
          }
        );

        // Get remaining quantity from response
        const remainingAfterScan =
          response?.data?.remaining_to_dispatch ?? null;

        // Reload queue to get updated data
        const queueResponse = await inventoryManagementApi.listDispatchQueue(
          limit
        );
        const updatedQueue = queueResponse?.data || queueResponse || [];
        setQueue(updatedQueue);

        // Find the updated line item from the fresh queue data
        const updatedLine = updatedQueue.find(
          (line) =>
            line.order_id === scannerState.lineItem.order_id &&
            line.item_id === scannerState.lineItem.item_id
        );

        // Get final remaining quantity (from updatedLine or response)
        const finalRemaining =
          updatedLine?.remaining_to_dispatch ??
          remainingAfterScan ??
          scannerState.lineItem.remaining_to_dispatch;

        const totalQuantity = Number(
          updatedLine?.quantity || scannerState.lineItem.quantity || 0
        );
        const dispatchedCount = Number(updatedLine?.dispatched_quantity || 0);

        // Update scanner state with fresh data
        setScannerState((prev) => ({
          ...prev,
          lineItem: updatedLine || prev.lineItem,
          isDispatching: false,
          scanError: "",
        }));

        // Show appropriate message and handle auto-close
        if (finalRemaining === 0) {
          // All items dispatched - show completion message and close scanner
          toast.success(
            `All ${totalQuantity} item${
              totalQuantity !== 1 ? "s" : ""
            } dispatched successfully!`,
            { autoClose: 3000 }
          );
          // Auto-close scanner after a short delay to show the success message
          setTimeout(() => {
            handleCloseScanner();
          }, 500);
        } else {
          // More items remaining - show progress message
          toast.success(
            `${dispatchedCount} of ${totalQuantity} item${
              totalQuantity !== 1 ? "s" : ""
            } scanned. ${finalRemaining} remaining.`,
            { autoClose: 2000 }
          );
        }
      } catch (err) {
        // Reset last scan on error so user can retry
        lastScanRef.current = {
          token: null,
          timestamp: 0,
          orderLineItemId: null,
        };

        const errorMessage = err.message || "Failed to dispatch";
        let displayMessage = errorMessage;

        // Show user-friendly messages for specific errors
        if (
          errorMessage.includes("You are scanning the wrong QR code") ||
          errorMessage.includes("QR code does not match")
        ) {
          displayMessage =
            "You are scanning the wrong QR code. Please scan the correct QR code for this product.";
        } else if (errorMessage.includes("Insufficient available quantity")) {
          displayMessage =
            "Insufficient available quantity for dispatch. Please check inventory.";
        } else if (errorMessage.includes("Invalid or unknown QR token")) {
          displayMessage =
            "Invalid QR code. Please scan a valid QR code from the receiving management system.";
        }

        // Log validation errors (400) as warnings, other errors as errors
        // 400 errors are expected user input validation errors, not system errors
        if (err.status === 400) {
          console.warn("Validation error:", displayMessage);
        } else {
          console.error("Dispatch failed", err);
        }

        setScannerState((prev) => ({
          ...prev,
          isDispatching: false,
          scanError: displayMessage,
        }));
        toast.error(displayMessage, { autoClose: 4000 });
      } finally {
        // Always reset processing flag to allow next scan
        isProcessingRef.current = false;
      }
    },
    [
      scannerState.lineItem,
      scannerState.isDispatching,
      limit,
      handleCloseScanner,
    ]
  );

  // Group queue items by order_id
  const groupedOrders = useMemo(() => {
    const groups = {};
    queue.forEach((line) => {
      const orderId = line.order_id;
      if (!groups[orderId]) {
        groups[orderId] = {
          order_id: orderId,
          order_name: line.order_name,
          created_at: line.created_at,
          display_fulfillment_status: line.display_fulfillment_status,
          lineItems: [],
          totalItems: 0,
          totalRemaining: 0,
          totalDispatched: 0,
        };
      }
      groups[orderId].lineItems.push(line);
      groups[orderId].totalItems += Number(line.quantity || 0);
      groups[orderId].totalRemaining += Number(line.remaining_to_dispatch || 0);
      groups[orderId].totalDispatched += Number(line.dispatched_quantity || 0);
    });
    return Object.values(groups);
  }, [queue]);

  // Filter grouped orders based on active tab
  const filteredGroupedOrders = useMemo(() => {
    if (activeTab === "pending") {
      // Show orders where no items have been dispatched yet (all line items have dispatched_quantity = 0)
      return groupedOrders.filter((orderGroup) => {
        return orderGroup.lineItems.every(
          (line) => Number(line.dispatched_quantity || 0) === 0
        );
      });
    } else if (activeTab === "in-progress") {
      // Show orders that are partially scanned (at least one scan, but not all items dispatched)
      return groupedOrders.filter((orderGroup) => {
        const hasScans = orderGroup.lineItems.some(
          (line) => Number(line.dispatched_quantity || 0) > 0
        );
        const hasRemaining = orderGroup.lineItems.some(
          (line) => Number(line.remaining_to_dispatch || 0) > 0
        );
        return hasScans && hasRemaining; // Has scans but still has remaining items
      });
    } else {
      // Show fully dispatched orders (all items have remaining_to_dispatch = 0)
      return groupedOrders.filter((orderGroup) => {
        return orderGroup.lineItems.every(
          (line) => Number(line.remaining_to_dispatch || 0) === 0
        );
      });
    }
  }, [groupedOrders, activeTab]);

  // Calculate counts for tabs
  const tabCounts = useMemo(() => {
    const pending = groupedOrders.filter((orderGroup) => {
      return orderGroup.lineItems.every(
        (line) => Number(line.dispatched_quantity || 0) === 0
      );
    }).length;

    const inProgress = groupedOrders.filter((orderGroup) => {
      const hasScans = orderGroup.lineItems.some(
        (line) => Number(line.dispatched_quantity || 0) > 0
      );
      const hasRemaining = orderGroup.lineItems.some(
        (line) => Number(line.remaining_to_dispatch || 0) > 0
      );
      return hasScans && hasRemaining; // Has scans but still has remaining items
    }).length;

    const fullyDispatched = groupedOrders.filter((orderGroup) => {
      return orderGroup.lineItems.every(
        (line) => Number(line.remaining_to_dispatch || 0) === 0
      );
    }).length;

    return { pending, inProgress, fullyDispatched };
  }, [groupedOrders]);

  const tableBody = useMemo(() => {
    if (loading) {
      return (
        <tr>
          <td colSpan={10} className="text-center py-5">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </td>
        </tr>
      );
    }

    if (error) {
      return (
        <tr>
          <td colSpan={10} className="text-center text-danger py-4">
            {error}
          </td>
        </tr>
      );
    }

    if (!queue.length) {
      return (
        <tr>
          <td colSpan={10} className="text-center text-muted py-4">
            No items awaiting dispatch
          </td>
        </tr>
      );
    }

    if (filteredGroupedOrders.length === 0) {
      return (
        <tr>
          <td colSpan={10} className="text-center text-muted py-4">
            {activeTab === "pending"
              ? "No pending orders to dispatch"
              : activeTab === "in-progress"
              ? "No orders in progress"
              : "No fully dispatched orders"}
          </td>
        </tr>
      );
    }

    const rows = [];
    filteredGroupedOrders.forEach((orderGroup) => {
      // Order summary row
      rows.push(
        <tr
          key={`order-${orderGroup.order_id}`}
          style={{ backgroundColor: "#f8f9fa", fontWeight: "600" }}
        >
          <td>
            <div className="fw-semibold">
              Order: {orderGroup.order_name || orderGroup.order_id}
            </div>
            <div className="small text-muted">
              {formatDateTime(orderGroup.created_at)}
            </div>
          </td>
          <td className="text-center">
            <span className="badge bg-light text-secondary border">
              Status: {orderGroup.display_fulfillment_status || "Unknown"}
            </span>
          </td>
          <td>
            <div className="fw-semibold">
              Items: {orderGroup.lineItems.length}
            </div>
          </td>
          <td>-</td>
          <td className="text-center">{orderGroup.totalItems}</td>
          <td className="text-center">-</td>
          <td className="text-center fw-semibold text-primary">
            Remaining: {orderGroup.totalRemaining}
          </td>
          <td className="text-center">-</td>
          <td className="text-center">-</td>
          <td className="text-end">-</td>
        </tr>
      );

      // Line item rows with tree structure
      orderGroup.lineItems.forEach((line, index) => {
        const remaining = Number(line.remaining_to_dispatch || 0);
        const isDisabled = remaining <= 0;
        const isLast = index === orderGroup.lineItems.length - 1;
        const treePrefix = isLast ? "└─" : "├─";

        rows.push(
          <tr key={`${line.order_id}-${line.item_id}`}>
            <td>
              <div className="d-flex align-items-center gap-2 ps-3">
                <span style={{ color: "#6b7280", fontFamily: "monospace" }}>
                  {treePrefix}
                </span>
                <div>
                  <div className="fw-semibold" style={{ fontSize: "0.9em" }}>
                    {line.sku || "-"}
                  </div>
                  <div className="small text-muted">Remaining: {remaining}</div>
                </div>
              </div>
            </td>
            <td className="text-center">-</td>
            <td>
              <div className="fw-semibold">{line.title}</div>
              <div className="small text-muted">
                {line.product_title || "Unknown product"}
              </div>
            </td>
            <td>{line.sku || "-"}</td>
            <td className="text-center">{line.quantity}</td>
            <td className="text-center">{line.dispatched_quantity || 0}</td>
            <td className="text-center fw-semibold text-primary">
              {remaining}
            </td>
            <td className="text-center">{line.available_quantity ?? "-"}</td>
            <td className="text-center">{line.committed_quantity ?? "-"}</td>
            <td className="text-end">
              <button
                type="button"
                className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                onClick={() => handleOpenScanner(line)}
                disabled={isDisabled}
              >
                <Icon icon="mdi:barcode-scan" width={18} height={18} />
                Dispatch
              </button>
            </td>
          </tr>
        );
      });
    });

    return rows;
  }, [
    filteredGroupedOrders,
    loading,
    error,
    queue.length,
    handleOpenScanner,
    activeTab,
  ]);

  return (
    <SidebarPermissionGuard requiredSidebar="orderManagement">
      <MasterLayout>
        <Breadcrumb title="Order Management" />
        <div className="container-fluid py-4">
          <div className="card">
            <div className="card-header d-flex flex-column flex-md-row gap-2 justify-content-between align-items-md-center">
              <div>
                <h5 className="mb-0">Order Dispatch Queue</h5>
                <div className="text-muted small">
                  Process Shopify orders by scanning the QR codes printed during
                  receiving.
                </div>
              </div>
              <div className="d-flex gap-2">
                <select
                  className="form-select form-select-sm"
                  style={{ width: "auto" }}
                  value={limit}
                  onChange={(event) =>
                    setLimit(Number(event.target.value) || 50)
                  }
                  disabled={loading}
                >
                  {[25, 50, 75, 100].map((option) => (
                    <option key={option} value={option}>
                      Show {option}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={loadQueue}
                  disabled={loading}
                >
                  <Icon icon="mdi:refresh" width={18} height={18} />
                </button>
              </div>
            </div>
            {/* Tabs for Pending, In Progress, and Fully Dispatched */}
            <div className="border-bottom">
              <ul className="nav nav-tabs card-header-tabs" role="tablist">
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${
                      activeTab === "pending" ? "active" : ""
                    }`}
                    onClick={() => setActiveTab("pending")}
                    type="button"
                    role="tab"
                  >
                    Pending Dispatch
                    {tabCounts.pending > 0 && (
                      <span className="badge bg-primary ms-2">
                        {tabCounts.pending}
                      </span>
                    )}
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${
                      activeTab === "in-progress" ? "active" : ""
                    }`}
                    onClick={() => setActiveTab("in-progress")}
                    type="button"
                    role="tab"
                  >
                    In Progress
                    {tabCounts.inProgress > 0 && (
                      <span className="badge bg-info ms-2">
                        {tabCounts.inProgress}
                      </span>
                    )}
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${
                      activeTab === "fully-dispatched" ? "active" : ""
                    }`}
                    onClick={() => setActiveTab("fully-dispatched")}
                    type="button"
                    role="tab"
                  >
                    Fully Dispatched
                    {tabCounts.fullyDispatched > 0 && (
                      <span className="badge bg-success ms-2">
                        {tabCounts.fullyDispatched}
                      </span>
                    )}
                  </button>
                </li>
              </ul>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table
                  className="table table-hover mb-0"
                  style={{ fontSize: "clamp(12px, 2.5vw, 14px)" }}
                >
                  <thead
                    style={{
                      backgroundColor: "#f9fafb",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    <tr>
                      <th>Order</th>
                      <th className="text-center">Status</th>
                      <th>Product</th>
                      <th>SKU</th>
                      <th className="text-center">Ordered</th>
                      <th className="text-center">Dispatched</th>
                      <th className="text-center">Remaining</th>
                      <th className="text-center">Available</th>
                      <th className="text-center">Committed</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>{tableBody}</tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <DispatchScannerModal
          isOpen={scannerState.isOpen}
          onClose={handleCloseScanner}
          lineItem={scannerState.lineItem}
          onScan={handleScan}
          scanError={scannerState.scanError}
          isDispatching={scannerState.isDispatching}
        />
      </MasterLayout>
    </SidebarPermissionGuard>
  );
};

export default OrderManagementPage;
