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

  // Chart options for pie chart
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
    <div className="card border-0 shadow-sm h-100">
      <div className="card-body position-relative">
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
              Customer Distribution
            </h6>
          </div>
        </div>
        {/* Action Buttons */}
        <div className="position-absolute d-flex gap-2" style={{ top: "10px", right: "10px", zIndex: 1 }}>
          <InsightButton
            onClick={handleGetInsights}
            loading={insightsLoading}
            disabled={!segmentationData || !segmentationData.segments || segmentationData.segments.length === 0}
          />
        </div>
        {/* Filters */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex gap-3 align-items-center">
            <div>
              <label
                htmlFor="periodDays"
                className="form-label small fw-semibold mb-1"
              >
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
              <small
                className="text-muted d-block mt-1"
                style={{ fontSize: "11px" }}
              >
                Churn threshold: {churnThresholdDays} days
              </small>
            </div>
          </div>
        </div>

        {/* Error Messages */}
        {segmentationError && (
          <div className="alert alert-danger d-flex align-items-center gap-2 mb-3">
            <Icon icon="mdi:alert-circle" className="fs-5" />
            <div>
              <strong>Error:</strong> {segmentationError}
            </div>
          </div>
        )}

        {/* Loading State */}
        {segmentationLoading && !segmentationData && (
          <>
            {/* Filters Skeleton */}
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="d-flex gap-3 align-items-center">
                <div>
                  <div
                    className="skeleton"
                    style={{
                      height: "12px",
                      width: "120px",
                      backgroundColor: "#e5e7eb",
                      borderRadius: "4px",
                      animation: "skeletonPulse 1.5s ease-in-out infinite",
                      marginBottom: "8px",
                    }}
                  />
                  <div
                    className="skeleton"
                    style={{
                      height: "32px",
                      width: "140px",
                      backgroundColor: "#e5e7eb",
                      borderRadius: "6px",
                      animation: "skeletonPulse 1.5s ease-in-out infinite",
                    }}
                  />
                  <div
                    className="skeleton"
                    style={{
                      height: "11px",
                      width: "140px",
                      backgroundColor: "#e5e7eb",
                      borderRadius: "4px",
                      animation: "skeletonPulse 1.5s ease-in-out infinite",
                      marginTop: "4px",
                    }}
                  />
                </div>
              </div>
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
          </>
        )}

        {/* Chart */}
        {!segmentationLoading && segmentationData && (
          <>
            <div className="d-flex justify-content-end mb-3">
              <span className="badge bg-primary">
                Total: {segmentationData.total_customers?.toLocaleString() || 0}
              </span>
            </div>
            <ReactECharts
              option={pieChartOption}
              style={{ height: "400px", width: "100%" }}
              opts={{ renderer: "svg" }}
            />
          </>
        )}

        {/* No Data State */}
        {!segmentationLoading && !segmentationError && !segmentationData && (
          <div className="alert alert-info">
            <Icon icon="mdi:information" className="me-2" />
            No data available. Please adjust filters.
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
