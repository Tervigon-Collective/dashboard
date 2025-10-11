"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Icon } from "@iconify/react";
import ExcelJS from "exceljs";
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

// Excel Download Function
const downloadProductSpendExcel = async (
  products,
  summaryData,
  startDate,
  endDate
) => {
  if (!products || products.length === 0) {
    alert("No data available to download");
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Product Spend Summary");

  // Define headers
  const headers = [
    "SKU",
    "Product Title",
    "Ad Spend",
    "Revenue",
    "Quantity",
    "COGS",
  ];

  // Add headers row
  worksheet.addRow(headers);

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 12 };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE6E6FA" }, // Light purple
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  // Add data rows
  products.forEach((row) => {
    const rowData = [
      row.sku || "",
      row.product_title || "",
      `₹${Number(row.spend || 0).toFixed(2)}`,
      `₹${Number(row.revenue || 0).toFixed(2)}`,
      row.quantity || 0,
      `₹${Number(row.cogs || 0).toFixed(2)}`,
    ];
    worksheet.addRow(rowData);
  });

  // Add total row if summary data exists
  if (summaryData) {
    worksheet.addRow([]); // Empty row for spacing

    const totalRow = [
      "TOTAL",
      `${summaryData.total_products} Products`,
      `₹${Number(summaryData.total_ad_spend || 0).toFixed(2)}`,
      `₹${Number(summaryData.total_revenue || 0).toFixed(2)}`,
      summaryData.total_quantity || 0,
      `₹${Number(summaryData.total_cogs || 0).toFixed(2)}`,
    ];

    const totalRowIndex = worksheet.addRow(totalRow);

    // Style total row
    totalRowIndex.font = { bold: true, size: 12 };
    totalRowIndex.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF0F8FF" }, // Light blue
    };
    totalRowIndex.alignment = { vertical: "middle", horizontal: "center" };
  }

  // Auto-fit columns
  worksheet.columns.forEach((column, index) => {
    if (index === 1) {
      // Product Title column - wider
      column.width = 40;
    } else if (index === 0) {
      // SKU column
      column.width = 20;
    } else {
      column.width = 18;
    }
  });

  // Generate and download file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Product_Spend_Summary_${startDate}_to_${endDate}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
};

const ProductSpendSummaryLayer = () => {
  const [dateRange, setDateRange] = useState(getDefaultDateRange());
  const [products, setProducts] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(PAGE_SIZE_OPTIONS[0]);
  const [searchSku, setSearchSku] = useState("");

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

  useEffect(() => {
    setCurrentPage(1); // Reset to first page on search change
  }, [searchSku]);

  // Sort products by revenue descending and filter by SKU search
  const sortedProducts = useMemo(() => {
    if (!products) {
      return [];
    }

    // Filter by SKU search term
    let filteredProducts = products;
    if (searchSku.trim()) {
      filteredProducts = products.filter((product) =>
        product.sku?.toLowerCase().includes(searchSku.toLowerCase().trim())
      );
    }

    // Sort by revenue descending
    return [...filteredProducts].sort(
      (a, b) => (b.revenue || 0) - (a.revenue || 0)
    );
  }, [products, searchSku]);

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

  // Handle Excel Download
  const handleDownload = async () => {
    if (!sortedProducts || sortedProducts.length === 0) {
      alert("No data available to download");
      return;
    }

    const startDate = formatLocalISO(dateRange[0]).split(" ")[0]; // Get just the date part
    const endDate = formatLocalISO(dateRange[1]).split(" ")[0];

    await downloadProductSpendExcel(
      sortedProducts,
      summaryData,
      startDate,
      endDate
    );
  };

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
              className="col-md-6 d-flex align-items-center flex-wrap"
              style={{ gap: 12 }}
            >
              <div className="d-flex align-items-center" style={{ gap: 12 }}>
                <label className="fw-semibold mb-0">Show</label>
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
                <label className="mb-0">entries</label>
              </div>
              <div className="d-flex align-items-center" style={{ gap: 8 }}>
                <Icon
                  icon="material-symbols:search"
                  width="20"
                  height="20"
                  style={{ color: "#6c757d" }}
                />
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Search by SKU..."
                  value={searchSku}
                  onChange={(e) => setSearchSku(e.target.value)}
                  style={{
                    width: 180,
                    borderRadius: 6,
                    fontSize: 14,
                  }}
                />
                {searchSku && (
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setSearchSku("")}
                    title="Clear search"
                    style={{
                      padding: "2px 8px",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  >
                    <Icon icon="mdi:close" width="16" height="16" />
                  </button>
                )}
              </div>
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
              <button
                className="btn btn-success btn-icon"
                onClick={handleDownload}
                disabled={
                  loading || !sortedProducts || sortedProducts.length === 0
                }
                title="Download Excel Report"
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
                      {searchSku
                        ? `No products found matching SKU: "${searchSku}"`
                        : "No data found for this range."}
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
              {searchSku && (
                <span className="ms-2 text-primary" style={{ fontSize: 13 }}>
                  (filtered by SKU: "{searchSku}")
                </span>
              )}
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
