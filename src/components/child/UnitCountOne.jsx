"use client";
import React, { useEffect, useState, useMemo } from "react";
import { Icon } from "@iconify/react";
import { apiClient } from "../../api/api";
import { fetchDashboardMetricsProgressive } from "../../api/dashboardMetricsApi";
import { useUser } from "../../helper/UserContext";

// Utility to get today's date in YYYY-MM-DD (IST, matches backend)
const getToday = () => {
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
};

// Helper to check if a date range is today
const isTodayRange = (start, end) => {
  if (!start || !end) return true; // Default to today's API if no dates selected
  const today = getToday();
  const startDate = start.split(" ")[0]; // Extract just the date part
  const endDate = end.split(" ")[0];
  return startDate === today && endDate === today;
};

// Helper to sort breakdowns by value descending
const sortBreakdown = (arr) =>
  arr.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

const emptyInventoryEvents = {
  cancelCount: null,
  cancelQuantity: null,
  returnCount: null,
  returnQuantity: null,
  totalEvents: null,
  totalQuantity: null,
};

function pickOrderMetric(orderCountPayload, channel = "total") {
  if (!orderCountPayload) return null;
  const total =
    orderCountPayload.orderCount ?? orderCountPayload.totalQuantity ?? null;
  if (channel === "total") return total;
  if (channel === "meta") {
    return orderCountPayload.metaOrderCount ?? orderCountPayload.metaQuantity ?? null;
  }
  if (channel === "google") {
    return orderCountPayload.googleOrderCount ?? orderCountPayload.googleQuantity ?? null;
  }
  if (channel === "organic") {
    return orderCountPayload.organicOrderCount ?? orderCountPayload.organicQuantity ?? null;
  }
  return null;
}

const INITIAL_SECTION_LOADING = {
  netProfit: true,
  sales: true,
  adSpend: true,
  cogs: true,
  orderCount: true,
  roas: true,
  inventoryEvents: true,
  paymentMethodCount: true,
};

const skeletonBase = {
  backgroundColor: "#e5e7eb",
  borderRadius: "6px",
  animation: "skeletonPulse 1.5s ease-in-out infinite",
  display: "inline-block",
};

const MetricValueSkeleton = ({ width = 140, height = 32 }) => (
  <span style={{ ...skeletonBase, width, height }} />
);

const BreakdownSkeleton = ({ rows = 3 }) => (
  <div
    className="d-flex flex-column align-items-center w-100"
    style={{ gap: 8, marginTop: 4 }}
  >
    {Array.from({ length: rows }).map((_, i) => (
      <span
        key={i}
        style={{ ...skeletonBase, width: "88%", height: 18, display: "block" }}
      />
    ))}
  </div>
);

const UnitCountOne = ({ dateRange }) => {
  const { user, loading: authLoading } = useUser();
  const [sectionLoading, setSectionLoading] = useState(INITIAL_SECTION_LOADING);
  const [error, setError] = useState({}); // error per card
  const [adSpend, setAdSpend] = useState(null);
  const [googleSpend, setGoogleSpend] = useState(null);
  const [facebookSpend, setFacebookSpend] = useState(null);
  const [totalCogs, setTotalCogs] = useState(null);
  const [googleCogs, setGoogleCogs] = useState(null);
  const [metaCogs, setMetaCogs] = useState(null);
  const [organicCogs, setOrganicCogs] = useState(null);
  const [totalSales, setTotalSales] = useState(null);
  const [totalSalesAfterGst, setTotalSalesAfterGst] = useState(null);
  const [googleSales, setGoogleSales] = useState(null);
  const [metaSales, setMetaSales] = useState(null);
  const [organicSales, setOrganicSales] = useState(null);
  const [totalNetProfit, setTotalNetProfit] = useState(null);
  const [googleNetProfit, setGoogleNetProfit] = useState(null);
  const [metaNetProfit, setMetaNetProfit] = useState(null);
  const [organicNetProfit, setOrganicNetProfit] = useState(null);
  const [totalOrders, setTotalOrders] = useState(null);
  const [googleOrders, setGoogleOrders] = useState(null);
  const [metaOrders, setMetaOrders] = useState(null);
  const [organicOrders, setOrganicOrders] = useState(null);
  const [grossRoas, setGrossRoas] = useState({
    total: null,
    google: null,
    meta: null,
  });
  const [netRoas, setNetRoas] = useState({
    total: null,
    google: null,
    meta: null,
  });
  const [beRoas, setBeRoas] = useState({
    total: null,
    google: null,
    meta: null,
  });
  const [inventoryEvents, setInventoryEvents] = useState(emptyInventoryEvents);
  const [paymentMethodCounts, setPaymentMethodCounts] = useState({});

  // Helper to sort breakdowns by value descending
  const sortBreakdown = (arr) =>
    arr.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  // Helper for consistent card content
  const getCardContent = (value, isLoading, cardError, formatter = (v) => v) => {
    if (isLoading) {
      return <MetricValueSkeleton width={value == null ? 140 : 100} height={28} />;
    }
    if (cardError)
      return (
        <span
          className="text-danger d-flex align-items-center gap-1 small fw-semibold"
          style={{
            lineHeight: 1.2,
            maxWidth: 120,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          <Icon
            icon="mdi:alert-circle"
            className="me-1"
            style={{ fontSize: 16 }}
          />
          Failed to load data
        </span>
      );
    if (value === null || value === undefined)
      return <span className="text-muted">—</span>;
    return formatter(value);
  };

  // Memoize the effective date range (no date selected => today live)
  const effectiveDateRange = useMemo(() => {
    const today = getToday();
    const hasSelection = dateRange?.startDate && dateRange?.endDate;
    return {
      startDate: hasSelection ? dateRange.startDate : `${today} 00`,
      endDate: hasSelection ? dateRange.endDate : `${today} 23`,
      hasSelection: Boolean(hasSelection),
    };
  }, [dateRange?.startDate, dateRange?.endDate]);

  // Combine "manual" payment method with "Razorpay" for display
  const combinedPaymentMethodCounts = useMemo(() => {
    if (!paymentMethodCounts || Object.keys(paymentMethodCounts).length === 0) {
      return {};
    }

    const combined = { ...paymentMethodCounts };
    const manualCount = combined["manual"] || 0;
    const razorpayCount = combined["Razorpay"] || 0;

    // Combine manual into Razorpay
    if (manualCount > 0 || razorpayCount > 0) {
      combined["Razorpay"] = razorpayCount + manualCount;
      // Remove manual from the object
      delete combined["manual"];
    }

    return combined;
  }, [paymentMethodCounts]);

  const resetMetricsState = () => {
    setAdSpend(null);
    setGoogleSpend(null);
    setFacebookSpend(null);
    setTotalCogs(null);
    setGoogleCogs(null);
    setMetaCogs(null);
    setOrganicCogs(null);
    setTotalSales(null);
    setTotalSalesAfterGst(null);
    setGoogleSales(null);
    setMetaSales(null);
    setOrganicSales(null);
    setTotalNetProfit(null);
    setGoogleNetProfit(null);
    setMetaNetProfit(null);
    setOrganicNetProfit(null);
    setTotalOrders(null);
    setGoogleOrders(null);
    setMetaOrders(null);
    setOrganicOrders(null);
    setGrossRoas({ total: null, google: null, meta: null });
    setNetRoas({ total: null, google: null, meta: null });
    setBeRoas({ total: null, google: null, meta: null });
    setInventoryEvents(emptyInventoryEvents);
    setPaymentMethodCounts({});
  };

  const mergeSectionErrors = (sectionErrors = {}) => {
    setError((prev) => {
      const next = { ...prev };
      const cardError = "Failed to load data";
      if (sectionErrors.adSpend) next.adSpend = cardError;
      if (sectionErrors.cogs) next.cogs = cardError;
      if (sectionErrors.sales) next.sales = cardError;
      if (sectionErrors.netProfit) next.netProfit = cardError;
      if (sectionErrors.orderCount) next.orderCount = cardError;
      if (sectionErrors.roas) next.roas = cardError;
      if (sectionErrors.inventoryEvents) next.inventoryEvents = cardError;
      if (sectionErrors.paymentMethodCount) next.paymentMethodCount = cardError;
      return next;
    });
  };

  const applyMetricsSection = (section, data) => {
    switch (section) {
      case "adSpend": {
        setAdSpend(data.adSpend?.totalSpend ?? null);
        setGoogleSpend(data.adSpend?.googleSpend ?? null);
        setFacebookSpend(data.adSpend?.facebookSpend ?? null);
        if (data.adSpend?.errors?.google) {
          setError((prev) => ({
            ...prev,
            googleAdSpend: "Google API unavailable",
          }));
        }
        mergeSectionErrors(data.errors);
        break;
      }
      case "cogs": {
        setTotalCogs(data.cogs?.totalCogs ?? null);
        setGoogleCogs(data.cogs?.googleCogs ?? null);
        setMetaCogs(data.cogs?.metaCogs ?? null);
        setOrganicCogs(data.cogs?.organicCogs ?? null);
        mergeSectionErrors(data.errors);
        break;
      }
      case "sales": {
        setTotalSales(data.sales?.totalSales ?? null);
        setTotalSalesAfterGst(data.sales?.total_sales_after_gst ?? null);
        setGoogleSales(data.sales?.googleSales ?? null);
        setMetaSales(data.sales?.metaSales ?? null);
        setOrganicSales(data.sales?.organicSales ?? null);
        mergeSectionErrors(data.errors);
        break;
      }
      case "netProfit": {
        setGoogleNetProfit(data.netProfit?.googleNetProfit ?? null);
        setMetaNetProfit(data.netProfit?.metaNetProfit ?? null);
        setOrganicNetProfit(data.netProfit?.organicNetProfit ?? null);
        setTotalNetProfit(
          data.netProfit?.net_profit_after_gst ??
            data.netProfit?.totalNetProfit ??
            null
        );
        mergeSectionErrors(data.errors);
        break;
      }
      case "orderCount": {
        const orders = data.orderCount;
        setTotalOrders(pickOrderMetric(orders, "total"));
        setGoogleOrders(pickOrderMetric(orders, "google"));
        setMetaOrders(pickOrderMetric(orders, "meta"));
        setOrganicOrders(pickOrderMetric(orders, "organic"));
        mergeSectionErrors(data.errors);
        break;
      }
      case "roas": {
        setGrossRoas({
          total: data.roas?.total?.grossRoas ?? null,
          google: data.roas?.google?.grossRoas ?? null,
          meta: data.roas?.meta?.grossRoas ?? null,
        });
        setNetRoas({
          total: data.roas?.total?.netRoas ?? null,
          google: data.roas?.google?.netRoas ?? null,
          meta: data.roas?.meta?.netRoas ?? null,
        });
        setBeRoas({
          total: data.roas?.total?.beRoas ?? null,
          google: data.roas?.google?.beRoas ?? null,
          meta: data.roas?.meta?.beRoas ?? null,
        });
        mergeSectionErrors(data.errors);
        break;
      }
      case "inventoryEvents": {
        const inv = data.inventoryEvents;
        const cancelCount = inv?.cancel?.count ?? null;
        const returnCount = inv?.return?.count ?? null;
        const totalEvents = inv?.total_events ?? null;
        setInventoryEvents({
          cancelCount,
          cancelQuantity: cancelCount,
          returnCount,
          returnQuantity: returnCount,
          totalEvents,
          totalQuantity: totalEvents,
        });
        mergeSectionErrors(data.errors);
        break;
      }
      case "paymentMethodCount": {
        setPaymentMethodCounts(data.paymentMethodCounts || {});
        mergeSectionErrors(data.errors);
        break;
      }
      default:
        break;
    }

    setSectionLoading((prev) => ({ ...prev, [section]: false }));
  };

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!user) {
      setSectionLoading(
        Object.fromEntries(
          Object.keys(INITIAL_SECTION_LOADING).map((k) => [k, false])
        )
      );
      return;
    }

    const { startDate, endDate } = effectiveDateRange;
    const startDateOnly = startDate.split(" ")[0];
    const endDateOnly = endDate.split(" ")[0];
    const isToday = isTodayRange(startDateOnly, endDateOnly);
    let pollInterval = null;
    let cancelled = false;

    const fetchMetrics = (showSkeleton = true) => {
      if (cancelled) return;

      if (showSkeleton) {
        setSectionLoading({ ...INITIAL_SECTION_LOADING });
        setError({});
        resetMetricsState();
      }

      const startDateTime = startDate.split(":")[0];
      const endDateTime = endDate.split(":")[0];

      fetchDashboardMetricsProgressive(
        apiClient,
        {
          isToday,
          startDateOnly,
          endDateOnly,
          startDateTime,
          endDateTime,
        },
        {
          onSection: (section, payload) => {
            if (!cancelled) {
              applyMetricsSection(section, payload);
            }
          },
        }
      );
    };

    fetchMetrics(true);

    if (isToday) {
      pollInterval = setInterval(() => fetchMetrics(false), 3 * 60 * 1000);
    }

    return () => {
      cancelled = true;
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [
    authLoading,
    user,
    effectiveDateRange.startDate,
    effectiveDateRange.endDate,
  ]);

  return (
    <div className="row row-cols-xxxl-5 row-cols-lg-3 row-cols-sm-2 row-cols-1 gy-4">
      {/* Card 1: Net Profit (with Google, Meta & Organic breakdown) */}
      <div className="col">
        <div
          className="card shadow-none border bg-gradient-start-10 h-100 position-relative"
          style={{ overflow: "visible" }}
        >
          <div className="card-body p-20">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <p className="fw-medium text-black mb-1">Net Profit</p>
                <h6
                  className="mb-0 display-6 fw-bold"
                  style={{
                    letterSpacing: "1px",
                    color: totalNetProfit < 0 ? "#d32f2f" : "#388e3c",
                  }}
                >
                  {getCardContent(
                    totalNetProfit,
                    sectionLoading.netProfit,
                    error.netProfit,
                    (v) => `Rs.${Number(v).toFixed(2)}`
                  )}
                </h6>
              </div>
              <div
                className="w-50-px h-50-px rounded-circle d-flex justify-content-center align-items-center shadow-lg"
                style={{
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                }}
              >
                <Icon icon="mdi:cash" className="text-white text-2xl mb-0" />
              </div>
            </div>
            <div
              className="my-3"
              style={{
                height: "1px",
                background: "linear-gradient(90deg, #43cea2 0%, #185a9d 100%)",
                opacity: 0.4,
              }}
            ></div>
            <div
              className="d-flex flex-column align-items-center mt-2"
              style={{ gap: 4, marginTop: 8 }}
            >
              {sortBreakdown([
                {
                  label: "Google",
                  icon: (
                    <Icon
                      icon="logos:google-icon"
                      style={{ fontSize: 20, minWidth: 40 }}
                    />
                  ),
                  value: googleNetProfit,
                  color: googleNetProfit < 0 ? "#d32f2f" : "#388e3c",
                  error: error.netProfit,
                },
                {
                  label: "Meta",
                  icon: (
                    <Icon
                      icon="logos:meta-icon"
                      style={{ fontSize: 20, minWidth: 40 }}
                    />
                  ),
                  value: metaNetProfit,
                  color: metaNetProfit < 0 ? "#d32f2f" : "#388e3c",
                  error: error.netProfit,
                },
                {
                  label: "Organic",
                  icon: (
                    <Icon
                      icon="mdi:leaf"
                      style={{ fontSize: 20, minWidth: 40, color: "#388e3c" }}
                    />
                  ),
                  value: organicNetProfit,
                  color: organicNetProfit < 0 ? "#d32f2f" : "#388e3c",
                  error: error.netProfit,
                },
              ]).map((item, idx) => (
                <div
                  className="d-flex align-items-center"
                  style={{ gap: 6, minWidth: 50 }}
                  key={item.label}
                >
                  {item.icon}
                  <span
                    className="fw-medium text-black mb-1"
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: "#222",
                      minWidth: 78,
                    }}
                  >
                    {item.label}
                  </span>
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 15,
                      minWidth: 90,
                      color: item.color,
                    }}
                  >
                    {getCardContent(
                      item.value,
                      sectionLoading.netProfit,
                      item.error,
                      (v) => `Rs.${Number(v).toFixed(2)}`
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* card end */}
      </div>
      {/* Card 2: Total Sales (with Google, Meta & Organic breakdown) */}
      <div className="col">
        <div
          className="card shadow-none border bg-gradient-start-8 h-100 position-relative"
          style={{ overflow: "visible" }}
        >
          <div className="card-body p-20">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <p className="fw-medium text-black mb-1">Total Sales</p>
                <h6
                  className="mb-0 display-6 fw-bold"
                  style={{ letterSpacing: "1px" }}
                >
                  {getCardContent(
                    totalSalesAfterGst ?? totalSales,
                    sectionLoading.sales,
                    error.sales,
                    (v) => `Rs.${Number(v).toFixed(2)}`
                  )}
                </h6>
              </div>
              <div
                className="w-50-px h-50-px rounded-circle d-flex justify-content-center align-items-center shadow-lg"
                style={{
                  background:
                    "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
                }}
              >
                <Icon icon="mdi:cart" className="text-white text-2xl mb-0" />
              </div>
            </div>
            <div
              className="my-3"
              style={{
                height: "1px",
                background: "linear-gradient(90deg, #43cea2 0%, #185a9d 100%)",
                opacity: 0.4,
              }}
            ></div>
            <div
              className="d-flex flex-column align-items-center mt-2"
              style={{ gap: 4, marginTop: 8 }}
            >
              {sortBreakdown([
                {
                  label: "Google",
                  icon: (
                    <Icon
                      icon="logos:google-icon"
                      style={{ fontSize: 20, minWidth: 40 }}
                    />
                  ),
                  value: googleSales,
                  error: error.sales,
                },
                {
                  label: "Meta",
                  icon: (
                    <Icon
                      icon="logos:meta-icon"
                      style={{ fontSize: 20, minWidth: 40 }}
                    />
                  ),
                  value: metaSales,
                  error: error.sales,
                },
                {
                  label: "Organic",
                  icon: (
                    <Icon
                      icon="mdi:leaf"
                      style={{ fontSize: 20, minWidth: 40, color: "#388e3c" }}
                    />
                  ),
                  value: organicSales,
                  error: error.sales,
                },
              ]).map((item, idx) => (
                <div
                  className="d-flex align-items-center"
                  style={{ gap: 6, minWidth: 50 }}
                  key={item.label}
                >
                  {item.icon}
                  <span
                    className="fw-medium text-black mb-1"
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: "#222",
                      minWidth: 78,
                    }}
                  >
                    {item.label}
                  </span>
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 15,
                      color: "#1976d2",
                      minWidth: 90,
                    }}
                  >
                    {getCardContent(
                      item.value,
                      sectionLoading.sales,
                      item.error,
                      (v) => `Rs.${Number(v).toFixed(2)}`
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* card end */}
      </div>
      {/* Card 3: Total Ad Spend (with Google & Meta breakdown) */}
      <div className="col">
        <div
          className="card shadow-none border bg-gradient-start-6 h-100 interactive-adspend-card position-relative"
          style={{ overflow: "visible" }}
        >
          <div className="card-body p-20">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <p className="fw-medium text-black mb-1">Total Ad Spend</p>
                <h6
                  className="mb-0 display-6 fw-bold"
                  style={{ letterSpacing: "1px" }}
                >
                  {getCardContent(
                    adSpend,
                    sectionLoading.adSpend,
                    error.adSpend,
                    (v) => `Rs.${Number(v).toFixed(2)}`
                  )}
                </h6>
              </div>
              <div
                className="w-50-px h-50-px rounded-circle d-flex justify-content-center align-items-center shadow-lg"
                style={{
                  background:
                    "linear-gradient(135deg, #f9d423 0%, #ff4e50 100%)",
                }}
              >
                <Icon
                  icon="mdi:currency-usd"
                  className="text-white text-2xl mb-0"
                />
              </div>
            </div>
            <div
              className="my-3"
              style={{
                height: "1px",
                background: "linear-gradient(90deg, #f9d423 0%, #ff4e50 100%)",
                opacity: 0.4,
              }}
            ></div>
            <div
              className="d-flex flex-column align-items-center mt-2"
              style={{ gap: 4, marginTop: 8 }}
            >
              {sortBreakdown([
                {
                  label: "Google",
                  icon: (
                    <Icon
                      icon="logos:google-icon"
                      style={{ fontSize: 20, minWidth: 40 }}
                    />
                  ),
                  value: googleSpend,
                  error: error.googleAdSpend || error.adSpend,
                },
                {
                  label: "Meta",
                  icon: (
                    <Icon
                      icon="logos:meta-icon"
                      style={{ fontSize: 20, minWidth: 40 }}
                    />
                  ),
                  value: facebookSpend,
                  error: error.adSpend,
                },
              ]).map((item, idx) => (
                <div
                  className="d-flex align-items-center"
                  style={{ gap: 6, minWidth: 50 }}
                  key={item.label}
                >
                  {item.icon}
                  <span
                    className="fw-medium text-black mb-1"
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: "#222",
                      minWidth: 78,
                    }}
                  >
                    {item.label}
                  </span>
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 15,
                      color: "#1976d2",
                      minWidth: 90,
                    }}
                  >
                    {getCardContent(
                      item.value,
                      sectionLoading.adSpend,
                      item.error,
                      (v) => `Rs.${Number(v).toFixed(2)}`
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* card end */}
      </div>
      {/* Card 4: Total COGS (with Google & Meta breakdown) */}
      <div className="col">
        <div
          className="card shadow-none border bg-gradient-start-7 h-100 position-relative"
          style={{ overflow: "visible" }}
        >
          <div className="card-body p-20">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <p className="fw-medium text-black mb-1">Total COGS</p>
                <h6
                  className="mb-0 display-6 fw-bold"
                  style={{ letterSpacing: "1px" }}
                >
                  {getCardContent(
                    totalCogs,
                    sectionLoading.cogs,
                    error.cogs,
                    (v) => `Rs.${Number(v).toFixed(2)}`
                  )}
                </h6>
              </div>
              <div
                className="w-50-px h-50-px rounded-circle d-flex justify-content-center align-items-center shadow-lg"
                style={{
                  background:
                    "linear-gradient(135deg, #43cea2 0%, #185a9d 100%)",
                }}
              >
                <Icon icon="mdi:finance" className="text-white text-2xl mb-0" />
              </div>
            </div>
            <div
              className="my-3"
              style={{
                height: "1px",
                background: "linear-gradient(90deg, #43cea2 0%, #185a9d 100%)",
                opacity: 0.4,
              }}
            ></div>
            <div
              className="d-flex flex-column align-items-center mt-2"
              style={{ gap: 4, marginTop: 8 }}
            >
              {sortBreakdown([
                {
                  label: "Google",
                  icon: (
                    <Icon
                      icon="logos:google-icon"
                      style={{ fontSize: 20, minWidth: 40 }}
                    />
                  ),
                  value: googleCogs,
                  error: error.cogs,
                },
                {
                  label: "Meta",
                  icon: (
                    <Icon
                      icon="logos:meta-icon"
                      style={{ fontSize: 20, minWidth: 40 }}
                    />
                  ),
                  value: metaCogs,
                  error: error.cogs,
                },
                {
                  label: "Organic",
                  icon: (
                    <Icon
                      icon="mdi:leaf"
                      style={{
                        fontSize: 20,
                        minWidth: 40,
                        color: "#388e3c",
                      }}
                    />
                  ),
                  value: organicCogs,
                  error: error.cogs,
                },
              ]).map((item, idx) => (
                <div
                  className="d-flex align-items-center"
                  style={{ gap: 6, minWidth: 50 }}
                  key={item.label}
                >
                  {item.icon}
                  <span
                    className="fw-medium text-black mb-1"
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: "#222",
                      minWidth: 78,
                    }}
                  >
                    {item.label}
                  </span>
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 15,
                      color: "#1976d2",
                      minWidth: 90,
                    }}
                  >
                    {getCardContent(
                      item.value,
                      sectionLoading.cogs,
                      item.error,
                      (v) => `Rs.${Number(v).toFixed(2)}`
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* card end */}
      </div>
      {/* Card 5: Total Orders (with Google, Meta & Organic breakdown) */}
      <div className="col">
        <div
          className="card shadow-none border h-100 position-relative"
          style={{ overflow: "visible", color: "#222" }}
        >
          <div className="card-body p-20">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <p className="fw-medium text-black mb-1">Total Orders</p>
                <h6
                  className="mb-0 display-6 fw-bold"
                  style={{ letterSpacing: "1px" }}
                >
                  {getCardContent(totalOrders, sectionLoading.orderCount, error.orderCount)}
                </h6>
              </div>
              <div
                className="w-50-px h-50-px rounded-circle d-flex justify-content-center align-items-center shadow-lg"
                style={{
                  background:
                    "linear-gradient(135deg, #f7971e 0%, #ffd200 100%)",
                }}
              >
                <Icon
                  icon="mdi:package-variant-closed"
                  className="text-white text-2xl mb-0"
                />
              </div>
            </div>
            <div
              className="my-3"
              style={{
                height: "1px",
                background: "linear-gradient(90deg, #f7971e 0%, #ffd200 100%)",
                opacity: 0.4,
              }}
            ></div>
            <div
              className="d-flex flex-column align-items-center mt-2"
              style={{ gap: 4, marginTop: 8 }}
            >
              {sortBreakdown([
                {
                  label: "Google",
                  icon: (
                    <Icon
                      icon="logos:google-icon"
                      style={{ fontSize: 20, minWidth: 40 }}
                    />
                  ),
                  value: googleOrders,
                  error: error.orderCount,
                },
                {
                  label: "Meta",
                  icon: (
                    <Icon
                      icon="logos:meta-icon"
                      style={{ fontSize: 20, minWidth: 40 }}
                    />
                  ),
                  value: metaOrders,
                  error: error.orderCount,
                },
                {
                  label: "Organic",
                  icon: (
                    <Icon
                      icon="mdi:leaf"
                      style={{ fontSize: 20, minWidth: 40, color: "#388e3c" }}
                    />
                  ),
                  value: organicOrders,
                  error: error.orderCount,
                },
              ]).map((item, idx) => (
                <div
                  className="d-flex align-items-center"
                  style={{ gap: 6, minWidth: 50 }}
                  key={item.label}
                >
                  {item.icon}
                  <span
                    className="fw-medium text-black mb-1"
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: "#222",
                      minWidth: 78,
                    }}
                  >
                    {item.label}
                  </span>
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 15,
                      color: "#1976d2",
                      minWidth: 90,
                    }}
                  >
                    {getCardContent(item.value, sectionLoading.orderCount, item.error)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* card end */}
      </div>
      {/* Card 6: Returns / Cancels */}
      <div className="col">
        <div
          className="card shadow-none border bg-gradient-start-14 h-100 position-relative"
          style={{ overflow: "visible" }}
        >
          <div className="card-body p-20">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <p className="fw-medium text-black mb-1">Returns / Cancels</p>
                <h6
                  className="mb-0 display-6 fw-bold"
                  style={{ letterSpacing: "1px" }}
                >
                  {getCardContent(
                    inventoryEvents.totalEvents,
                    sectionLoading.inventoryEvents,
                    error.inventoryEvents,
                    (v) => Number(v).toLocaleString()
                  )}
                </h6>
              </div>
              <div
                className="w-50-px h-50-px rounded-circle d-flex justify-content-center align-items-center shadow-lg"
                style={{
                  background:
                    "linear-gradient(135deg, #f37335 0%, #fdc830 100%)",
                }}
              >
                <Icon
                  icon="mdi:package-variant"
                  className="text-white text-2xl mb-0"
                />
              </div>
            </div>
            <div
              className="my-3"
              style={{
                height: "1px",
                background: "linear-gradient(90deg, #f37335 0%, #fdc830 100%)",
                opacity: 0.4,
              }}
            ></div>
            <div
              className="d-flex flex-column align-items-center mt-2"
              style={{ gap: 6, marginTop: 8, width: "100%" }}
            >
              {[
                {
                  label: "Cancelled Orders",
                  icon: (
                    <Icon
                      icon="mdi:cancel"
                      style={{ fontSize: 20, minWidth: 40, color: "#d32f2f" }}
                    />
                  ),
                  count: inventoryEvents.cancelCount,
                },
                {
                  label: "Returned Orders",
                  icon: (
                    <Icon
                      icon="mdi:backup-restore"
                      style={{ fontSize: 20, minWidth: 40, color: "#00796b" }}
                    />
                  ),
                  count: inventoryEvents.returnCount,
                },
              ].map((item) => (
                <div
                  className="d-flex align-items-center justify-content-between w-100 flex-wrap"
                  style={{ gap: 8 }}
                  key={item.label}
                >
                  <div
                    className="d-flex align-items-center"
                    style={{ gap: 6, minWidth: 0 }}
                  >
                    {item.icon}
                    <span
                      className="fw-medium text-black"
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        color: "#222",
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 16,
                      color: "#0d47a1",
                      textAlign: "right",
                    }}
                  >
                    {getCardContent(
                      item.count,
                      sectionLoading.inventoryEvents,
                      error.inventoryEvents,
                      (v) => Number(v).toLocaleString()
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* card end */}
      </div>
      {/* Card 7: Gross ROAS (with Google & Meta breakdown) */}
      <div className="col">
        <div
          className="card shadow-none border bg-gradient-start-11 h-100 position-relative"
          style={{ overflow: "visible" }}
        >
          <div className="card-body p-20">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <p className="fw-medium text-black mb-1">Gross ROAS</p>
                <h6
                  className="mb-0 display-6 fw-bold"
                  style={{ letterSpacing: "1px" }}
                >
                  {getCardContent(grossRoas.total, sectionLoading.roas, error.roas, (v) =>
                    Number(v).toFixed(2)
                  )}
                </h6>
              </div>
              <div
                className="w-50-px h-50-px rounded-circle d-flex justify-content-center align-items-center shadow-lg"
                style={{
                  background:
                    "linear-gradient(135deg, #f7971e 0%, #ffd200 100%)",
                }}
              >
                <Icon
                  icon="mdi:chart-bar"
                  className="text-white text-2xl mb-0"
                />
              </div>
            </div>
            <div
              className="my-3"
              style={{
                height: "1px",
                background: "linear-gradient(90deg, #f7971e 0%, #ffd200 100%)",
                opacity: 0.4,
              }}
            ></div>
            <div
              className="d-flex flex-column align-items-center mt-2"
              style={{ gap: 4, marginTop: 8 }}
            >
              {sortBreakdown([
                {
                  label: "Google",
                  icon: (
                    <Icon
                      icon="logos:google-icon"
                      style={{ fontSize: 20, minWidth: 40 }}
                    />
                  ),
                  value: grossRoas.google,
                  error: error.roas,
                },
                {
                  label: "Meta",
                  icon: (
                    <Icon
                      icon="logos:meta-icon"
                      style={{ fontSize: 20, minWidth: 40 }}
                    />
                  ),
                  value: grossRoas.meta,
                  error: error.roas,
                },
              ]).map((item, idx) => (
                <div
                  className="d-flex align-items-center"
                  style={{ gap: 6, minWidth: 50 }}
                  key={item.label}
                >
                  {item.icon}
                  <span
                    className="fw-medium text-black mb-1"
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: "#222",
                      minWidth: 78,
                    }}
                  >
                    {item.label}
                  </span>
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 15,
                      color: "#1976d2",
                      minWidth: 90,
                    }}
                  >
                    {getCardContent(item.value, sectionLoading.roas, item.error, (v) =>
                      Number(v).toFixed(2)
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* card end */}
      </div>
      {/* Card 8: Net ROAS (with Google & Meta breakdown) */}
      <div className="col">
        <div
          className="card shadow-none border bg-gradient-start-12 h-100 position-relative"
          style={{ overflow: "visible" }}
        >
          <div className="card-body p-20">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <p className="fw-medium text-black mb-1">Net ROAS</p>
                <h6
                  className="mb-0 display-6 fw-bold"
                  style={{ letterSpacing: "1px" }}
                >
                  {getCardContent(netRoas.total, sectionLoading.roas, error.roas, (v) =>
                    Number(v).toFixed(2)
                  )}
                </h6>
              </div>
              <div
                className="w-50-px h-50-px rounded-circle d-flex justify-content-center align-items-center shadow-lg"
                style={{
                  background:
                    "linear-gradient(135deg, #43cea2 0%, #185a9d 100%)",
                }}
              >
                <Icon
                  icon="mdi:chart-line"
                  className="text-white text-2xl mb-0"
                />
              </div>
            </div>
            <div
              className="my-3"
              style={{
                height: "1px",
                background: "linear-gradient(90deg, #43cea2 0%, #185a9d 100%)",
                opacity: 0.4,
              }}
            ></div>
            <div
              className="d-flex flex-column align-items-center mt-2"
              style={{ gap: 4, marginTop: 8 }}
            >
              {sortBreakdown([
                {
                  label: "Google",
                  icon: (
                    <Icon
                      icon="logos:google-icon"
                      style={{ fontSize: 20, minWidth: 40 }}
                    />
                  ),
                  value: netRoas.google,
                  error: error.roas,
                },
                {
                  label: "Meta",
                  icon: (
                    <Icon
                      icon="logos:meta-icon"
                      style={{ fontSize: 20, minWidth: 40 }}
                    />
                  ),
                  value: netRoas.meta,
                  error: error.roas,
                },
              ]).map((item, idx) => (
                <div
                  className="d-flex align-items-center"
                  style={{ gap: 6, minWidth: 50 }}
                  key={item.label}
                >
                  {item.icon}
                  <span
                    className="fw-medium text-black mb-1"
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: "#222",
                      minWidth: 78,
                    }}
                  >
                    {item.label}
                  </span>
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 15,
                      color: "#1976d2",
                      minWidth: 90,
                    }}
                  >
                    {getCardContent(item.value, sectionLoading.roas, item.error, (v) =>
                      Number(v).toFixed(2)
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* card end */}
      </div>
      {/* Card 9: BE ROAS (with Google & Meta breakdown) */}
      <div className="col">
        <div
          className="card shadow-none border bg-gradient-start-13 h-100 position-relative"
          style={{ overflow: "visible" }}
        >
          <div className="card-body p-20">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <p className="fw-medium text-black mb-1">BE ROAS</p>
                <h6
                  className="mb-0 display-6 fw-bold"
                  style={{ letterSpacing: "1px" }}
                >
                  {getCardContent(beRoas.total, sectionLoading.roas, error.roas, (v) =>
                    Number(v).toFixed(2)
                  )}
                </h6>
              </div>
              <div
                className="w-50-px h-50-px rounded-circle d-flex justify-content-center align-items-center shadow-lg"
                style={{
                  background:
                    "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
                }}
              >
                <Icon
                  icon="mdi:chart-areaspline"
                  className="text-white text-2xl mb-0"
                />
              </div>
            </div>
            <div
              className="my-3"
              style={{
                height: "1px",
                background: "linear-gradient(90deg, #11998e 0%, #38ef7d 100%)",
                opacity: 0.4,
              }}
            ></div>
            <div
              className="d-flex flex-column align-items-center mt-2"
              style={{ gap: 4, marginTop: 8 }}
            >
              {sortBreakdown([
                {
                  label: "Google",
                  icon: (
                    <Icon
                      icon="logos:google-icon"
                      style={{ fontSize: 20, minWidth: 40 }}
                    />
                  ),
                  value: beRoas.google,
                  error: error.roas,
                },
                {
                  label: "Meta",
                  icon: (
                    <Icon
                      icon="logos:meta-icon"
                      style={{ fontSize: 20, minWidth: 40 }}
                    />
                  ),
                  value: beRoas.meta,
                  error: error.roas,
                },
              ]).map((item, idx) => (
                <div
                  className="d-flex align-items-center"
                  style={{ gap: 6, minWidth: 50 }}
                  key={item.label}
                >
                  {item.icon}
                  <span
                    className="fw-medium text-black mb-1"
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: "#222",
                      minWidth: 78,
                    }}
                  >
                    {item.label}
                  </span>
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 15,
                      color: "#1976d2",
                      minWidth: 90,
                    }}
                  >
                    {getCardContent(item.value, sectionLoading.roas, item.error, (v) =>
                      Number(v).toFixed(2)
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* card end */}
      </div>
      {/* Card 10: Payment Method Count */}
      <div className="col">
        <div
          className="card shadow-none border bg-gradient-start-15 h-100 position-relative"
          style={{ overflow: "visible" }}
        >
          <div className="card-body p-20">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <p className="fw-medium text-black mb-1">Payment Methods</p>
                <h6
                  className="mb-0 display-6 fw-bold"
                  style={{ letterSpacing: "1px" }}
                >
                  {getCardContent(
                    Object.keys(combinedPaymentMethodCounts).length > 0
                      ? Object.values(combinedPaymentMethodCounts).reduce(
                          (a, b) => a + b,
                          0
                        )
                      : null,
                    sectionLoading.paymentMethodCount,
                    error.paymentMethodCount
                  )}
                </h6>
              </div>
              <div
                className="w-50-px h-50-px rounded-circle d-flex justify-content-center align-items-center shadow-lg"
                style={{
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                }}
              >
                <Icon
                  icon="mdi:credit-card-multiple"
                  className="text-white text-2xl mb-0"
                />
              </div>
            </div>
            <div
              className="my-3"
              style={{
                height: "1px",
                background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
                opacity: 0.4,
              }}
            ></div>
            <div
              className="d-flex flex-column align-items-center mt-2"
              style={{ gap: 8, marginTop: 8 }}
            >
              {sectionLoading.paymentMethodCount ? (
                <BreakdownSkeleton rows={4} />
              ) : error.paymentMethodCount ? (
                <span className="text-danger small">Failed to load</span>
              ) : Object.keys(combinedPaymentMethodCounts).length === 0 ? (
                <span className="text-muted">—</span>
              ) : (
                sortBreakdown(
                  Object.entries(combinedPaymentMethodCounts).map(
                    ([method, count]) => ({
                      label: method,
                      value: count,
                    })
                  )
                ).map((item) => (
                  <div
                    className="d-flex align-items-center justify-content-between w-100"
                    style={{ gap: 8 }}
                    key={item.label}
                  >
                    <span
                      className="fw-medium text-black"
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        color: "#222",
                      }}
                    >
                      {item.label}
                    </span>
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: 15,
                        color: "#1976d2",
                      }}
                    >
                      {item.value}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        {/* card end */}
      </div>
    </div>
  );
};

export default UnitCountOne;
