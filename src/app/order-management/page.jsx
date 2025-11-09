"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Modal, Button } from "react-bootstrap";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";

import SidebarPermissionGuard from "@/components/SidebarPermissionGuard";
import MasterLayout from "@/masterLayout/MasterLayout";
import Breadcrumb from "@/components/Breadcrumb";
import orderManagementApi from "@/services/orderManagementApi";

const Html5QrScanner = dynamic(() => import("@/components/Html5QrScanner"), {
  ssr: false,
});

const initialDispatchState = {
  isOpen: false,
  lineItem: null,
  isDispatching: false,
  scanError: "",
};

const parseQrPayload = (value) => {
  if (!value) {
    throw new Error("QR payload is empty");
  }

  try {
    let url;
    if (value.startsWith("http")) {
      url = new URL(value);
    } else {
      url = new URL(value, "https://placeholder.local");
    }

    const segments = url.pathname.split("/").filter(Boolean);
    const receivingIndex = segments.findIndex(
      (segment) => segment === "receiving"
    );

    if (
      receivingIndex === -1 ||
      !segments[receivingIndex + 1] ||
      segments[receivingIndex + 1] !== "qr"
    ) {
      throw new Error("QR code does not match receiving format");
    }

    const requestId = segments[receivingIndex + 2];
    const itemId = segments[receivingIndex + 3];
    const token = segments[receivingIndex + 4];

    if (!requestId || !itemId || !token) {
      throw new Error("Incomplete QR data");
    }

    return {
      requestId: Number(requestId),
      itemId: Number(itemId),
      token,
    };
  } catch (error) {
    throw new Error("Unable to parse QR code: " + error.message);
  }
};

const OrderManagementPage = () => {
  const [orders, setOrders] = useState([]);
  const [orderLines, setOrderLines] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [dispatchState, setDispatchState] = useState(initialDispatchState);

  const loadOrders = useCallback(async () => {
    try {
      setLoadingOrders(true);
      const response = await orderManagementApi.getRecentOrders(20);
      const data = response?.data || [];
      setOrders(data);
      const flattened = data.flatMap((order) =>
        (order.line_items || []).map((item) => ({
          ...item,
          order_id: order.order_id,
          order_name: order.order_name,
          order_created_at: order.created_at,
          order_total_price_amount: order.total_price_amount,
          order_total_price_currency: order.total_price_currency,
          order_status: order.display_fulfillment_status,
        }))
      );
      setOrderLines(flattened);
    } catch (error) {
      console.error("Failed to load orders:", error);
      toast.error(error.message || "Failed to load orders");
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleOpenScanner = useCallback((lineItem) => {
    setDispatchState({
      isOpen: true,
      lineItem,
      isDispatching: false,
      scanError: "",
    });
  }, []);

  const handleCloseScanner = useCallback(() => {
    setDispatchState(initialDispatchState);
  }, []);

  const handleDispatch = useCallback(
    async ({ requestId, itemId, token }) => {
      if (!dispatchState.lineItem) {
        toast.error("No line item selected for dispatch");
        return;
      }

      try {
        setDispatchState((prev) => ({
          ...prev,
          isDispatching: true,
          scanError: "",
        }));

        const payload = {
          shopifyVariantId: dispatchState.lineItem.variant_id,
          requestId,
          purchaseRequestItemId: itemId,
          qrToken: token,
        };

        const response = await orderManagementApi.dispatchOrderItem(
          dispatchState.lineItem.order_id,
          dispatchState.lineItem.item_id,
          payload
        );

        if (!response?.success) {
          throw new Error(response?.message || "Dispatch failed");
        }

        toast.success("Item dispatched successfully");
        await loadOrders();
        handleCloseScanner();
      } catch (error) {
        console.error("Dispatch failed:", error);
        const message = error.message || "Failed to dispatch item";
        toast.error(message);
        setDispatchState((prev) => ({
          ...prev,
          isDispatching: false,
          scanError: message,
        }));
      }
    },
    [dispatchState.lineItem, loadOrders, handleCloseScanner]
  );

  const handleScanResult = useCallback(
    (decodedText) => {
      if (dispatchState.isDispatching) {
        return;
      }

      if (!decodedText) {
        return;
      }

      try {
        const parsed = parseQrPayload(decodedText);
        handleDispatch(parsed);
      } catch (parseError) {
        console.error(parseError);
        setDispatchState((prev) => ({
          ...prev,
          scanError: parseError.message,
        }));
      }
    },
    [dispatchState.isDispatching, handleDispatch]
  );

  const dispatchModalBody = useMemo(() => {
    if (!dispatchState.lineItem) return null;

    return (
      <>
        <div className="mb-3">
          <h6 className="mb-1">{dispatchState.lineItem.title}</h6>
          <div className="small text-muted">
            SKU: {dispatchState.lineItem.sku || "-"}
          </div>
          <div className="small text-muted">
            Remaining to dispatch:{" "}
            {dispatchState.lineItem.remaining_to_dispatch}
          </div>
          <div className="small text-muted">
            Inventory available: {dispatchState.lineItem.current_quantity ?? 0}
          </div>
        </div>
        <div className="border rounded p-3 bg-light">
          <p className="mb-2">Scan the QR code attached to the product.</p>
          <div className="qr-reader-wrapper">
            <Html5QrScanner
              className="w-100"
              onScan={handleScanResult}
              onError={(errorMessage) =>
                setDispatchState((prev) => ({
                  ...prev,
                  scanError: errorMessage,
                }))
              }
              qrbox={280}
            />
          </div>
        </div>
        {dispatchState.scanError && (
          <div className="alert alert-danger mt-3" role="alert">
            {dispatchState.scanError}
          </div>
        )}
      </>
    );
  }, [dispatchState.lineItem, dispatchState.scanError, handleScanResult]);

  return (
    <SidebarPermissionGuard requiredSidebar="orderManagement">
      <MasterLayout>
        <Breadcrumb title="Order Management" />
        <div className="container-fluid py-4">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Order Dispatch Queue</h5>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={loadOrders}
                disabled={loadingOrders}
              >
                <Icon icon="mdi:refresh" fontSize={16} />
              </button>
            </div>
            <div className="card-body p-0">
              {loadingOrders ? (
                <div className="d-flex justify-content-center py-5">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : orderLines.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  No line items requiring dispatch were found.
                </div>
              ) : (
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
                        <th style={{ fontWeight: 600, color: "#374151" }}>
                          Order
                        </th>
                        <th
                          className="text-center"
                          style={{ fontWeight: 600, color: "#374151" }}
                        >
                          Status
                        </th>
                        <th
                          style={{
                            minWidth: "220px",
                            fontWeight: 600,
                            color: "#374151",
                          }}
                        >
                          Product
                        </th>
                        <th style={{ fontWeight: 600, color: "#374151" }}>
                          SKU
                        </th>
                        <th
                          className="text-center"
                          style={{ fontWeight: 600, color: "#374151" }}
                        >
                          Ordered
                        </th>
                        <th
                          className="text-center"
                          style={{ fontWeight: 600, color: "#374151" }}
                        >
                          Dispatched
                        </th>
                        <th
                          className="text-center"
                          style={{ fontWeight: 600, color: "#374151" }}
                        >
                          Remaining
                        </th>
                        <th
                          className="text-center"
                          style={{ fontWeight: 600, color: "#374151" }}
                        >
                          Available
                        </th>
                        <th
                          className="text-end"
                          style={{
                            minWidth: "120px",
                            fontWeight: 600,
                            color: "#374151",
                          }}
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderLines.map((line) => {
                        const remaining =
                          Number(line.remaining_to_dispatch) || 0;
                        const isDisabled = remaining <= 0;
                        return (
                          <tr key={`${line.order_id}-${line.item_id}`}>
                            <td style={{ padding: "12px" }}>
                              <div className="fw-semibold">
                                {line.order_name || line.order_id}
                              </div>
                              <div className="small text-muted">
                                {new Date(
                                  line.order_created_at
                                ).toLocaleString()}
                              </div>
                            </td>
                            <td
                              className="text-center"
                              style={{ padding: "12px" }}
                            >
                              <span className="badge bg-light text-secondary border">
                                {line.order_status || "Unknown"}
                              </span>
                            </td>
                            <td style={{ padding: "12px" }}>
                              <div className="fw-semibold">{line.title}</div>
                              <div className="small text-muted">
                                {line.product_title || "Unknown Product"}
                              </div>
                            </td>
                            <td style={{ padding: "12px" }}>
                              {line.sku || "-"}
                            </td>
                            <td
                              className="text-center"
                              style={{ padding: "12px" }}
                            >
                              {line.quantity}
                            </td>
                            <td
                              className="text-center"
                              style={{ padding: "12px" }}
                            >
                              {line.dispatched_quantity || 0}
                            </td>
                            <td
                              className="text-center fw-semibold"
                              style={{ padding: "12px", color: "#2563eb" }}
                            >
                              {remaining}
                            </td>
                            <td
                              className="text-center"
                              style={{ padding: "12px" }}
                            >
                              {line.current_quantity ?? 0}
                            </td>
                            <td
                              className="text-end"
                              style={{ padding: "12px" }}
                            >
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                                disabled={isDisabled}
                                onClick={() => handleOpenScanner(line)}
                              >
                                <Icon icon="mdi:barcode-scan" fontSize={16} />
                                Dispatch
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <Modal
          show={dispatchState.isOpen}
          onHide={handleCloseScanner}
          size="lg"
        >
          <Modal.Header closeButton>
            <Modal.Title>Scan QR to Dispatch</Modal.Title>
          </Modal.Header>
          <Modal.Body>{dispatchModalBody}</Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={handleCloseScanner}
              disabled={dispatchState.isDispatching}
            >
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </MasterLayout>
    </SidebarPermissionGuard>
  );
};

export default OrderManagementPage;
