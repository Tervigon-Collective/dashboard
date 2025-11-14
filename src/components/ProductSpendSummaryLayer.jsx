"use client";
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Icon } from "@iconify/react";
import ExcelJS from "exceljs";
import { DateRangePicker, CustomProvider } from "rsuite";
import enUS from "rsuite/locales/en_US";
import "rsuite/dist/rsuite.min.css";

const API_BASE =
  "https://skuspendsales-aghtewckaqbdfqep.centralindia-01.azurewebsites.net/api/product_spend";

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

const getIsMobile = () =>
  typeof window !== "undefined" ? window.innerWidth < 768 : false;

const ProductSpendSummaryLayer = () => {
  const [dateRange, setDateRange] = useState(getDefaultDateRange());
  const [products, setProducts] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchSku, setSearchSku] = useState("");
  const [isMobile, setIsMobile] = useState(getIsMobile());
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState({
    key: "revenue",
    direction: "desc",
  });
  
  // Infinite scroll state
  const [displayedItemsCount, setDisplayedItemsCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const tableContainerRef = useRef(null);
  const itemsPerPage = 20;

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
      setDisplayedItemsCount(20); // Reset displayed items on date change
    }
  }, [dateRange]);

  useEffect(() => {
    setDisplayedItemsCount(20); // Reset displayed items on search change
  }, [searchSku]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(getIsMobile());
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Handle sorting
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Sort products and filter by SKU search
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

    // Apply sorting
    if (sortConfig.key) {
      return [...filteredProducts].sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle numeric fields
        if (
          sortConfig.key === "spend" ||
          sortConfig.key === "revenue" ||
          sortConfig.key === "quantity" ||
          sortConfig.key === "cogs"
        ) {
          aValue = Number(aValue || 0);
          bValue = Number(bValue || 0);
          return sortConfig.direction === "asc"
            ? aValue - bValue
            : bValue - aValue;
        }

        // Handle string fields (sku, product_title)
        aValue = (aValue || "").toString().toLowerCase();
        bValue = (bValue || "").toString().toLowerCase();
        
        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return filteredProducts;
  }, [products, searchSku, sortConfig]);

  // Get displayed data for infinite scroll
  const getDisplayedData = (dataArray) => {
    return dataArray.slice(0, displayedItemsCount);
  };

  // Check if there's more data to load
  const hasMoreData = useCallback((dataArray) => {
    return displayedItemsCount < dataArray.length;
  }, [displayedItemsCount]);

  // Load more data callback
  const loadMoreData = useCallback(async () => {
    if (isLoadingMore || loading) return;
    
    setIsLoadingMore(true);
    // Simulate loading delay for skeleton effect
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setDisplayedItemsCount(prev => prev + itemsPerPage);
    setIsLoadingMore(false);
  }, [isLoadingMore, loading, itemsPerPage]);

  // Scroll detection for infinite scroll
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    // Handle wheel events to allow page scrolling when table reaches boundaries
    const handleWheel = (e) => {
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      const isAtTop = scrollTop <= 1;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
      
      if (e.deltaY > 0 && isAtBottom) {
        window.scrollBy({
          top: e.deltaY,
          behavior: 'auto'
        });
      } else if (e.deltaY < 0 && isAtTop) {
        window.scrollBy({
          top: e.deltaY,
          behavior: 'auto'
        });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: true });
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

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
      <div
        className="card basic-data-table border-0 rounded-4"
        style={{ overflow: "visible" }}
      >
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
          <div
            className="d-flex flex-column flex-xl-row align-items-start align-items-xl-center justify-content-between mb-3"
            style={{ gap: 24 }}
          >
            <div className="d-flex flex-column flex-lg-row align-items-start align-items-lg-center" style={{ gap: 12 }}>
              <label className="form-label fw-semibold mb-1 mb-lg-0 me-lg-2">Search by SKU</label>
              <div className="d-flex align-items-center" style={{ gap: 8 }}>
                <Icon icon="material-symbols:search" width="20" height="20" style={{ color: "#6c757d" }} />
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Search by SKU..."
                  value={searchSku}
                  onChange={(e) => setSearchSku(e.target.value)}
                  style={{
                    borderRadius: 6,
                    fontSize: 14,
                    width: "100%",
                    maxWidth: 220,
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
            <div className="d-flex flex-column flex-lg-row align-items-start align-items-lg-center" style={{ gap: 12 }}>
              <label
                htmlFor="date-range-picker"
                className="form-label fw-semibold mb-1 mb-lg-0 me-lg-2"
              >
                Select Date & Hour Range:
              </label>
              <div className="d-flex align-items-center" style={{ gap: 12 }}>
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
                    borderRadius: 8,
                    border: "1px solid #ccc",
                    fontSize: 16,
                    width: "100%",
                    maxWidth: 320,
                  }}
                  appearance="subtle"
                  cleanable
                  menuStyle={{
                    boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                    borderRadius: 8,
                    padding: 8,
                    zIndex: 2000,
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
          </div>
          <div
            ref={tableContainerRef}
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
                hasMoreData(sortedProducts) &&
                !isLoadingMore &&
                !loading
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
              <table className="table table-striped table-bordered align-middle">
                <thead
                  className="table-light"
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 10,
                  }}
                >
                  <tr>
                    <th
                      style={{ minWidth: 120, cursor: "pointer", userSelect: "none" }}
                      onClick={() => handleSort("sku")}
                    >
                      <div className="d-flex align-items-center gap-2">
                        SKU
                        {sortConfig.key === "sku" && (
                          <Icon
                            icon={
                              sortConfig.direction === "asc"
                                ? "lucide:arrow-up"
                                : "lucide:arrow-down"
                            }
                            width="14"
                            height="14"
                          />
                        )}
                      </div>
                    </th>
                    <th
                      style={{ minWidth: 220, cursor: "pointer", userSelect: "none" }}
                      onClick={() => handleSort("product_title")}
                    >
                      <div className="d-flex align-items-center gap-2">
                        Product Title
                        {sortConfig.key === "product_title" && (
                          <Icon
                            icon={
                              sortConfig.direction === "asc"
                                ? "lucide:arrow-up"
                                : "lucide:arrow-down"
                            }
                            width="14"
                            height="14"
                          />
                        )}
                      </div>
                    </th>
                    <th
                      style={{ minWidth: 120, cursor: "pointer", userSelect: "none" }}
                      onClick={() => handleSort("spend")}
                    >
                      <div className="d-flex align-items-center gap-2">
                        Ad Spend
                        {sortConfig.key === "spend" && (
                          <Icon
                            icon={
                              sortConfig.direction === "asc"
                                ? "lucide:arrow-up"
                                : "lucide:arrow-down"
                            }
                            width="14"
                            height="14"
                          />
                        )}
                      </div>
                    </th>
                    <th
                      style={{ minWidth: 120, cursor: "pointer", userSelect: "none" }}
                      onClick={() => handleSort("revenue")}
                    >
                      <div className="d-flex align-items-center gap-2">
                        Revenue
                        {sortConfig.key === "revenue" && (
                          <Icon
                            icon={
                              sortConfig.direction === "asc"
                                ? "lucide:arrow-up"
                                : "lucide:arrow-down"
                            }
                            width="14"
                            height="14"
                          />
                        )}
                      </div>
                    </th>
                    <th
                      style={{ minWidth: 100, cursor: "pointer", userSelect: "none" }}
                      onClick={() => handleSort("quantity")}
                    >
                      <div className="d-flex align-items-center gap-2">
                        Quantity
                        {sortConfig.key === "quantity" && (
                          <Icon
                            icon={
                              sortConfig.direction === "asc"
                                ? "lucide:arrow-up"
                                : "lucide:arrow-down"
                            }
                            width="14"
                            height="14"
                          />
                        )}
                      </div>
                    </th>
                    <th
                      style={{ minWidth: 120, cursor: "pointer", userSelect: "none" }}
                      onClick={() => handleSort("cogs")}
                    >
                      <div className="d-flex align-items-center gap-2">
                        COGS
                        {sortConfig.key === "cogs" && (
                          <Icon
                            icon={
                              sortConfig.direction === "asc"
                                ? "lucide:arrow-up"
                                : "lucide:arrow-down"
                            }
                            width="14"
                            height="14"
                          />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <>
                      {Array.from({ length: 5 }).map((_, rowIndex) => (
                        <tr key={`skeleton-${rowIndex}`}>
                          {Array.from({ length: 6 }).map((_, colIndex) => (
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
                  ) : error ? (
                    <tr>
                      <td colSpan={6} className="text-center text-danger py-4">
                        {error}
                      </td>
                    </tr>
                  ) : sortedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-4">
                        {searchSku
                          ? `No products found matching SKU: "${searchSku}"`
                          : "No data found for this range."}
                      </td>
                    </tr>
                  ) : (
                    <>
                      {getDisplayedData(sortedProducts).map((row, idx) => {
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
                      })}
                      {isLoadingMore && (
                        <>
                          {Array.from({ length: 5 }).map((_, rowIndex) => (
                            <tr key={`skeleton-more-${rowIndex}`}>
                              {Array.from({ length: 6 }).map((_, colIndex) => (
                                <td key={`skeleton-more-${rowIndex}-${colIndex}`}>
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
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Infinite Scroll Footer */}
            {sortedProducts.length > 0 && (
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
                  Showing <strong>{getDisplayedData(sortedProducts).length}</strong> of{" "}
                  <strong>{sortedProducts.length}</strong> entries
                  {searchSku && (
                    <span className="ms-2 text-primary" style={{ fontSize: 13 }}>
                      (filtered by SKU: "{searchSku}")
                    </span>
                  )}
                </div>
                {hasMoreData(sortedProducts) && (
                  <div style={{ fontSize: "0.875rem", color: "#6c757d" }}>
                    Scroll down to load more
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

export default ProductSpendSummaryLayer;
