"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

const parseQrToken = (rawValue) => {
  if (!rawValue) {
    throw new Error("QR payload is empty");
  }

  if (rawValue.startsWith("http")) {
    try {
      const url = new URL(rawValue);
      const tokenFromQuery = url.searchParams.get("token");
      if (tokenFromQuery) {
        return tokenFromQuery;
      }

      const segments = url.pathname.split("/").filter(Boolean);
      return segments[segments.length - 1];
    } catch (error) {
      console.warn("Failed to parse QR URL, falling back to raw value", error);
    }
  }

  const queryIndex = rawValue.indexOf("token=");
  if (queryIndex !== -1) {
    const params = new URLSearchParams(rawValue.slice(queryIndex));
    const tokenFromQuery = params.get("token");
    if (tokenFromQuery) {
      return tokenFromQuery;
    }
  }

  const tokens = rawValue.split("/").filter(Boolean);
  return tokens[tokens.length - 1];
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
            <div className="fw-semibold">{lineItem.dispatched_quantity}</div>
          </div>
          <div className="col-6 col-md-3">
            <span className="text-muted small">Remaining</span>
            <div className="fw-semibold text-primary">
              {lineItem.remaining_to_dispatch}
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
          <p className="mb-2 small text-muted">
            Scan the QR code attached to each unit. The number of scans must
            match the remaining quantity.
          </p>
          <Html5QrScanner
            className="w-100"
            onScan={onScan}
            onError={(message) => console.warn("QR scanner warning", message)}
            qrbox={320}
          />
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
  const [scannerState, setScannerState] = useState({
    isOpen: false,
    lineItem: null,
    scanError: "",
    isDispatching: false,
  });

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
    setScannerState({
      isOpen: true,
      lineItem,
      scanError: "",
      isDispatching: false,
    });
  }, []);

  const handleCloseScanner = useCallback(() => {
    setScannerState({
      isOpen: false,
      lineItem: null,
      scanError: "",
      isDispatching: false,
    });
  }, []);

  const handleScan = useCallback(
    async (value) => {
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
        setScannerState((prev) => ({
          ...prev,
          scanError: err.message || "Invalid QR code",
        }));
        return;
      }

      try {
        setScannerState((prev) => ({
          ...prev,
          isDispatching: true,
          scanError: "",
        }));

        const response = await inventoryManagementApi.dispatchScan(
          scannerState.lineItem.order_id,
          scannerState.lineItem.item_id,
          {
            qrToken: token,
            source: "order_management",
          }
        );

        toast.success("Item dispatched");
        await loadQueue();

        const updatedLine = queue.find(
          (line) =>
            line.order_id === scannerState.lineItem.order_id &&
            line.item_id === scannerState.lineItem.item_id
        );

        setScannerState((prev) => ({
          ...prev,
          lineItem: updatedLine || prev.lineItem,
          isDispatching: false,
          scanError: "",
        }));
      } catch (err) {
        console.error("Dispatch failed", err);
        setScannerState((prev) => ({
          ...prev,
          isDispatching: false,
          scanError: err.message || "Failed to dispatch",
        }));
        toast.error(err.message || "Failed to dispatch");
      }
    },
    [scannerState.lineItem, scannerState.isDispatching, loadQueue, queue]
  );

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

    return queue.map((line) => {
      const remaining = Number(line.remaining_to_dispatch || 0);
      const isDisabled = remaining <= 0;
      return (
        <tr key={`${line.order_id}-${line.item_id}`}>
          <td>
            <div className="fw-semibold">
              {line.order_name || line.order_id}
            </div>
            <div className="small text-muted">
              {formatDateTime(line.created_at)}
            </div>
          </td>
          <td className="text-center">
            <span className="badge bg-light text-secondary border">
              {line.display_fulfillment_status || "Unknown"}
            </span>
          </td>
          <td>
            <div className="fw-semibold">{line.title}</div>
            <div className="small text-muted">
              {line.product_title || "Unknown product"}
            </div>
          </td>
          <td>{line.sku || "-"}</td>
          <td className="text-center">{line.quantity}</td>
          <td className="text-center">{line.dispatched_quantity || 0}</td>
          <td className="text-center fw-semibold text-primary">{remaining}</td>
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
  }, [queue, loading, error, handleOpenScanner]);

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
