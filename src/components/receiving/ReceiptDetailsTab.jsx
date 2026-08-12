"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { DateRangePicker, CustomProvider } from "rsuite";
import enUS from "rsuite/locales/en_US";
import "rsuite/dist/rsuite.min.css";

const INITIAL_ITEMS_TO_SHOW = 50;
const ITEMS_PER_LOAD = 50;

function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return [start, end];
}

function getLastMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  end.setHours(23, 59, 59, 999);
  return [start, end];
}

function getLast30DaysRange() {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - 29);
  start.setHours(0, 0, 0, 0);
  return [start, end];
}

function getLastNMonthsRange(months) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return [start, end];
}

function parseRequestDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function isDateInRange(value, range) {
  if (!range?.[0] || !range?.[1]) return true;
  const date = parseRequestDate(value);
  if (!date) return false;
  const start = new Date(range[0]);
  start.setHours(0, 0, 0, 0);
  const end = new Date(range[1]);
  end.setHours(23, 59, 59, 999);
  return date >= start && date <= end;
}

const DATE_RANGES = [
  { label: "This month", value: getCurrentMonthRange },
  { label: "Last month", value: getLastMonthRange },
  { label: "Last 30 days", value: getLast30DaysRange },
  { label: "Last 3 months", value: () => getLastNMonthsRange(3) },
  { label: "Last 6 months", value: () => getLastNMonthsRange(6) },
];

/** Theme CSS breaks rsuite float clearfix; force month nav arrows visible. */
/** Theme CSS + sticky table headers fight the rsuite popup (default z-index: 7). */
const DATE_PICKER_FIX_CSS = `
.receipt-details-daterange-menu.rs-picker-popup,
.rs-picker-popup.receipt-details-daterange-menu {
  z-index: 2000 !important;
  background: #fff !important;
}
.receipt-details-daterange-menu .rs-calendar {
  overflow: visible !important;
  background: #fff !important;
}
.receipt-details-daterange-menu .rs-calendar-header {
  display: block !important;
  position: relative !important;
  z-index: 2 !important;
  min-height: 40px !important;
  margin-bottom: 4px;
  padding: 4px 0 8px !important;
  overflow: visible !important;
  background: #fff !important;
}
.receipt-details-daterange-menu .rs-calendar-header-month-toolbar {
  display: flex !important;
  align-items: center;
  justify-content: space-between;
  width: 100% !important;
  float: none !important;
  min-height: 36px;
  padding-left: 0 !important;
  padding-right: 0 !important;
  background: #fff !important;
}
.receipt-details-daterange-menu .rs-calendar-header-backward,
.receipt-details-daterange-menu .rs-calendar-header-forward {
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  visibility: visible !important;
  opacity: 1 !important;
  float: none !important;
  position: relative !important;
  z-index: 3 !important;
  width: 32px !important;
  height: 32px !important;
  min-width: 32px !important;
  padding: 0 !important;
  border: 1px solid #e5e7eb !important;
  border-radius: 6px !important;
  background: #fff !important;
  color: #111827 !important;
  cursor: pointer !important;
}
.receipt-details-daterange-menu .rs-calendar-header-backward svg,
.receipt-details-daterange-menu .rs-calendar-header-forward svg {
  display: block !important;
  width: 16px !important;
  height: 16px !important;
  fill: currentColor !important;
}
.receipt-details-daterange-menu .rs-calendar-header-title,
.receipt-details-daterange-menu .rs-calendar-header-title-date {
  display: inline-flex !important;
  visibility: visible !important;
  opacity: 1 !important;
  color: #111827 !important;
  font-weight: 600 !important;
  float: none !important;
  background: #fff !important;
}
`;

/**
 * Receipt Details tab — kept outside the page component so search input
 * does not remount (and lose focus) on every keystroke.
 */
export default function ReceiptDetailsTab({
  requests,
  isLoading,
  handleViewRequest,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState(null);
  const [displayedCount, setDisplayedCount] = useState(INITIAL_ITEMS_TO_SHOW);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  const filteredData = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return requests.filter((request) => {
      // Filter by when the PR was created (not order/delivery date)
      if (!isDateInRange(request.created_at, dateRange)) {
        return false;
      }

      if (!search) return true;

      const prNumber = (
        request.pr_number ||
        `PR-${String(request.request_id).padStart(3, "0")}`
      ).toLowerCase();
      if (prNumber.includes(search)) return true;

      const supplierName = `${request.company_name || ""} ${
        request.vendor_name || ""
      }`
        .trim()
        .toLowerCase();
      if (supplierName && supplierName.includes(search)) return true;

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
  }, [requests, searchTerm, dateRange]);

  // Reset visible window when filters or source data change
  useEffect(() => {
    setDisplayedCount(INITIAL_ITEMS_TO_SHOW);
  }, [searchTerm, dateRange, requests]);

  const displayedData = useMemo(
    () => filteredData.slice(0, displayedCount),
    [filteredData, displayedCount]
  );

  const loadMoreData = useCallback(async () => {
    if (isLoadingMore || isLoading) return;
    if (displayedCount >= filteredData.length) return;

    setIsLoadingMore(true);
    await new Promise((resolve) => setTimeout(resolve, 200));
    setDisplayedCount((prev) =>
      Math.min(prev + ITEMS_PER_LOAD, filteredData.length)
    );
    setIsLoadingMore(false);
  }, [isLoadingMore, isLoading, displayedCount, filteredData.length]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setDateRange(null);
    searchInputRef.current?.focus();
  };

  const hasActiveFilters = Boolean(searchTerm.trim() || dateRange);

  return (
    <div className="card basic-data-table">
      <style>{DATE_PICKER_FIX_CSS}</style>
      <div className="card-header d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-2">
        <div>
          <h5 className="card-title mb-0">Receipt Details</h5>
          <p className="text-muted small mb-0">
            Fulfilled purchase requests with QC totals
          </p>
        </div>
      </div>

      <div className="card-body">
        <div className="row g-3 mb-4 align-items-end">
          <div className="col-12 col-md-4">
            <label className="form-label small text-muted mb-1">Search</label>
            <div className="input-group">
              <span className="input-group-text bg-white">
                <Icon icon="lucide:search" width="16" height="16" />
              </span>
              <input
                ref={searchInputRef}
                type="text"
                className="form-control"
                placeholder="Search PR, company, or product..."
                value={searchTerm}
                onChange={handleSearchChange}
                autoComplete="off"
              />
              {searchTerm && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  title="Clear search"
                  onClick={() => {
                    setSearchTerm("");
                    searchInputRef.current?.focus();
                  }}
                >
                  <Icon icon="mdi:close" width="16" height="16" />
                </button>
              )}
            </div>
          </div>

          <div className="col-12 col-md-5">
            <label className="form-label small text-muted mb-1">
              Created date range
            </label>
            <CustomProvider locale={enUS}>
              <DateRangePicker
                value={dateRange}
                onChange={(value) => setDateRange(value)}
                format="yyyy-MM-dd"
                placeholder="All creation dates"
                cleanable
                editable
                ranges={DATE_RANGES.map(({ label, value }) => ({
                  label,
                  value: value(),
                }))}
                placement="bottomEnd"
                menuClassName="receipt-details-daterange-menu"
                menuStyle={{ zIndex: 2000 }}
                container={() =>
                  typeof document !== "undefined" ? document.body : undefined
                }
                style={{ width: "100%" }}
              />
            </CustomProvider>
          </div>

          {hasActiveFilters && (
            <div className="col-auto">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

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
                      zIndex: 1,
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
                          {hasActiveFilters
                            ? "No receipt details match your filters"
                            : "No receipt details found"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <>
                    {displayedData.map((request) => (
                      <tr key={request.request_id}>
                        <td className="small">
                          {request.pr_number ||
                            `PR-${String(request.request_id).padStart(3, "0")}`}
                        </td>
                        <td className="small">
                          {request.company_name || request.vendor_name || "-"}
                        </td>
                        <td className="small">
                          {request.order_date
                            ? new Date(request.order_date).toLocaleDateString()
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
                            type="button"
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
                {hasActiveFilters && requests.length !== filteredData.length && (
                  <span className="ms-1">
                    (filtered from {requests.length})
                  </span>
                )}
              </div>
              {displayedData.length < filteredData.length && (
                <div style={{ fontSize: "0.875rem", color: "#6c757d" }}>
                  {isLoadingMore ? "Loading..." : "Scroll down to load more"}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
