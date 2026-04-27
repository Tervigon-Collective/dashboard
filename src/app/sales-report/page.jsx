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

const SalesReportLayer = () => {
  const [activeTab, setActiveTab] = useState("sales");
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    return [today, today];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [salesRows, setSalesRows] = useState([]);
  const [creditNoteRows, setCreditNoteRows] = useState([]);

  const tabs = [
    {
      id: "sales",
      label: "SALES REPORT",
      icon: "mdi:file-chart-outline",
    },
    {
      id: "creditNote",
      label: "DEBIT NOTE / CREDIT NOTE",
      icon: "mdi:file-document-edit-outline",
    },
  ];

  const getActiveTabLabel = () => {
    const activeTabData = tabs.find((tab) => tab.id === activeTab);
    return activeTabData ? activeTabData.label : "";
  };

  const activeRows = activeTab === "sales" ? salesRows : creditNoteRows;
  const tableColumns = useMemo(() => {
    if (!activeRows || activeRows.length === 0) return [];
    return Object.keys(activeRows[0]);
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

  const fetchReport = async (tabId, rangeValue = dateRange) => {
    const { startDate, endDate } = getDateBoundsFromRange(rangeValue);

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

      const params = {
        startDate,
        endDate: endDateExclusive,
      };

      const response = await apiClient.get(endpoint, { params });
      const rows = response?.data?.data || [];

      if (tabId === "sales") {
        setSalesRows(rows);
      } else {
        setCreditNoteRows(rows);
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to fetch report data.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (value) => {
    setDateRange(value);
    if (value && value.length === 2 && value[0] && value[1]) {
      fetchReport(activeTab, value);
    }
  };

  const handleDatePickerOk = (selectedDates) => {
    if (!selectedDates || selectedDates.length !== 2) return;
    setDateRange(selectedDates);
    fetchReport(activeTab, selectedDates);
  };

  // Default behavior: auto-fetch today's data on page load for both tabs
  useEffect(() => {
    const today = new Date();
    const defaultRange = [today, today];
    setDateRange(defaultRange);
    fetchReport("sales", defaultRange);
    fetchReport("creditNote", defaultRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExportExcel = () => {
    if (!activeRows || activeRows.length === 0) {
      setError("No data available to export.");
      return;
    }

    const sheet = XLSX.utils.json_to_sheet(activeRows);
    const workbook = XLSX.utils.book_new();
    const sheetName = activeTab === "sales" ? "Sales Report" : "Debit Credit Note";
    XLSX.utils.book_append_sheet(workbook, sheet, sheetName);

    const { startDate, endDate } = getDateBoundsFromRange(dateRange);
    const filePrefix = activeTab === "sales" ? "Shopify_Sales_Report" : "Shopify_Debit_Credit_Note";
    XLSX.writeFile(workbook, `${filePrefix}_${startDate}_to_${endDate}.xlsx`);
  };

  return (
    <CustomProvider locale={enUS}>
      <div className="card h-100 radius-8 border">
        <div className="card-body p-24">
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div className="d-flex align-items-center">
            <h5 className="mb-0 fw-semibold">Sales Report - {getActiveTabLabel()}</h5>
          </div>
          <div className="d-flex align-items-center" style={{ gap: 12 }}>
            <DateRangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              format="yyyy-MM-dd"
              showMeridian={false}
              ranges={[]}
              placeholder="Select date range"
              style={{
                width: 300,
                borderRadius: 8,
                border: "1px solid #ccc",
                fontSize: 16,
              }}
              appearance="subtle"
              cleanable
              menuStyle={{
                boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                borderRadius: 8,
                padding: 8,
              }}
              placement="bottomEnd"
              oneTap={false}
              showOneCalendar={false}
              onOk={handleDatePickerOk}
            />
            <button
              type="button"
              className="btn btn-success btn-icon"
              onClick={handleExportExcel}
              disabled={loading || activeRows.length === 0}
              title="Export to Excel"
              style={{
                width: 40,
                height: 40,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
              }}
            >
              <Icon
                icon="vscode-icons:file-type-excel"
                width="24"
                height="24"
              />
            </button>
          </div>
        </div>

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
                onClick={() => {
                  setActiveTab(tab.id);
                  const tabRows = tab.id === "sales" ? salesRows : creditNoteRows;
                  if (!tabRows || tabRows.length === 0) {
                    fetchReport(tab.id, dateRange);
                  }
                }}
                style={{ cursor: "pointer", whiteSpace: "nowrap" }}
              >
                <Icon icon={tab.icon} className="icon" style={{ flexShrink: 0 }} />
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

        <div className="tab-content">
          {error && (
            <div className="alert alert-danger py-2 mb-3" role="alert">
              {error}
            </div>
          )}

          {!loading && activeRows.length === 0 ? (
            <div className="p-16 border rounded-3 bg-light">
              <h6 className="mb-2">
                {activeTab === "sales" ? "Sales Report" : "Debit Note / Credit Note"}
              </h6>
              <p className="mb-0 text-secondary-light">Select a date range to load data.</p>
            </div>
          ) : (
            <div className="table-responsive border rounded-3">
              <table className="table table-sm align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    {tableColumns.map((col) => (
                      <th key={col} className="text-nowrap">
                        {beautifyHeader(col)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeRows.map((row, idx) => (
                    <tr key={`${activeTab}-row-${idx}`}>
                      {tableColumns.map((col) => (
                        <td key={`${idx}-${col}`} className="text-nowrap">
                          {row[col] == null ? "-" : String(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
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
