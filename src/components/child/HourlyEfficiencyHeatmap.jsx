"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { Icon } from "@iconify/react";
import {
  ROAS_HEATMAP_SCALE,
  RED_GRADIENT,
  GREEN_GRADIENT,
} from "@/utils/analyticsColors";
import { apiClient } from "@/api/api";
import { useInsights } from "@/hook/useInsights";
import InsightsModal from "@/components/InsightsModal";
import { buildHourlyEfficiencyContext } from "@/utils/insightContexts";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
});

// Helper to format date as YYYY-MM-DD
function formatDate(date) {
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper to format date as yyyy-mm-dd HH
function formatLocalISO(date) {
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}`;
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

// Get ROAS color based on value using analytics color palette
function getROASColor(roas) {
  if (roas < 0.5) {
    return RED_GRADIENT[6]; // Very dark red
  } else if (roas < 1.0) {
    return RED_GRADIENT[5]; // Red (bad)
  } else if (roas < 1.5) {
    return "#E8A87C"; // Soft orange (from analytics palette)
  } else if (roas < 2.0) {
    return "#F2B88C"; // Medium orange (neutral)
  } else if (roas < 2.5) {
    return GREEN_GRADIENT[3]; // Light green
  } else if (roas < 3.0) {
    return GREEN_GRADIENT[4]; // Medium green
  } else {
    return GREEN_GRADIENT[5]; // Dark green (good)
  }
}

const HourlyEfficiencyHeatmap = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedHour, setSelectedHour] = useState(null);
  const [hoveredHour, setHoveredHour] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false); // Expanded view state
  const [selectedPeriod, setSelectedPeriod] = useState("today"); // Time period selection
  const [internalDateRange, setInternalDateRange] = useState(null); // Internal date range state
  const [showInsights, setShowInsights] = useState(false); // AI Insights modal state
  const chartRef = useRef(null);
  
  // AI Insights hook
  const {
    loading: insightsLoading,
    insights,
    error: insightsError,
    generateInsightsStream,
    clearInsights,
  } = useInsights();

  // Initialize date range on mount
  useEffect(() => {
    const range = getDateRangeForPeriod(selectedPeriod);
    setInternalDateRange({
      startDate: formatLocalISO(range[0]),
      endDate: formatLocalISO(range[1]),
    });
  }, []);

  // Update date range when period changes
  useEffect(() => {
    const range = getDateRangeForPeriod(selectedPeriod);
    setInternalDateRange({
      startDate: formatLocalISO(range[0]),
      endDate: formatLocalISO(range[1]),
    });
  }, [selectedPeriod]);

  // Parse date range
  const effectiveDateRange = useMemo(() => {
    const today = new Date();
    const todayStr = formatDate(today);

    if (!internalDateRange?.startDate || !internalDateRange?.endDate) {
      return {
        startDate: todayStr,
        endDate: todayStr,
      };
    }

    const startDate = internalDateRange.startDate.split(" ")[0];
    const endDate = internalDateRange.endDate.split(" ")[0];

    return {
      startDate,
      endDate,
    };
  }, [internalDateRange]);

  // Handle period change
  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
  };

  useEffect(() => {
    setLoading(true);
    setError(null);

    const { startDate, endDate } = effectiveDateRange;

    if (!startDate || !endDate) {
      setLoading(false);
      return;
    }

    apiClient
      .get(
        `/api/v1/marketing/attribution/hourly-spend-sales/analytics?start_date=${startDate}&end_date=${endDate}`
      )
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching hourly data:", err);
        setError(
          err.response?.data?.message || err.message || "Failed to load data"
        );
        setLoading(false);
      });
  }, [effectiveDateRange.startDate, effectiveDateRange.endDate]);

  // Process data - aggregate by hour with organic data
  const hourlyData = useMemo(() => {
    if (!data || !data.hourly_data) {
      return {
        data: [],
        maxSpend: 0,
        maxOrganicOrders: 0,
        maxROAS: 0,
        minROAS: 0,
      };
    }

    // Initialize hourly aggregations (0-23 hours)
    const hourlyMap = {};
    for (let h = 0; h < 24; h++) {
      hourlyMap[h] = {
        hour: h,
        spend: 0,
        orders: 0,
        revenue: 0,
        organicOrders: 0,
        organicRevenue: 0,
      };
    }

    // Aggregate data by hour and channel
    data.hourly_data.forEach((item) => {
      const hour = item.hour;
      if (hourlyMap[hour] !== undefined) {
        hourlyMap[hour].spend += parseFloat(item.spend || 0);
        hourlyMap[hour].orders += parseFloat(item.orders_count || 0);
        hourlyMap[hour].revenue += parseFloat(item.revenue || 0);

        if (item.channel === "organic") {
          hourlyMap[hour].organicOrders += parseFloat(item.orders_count || 0);
          hourlyMap[hour].organicRevenue += parseFloat(item.revenue || 0);
        }
      }
    });

    // Build array with ROAS calculation
    const result = [];
    let maxSpend = 0;
    let maxOrganicOrders = 0;
    let maxROAS = 0;
    let minROAS = Infinity;

    for (let h = 0; h < 24; h++) {
      const roas =
        hourlyMap[h].spend > 0 ? hourlyMap[h].revenue / hourlyMap[h].spend : 0;

      result.push({
        hour: h,
        hourLabel: `${h}:00`,
        spend: hourlyMap[h].spend,
        orders: hourlyMap[h].orders,
        revenue: hourlyMap[h].revenue,
        roas: roas,
        organicOrders: hourlyMap[h].organicOrders,
        organicRevenue: hourlyMap[h].organicRevenue,
        color: getROASColor(roas),
      });

      maxSpend = Math.max(maxSpend, hourlyMap[h].spend);
      maxOrganicOrders = Math.max(maxOrganicOrders, hourlyMap[h].organicOrders);
      maxROAS = Math.max(maxROAS, roas);
      minROAS = Math.min(minROAS, roas);
    }

    return {
      data: result,
      maxSpend,
      maxOrganicOrders,
      maxROAS: maxROAS || 0,
      minROAS: minROAS === Infinity ? 0 : minROAS,
    };
  }, [data]);

  // ECharts option for treemap/heatmap style visualization
  const chartOption = useMemo(() => {
    if (
      !hourlyData ||
      !hourlyData.data ||
      !Array.isArray(hourlyData.data) ||
      hourlyData.data.length === 0
    ) {
      return {};
    }

    const { data: hourlyDataArray, maxSpend, maxOrganicOrders } = hourlyData;

    // Prepare treemap data (size = spend, color = ROAS)
    const treemapData = hourlyDataArray.map((item) => ({
      name: item.hourLabel || `${item.hour}:00`,
      value: item.spend || 0.01, // Minimum value to ensure visibility
      roas: item.roas || 0,
      orders: item.orders || 0,
      revenue: item.revenue || 0,
      organicOrders: item.organicOrders || 0,
      organicRevenue: item.organicRevenue || 0,
      hour: item.hour,
      itemStyle: {
        color: item.color || "#ccc",
        borderColor: "#fff",
        borderWidth: 2,
      },
    }));

    const option = {
      tooltip: {
        trigger: "item",
        formatter: function (params) {
          const data = params.data || {};
          const spend = data.value || 0;
          const orders = data.orders || 0;
          const revenue = data.revenue || 0;
          const roas = data.roas || 0;
          const organicOrders = data.organicOrders || 0;
          const organicRevenue = data.organicRevenue || 0;
          const color = (data.itemStyle && data.itemStyle.color) || "#666";

          return `<div style="padding: 12px; min-width: 220px; background: white; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
            <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #333;">
              ${data.name || "N/A"}
            </div>
            <hr style="margin: 6px 0; border: none; border-top: 1px solid #eee;"/>
            <div style="font-size: 12px; line-height: 1.6;">
              <div><strong>Spend:</strong> ₹${spend.toFixed(2)}</div>
              <div><strong>Orders:</strong> ${orders.toFixed(0)}</div>
              <div><strong>Revenue:</strong> ₹${revenue.toFixed(2)}</div>
              <div style="margin-top: 4px;"><strong>ROAS:</strong> <span style="color: ${color}; font-weight: bold;">${roas.toFixed(
            2
          )}×</span></div>
              <hr style="margin: 6px 0; border: none; border-top: 1px solid #eee;"/>
              <div style="font-size: 11px; color: #666;">
                <div>Organic Orders: ${organicOrders.toFixed(0)}</div>
                <div>Organic Revenue: ₹${organicRevenue.toFixed(2)}</div>
              </div>
            </div>
          </div>`;
        },
      },
      series: [
        {
          name: "Hourly Performance",
          type: "treemap",
          data: treemapData,
          roam: false,
          nodeClick: false,
          breadcrumb: {
            show: false,
          },
          label: {
            show: true,
            formatter: function (params) {
              const data = params.data;
              const organicIndicator = data.organicOrders > 0 ? "●" : "";
              return `${data.name}\n₹${data.value.toFixed(
                0
              )}\n${data.roas.toFixed(2)}×${
                organicIndicator ? "\n" + organicIndicator : ""
              }`;
            },
            fontSize: 11,
            fontWeight: "bold",
            color: "#333",
            rich: {
              title: {
                fontSize: 12,
                fontWeight: "bold",
              },
              organic: {
                fontSize: 14,
                color: "#fff",
                backgroundColor: "rgba(0,0,0,0.3)",
                borderRadius: 10,
                padding: [2, 4],
              },
            },
          },
          upperLabel: {
            show: false,
          },
          itemStyle: {
            borderColor: "#fff",
            borderWidth: 3,
            gapWidth: 2,
          },
          emphasis: {
            itemStyle: {
              borderColor: "#333",
              borderWidth: 4,
            },
            label: {
              fontSize: 13,
            },
          },
          visualDimension: 0, // Size by value (spend)
        },
      ],
    };

    return option;
  }, [hourlyData, selectedHour]);

  // Handle chart events for interactive buttons
  const onEvents = useMemo(() => {
    return {
      click: (params) => {
        if (
          params.componentType === "series" &&
          params.seriesType === "treemap"
        ) {
          setSelectedHour(params.data.hour);
        }
      },
      mouseover: (params) => {
        if (
          params.componentType === "series" &&
          params.seriesType === "treemap"
        ) {
          setHoveredHour(params.data.hour);
        }
      },
      mouseout: () => {
        setHoveredHour(null);
      },
    };
  }, []);

  // Get hour range string for action buttons
  const getHourRange = (startHour, endHour) => {
    const start = `${startHour.toString().padStart(2, "0")}:00`;
    const end = `${endHour.toString().padStart(2, "0")}:00`;
    return `${start}–${end} UTC`;
  };

  // Handle action button clicks
  const handlePauseHours = (startHour, endHour) => {
    // TODO: Implement API call to pause Meta ads for these hours
    console.log(`Pausing ads for ${getHourRange(startHour, endHour)}`);
    alert(
      `Pause action for ${getHourRange(
        startHour,
        endHour
      )} - API integration pending`
    );
  };

  const handleIncreaseBid = (hour) => {
    // TODO: Implement API call to increase bid by 20% for this hour
    console.log(`Increasing bid by 20% for hour ${hour}`);
    alert(
      `Increase bid +20% for ${hourlyData.data[hour]?.hourLabel} - API integration pending`
    );
  };

  // Handle AI Insights generation
  const handleGetInsights = async () => {
    if (!hourlyData || !hourlyData.data || hourlyData.data.length === 0) {
      alert("No data available to analyze. Please wait for data to load.");
      return;
    }

    // Open modal immediately with loading state
    setShowInsights(true);

    try {
      // Build context for insights
      const context = buildHourlyEfficiencyContext(
        hourlyData,
        effectiveDateRange.startDate,
        effectiveDateRange.endDate,
        selectedPeriod
      );

      // Prepare data for insights API (send aggregated hourly data)
      const insightsData = {
        hourly_data: hourlyData.data,
        summary: {
          total_spend: hourlyData.data.reduce((sum, item) => sum + (item.spend || 0), 0),
          total_revenue: hourlyData.data.reduce((sum, item) => sum + (item.revenue || 0), 0),
          total_orders: hourlyData.data.reduce((sum, item) => sum + (item.orders || 0), 0),
          max_roas: hourlyData.maxROAS,
          min_roas: hourlyData.minROAS,
        },
      };

      // Generate insights using streaming (modal is already open, will show loading then stream)
      await generateInsightsStream(insightsData, context);
    } catch (err) {
      // Error is handled by the hook and displayed in modal
    }
  };

  // Handle closing insights modal
  const handleCloseInsights = () => {
    setShowInsights(false);
    clearInsights();
  };

  if (loading) {
    return (
      <div className="card border-0 shadow-sm position-relative" style={{ overflow: "hidden" }}>
        <div className="card-body position-relative">
          {/* Title & Meta Skeleton */}
          <div
            className="d-flex justify-content-between align-items-start mb-3"
            style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "10px", paddingRight: "140px" }}
          >
            <div>
              <div
                className="skeleton"
                style={{
                  height: "20px",
                  width: "150px",
                  backgroundColor: "#e5e7eb",
                  borderRadius: "4px",
                  animation: "skeletonPulse 1.5s ease-in-out infinite",
                }}
              />
            </div>
          </div>
          {/* Action Buttons Skeleton */}
          <div
            className="position-absolute d-flex gap-2"
            style={{ top: "10px", right: "10px", zIndex: 1 }}
          >
            <div
              className="skeleton"
              style={{
                height: "28px",
                width: "100px",
                backgroundColor: "#e5e7eb",
                borderRadius: "4px",
                animation: "skeletonPulse 1.5s ease-in-out infinite",
              }}
            />
            <div
              className="skeleton"
              style={{
                height: "28px",
                width: "28px",
                backgroundColor: "#e5e7eb",
                borderRadius: "4px",
                animation: "skeletonPulse 1.5s ease-in-out infinite",
              }}
            />
          </div>

          {/* Time Period Selector Skeleton */}
          <div
            className="mb-3 d-flex align-items-center"
            style={{ borderBottom: "1px solid #e0e0e0", paddingBottom: "12px" }}
          >
            <div
              className="skeleton"
              style={{
                height: "24px",
                width: "60px",
                backgroundColor: "#e5e7eb",
                borderRadius: "4px",
                animation: "skeletonPulse 1.5s ease-in-out infinite",
                marginRight: "16px",
              }}
            />
            <div
              className="skeleton"
              style={{
                height: "24px",
                width: "70px",
                backgroundColor: "#e5e7eb",
                borderRadius: "4px",
                animation: "skeletonPulse 1.5s ease-in-out infinite",
                marginRight: "16px",
              }}
            />
            <div
              className="skeleton"
              style={{
                height: "24px",
                width: "80px",
                backgroundColor: "#e5e7eb",
                borderRadius: "4px",
                animation: "skeletonPulse 1.5s ease-in-out infinite",
                marginRight: "16px",
              }}
            />
            <div
              className="skeleton"
              style={{
                height: "24px",
                width: "70px",
                backgroundColor: "#e5e7eb",
                borderRadius: "4px",
                animation: "skeletonPulse 1.5s ease-in-out infinite",
              }}
            />
          </div>

          {/* Chart Area Skeleton */}
          <div
            className="skeleton"
            style={{
              height: "400px",
              width: "100%",
              backgroundColor: "#e5e7eb",
              borderRadius: "8px",
              animation: "skeletonPulse 1.5s ease-in-out infinite",
            }}
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger d-flex align-items-center gap-2">
        <Icon icon="mdi:alert-circle" className="fs-4" />
        <div>
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  if (
    !data ||
    !hourlyData ||
    !hourlyData.data ||
    hourlyData.data.length === 0
  ) {
    return (
      <div className="alert alert-info">
        <Icon icon="mdi:information" className="me-2" />
        No data available for the selected date range.
      </div>
    );
  }

  const currentHour = selectedHour !== null ? selectedHour : hoveredHour;
  const currentHourData =
    currentHour !== null &&
    hourlyData &&
    hourlyData.data &&
    hourlyData.data[currentHour]
      ? hourlyData.data[currentHour]
      : null;

  return (
    <>
      <div className="card border-0 shadow-sm position-relative">
        <div className="card-body">
          {/* Title & Meta */}
          <div
            className="d-flex justify-content-between align-items-start mb-3 pe-4"
            style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}
          >
            <div>
              <h6
                className="mb-0"
                style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}
              >
                ROAS Heatmap
              </h6>
            </div>
          </div>
          {/* Action Buttons - Expand & AI Insights */}
          <div
            className="position-absolute d-flex gap-2"
            style={{ top: "10px", right: "10px", zIndex: 1 }}
          >
            <button
              className="btn btn-sm btn-light border"
              onClick={handleGetInsights}
              disabled={insightsLoading || !hourlyData || !hourlyData.data || hourlyData.data.length === 0}
              style={{
                padding: "4px 8px",
                borderRadius: "4px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
              title="Get AI Insights"
            >
              {insightsLoading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm"
                    role="status"
                    aria-hidden="true"
                    style={{ width: "12px", height: "12px" }}
                  />
                  <span style={{ fontSize: "12px" }}>Analyzing...</span>
                </>
              ) : (
                <>
                  <Icon icon="mdi:lightbulb-on-outline" style={{ fontSize: "16px", color: "#FFA726" }} />
                  <span style={{ fontSize: "12px" }}>AI Insights</span>
                </>
              )}
            </button>
            <button
              className="btn btn-sm btn-light border"
              onClick={() => setIsExpanded(true)}
              style={{
                padding: "4px 8px",
                borderRadius: "4px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
              title="Expand graph"
            >
              <Icon icon="mdi:fullscreen" style={{ fontSize: "16px" }} />
            </button>
          </div>

          {/* Time Period Selector - Minimal format like reference */}
          <div
            className="mb-3 d-flex align-items-center"
            style={{ borderBottom: "1px solid #e0e0e0", paddingBottom: "12px" }}
          >
            <button
              className="btn btn-link p-0 text-decoration-none"
              onClick={() => handlePeriodChange("today")}
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
              onMouseEnter={(e) => {
                if (selectedPeriod !== "today")
                  e.target.style.color = "#6b7280";
              }}
              onMouseLeave={(e) => {
                if (selectedPeriod !== "today")
                  e.target.style.color = "#9ca3af";
              }}
            >
              Today
            </button>
            <span
              style={{ color: "#e5e7eb", margin: "0 8px", fontSize: "14px" }}
            >
              |
            </span>
            <button
              className="btn btn-link p-0 text-decoration-none"
              onClick={() => handlePeriodChange("weekly")}
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
              onMouseEnter={(e) => {
                if (selectedPeriod !== "weekly")
                  e.target.style.color = "#6b7280";
              }}
              onMouseLeave={(e) => {
                if (selectedPeriod !== "weekly")
                  e.target.style.color = "#9ca3af";
              }}
            >
              Weekly
            </button>
            <span
              style={{ color: "#e5e7eb", margin: "0 8px", fontSize: "14px" }}
            >
              |
            </span>
            <button
              className="btn btn-link p-0 text-decoration-none"
              onClick={() => handlePeriodChange("monthly")}
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
              onMouseEnter={(e) => {
                if (selectedPeriod !== "monthly")
                  e.target.style.color = "#6b7280";
              }}
              onMouseLeave={(e) => {
                if (selectedPeriod !== "monthly")
                  e.target.style.color = "#9ca3af";
              }}
            >
              Monthly
            </button>
            <span
              style={{ color: "#e5e7eb", margin: "0 8px", fontSize: "14px" }}
            >
              |
            </span>
            <button
              className="btn btn-link p-0 text-decoration-none"
              onClick={() => handlePeriodChange("yearly")}
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
              onMouseEnter={(e) => {
                if (selectedPeriod !== "yearly")
                  e.target.style.color = "#6b7280";
              }}
              onMouseLeave={(e) => {
                if (selectedPeriod !== "yearly")
                  e.target.style.color = "#9ca3af";
              }}
            >
              Yearly
            </button>
          </div>

          <div className="position-relative">
            <ReactECharts
              ref={chartRef}
              option={chartOption}
              style={{ height: "400px", width: "100%" }}
              opts={{ renderer: "svg" }}
              onEvents={onEvents}
            />

            {/* Action buttons panel */}
            {currentHourData && (
              <div
                className="position-absolute bg-white border rounded shadow-lg p-3"
                style={{
                  top: "20px",
                  right: "20px",
                  minWidth: "280px",
                  zIndex: 1000,
                  pointerEvents: "auto",
                }}
              >
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <strong className="small">
                    Actions for {currentHourData.hourLabel}
                  </strong>
                  <button
                    className="btn-close btn-close-sm"
                    onClick={() => {
                      setSelectedHour(null);
                      setHoveredHour(null);
                    }}
                  />
                </div>

                <div className="d-flex flex-column gap-2">
                  {currentHourData.roas < 1.0 &&
                    (() => {
                      const startHour = currentHourData.hour;
                      const endHour = (currentHourData.hour + 1) % 24;
                      const endHourLabel = `${endHour
                        .toString()
                        .padStart(2, "0")}:00`;
                      return (
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handlePauseHours(startHour, endHour)}
                        >
                          <Icon icon="mdi:pause" className="me-1" />
                          Pause {currentHourData.hourLabel}–{endHourLabel} UTC
                        </button>
                      );
                    })()}

                  {currentHourData.roas >= 2.5 && (
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => handleIncreaseBid(currentHourData.hour)}
                    >
                      <Icon icon="mdi:arrow-up" className="me-1" />
                      Increase Bid +20%
                    </button>
                  )}

                  <div className="small text-muted mt-2 pt-2 border-top">
                    <div>
                      <strong>ROAS:</strong>{" "}
                      <span
                        style={{
                          color: currentHourData.color,
                          fontWeight: "bold",
                        }}
                      >
                        {currentHourData.roas.toFixed(2)}×
                      </span>
                    </div>
                    <div>
                      <strong>Spend:</strong> ₹$
                      {currentHourData.spend.toFixed(2)}
                    </div>
                    <div>
                      <strong>Orders:</strong>{" "}
                      {currentHourData.orders.toFixed(0)}
                    </div>
                    <div>
                      <strong>Revenue:</strong> ₹$
                      {currentHourData.revenue.toFixed(2)}
                    </div>
                    <div className="mt-1 pt-1 border-top">
                      <strong>Organic:</strong>{" "}
                      {currentHourData.organicOrders.toFixed(0)} orders, ₹$
                      {currentHourData.organicRevenue.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Color Legend - Gradient bar like stock market heatmap */}
          <div className="mt-2">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
              <div className="d-flex align-items-center gap-2">
                <span className="small fw-semibold">ROAS Scale:</span>
                <div
                  style={{
                    width: "300px",
                    height: "20px",
                    background:
                      "linear-gradient(to right, #8b0000 0%, #d73027 12.5%, #fc8d59 25%, #fee08b 37.5%, #abdda4 50%, #66c2a5 62.5%, #1a9850 100%)",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                  }}
                />
                <div className="d-flex gap-1 small text-muted">
                  <span>0×</span>
                  <span className="ms-auto">3×+</span>
                </div>
              </div>

              <div className="d-flex align-items-center gap-2">
                <span className="small text-muted">
                  Hover over tiles to see organic orders & revenue
                </span>
              </div>
            </div>
          </div>

          {/* Footer details panel - shows selected hour info */}
          {currentHourData && (
            <div
              className="mt-2 p-2 bg-light rounded border"
              style={{ fontSize: "12px" }}
            >
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div>
                  <strong>{currentHourData.hourLabel}</strong> |
                  <span className="ms-2">
                    ROAS:{" "}
                    <span
                      style={{
                        color: currentHourData.color,
                        fontWeight: "bold",
                      }}
                    >
                      {currentHourData.roas.toFixed(2)}×
                    </span>
                  </span>
                </div>
                <div className="small text-muted">
                  Spend: ₹${currentHourData.spend.toFixed(2)} | Orders:{" "}
                  {currentHourData.orders.toFixed(0)} | Revenue: ₹$
                  {currentHourData.revenue.toFixed(2)}
                </div>
              </div>
            </div>
          )}

          <div className="mt-1 small text-muted" style={{ fontSize: "10px" }}>
            <strong>Threshold:</strong> Red &lt;1× | Yellow 1-2× | Green
            &gt;2.5×
          </div>
        </div>
      </div>

      {/* Expanded Modal */}
      {isExpanded && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="card border-0 shadow-lg"
            style={{
              width: "95%",
              maxWidth: "1400px",
              maxHeight: "95vh",
              backgroundColor: "white",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="card-body position-relative"
              style={{ maxHeight: "95vh", overflow: "auto" }}
            >
              {/* Title & Meta */}
              <div
                className="d-flex justify-content-between align-items-start mb-3 pe-4"
                style={{
                  borderBottom: "1px solid #f1f5f9",
                  paddingBottom: "10px",
                }}
              >
                <div>
                  <h6
                    className="mb-1"
                    style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}
                  >
                    ROAS Heatmap Control Board
                  </h6>
                  <p className="text-muted mb-0" style={{ fontSize: "11px" }}>
                    Hour-level profitability insights & action triggers
                  </p>
                </div>
              </div>
              {/* Action Buttons - AI Insights & Close */}
              <div
                className="position-absolute d-flex gap-2"
                style={{ top: "10px", right: "10px", zIndex: 10 }}
              >
                <button
                  className="btn btn-sm btn-light border"
                  onClick={handleGetInsights}
                  disabled={insightsLoading || !hourlyData || !hourlyData.data || hourlyData.data.length === 0}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                  title="Get AI Insights"
                >
                  {insightsLoading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm"
                        role="status"
                        aria-hidden="true"
                        style={{ width: "12px", height: "12px" }}
                      />
                      <span style={{ fontSize: "12px" }}>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Icon icon="mdi:lightbulb-on-outline" style={{ fontSize: "16px", color: "#FFA726" }} />
                      <span style={{ fontSize: "12px" }}>AI Insights</span>
                    </>
                  )}
                </button>
                <button
                  className="btn btn-sm btn-light border"
                  onClick={() => setIsExpanded(false)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  }}
                  title="Close expanded view"
                >
                  <Icon icon="mdi:close" style={{ fontSize: "18px" }} />
                </button>
              </div>

              {/* Expanded Chart Content */}
              <div style={{ marginTop: "40px" }}>
                {/* Time Period Selector - Minimal format like reference */}
                <div
                  className="mb-3 d-flex align-items-center"
                  style={{
                    borderBottom: "1px solid #e0e0e0",
                    paddingBottom: "12px",
                  }}
                >
                  <button
                    className="btn btn-link p-0 text-decoration-none"
                    onClick={() => handlePeriodChange("today")}
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
                    onMouseEnter={(e) => {
                      if (selectedPeriod !== "today")
                        e.target.style.color = "#6b7280";
                    }}
                    onMouseLeave={(e) => {
                      if (selectedPeriod !== "today")
                        e.target.style.color = "#9ca3af";
                    }}
                  >
                    Today
                  </button>
                  <span
                    style={{
                      color: "#e5e7eb",
                      margin: "0 8px",
                      fontSize: "14px",
                    }}
                  >
                    |
                  </span>
                  <button
                    className="btn btn-link p-0 text-decoration-none"
                    onClick={() => handlePeriodChange("weekly")}
                    style={{
                      fontSize: "14px",
                      color:
                        selectedPeriod === "weekly" ? "#1f2937" : "#9ca3af",
                      fontWeight: selectedPeriod === "weekly" ? "600" : "400",
                      padding: "4px 8px",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (selectedPeriod !== "weekly")
                        e.target.style.color = "#6b7280";
                    }}
                    onMouseLeave={(e) => {
                      if (selectedPeriod !== "weekly")
                        e.target.style.color = "#9ca3af";
                    }}
                  >
                    Weekly
                  </button>
                  <span
                    style={{
                      color: "#e5e7eb",
                      margin: "0 8px",
                      fontSize: "14px",
                    }}
                  >
                    |
                  </span>
                  <button
                    className="btn btn-link p-0 text-decoration-none"
                    onClick={() => handlePeriodChange("monthly")}
                    style={{
                      fontSize: "14px",
                      color:
                        selectedPeriod === "monthly" ? "#1f2937" : "#9ca3af",
                      fontWeight: selectedPeriod === "monthly" ? "600" : "400",
                      padding: "4px 8px",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (selectedPeriod !== "monthly")
                        e.target.style.color = "#6b7280";
                    }}
                    onMouseLeave={(e) => {
                      if (selectedPeriod !== "monthly")
                        e.target.style.color = "#9ca3af";
                    }}
                  >
                    Monthly
                  </button>
                  <span
                    style={{
                      color: "#e5e7eb",
                      margin: "0 8px",
                      fontSize: "14px",
                    }}
                  >
                    |
                  </span>
                  <button
                    className="btn btn-link p-0 text-decoration-none"
                    onClick={() => handlePeriodChange("yearly")}
                    style={{
                      fontSize: "14px",
                      color:
                        selectedPeriod === "yearly" ? "#1f2937" : "#9ca3af",
                      fontWeight: selectedPeriod === "yearly" ? "600" : "400",
                      padding: "4px 8px",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (selectedPeriod !== "yearly")
                        e.target.style.color = "#6b7280";
                    }}
                    onMouseLeave={(e) => {
                      if (selectedPeriod !== "yearly")
                        e.target.style.color = "#9ca3af";
                    }}
                  >
                    Yearly
                  </button>
                </div>

                <div className="position-relative">
                  <ReactECharts
                    ref={chartRef}
                    option={chartOption}
                    style={{
                      height: "70vh",
                      width: "100%",
                      minHeight: "500px",
                    }}
                    opts={{ renderer: "svg" }}
                    onEvents={onEvents}
                  />

                  {/* Action buttons panel */}
                  {currentHourData && (
                    <div
                      className="position-absolute bg-white border rounded shadow-lg p-3"
                      style={{
                        top: "20px",
                        right: "20px",
                        minWidth: "280px",
                        zIndex: 1000,
                        pointerEvents: "auto",
                      }}
                    >
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <strong className="small">
                          Actions for {currentHourData.hourLabel}
                        </strong>
                        <button
                          className="btn-close btn-close-sm"
                          onClick={() => {
                            setSelectedHour(null);
                            setHoveredHour(null);
                          }}
                        />
                      </div>

                      <div className="d-flex flex-column gap-2">
                        {currentHourData.roas < 1.0 &&
                          (() => {
                            const startHour = currentHourData.hour;
                            const endHour = (currentHourData.hour + 1) % 24;
                            const endHourLabel = `${endHour
                              .toString()
                              .padStart(2, "0")}:00`;
                            return (
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() =>
                                  handlePauseHours(startHour, endHour)
                                }
                              >
                                <Icon icon="mdi:pause" className="me-1" />
                                Pause {currentHourData.hourLabel}–{endHourLabel}{" "}
                                UTC
                              </button>
                            );
                          })()}

                        {currentHourData.roas >= 2.5 && (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() =>
                              handleIncreaseBid(currentHourData.hour)
                            }
                          >
                            <Icon icon="mdi:arrow-up" className="me-1" />
                            Increase Bid +20%
                          </button>
                        )}

                        <div className="small text-muted mt-2 pt-2 border-top">
                          <div>
                            <strong>ROAS:</strong>{" "}
                            <span
                              style={{
                                color: currentHourData.color,
                                fontWeight: "bold",
                              }}
                            >
                              {currentHourData.roas.toFixed(2)}×
                            </span>
                          </div>
                          <div>
                            <strong>Spend:</strong> ₹
                            {currentHourData.spend.toFixed(2)}
                          </div>
                          <div>
                            <strong>Orders:</strong>{" "}
                            {currentHourData.orders.toFixed(0)}
                          </div>
                          <div>
                            <strong>Revenue:</strong> ₹
                            {currentHourData.revenue.toFixed(2)}
                          </div>
                          <div className="mt-1 pt-1 border-top">
                            <strong>Organic:</strong>{" "}
                            {currentHourData.organicOrders.toFixed(0)} orders, ₹
                            {currentHourData.organicRevenue.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Color Legend */}
                <div className="mt-2">
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                    <div className="d-flex align-items-center gap-2">
                      <span className="small fw-semibold">ROAS Scale:</span>
                      <div
                        style={{
                          width: "300px",
                          height: "20px",
                          background:
                            "linear-gradient(to right, #8b0000 0%, #d73027 12.5%, #fc8d59 25%, #fee08b 37.5%, #abdda4 50%, #66c2a5 62.5%, #1a9850 100%)",
                          borderRadius: "4px",
                          border: "1px solid #ddd",
                        }}
                      />
                      <div className="d-flex gap-1 small text-muted">
                        <span>0×</span>
                        <span className="ms-auto">3×+</span>
                      </div>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                      <span className="small text-muted">
                        Hover over tiles to see organic orders & revenue
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer details panel */}
                {currentHourData && (
                  <div
                    className="mt-2 p-2 bg-light rounded border"
                    style={{ fontSize: "12px" }}
                  >
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                      <div>
                        <strong>{currentHourData.hourLabel}</strong> |
                        <span className="ms-2">
                          ROAS:{" "}
                          <span
                            style={{
                              color: currentHourData.color,
                              fontWeight: "bold",
                            }}
                          >
                            {currentHourData.roas.toFixed(2)}×
                          </span>
                        </span>
                      </div>
                      <div className="small text-muted">
                        Spend: ₹{currentHourData.spend.toFixed(2)} | Orders:{" "}
                        {currentHourData.orders.toFixed(0)} | Revenue: ₹
                        {currentHourData.revenue.toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}

                <div
                  className="mt-1 small text-muted"
                  style={{ fontSize: "10px" }}
                >
                  <strong>Threshold:</strong> Red &lt;1× | Yellow 1-2× | Green
                  &gt;2.5×
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Insights Modal */}
      <InsightsModal
        open={showInsights}
        onClose={handleCloseInsights}
        insights={insights}
        loading={insightsLoading}
        error={insightsError}
      />
    </>
  );
};

export default HourlyEfficiencyHeatmap;
