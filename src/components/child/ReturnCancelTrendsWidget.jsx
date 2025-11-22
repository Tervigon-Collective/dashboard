"use client";
import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import axios from "axios";
import { Icon } from "@iconify/react";
import { NEGATIVE_COLORS, WARNING_COLORS } from "@/utils/analyticsColors";

const ReactECharts = dynamic(
  () => import("echarts-for-react").catch((err) => {
    console.error("Failed to load echarts-for-react:", err);
    return { default: () => <div>Chart library failed to load. Please refresh the page.</div> };
  }),
  {
    ssr: false,
    loading: () => (
      <div className="d-flex justify-content-center align-items-center" style={{ height: "400px" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading chart...</span>
        </div>
      </div>
    ),
  }
);

const LOCAL_API_URL = "http://localhost:8000";

// Helper to format date as YYYY-MM-DD
function formatDate(date) {
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Get date range for different periods
const getDateRangeForPeriod = (period) => {
  const today = new Date();
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 0, 0, 0);
  
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  
  switch (period) {
    case "today":
      return [startOfDay, endOfDay];
    
    case "weekly":
      startOfDay.setDate(today.getDate() - 6);
      return [startOfDay, endOfDay];
    
    case "monthly":
      startOfDay.setDate(today.getDate() - 29);
      return [startOfDay, endOfDay];
    
    case "yearly":
      startOfDay.setFullYear(today.getFullYear() - 1);
      return [startOfDay, endOfDay];
    
    default:
      return [startOfDay, endOfDay];
  }
};

const ReturnCancelTrendsWidget = () => {
  const [trendData, setTrendData] = useState(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
  
  // Metric selection states
  const [selectedType, setSelectedType] = useState("both"); // "return", "cancel", "both"
  const [selectedMetric, setSelectedMetric] = useState("both"); // "count", "rate", "both"
  
  // Custom date range
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [useCustomDateRange, setUseCustomDateRange] = useState(false);

  // Calculate date range based on selected period or custom dates
  const dateRange = useMemo(() => {
    if (useCustomDateRange && customStartDate && customEndDate) {
      return {
        startDate: formatDate(customStartDate),
        endDate: formatDate(customEndDate),
      };
    }
    const range = getDateRangeForPeriod(selectedPeriod);
    return {
      startDate: formatDate(range[0]),
      endDate: formatDate(range[1]),
    };
  }, [selectedPeriod, useCustomDateRange, customStartDate, customEndDate]);

  // Note: total_orders is now included in the API response, so no separate fetch needed

  // Fetch returns-cancellations data from new API
  const fetchTrendData = async () => {
    if (!dateRange.startDate || !dateRange.endDate) return;

    setTrendLoading(true);
    setTrendError(null);

    try {
      // Fetch returns-cancellations data
      const response = await axios.get(
        `${LOCAL_API_URL}/api/v1/erp/sales/returns-cancellations`,
        {
          params: {
            start_date: dateRange.startDate,
            end_date: dateRange.endDate,
          },
        }
      );

      if (response.data && Array.isArray(response.data)) {
        // Sort by date (oldest first)
        const sortedData = [...response.data].sort((a, b) => 
          new Date(a.event_date) - new Date(b.event_date)
        );
        setTrendData(sortedData);
        // total_orders is now included in the API response, no need to fetch separately
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.error("Error fetching trend data:", err);
      setTrendError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load trend data"
      );
      setTrendData(null);
    } finally {
      setTrendLoading(false);
    }
  };

  useEffect(() => {
    fetchTrendData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const handleTimeFrameChange = (period) => {
    setSelectedPeriod(period);
  };

  // Calculate rates and aggregated metrics from trend data
  const processedTrendData = useMemo(() => {
    if (!trendData || trendData.length === 0) {
      return [];
    }

    return trendData.map((item) => {
      const returnedCount = item.returned_order_count || 0;
      const cancelledCount = item.cancelled_order_count || 0;
      const totalOrders = item.total_orders || 0;
      
      // Calculate rates using total_orders from API
      // Return Rate = (returned_order_count / total_orders) * 100
      // Cancellation Rate = (cancelled_order_count / total_orders) * 100
      const returnRate = totalOrders > 0 ? (returnedCount / totalOrders) * 100 : 0;
      const cancellationRate = totalOrders > 0 ? (cancelledCount / totalOrders) * 100 : 0;
      
      return {
        ...item,
        returnRate,
        cancellationRate,
        totalOrders,
      };
    });
  }, [trendData]);

  // Calculate aggregated metrics from processed trend data
  const aggregatedMetrics = useMemo(() => {
    if (!processedTrendData || processedTrendData.length === 0) {
      return {
        totalReturnOrders: 0,
        totalCancelOrders: 0,
        totalReturnQuantity: 0,
        totalCancelQuantity: 0,
        avgReturnRate: 0,
        avgCancellationRate: 0,
      };
    }
    
    const totals = processedTrendData.reduce(
      (acc, item) => ({
        totalReturnOrders: acc.totalReturnOrders + (item.returned_order_count || 0),
        totalCancelOrders: acc.totalCancelOrders + (item.cancelled_order_count || 0),
        totalReturnQuantity: acc.totalReturnQuantity + (item.returned_quantity || 0),
        totalCancelQuantity: acc.totalCancelQuantity + (item.cancelled_quantity || 0),
        totalReturnRate: acc.totalReturnRate + (item.returnRate || 0),
        totalCancellationRate: acc.totalCancellationRate + (item.cancellationRate || 0),
      }),
      {
        totalReturnOrders: 0,
        totalCancelOrders: 0,
        totalReturnQuantity: 0,
        totalCancelQuantity: 0,
        totalReturnRate: 0,
        totalCancellationRate: 0,
      }
    );

    return {
      totalReturnOrders: totals.totalReturnOrders,
      totalCancelOrders: totals.totalCancelOrders,
      totalReturnQuantity: totals.totalReturnQuantity,
      totalCancelQuantity: totals.totalCancelQuantity,
      avgReturnRate: processedTrendData.length > 0 ? totals.totalReturnRate / processedTrendData.length : 0,
      avgCancellationRate: processedTrendData.length > 0 ? totals.totalCancellationRate / processedTrendData.length : 0,
    };
  }, [processedTrendData]);

  // Chart options for return and cancellation trends (time-series line chart)
  const metricsChartOption = useMemo(() => {
    if (!processedTrendData || processedTrendData.length === 0) {
      return {};
    }

    // Format dates for display
    const dates = processedTrendData.map((item) => {
      const date = new Date(item.event_date);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    });

    // Prepare data based on selected metrics
    const returnOrders = processedTrendData.map((p) => p.returned_order_count || 0);
    const cancelOrders = processedTrendData.map((p) => p.cancelled_order_count || 0);
    const returnRates = processedTrendData.map((p) => p.returnRate || 0);
    const cancellationRates = processedTrendData.map((p) => p.cancellationRate || 0);
    
    // Determine which series to show based on selections
    const series = [];
    const legendData = [];
    
    if (selectedType === "return" || selectedType === "both") {
      if (selectedMetric === "count" || selectedMetric === "both") {
        series.push({
          name: "Return Orders",
          type: "line",
          data: returnOrders,
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          lineStyle: {
            width: 2,
            color: WARNING_COLORS[0],
          },
          itemStyle: {
            color: WARNING_COLORS[0],
          },
          yAxisIndex: 0,
        });
        legendData.push(`Return Orders (Total: ${aggregatedMetrics.totalReturnOrders.toLocaleString()})`);
      }
      if (selectedMetric === "rate" || selectedMetric === "both") {
        series.push({
          name: "Return Rate",
          type: "line",
          data: returnRates,
          smooth: true,
          symbol: "none",
          showSymbol: false,
          lineStyle: {
            width: 2,
            type: "dashed",
            color: WARNING_COLORS[1],
          },
          yAxisIndex: 1,
        });
        legendData.push(`Return Rate (Avg: ${aggregatedMetrics.avgReturnRate.toFixed(2)}%)`);
      }
    }
    
    if (selectedType === "cancel" || selectedType === "both") {
      if (selectedMetric === "count" || selectedMetric === "both") {
        series.push({
          name: "Cancel Orders",
          type: "line",
          data: cancelOrders,
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          lineStyle: {
            width: 2,
            color: NEGATIVE_COLORS[0],
          },
          itemStyle: {
            color: NEGATIVE_COLORS[0],
          },
          yAxisIndex: 0,
        });
        legendData.push(`Cancel Orders (Total: ${aggregatedMetrics.totalCancelOrders.toLocaleString()})`);
      }
      if (selectedMetric === "rate" || selectedMetric === "both") {
        series.push({
          name: "Cancel Rate",
          type: "line",
          data: cancellationRates,
          smooth: true,
          symbol: "none",
          showSymbol: false,
          lineStyle: {
            width: 2,
            type: "dashed",
            color: NEGATIVE_COLORS[1],
          },
          yAxisIndex: 1,
        });
        legendData.push(`Cancel Rate (Avg: ${aggregatedMetrics.avgCancellationRate.toFixed(2)}%)`);
      }
    }

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" },
        formatter: function (params) {
          let result = `<div style="padding: 10px; background: white; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="font-weight: bold; font-size: 13px; margin-bottom: 8px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 6px;">
              ${params[0].axisValue}
            </div>`;
          params.forEach((param) => {
            const value = parseFloat(param.value || 0);
            const formattedValue = param.seriesName.includes("Rate") 
              ? `${value.toFixed(2)}%` 
              : value.toLocaleString();
            result += `<div style="display: flex; align-items: center; margin: 4px 0;">
              <span style="display:inline-block;margin-right:8px;border-radius:3px;width:12px;height:12px;background-color:${param.color};"></span>
              <span style="font-size: 12px;">${param.seriesName}: <strong style="color: #333;">${formattedValue}</strong></span>
            </div>`;
          });
          result += "</div>";
          return result;
        },
      },
      legend: {
        data: legendData,
        top: 5,
        left: 0,
        itemGap: 12,
        textStyle: { fontSize: 11 },
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "15%",
        top: "20%",
        containLabel: true,
      },
      dataZoom: [
        {
          type: "slider",
          show: true,
          xAxisIndex: [0],
          start: 0,
          end: 100,
          bottom: "5%",
          height: 20,
          handleIcon: "M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23.1h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z",
          handleSize: "80%",
          handleStyle: {
            color: "#fff",
            shadowBlur: 3,
            shadowColor: "rgba(0, 0, 0, 0.6)",
            shadowOffsetX: 2,
            shadowOffsetY: 2,
          },
          textStyle: {
            color: "#999",
            fontSize: 11,
          },
          borderColor: "#ccc",
        },
        {
          type: "inside",
          xAxisIndex: [0],
          start: 0,
          end: 100,
        },
      ],
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: dates,
        axisLabel: {
          rotate: dates.length > 10 ? 45 : 0,
          fontSize: 11,
        },
      },
      yAxis: [
        {
          type: "value",
          name: "Orders",
          position: "left",
          show: series.some(s => s.yAxisIndex === 0), // Show if any series uses this axis
          axisLabel: {
            formatter: function (value) {
              return value.toFixed(0);
            },
          },
        },
        {
          type: "value",
          name: "Rate (%)",
          position: "right",
          show: series.some(s => s.yAxisIndex === 1), // Show if any series uses this axis
          axisLabel: {
            formatter: function (value) {
              return value.toFixed(0) + "%";
            },
          },
        },
      ],
      series: series,
    };
  }, [processedTrendData, aggregatedMetrics, selectedType, selectedMetric]);

  return (
    <div className="card border-0 shadow-sm h-100">
      <div className="card-body">
        {/* Header with Title and Badges */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h6 className="mb-0" style={{ fontSize: "16px", fontWeight: "600", color: "#1f2937" }}>
            Return & Cancel Trends
          </h6>
          {!trendLoading && processedTrendData && processedTrendData.length > 0 && (
            <div className="d-flex gap-2">
              <span className="badge bg-warning text-dark" style={{ fontSize: "12px", padding: "6px 12px" }}>
                Returns: {aggregatedMetrics.totalReturnOrders} orders
              </span>
              <span className="badge bg-danger" style={{ fontSize: "12px", padding: "6px 12px" }}>
                Cancels: {aggregatedMetrics.totalCancelOrders} orders
              </span>
            </div>
          )}
        </div>

        {/* Filters Section */}
        <div className="mb-4">
          {/* Single Row: All Filters at Same Level */}
          <div className="d-flex flex-wrap gap-3 align-items-end">
            {/* Custom Date Range */}
            <div>
              <label className="form-label small fw-semibold mb-2 d-block" style={{ color: "#374151", fontSize: "12px" }}>
                Date Range
              </label>
              <div className="d-flex gap-2">
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={customStartDate ? formatDate(customStartDate) : ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      setCustomStartDate(new Date(e.target.value));
                      setUseCustomDateRange(true);
                    }
                  }}
                  placeholder="Start Date"
                  style={{ 
                    fontSize: "12px", 
                    height: "32px",
                    padding: "4px 8px",
                    width: "130px"
                  }}
                />
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={customEndDate ? formatDate(customEndDate) : ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      setCustomEndDate(new Date(e.target.value));
                      setUseCustomDateRange(true);
                    }
                  }}
                  placeholder="End Date"
                  style={{ 
                    fontSize: "12px", 
                    height: "32px",
                    padding: "4px 8px",
                    width: "130px"
                  }}
                />
              </div>
            </div>

            {/* Time Period Tabs */}
            <div>
              <label className="form-label small fw-semibold mb-2 d-block" style={{ color: "#374151", fontSize: "12px" }}>
                Time Period
              </label>
              <div className="d-flex align-items-center" style={{ 
                background: "#f9fafb", 
                padding: "3px", 
                borderRadius: "6px",
                border: "1px solid #e5e7eb",
                height: "32px"
              }}>
                <button
                  className="btn btn-link p-0 text-decoration-none"
                  onClick={() => {
                    handleTimeFrameChange("today");
                    setUseCustomDateRange(false);
                  }}
                  style={{
                    fontSize: "12px",
                    color: selectedPeriod === "today" && !useCustomDateRange ? "#1f2937" : "#6b7280",
                    fontWeight: selectedPeriod === "today" && !useCustomDateRange ? "600" : "400",
                    padding: "4px 10px",
                    border: "none",
                    background: selectedPeriod === "today" && !useCustomDateRange ? "#fff" : "transparent",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    borderRadius: "4px",
                    boxShadow: selectedPeriod === "today" && !useCustomDateRange ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                    height: "26px",
                    lineHeight: "18px",
                  }}
                >
                  Today
                </button>
                <span style={{ color: "#e5e7eb", margin: "0 1px", fontSize: "12px" }}>|</span>
                <button
                  className="btn btn-link p-0 text-decoration-none"
                  onClick={() => {
                    handleTimeFrameChange("weekly");
                    setUseCustomDateRange(false);
                  }}
                  style={{
                    fontSize: "12px",
                    color: selectedPeriod === "weekly" && !useCustomDateRange ? "#1f2937" : "#6b7280",
                    fontWeight: selectedPeriod === "weekly" && !useCustomDateRange ? "600" : "400",
                    padding: "4px 10px",
                    border: "none",
                    background: selectedPeriod === "weekly" && !useCustomDateRange ? "#fff" : "transparent",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    borderRadius: "4px",
                    boxShadow: selectedPeriod === "weekly" && !useCustomDateRange ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                    height: "26px",
                    lineHeight: "18px",
                  }}
                >
                  Weekly
                </button>
                <span style={{ color: "#e5e7eb", margin: "0 1px", fontSize: "12px" }}>|</span>
                <button
                  className="btn btn-link p-0 text-decoration-none"
                  onClick={() => {
                    handleTimeFrameChange("monthly");
                    setUseCustomDateRange(false);
                  }}
                  style={{
                    fontSize: "12px",
                    color: selectedPeriod === "monthly" && !useCustomDateRange ? "#1f2937" : "#6b7280",
                    fontWeight: selectedPeriod === "monthly" && !useCustomDateRange ? "600" : "400",
                    padding: "4px 10px",
                    border: "none",
                    background: selectedPeriod === "monthly" && !useCustomDateRange ? "#fff" : "transparent",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    borderRadius: "4px",
                    boxShadow: selectedPeriod === "monthly" && !useCustomDateRange ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                    height: "26px",
                    lineHeight: "18px",
                  }}
                >
                  Monthly
                </button>
                <span style={{ color: "#e5e7eb", margin: "0 1px", fontSize: "12px" }}>|</span>
                <button
                  className="btn btn-link p-0 text-decoration-none"
                  onClick={() => {
                    handleTimeFrameChange("yearly");
                    setUseCustomDateRange(false);
                  }}
                  style={{
                    fontSize: "12px",
                    color: selectedPeriod === "yearly" && !useCustomDateRange ? "#1f2937" : "#6b7280",
                    fontWeight: selectedPeriod === "yearly" && !useCustomDateRange ? "600" : "400",
                    padding: "4px 10px",
                    border: "none",
                    background: selectedPeriod === "yearly" && !useCustomDateRange ? "#fff" : "transparent",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    borderRadius: "4px",
                    boxShadow: selectedPeriod === "yearly" && !useCustomDateRange ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                    height: "26px",
                    lineHeight: "18px",
                  }}
                >
                  Yearly
                </button>
              </div>
            </div>

            {/* Type Selection Tabs */}
            <div>
              <label className="form-label small fw-semibold mb-2 d-block" style={{ color: "#374151", fontSize: "12px" }}>
                Type
              </label>
              <div className="d-flex align-items-center" style={{ 
                background: "#f9fafb", 
                padding: "3px", 
                borderRadius: "6px",
                border: "1px solid #e5e7eb",
                height: "32px"
              }}>
                <button
                  className="btn btn-link p-0 text-decoration-none"
                  onClick={() => setSelectedType("return")}
                  style={{
                    fontSize: "12px",
                    color: selectedType === "return" ? "#1f2937" : "#6b7280",
                    fontWeight: selectedType === "return" ? "600" : "400",
                    padding: "4px 10px",
                    border: "none",
                    background: selectedType === "return" ? "#fff" : "transparent",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    borderRadius: "4px",
                    boxShadow: selectedType === "return" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                    height: "26px",
                    lineHeight: "18px",
                  }}
                >
                  Return
                </button>
                <span style={{ color: "#e5e7eb", margin: "0 1px", fontSize: "12px" }}>|</span>
                <button
                  className="btn btn-link p-0 text-decoration-none"
                  onClick={() => setSelectedType("cancel")}
                  style={{
                    fontSize: "12px",
                    color: selectedType === "cancel" ? "#1f2937" : "#6b7280",
                    fontWeight: selectedType === "cancel" ? "600" : "400",
                    padding: "4px 10px",
                    border: "none",
                    background: selectedType === "cancel" ? "#fff" : "transparent",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    borderRadius: "4px",
                    boxShadow: selectedType === "cancel" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                    height: "26px",
                    lineHeight: "18px",
                  }}
                >
                  Cancel
                </button>
                <span style={{ color: "#e5e7eb", margin: "0 1px", fontSize: "12px" }}>|</span>
                <button
                  className="btn btn-link p-0 text-decoration-none"
                  onClick={() => setSelectedType("both")}
                  style={{
                    fontSize: "12px",
                    color: selectedType === "both" ? "#1f2937" : "#6b7280",
                    fontWeight: selectedType === "both" ? "600" : "400",
                    padding: "4px 10px",
                    border: "none",
                    background: selectedType === "both" ? "#fff" : "transparent",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    borderRadius: "4px",
                    boxShadow: selectedType === "both" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                    height: "26px",
                    lineHeight: "18px",
                  }}
                >
                  Both
                </button>
              </div>
            </div>

            {/* Metric Selection Tabs */}
            <div>
              <label className="form-label small fw-semibold mb-2 d-block" style={{ color: "#374151", fontSize: "12px" }}>
                Metric
              </label>
              <div className="d-flex align-items-center" style={{ 
                background: "#f9fafb", 
                padding: "3px", 
                borderRadius: "6px",
                border: "1px solid #e5e7eb",
                height: "32px"
              }}>
                <button
                  className="btn btn-link p-0 text-decoration-none"
                  onClick={() => setSelectedMetric("count")}
                  style={{
                    fontSize: "12px",
                    color: selectedMetric === "count" ? "#1f2937" : "#6b7280",
                    fontWeight: selectedMetric === "count" ? "600" : "400",
                    padding: "4px 10px",
                    border: "none",
                    background: selectedMetric === "count" ? "#fff" : "transparent",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    borderRadius: "4px",
                    boxShadow: selectedMetric === "count" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                    height: "26px",
                    lineHeight: "18px",
                  }}
                >
                  Count
                </button>
                <span style={{ color: "#e5e7eb", margin: "0 1px", fontSize: "12px" }}>|</span>
                <button
                  className="btn btn-link p-0 text-decoration-none"
                  onClick={() => setSelectedMetric("rate")}
                  style={{
                    fontSize: "12px",
                    color: selectedMetric === "rate" ? "#1f2937" : "#6b7280",
                    fontWeight: selectedMetric === "rate" ? "600" : "400",
                    padding: "4px 10px",
                    border: "none",
                    background: selectedMetric === "rate" ? "#fff" : "transparent",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    borderRadius: "4px",
                    boxShadow: selectedMetric === "rate" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                    height: "26px",
                    lineHeight: "18px",
                  }}
                >
                  Rate
                </button>
                <span style={{ color: "#e5e7eb", margin: "0 1px", fontSize: "12px" }}>|</span>
                <button
                  className="btn btn-link p-0 text-decoration-none"
                  onClick={() => setSelectedMetric("both")}
                  style={{
                    fontSize: "12px",
                    color: selectedMetric === "both" ? "#1f2937" : "#6b7280",
                    fontWeight: selectedMetric === "both" ? "600" : "400",
                    padding: "4px 10px",
                    border: "none",
                    background: selectedMetric === "both" ? "#fff" : "transparent",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    borderRadius: "4px",
                    boxShadow: selectedMetric === "both" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                    height: "26px",
                    lineHeight: "18px",
                  }}
                >
                  Both
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error Messages */}
        {trendError && (
          <div className="alert alert-danger d-flex align-items-center gap-2 mb-3">
            <Icon icon="mdi:alert-circle" className="fs-5" />
            <div>
              <strong>Error:</strong> {trendError}
            </div>
          </div>
        )}

        {/* Loading State */}
        {trendLoading && !trendData && (
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
            <div className="text-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3 text-muted">Loading data...</p>
            </div>
          </div>
        )}

        {/* Chart */}
        {!trendLoading && processedTrendData && processedTrendData.length > 0 && (
          <div style={{ marginTop: "8px" }}>
            <ReactECharts
              key={`${selectedType}-${selectedMetric}`}
              option={metricsChartOption}
              style={{ height: "400px", width: "100%" }}
              opts={{ renderer: "svg" }}
            />
          </div>
        )}

        {/* No Data State */}
        {!trendLoading && !trendError && (!processedTrendData || processedTrendData.length === 0) && (
          <div className="alert alert-info">
            <Icon icon="mdi:information" className="me-2" />
            No data available. Please adjust filters.
          </div>
        )}
      </div>
    </div>
  );
};

export default ReturnCancelTrendsWidget;

