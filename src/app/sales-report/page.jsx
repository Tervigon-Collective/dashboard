"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import MasterLayout from "../../masterLayout/MasterLayout";
import SidebarPermissionGuard from "../../components/SidebarPermissionGuard";
import { apiClient } from "../../api/api";
import * as XLSX from "xlsx";
import { DateRangePicker, CustomProvider } from "rsuite";
import enUS from "rsuite/locales/en_US";
import "rsuite/dist/rsuite.min.css";

const getToday = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const toApiEndDateExclusive = (endDateInclusive) => {
  const date = new Date(endDateInclusive);
  date.setDate(date.getDate() + 1);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const beautifyHeader = (key) =>
  key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());

const HIDDEN_TABLE_COLUMNS = new Set(["brand_id"]);

const NUMERIC_COLUMN_HINTS = [
  "quantity",
  "taxable_value",
  "cgst_amount",
  "sgst_amount",
  "igst_amount",
  "total_gst",
  "gross_line",
  "rate",
  "discount",
  "price",
  "amount",
  "total",
  "subtotal",
  "tax",
];

const isNumericColumn = (key) => {
  const normalizedKey = String(key || "").toLowerCase();
  return NUMERIC_COLUMN_HINTS.some((hint) => normalizedKey.includes(hint));
};

const coerceExportValue = (key, value) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  if (!isNumericColumn(key)) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const normalized = String(value).replace(/,/g, "").trim();
  if (normalized === "") {
    return "";
  }
  const numericValue = Number(normalized);
  return Number.isFinite(numericValue) ? numericValue : value;
};

const formatCellDisplay = (col, value) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  const str = String(value);
  if (col === "order_id" && str.includes("gid://shopify/Order/")) {
    return str.split("/").pop() || str;
  }
  if ((col === "order_date" || col === "credit_note_date" || col === "original_order_date") && str.includes("T")) {
    return str.slice(0, 10);
  }
  if (str.length > 48 && (col === "product_title" || col === "payment_method")) {
    return `${str.slice(0, 45)}…`;
  }
  return str;
};

const getIsMobile = () =>
  typeof window !== "undefined" ? window.innerWidth < 768 : false;

const SalesReportLayer = () => {
  const [activeTab, setActiveTab] = useState("sales");
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    return [today, today];
  });
  const [brands, setBrands] = useState([]);
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [salesRows, setSalesRows] = useState([]);
  const [creditNoteRows, setCreditNoteRows] = useState([]);
  const [isMobile, setIsMobile] = useState(getIsMobile);

  const tabs = [
    { id: "sales", label: "Sales Report", icon: "mdi:file-chart-outline" },
    { id: "creditNote", label: "Debit / Credit Note", icon: "mdi:file-document-edit-outline" },
  ];

  const activeRows = activeTab === "sales" ? salesRows : creditNoteRows;
  const tableColumns = useMemo(() => {
    if (!activeRows || activeRows.length === 0) return [];
    return Object.keys(activeRows[0]).filter((col) => !HIDDEN_TABLE_COLUMNS.has(col));
  }, [activeRows]);

  const formatDate = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const getDateBoundsFromRange = (rangeValue) => {
    if (
      !rangeValue ||
      rangeValue.length !== 2 ||
      !rangeValue[0] ||
      !rangeValue[1]
    ) {
      const today = getToday();
      return { startDate: today, endDate: today };
    }
    return {
      startDate: formatDate(rangeValue[0]),
      endDate: formatDate(rangeValue[1]),
    };
  };

  const fetchReport = async (tabId, rangeValue = dateRange, brandId = selectedBrandId) => {
    const { startDate, endDate } = getDateBoundsFromRange(rangeValue);

    if (!brandId) {
      setError("Please select a brand.");
      return;
    }
    if (!startDate || !endDate) {
      setError("Please select both start and end date.");
      return;
    }
    if (startDate > endDate) {
      setError("Start date must be less than or equal to end date.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const endDateExclusive = toApiEndDateExclusive(endDate);
      const endpoint =
        tabId === "sales"
          ? "/api/shopify-sales-report"
          : "/api/shopify-credit-note-report";

      const response = await apiClient.get(endpoint, {
        params: { startDate, endDate: endDateExclusive, brandId },
      });
      const rows = response?.data?.data || [];

      if (tabId === "sales") {
        setSalesRows(rows);
      } else {
        setCreditNoteRows(rows);
      }
    } catch (err) {
      const brandErrors = err?.response?.data?.brandErrors;
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to fetch report data.";
      if (Array.isArray(brandErrors) && brandErrors.length > 0) {
        setError(brandErrors.map((e) => `${e.brand_name}: ${e.message}`).join(" "));
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (value) => {
    setDateRange(value);
    if (value && value.length === 2 && value[0] && value[1] && selectedBrandId) {
      fetchReport(activeTab, value, selectedBrandId);
    }
  };

  const handleDatePickerOk = (selectedDates) => {
    if (!selectedDates || selectedDates.length !== 2) return;
    setDateRange(selectedDates);
    if (selectedBrandId) {
      fetchReport(activeTab, selectedDates, selectedBrandId);
    }
  };

  const handleBrandChange = (event) => {
    const brandId = event.target.value;
    setSelectedBrandId(brandId);
    setSalesRows([]);
    setCreditNoteRows([]);
    if (brandId && dateRange?.length === 2 && dateRange[0] && dateRange[1]) {
      fetchReport(activeTab, dateRange, brandId);
    }
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setBrandsLoading(true);
      try {
        const response = await apiClient.get("/api/masters/brand", {
          params: { activeOnly: true },
        });
        const list = response?.data?.data || [];
        if (cancelled) return;

        setBrands(list);
        if (list.length > 0) {
          const firstBrandId = String(list[0].brand_id);
          setSelectedBrandId(firstBrandId);
          const today = new Date();
          const defaultRange = [today, today];
          setDateRange(defaultRange);
          fetchReport("sales", defaultRange, firstBrandId);
          fetchReport("creditNote", defaultRange, firstBrandId);
        } else {
          setError("No active brands found. Add brands in brand_master.");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.message ||
              err?.message ||
              "Failed to load brands."
          );
        }
      } finally {
        if (!cancelled) setBrandsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(getIsMobile());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleExportExcel = () => {
    if (!activeRows || activeRows.length === 0) {
      setError("No data available to export.");
      return;
    }

    const coercedRows = activeRows.map((row) => {
      const nextRow = {};
      for (const key of Object.keys(row)) {
        nextRow[key] = coerceExportValue(key, row[key]);
      }
      return nextRow;
    });

    const sheet = XLSX.utils.json_to_sheet(coercedRows);
    const workbook = XLSX.utils.book_new();
    const sheetName = activeTab === "sales" ? "Sales Report" : "Debit Credit Note";
    XLSX.utils.book_append_sheet(workbook, sheet, sheetName);

    const { startDate, endDate } = getDateBoundsFromRange(dateRange);
    const filePrefix =
      activeTab === "sales" ? "Shopify_Sales_Report" : "Shopify_Debit_Credit_Note";
    XLSX.writeFile(workbook, `${filePrefix}_${startDate}_to_${endDate}.xlsx`);
  };

  const selectedBrandName =
    brands.find((b) => String(b.brand_id) === String(selectedBrandId))?.brand_name || "";

  return (
    <CustomProvider locale={enUS}>
      <div className="container-fluid px-3 px-md-4 py-3">
        <div
          className="card basic-data-table border-0 rounded-4"
          style={{ overflow: "visible" }}
        >
          <div className="card-body p-3 p-md-4">
            {/* Header */}
            <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center gap-3 mb-3 mb-md-4">
              <div>
                <h6
                  className="mb-1"
                  style={{
                    fontSize: isMobile ? "1rem" : "1.125rem",
                    fontWeight: 600,
                    color: "#111827",
                  }}
                >
                  Sales Report
                </h6>
                <p className="mb-0 text-secondary-light" style={{ fontSize: "13px" }}>
                  Shopify sales &amp; debit/credit notes by brand
                  {selectedBrandName ? ` · ${selectedBrandName}` : ""}
                </p>
              </div>
              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-success btn-sm d-inline-flex align-items-center justify-content-center"
                  onClick={handleExportExcel}
                  disabled={loading || activeRows.length === 0}
                  title="Export to Excel"
                  style={{
                    width: 36,
                    height: 36,
                    padding: 0,
                    borderRadius: 8,
                  }}
                >
                  <Icon icon="vscode-icons:file-type-excel" width="20" height="20" />
                </button>
              </div>
            </div>

            {/* Filters — same grid pattern as Procurement */}
            <div className="row g-2 g-md-3 mb-3 mb-md-4">
              <div className="col-12 col-sm-6 col-lg-3">
                <label className="form-label mb-1" style={{ fontSize: "13px" }}>
                  Brand
                </label>
                <select
                  className="form-select form-select-sm"
                  value={selectedBrandId}
                  onChange={handleBrandChange}
                  disabled={brandsLoading || brands.length === 0}
                >
                  {brandsLoading ? (
                    <option value="">Loading…</option>
                  ) : brands.length === 0 ? (
                    <option value="">No brands</option>
                  ) : (
                    brands.map((brand) => (
                      <option key={brand.brand_id} value={String(brand.brand_id)}>
                        {brand.brand_name}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div className="col-12 col-sm-6 col-lg-4">
                <label className="form-label mb-1" style={{ fontSize: "13px" }}>
                  Date range
                </label>
                <DateRangePicker
                  value={dateRange}
                  onChange={handleDateRangeChange}
                  format="yyyy-MM-dd"
                  showMeridian={false}
                  ranges={[]}
                  placeholder="Select date range"
                  style={{
                    width: "100%",
                    maxWidth: isMobile ? "100%" : 280,
                    borderRadius: 8,
                    border: "1px solid #dee2e6",
                    fontSize: "14px",
                  }}
                  appearance="subtle"
                  cleanable
                  menuStyle={{
                    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                    borderRadius: 8,
                    padding: 8,
                    zIndex: 2000,
                  }}
                  placement={isMobile ? "bottomStart" : "bottomEnd"}
                  oneTap={false}
                  showOneCalendar={isMobile}
                  onOk={handleDatePickerOk}
                  disabled={!selectedBrandId || brandsLoading}
                  block
                />
              </div>
            </div>

            {/* Tabs — Product Spend style */}
            <div
              className="mb-3 border-bottom pb-0"
              style={{ overflowX: "auto", overflowY: "hidden" }}
            >
              <div
                className="d-flex gap-2 gap-md-3"
                style={{ minWidth: "max-content", flexWrap: "nowrap" }}
              >
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`btn btn-link text-decoration-none d-flex align-items-center gap-2 px-2 px-md-3 py-2 position-relative border-0 ${
                      activeTab === tab.id ? "text-primary" : "text-muted"
                    }`}
                    onClick={() => {
                      setActiveTab(tab.id);
                      const tabRows = tab.id === "sales" ? salesRows : creditNoteRows;
                      if ((!tabRows || tabRows.length === 0) && selectedBrandId) {
                        fetchReport(tab.id, dateRange, selectedBrandId);
                      }
                    }}
                    style={{ whiteSpace: "nowrap", fontSize: "13px" }}
                  >
                    <Icon icon={tab.icon} width={18} height={18} />
                    <span className="fw-medium">{tab.label}</span>
                    {activeTab === tab.id && (
                      <span
                        className="position-absolute bottom-0 start-0 end-0"
                        style={{ height: 2, backgroundColor: "#0d6efd" }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="alert alert-danger py-2 px-3 mb-3" style={{ fontSize: "13px" }}>
                {error}
              </div>
            )}

            {/* Table */}
            {!loading && activeRows.length === 0 ? (
              <div className="p-3 p-md-4 border rounded-3 bg-light text-center">
                <Icon
                  icon="mdi:table-off"
                  width={32}
                  height={32}
                  className="text-muted mb-2"
                />
                <p className="mb-0 text-secondary-light" style={{ fontSize: "14px" }}>
                  Select brand and date range to load report data.
                </p>
              </div>
            ) : (
              <div
                className="table-scroll-container border rounded-3"
                style={{
                  maxHeight: isMobile ? "55vh" : "600px",
                  overflowY: "auto",
                  overflowX: "auto",
                }}
              >
                {loading && (
                  <div
                    className="d-flex align-items-center justify-content-center gap-2 py-5"
                    style={{ minHeight: 120 }}
                  >
                    <span
                      className="spinner-border spinner-border-sm text-primary"
                      role="status"
                    />
                    <span style={{ fontSize: "14px" }}>Loading report…</span>
                  </div>
                )}
                {!loading && (
                  <div className="table-responsive">
                    <table
                      className="table table-hover table-sm align-middle mb-0"
                      style={{ fontSize: "13px" }}
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
                          {tableColumns.map((col) => (
                            <th
                              key={col}
                              className="text-nowrap"
                              style={{
                                fontWeight: 600,
                                color: "#374151",
                                padding: "10px 12px",
                                fontSize: "12px",
                              }}
                            >
                              {beautifyHeader(col)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {activeRows.map((row, idx) => (
                          <tr key={`${activeTab}-row-${idx}`}>
                            {tableColumns.map((col) => (
                              <td
                                key={`${idx}-${col}`}
                                className="text-nowrap"
                                style={{
                                  padding: "8px 12px",
                                  maxWidth: col === "product_title" ? 220 : 160,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                                title={row[col] != null ? String(row[col]) : ""}
                              >
                                {formatCellDisplay(col, row[col])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </CustomProvider>
  );
};

const SalesReportPage = () => {
  return (
    <SidebarPermissionGuard requiredSidebar="salesReport">
      <MasterLayout>
        <SalesReportLayer />
      </MasterLayout>
    </SidebarPermissionGuard>
  );
};

export default SalesReportPage;
