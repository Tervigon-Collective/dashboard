"use client";
import React, { useState, useEffect, useMemo } from "react";
import { DateRangePicker, CustomProvider } from "rsuite";
import enUS from "rsuite/locales/en_US";
import "rsuite/dist/rsuite.min.css";

const API_BASE =
  "https://skuspendsales-aghtewckaqbdfqep.centralindia-01.azurewebsites.net/api/product_spend";
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function formatLocalISO(date) {
  if (!date) {
    return null;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function getDefaultDateRange() {
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);
  return [startOfDay, endOfDay];
}

const ProductSpendSummaryLayer = () => {
  const [dateRange, setDateRange] = useState(getDefaultDateRange());
  const [products, setProducts] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(PAGE_SIZE_OPTIONS[0]);

  const fetchSummary = async (range) => {
    setLoading(true);
    setError("");
    setProducts([]);
    setSummaryData(null);
    const start_datetime = formatLocalISO(range[0]);
    const end_datetime = formatLocalISO(range[1]);
    try {
      const url = `${API_BASE}?start_datetime=${encodeURIComponent(
        start_datetime
      )}&end_datetime=${encodeURIComponent(end_datetime)}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Failed to fetch data");
      }
      const data = await res.json();
      setProducts(data.products || []);
      setSummaryData(data.summary || null);
    } catch (err) {
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dateRange && dateRange[0] && dateRange[1]) {
      fetchSummary(dateRange);
      setCurrentPage(1); // Reset to first page on date change
    }
  }, [dateRange]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page on items per page change
  }, [itemsPerPage]);

  // Sort products by revenue descending (or quantity sold)
  const sortedProducts = useMemo(() => {
    if (!products) {
      return [];
    }
    return [...products].sort((a, b) => (b.revenue || 0) - (a.revenue || 0));
  }, [products]);

  // Pagination logic
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const pagedProducts = sortedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Pagination controls
  const goToPage = (page) => {
    if (page < 1 || page > totalPages) {
      return;
    }
    setCurrentPage(page);
  };
  const goToPrevious = () => goToPage(currentPage - 1);
  const goToNext = () => goToPage(currentPage + 1);
  const getPaginationNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }
    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...");
    } else {
      rangeWithDots.push(1);
    }
    rangeWithDots.push(...range);
    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }
    return rangeWithDots;
  };

  // Range text (e.g. Showing 1 to 10 of 37 entries)
  const startIdx =
    sortedProducts.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endIdx = Math.min(currentPage * itemsPerPage, sortedProducts.length);

  return (
    <CustomProvider locale={enUS}>
      <div className="card basic-data-table border-0 rounded-4 overflow-hidden">
        <div className="card-header d-flex align-items-center justify-content-between">
          <h5 className="card-title mb-0">Product Spend Dashboard</h5>
        </div>
        <hr className="my-0" />

        {/* Summary Cards */}
        {summaryData && (
          <div className="card-body pb-2 pt-3 px-3">
            <div className="row mb-3">
              <div className="col-md-3 col-sm-6 mb-2">
                <div
                  className="p-3 rounded"
                  style={{
                    backgroundColor: "#f0f9ff",
                    border: "1px solid #bae6fd",
                  }}
                >
                  <div className="text-muted" style={{ fontSize: 13 }}>
                    Total Products
                  </div>
                  <div
                    className="fw-bold"
                    style={{ fontSize: 20, color: "#0369a1" }}
                  >
                    {summaryData.total_products}
                  </div>
                </div>
              </div>
              <div className="col-md-3 col-sm-6 mb-2">
                <div
                  className="p-3 rounded"
                  style={{
                    backgroundColor: "#fef3c7",
                    border: "1px solid #fde68a",
                  }}
                >
                  <div className="text-muted" style={{ fontSize: 13 }}>
                    Total Ad Spend
                  </div>
                  <div
                    className="fw-bold"
                    style={{ fontSize: 20, color: "#d97706" }}
                  >
                    ₹
                    {Number(summaryData.total_ad_spend).toLocaleString(
                      undefined,
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
                  </div>
                </div>
              </div>
              <div className="col-md-3 col-sm-6 mb-2">
                <div
                  className="p-3 rounded"
                  style={{
                    backgroundColor: "#dcfce7",
                    border: "1px solid #bbf7d0",
                  }}
                >
                  <div className="text-muted" style={{ fontSize: 13 }}>
                    Total Revenue
                  </div>
                  <div
                    className="fw-bold"
                    style={{ fontSize: 20, color: "#16a34a" }}
                  >
                    ₹
                    {Number(summaryData.total_revenue).toLocaleString(
                      undefined,
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
                  </div>
                </div>
              </div>
              <div className="col-md-3 col-sm-6 mb-2">
                <div
                  className="p-3 rounded"
                  style={{
                    backgroundColor: "#fce7f3",
                    border: "1px solid #fbcfe8",
                  }}
                >
                  <div className="text-muted" style={{ fontSize: 13 }}>
                    Total Quantity Sold
                  </div>
                  <div
                    className="fw-bold"
                    style={{ fontSize: 20, color: "#be185d" }}
                  >
                    {summaryData.total_quantity}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="card-body pb-2 pt-3 px-3">
          <div className="row mb-3 align-items-center">
            <div
              className="col-md-6 d-flex align-items-center"
              style={{ gap: 12 }}
            >
              <label className="me-2 fw-semibold">Show</label>
              <select
                className="form-select form-select-sm"
                style={{ width: 80, borderRadius: 6 }}
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
              >
                {PAGE_SIZE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <label className="ms-2">entries</label>
            </div>
            <div
              className="col-md-6 d-flex justify-content-end align-items-center"
              style={{ gap: 12 }}
            >
              <label
                htmlFor="date-range-picker"
                className="form-label mb-0 fw-semibold"
              >
                Select Date & Hour Range:
              </label>
              <DateRangePicker
                id="date-range-picker"
                value={dateRange}
                onChange={setDateRange}
                format="yyyy-MM-dd HH:mm"
                showMeridian={false}
                ranges={[]}
                defaultCalendarValue={getDefaultDateRange()}
                disabledDate={(date) => {
                  const now = new Date();
                  now.setMinutes(0, 0, 0);
                  const d = new Date(date);
                  d.setMinutes(0, 0, 0);
                  return d > now;
                }}
                placeholder="Select date and hour range"
                style={{
                  width: 320,
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
              />
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-striped table-bordered align-middle">
              <thead className="table-light">
                <tr>
                  <th style={{ minWidth: 120 }}>SKU</th>
                  <th style={{ minWidth: 220 }}>Product Title</th>
                  <th style={{ minWidth: 120 }}>Ad Spend</th>
                  <th style={{ minWidth: 120 }}>Revenue</th>
                  <th style={{ minWidth: 100 }}>Quantity</th>
                  <th style={{ minWidth: 120 }}>COGS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4">
                      Loading...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="text-center text-danger py-4">
                      {error}
                    </td>
                  </tr>
                ) : pagedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4">
                      No data found for this range.
                    </td>
                  </tr>
                ) : (
                  pagedProducts.map((row, idx) => {
                    return (
                      <tr
                        key={row.sku + idx}
                        style={{ paddingTop: 12, paddingBottom: 12 }}
                      >
                        <td style={{ paddingTop: 12, paddingBottom: 12 }}>
                          {row.sku}
                        </td>
                        <td style={{ paddingTop: 12, paddingBottom: 12 }}>
                          {row.product_title}
                        </td>
                        <td style={{ paddingTop: 12, paddingBottom: 12 }}>
                          ₹
                          {Number(row.spend).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td style={{ paddingTop: 12, paddingBottom: 12 }}>
                          ₹
                          {Number(row.revenue).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td style={{ paddingTop: 12, paddingBottom: 12 }}>
                          {row.quantity}
                        </td>
                        <td style={{ paddingTop: 12, paddingBottom: 12 }}>
                          ₹
                          {Number(row.cogs).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="row align-items-center mt-2">
            <div className="col-md-6 text-muted" style={{ fontSize: 14 }}>
              Showing {startIdx} to {endIdx} of {sortedProducts.length} entries
            </div>
            <div className="col-md-6 d-flex justify-content-end align-items-center">
              {totalPages > 1 && (
                <ul
                  className="pagination pagination-sm mb-0"
                  style={{ gap: 2 }}
                >
                  <li
                    className={`page-item${
                      currentPage === 1 ? " disabled" : ""
                    }`}
                  >
                    <button
                      className="page-link"
                      onClick={goToPrevious}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                  </li>
                  {getPaginationNumbers().map((number, idx) => (
                    <li
                      key={idx}
                      className={`page-item${
                        number === currentPage ? " active" : ""
                      } ${number === "..." ? "disabled" : ""}`}
                    >
                      {number === "..." ? (
                        <span className="page-link">...</span>
                      ) : (
                        <button
                          className="page-link"
                          onClick={() => goToPage(number)}
                        >
                          {number}
                        </button>
                      )}
                    </li>
                  ))}
                  <li
                    className={`page-item${
                      currentPage === totalPages ? " disabled" : ""
                    }`}
                  >
                    <button
                      className="page-link"
                      onClick={goToNext}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </button>
                  </li>
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </CustomProvider>
  );
};

export default ProductSpendSummaryLayer;
