"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";

import MasterLayout from "@/masterLayout/MasterLayout";
import SidebarPermissionGuard from "@/components/SidebarPermissionGuard";
import inventoryManagementApi from "@/services/inventoryManagementApi";

const formatNumber = (value) => {
  if (value === null || value === undefined) return "-";
  return Number(value).toLocaleString();
};

const formatCurrency = (value) => {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
};

const InventoryReportsPage = () => {
  const [activeReport, setActiveReport] = useState("valuation");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState({ data: null, summary: null });
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [includeZeroStock, setIncludeZeroStock] = useState(false);
  const [daysThreshold, setDaysThreshold] = useState(90);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setReportData({ data: null, summary: null });
    
    try {
      let response;
      
      switch (activeReport) {
        case "valuation":
          response = await inventoryManagementApi.getValuationReport(includeZeroStock);
          break;
        case "movement":
          response = await inventoryManagementApi.getMovementReport(
            dateRange.startDate,
            dateRange.endDate
          );
          break;
        case "lowStock":
          response = await inventoryManagementApi.getLowStockReport();
          break;
        case "aging":
          response = await inventoryManagementApi.getAgingReport(daysThreshold);
          break;
        case "abc":
          response = await inventoryManagementApi.getABCAnalysis();
          break;
        case "turnover":
          response = await inventoryManagementApi.getTurnoverReport(
            dateRange.startDate,
            dateRange.endDate
          );
          break;
        default:
          return;
      }
      
      // Handle different response structures
      let data = null;
      let summary = null;
      
      if (Array.isArray(response)) {
        // Direct array response
        data = response;
      } else if (response && typeof response === 'object') {
        // Object response - check structure
        if (response.data !== undefined) {
          // Response has data property
          if (Array.isArray(response.data)) {
            data = response.data;
          } else if (response.data && typeof response.data === 'object') {
            // data is an object - could be summary or single item
            const summaryKeys = ['totalValue', 'totalItems', 'totalUnits', 'averageValuePerItem'];
            const isSummary = summaryKeys.some(key => key in response.data);
            if (isSummary) {
              summary = response.data;
            } else {
              data = [response.data];
            }
          }
        }
        
        // Check for summary property (separate from data)
        if (response.summary && typeof response.summary === 'object') {
          summary = response.summary;
        }
        
        // If no data or summary found yet, check if root object is a summary
        if (!data && !summary) {
          const summaryKeys = ['totalValue', 'totalItems', 'totalUnits', 'averageValuePerItem'];
          const isSummary = summaryKeys.some(key => key in response);
          if (isSummary) {
            summary = response;
          } else {
            // Try to convert object to array
            data = [response];
          }
        }
      }
      
      setReportData({ 
        data: data || null, 
        summary: summary || null 
      });
    } catch (error) {
      console.error(`Failed to load ${activeReport} report`, error);
      toast.error(error.message || `Failed to load ${activeReport} report`);
      setReportData({ data: null, summary: null });
    } finally {
      setLoading(false);
    }
  }, [activeReport, dateRange.startDate, dateRange.endDate, includeZeroStock, daysThreshold]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const reports = [
    {
      id: "valuation",
      label: "Valuation Report",
      icon: "lucide:dollar-sign",
      description: "Total inventory value and cost analysis",
    },
    {
      id: "movement",
      label: "Movement Report",
      icon: "lucide:arrow-up-down",
      description: "Stock movements over time period",
    },
    {
      id: "lowStock",
      label: "Low Stock Report",
      icon: "lucide:alert-triangle",
      description: "Items below reorder thresholds",
    },
    {
      id: "aging",
      label: "Aging Report",
      icon: "lucide:clock",
      description: "Slow-moving inventory analysis",
    },
    {
      id: "abc",
      label: "ABC Analysis",
      icon: "lucide:bar-chart-3",
      description: "Items categorized by value/importance",
    },
    {
      id: "turnover",
      label: "Turnover Report",
      icon: "lucide:refresh-cw",
      description: "Inventory turnover rates",
    },
  ];

  const renderReportTable = () => {
    if (loading) {
      return (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <div className="mt-2 text-muted">Loading report data...</div>
        </div>
      );
    }

    if (!reportData || (!reportData.data && !reportData.summary)) {
      return (
        <div className="text-center py-5 text-muted">
          <Icon icon="lucide:file-x" width="48" height="48" className="mb-2" />
          <div>No data available for this report</div>
        </div>
      );
    }

    // Render summary if available
    if (reportData.summary) {
      const summary = reportData.summary;
      const summaryItems = [
        { label: "Total Value", value: summary.totalValue, format: formatCurrency },
        { label: "Total Items", value: summary.totalItems, format: formatNumber },
        { label: "Total Units", value: summary.totalUnits, format: formatNumber },
        { label: "Average Value per Item", value: summary.averageValuePerItem, format: formatCurrency },
      ].filter(item => item.value !== null && item.value !== undefined);

      return (
        <div>
          <div className="row g-3 mb-4">
            {summaryItems.map((item, index) => (
              <div className="col-md-3" key={index}>
                <div className="card border">
                  <div className="card-body text-center">
                    <div className="text-muted small mb-2">{item.label}</div>
                    <div className="h4 mb-0 fw-bold">
                      {item.format ? item.format(item.value) : item.value}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {reportData.data && reportData.data.length > 0 && (
            <div className="mt-4">
              <h6 className="mb-3">Detailed Breakdown</h6>
            </div>
          )}
        </div>
      );
    }

    // Render table if data array is available
    if (!reportData.data || reportData.data.length === 0) {
      return (
        <div className="text-center py-5 text-muted">
          <Icon icon="lucide:file-x" width="48" height="48" className="mb-2" />
          <div>No detailed data available for this report</div>
        </div>
      );
    }

    // Get column headers from first item
    const firstItem = reportData.data[0];
    const columns = Object.keys(firstItem || {});

    return (
      <div className="table-responsive">
        <table className="table table-hover table-bordered">
          <thead className="table-light">
            <tr>
              <th scope="col" style={{ width: "60px" }}>#</th>
              {columns.map((col) => (
                <th key={col} scope="col" className="text-capitalize">
                  {col.replace(/_/g, " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reportData.data.map((row, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                {columns.map((col) => {
                  const value = row[col];
                  let displayValue = value;
                  
                  // Format based on column name
                  if (typeof value === "number") {
                    if (col.includes("price") || col.includes("cost") || col.includes("value") || col.includes("amount")) {
                      displayValue = formatCurrency(value);
                    } else if (col.includes("rate") || col.includes("percentage") || col.includes("percent")) {
                      displayValue = `${value.toFixed(2)}%`;
                    } else if (col.includes("quantity") || col.includes("qty") || col.includes("count")) {
                      displayValue = formatNumber(value);
                    } else {
                      displayValue = formatNumber(value);
                    }
                  } else if (value instanceof Date || (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value))) {
                    displayValue = new Date(value).toLocaleDateString();
                  } else if (value === null || value === undefined) {
                    displayValue = "-";
                  }
                  
                  return (
                    <td key={col} className={typeof value === "number" && col.includes("value") ? "text-end" : ""}>
                      {displayValue}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
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
                  <h5 className="mb-0 fw-semibold">Inventory Reports</h5>
                  <p className="text-muted small mb-0 mt-1">
                    Comprehensive inventory analysis and insights
                  </p>
                </div>
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={loadReport}
                  disabled={loading}
                >
                  <Icon icon="lucide:refresh-cw" width="16" height="16" className="me-1" />
                  Refresh
                </button>
              </div>

              {/* Report Type Tabs */}
              <div className="mb-4 border-bottom pb-0" style={{ overflowX: "auto" }}>
                <div className="d-flex gap-2 gap-md-3" style={{ minWidth: "max-content" }}>
                  {reports.map((report) => (
                    <div
                      key={report.id}
                      className={`d-flex flex-column align-items-center gap-1 px-3 py-2 cursor-pointer position-relative ${
                        activeReport === report.id ? "text-primary" : "text-muted"
                      }`}
                      onClick={() => setActiveReport(report.id)}
                      style={{ cursor: "pointer", whiteSpace: "nowrap", minWidth: "120px" }}
                    >
                      <Icon icon={report.icon} width="24" height="24" />
                      <span className="fw-medium small text-center">{report.label}</span>
                      {activeReport === report.id && (
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

              {/* Report Filters */}
              <div className="mb-4">
                <div className="row g-3">
                  {(activeReport === "movement" || activeReport === "turnover") && (
                    <>
                      <div className="col-md-4">
                        <label className="form-label small">Start Date</label>
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={dateRange.startDate}
                          onChange={(e) =>
                            setDateRange((prev) => ({ ...prev, startDate: e.target.value }))
                          }
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small">End Date</label>
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={dateRange.endDate}
                          onChange={(e) =>
                            setDateRange((prev) => ({ ...prev, endDate: e.target.value }))
                          }
                        />
                      </div>
                    </>
                  )}
                  
                  {activeReport === "valuation" && (
                    <div className="col-md-4">
                      <div className="form-check mt-4">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="includeZeroStock"
                          checked={includeZeroStock}
                          onChange={(e) => setIncludeZeroStock(e.target.checked)}
                        />
                        <label className="form-check-label small" htmlFor="includeZeroStock">
                          Include Zero Stock Items
                        </label>
                      </div>
                    </div>
                  )}
                  
                  {activeReport === "aging" && (
                    <div className="col-md-4">
                      <label className="form-label small">Days Threshold</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={daysThreshold}
                        onChange={(e) => setDaysThreshold(Number(e.target.value))}
                        min="1"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Report Description */}
              <div className="alert alert-info mb-4">
                <Icon icon="lucide:info" width="16" height="16" className="me-2" />
                <span className="small">
                  {reports.find((r) => r.id === activeReport)?.description}
                </span>
              </div>

              {/* Report Table */}
              {renderReportTable()}

              {/* Report Summary */}
              {reportData?.data && reportData.data.length > 0 && (
                <div className="mt-3 text-muted small">
                  Showing {reportData.data.length} record{reportData.data.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          </div>
        </div>
      </MasterLayout>
    </SidebarPermissionGuard>
  );
};

export default InventoryReportsPage;

