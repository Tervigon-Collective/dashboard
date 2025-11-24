"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { Icon } from "@iconify/react";
import {
  ANALYTICS_COLORS_COMPLETE,
  getChannelColor,
  getSequentialColors,
  getPrioritizedMetricColor,
} from "@/utils/analyticsColors";
import { apiClient } from "@/api/api";

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

// Calculate rolling average
function calculateRollingAverage(data, windowSize = 3) {
  if (data.length === 0) return [];
  const result = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(data.length, i + Math.ceil(windowSize / 2));
    const slice = data.slice(start, end);
    const avg = slice.reduce((sum, val) => sum + (val || 0), 0) / slice.length;
    result.push(avg);
  }
  return result;
}

// Use prioritized color palette for better contrast
// This function now uses the selectedMetrics array to assign colors with maximum contrast
const getMetricColor = (metricName, selectedMetrics) => {
  return getPrioritizedMetricColor(metricName, selectedMetrics);
};

const HourlySpendSalesGraph = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [xAxisType, setXAxisType] = useState("hour"); // "hour" or "date"
  const [zoomedDate, setZoomedDate] = useState(null); // Track zoomed date for hourly view
  const [selectedMetrics, setSelectedMetrics] = useState([
    "Total Spend",
    "Total Revenue",
  ]); // Default metrics
  const [aggregationType, setAggregationType] = useState("sum"); // "sum" or "average"
  const [isExpanded, setIsExpanded] = useState(false); // Expanded view state
  const [selectedPeriod, setSelectedPeriod] = useState("today"); // Time period selection
  const [internalDateRange, setInternalDateRange] = useState(null); // Internal date range state
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [useCustomDateRange, setUseCustomDateRange] = useState(false);
  const chartRef = useRef(null);

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

    // Use custom date range if enabled and dates are set
    if (useCustomDateRange && customStartDate && customEndDate) {
      // For hourly data, we need to set start to 00:00 and end to 23:00
      const start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customEndDate);
      end.setHours(23, 0, 0, 0);
      return {
        startDate: formatDate(start),
        endDate: formatDate(end),
      };
    }

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
  }, [internalDateRange, useCustomDateRange, customStartDate, customEndDate]);

  // Handle period change
  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    setUseCustomDateRange(false);
    setCustomStartDate(null);
    setCustomEndDate(null);
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

  // Get available dates
  const availableDates = useMemo(() => {
    if (!data || !data.hourly_data) return [];
    const dates = [...new Set(data.hourly_data.map((item) => item.date))];
    return dates.sort();
  }, [data]);

  // Process data for chart with all metrics
  const chartData = useMemo(() => {
    if (!data || !data.hourly_data) {
      return { categories: [], series: [] };
    }

    // Helper function to process data
    const processData = (processedData) => {
      const isHourly = xAxisType === "hour" || zoomedDate;
      const groupKey = isHourly ? "hour" : "date";

      const map = {};
      const periodCountMap = {}; // Track count of periods for averaging

      processedData.forEach((item) => {
        const key = item[groupKey];
        const channel = item.channel;

        if (!map[key]) {
          map[key] = {
            key,
            meta: { spend: 0, revenue: 0, orders: 0 },
            google: { spend: 0, revenue: 0, orders: 0 },
            organic: { spend: 0, revenue: 0, orders: 0 },
          };
          // Track unique periods for averaging
          if (isHourly) {
            // For hourly view: track unique dates per hour
            periodCountMap[key] = new Set();
          } else {
            // For date view: track unique hours per date
            periodCountMap[key] = new Set();
          }
        }

        if (map[key][channel]) {
          map[key][channel].spend += parseFloat(item.spend || 0);
          map[key][channel].revenue += parseFloat(item.revenue || 0);
          map[key][channel].orders += parseFloat(item.orders_count || 0);
        }

        // Track periods for averaging
        if (isHourly) {
          // Track unique dates for this hour
          periodCountMap[key].add(item.date);
        } else {
          // Track unique hours for this date
          periodCountMap[key].add(item.hour);
        }
      });

      const sortedKeys = Object.keys(map).sort((a, b) => {
        if (isHourly) return parseInt(a) - parseInt(b);
        return a.localeCompare(b);
      });

      const categories = sortedKeys.map((k) => (isHourly ? `${k}:00` : k));

      // Calculate all metrics
      const totalSpend = sortedKeys.map((k) => {
        return (
          parseFloat(map[k].meta.spend || 0) +
          parseFloat(map[k].google.spend || 0) +
          parseFloat(map[k].organic.spend || 0)
        );
      });

      const totalRevenue = sortedKeys.map((k) => {
        return (
          parseFloat(map[k].meta.revenue || 0) +
          parseFloat(map[k].google.revenue || 0) +
          parseFloat(map[k].organic.revenue || 0)
        );
      });

      const totalOrders = sortedKeys.map((k) => {
        return (
          parseFloat(map[k].meta.orders || 0) +
          parseFloat(map[k].google.orders || 0) +
          parseFloat(map[k].organic.orders || 0)
        );
      });

      // Calculate AOV (Average Order Value) = Revenue / Orders
      const aov = totalRevenue.map((rev, idx) => {
        return totalOrders[idx] > 0 ? rev / totalOrders[idx] : 0;
      });

      // Calculate ROAS (Return on Ad Spend) = Revenue / Spend
      const totalROAS = totalSpend.map((spend, idx) => {
        return spend > 0 ? totalRevenue[idx] / spend : 0;
      });

      const metaSpend = sortedKeys.map((k) =>
        parseFloat(map[k].meta.spend || 0)
      );
      const metaRevenue = sortedKeys.map((k) =>
        parseFloat(map[k].meta.revenue || 0)
      );
      const metaOrders = sortedKeys.map((k) =>
        parseFloat(map[k].meta.orders || 0)
      );
      const metaAOV = metaRevenue.map((rev, idx) => {
        return metaOrders[idx] > 0 ? rev / metaOrders[idx] : 0;
      });
      const metaROAS = metaSpend.map((spend, idx) => {
        return spend > 0 ? metaRevenue[idx] / spend : 0;
      });

      const googleSpend = sortedKeys.map((k) =>
        parseFloat(map[k].google.spend || 0)
      );
      const googleRevenue = sortedKeys.map((k) =>
        parseFloat(map[k].google.revenue || 0)
      );
      const googleOrders = sortedKeys.map((k) =>
        parseFloat(map[k].google.orders || 0)
      );
      const googleAOV = googleRevenue.map((rev, idx) => {
        return googleOrders[idx] > 0 ? rev / googleOrders[idx] : 0;
      });
      const googleROAS = googleSpend.map((spend, idx) => {
        return spend > 0 ? googleRevenue[idx] / spend : 0;
      });

      // Apply aggregation type
      const applyAggregation = (values) => {
        if (aggregationType === "average" && values.length > 0) {
          // Calculate average per period (hour or date)
          // For hourly view: divide by number of dates for that hour
          // For date view: divide by number of hours for that date
          return values.map((val, idx) => {
            const periodKey = sortedKeys[idx];
            const count = periodCountMap[periodKey]
              ? periodCountMap[periodKey].size
              : 1;
            return count > 0 ? val / count : 0;
          });
        }
        return values;
      };

      // Build all possible series with analytics colors
      const allSeries = [
        {
          name: "Total Spend",
          data: applyAggregation(totalSpend),
          color: getMetricColor("Total Spend", selectedMetrics),
        },
        {
          name: "Total Revenue",
          data: applyAggregation(totalRevenue),
          color: getMetricColor("Total Revenue", selectedMetrics),
        },
        {
          name: "Total Orders",
          data: applyAggregation(totalOrders),
          color: getMetricColor("Total Orders", selectedMetrics),
        },
        {
          name: "Total ROAS",
          data: applyAggregation(totalROAS),
          color: getMetricColor("Total ROAS", selectedMetrics),
        },
        {
          name: "AOV",
          data: applyAggregation(aov),
          color: getMetricColor("AOV", selectedMetrics),
        },
        {
          name: "Meta Spend",
          data: applyAggregation(metaSpend),
          color: getMetricColor("Meta Spend", selectedMetrics),
        },
        {
          name: "Meta Revenue",
          data: applyAggregation(metaRevenue),
          color: getMetricColor("Meta Revenue", selectedMetrics),
        },
        {
          name: "Meta Orders",
          data: applyAggregation(metaOrders),
          color: getMetricColor("Meta Orders", selectedMetrics),
        },
        {
          name: "Meta ROAS",
          data: applyAggregation(metaROAS),
          color: getMetricColor("Meta ROAS", selectedMetrics),
        },
        {
          name: "Meta AOV",
          data: applyAggregation(metaAOV),
          color: getMetricColor("Meta AOV", selectedMetrics),
        },
        {
          name: "Google Spend",
          data: applyAggregation(googleSpend),
          color: getMetricColor("Google Spend", selectedMetrics),
        },
        {
          name: "Google Revenue",
          data: applyAggregation(googleRevenue),
          color: getMetricColor("Google Revenue", selectedMetrics),
        },
        {
          name: "Google Orders",
          data: applyAggregation(googleOrders),
          color: getMetricColor("Google Orders", selectedMetrics),
        },
        {
          name: "Google ROAS",
          data: applyAggregation(googleROAS),
          color: getMetricColor("Google ROAS", selectedMetrics),
        },
        {
          name: "Google AOV",
          data: applyAggregation(googleAOV),
          color: getMetricColor("Google AOV", selectedMetrics),
        },
      ];

      // Filter series based on selected metrics
      const filteredSeries = allSeries.filter((s) =>
        selectedMetrics.includes(s.name)
      );

      // Calculate rolling average for the first selected metric
      let rollingAverageData = [];
      if (filteredSeries.length > 0) {
        rollingAverageData = calculateRollingAverage(filteredSeries[0].data);
      }

      return {
        categories,
        series: filteredSeries.map((s, idx) => ({
          name: s.name,
          type: "line",
          data: s.data,
          smooth: true,
          symbol: "none",
          showSymbol: false,
          lineStyle: {
            width: 2, // Reduced from 3
            color: s.color,
          },
          emphasis: {
            focus: "series",
          },
        })),
        rollingAverage: rollingAverageData,
      };
    };

    // If zoomed into a specific date, show hourly data for that date
    if (zoomedDate) {
      const filteredData = data.hourly_data.filter(
        (item) => item.date === zoomedDate
      );
      return processData(filteredData);
    }

    // Process all data based on xAxisType
    return processData(data.hourly_data);
  }, [data, xAxisType, zoomedDate, selectedMetrics, aggregationType]);

  // Determine metric types in selected metrics
  const hasCurrencyMetrics = useMemo(() => {
    return selectedMetrics.some(
      (m) => m.includes("Spend") || m.includes("Revenue") || m.includes("AOV")
    );
  }, [selectedMetrics]);

  const hasOrderMetrics = useMemo(() => {
    return selectedMetrics.some((m) => m.includes("Order"));
  }, [selectedMetrics]);

  const hasROASMetrics = useMemo(() => {
    return selectedMetrics.some((m) => m.includes("ROAS"));
  }, [selectedMetrics]);

  // ECharts option configuration
  const chartOption = useMemo(() => {
    // Determine which Y-axis to use for each series
    const currencySeries = chartData.series.filter(
      (s) =>
        s.name.includes("Spend") ||
        s.name.includes("Revenue") ||
        s.name.includes("AOV")
    );
    const orderSeries = chartData.series.filter((s) =>
      s.name.includes("Order")
    );
    const roasSeries = chartData.series.filter((s) => s.name.includes("ROAS"));

    // Assign Y-axis index to series
    const seriesWithYAxis = chartData.series.map((s) => {
      const isOrder = s.name.includes("Order");
      const isROAS = s.name.includes("ROAS");

      if (hasCurrencyMetrics && hasOrderMetrics) {
        // Dual Y-axis: currency/ROAS on left, orders on right
        return {
          ...s,
          yAxisIndex: isOrder ? 1 : 0,
        };
      } else if (hasROASMetrics && hasOrderMetrics && !hasCurrencyMetrics) {
        // Dual Y-axis: ROAS on left, orders on right
        return {
          ...s,
          yAxisIndex: isOrder ? 1 : 0,
        };
      } else if (hasROASMetrics && hasCurrencyMetrics && !hasOrderMetrics) {
        // Single Y-axis: both currency and ROAS (ROAS can share with currency)
        return {
          ...s,
          yAxisIndex: 0,
        };
      } else {
        // Single Y-axis
        return {
          ...s,
          yAxisIndex: 0,
        };
      }
    });

    // Build Y-axis configuration
    const yAxisConfig = [];

    if (
      hasCurrencyMetrics ||
      hasROASMetrics ||
      (!hasCurrencyMetrics && !hasOrderMetrics && !hasROASMetrics)
    ) {
      // Primary Y-axis for currency, ROAS, or default
      const axisName =
        hasROASMetrics && hasCurrencyMetrics
          ? "Amount (₹) / ROAS"
          : hasROASMetrics
          ? "ROAS"
          : hasCurrencyMetrics
          ? "Amount (₹)"
          : "Value";

      yAxisConfig.push({
        type: "value",
        name: axisName,
        nameLocation: "middle",
        nameGap: 45,
        position: "left",
        axisLabel: {
          formatter: function (value) {
            if (hasROASMetrics && !hasCurrencyMetrics) {
              // ROAS only: show as multiplier
              return value.toFixed(2) + "×";
            } else if (hasCurrencyMetrics) {
              // Currency: show as ₹
              if (value >= 1000) {
                return "₹" + (value / 1000).toFixed(1) + "k";
              }
              return "₹" + value.toFixed(0);
            }
            return value.toFixed(0);
          },
          fontSize: 10,
        },
        splitLine: {
          show: true,
          lineStyle: {
            type: "dashed",
            color: "#e0e0e0",
          },
        },
      });
    }

    if (hasOrderMetrics && (hasCurrencyMetrics || hasROASMetrics)) {
      // Secondary Y-axis for orders when both types are present
      yAxisConfig.push({
        type: "value",
        name: "Orders",
        nameLocation: "middle",
        nameGap: 45,
        position: "right",
        axisLabel: {
          formatter: function (value) {
            return value.toFixed(0);
          },
          fontSize: 10,
        },
        splitLine: {
          show: false, // Don't show split lines for secondary axis
        },
      });
    } else if (hasOrderMetrics && !hasCurrencyMetrics && !hasROASMetrics) {
      // Single Y-axis for orders only
      yAxisConfig[0] = {
        type: "value",
        name: "Orders",
        nameLocation: "middle",
        nameGap: 45,
        position: "left",
        axisLabel: {
          formatter: function (value) {
            return value.toFixed(0);
          },
          fontSize: 10,
        },
        splitLine: {
          show: true,
          lineStyle: {
            type: "dashed",
            color: "#e0e0e0",
          },
        },
      };
    }

    const option = {
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "cross",
        },
        formatter: function (params) {
          let result = `<div style="padding: 10px; background: white; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="font-weight: bold; font-size: 13px; margin-bottom: 8px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 6px;">
              ${params[0].axisValue}
            </div>`;
          params.forEach((param) => {
            const value = parseFloat(param.value || 0);
            const isCurrency =
              param.seriesName.includes("Spend") ||
              param.seriesName.includes("Revenue") ||
              param.seriesName.includes("AOV");
            const isOrder = param.seriesName.includes("Order");
            const isROAS = param.seriesName.includes("ROAS");
            const formattedValue = isROAS
              ? `${value.toFixed(2)}×`
              : isCurrency
              ? `₹${value.toFixed(2)}`
              : isOrder
              ? value.toFixed(0)
              : value.toFixed(2);

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
        data: chartData.series.map((s) => s.name),
        top: 5,
        left: 0,
        itemGap: 12,
        textStyle: {
          fontSize: 11,
        },
        type: "scroll",
        orient: "horizontal",
      },
      grid: {
        left:
          (hasCurrencyMetrics || hasROASMetrics) && hasOrderMetrics
            ? "8%"
            : "3%",
        right:
          (hasCurrencyMetrics || hasROASMetrics) && hasOrderMetrics
            ? "8%"
            : "4%",
        bottom: "10%",
        top: "15%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: chartData.categories,
        name: zoomedDate
          ? `Hour of Day - ${zoomedDate}`
          : xAxisType === "hour"
          ? "Hour of Day"
          : "Date",
        nameLocation: "middle",
        nameGap: 30,
        axisLabel: {
          rotate: xAxisType === "date" ? 45 : 0,
        },
      },
      yAxis: yAxisConfig,
      dataZoom:
        xAxisType === "date" && !zoomedDate
          ? [
              {
                type: "slider",
                start: 0,
                end: 100,
                height: 20,
                bottom: 10,
              },
              {
                type: "inside",
              },
            ]
          : [],
      series: [
        ...seriesWithYAxis.map((s, idx) => ({
          ...s,
          // Ensure each series has unique styling
          animation: true,
          animationDuration: 300,
        })),
        // Rolling average as dotted line (use same Y-axis as first series)
        ...(chartData.rollingAverage &&
        chartData.rollingAverage.length > 0 &&
        seriesWithYAxis.length > 0
          ? [
              {
                name: "Rolling Average",
                type: "line",
                data: chartData.rollingAverage,
                smooth: true,
                symbol: "none",
                showSymbol: false,
                yAxisIndex: 0, // Always use primary Y-axis
                lineStyle: {
                  width: 1.5,
                  type: "dashed",
                  color: "rgba(128, 128, 128, 0.4)",
                  opacity: 0.6,
                },
                emphasis: {
                  focus: "none",
                },
                silent: true,
                animation: true,
                animationDuration: 300,
              },
            ]
          : []),
      ],
    };

    return option;
  }, [
    chartData,
    xAxisType,
    zoomedDate,
    hasCurrencyMetrics,
    hasOrderMetrics,
    hasROASMetrics,
  ]);

  // Handle dataZoom event for dynamic granularity
  const onEvents = useMemo(() => {
    const events = {};

    if (xAxisType === "date" && !zoomedDate) {
      events.datazoom = (params) => {
        if (params.batch) {
          const zoomParam = params.batch[0];
          if (zoomParam && availableDates.length > 0) {
            const startValue = zoomParam.startValue || 0;
            const endValue = zoomParam.endValue || availableDates.length - 1;
            const dateRange = endValue - startValue;

            if (
              dateRange < 1.5 &&
              startValue >= 0 &&
              endValue < availableDates.length
            ) {
              const selectedDate = availableDates[Math.floor(startValue)];
              if (selectedDate !== zoomedDate) {
                setZoomedDate(selectedDate);
              }
            }
          }
        } else {
          const startValue = params.startValue || 0;
          const endValue = params.endValue || availableDates.length - 1;
          const dateRange = endValue - startValue;

          if (
            dateRange < 1.5 &&
            startValue >= 0 &&
            endValue < availableDates.length
          ) {
            const selectedDate = availableDates[Math.floor(startValue)];
            if (selectedDate !== zoomedDate) {
              setZoomedDate(selectedDate);
            }
          } else if (zoomedDate && dateRange >= availableDates.length * 0.7) {
            setZoomedDate(null);
          }
        }
      };

      events.click = (params) => {
        if (params.componentType === "series" && availableDates.length > 0) {
          const dataIndex = params.dataIndex;
          if (dataIndex >= 0 && dataIndex < availableDates.length) {
            const selectedDate = availableDates[dataIndex];
            if (selectedDate !== zoomedDate) {
              setZoomedDate(selectedDate);
            }
          }
        }
      };
    }

    return events;
  }, [xAxisType, zoomedDate, availableDates]);

  // Available metrics
  const availableMetrics = [
    "Total Spend",
    "Total Revenue",
    "Total Orders",
    "AOV",
    "Meta Spend",
    "Meta Revenue",
    "Meta Orders",
    "Meta AOV",
    "Google Spend",
    "Google Revenue",
    "Google Orders",
    "Google AOV",
  ];

  const handleMetricToggle = (metric) => {
    setSelectedMetrics((prev) => {
      if (prev.includes(metric)) {
        // Don't allow removing if it's the last one
        if (prev.length === 1) {
          // Show a brief message or just prevent removal
          return prev;
        }
        // Remove the metric
        const newMetrics = prev.filter((m) => m !== metric);
        return newMetrics;
      } else {
        // Add the metric
        return [...prev, metric];
      }
    });
  };

  // Reset to default metrics
  const handleResetMetrics = () => {
    setSelectedMetrics(["Total Spend", "Total Revenue"]);
  };

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "400px" }}
      >
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading data...</p>
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

  if (!data || !chartData.categories.length) {
    return (
      <div className="alert alert-info">
        <Icon icon="mdi:information" className="me-2" />
        No data available for the selected date range.
      </div>
    );
  }

  return (
    <>
      <div className="card border-0 shadow-sm position-relative">
        <div className="card-body">
          {/* Expand Button */}
          <div
            className="position-absolute"
            style={{ top: "10px", right: "10px", zIndex: 10 }}
          >
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

          {/* Filters Row: X-Axis, Aggregation, Date Range, Time Period */}
          <div
            className="mb-3 d-flex flex-wrap align-items-end gap-3"
            style={{ borderBottom: "1px solid #e0e0e0", paddingBottom: "12px" }}
          >
            {/* X-Axis Dropdown */}
            <div>
              <label
                className="form-label small fw-semibold mb-2 d-block"
                style={{ color: "#374151", fontSize: "12px" }}
              >
                X-Axis
              </label>
              <select
                className="form-select form-select-sm"
                value={xAxisType}
                onChange={(e) => {
                  setXAxisType(e.target.value);
                  setZoomedDate(null);
                }}
                style={{
                  fontSize: "12px",
                  height: "32px",
                  padding: "4px 8px",
                  width: "130px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  background: "#fff",
                }}
              >
                <option value="hour">Hour of Day</option>
                <option value="date">Date</option>
              </select>
            </div>

            {/* Aggregation Dropdown */}
            <div>
              <label
                className="form-label small fw-semibold mb-2 d-block"
                style={{ color: "#374151", fontSize: "12px" }}
              >
                Aggregation
              </label>
              <select
                className="form-select form-select-sm"
                value={aggregationType}
                onChange={(e) => setAggregationType(e.target.value)}
                style={{
                  fontSize: "12px",
                  height: "32px",
                  padding: "4px 8px",
                  width: "130px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  background: "#fff",
                }}
              >
                <option value="sum">Sum</option>
                <option value="average">Average</option>
              </select>
            </div>

            {/* Custom Date Range */}
            <div>
              <label
                className="form-label small fw-semibold mb-2 d-block"
                style={{ color: "#374151", fontSize: "12px" }}
              >
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
                    width: "130px",
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
                    width: "130px",
                  }}
                />
              </div>
            </div>

            {/* Time Period Tabs */}
            <div>
              <label
                className="form-label small fw-semibold mb-2 d-block"
                style={{ color: "#374151", fontSize: "12px" }}
              >
                Time Period
              </label>
              <div
                className="d-flex align-items-center"
                style={{
                  background: "#f9fafb",
                  padding: "3px",
                  borderRadius: "6px",
                  border: "1px solid #e5e7eb",
                  height: "32px",
                }}
              >
                <button
                  className="btn btn-link p-0 text-decoration-none"
                  onClick={() => handlePeriodChange("today")}
                  style={{
                    fontSize: "12px",
                    color:
                      selectedPeriod === "today" && !useCustomDateRange
                        ? "#1f2937"
                        : "#6b7280",
                    fontWeight:
                      selectedPeriod === "today" && !useCustomDateRange
                        ? "600"
                        : "400",
                    padding: "4px 10px",
                    border: "none",
                    background:
                      selectedPeriod === "today" && !useCustomDateRange
                        ? "#fff"
                        : "transparent",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    borderRadius: "4px",
                    boxShadow:
                      selectedPeriod === "today" && !useCustomDateRange
                        ? "0 1px 2px rgba(0,0,0,0.05)"
                        : "none",
                    height: "26px",
                    lineHeight: "18px",
                  }}
                >
                  Today
                </button>
                <span
                  style={{
                    color: "#e5e7eb",
                    margin: "0 1px",
                    fontSize: "12px",
                  }}
                >
                  |
                </span>
                <button
                  className="btn btn-link p-0 text-decoration-none"
                  onClick={() => handlePeriodChange("weekly")}
                  style={{
                    fontSize: "12px",
                    color:
                      selectedPeriod === "weekly" && !useCustomDateRange
                        ? "#1f2937"
                        : "#6b7280",
                    fontWeight:
                      selectedPeriod === "weekly" && !useCustomDateRange
                        ? "600"
                        : "400",
                    padding: "4px 10px",
                    border: "none",
                    background:
                      selectedPeriod === "weekly" && !useCustomDateRange
                        ? "#fff"
                        : "transparent",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    borderRadius: "4px",
                    boxShadow:
                      selectedPeriod === "weekly" && !useCustomDateRange
                        ? "0 1px 2px rgba(0,0,0,0.05)"
                        : "none",
                    height: "26px",
                    lineHeight: "18px",
                  }}
                >
                  Weekly
                </button>
                <span
                  style={{
                    color: "#e5e7eb",
                    margin: "0 1px",
                    fontSize: "12px",
                  }}
                >
                  |
                </span>
                <button
                  className="btn btn-link p-0 text-decoration-none"
                  onClick={() => handlePeriodChange("monthly")}
                  style={{
                    fontSize: "12px",
                    color:
                      selectedPeriod === "monthly" && !useCustomDateRange
                        ? "#1f2937"
                        : "#6b7280",
                    fontWeight:
                      selectedPeriod === "monthly" && !useCustomDateRange
                        ? "600"
                        : "400",
                    padding: "4px 10px",
                    border: "none",
                    background:
                      selectedPeriod === "monthly" && !useCustomDateRange
                        ? "#fff"
                        : "transparent",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    borderRadius: "4px",
                    boxShadow:
                      selectedPeriod === "monthly" && !useCustomDateRange
                        ? "0 1px 2px rgba(0,0,0,0.05)"
                        : "none",
                    height: "26px",
                    lineHeight: "18px",
                  }}
                >
                  Monthly
                </button>
                <span
                  style={{
                    color: "#e5e7eb",
                    margin: "0 1px",
                    fontSize: "12px",
                  }}
                >
                  |
                </span>
                <button
                  className="btn btn-link p-0 text-decoration-none"
                  onClick={() => handlePeriodChange("yearly")}
                  style={{
                    fontSize: "12px",
                    color:
                      selectedPeriod === "yearly" && !useCustomDateRange
                        ? "#1f2937"
                        : "#6b7280",
                    fontWeight:
                      selectedPeriod === "yearly" && !useCustomDateRange
                        ? "600"
                        : "400",
                    padding: "4px 10px",
                    border: "none",
                    background:
                      selectedPeriod === "yearly" && !useCustomDateRange
                        ? "#fff"
                        : "transparent",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    borderRadius: "4px",
                    boxShadow:
                      selectedPeriod === "yearly" && !useCustomDateRange
                        ? "0 1px 2px rgba(0,0,0,0.05)"
                        : "none",
                    height: "26px",
                    lineHeight: "18px",
                  }}
                >
                  Yearly
                </button>
              </div>
            </div>
          </div>

          {/* Metrics Selection */}
          <div
            className="mb-3 d-flex align-items-center gap-2 flex-wrap"
            style={{ borderBottom: "1px solid #e0e0e0", paddingBottom: "12px" }}
          >
            <label
              className="mb-0 small fw-semibold"
              style={{ minWidth: "70px", fontSize: "12px", color: "#374151" }}
            >
              Metrics:
            </label>
            <div
              className="d-flex flex-wrap gap-1 align-items-center"
              style={{ flex: 1 }}
            >
              {availableMetrics.map((metric, idx) => {
                const isSelected = selectedMetrics.includes(metric);

                return (
                  <React.Fragment key={metric}>
                    {idx > 0 && (
                      <span style={{ color: "#e0e0e0", margin: "0 2px" }}>
                        |
                      </span>
                    )}
                    <button
                      className="btn btn-link p-0 text-decoration-none"
                      onClick={() => handleMetricToggle(metric)}
                      style={{
                        fontSize: "12px",
                        color: isSelected ? "#1976d2" : "#5f6368",
                        fontWeight: isSelected ? "500" : "400",
                        padding: "2px 4px",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        textTransform: "none",
                        transition: "color 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.target.style.color = "#1976d2";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.target.style.color = "#5f6368";
                      }}
                      title={
                        isSelected
                          ? `Click to remove ${metric}`
                          : `Click to add ${metric}`
                      }
                    >
                      {metric}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
            <button
              className="btn btn-link text-decoration-none p-0"
              onClick={handleResetMetrics}
              style={{
                fontSize: "11px",
                color: "#5f6368",
                padding: "2px 4px",
                minWidth: "auto",
              }}
              title="Reset to default (Total Spend & Total Revenue)"
            >
              Reset
            </button>
            {zoomedDate && (
              <>
                <div
                  style={{
                    width: "1px",
                    height: "20px",
                    backgroundColor: "#e0e0e0",
                    margin: "0 8px",
                  }}
                ></div>
                <button
                  className="btn btn-sm btn-link text-decoration-none p-0"
                  onClick={() => setZoomedDate(null)}
                  style={{
                    fontSize: "11px",
                    color: "#5f6368",
                    padding: "2px 4px",
                  }}
                >
                  Reset Zoom
                </button>
              </>
            )}
          </div>

          <ReactECharts
            ref={chartRef}
            option={chartOption}
            style={{ height: "350px", width: "100%" }}
            onEvents={onEvents}
            opts={{ renderer: "svg" }}
            key={`chart-${selectedMetrics.join(
              "-"
            )}-${aggregationType}-${xAxisType}`}
          />
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
              {/* Close Button */}
              <button
                className="btn btn-sm btn-light border position-absolute"
                onClick={() => setIsExpanded(false)}
                style={{
                  top: "10px",
                  right: "10px",
                  zIndex: 10,
                  padding: "4px 8px",
                  borderRadius: "4px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
                title="Close expanded view"
              >
                <Icon icon="mdi:close" style={{ fontSize: "18px" }} />
              </button>

              {/* Expanded Chart Content */}
              <div style={{ marginTop: "40px" }}>
                {/* Filters Row: X-Axis, Aggregation, Date Range, Time Period */}
                <div
                  className="mb-3 d-flex flex-wrap align-items-end gap-3"
                  style={{
                    borderBottom: "1px solid #e0e0e0",
                    paddingBottom: "12px",
                  }}
                >
                  {/* X-Axis Dropdown */}
                  <div>
                    <label
                      className="form-label small fw-semibold mb-2 d-block"
                      style={{ color: "#374151", fontSize: "12px" }}
                    >
                      X-Axis
                    </label>
                    <select
                      className="form-select form-select-sm"
                      value={xAxisType}
                      onChange={(e) => {
                        setXAxisType(e.target.value);
                        setZoomedDate(null);
                      }}
                      style={{
                        fontSize: "12px",
                        height: "32px",
                        padding: "4px 8px",
                        width: "130px",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                        background: "#fff",
                      }}
                    >
                      <option value="hour">Hour of Day</option>
                      <option value="date">Date</option>
                    </select>
                  </div>

                  {/* Aggregation Dropdown */}
                  <div>
                    <label
                      className="form-label small fw-semibold mb-2 d-block"
                      style={{ color: "#374151", fontSize: "12px" }}
                    >
                      Aggregation
                    </label>
                    <select
                      className="form-select form-select-sm"
                      value={aggregationType}
                      onChange={(e) => setAggregationType(e.target.value)}
                      style={{
                        fontSize: "12px",
                        height: "32px",
                        padding: "4px 8px",
                        width: "130px",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                        background: "#fff",
                      }}
                    >
                      <option value="sum">Sum</option>
                      <option value="average">Average</option>
                    </select>
                  </div>

                  {/* Custom Date Range */}
                  <div>
                    <label
                      className="form-label small fw-semibold mb-2 d-block"
                      style={{ color: "#374151", fontSize: "12px" }}
                    >
                      Date Range
                    </label>
                    <div className="d-flex gap-2">
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={
                          customStartDate ? formatDate(customStartDate) : ""
                        }
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
                          width: "130px",
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
                          width: "130px",
                        }}
                      />
                    </div>
                  </div>

                  {/* Time Period Tabs */}
                  <div>
                    <label
                      className="form-label small fw-semibold mb-2 d-block"
                      style={{ color: "#374151", fontSize: "12px" }}
                    >
                      Time Period
                    </label>
                    <div
                      className="d-flex align-items-center"
                      style={{
                        background: "#f9fafb",
                        padding: "3px",
                        borderRadius: "6px",
                        border: "1px solid #e5e7eb",
                        height: "32px",
                      }}
                    >
                      <button
                        className="btn btn-link p-0 text-decoration-none"
                        onClick={() => handlePeriodChange("today")}
                        style={{
                          fontSize: "12px",
                          color:
                            selectedPeriod === "today" && !useCustomDateRange
                              ? "#1f2937"
                              : "#6b7280",
                          fontWeight:
                            selectedPeriod === "today" && !useCustomDateRange
                              ? "600"
                              : "400",
                          padding: "4px 10px",
                          border: "none",
                          background:
                            selectedPeriod === "today" && !useCustomDateRange
                              ? "#fff"
                              : "transparent",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          borderRadius: "4px",
                          boxShadow:
                            selectedPeriod === "today" && !useCustomDateRange
                              ? "0 1px 2px rgba(0,0,0,0.05)"
                              : "none",
                          height: "26px",
                          lineHeight: "18px",
                        }}
                      >
                        Today
                      </button>
                      <span
                        style={{
                          color: "#e5e7eb",
                          margin: "0 1px",
                          fontSize: "12px",
                        }}
                      >
                        |
                      </span>
                      <button
                        className="btn btn-link p-0 text-decoration-none"
                        onClick={() => handlePeriodChange("weekly")}
                        style={{
                          fontSize: "12px",
                          color:
                            selectedPeriod === "weekly" && !useCustomDateRange
                              ? "#1f2937"
                              : "#6b7280",
                          fontWeight:
                            selectedPeriod === "weekly" && !useCustomDateRange
                              ? "600"
                              : "400",
                          padding: "4px 10px",
                          border: "none",
                          background:
                            selectedPeriod === "weekly" && !useCustomDateRange
                              ? "#fff"
                              : "transparent",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          borderRadius: "4px",
                          boxShadow:
                            selectedPeriod === "weekly" && !useCustomDateRange
                              ? "0 1px 2px rgba(0,0,0,0.05)"
                              : "none",
                          height: "26px",
                          lineHeight: "18px",
                        }}
                      >
                        Weekly
                      </button>
                      <span
                        style={{
                          color: "#e5e7eb",
                          margin: "0 1px",
                          fontSize: "12px",
                        }}
                      >
                        |
                      </span>
                      <button
                        className="btn btn-link p-0 text-decoration-none"
                        onClick={() => handlePeriodChange("monthly")}
                        style={{
                          fontSize: "12px",
                          color:
                            selectedPeriod === "monthly" && !useCustomDateRange
                              ? "#1f2937"
                              : "#6b7280",
                          fontWeight:
                            selectedPeriod === "monthly" && !useCustomDateRange
                              ? "600"
                              : "400",
                          padding: "4px 10px",
                          border: "none",
                          background:
                            selectedPeriod === "monthly" && !useCustomDateRange
                              ? "#fff"
                              : "transparent",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          borderRadius: "4px",
                          boxShadow:
                            selectedPeriod === "monthly" && !useCustomDateRange
                              ? "0 1px 2px rgba(0,0,0,0.05)"
                              : "none",
                          height: "26px",
                          lineHeight: "18px",
                        }}
                      >
                        Monthly
                      </button>
                      <span
                        style={{
                          color: "#e5e7eb",
                          margin: "0 1px",
                          fontSize: "12px",
                        }}
                      >
                        |
                      </span>
                      <button
                        className="btn btn-link p-0 text-decoration-none"
                        onClick={() => handlePeriodChange("yearly")}
                        style={{
                          fontSize: "12px",
                          color:
                            selectedPeriod === "yearly" && !useCustomDateRange
                              ? "#1f2937"
                              : "#6b7280",
                          fontWeight:
                            selectedPeriod === "yearly" && !useCustomDateRange
                              ? "600"
                              : "400",
                          padding: "4px 10px",
                          border: "none",
                          background:
                            selectedPeriod === "yearly" && !useCustomDateRange
                              ? "#fff"
                              : "transparent",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          borderRadius: "4px",
                          boxShadow:
                            selectedPeriod === "yearly" && !useCustomDateRange
                              ? "0 1px 2px rgba(0,0,0,0.05)"
                              : "none",
                          height: "26px",
                          lineHeight: "18px",
                        }}
                      >
                        Yearly
                      </button>
                    </div>
                  </div>
                </div>

                {/* Metrics Selection */}
                <div
                  className="mb-3 d-flex align-items-center gap-2 flex-wrap"
                  style={{
                    borderBottom: "1px solid #e0e0e0",
                    paddingBottom: "12px",
                  }}
                >
                  <label
                    className="mb-0 small fw-semibold"
                    style={{
                      minWidth: "70px",
                      fontSize: "12px",
                      color: "#374151",
                    }}
                  >
                    Metrics:
                  </label>
                  <div
                    className="d-flex flex-wrap gap-1 align-items-center"
                    style={{ flex: 1 }}
                  >
                    {availableMetrics.map((metric, idx) => {
                      const isSelected = selectedMetrics.includes(metric);

                      return (
                        <React.Fragment key={metric}>
                          {idx > 0 && (
                            <span style={{ color: "#e0e0e0", margin: "0 2px" }}>
                              |
                            </span>
                          )}
                          <button
                            className="btn btn-link p-0 text-decoration-none"
                            onClick={() => handleMetricToggle(metric)}
                            style={{
                              fontSize: "12px",
                              color: isSelected ? "#1976d2" : "#5f6368",
                              fontWeight: isSelected ? "500" : "400",
                              padding: "2px 4px",
                              border: "none",
                              background: "transparent",
                              cursor: "pointer",
                              textTransform: "none",
                              transition: "color 0.2s",
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.target.style.color = "#1976d2";
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.target.style.color = "#5f6368";
                            }}
                            title={
                              isSelected
                                ? `Click to remove ${metric}`
                                : `Click to add ${metric}`
                            }
                          >
                            {metric}
                          </button>
                        </React.Fragment>
                      );
                    })}
                  </div>
                  <button
                    className="btn btn-link text-decoration-none p-0"
                    onClick={handleResetMetrics}
                    style={{
                      fontSize: "11px",
                      color: "#5f6368",
                      padding: "2px 4px",
                      minWidth: "auto",
                    }}
                    title="Reset to default (Total Spend & Total Revenue)"
                  >
                    Reset
                  </button>
                  {zoomedDate && (
                    <>
                      <div
                        style={{
                          width: "1px",
                          height: "20px",
                          backgroundColor: "#e0e0e0",
                          margin: "0 8px",
                        }}
                      ></div>
                      <button
                        className="btn btn-sm btn-link text-decoration-none p-0"
                        onClick={() => setZoomedDate(null)}
                        style={{
                          fontSize: "11px",
                          color: "#5f6368",
                          padding: "2px 4px",
                        }}
                      >
                        Reset Zoom
                      </button>
                    </>
                  )}
                </div>

                <ReactECharts
                  ref={chartRef}
                  option={chartOption}
                  style={{ height: "70vh", width: "100%", minHeight: "500px" }}
                  onEvents={onEvents}
                  opts={{ renderer: "svg" }}
                  key={`chart-expanded-${selectedMetrics.join(
                    "-"
                  )}-${aggregationType}-${xAxisType}`}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HourlySpendSalesGraph;
