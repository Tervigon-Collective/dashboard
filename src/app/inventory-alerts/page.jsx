"use client";

import { useCallback, useEffect, useState } from "react";
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

const StockStatusBadge = ({ item }) => {
  const netAvailable = item.net_available ?? (item.available_quantity - item.committed_quantity);
  
  if (netAvailable <= 0) {
    return (
      <span className="badge bg-danger" style={{ fontSize: "0.75rem", padding: "4px 8px" }}>
        OUT OF STOCK
      </span>
    );
  }
  if (item.minimum_stock_level !== null && item.minimum_stock_level !== undefined && netAvailable <= item.minimum_stock_level) {
    return (
      <span className="badge bg-warning text-dark" style={{ fontSize: "0.75rem", padding: "4px 8px" }}>
        CRITICAL
      </span>
    );
  }
  if (item.reorder_point !== null && item.reorder_point !== undefined && netAvailable <= item.reorder_point) {
    return (
      <span className="badge bg-warning text-dark" style={{ fontSize: "0.75rem", padding: "4px 8px" }}>
        LOW STOCK
      </span>
    );
  }
  return (
    <span className="badge bg-success" style={{ fontSize: "0.75rem", padding: "4px 8px" }}>
      IN STOCK
    </span>
  );
};

const InventoryAlertsPage = () => {
  const [lowStockItems, setLowStockItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const loadLowStockItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await inventoryManagementApi.getLowStockItems();
      const data = response?.data || [];
      const summaryData = response?.summary || {};
      
      setLowStockItems(data);
      setSummary(summaryData);
    } catch (error) {
      console.error("Failed to load low stock items", error);
      toast.error(error.message || "Failed to load low stock items");
      setLowStockItems([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLowStockItems();
  }, [loadLowStockItems]);

  const handleViewDetails = async (item) => {
    try {
      const [itemDetail, ledger] = await Promise.all([
        inventoryManagementApi.getInventoryItem(item.inventory_item_id),
        inventoryManagementApi.getInventoryLedger(item.inventory_item_id, { limit: 10 }),
      ]);
      
      const resolvedItem = itemDetail?.data || itemDetail;
      // Normalize ledger structure: ensure it always has { data: [...] } format
      const resolvedLedger = ledger?.data 
        ? { data: Array.isArray(ledger.data) ? ledger.data : [ledger.data] }
        : { data: Array.isArray(ledger) ? ledger : (ledger ? [ledger] : []) };
      
      setSelectedItem({
        item: resolvedItem,
        ledger: resolvedLedger,
      });
      setShowDetailModal(true);
    } catch (error) {
      console.error("Failed to load item details", error);
      toast.error(error.message || "Failed to load item details");
    }
  };

  return (
    <SidebarPermissionGuard requiredSidebar="stockManagement">
      <MasterLayout>
        <div className="container-fluid py-4">
          <div className="card h-100 radius-8 border">
            <div className="card-body p-24">
              {/* Header */}
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h5 className="mb-0 fw-semibold">Low Stock Alerts</h5>
                  <p className="text-muted small mb-0 mt-1">
                    Items that need immediate attention
                  </p>
                </div>
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={loadLowStockItems}
                  disabled={loading}
                >
                  <Icon icon="lucide:refresh-cw" width="16" height="16" className="me-1" />
                  Refresh
                </button>
              </div>

              {/* Summary Cards */}
              {summary && (
                <div className="row g-3 mb-4">
                  <div className="col-md-4">
                    <div className="card border-danger">
                      <div className="card-body text-center">
                        <div className="text-danger mb-2">
                          <Icon icon="lucide:alert-circle" width="32" height="32" />
                        </div>
                        <div className="h3 mb-0 text-danger fw-bold">
                          {summary.out_of_stock || 0}
                        </div>
                        <div className="text-muted small">Out of Stock</div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card border-warning">
                      <div className="card-body text-center">
                        <div className="text-warning mb-2">
                          <Icon icon="lucide:alert-triangle" width="32" height="32" />
                        </div>
                        <div className="h3 mb-0 text-warning fw-bold">
                          {summary.critical || 0}
                        </div>
                        <div className="text-muted small">Critical Stock</div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card border-info">
                      <div className="card-body text-center">
                        <div className="text-info mb-2">
                          <Icon icon="lucide:info" width="32" height="32" />
                        </div>
                        <div className="h3 mb-0 text-info fw-bold">
                          {summary.low_stock || 0}
                        </div>
                        <div className="text-muted small">Low Stock</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Low Stock Items Table */}
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead className="table-light">
                    <tr>
                      <th scope="col" style={{ width: "60px" }}>#</th>
                      <th scope="col">Product</th>
                      <th scope="col">Variant</th>
                      <th scope="col">SKU</th>
                      <th scope="col" className="text-center">Available</th>
                      <th scope="col" className="text-center">Committed</th>
                      <th scope="col" className="text-center">Net Available</th>
                      <th scope="col" className="text-center">Reorder Point</th>
                      <th scope="col" className="text-center">Status</th>
                      <th scope="col" className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <>
                        {Array.from({ length: 5 }).map((_, index) => (
                          <tr key={`skeleton-${index}`}>
                            {Array.from({ length: 10 }).map((_, colIndex) => (
                              <td key={`skeleton-${index}-${colIndex}`}>
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
                    ) : lowStockItems.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="text-center py-5 text-muted">
                          <Icon icon="lucide:check-circle" width="48" height="48" className="mb-2 text-success" />
                          <div>No low stock items found. All items are well stocked!</div>
                        </td>
                      </tr>
                    ) : (
                      lowStockItems.map((item, index) => {
                        const netAvailable = item.net_available ?? (item.available_quantity - item.committed_quantity);
                        return (
                          <tr key={item.inventory_item_id}>
                            <td>
                              <span className="text-secondary-light">{index + 1}</span>
                            </td>
                            <td>
                              <span className="fw-medium">{item.product_name}</span>
                            </td>
                            <td>
                              <span className="text-secondary-light">
                                {item.variant_display_name}
                              </span>
                            </td>
                            <td>
                              <span className="text-secondary-light">{item.sku || "-"}</span>
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
                              <span
                                className={`fw-semibold ${
                                  netAvailable <= 0
                                    ? "text-danger"
                                    : netAvailable <= (item.minimum_stock_level || 0)
                                    ? "text-warning"
                                    : ""
                                }`}
                              >
                                {formatNumber(netAvailable)}
                              </span>
                            </td>
                            <td className="text-center">
                              <span className="text-secondary-light small">
                                {item.reorder_point !== null && item.reorder_point !== undefined
                                  ? formatNumber(item.reorder_point)
                                  : "-"}
                              </span>
                            </td>
                            <td className="text-center">
                              <StockStatusBadge item={item} />
                            </td>
                            <td className="text-end">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => handleViewDetails(item)}
                                title="View Details"
                              >
                                <Icon icon="lucide:eye" width="14" height="14" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {!loading && lowStockItems.length > 0 && (
                <div className="mt-3 text-muted small text-center">
                  Showing {lowStockItems.length} low stock item{lowStockItems.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detail Modal */}
        <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg" centered>
          <Modal.Header closeButton>
            <Modal.Title>Inventory Item Details</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedItem?.item && (
              <>
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <div className="text-muted small">Product</div>
                    <div className="fw-semibold">{selectedItem.item.product_name}</div>
                    <div className="small text-muted">HSN: {selectedItem.item.hsn_code || "-"}</div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Variant</div>
                    <div className="fw-semibold">{selectedItem.item.variant_display_name}</div>
                    <div className="small text-muted">SKU: {selectedItem.item.sku || "-"}</div>
                  </div>
                </div>
                <div className="row g-3 mb-3">
                  {[
                    { label: "Available", value: selectedItem.item.available_quantity },
                    { label: "Committed", value: selectedItem.item.committed_quantity },
                    { label: "Net Available", value: selectedItem.item.net_available ?? (selectedItem.item.available_quantity - selectedItem.item.committed_quantity) },
                  ].map((metric) => (
                    <div className="col-6 col-md-4" key={metric.label}>
                      <div className="text-muted small">{metric.label}</div>
                      <div className="fw-semibold">{formatNumber(metric.value)}</div>
                    </div>
                  ))}
                </div>

                {/* Thresholds Section */}
                {(selectedItem.item.reorder_point !== null || selectedItem.item.minimum_stock_level !== null) && (
                  <div className="mt-4 pt-3 border-top">
                    <h6 className="mb-3">
                      Inventory Thresholds
                      <span className="badge bg-info ms-2" style={{ fontSize: "0.7rem" }}>
                        Auto-calculated
                      </span>
                    </h6>
                    <div className="row g-3">
                      {[
                        { label: "Reorder Point", value: selectedItem.item.reorder_point },
                        { label: "Minimum Stock Level", value: selectedItem.item.minimum_stock_level },
                        { label: "Safety Stock", value: selectedItem.item.safety_stock },
                        { label: "Average Daily Sales", value: selectedItem.item.average_daily_sales, format: (v) => v !== null && v !== undefined ? v.toFixed(2) : "-" },
                        { label: "Lead Time (Days)", value: selectedItem.item.lead_time_days },
                      ].map((metric) => (
                        <div className="col-6 col-md-4" key={metric.label}>
                          <div className="text-muted small">{metric.label}</div>
                          <div className="fw-semibold">
                            {metric.format ? metric.format(metric.value) : formatNumber(metric.value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ledger Entries */}
                {selectedItem?.ledger?.data?.length > 0 && (
                  <div className="mt-4 pt-3 border-top">
                    <h6 className="mb-3">Recent Ledger Entries</h6>
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
                          {selectedItem.ledger.data.map((entry) => (
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
                  </div>
                )}
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </MasterLayout>
    </SidebarPermissionGuard>
  );
};

export default InventoryAlertsPage;

