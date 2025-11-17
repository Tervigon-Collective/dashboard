"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { Modal, Button } from "react-bootstrap";
import { toast } from "react-toastify";

import MasterLayout from "@/masterLayout/MasterLayout";
import Breadcrumb from "@/components/Breadcrumb";
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
        <div className="row g-3">
          {[
            { label: "Available", value: item.available_quantity },
            { label: "Committed", value: item.committed_quantity },
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
                        {new Date(entry.created_at).toLocaleString()}
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
    return <span className="badge bg-light text-secondary">{row.status}</span>;
  }

  return (
    <div className="d-flex gap-2">
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

const StockManagementPage = () => {
  const [activeTab, setActiveTab] = useState("inventory");

  const [inventoryState, setInventoryState] = useState({
    data: [],
    pagination: { page: 1, totalPages: 1 },
    loading: false,
    search: "",
    limit: 25,
  });
  const [inventoryDetail, setInventoryDetail] = useState({
    item: null,
    ledger: null,
    loadingLedger: false,
  });

  const [returnsState, setReturnsState] = useState({
    data: [],
    pagination: { page: 1, totalPages: 1 },
    loading: false,
    status: "pending",
    busyCaseId: null,
  });

  const loadInventory = useCallback(
    async ({ page, limit, search } = {}) => {
      setInventoryState((prev) => ({ ...prev, loading: true }));
      try {
        const response = await inventoryManagementApi.listInventoryItems({
          page: page ?? inventoryState.pagination.page,
          limit: limit ?? inventoryState.limit,
          search: search ?? inventoryState.search,
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

        setInventoryState((prev) => ({
          ...prev,
          data,
          pagination,
          loading: false,
          limit: limit ?? prev.limit,
          search: search ?? prev.search,
        }));
      } catch (error) {
        console.error("Failed to load inventory", error);
        toast.error(error.message || "Failed to load inventory");
        setInventoryState((prev) => ({ ...prev, loading: false }));
      }
    },
    [
      inventoryState.limit,
      inventoryState.pagination.page,
      inventoryState.search,
    ]
  );

  const loadReturns = useCallback(
    async ({ page, status } = {}) => {
      setReturnsState((prev) => ({ ...prev, loading: true }));
      try {
        const response = await inventoryManagementApi.listReturnCases({
          status: status ?? returnsState.status,
          page: page ?? returnsState.pagination.page,
          limit: 25,
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

        setReturnsState((prev) => ({
          ...prev,
          data,
          pagination,
          status: status ?? prev.status,
          loading: false,
        }));
      } catch (error) {
        console.error("Failed to load return cases", error);
        toast.error(error.message || "Failed to load return cases");
        setReturnsState((prev) => ({ ...prev, loading: false }));
      }
    },
    [returnsState.pagination.page, returnsState.status]
  );

  useEffect(() => {
    if (activeTab === "inventory") {
      loadInventory({ page: 1 });
    } else if (activeTab === "returns") {
      loadReturns({ page: 1 });
    }
  }, [activeTab, loadInventory, loadReturns]);

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
      const resolvedLedger = ledger?.data ? ledger : { data: ledger };
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

  const inventoryTable = useMemo(() => {
    if (inventoryState.loading) {
      return (
        <tr>
          <td colSpan={7} className="text-center py-5">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </td>
        </tr>
      );
    }

    if (!inventoryState.data.length) {
      return (
        <tr>
          <td colSpan={7} className="text-center text-muted py-4">
            No inventory records found
          </td>
        </tr>
      );
    }

    return inventoryState.data.map((item) => (
      <tr key={item.inventory_item_id}>
        <td>{item.product_name}</td>
        <td>{item.variant_display_name}</td>
        <td>{item.sku || "-"}</td>
        <td className="text-center">{formatNumber(item.available_quantity)}</td>
        <td className="text-center">{formatNumber(item.committed_quantity)}</td>
        <td className="text-center">{formatNumber(item.cancelled_quantity)}</td>
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
    ));
  }, [inventoryState, openInventoryDetail]);

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

  return (
    <SidebarPermissionGuard requiredSidebar="stockManagement">
      <MasterLayout>
        <Breadcrumb title="Stock Management" />
        <div className="container-fluid py-4">
          <div className="card">
            <div className="card-header border-0 pb-0">
              <div className="d-flex gap-3">
                {[
                  { id: "inventory", label: "Inventory" },
                  { id: "returns", label: "Returns" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`btn btn-link px-0 text-decoration-none fw-semibold ${
                      activeTab === tab.id ? "text-primary" : "text-muted"
                    }`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="card-body">
              {activeTab === "inventory" && (
                <div>
                  <div className="row g-3 align-items-end mb-3">
                    <div className="col-md-4">
                      <label className="form-label small">Search</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Product, variant or SKU"
                        value={inventoryState.search}
                        onChange={(event) =>
                          setInventoryState((prev) => ({
                            ...prev,
                            search: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small">Page Size</label>
                      <select
                        className="form-select"
                        value={inventoryState.limit}
                        onChange={(event) =>
                          setInventoryState((prev) => ({
                            ...prev,
                            limit: Number(event.target.value) || 25,
                          }))
                        }
                      >
                        {[25, 50, 75, 100].map((option) => (
                          <option key={option} value={option}>
                            {option} rows
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-2 d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => loadInventory({ page: 1 })}
                        disabled={inventoryState.loading}
                      >
                        <Icon icon="mdi:magnify" width={18} height={18} />
                        Search
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() =>
                          setInventoryState((prev) => ({
                            ...prev,
                            search: "",
                          }))
                        }
                        disabled={inventoryState.loading}
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-light">
                        <tr>
                          <th>Product</th>
                          <th>Variant</th>
                          <th>SKU</th>
                          <th className="text-center">Available</th>
                          <th className="text-center">Committed</th>
                          <th className="text-center">Cancels</th>
                          <th className="text-center">Approved Returns</th>
                          <th className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>{inventoryTable}</tbody>
                    </table>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <div className="text-muted small">
                      Page {inventoryState.pagination.page} of{" "}
                      {inventoryState.pagination.totalPages}
                    </div>
                    <div className="btn-group">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        disabled={
                          inventoryState.loading ||
                          inventoryState.pagination.page <= 1
                        }
                        onClick={() =>
                          loadInventory({
                            page: inventoryState.pagination.page - 1,
                          })
                        }
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        disabled={
                          inventoryState.loading ||
                          inventoryState.pagination.page >=
                            inventoryState.pagination.totalPages
                        }
                        onClick={() =>
                          loadInventory({
                            page: inventoryState.pagination.page + 1,
                          })
                        }
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "returns" && (
                <div>
                  <div className="row g-3 align-items-end mb-3">
                    <div className="col-md-3">
                      <label className="form-label small">Status</label>
                      <select
                        className="form-select"
                        value={returnsState.status}
                        onChange={(event) =>
                          loadReturns({ status: event.target.value, page: 1 })
                        }
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="">All</option>
                      </select>
                    </div>
                    <div className="col-md-3 d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={handleSyncReturnCases}
                        disabled={returnsState.loading}
                      >
                        <Icon icon="mdi:refresh" width={18} height={18} />
                        Sync
                      </button>
                    </div>
                  </div>

                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-light">
                        <tr>
                          <th>Order</th>
                          <th>SKU</th>
                          <th>Variant</th>
                          <th className="text-center">Qty</th>
                          <th className="text-center">Status</th>
                          <th>Reason</th>
                          <th>Reported At</th>
                          <th className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>{returnsTable}</tbody>
                    </table>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <div className="text-muted small">
                      Page {returnsState.pagination.page} of{" "}
                      {returnsState.pagination.totalPages}
                    </div>
                    <div className="btn-group">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        disabled={
                          returnsState.loading ||
                          returnsState.pagination.page <= 1
                        }
                        onClick={() =>
                          loadReturns({
                            page: returnsState.pagination.page - 1,
                          })
                        }
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        disabled={
                          returnsState.loading ||
                          returnsState.pagination.page >=
                            returnsState.pagination.totalPages
                        }
                        onClick={() =>
                          loadReturns({
                            page: returnsState.pagination.page + 1,
                          })
                        }
                      >
                        Next
                      </button>
                    </div>
                  </div>
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
      </MasterLayout>
    </SidebarPermissionGuard>
  );
};

export default StockManagementPage;
