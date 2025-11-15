"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { Icon } from "@iconify/react";
import ExcelJS from "exceljs";
import dynamic from "next/dynamic";
import { useUser } from "@/helper/UserContext";
import { apiClient } from "@/api/api";

// Dynamically import ReactApexChart to avoid SSR issues
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

const ROLE_SUGGESTIONS = {
  super_admin: [
    "Show me the count of orders from Maharashtra in the last month.",
    "What were total orders and revenue last week versus the week before",
    "Give me a weekly trend of net profit and margin percentage for this quarter.",
    "List customers with repeat purchases in the last 60 days.",
  ],
  admin: [
    "Show me the count of orders from Maharashtra in the last month.",
    "What were total orders and revenue last week versus the week before",
    "Give me a weekly trend of net profit and margin percentage for this quarter.",
    "List customers with repeat purchases in the last 60 days.",
    "Show me net profit and orders week over week",
    "Which campaigns are below ROAS 1.0 right now?",
  ],
  manager: [
    "Show me the count of orders from Maharashtra in the last month.",
    "What were total orders and revenue last week versus the week before",
    "Give me a weekly trend of net profit and margin percentage for this quarter.",
    "List customers with repeat purchases in the last 60 days.",
    "Give me the top 5 SKUs by sales in the last 14 days",
  ],
  user: [
    "How many orders came from Maharashtra last month?",
    "Show me the count of orders from Maharashtra in the last month.",
    "What were total orders and revenue last week versus the week before",
    "Give me a weekly trend of net profit and margin percentage for this quarter.",
    "List customers with repeat purchases in the last 60 days.",
    "What’s the current gross ROAS?",
  ],
  none: [
    "What metrics can you show me today?",
    "How do I check yesterday’s sales performance?",
    "What data sources are available in Seleric?",
  ],
};

const FALLBACK_SUGGESTIONS = [
  "What were total orders and revenue last week?",
  "Identify campaigns with falling ROAS",
  "Which customers have repeat purchases in the last 60 days?",
];

const INITIAL_MESSAGE = {
  role: "assistant",
  content:
    "Hi! Ask me anything about your business metrics, operations, or data.",
  metadata: null,
};

// Extended color palette for multi-series charts
// Colors are selected for visual distinction, accessibility, and professional appearance
const CHART_COLORS = [
  "#487FFF", // Primary Blue
  "#FFC107", // Amber/Yellow
  "#02BCAF", // Teal/Cyan
  "#F0437D", // Pink/Magenta
  "#1C52F6", // Deep Blue
  "#43DCFF", // Light Cyan
  "#FF6B35", // Orange
  "#4ECDC4", // Turquoise
  "#95E1D3", // Mint Green
  "#F38181", // Coral
  "#AA96DA", // Lavender
  "#FCBAD3", // Light Pink
  "#A8DADC", // Sky Blue
  "#457B9D", // Steel Blue
  "#E63946", // Red
  "#F77F00", // Dark Orange
  "#FCBF49", // Golden Yellow
  "#06FFA5", // Bright Green
  "#8338EC", // Purple
  "#3A86FF", // Bright Blue
  "#FF006E", // Hot Pink
  "#FB5607", // Burnt Orange
  "#FFBE0B", // Yellow
  "#118AB2", // Ocean Blue
  "#06D6A0", // Emerald
  "#EF476F", // Rose
  "#FFD166", // Light Yellow
  "#26547C", // Navy Blue
  "#F72585", // Magenta
  "#7209B7", // Deep Purple
  "#4361EE", // Indigo
  "#4CC9F0", // Sky Blue
  "#8B5CF6", // Violet
  "#EC4899", // Fuchsia
  "#10B981", // Green
  "#F59E0B", // Amber
  "#6366F1", // Indigo Blue
  "#14B8A6", // Teal
  "#EF4444", // Red
  "#8B5A2B", // Brown
  "#64748B", // Slate
];

const formatColumnName = (column) => {
  return column
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatChartValue = (value) => {
  if (value === null || value === undefined) return 0;
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(numValue)) return 0;
  return numValue;
};

const formatChartLabel = (value) => {
  if (typeof value === "string" && value.includes("-")) {
    // Format date strings (e.g., "2025-05-19" -> "May 19")
    try {
      const date = new Date(value);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return value;
    }
  }
  return value;
};

/**
 * Detects the value format type based on labels, keys, and actual data values
 */
const detectValueFormat = (y_label, y_axis_keys, sampleValues = []) => {
  const labelLower = (y_label || "").toLowerCase();
  const keysLower = (y_axis_keys || []).map(k => k.toLowerCase()).join(" ");
  
  // Check for explicit format hints in labels/keys
  if (labelLower.includes('%') || labelLower.includes('percent') || 
      keysLower.includes('rate') || keysLower.includes('percent') || keysLower.includes('%')) {
    return 'percentage';
  }
  
  if (labelLower.includes('₹') || labelLower.includes('rupee') || labelLower.includes('rs') ||
      labelLower.includes('currency') || labelLower.includes('revenue') || 
      labelLower.includes('sales') || labelLower.includes('price') || labelLower.includes('cost')) {
    return 'currency';
  }
  
  // Analyze sample values to infer format
  if (sampleValues.length > 0) {
    const avgValue = Math.abs(sampleValues.reduce((a, b) => a + Math.abs(b || 0), 0) / sampleValues.length);
    const maxValue = Math.max(...sampleValues.map(v => Math.abs(v || 0)));
    
    // If values are between 0-1 and label suggests percentage, it's likely percentage
    if (maxValue <= 1 && (labelLower.includes('rate') || keysLower.includes('rate'))) {
      return 'percentage';
    }
    
    // If values are very large, likely currency
    if (avgValue > 1000 && (labelLower.includes('revenue') || labelLower.includes('sales') || 
        labelLower.includes('amount') || labelLower.includes('total'))) {
      return 'currency';
    }
  }
  
  return 'number'; // Default to plain number
};

/**
 * Formats a value based on detected format type
 */
const formatValue = (value, formatType, decimals = 2) => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }
  
  switch (formatType) {
    case 'percentage':
      // Handle both 0-1 and 0-100 formats
      const percentageValue = Math.abs(value) <= 1 && value >= 0 ? value * 100 : value;
      return `${percentageValue.toFixed(decimals)}%`;
    
    case 'currency':
      const absValue = Math.abs(value);
      if (absValue >= 1000000) {
        return `₹${(value / 1000000).toFixed(decimals)}M`;
      } else if (absValue >= 1000) {
        return `₹${(value / 1000).toFixed(decimals)}k`;
      }
      return `₹${value.toFixed(decimals)}`;
    
    case 'number':
    default:
      const absNum = Math.abs(value);
      if (absNum >= 1000000) {
        return `${(value / 1000000).toFixed(decimals)}M`;
      } else if (absNum >= 1000) {
        return `${(value / 1000).toFixed(decimals)}k`;
      }
      return value.toFixed(decimals);
  }
};

/**
 * Detects data format: 'long' (y_axis keys exist), 'pivoted' (series as columns), or 'mixed'
 */
const detectDataFormat = (data, x_axis, y_axis_keys) => {
  if (!data || data.length === 0) return 'long';
  
  const firstItem = data[0] || {};
  const allKeys = Object.keys(firstItem);
  const nonXAxisKeys = allKeys.filter(key => key !== x_axis);
  
  // Check if y_axis keys exist in data
  const yAxisKeysExist = y_axis_keys.length > 0 && 
    y_axis_keys.some(key => firstItem.hasOwnProperty(key));
  
  if (yAxisKeysExist) {
    return 'long';
  }
  
  // Check if we have other meaningful keys (potential pivoted format)
  const potentialSeriesKeys = nonXAxisKeys.filter(key => {
    const value = firstItem[key];
    // Exclude null, undefined, and numeric string keys (array indices)
    return value !== null && value !== undefined && isNaN(Number(key));
  });
  
  if (potentialSeriesKeys.length > 0) {
    return 'pivoted';
  }
  
  return 'long'; // Default fallback
};

/**
 * Extracts series data based on detected format
 */
const extractSeries = (data, x_axis, y_axis_keys, dataFormat) => {
  if (!data || data.length === 0) return [];
  
  const firstItem = data[0] || {};
  
  if (dataFormat === 'pivoted') {
    // Pivoted format: series are columns (non-x_axis keys)
    const allKeys = Object.keys(firstItem);
    const seriesKeys = allKeys.filter(key => {
      if (key === x_axis) return false;
      const value = firstItem[key];
      return value !== null && value !== undefined && isNaN(Number(key));
    });
    
    return seriesKeys.map((seriesKey) => ({
      name: formatColumnName(seriesKey),
      data: data.map((item) => formatChartValue(item[seriesKey])),
    }));
  } else {
    // Long format: use y_axis keys
    if (y_axis_keys.length === 0) {
      // Fallback: try to infer from data structure
      const allKeys = Object.keys(firstItem);
      const fallbackKeys = allKeys.filter(key => key !== x_axis);
      return fallbackKeys.map((key) => ({
        name: formatColumnName(key),
        data: data.map((item) => formatChartValue(item[key])),
      }));
    }
    
    return y_axis_keys.map((yAxisKey) => ({
      name: formatColumnName(yAxisKey),
      data: data.map((item) => formatChartValue(item[yAxisKey])),
    }));
  }
};

const prepareChartData = (graphData) => {
  if (!graphData || !graphData.data || !Array.isArray(graphData.data) || graphData.data.length === 0) {
    return null;
  }

  const { 
    chart_type, 
    x_axis, 
    y_axis, 
    data, 
    title, 
    x_label, 
    y_label,
    value_format, // Optional: explicit format hint from API ('percentage', 'currency', 'number')
    data_format,  // Optional: explicit format hint from API ('long', 'pivoted')
  } = graphData;
  
  // Normalize y_axis to always be an array (API may return string or array)
  const normalizedYAxis = Array.isArray(y_axis) ? y_axis : (y_axis ? [y_axis] : []);
  
  // Determine chart type for ApexCharts (support more types)
  const chartTypeMap = {
    'bar': 'bar',
    'line': 'line',
    'area': 'area',
    'pie': 'pie',
    'donut': 'donut',
    'scatter': 'scatter',
    'bubble': 'bubble',
    'heatmap': 'heatmap',
  };
  
  let apexChartType = chartTypeMap[chart_type?.toLowerCase()] || 'line';

  // Detect data format (use explicit hint or auto-detect)
  const detectedDataFormat = data_format || detectDataFormat(data, x_axis, normalizedYAxis);
  
  // Extract series based on detected format
  const series = extractSeries(data, x_axis, normalizedYAxis, detectedDataFormat);
  
  if (series.length === 0) {
    console.warn('No series data found for chart');
    return null;
  }
  
  // Collect sample values for format detection
  const sampleValues = series.flatMap(s => s.data).filter(v => v !== null && v !== undefined && !isNaN(v)).slice(0, 10);
  
  // Detect value format (use explicit hint or auto-detect)
  const detectedValueFormat = value_format || detectValueFormat(y_label, normalizedYAxis, sampleValues);
  
  // Handle pie/donut charts differently
  if (apexChartType === "pie" || apexChartType === "donut") {
    // For pie charts, use the first series
    const pieSeries = series[0]?.data || [];
    const labels = data.map((item) => formatChartLabel(item[x_axis] || ""));
    
    return {
      series: pieSeries,
      options: {
        chart: {
          type: apexChartType,
          height: 350,
          toolbar: {
            show: true,
          },
        },
        title: {
          text: title || "Chart",
          align: "left",
          style: {
            fontSize: "16px",
            fontWeight: 600,
          },
        },
        labels,
        colors: CHART_COLORS,
        legend: {
          show: true,
          position: "bottom",
        },
        dataLabels: {
          enabled: true,
          formatter: (val) => formatValue(val, detectedValueFormat, 1),
        },
        tooltip: {
          y: {
            formatter: (value) => formatValue(value, detectedValueFormat, 2),
          },
        },
      },
    };
  }
  
  // Handle heatmap charts differently
  if (apexChartType === "heatmap") {
    // Extract categories (x-axis values)
    const categories = data.map((item) => formatChartLabel(item[x_axis] || ""));
    
    // For heatmaps, series represent rows (y-axis), data represents values
    // Calculate min/max for color scale
    const allValues = series.flatMap(s => s.data).filter(v => v !== null && v !== undefined && !isNaN(v));
    const minValue = allValues.length > 0 ? Math.min(...allValues) : 0;
    const maxValue = allValues.length > 0 ? Math.max(...allValues) : 100;
    
    return {
      series: series,
      options: {
        chart: {
          type: apexChartType,
          height: 350,
          toolbar: {
            show: true,
            tools: {
              download: true,
              selection: true,
              zoom: true,
              zoomin: true,
              zoomout: true,
              pan: true,
              reset: true,
            },
          },
        },
        title: {
          text: title || "Chart",
          align: "left",
          style: {
            fontSize: "16px",
            fontWeight: 600,
          },
        },
        dataLabels: {
          enabled: true,
          formatter: (val) => formatValue(val, detectedValueFormat, 1),
          style: {
            fontSize: "11px",
            fontWeight: 600,
            colors: ["#fff"],
          },
        },
        xaxis: {
          categories,
          title: {
            text: x_label || formatColumnName(x_axis),
            style: {
              fontSize: "12px",
              fontWeight: 600,
            },
          },
          labels: {
            rotate: categories.length > 10 ? -90 : 0,
            rotateAlways: categories.length > 10,
            style: {
              fontSize: "11px",
            },
            offsetY: categories.length > 10 ? 5 : 0,
          },
        },
        yaxis: {
          title: {
            text: y_label || "Categories",
            style: {
              fontSize: "12px",
              fontWeight: 600,
            },
          },
          labels: {
            style: {
              fontSize: "11px",
            },
          },
        },
        plotOptions: {
          heatmap: {
            shadeIntensity: 0.5,
            radius: 0,
            useFillColorAsStroke: false,
            colorScale: {
              ranges: [
                {
                  from: minValue,
                  to: minValue + (maxValue - minValue) * 0.2,
                  color: "#487FFF",
                  name: "Low",
                },
                {
                  from: minValue + (maxValue - minValue) * 0.2,
                  to: minValue + (maxValue - minValue) * 0.4,
                  color: "#02BCAF",
                  name: "Medium-Low",
                },
                {
                  from: minValue + (maxValue - minValue) * 0.4,
                  to: minValue + (maxValue - minValue) * 0.6,
                  color: "#FFC107",
                  name: "Medium",
                },
                {
                  from: minValue + (maxValue - minValue) * 0.6,
                  to: minValue + (maxValue - minValue) * 0.8,
                  color: "#F0437D",
                  name: "Medium-High",
                },
                {
                  from: minValue + (maxValue - minValue) * 0.8,
                  to: maxValue,
                  color: "#1C52F6",
                  name: "High",
                },
              ],
            },
          },
        },
        tooltip: {
          y: {
            formatter: (value) => formatValue(value, detectedValueFormat, 2),
          },
        },
        grid: {
          borderColor: "#D1D5DB",
          strokeDashArray: 4,
          padding: {
            top: 10,
            right: 10,
            bottom: categories.length > 10 ? 40 : 10,
            left: 10,
          },
        },
      },
    };
  }
  
  // Extract categories (x-axis values) for line/bar/area charts
  const categories = data.map((item) => formatChartLabel(item[x_axis] || ""));

  // Create chart options
  const options = {
    chart: {
      type: apexChartType,
      height: 350,
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true,
        },
      },
      zoom: {
        enabled: true,
      },
    },
    title: {
      text: title || "Chart",
      align: "left",
      style: {
        fontSize: "16px",
        fontWeight: 600,
      },
    },
    xaxis: {
      categories,
      title: {
        text: x_label || formatColumnName(x_axis),
        style: {
          fontSize: "12px",
          fontWeight: 600,
        },
      },
      labels: {
        rotate: categories.length > 10 ? -90 : 0,
        rotateAlways: categories.length > 10,
        style: {
          fontSize: "11px",
        },
        offsetY: categories.length > 10 ? 5 : 0,
      },
    },
    yaxis: {
      title: {
        text: y_label || (series.length === 1 ? series[0].name : "Value"),
        style: {
          fontSize: "12px",
          fontWeight: 600,
        },
      },
      labels: {
        formatter: (value) => {
          // Use detected format for consistent formatting
          const formatted = formatValue(value, detectedValueFormat, 1);
          // For y-axis labels, remove currency symbol if it's currency (cleaner look)
          if (detectedValueFormat === 'currency') {
            return formatted.replace('₹', '');
          }
          return formatted;
        },
        style: {
          fontSize: "11px",
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: chart_type === "line" ? "smooth" : "straight",
      width: 2,
    },
    fill: {
      opacity: apexChartType === "area" ? 0.4 : 1,
      type: apexChartType === "area" ? "gradient" : "solid",
    },
    colors: CHART_COLORS,
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "right",
      offsetY: -5,
      offsetX: 0,
      itemMargin: {
        horizontal: 10,
        vertical: 5,
      },
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (value) => formatValue(value, detectedValueFormat, 2),
      },
    },
    grid: {
      borderColor: "#D1D5DB",
      strokeDashArray: 4,
      padding: {
        top: series.length > 3 ? 50 : 40,
        right: 50,
        bottom: categories.length > 10 ? 40 : 10,
        left: 10,
      },
    },
  };

  return { series, options };
};

const downloadTableExcel = async (tableData, question = "Ask BOSS Query") => {
  if (!tableData || !tableData.columns || !tableData.rows || tableData.rows.length === 0) {
    alert("No data available to download");
    return;
  }

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Query Results");

    // Format column names for headers
    const headers = tableData.columns.map((col) => formatColumnName(col));

    // Add headers row
    worksheet.addRow(headers);

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE6E6FA" },
    };

    // Add data rows
    tableData.rows.forEach((row) => {
      const rowData = tableData.columns.map((column) => {
        const value = row[column];
        if (value === null || value === undefined) {
          return "";
        }
        return String(value);
      });
      worksheet.addRow(rowData);
    });

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      column.width = 15;
    });

    // Generate and download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().split("T")[0];
    const sanitizedQuestion = question
      .replace(/[^a-z0-9]/gi, "_")
      .substring(0, 50)
      .toLowerCase();
    link.download = `Ask_BOS_${sanitizedQuestion}_${timestamp}.xlsx`;
    link.href = url;
    link.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading Excel file:", error);
    alert("Error downloading file. Please try again.");
  }
};

const AskSelericModal = ({ open, onClose }) => {
  const { role, user } = useUser();
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const modalRootRef = useRef(null);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  const suggestions = useMemo(() => {
    const base = ROLE_SUGGESTIONS[role] || FALLBACK_SUGGESTIONS;
    if (base.length >= 3) {
      return base.slice(0, 3);
    }
    return [...base, ...FALLBACK_SUGGESTIONS].slice(0, 3);
  }, [role]);

  useEffect(() => {
    if (!modalRootRef.current) {
      const element = document.getElementById("ask-seleric-modal-root");
      if (element) {
        modalRootRef.current = element;
      } else {
        const created = document.createElement("div");
        created.id = "ask-seleric-modal-root";
        document.body.appendChild(created);
        modalRootRef.current = created;
      }
    }
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const closeModal = () => {
    if (onClose) {
      onClose();
    }
  };

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    const requestPayload = {
      question: trimmed,
      trace: true,
      context: {
        user: {
          email: user?.email,
          role,
        },
      },
    };

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: trimmed,
        metadata: null,
      },
      {
        role: "assistant",
        content: null,
        metadata: { typing: true },
      },
    ]);
    setInputValue("");

    try {
      const response = await apiClient.post(
        "/api/ask-seleric/query",
        requestPayload
      );
      const data = response.data;
      setMessages((prev) => {
        const updated = [...prev];
        const typingIndex = updated.findIndex(
          (msg) => msg.role === "assistant" && msg.metadata?.typing
        );
        if (typingIndex !== -1) {
          updated.splice(typingIndex, 1);
        }
        return [
          ...updated,
          {
            role: "assistant",
            content: data.answer,
            metadata: {
              confidence: data.metadata?.confidence,
              agents: data.metadata?.agents,
              traceEnabled: Boolean(data.trace?.length),
              raw: data,
              tableData: data.data?.columns && data.data?.rows ? {
                columns: data.data.columns,
                rows: data.data.rows,
              } : null,
              graphData: data.graph || null,
            },
          },
        ];
      });
    } catch (err) {
      const normalizedMessage = (err?.message || "").toLowerCase();
      const isTimeout =
        err?.code === "ECONNABORTED" || normalizedMessage.includes("timeout");
      const isAuthExpired = err?.response?.status === 401;

      const userFriendlyError = isTimeout
        ? "Ask BOSS took too long to respond this time. Nothing changed on your side—please try again in a moment."
        : isAuthExpired
        ? "Your session expired. Please sign in again to continue."
        : "Ask BOSS isn't reachable right now. Please try again soon.";

      setError(userFriendlyError);
      setMessages((prev) => {
        const updated = prev.filter(
          (msg) => !(msg.role === "assistant" && msg.metadata?.typing)
        );
        return [
          ...updated,
          {
            role: "assistant",
            content: userFriendlyError,
            metadata: null,
          },
        ];
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open || !modalRootRef.current) {
    return null;
  }

  const modalContent = (
    <div className="ask-seleric-overlay" onClick={handleOverlayClick}>
      <div className="ask-seleric-drawer" role="dialog" aria-modal="true">
        <header className="ask-seleric-header">
          <div className="ask-seleric-brand">
            <div className="ask-seleric-logo">
              <Image
                src="/assets/images/make/dashborad-09.jpg"
                alt="Ask Seleric"
                width={32}
                height={32}
              />
            </div>
            <div>
              <h4>Ask BOSS</h4>
            </div>
          </div>
          <button
            type="button"
            className="ask-seleric-close"
            onClick={closeModal}
            aria-label="Close Ask Seleric"
          >
            ×
          </button>
        </header>
        <main className="ask-seleric-body" ref={scrollRef}>
          {messages.map((message, index) => (
            <div
              key={`message-${index}`}
              className={clsx("ask-seleric-message", {
                "ask-seleric-message-user": message.role === "user",
                "ask-seleric-message-assistant": message.role === "assistant",
                "ask-seleric-message-with-table": message.metadata?.tableData,
                "ask-seleric-message-with-graph": message.metadata?.graphData,
              })}
            >
              <div className="ask-seleric-message-content">
                {message.metadata?.typing ? (
                  <span className="ask-seleric-typing">
                    <span />
                    <span />
                    <span />
                  </span>
                ) : (
                  <>
                    {message.content && (
                      <div style={{ whiteSpace: "pre-wrap", marginBottom: (message.metadata?.tableData || message.metadata?.graphData) ? "16px" : "0" }}>
                        {message.content}
                      </div>
                    )}
                    {message.metadata?.graphData && (() => {
                      const chartData = prepareChartData(message.metadata.graphData);
                      if (!chartData) return null;
                      
                      return (
                        <div className="ask-seleric-chart-container">
                          <ReactApexChart
                            options={chartData.options}
                            series={chartData.series}
                            type={chartData.options.chart.type}
                            height={chartData.options.chart.height}
                          />
                          {message.metadata.graphData.trend_analysis && (
                            <div className="ask-seleric-chart-analysis">
                              <p><strong>Trend Analysis:</strong> {message.metadata.graphData.trend_analysis}</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    {message.metadata?.tableData && (
                      <div className="ask-seleric-table-container">
                        <table className="ask-seleric-table">
                          <thead>
                            <tr>
                              {message.metadata.tableData.columns.map((column, idx) => (
                                <th key={`header-${idx}`}>
                                  {formatColumnName(column)}
                                </th>
                              ))}
                              <th className="ask-seleric-download-header-cell">
                                <button
                                  type="button"
                                  className="ask-seleric-download-btn-header"
                                  onClick={() => {
                                    // Find the user's question from the most recent user message before this assistant message
                                    let userQuestion = "Ask BOSS Query";
                                    for (let i = index - 1; i >= 0; i--) {
                                      if (messages[i].role === "user") {
                                        userQuestion = messages[i].content;
                                        break;
                                      }
                                    }
                                    downloadTableExcel(message.metadata.tableData, userQuestion);
                                  }}
                                  title="Download as Excel"
                                >
                                  <Icon icon="vscode-icons:file-type-excel" width={15} height={15} />
                                </button>
                              </th>
                            </tr>
                          </thead>
                            <tbody>
                              {message.metadata.tableData.rows.map((row, rowIdx) => (
                                <tr key={`row-${rowIdx}`}>
                                  {message.metadata.tableData.columns.map((column, colIdx) => (
                                    <td key={`cell-${rowIdx}-${colIdx}`}>
                                      {row[column] !== null && row[column] !== undefined
                                        ? String(row[column])
                                        : ""}
                                    </td>
                                  ))}
                                  <td className="ask-seleric-download-cell"></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                    )}
                  </>
                )}
              </div>
              {message.metadata && !message.metadata.typing && (
                <div className="ask-seleric-metadata">
                  {message.metadata.confidence !== undefined && (
                    <span>
                      Confidence: {message.metadata.confidence ?? "n/a"}
                    </span>
                  )}
                  {message.metadata.agents && (
                    <span>Agents: {message.metadata.agents.join(", ")}</span>
                  )}
                </div>
              )}
            </div>
          ))}
          {messages.length === 1 && (
            <div className="ask-seleric-suggestions">
              <p className="ask-seleric-suggestions-label">Try asking:</p>
              <div className="ask-seleric-suggestion-list">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={`suggestion-${idx}`}
                    type="button"
                    className="ask-seleric-suggestion-chip"
                    onClick={() => {
                      setInputValue(suggestion);
                      if (inputRef.current) {
                        inputRef.current.focus();
                      }
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          {error && <div className="ask-seleric-error">{error}</div>}
        </main>
        <form className="ask-seleric-form" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask anything about your dashboards..."
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            disabled={isSubmitting}
          />
          <button type="submit" disabled={isSubmitting || !inputValue.trim()}>
            {isSubmitting ? "Thinking…" : "Ask"}
          </button>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, modalRootRef.current);
};

export default AskSelericModal;
