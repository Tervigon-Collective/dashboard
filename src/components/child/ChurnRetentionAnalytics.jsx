"use client";
import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import axios from "axios";
import { Icon } from "@iconify/react";
import { ANALYTICS_COLORS_COMPLETE, getPrioritizedColors, POSITIVE_COLORS, NEGATIVE_COLORS, WARNING_COLORS } from "@/utils/analyticsColors";

const ReactECharts = dynamic(
  () => import("echarts-for-react").catch((err) => {
    console.error("Failed to load echarts-for-react:", err);
    // Return a fallback component
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

const ChurnRetentionAnalytics = () => {
  return <CombinedAnalyticsSection />;
};


// Combined Analytics Section
const CombinedAnalyticsSection = () => {
  const [segmentationData, setSegmentationData] = useState(null);
  const [segmentationLoading, setSegmentationLoading] = useState(false);
  const [segmentationError, setSegmentationError] = useState(null);
  const [periodDays, setPeriodDays] = useState(90);

  const [trendData, setTrendData] = useState(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
  
  // Metric selection states
  const [selectedType, setSelectedType] = useState("both"); // "return", "cancel", "both"
  const [selectedMetric, setSelectedMetric] = useState("count"); // "count", "rate"
  
  // Custom date range
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [useCustomDateRange, setUseCustomDateRange] = useState(false);

  // Dropdown options
  const periodOptions = [30, 60, 90, 180, 365];
  const churnThresholdDays = periodDays;

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

  // Fetch total orders for rate calculation
  const [totalOrdersData, setTotalOrdersData] = useState(null);
  
  const fetchTotalOrders = async (startDate, endDate) => {
    try {
      const response = await axios.get(
        `${LOCAL_API_URL}/api/order_count`,
        {
          params: {
            startDate: startDate,
            endDate: endDate,
          },
        }
      );
      // Store daily order counts if available
      setTotalOrdersData(response.data);
    } catch (err) {
      console.warn("Could not fetch total orders for rate calculation:", err);
      setTotalOrdersData(null);
    }
  };

  // Fetch segmentation data
  const fetchSegmentationData = async () => {
    setSegmentationLoading(true);
    setSegmentationError(null);

    try {
      const response = await axios.get(
        `${LOCAL_API_URL}/api/v1/customers/segmentation`,
        {
          params: {
            period_days: periodDays,
            churn_threshold_days: churnThresholdDays,
          },
        }
      );

      if (response.data && response.data.segments) {
        setSegmentationData(response.data);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.error("Error fetching segmentation data:", err);
      setSegmentationError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load segmentation data"
      );
      setSegmentationData(null);
    } finally {
      setSegmentationLoading(false);
    }
  };

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
        
        // Also fetch total orders for rate calculation
        await fetchTotalOrders(dateRange.startDate, dateRange.endDate);
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

  // Fetch data on mount and when filters change
  useEffect(() => {
    fetchSegmentationData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodDays]);

  useEffect(() => {
    fetchTrendData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  // Handle period change
  const handlePeriodDaysChange = (value) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      setPeriodDays(numValue);
    }
  };

  const handleTimeFrameChange = (period) => {
    setSelectedPeriod(period);
  };

  // Chart options for pie chart
  const pieChartOption = useMemo(() => {
    if (!segmentationData || !segmentationData.segments || segmentationData.segments.length === 0) {
      return {};
    }

    const segments = segmentationData.segments;
    const colors = getPrioritizedColors(segments.length);
    
    const segmentColorMap = {
      "Churned": NEGATIVE_COLORS[0],
      "New Customers": POSITIVE_COLORS[0],
      "Returning": POSITIVE_COLORS[1],  
      "At Risk": WARNING_COLORS[0],
    };

    const chartData = segments.map((segment, index) => ({
      value: segment.customer_count,
      name: segment.segment_type,
      percentage: segment.percentage,
    }));

    const chartColors = segments.map((segment) => {
      for (const [key, color] of Object.entries(segmentColorMap)) {
        if (segment.segment_type.toLowerCase().includes(key.toLowerCase())) {
          return color;
        }
      }
      return colors[index];
    });

    return {
      tooltip: {
        trigger: "item",
        formatter: function (params) {
          return `
            <div style="padding: 10px; background: white; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <div style="font-weight: bold; font-size: 13px; margin-bottom: 8px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 6px;">
                ${params.name}
              </div>
              <div style="display: flex; align-items: center; margin: 4px 0;">
                <span style="display:inline-block;margin-right:8px;border-radius:3px;width:12px;height:12px;background-color:${params.color};"></span>
                <span style="font-size: 12px;">
                  Customers: <strong style="color: #333;">${params.value.toLocaleString()}</strong>
                </span>
              </div>
              <div style="font-size: 12px; color: #666; margin-top: 4px;">
                Percentage: <strong>${params.percent}%</strong>
              </div>
            </div>
          `;
        },
      },
      legend: {
        orient: "vertical",
        left: "left",
        top: "middle",
        textStyle: {
          fontSize: 12,
        },
        formatter: function (name) {
          const segment = segments.find((s) => s.segment_type === name);
          if (segment) {
            return `${name} (${segment.percentage.toFixed(1)}%)`;
          }
          return name;
        },
      },
      series: [
        {
          name: "Customer Segments",
          type: "pie",
          radius: ["40%", "70%"],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
            borderColor: "#fff",
            borderWidth: 2,
          },
          label: {
            show: true,
            formatter: function (params) {
              return `${params.name}\n${params.percent}%`;
            },
            fontSize: 11,
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 13,
              fontWeight: "bold",
            },
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: "rgba(0, 0, 0, 0.5)",
            },
          },
          labelLine: {
            show: true,
          },
          data: chartData,
          color: chartColors,
        },
      ],
    };
  }, [segmentationData]);

  // Calculate rates and aggregated metrics from trend data
  const processedTrendData = useMemo(() => {
    if (!trendData || trendData.length === 0) {
      return [];
    }

    // Calculate total orders per day if available, otherwise use sum of returned + cancelled as baseline
    return trendData.map((item) => {
      const returnedCount = item.returned_order_count || 0;
      const cancelledCount = item.cancelled_order_count || 0;
      const returnedQty = item.returned_quantity || 0;
      const cancelledQty = item.cancelled_quantity || 0;
      
      // Calculate rates
      // Note: For accurate rates, we'd need total orders per day from the API
      // For now, we calculate relative rates based on returned + cancelled events
      // This shows the proportion of returns vs cancellations
      const totalEvents = returnedCount + cancelledCount;
      
      // Calculate rates as percentage of total events (returned + cancelled)
      // This is a relative rate showing the distribution between returns and cancellations
      // For absolute rates (return_rate = returned / total_orders), you'd need total orders data
      const returnRate = totalEvents > 0 ? (returnedCount / totalEvents) * 100 : 0;
      const cancellationRate = totalEvents > 0 ? (cancelledCount / totalEvents) * 100 : 0;
      
      return {
        ...item,
        returnRate,
        cancellationRate,
        totalEvents,
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
        bottom: "10%",
        top: "20%",
        containLabel: true,
      },
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
          show: selectedMetric === "count" || selectedMetric === "both",
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
          show: selectedMetric === "rate" || selectedMetric === "both",
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
    <div className="card border-0 shadow-sm mt-4">
      <div className="card-body">
        {/* Filters Row */}
        <div className="d-flex flex-wrap justify-content-between align-items-start mb-3 gap-3">
          <div className="d-flex gap-3 align-items-center flex-wrap">
            <div>
              <label htmlFor="periodDays" className="form-label small fw-semibold mb-1">
                Analysis Period
              </label>
              <select
                className="form-select form-select-sm"
                id="periodDays"
                value={periodDays}
                onChange={(e) => handlePeriodDaysChange(e.target.value)}
                disabled={segmentationLoading}
                style={{ minWidth: "140px" }}
              >
                {periodOptions.map((option) => (
                  <option key={option} value={option}>
                    {option} days
                  </option>
                ))}
              </select>
              <small className="text-muted d-block mt-1" style={{ fontSize: "11px" }}>
                Churn threshold: {churnThresholdDays} days
              </small>
            </div>

            {/* Custom Date Range Toggle */}
            <div>
              <label className="form-label small fw-semibold mb-1">
                Date Range
              </label>
              <div className="d-flex align-items-center gap-2">
                <input
                  type="checkbox"
                  id="useCustomDateRange"
                  checked={useCustomDateRange}
                  onChange={(e) => {
                    setUseCustomDateRange(e.target.checked);
                    if (!e.target.checked) {
                      setCustomStartDate(null);
                      setCustomEndDate(null);
                    }
                  }}
                  className="form-check-input"
                />
                <label htmlFor="useCustomDateRange" className="form-check-label small">
                  Custom Range
                </label>
              </div>
              {useCustomDateRange && (
                <div className="d-flex gap-2 mt-2">
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={customStartDate ? formatDate(customStartDate) : ""}
                    onChange={(e) => {
                      if (e.target.value) {
                        setCustomStartDate(new Date(e.target.value));
                      }
                    }}
                    style={{ minWidth: "140px" }}
                  />
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={customEndDate ? formatDate(customEndDate) : ""}
                    onChange={(e) => {
                      if (e.target.value) {
                        setCustomEndDate(new Date(e.target.value));
                      }
                    }}
                    style={{ minWidth: "140px" }}
                  />
                </div>
              )}
            </div>

            {/* Type Selection Tabs */}
            <div>
              <label className="form-label small fw-semibold mb-1 d-block">
                Type
              </label>
              <div className="d-flex align-items-center">
                <button
                  className="btn btn-link p-0 text-decoration-none"
                  onClick={() => setSelectedType("return")}
                  style={{
                    fontSize: "14px",
                    color: selectedType === "return" ? "#1f2937" : "#9ca3af",
                    fontWeight: selectedType === "return" ? "600" : "400",
                    padding: "4px 8px",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    transition: "color 0.2s",
                  }}
                >
                  Return
                </button>
                <span style={{ color: "#e5e7eb", margin: "0 8px", fontSize: "14px" }}>|</span>
                <button
                  className="btn btn-link p-0 text-decoration-none"
                  onClick={() => setSelectedType("cancel")}
                  style={{
                    fontSize: "14px",
                    color: selectedType === "cancel" ? "#1f2937" : "#9ca3af",
                    fontWeight: selectedType === "cancel" ? "600" : "400",
                    padding: "4px 8px",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    transition: "color 0.2s",
                  }}
                >
                  Cancel
                </button>
                <span style={{ color: "#e5e7eb", margin: "0 8px", fontSize: "14px" }}>|</span>
                <button
                  className="btn btn-link p-0 text-decoration-none"
                  onClick={() => setSelectedType("both")}
                  style={{
                    fontSize: "14px",
                    color: selectedType === "both" ? "#1f2937" : "#9ca3af",
                    fontWeight: selectedType === "both" ? "600" : "400",
                    padding: "4px 8px",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    transition: "color 0.2s",
                  }}
                >
                  Both
                </button>
              </div>
            </div>

            {/* Metric Selection Tabs */}
            <div>
              <label className="form-label small fw-semibold mb-1 d-block">
                Metric
              </label>
              <div className="d-flex align-items-center">
                <button
                  className="btn btn-link p-0 text-decoration-none"
                  onClick={() => setSelectedMetric("count")}
                  style={{
                    fontSize: "14px",
                    color: selectedMetric === "count" ? "#1f2937" : "#9ca3af",
                    fontWeight: selectedMetric === "count" ? "600" : "400",
                    padding: "4px 8px",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    transition: "color 0.2s",
                  }}
                >
                  Count
                </button>
                <span style={{ color: "#e5e7eb", margin: "0 8px", fontSize: "14px" }}>|</span>
                <button
                  className="btn btn-link p-0 text-decoration-none"
                  onClick={() => setSelectedMetric("rate")}
                  style={{
                    fontSize: "14px",
                    color: selectedMetric === "rate" ? "#1f2937" : "#9ca3af",
                    fontWeight: selectedMetric === "rate" ? "600" : "400",
                    padding: "4px 8px",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    transition: "color 0.2s",
                  }}
                >
                  Rate
                </button>
                <span style={{ color: "#e5e7eb", margin: "0 8px", fontSize: "14px" }}>|</span>
                <button
                  className="btn btn-link p-0 text-decoration-none"
                  onClick={() => setSelectedMetric("both")}
                  style={{
                    fontSize: "14px",
                    color: selectedMetric === "both" ? "#1f2937" : "#9ca3af",
                    fontWeight: selectedMetric === "both" ? "600" : "400",
                    padding: "4px 8px",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    transition: "color 0.2s",
                  }}
                >
                  Both
                </button>
              </div>
            </div>
          </div>

          {/* Time Frame Selector */}
          <div className="d-flex align-items-center">
            <button
              className="btn btn-link p-0 text-decoration-none"
              onClick={() => handleTimeFrameChange("today")}
              style={{
                fontSize: "14px",
                color: selectedPeriod === "today" ? "#1f2937" : "#9ca3af",
                fontWeight: selectedPeriod === "today" ? "600" : "400",
                padding: "4px 8px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                transition: "color 0.2s",
              }}
            >
              Today
            </button>
            <span style={{ color: "#e5e7eb", margin: "0 8px", fontSize: "14px" }}>|</span>
            <button
              className="btn btn-link p-0 text-decoration-none"
              onClick={() => handleTimeFrameChange("weekly")}
              style={{
                fontSize: "14px",
                color: selectedPeriod === "weekly" ? "#1f2937" : "#9ca3af",
                fontWeight: selectedPeriod === "weekly" ? "600" : "400",
                padding: "4px 8px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                transition: "color 0.2s",
              }}
            >
              Weekly
            </button>
            <span style={{ color: "#e5e7eb", margin: "0 8px", fontSize: "14px" }}>|</span>
            <button
              className="btn btn-link p-0 text-decoration-none"
              onClick={() => handleTimeFrameChange("monthly")}
              style={{
                fontSize: "14px",
                color: selectedPeriod === "monthly" ? "#1f2937" : "#9ca3af",
                fontWeight: selectedPeriod === "monthly" ? "600" : "400",
                padding: "4px 8px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                transition: "color 0.2s",
              }}
            >
              Monthly
            </button>
            <span style={{ color: "#e5e7eb", margin: "0 8px", fontSize: "14px" }}>|</span>
            <button
              className="btn btn-link p-0 text-decoration-none"
              onClick={() => handleTimeFrameChange("yearly")}
              style={{
                fontSize: "14px",
                color: selectedPeriod === "yearly" ? "#1f2937" : "#9ca3af",
                fontWeight: selectedPeriod === "yearly" ? "600" : "400",
                padding: "4px 8px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                transition: "color 0.2s",
              }}
            >
              Yearly
            </button>
          </div>
        </div>

        {/* Error Messages */}
        {(segmentationError || trendError) && (
          <div className="alert alert-danger d-flex align-items-center gap-2 mb-3">
            <Icon icon="mdi:alert-circle" className="fs-5" />
            <div>
              <strong>Error:</strong> {segmentationError || trendError}
            </div>
          </div>
        )}

        {/* Loading State */}
        {(segmentationLoading || trendLoading) && (!segmentationData || !trendData) && (
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
            <div className="text-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3 text-muted">Loading data...</p>
            </div>
          </div>
        )}

        {/* Charts Row */}
        {!segmentationLoading && !trendLoading && (segmentationData || trendData) && (
          <div className="row g-4">
            {/* Customer Distribution Chart */}
            {segmentationData && (
              <div className="col-lg-6 col-md-12">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="mb-0" style={{ fontSize: "14px", fontWeight: "600" }}>
                        Customer Distribution
                      </h6>
                      <span className="badge bg-primary">
                        Total: {segmentationData.total_customers?.toLocaleString() || 0}
                      </span>
                    </div>
                    <ReactECharts
                      option={pieChartOption}
                      style={{ height: "400px", width: "100%" }}
                      opts={{ renderer: "svg" }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Return & Cancel Trends Chart */}
            {processedTrendData && processedTrendData.length > 0 && (
              <div className="col-lg-6 col-md-12">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="mb-0" style={{ fontSize: "14px", fontWeight: "600" }}>
                        Return & Cancel Trends
                      </h6>
                      <div className="d-flex gap-2 flex-wrap">
                        <span className="badge bg-warning text-dark">
                          Returns: {aggregatedMetrics.totalReturnOrders} orders
                        </span>
                        <span className="badge bg-danger">
                          Cancels: {aggregatedMetrics.totalCancelOrders} orders
                        </span>
                      </div>
                    </div>
                    <ReactECharts
                      option={metricsChartOption}
                      style={{ height: "400px", width: "100%" }}
                      opts={{ renderer: "svg" }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* No Data State */}
        {!segmentationLoading && !trendLoading && !segmentationError && !trendError && !segmentationData && !trendData && (
          <div className="alert alert-info">
            <Icon icon="mdi:information" className="me-2" />
            No data available. Please adjust filters.
          </div>
        )}
      </div>
    </div>
  );
};


export default ChurnRetentionAnalytics;

