"use client";

import React from "react";
import { apiClient } from "../../api/api";
import IndiaHeatMap from "./IndiaHeatMap";
import { totalSalesAfterGst } from "../../utils/totalSalesAfterGst";

// Cache for API responses
const dataCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getTodayIST() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

function getIstDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    year: Number(parts.find((p) => p.type === "year")?.value),
    month: Number(parts.find((p) => p.type === "month")?.value),
    day: Number(parts.find((p) => p.type === "day")?.value),
  };
}

const IndiaSalesHeatMap = () => {
  const [salesData, setSalesData] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [period, setPeriod] = React.useState("today");
  const [totalSales, setTotalSales] = React.useState(0);

  const getDateRange = React.useCallback((selectedPeriod) => {
    let startDate;
    let endDate;

    if (selectedPeriod === "today") {
      startDate = endDate = getTodayIST();
    } else if (selectedPeriod === "week") {
      const istNow = getIstDateParts();
      const end = new Date(Date.UTC(istNow.year, istNow.month - 1, istNow.day));
      const start = new Date(end);
      start.setUTCDate(end.getUTCDate() - 6);
      startDate = start.toISOString().slice(0, 10);
      endDate = end.toISOString().slice(0, 10);
    } else if (selectedPeriod === "month") {
      const istNow = getIstDateParts();
      startDate = `${istNow.year}-${String(istNow.month).padStart(2, "0")}-01`;
      const lastDay = new Date(Date.UTC(istNow.year, istNow.month, 0)).getUTCDate();
      endDate = `${istNow.year}-${String(istNow.month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    } else if (selectedPeriod === "year") {
      const istNow = getIstDateParts();
      startDate = `${istNow.year}-01-01`;
      endDate = `${istNow.year}-12-31`;
    }

    return { startDate, endDate };
  }, []);

  const fetchSalesData = React.useCallback(
    (selectedPeriod) => {
      const { startDate, endDate } = getDateRange(selectedPeriod);
      const cacheKey = `${selectedPeriod}-${startDate}-${endDate}`;

      // Check cache first
      const cached = dataCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setSalesData(cached.data);
        setTotalSales(cached.total);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      apiClient
        .get(
          `/api/order_sales_by_province?start_date=${startDate}&end_date=${endDate}`
        )
        .then((res) => {
          const rows = Array.isArray(res.data) ? res.data : [];
          const total = rows.reduce((sum, item) => {
            const exGst =
              item.total_sales_after_gst ??
              totalSalesAfterGst(item.total_sales) ??
              0;
            return sum + exGst;
          }, 0);

          // Cache the result
          dataCache.set(cacheKey, {
            data: rows,
            total,
            timestamp: Date.now(),
          });

          setSalesData(rows);
          setTotalSales(total);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error fetching sales data:", err);
          setError("Failed to load sales data");
          setLoading(false);
        });
    },
    [getDateRange]
  );

  React.useEffect(() => {
    if (period) {
      fetchSalesData(period);
    }
  }, [period, fetchSalesData]);

  const periods = [
    { value: "today", label: "Today" },
    { value: "week", label: "Weekly" },
    { value: "month", label: "Monthly" },
    { value: "year", label: "Yearly" },
  ];

  return (
    <div className="col-xxl-12 col-xl-12 col-lg-12 col-md-12 col-sm-12">
      <div className="card radius-8 border-0 h-100 shadow-sm">
        <div className="card-body p-0" style={{ overflow: "hidden" }}>
          {/* Header Section - Compact */}
          <div
            className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between"
            style={{
              padding: "16px 16px 12px",
              borderBottom: "1px solid #F3F4F6",
            }}
          >
            <div className="mb-2 mb-sm-0">
              <h6
                className="mb-0 fw-semibold"
                style={{
                  fontSize: "clamp(14px, 2vw, 16px)",
                  color: "#111827",
                  letterSpacing: "-0.01em",
                  lineHeight: "1.4",
                }}
              >
                Sales by Region
              </h6>
              {!loading && !error && (
                <p
                  className="mb-0 mt-1"
                  style={{
                    fontSize: "clamp(11px, 1.8vw, 13px)",
                    color: "#6B7280",
                    fontWeight: "500",
                    lineHeight: "1.4",
                  }}
                >
                  Total Sales:{" "}
                  <span style={{ color: "#487fff", fontWeight: "600" }}>
                    ₹{Number(totalSales).toFixed(2)}
                  </span>
                </p>
              )}
            </div>
            {/* Period Selection - Minimal Professional */}
            <div
              className="d-flex align-items-center"
              style={{
                gap: "0",
                flexWrap: "wrap",
              }}
            >
              {periods.map((p, index) => (
                <React.Fragment key={p.value}>
                  <button
                    onClick={() => setPeriod(p.value)}
                    className="border-0 bg-transparent"
                    style={{
                      fontSize: "clamp(11px, 1.5vw, 12px)",
                      fontWeight: period === p.value ? "600" : "400",
                      color: period === p.value ? "#111827" : "#9CA3AF",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      padding: "4px 6px",
                      letterSpacing: "0.01em",
                      lineHeight: "1.5",
                      fontFamily: "inherit",
                      borderRadius: "4px",
                      background:
                        period === p.value ? "#F3F4F6" : "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (period !== p.value) {
                        e.target.style.color = "#4B5563";
                        e.target.style.background = "#F9FAFB";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (period !== p.value) {
                        e.target.style.color = "#9CA3AF";
                        e.target.style.background = "transparent";
                      }
                    }}
                  >
                    {p.label}
                  </button>
                  {index < periods.length - 1 && (
                    <span
                      style={{
                        color: "#E5E7EB",
                        fontSize: "12px",
                        lineHeight: "1",
                        margin: "0 2px",
                        userSelect: "none",
                      }}
                    >
                      |
                    </span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Map Container - Responsive */}
          <div
            style={{
              padding:
                typeof window !== "undefined" && window.innerWidth < 576
                  ? "4px 2px 4px 2px"
                  : typeof window !== "undefined" && window.innerWidth < 768
                  ? "6px 4px 6px 4px"
                  : "12px 16px 16px",
              minHeight: "400px",
              position: "relative",
              overflow: "hidden",
            }}
            className="w-100"
          >
            {loading ? (
              <div
                className="d-flex justify-content-center align-items-center"
                style={{
                  minHeight: "400px",
                  width: "100%",
                }}
              >
                <div className="text-center">
                  <div
                    className="spinner-border text-primary"
                    role="status"
                    style={{
                      width: "2rem",
                      height: "2rem",
                      borderWidth: "2px",
                    }}
                  >
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p
                    className="mt-3 mb-0"
                    style={{
                      fontSize: "13px",
                      color: "#6B7280",
                    }}
                  >
                    Loading map data...
                  </p>
                </div>
              </div>
            ) : error ? (
              <div
                className="d-flex justify-content-center align-items-center"
                style={{
                  minHeight: "400px",
                  width: "100%",
                }}
              >
                <div className="text-center">
                  <p
                    className="mb-3"
                    style={{
                      fontSize: "14px",
                      color: "#EF4444",
                      fontWeight: "500",
                    }}
                  >
                    {error}
                  </p>
                  <button
                    className="btn btn-sm"
                    onClick={() => fetchSalesData(period)}
                    style={{
                      background: "#487fff",
                      color: "#fff",
                      border: "none",
                      padding: "6px 16px",
                      fontSize: "12px",
                      fontWeight: "500",
                      borderRadius: "6px",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = "#3869e6";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = "#487fff";
                    }}
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : salesData.length === 0 ? (
              <div
                className="d-flex justify-content-center align-items-center"
                style={{
                  minHeight: "400px",
                  width: "100%",
                }}
              >
                <p
                  className="mb-0"
                  style={{
                    fontSize: "13px",
                    color: "#9CA3AF",
                  }}
                >
                  No sales data available for this period
                </p>
              </div>
            ) : (
              <IndiaHeatMap salesData={salesData} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndiaSalesHeatMap;
