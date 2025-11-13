"use client";
import React, { useEffect, useState, useMemo } from "react";
import { Icon } from "@iconify/react";
import config from "../../config";
import { apiClient } from "../../api/api";

// Utility to get today's date in YYYY-MM-DD format
const getToday = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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

const UnitCountOne = ({ dateRange }) => {
  const [adSpend, setAdSpend] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState({}); // error per card
  const [googleSpend, setGoogleSpend] = useState(null);
  const [facebookSpend, setFacebookSpend] = useState(null);
  const [totalCogs, setTotalCogs] = useState(null);
  const [googleCogs, setGoogleCogs] = useState(null);
  const [metaCogs, setMetaCogs] = useState(null);
  const [organicCogs, setOrganicCogs] = useState(null);
  const [totalSales, setTotalSales] = useState(null);
  const [googleSales, setGoogleSales] = useState(null);
  const [metaSales, setMetaSales] = useState(null);
  const [organicSales, setOrganicSales] = useState(null);
  const [totalNetProfit, setTotalNetProfit] = useState(null);
  const [googleNetProfit, setGoogleNetProfit] = useState(null);
  const [metaNetProfit, setMetaNetProfit] = useState(null);
  const [organicNetProfit, setOrganicNetProfit] = useState(null);
  const [totalQuantity, setTotalQuantity] = useState(null);
  const [googleQuantity, setGoogleQuantity] = useState(null);
  const [metaQuantity, setMetaQuantity] = useState(null);
  const [organicQuantity, setOrganicQuantity] = useState(null);
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

  // Helper to sort breakdowns by value descending
  const sortBreakdown = (arr) =>
    arr.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  // Helper for consistent card content
  const getCardContent = (value, loading, error, formatter = (v) => v) => {
    if (loading)
      return (
        <span className="text-muted">
          <span className="spinner-border spinner-border-sm me-1" /> Loading...
        </span>
      );
    if (error)
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

  // Memoize the effective date range
  const effectiveDateRange = useMemo(() => {
    const today = getToday();
    return {
      startDate: dateRange?.startDate || `${today} 00`,
      endDate: dateRange?.endDate || `${today} 23`,
    };
  }, [dateRange?.startDate, dateRange?.endDate]);

  useEffect(() => {
    setLoading(true);
    setError({});
    setAdSpend(null);
    setGoogleSpend(null);
    setFacebookSpend(null);
    setTotalCogs(null);
    setGoogleCogs(null);
    setMetaCogs(null);
    setOrganicCogs(null);
    setTotalSales(null);
    setGoogleSales(null);
    setMetaSales(null);
    setOrganicSales(null);
    setTotalNetProfit(null);
    setGoogleNetProfit(null);
    setMetaNetProfit(null);
    setOrganicNetProfit(null);
    setTotalQuantity(null);
    setGoogleQuantity(null);
    setMetaQuantity(null);
    setOrganicQuantity(null);
    setGrossRoas({ total: null, google: null, meta: null });
    setNetRoas({ total: null, google: null, meta: null });
    setBeRoas({ total: null, google: null, meta: null });
    setInventoryEvents(emptyInventoryEvents);

    const { startDate, endDate } = effectiveDateRange;
    const isToday = isTodayRange(startDate, endDate);

    if (isToday) {
      // Use existing endpoints for today's data
      let query = `?startDate=${startDate.split(" ")[0]}&endDate=${
        endDate.split(" ")[0]
      }`;

      Promise.allSettled([
        apiClient.get(`/api/ad_spend${query}`),
        apiClient.get(`/api/cogs${query}`),
        apiClient.get(`/api/sales${query}`),
        apiClient.get(`/api/net_profit${query}`),
        apiClient.get(`/api/order_count${query}`),
        apiClient.get(`/api/roas${query}`),
        apiClient.get(
          `/api/inventory-events/summary?start_date=${
            startDate.split(" ")[0]
          }&end_date=${endDate.split(" ")[0]}`
        ),
      ]).then((results) => {
        // ad_spend
        if (results[0].status === "fulfilled") {
          setAdSpend(results[0].value.data.totalSpend ?? null);
          setGoogleSpend(results[0].value.data.googleSpend ?? null);
          setFacebookSpend(results[0].value.data.facebookSpend ?? null);
        } else {
          setError((e) => ({ ...e, adSpend: "Failed to load data" }));
        }
        // cogs
        if (results[1].status === "fulfilled") {
          setTotalCogs(results[1].value.data.totalCogs ?? null);
          setGoogleCogs(results[1].value.data.googleCogs ?? null);
          setMetaCogs(results[1].value.data.metaCogs ?? null);
          setOrganicCogs(results[1].value.data.organicCogs ?? null);
        } else {
          setError((e) => ({ ...e, cogs: "Failed to load data" }));
        }
        // sales
        if (results[2].status === "fulfilled") {
          setTotalSales(results[2].value.data.totalSales ?? null);
          setGoogleSales(results[2].value.data.googleSales ?? null);
          setMetaSales(results[2].value.data.metaSales ?? null);
          setOrganicSales(results[2].value.data.organicSales ?? null);
        } else {
          setError((e) => ({ ...e, sales: "Failed to load data" }));
        }
        // net_profit
        if (results[3].status === "fulfilled") {
          // No longer set totalNetProfit from API, use formula below
          setGoogleNetProfit(results[3].value.data.googleNetProfit ?? null);
          setMetaNetProfit(results[3].value.data.metaNetProfit ?? null);
          setOrganicNetProfit(results[3].value.data.organicNetProfit ?? null);
        } else {
          setError((e) => ({ ...e, netProfit: "Failed to load data" }));
        }
        // order_count
        if (results[4].status === "fulfilled") {
          setTotalQuantity(results[4].value.data.totalQuantity ?? null);
          setGoogleQuantity(results[4].value.data.googleQuantity ?? null);
          setMetaQuantity(results[4].value.data.metaQuantity ?? null);
          setOrganicQuantity(results[4].value.data.organicQuantity ?? null);
        } else {
          setError((e) => ({ ...e, orderCount: "Failed to load data" }));
        }
        // roas
        if (results[5].status === "fulfilled") {
          setGrossRoas({
            total: results[5].value.data.total?.grossRoas ?? null,
            google: results[5].value.data.google?.grossRoas ?? null,
            meta: results[5].value.data.meta?.grossRoas ?? null,
          });
          setNetRoas({
            total: results[5].value.data.total?.netRoas ?? null,
            google: results[5].value.data.google?.netRoas ?? null,
            meta: results[5].value.data.meta?.netRoas ?? null,
          });
          setBeRoas({
            total: results[5].value.data.total?.beRoas ?? null,
            google: results[5].value.data.google?.beRoas ?? null,
            meta: results[5].value.data.meta?.beRoas ?? null,
          });
        } else {
          setError((e) => ({ ...e, roas: "Failed to load data" }));
        }
        // inventory events (returns / cancels)
        if (results[6].status === "fulfilled") {
          const payload = results[6].value.data?.data;
          setInventoryEvents({
            cancelCount: payload?.cancel?.count ?? null,
            cancelQuantity: payload?.cancel?.quantity ?? null,
            returnCount: payload?.return?.count ?? null,
            returnQuantity: payload?.return?.quantity ?? null,
            totalEvents: payload?.total_events ?? null,
            totalQuantity: payload?.total_quantity ?? null,
          });
        } else {
          setError((e) => ({
            ...e,
            inventoryEvents: "Failed to load data",
          }));
        }
        // Use correct net profit formula: total net profit = total sales - total cogs - total ad spend
        const totalSales = Number(
          results[2].status === "fulfilled"
            ? results[2].value.data.totalSales ?? 0
            : 0
        );
        const totalCogs = Number(
          results[1].status === "fulfilled"
            ? results[1].value.data.totalCogs ?? 0
            : 0
        );
        const totalAdSpend = Number(
          results[0].status === "fulfilled"
            ? results[0].value.data.totalSpend ?? 0
            : 0
        );
        setTotalNetProfit(totalSales - totalCogs - totalAdSpend);
        setLoading(false);
      });
    } else {
      // Use new hourly endpoints for historical data
      // Remove any minutes if present and just use hours
      const startDateTime = startDate.split(":")[0];
      const endDateTime = endDate.split(":")[0];

      Promise.allSettled([
        apiClient.get(
          `/api/ad_spend_by_hour?startDateTime=${startDateTime}&endDateTime=${endDateTime}`
        ),
        apiClient.get(
          `/api/sales_unitCost_by_hour?startDateTime=${startDateTime}&endDateTime=${endDateTime}`
        ),
        apiClient.get(
          `/api/inventory-events/summary?start_date=${
            startDate.split(" ")[0]
          }&end_date=${endDate.split(" ")[0]}`
        ),
      ])
        .then((results) => {
          // Handle ad spend data
          if (results[0].status === "fulfilled") {
            const adSpendData = results[0].value.data;
            setAdSpend(
              adSpendData.totals.facebookSpend +
                adSpendData.totals.googleSpend ?? null
            );
            setGoogleSpend(adSpendData.totals.googleSpend ?? null);
            setFacebookSpend(adSpendData.totals.facebookSpend ?? null);
          } else {
            setError((e) => ({ ...e, adSpend: "Failed to load data" }));
          }

          // Handle sales and COGS data
          if (results[1].status === "fulfilled") {
            const salesData = results[1].value.data.sum;
            setTotalSales(salesData.total_sales ?? null);
            setGoogleSales(salesData.google_sales ?? null);
            setMetaSales(salesData.meta_sales ?? null);
            setOrganicSales(salesData.organic_sales ?? null);

            setTotalCogs(salesData.unit_cost ?? null);
            setGoogleCogs(salesData.unit_cost_google ?? null);
            setMetaCogs(salesData.unit_cost_meta ?? null);

            // Set order counts
            setTotalQuantity(salesData.order_count ?? null);
            setGoogleQuantity(salesData.google_order_count ?? null);
            setMetaQuantity(salesData.meta_order_count ?? null);
            setOrganicQuantity(salesData.organic_order_count ?? null);

            // Calculate net profits using totals from ad spend
            const adSpendTotals = results[0].value.data.totals;
            const totalAdSpend =
              adSpendTotals.facebookSpend + adSpendTotals.googleSpend;
            const totalNetProfit =
              (salesData.total_sales ?? 0) -
              (salesData.unit_cost ?? 0) -
              totalAdSpend;
            const googleNetProfit =
              (salesData.google_sales ?? 0) -
              (salesData.unit_cost_google ?? 0) -
              adSpendTotals.googleSpend;
            const metaNetProfit =
              (salesData.meta_sales ?? 0) -
              (salesData.unit_cost_meta ?? 0) -
              adSpendTotals.facebookSpend;

            setTotalNetProfit(totalNetProfit);
            setGoogleNetProfit(googleNetProfit);
            setMetaNetProfit(metaNetProfit);

            // Calculate ROAS using totals
            if (totalAdSpend > 0) {
              setGrossRoas({
                total: salesData.total_sales / totalAdSpend,
                google:
                  adSpendTotals.googleSpend > 0
                    ? salesData.google_sales / adSpendTotals.googleSpend
                    : 0,
                meta:
                  adSpendTotals.facebookSpend > 0
                    ? salesData.meta_sales / adSpendTotals.facebookSpend
                    : 0,
              });
              // Net ROAS = (Total Sales - COGS) / Total Ad Spend
              setNetRoas({
                total:
                  (salesData.total_sales - salesData.unit_cost) / totalAdSpend,
                google:
                  adSpendTotals.googleSpend > 0
                    ? (salesData.google_sales - salesData.unit_cost_google) /
                      adSpendTotals.googleSpend
                    : 0,
                meta:
                  adSpendTotals.facebookSpend > 0
                    ? (salesData.meta_sales - salesData.unit_cost_meta) /
                      adSpendTotals.facebookSpend
                    : 0,
              });
              // Calculate BE ROAS = (COGS + Ad Spend) / Ad Spend
              setBeRoas({
                total: (salesData.unit_cost + totalAdSpend) / totalAdSpend,
                google:
                  adSpendTotals.googleSpend > 0
                    ? (salesData.unit_cost_google + adSpendTotals.googleSpend) /
                      adSpendTotals.googleSpend
                    : 0,
                meta:
                  adSpendTotals.facebookSpend > 0
                    ? (salesData.unit_cost_meta + adSpendTotals.facebookSpend) /
                      adSpendTotals.facebookSpend
                    : 0,
              });
            }
          } else {
            setError((e) => ({ ...e, sales: "Failed to load data" }));
          }

          // Handle inventory events summary
          if (results[2].status === "fulfilled") {
            const payload = results[2].value.data?.data;
            setInventoryEvents({
              cancelCount: payload?.cancel?.count ?? null,
              cancelQuantity: payload?.cancel?.quantity ?? null,
              returnCount: payload?.return?.count ?? null,
              returnQuantity: payload?.return?.quantity ?? null,
              totalEvents: payload?.total_events ?? null,
              totalQuantity: payload?.total_quantity ?? null,
            });
          } else {
            setError((e) => ({
              ...e,
              inventoryEvents: "Failed to load data",
            }));
          }

          setLoading(false);
        })
        .catch((err) => {
          setError((e) => ({ ...e, general: "Failed to load data" }));
          setLoading(false);
        });
    }
  }, [effectiveDateRange.startDate, effectiveDateRange.endDate]);

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
                    loading,
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
                      loading,
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
                    totalSales,
                    loading,
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
                      loading,
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
                    loading,
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
                  error: error.adSpend,
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
                      loading,
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
                    loading,
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
                      loading,
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
                  {getCardContent(totalQuantity, loading, error.orderCount)}
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
                  value: googleQuantity,
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
                  value: metaQuantity,
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
                  value: organicQuantity,
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
                    {getCardContent(item.value, loading, item.error)}
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
                    loading,
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
                  quantity: inventoryEvents.cancelQuantity,
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
                  quantity: inventoryEvents.returnQuantity,
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
                      loading,
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
                  {getCardContent(grossRoas.total, loading, error.roas, (v) =>
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
                    {getCardContent(item.value, loading, item.error, (v) =>
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
                  {getCardContent(netRoas.total, loading, error.roas, (v) =>
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
                    {getCardContent(item.value, loading, item.error, (v) =>
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
                  {getCardContent(beRoas.total, loading, error.roas, (v) =>
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
                    {getCardContent(item.value, loading, item.error, (v) =>
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
    </div>
  );
};

export default UnitCountOne;
