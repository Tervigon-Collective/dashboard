"use client";
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { Icon } from "@iconify/react";
import ExcelJS from "exceljs";
import { DateRangePicker, CustomProvider } from "rsuite";
import enUS from "rsuite/locales/en_US";
import "rsuite/dist/rsuite.min.css";

const API_BASE =
  "https://skuspendsales-aghtewckaqbdfqep.centralindia-01.azurewebsites.net/api/product_spend";
const SUGGESTIONS_API_BASE =
  "https://skuspendsales-aghtewckaqbdfqep.centralindia-01.azurewebsites.net/api";

// Channel endpoints mapping
const CHANNEL_ENDPOINTS = {
  all: "",
  meta: "/meta",
  google: "/google",
};

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
  endDate,
  channelName = "ALL"
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
    "Net Profit",
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
    const netProfit =
      Number(row.revenue || 0) - Number(row.spend || 0) - Number(row.cogs || 0);
    const rowData = [
      row.sku || "",
      row.product_title || "",
      `₹${Number(row.spend || 0).toFixed(2)}`,
      `₹${Number(row.revenue || 0).toFixed(2)}`,
      row.quantity || 0,
      `₹${Number(row.cogs || 0).toFixed(2)}`,
      `₹${netProfit.toFixed(2)}`,
    ];
    worksheet.addRow(rowData);
  });

  // Add total row if summary data exists
  if (summaryData) {
    worksheet.addRow([]); // Empty row for spacing

    const totalNetProfit =
      Number(summaryData.total_revenue || 0) -
      Number(summaryData.total_ad_spend || 0) -
      Number(summaryData.total_cogs || 0);

    const totalRow = [
      "TOTAL",
      `${summaryData.total_products} Products`,
      `₹${Number(summaryData.total_ad_spend || 0).toFixed(2)}`,
      `₹${Number(summaryData.total_revenue || 0).toFixed(2)}`,
      summaryData.total_quantity || 0,
      `₹${Number(summaryData.total_cogs || 0).toFixed(2)}`,
      `₹${totalNetProfit.toFixed(2)}`,
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
  link.download = `Product_Spend_Summary_${channelName}_${startDate}_to_${endDate}.xlsx`;
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
  const [activeChannel, setActiveChannel] = useState("all"); // 'all', 'meta', 'google'

  // Autocomplete state
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [autocompleteError, setAutocompleteError] = useState("");
  const searchInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const searchContainerRef = useRef(null);
  const isSelectingRef = useRef(false); // Flag to prevent reopening after selection

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

  // Generate autocomplete suggestions from existing products data
  const fetchSuggestions = useCallback((searchTerm) => {
    // Don't show suggestions if search term is empty
    if (!searchTerm || searchTerm.trim().length === 0) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSuggestionsLoading(false);
      return;
    }

    setSuggestionsLoading(true);
    setAutocompleteError("");

    if (!products || products.length === 0) {
      setSuggestions([]);
      setShowSuggestions(true);
      setSuggestionsLoading(false);
      return;
    }

    const searchLower = searchTerm.toLowerCase().trim();
    
    // Filter products that match the search term (product title or SKU)
    // Use the same filtering logic as the table
    const matchingProducts = products
      .filter((product) => {
        const productTitle = (product.product_title || "").toLowerCase();
        const productSku = (product.sku || "").toLowerCase();
        return productTitle.includes(searchLower) || productSku.includes(searchLower);
      })
      .slice(0, 15); // Limit to 15 suggestions

    // Format suggestions to match API response format
    const formattedSuggestions = matchingProducts.map((product) => ({
      product_title: product.product_title || "",
      sku: product.sku || "",
    }));

    setSuggestions(formattedSuggestions);
    setShowSuggestions(true);
    setSuggestionsLoading(false);
    setAutocompleteError("");
  }, [products]);

  // Debounce autocomplete suggestions
  useEffect(() => {
    // Don't fetch suggestions if we're in the middle of selecting
    if (isSelectingRef.current) {
      return;
    }

    const timer = setTimeout(() => {
      // Double-check flag before fetching
      if (isSelectingRef.current) {
        return;
      }
      
      if (searchSku.trim().length >= 1) {
        fetchSuggestions(searchSku);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
        setSuggestionsLoading(false);
      }
    }, 300); // 300ms debounce delay

    return () => {
      clearTimeout(timer);
    };
  }, [searchSku, fetchSuggestions]);


  const fetchSummary = useCallback(async (range, channel) => {
    setLoading(true);
    setError("");
    setProducts([]);
    setSummaryData(null);
    const start_datetime = formatLocalISO(range[0]);
    const end_datetime = formatLocalISO(range[1]);
    try {
      const channelEndpoint = CHANNEL_ENDPOINTS[channel] || "";
      const url = `${API_BASE}${channelEndpoint}?start_datetime=${encodeURIComponent(
        start_datetime
      )}&end_datetime=${encodeURIComponent(end_datetime)}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Failed to fetch data");
      }
      const data = await res.json();

      // Debug: Log all BlueJay Sneaks entries before consolidation
      const blueJayEntries = (data.products || []).filter(
        (p) => p.product_title && p.product_title.includes("BlueJay Sneaks")
      );
      if (blueJayEntries.length > 0) {
        console.log("=== BlueJay Sneaks - Before Consolidation ===");
        blueJayEntries.forEach((entry, idx) => {
          console.log(`Entry ${idx + 1}:`, {
            sku: entry.sku,
            spend: entry.spend,
            revenue: entry.revenue,
            quantity: entry.quantity,
            cogs: entry.cogs,
          });
        });
        const totalSpend = blueJayEntries.reduce(
          (sum, e) => sum + Number(e.spend || 0),
          0
        );
        console.log("Total Spend (sum of all entries):", totalSpend);
      }

      // Consolidate products by product_title
      const consolidatedProducts = {};
      (data.products || []).forEach((product) => {
        const title = product.product_title || "";
        if (!consolidatedProducts[title]) {
          // First occurrence - keep the SKU and initialize values
          consolidatedProducts[title] = {
            sku: product.sku || "",
            product_title: title,
            spend: Number(product.spend || 0),
            revenue: Number(product.revenue || 0),
            quantity: Number(product.quantity || 0),
            cogs: Number(product.cogs || 0),
          };
        } else {
          // Subsequent occurrences - sum the values
          consolidatedProducts[title].spend += Number(product.spend || 0);
          consolidatedProducts[title].revenue += Number(product.revenue || 0);
          consolidatedProducts[title].quantity += Number(product.quantity || 0);
          consolidatedProducts[title].cogs += Number(product.cogs || 0);
        }
      });

      // Convert back to array
      const consolidatedArray = Object.values(consolidatedProducts);

      // Debug: Log consolidated BlueJay Sneaks result
      const blueJayConsolidated = consolidatedArray.find(
        (p) => p.product_title && p.product_title.includes("BlueJay Sneaks")
      );
      if (blueJayConsolidated) {
        console.log("=== BlueJay Sneaks - After Consolidation ===");
        console.log("Consolidated Result:", blueJayConsolidated);
      }

      setProducts(consolidatedArray);
      setSummaryData(data.summary || null);
    } catch (err) {
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (dateRange && dateRange[0] && dateRange[1]) {
      fetchSummary(dateRange, activeChannel);
      setDisplayedItemsCount(20); // Reset displayed items on date change
    }
  }, [dateRange, activeChannel, fetchSummary]);

  useEffect(() => {
    setDisplayedItemsCount(20); // Reset displayed items on search change
    setSelectedSuggestionIndex(-1); // Reset selected index on search change
  }, [searchSku]);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion, event) => {
    // Prevent event propagation to avoid double-triggering
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // Set flag to prevent reopening - set this FIRST
    isSelectingRef.current = true;
    
    // Close dropdown IMMEDIATELY
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    setSuggestions([]);
    
    // Use product_title if available, otherwise use SKU
    const searchValue = suggestion.product_title || suggestion.sku || "";
    
    // Update search value immediately but flag prevents onChange from reopening
    setSearchSku(searchValue);
    
    // Blur input immediately to prevent focus events
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
    
    // Reset flag after a longer delay to ensure all events have processed
    setTimeout(() => {
      isSelectingRef.current = false;
    }, 300);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
      if (!showSuggestions || suggestions.length === 0) {
        if (e.key === "Enter") {
          // Allow Enter to submit/search even when suggestions are hidden
          e.preventDefault();
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedSuggestionIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          e.preventDefault();
          if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestions.length) {
            handleSuggestionSelect(suggestions[selectedSuggestionIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setShowSuggestions(false);
          setSelectedSuggestionIndex(-1);
          break;
        case "Tab":
          setShowSuggestions(false);
          setSelectedSuggestionIndex(-1);
          break;
        default:
          break;
      }
    },
    [showSuggestions, suggestions, selectedSuggestionIndex, handleSuggestionSelect]
  );

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close if clicking inside the search container or if we're selecting
      if (
        isSelectingRef.current ||
        (searchContainerRef.current &&
        searchContainerRef.current.contains(event.target))
      ) {
        return;
      }
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    };

    if (showSuggestions) {
      // Use a slight delay to allow suggestion clicks to process first
      const timeoutId = setTimeout(() => {
        document.addEventListener("click", handleClickOutside, true);
      }, 0);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener("click", handleClickOutside, true);
      };
    }
  }, [showSuggestions]);

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

    // Filter by search term (product name or SKU)
    let filteredProducts = products;
    if (searchSku.trim()) {
      const searchTerm = searchSku.toLowerCase().trim();
      filteredProducts = products.filter(
        (product) =>
          product.sku?.toLowerCase().includes(searchTerm) ||
          product.product_title?.toLowerCase().includes(searchTerm)
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
          sortConfig.key === "cogs" ||
          sortConfig.key === "net_profit"
        ) {
          // Calculate net_profit if sorting by it
          if (sortConfig.key === "net_profit") {
            aValue =
              Number(a.revenue || 0) -
              Number(a.spend || 0) -
              Number(a.cogs || 0);
            bValue =
              Number(b.revenue || 0) -
              Number(b.spend || 0) -
              Number(b.cogs || 0);
          } else {
            aValue = Number(aValue || 0);
            bValue = Number(bValue || 0);
          }
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

  // Calculate dynamic summary from filtered/sorted products
  const dynamicSummary = useMemo(() => {
    if (!sortedProducts || sortedProducts.length === 0) {
      return null;
    }

    const totals = sortedProducts.reduce(
      (acc, product) => {
        acc.total_ad_spend += Number(product.spend || 0);
        acc.total_revenue += Number(product.revenue || 0);
        acc.total_quantity += Number(product.quantity || 0);
        acc.total_cogs += Number(product.cogs || 0);
        return acc;
      },
      {
        total_products: sortedProducts.length,
        total_ad_spend: 0,
        total_revenue: 0,
        total_quantity: 0,
        total_cogs: 0,
      }
    );

    return totals;
  }, [sortedProducts]);

  // Use dynamic summary if available, otherwise fall back to API summaryData
  const displaySummary = dynamicSummary || summaryData;

  // Get displayed data for infinite scroll
  const getDisplayedData = (dataArray) => {
    return dataArray.slice(0, displayedItemsCount);
  };

  // Check if there's more data to load
  const hasMoreData = useCallback(
    (dataArray) => {
      return displayedItemsCount < dataArray.length;
    },
    [displayedItemsCount]
  );

  // Load more data callback
  const loadMoreData = useCallback(async () => {
    if (isLoadingMore || loading) return;

    setIsLoadingMore(true);
    // Simulate loading delay for skeleton effect
    await new Promise((resolve) => setTimeout(resolve, 500));

    setDisplayedItemsCount((prev) => prev + itemsPerPage);
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
          behavior: "auto",
        });
      } else if (e.deltaY < 0 && isAtTop) {
        window.scrollBy({
          top: e.deltaY,
          behavior: "auto",
        });
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: true });

    return () => {
      container.removeEventListener("wheel", handleWheel);
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
    const channelName =
      activeChannel === "all" ? "ALL" : activeChannel.toUpperCase();

    await downloadProductSpendExcel(
      sortedProducts,
      summaryData,
      startDate,
      endDate,
      channelName
    );
  };

  return (
    <CustomProvider locale={enUS}>
      <div
        className="card basic-data-table border-0 rounded-4"
        style={{ overflow: "visible" }}
      >
        <div className="card-body p-24">
          {/* Header with Date Picker and Download Button */}
          <div className="d-flex justify-content-between align-items-center mb-20">
            <div className="d-flex align-items-center">
              <h6
                className="mb-0 me-2"
                style={{
                  fontSize: "x-large",
                  fontWeight: "600",
                  color: "#111827",
                }}
              >
                Product Spend Dashboard
              </h6>
              <Icon
                icon="solar:info-circle-bold"
                style={{ fontSize: "14px", color: "#9CA3AF" }}
              />
            </div>
            <div className="d-flex align-items-center" style={{ gap: 12 }}>
              <DateRangePicker
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
                  width: 300,
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

          {/* Channel Tabs */}
          <div
            className="mb-4 border-bottom pb-0"
            style={{ overflowX: "auto", overflowY: "hidden" }}
          >
            <div
              className="d-flex gap-2 gap-md-4"
              style={{ minWidth: "max-content", flexWrap: "nowrap" }}
            >
              <div
                className={`d-flex align-items-center gap-2 px-2 px-md-3 py-2 cursor-pointer position-relative ${
                  activeChannel === "all" ? "text-primary" : "text-muted"
                }`}
                onClick={() => {
                  setActiveChannel("all");
                  setDisplayedItemsCount(20);
                }}
                style={{ cursor: "pointer", whiteSpace: "nowrap" }}
              >
                <Icon
                  icon="mdi:view-dashboard-outline"
                  className="icon"
                  style={{ flexShrink: 0 }}
                />
                <span
                  className="fw-medium"
                  style={{ fontSize: "clamp(12px, 2.5vw, 14px)" }}
                >
                  ALL
                </span>
                {activeChannel === "all" && (
                  <div
                    className="position-absolute bottom-0 start-0 end-0"
                    style={{
                      height: "2px",
                      backgroundColor: "#0d6efd",
                    }}
                  />
                )}
              </div>
              <div
                className={`d-flex align-items-center gap-2 px-2 px-md-3 py-2 cursor-pointer position-relative ${
                  activeChannel === "meta" ? "text-primary" : "text-muted"
                }`}
                onClick={() => {
                  setActiveChannel("meta");
                  setDisplayedItemsCount(20);
                }}
                style={{ cursor: "pointer", whiteSpace: "nowrap" }}
              >
                <Icon
                  icon="mdi:facebook"
                  className="icon"
                  style={{ flexShrink: 0 }}
                />
                <span
                  className="fw-medium"
                  style={{ fontSize: "clamp(12px, 2.5vw, 14px)" }}
                >
                  Meta
                </span>
                {activeChannel === "meta" && (
                  <div
                    className="position-absolute bottom-0 start-0 end-0"
                    style={{
                      height: "2px",
                      backgroundColor: "#0d6efd",
                    }}
                  />
                )}
              </div>
              <div
                className={`d-flex align-items-center gap-2 px-2 px-md-3 py-2 cursor-pointer position-relative ${
                  activeChannel === "google" ? "text-primary" : "text-muted"
                }`}
                onClick={() => {
                  setActiveChannel("google");
                  setDisplayedItemsCount(20);
                }}
                style={{ cursor: "pointer", whiteSpace: "nowrap" }}
              >
                <Icon
                  icon="mdi:google"
                  className="icon"
                  style={{ flexShrink: 0 }}
                />
                <span
                  className="fw-medium"
                  style={{ fontSize: "clamp(12px, 2.5vw, 14px)" }}
                >
                  Google
                </span>
                {activeChannel === "google" && (
                  <div
                    className="position-absolute bottom-0 start-0 end-0"
                    style={{
                      height: "2px",
                      backgroundColor: "#0d6efd",
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          {displaySummary && (
            <div
              className="row mb-20 g-2"
              style={{
                marginTop: "20px",
                flexWrap: "nowrap",
                overflowX: "auto",
              }}
            >
              <div className="col" style={{ minWidth: "150px", flex: "1 1 0" }}>
                <div
                  className="card"
                  style={{
                    height: "90px",
                    border: "none",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                    borderRadius: "6px",
                  }}
                >
                  <div className="card-body d-flex flex-column justify-content-between p-1">
                    <div className="d-flex justify-content-between align-items-start">
                      <span
                        style={{
                          fontSize: "9px",
                          fontWeight: "600",
                          color: "#6B7280",
                          textTransform: "uppercase",
                          letterSpacing: "0.4px",
                        }}
                      >
                        TOTAL NET PROFIT
                      </span>
                    </div>
                    <div>
                      <span
                        style={{
                          fontSize: "x-large",
                          fontWeight: "600",
                          color: "#111827",
                          margin: "0",
                          lineHeight: "1",
                          display: "block",
                        }}
                      >
                        ₹
                        {(
                          Number(displaySummary.total_revenue || 0) -
                          Number(displaySummary.total_ad_spend || 0) -
                          Number(displaySummary.total_cogs || 0)
                        ).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div
                      style={{
                        height: "2px",
                        backgroundColor: "#10B981",
                        borderRadius: "2px",
                        width: "100%",
                      }}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="col" style={{ minWidth: "150px", flex: "1 1 0" }}>
                <div
                  className="card"
                  style={{
                    height: "90px",
                    border: "none",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                    borderRadius: "6px",
                  }}
                >
                  <div className="card-body d-flex flex-column justify-content-between p-1">
                    <div className="d-flex justify-content-between align-items-start">
                      <span
                        style={{
                          fontSize: "9px",
                          fontWeight: "600",
                          color: "#6B7280",
                          textTransform: "uppercase",
                          letterSpacing: "0.4px",
                        }}
                      >
                        TOTAL PRODUCTS
                      </span>
                    </div>
                    <div>
                      <span
                        style={{
                          fontSize: "x-large",
                          fontWeight: "600",
                          color: "#111827",
                          margin: "0",
                          lineHeight: "1",
                          display: "block",
                        }}
                      >
                        {displaySummary.total_products}
                      </span>
                    </div>
                    <div
                      style={{
                        height: "2px",
                        backgroundColor: "#3B82F6",
                        borderRadius: "2px",
                        width: "100%",
                      }}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="col" style={{ minWidth: "150px", flex: "1 1 0" }}>
                <div
                  className="card"
                  style={{
                    height: "90px",
                    border: "none",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                    borderRadius: "6px",
                  }}
                >
                  <div className="card-body d-flex flex-column justify-content-between p-1">
                    <div className="d-flex justify-content-between align-items-start">
                      <span
                        style={{
                          fontSize: "9px",
                          fontWeight: "600",
                          color: "#6B7280",
                          textTransform: "uppercase",
                          letterSpacing: "0.4px",
                        }}
                      >
                        TOTAL AD SPEND
                      </span>
                    </div>
                    <div>
                      <span
                        style={{
                          fontSize: "x-large",
                          fontWeight: "600",
                          color: "#111827",
                          margin: "0",
                          lineHeight: "1",
                          display: "block",
                        }}
                      >
                        ₹
                        {Number(displaySummary.total_ad_spend).toLocaleString(
                          undefined,
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}
                      </span>
                    </div>
                    <div
                      style={{
                        height: "2px",
                        backgroundColor: "#F59E0B",
                        borderRadius: "2px",
                        width: "100%",
                      }}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="col" style={{ minWidth: "150px", flex: "1 1 0" }}>
                <div
                  className="card"
                  style={{
                    height: "90px",
                    border: "none",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                    borderRadius: "6px",
                  }}
                >
                  <div className="card-body d-flex flex-column justify-content-between p-1">
                    <div className="d-flex justify-content-between align-items-start">
                      <span
                        style={{
                          fontSize: "9px",
                          fontWeight: "600",
                          color: "#6B7280",
                          textTransform: "uppercase",
                          letterSpacing: "0.4px",
                        }}
                      >
                        TOTAL REVENUE
                      </span>
                    </div>
                    <div>
                      <span
                        style={{
                          fontSize: "x-large",
                          fontWeight: "600",
                          color: "#111827",
                          margin: "0",
                          lineHeight: "1",
                          display: "block",
                        }}
                      >
                        ₹
                        {Number(displaySummary.total_revenue).toLocaleString(
                          undefined,
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}
                      </span>
                    </div>
                    <div
                      style={{
                        height: "2px",
                        backgroundColor: "#10B981",
                        borderRadius: "2px",
                        width: "100%",
                      }}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="col" style={{ minWidth: "150px", flex: "1 1 0" }}>
                <div
                  className="card"
                  style={{
                    height: "90px",
                    border: "none",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                    borderRadius: "6px",
                  }}
                >
                  <div className="card-body d-flex flex-column justify-content-between p-1">
                    <div className="d-flex justify-content-between align-items-start">
                      <span
                        style={{
                          fontSize: "9px",
                          fontWeight: "600",
                          color: "#6B7280",
                          textTransform: "uppercase",
                          letterSpacing: "0.4px",
                        }}
                      >
                        TOTAL QUANTITY
                      </span>
                    </div>
                    <div>
                      <span
                        style={{
                          fontSize: "x-large",
                          fontWeight: "600",
                          color: "#111827",
                          margin: "0",
                          lineHeight: "1",
                          display: "block",
                        }}
                      >
                        {displaySummary.total_quantity}
                      </span>
                    </div>
                    <div
                      style={{
                        height: "2px",
                        backgroundColor: "#8B5CF6",
                        borderRadius: "2px",
                        width: "100%",
                      }}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="col" style={{ minWidth: "150px", flex: "1 1 0" }}>
                <div
                  className="card"
                  style={{
                    height: "90px",
                    border: "none",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                    borderRadius: "6px",
                  }}
                >
                  <div className="card-body d-flex flex-column justify-content-between p-1">
                    <div className="d-flex justify-content-between align-items-start">
                      <span
                        style={{
                          fontSize: "9px",
                          fontWeight: "600",
                          color: "#6B7280",
                          textTransform: "uppercase",
                          letterSpacing: "0.4px",
                        }}
                      >
                        TOTAL COGS
                      </span>
                    </div>
                    <div>
                      <span
                        style={{
                          fontSize: "x-large",
                          fontWeight: "600",
                          color: "#111827",
                          margin: "0",
                          lineHeight: "1",
                          display: "block",
                        }}
                      >
                        ₹
                        {Number(displaySummary.total_cogs || 0).toLocaleString(
                          undefined,
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}
                      </span>
                    </div>
                    <div
                      style={{
                        height: "2px",
                        backgroundColor: "#06B6D4",
                        borderRadius: "2px",
                        width: "100%",
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search and Filters */}
          <div
            className="d-flex flex-column flex-xl-row align-items-start align-items-xl-center justify-content-between mb-3"
            style={{ gap: 24, marginTop: "20px" }}
          >
            <div
              className="d-flex flex-column flex-lg-row align-items-start align-items-lg-center"
              style={{ gap: 12 }}
            >
              <label className="form-label fw-semibold mb-1 mb-lg-0 me-lg-2">
                Search by Product or SKU
              </label>
              <div
                ref={searchContainerRef}
                className="position-relative"
                style={{ width: "100%", maxWidth: 300 }}
              >
                <div className="d-flex align-items-center position-relative" style={{ gap: 8 }}>
                  <Icon
                    icon="material-symbols:search"
                    width="20"
                    height="20"
                    style={{
                      color: "#6c757d",
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      zIndex: 1,
                      pointerEvents: "none",
                    }}
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Search by product name or SKU..."
                    value={searchSku}
                    onChange={(e) => {
                      // Don't process onChange if we're selecting a suggestion
                      if (isSelectingRef.current) {
                        return;
                      }
                      setSearchSku(e.target.value);
                      // Only show suggestions if there's text
                      if (e.target.value.trim().length >= 1) {
                        setShowSuggestions(true);
                      } else {
                        setShowSuggestions(false);
                      }
                    }}
                    onFocus={() => {
                      // Don't show suggestions on focus if we just selected one
                      if (isSelectingRef.current) {
                        return;
                      }
                      // Only show suggestions on focus if there's text
                      if (searchSku.trim().length >= 1) {
                        // Fetch suggestions first, then show
                        if (suggestions.length === 0 && products.length > 0) {
                          fetchSuggestions(searchSku);
                        } else {
                          setShowSuggestions(true);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      // Don't close on blur if clicking a suggestion (handled by click handler)
                      // The click outside handler will close it if needed
                      const relatedTarget = e.relatedTarget;
                      if (relatedTarget && searchContainerRef.current?.contains(relatedTarget)) {
                        // Clicking inside container, don't close
                        return;
                      }
                    }}
                    onKeyDown={handleKeyDown}
                    style={{
                      borderRadius: 6,
                      fontSize: 14,
                      width: "100%",
                      paddingLeft: 40,
                      paddingRight: searchSku ? 40 : 12,
                    }}
                    aria-autocomplete="list"
                    aria-expanded={showSuggestions}
                    aria-haspopup="listbox"
                    role="combobox"
                  />
                  {suggestionsLoading && (
                    <Icon
                      icon="svg-spinners:ring-resize"
                      width="16"
                      height="16"
                      style={{
                        color: "#6c757d",
                        position: "absolute",
                        right: searchSku ? 40 : 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        zIndex: 1,
                        pointerEvents: "none",
                      }}
                    />
                  )}
                  {searchSku && !suggestionsLoading && (
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => {
                        setSearchSku("");
                        setShowSuggestions(false);
                        setSuggestions([]);
                        setSelectedSuggestionIndex(-1);
                      }}
                      title="Clear search"
                      style={{
                        padding: "2px 8px",
                        borderRadius: 6,
                        fontSize: 12,
                        position: "absolute",
                        right: 8,
                        top: "50%",
                        transform: "translateY(-50%)",
                        zIndex: 1,
                      }}
                    >
                      <Icon icon="mdi:close" width="16" height="16" />
                    </button>
                  )}
                </div>

                {/* Suggestions Dropdown - Using list-group style like receiving management */}
                {showSuggestions && (
                  <div
                    ref={suggestionsRef}
                    className="list-group position-absolute w-100 shadow-sm"
                    style={{
                      top: "100%",
                      left: 0,
                      marginTop: 4,
                      maxHeight: "240px",
                      overflowY: "auto",
                      zIndex: 1050,
                      borderRadius: "0.375rem",
                    }}
                    role="listbox"
                  >
                    {suggestionsLoading ? (
                      <div className="list-group-item text-center py-3">
                        <div className="spinner-border spinner-border-sm text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        <span className="ms-2 text-muted">Loading suggestions...</span>
                      </div>
                    ) : autocompleteError ? (
                      <div className="list-group-item text-danger py-2">
                        {autocompleteError}
                      </div>
                    ) : suggestions.length > 0 ? (
                      suggestions.map((suggestion, index) => {
                        const isSelected = index === selectedSuggestionIndex;
                        const displayText = suggestion.product_title || suggestion.sku || "";
                        const searchTerm = searchSku.toLowerCase().trim();

                        // Highlight matching text
                        const highlightText = (text, term) => {
                          if (!term || !text) return text;
                          // Escape special regex characters
                          const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                          const parts = text.split(new RegExp(`(${escapedTerm})`, "gi"));
                          return parts.map((part, i) =>
                            part.toLowerCase() === term.toLowerCase() ? (
                              <mark key={i} style={{ backgroundColor: "#fff3cd", padding: 0 }}>
                                {part}
                              </mark>
                            ) : (
                              part
                            )
                          );
                        };

                        return (
                          <div
                            key={`${suggestion.sku || suggestion.product_title}-${index}`}
                            className={`list-group-item list-group-item-action ${
                              isSelected ? "active" : ""
                            }`}
                            style={{
                              cursor: "pointer",
                            }}
                            onMouseDown={(e) => {
                              // Handle selection on mousedown to prevent input focus
                              e.preventDefault();
                              e.stopPropagation();
                              // Set flag FIRST to prevent any reopening
                              isSelectingRef.current = true;
                              // Close dropdown immediately
                              setShowSuggestions(false);
                              setSelectedSuggestionIndex(-1);
                              // Then handle selection
                              handleSuggestionSelect(suggestion, e);
                            }}
                            onClick={(e) => {
                              // Prevent any click events from propagating
                              e.preventDefault();
                              e.stopPropagation();
                              // Ensure dropdown stays closed
                              setShowSuggestions(false);
                            }}
                            onMouseUp={(e) => {
                              // Also prevent mouseup from causing issues
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onMouseEnter={() => setSelectedSuggestionIndex(index)}
                            role="option"
                            aria-selected={isSelected}
                          >
                            <div style={{ fontSize: 14, fontWeight: 500 }}>
                              {highlightText(displayText, searchTerm)}
                            </div>
                            {suggestion.sku && (
                              <div
                                style={{
                                  fontSize: 12,
                                  opacity: isSelected ? 0.9 : 0.7,
                                  marginTop: 2,
                                }}
                              >
                                SKU: {highlightText(suggestion.sku, searchTerm)}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : searchSku.trim().length >= 1 ? (
                      <div className="list-group-item disabled text-muted py-2">
                        No products found matching "{searchSku}"
                      </div>
                    ) : null}
                  </div>
                )}
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
              position: "relative",
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
            <div className="table-responsive" style={{ position: "relative" }}>
              <table
                className="table table-striped table-bordered align-middle"
                style={{ marginBottom: 0 }}
              >
                <thead
                  className="table-light"
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 1000,
                    backgroundColor: "#f8f9fa",
                  }}
                >
                  <tr style={{ backgroundColor: "#f8f9fa" }}>
                    <th
                      style={{
                        minWidth: 120,
                        cursor: "pointer",
                        userSelect: "none",
                        backgroundColor: "#f8f9fa",
                        position: "sticky",
                        top: 0,
                        zIndex: 1001,
                      }}
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
                      style={{
                        minWidth: 220,
                        cursor: "pointer",
                        userSelect: "none",
                        backgroundColor: "#f8f9fa",
                        position: "sticky",
                        top: 0,
                        zIndex: 1001,
                      }}
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
                      style={{
                        minWidth: 120,
                        cursor: "pointer",
                        userSelect: "none",
                        backgroundColor: "#f8f9fa",
                        position: "sticky",
                        top: 0,
                        zIndex: 1001,
                      }}
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
                      style={{
                        minWidth: 120,
                        cursor: "pointer",
                        userSelect: "none",
                        backgroundColor: "#f8f9fa",
                        position: "sticky",
                        top: 0,
                        zIndex: 1001,
                      }}
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
                      style={{
                        minWidth: 100,
                        cursor: "pointer",
                        userSelect: "none",
                        backgroundColor: "#f8f9fa",
                        position: "sticky",
                        top: 0,
                        zIndex: 1001,
                      }}
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
                      style={{
                        minWidth: 120,
                        cursor: "pointer",
                        userSelect: "none",
                        backgroundColor: "#f8f9fa",
                        position: "sticky",
                        top: 0,
                        zIndex: 1001,
                      }}
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
                    <th
                      style={{
                        minWidth: 120,
                        cursor: "pointer",
                        userSelect: "none",
                        backgroundColor: "#f8f9fa",
                        position: "sticky",
                        top: 0,
                        zIndex: 1001,
                      }}
                      onClick={() => handleSort("net_profit")}
                    >
                      <div className="d-flex align-items-center gap-2">
                        Net Profit
                        {sortConfig.key === "net_profit" && (
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
                          {Array.from({ length: 7 }).map((_, colIndex) => (
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
                      <td colSpan={7} className="text-center text-danger py-4">
                        {error}
                      </td>
                    </tr>
                  ) : sortedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-4">
                        {searchSku
                          ? `No products found matching: "${searchSku}"`
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
                            <td style={{ paddingTop: 12, paddingBottom: 12 }}>
                              ₹
                              {(
                                Number(row.revenue || 0) -
                                Number(row.spend || 0) -
                                Number(row.cogs || 0)
                              ).toLocaleString(undefined, {
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
                              {Array.from({ length: 7 }).map((_, colIndex) => (
                                <td
                                  key={`skeleton-more-${rowIndex}-${colIndex}`}
                                >
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
                  Showing{" "}
                  <strong>{getDisplayedData(sortedProducts).length}</strong> of{" "}
                  <strong>{sortedProducts.length}</strong> entries
                  {searchSku && (
                    <span
                      className="ms-2 text-primary"
                      style={{ fontSize: 13 }}
                    >
                      (filtered by: "{searchSku}")
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
