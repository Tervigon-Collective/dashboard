"use client";
import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { Icon } from "@iconify/react";
import {
  getPrioritizedColors,
  POSITIVE_COLORS,
  NEGATIVE_COLORS,
  WARNING_COLORS,
} from "@/utils/analyticsColors";
import { apiClient } from "@/api/api";
import { useInsights } from "@/hook/useInsights";
import InsightsModal from "@/components/InsightsModal";
import InsightButton from "@/components/InsightButton";
import { buildCustomerSegmentationContext } from "@/utils/insightContexts";

const ReactECharts = dynamic(
  () =>
    import("echarts-for-react").catch((err) => {
      console.error("Failed to load echarts-for-react:", err);
      return {
        default: () => (
          <div>Chart library failed to load. Please refresh the page.</div>
        ),
      };
    }),
  {
    ssr: false,
    loading: () => (
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
    ),
  }
);

const CustomerDistributionWidget = () => {
  const [segmentationData, setSegmentationData] = useState(null);
  const [segmentationLoading, setSegmentationLoading] = useState(false);
  const [segmentationError, setSegmentationError] = useState(null);
  const [periodDays, setPeriodDays] = useState(90);
  const [showInsights, setShowInsights] = useState(false);

  // AI Insights hook
  const {
    loading: insightsLoading,
    insights,
    error: insightsError,
    generateInsightsStream,
    clearInsights,
  } = useInsights();

  // Dropdown options
  const periodOptions = [30, 60, 90, 180, 365];
  const churnThresholdDays = periodDays;

  // Fetch segmentation data
  const fetchSegmentationData = async () => {
    setSegmentationLoading(true);
    setSegmentationError(null);

    try {
      const response = await apiClient.get(`/api/v1/customers/segmentation`, {
        params: {
          period_days: periodDays,
          churn_threshold_days: churnThresholdDays,
        },
      });

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

  // Fetch data on mount and when filters change
  useEffect(() => {
    fetchSegmentationData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodDays]);

  // Handle period change
  const handlePeriodDaysChange = (value) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      setPeriodDays(numValue);
    }
  };

  // Chart options for pie chart - minimal design
  const pieChartOption = useMemo(() => {
    if (
      !segmentationData ||
      !segmentationData.segments ||
      segmentationData.segments.length === 0
    ) {
      return {};
    }

    const segments = segmentationData.segments;
    const colors = getPrioritizedColors(segments.length);

    const segmentColorMap = {
      Churned: NEGATIVE_COLORS[0],
      "New Customers": POSITIVE_COLORS[0],
      Returning: POSITIVE_COLORS[1],
      "At Risk": WARNING_COLORS[0],
    };

    const chartData = segments.map((segment, index) => ({
      value: segment.customer_count,
      name: segment.segment_type,
      percentage: segment.percentage,
    }));

    const chartColors = segments.map((segment, index) => {
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
                <span style="display:inline-block;margin-right:8px;border-radius:3px;width:12px;height:12px;background-color:${
                  params.color
                };"></span>
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
        show: false, // Hide legend - we'll show table instead
      },
      series: [
        {
          name: "Customer Segments",
          type: "pie",
          radius: ["50%", "80%"],
          center: ["50%", "50%"],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 4,
            borderColor: "#fff",
            borderWidth: 3,
          },
          label: {
            show: false,
          },
          labelLine: {
            show: false,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 15,
              shadowOffsetX: 0,
              shadowColor: "rgba(0, 0, 0, 0.3)",
            },
            scale: true,
            scaleSize: 5,
          },
          data: chartData,
          color: chartColors,
        },
      ],
    };
  }, [segmentationData]);

  // Handle AI Insights generation
  const handleGetInsights = async () => {
    if (!segmentationData || !segmentationData.segments || segmentationData.segments.length === 0) {
      alert("No data available to analyze. Please wait for data to load.");
      return;
    }

    // Open modal immediately with loading state
    setShowInsights(true);

    try {
      // Build context for insights
      const context = buildCustomerSegmentationContext(segmentationData, periodDays);

      // Prepare data for insights API
      const insightsData = {
        segmentation_data: segmentationData,
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

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body position-relative" style={{ padding: "12px" }}>
        {/* Title & Meta with Filters */}
        <div
          className="d-flex justify-content-between align-items-center"
          style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "6px", marginBottom: "6px" }}
        >
          <div>
            <h6
              className="mb-0"
              style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}
            >
              Customer Distribution
            </h6>
          </div>
          {/* Action Buttons and Filter */}
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <div className="d-flex align-items-center gap-2">
              <label
                htmlFor="periodDays"
                className="mb-0"
                style={{ fontSize: "12px", color: "#374151", whiteSpace: "nowrap", fontWeight: 500 }}
              >
                Analysis Period:
              </label>
              <select
                className="form-select form-select-sm"
                id="periodDays"
                value={periodDays}
                onChange={(e) => handlePeriodDaysChange(e.target.value)}
                disabled={segmentationLoading}
                style={{
                  width: "auto",
                  minWidth: "150px",
                  fontSize: "12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  height: "37px",
                  backgroundColor: "#fff",
                  color: "#111827",
                  fontWeight: 500,
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  cursor: "pointer",
                  paddingRight: "28px",
                }}
              >
                {periodOptions.map((option) => (
                  <option key={option} value={option}>
                    {option} days
                  </option>
                ))}
              </select>
            </div>
            <InsightButton
              onClick={handleGetInsights}
              loading={insightsLoading}
              disabled={!segmentationData || !segmentationData.segments || segmentationData.segments.length === 0}
            />
          </div>
        </div>

        {/* Error Messages */}
        {segmentationError && (
          <div 
            className="alert alert-danger d-flex align-items-center justify-content-center gap-2 mb-3"
          >
            <div className="text-center">
              <Icon icon="mdi:alert-circle" className="fs-4 mb-2" />
              <div>
                <strong>Error loading data:</strong>
                <div className="mt-2" style={{ fontSize: "13px" }}>
                  {segmentationError}
                </div>
                <button
                  className="btn btn-sm btn-outline-danger mt-3"
                  onClick={fetchSegmentationData}
                  style={{ fontSize: "12px" }}
                >
                  <Icon icon="mdi:refresh" className="me-1" />
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {segmentationLoading && !segmentationData && (
          <>
            {/* Title & Meta with Filters Skeleton */}
            <div
              className="d-flex justify-content-between align-items-center mb-3"
              style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}
            >
              <div>
                <div
                  className="skeleton"
                  style={{
                    height: "20px",
                    width: "180px",
                    backgroundColor: "#e5e7eb",
                    borderRadius: "4px",
                    animation: "skeletonPulse 1.5s ease-in-out infinite",
                  }}
                />
              </div>
              {/* Action Buttons & Filter Skeleton */}
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <div className="d-flex align-items-center gap-2">
                  <div
                    className="skeleton"
                    style={{
                      height: "12px",
                      width: "100px",
                      backgroundColor: "#e5e7eb",
                      borderRadius: "4px",
                      animation: "skeletonPulse 1.5s ease-in-out infinite",
                    }}
                  />
                  <div
                    className="skeleton"
                    style={{
                      height: "37px",
                      width: "150px",
                      backgroundColor: "#e5e7eb",
                      borderRadius: "6px",
                      animation: "skeletonPulse 1.5s ease-in-out infinite",
                    }}
                  />
                </div>
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
            </div>
            {/* Content Area Skeleton */}
            <div className="d-flex gap-2 flex-lg-row flex-column">
              <div style={{ flex: "1 1 50%", minWidth: 0 }}>
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
              <div style={{ flex: "1 1 50%", minWidth: 0 }}>
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
          </>
        )}

        {/* Chart and Table */}
        {!segmentationLoading && segmentationData && (
          <div className="d-flex gap-2 flex-lg-row flex-column" style={{ margin: 0 }}>
            {/* Chart - Left side */}
            <div style={{ flex: "1 1 50%", minWidth: 0 }}>
              <div className="d-flex flex-column">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <h6 className="mb-0" style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>
                    Distribution
                  </h6>
                  <span className="badge" style={{ 
                    fontSize: "11px", 
                    padding: "4px 10px",
                    backgroundColor: "#f3f4f6",
                    color: "#374151",
                    fontWeight: 600,
                    border: "1px solid #e5e7eb"
                  }}>
                    Total: {segmentationData.total_customers?.toLocaleString() || 0}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ReactECharts
                    option={pieChartOption}
                    style={{ height: "300px", width: "100%" }}
                    opts={{ renderer: "svg" }}
                  />
                </div>
              </div>
            </div>

            {/* Table - Right side */}
            <div style={{ flex: "1 1 50%", minWidth: 0 }}>
              <div className="d-flex flex-column">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <h6 className="mb-0" style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>
                    Customer Segments
                  </h6>
                </div>
                <div>
                  <table className="table mb-0" style={{ fontSize: "12px", width: "100%", margin: 0, borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={{ 
                          fontSize: "11px", 
                          fontWeight: 600, 
                          color: "#6b7280", 
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          padding: "6px 6px 6px 0",
                          borderBottom: "1px solid #e5e7eb",
                          background: "transparent"
                        }}>
                          Segment
                        </th>
                        <th style={{ 
                          fontSize: "11px", 
                          fontWeight: 600, 
                          color: "#6b7280", 
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          textAlign: "right",
                          padding: "6px",
                          borderBottom: "1px solid #e5e7eb",
                          background: "transparent",
                          width: "90px"
                        }}>
                          Count
                        </th>
                        <th style={{ 
                          fontSize: "11px", 
                          fontWeight: 600, 
                          color: "#6b7280", 
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          textAlign: "right",
                          padding: "6px 0 6px 6px",
                          borderBottom: "1px solid #e5e7eb",
                          background: "transparent",
                          width: "80px"
                        }}>
                          %
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {segmentationData.segments
                        .sort((a, b) => b.customer_count - a.customer_count)
                        .map((segment) => {
                          const segmentColorMap = {
                            Churned: NEGATIVE_COLORS[0],
                            "New Customers": POSITIVE_COLORS[0],
                            Returning: POSITIVE_COLORS[1],
                            "At Risk": WARNING_COLORS[0],
                          };
                          
                          let color = "#6b7280";
                          for (const [key, col] of Object.entries(segmentColorMap)) {
                            if (segment.segment_type.toLowerCase().includes(key.toLowerCase())) {
                              color = col;
                              break;
                            }
                          }

                          return (
                            <tr key={segment.segment_type} style={{ borderBottom: "1px solid #f3f4f6" }}>
                              <td style={{ padding: "6px 6px 6px 0", verticalAlign: "middle" }}>
                                <div className="d-flex align-items-center gap-2">
                                  <div
                                    style={{
                                      width: "8px",
                                      height: "8px",
                                      borderRadius: "2px",
                                      backgroundColor: color,
                                      flexShrink: 0,
                                    }}
                                  />
                                  <span style={{ fontSize: "12px", fontWeight: 500, color: "#111827" }}>
                                    {segment.segment_type}
                                  </span>
                                </div>
                              </td>
                              <td style={{ 
                                textAlign: "right", 
                                fontSize: "12px", 
                                color: "#374151",
                                padding: "6px",
                                verticalAlign: "middle"
                              }}>
                                {segment.customer_count.toLocaleString()}
                              </td>
                              <td style={{ 
                                textAlign: "right", 
                                fontSize: "12px", 
                                fontWeight: 600, 
                                color: "#111827",
                                padding: "6px 0 6px 6px",
                                verticalAlign: "middle"
                              }}>
                                {segment.percentage.toFixed(1)}%
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!segmentationLoading && !segmentationError && !segmentationData && (
          <div 
            className="alert alert-info d-flex align-items-center justify-content-center"
          >
            <div className="text-center">
              <Icon icon="mdi:information" className="me-2 fs-4" />
              <div className="mt-2">
                <strong>No data available.</strong>
                <div className="mt-1" style={{ fontSize: "13px" }}>
                  Please adjust filters or check your data connection.
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
      </div>
    </div>
  );
};

export default CustomerDistributionWidget;
