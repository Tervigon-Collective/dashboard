"use client";
import dynamic from "next/dynamic";
import React, { useMemo, useState } from "react";
import { useNetProfitRangeQuery } from "@/hooks/dashboard/useNetProfitRangeQuery";
import { useUser } from "@/helper/UserContext";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

const PROFIT_GREEN = "#22C55E";
const LOSS_RED = "#EF4444";

function formatCompactInr(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "₹0";
  const abs = Math.abs(n);
  if (abs >= 1000) {
    return `₹${n < 0 ? "-" : ""}${(abs / 1000).toFixed(1)}k`;
  }
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatAxisInr(val) {
  const n = Number(val);
  if (!Number.isFinite(n)) return "₹0";
  if (Math.abs(n) >= 1000) {
    return `₹${(n / 1000).toFixed(1)}k`;
  }
  return `₹${Math.round(n)}`;
}

function parseChartDate(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = String(dateStr).slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatChartLabel(date, period) {
  if (!date) return "";
  if (period === "month") {
    return String(date.getDate());
  }
  return date
    .toLocaleDateString("en-US", { weekday: "short" })
    .replace(/\.$/, "");
}

const TotalSubscriberOne = () => {
  const { user, loading: authLoading } = useUser();
  const [period, setPeriod] = useState("week");

  const { data, isLoading, isError, refetch } = useNetProfitRangeQuery(period, {
    enabled: !authLoading && !!user,
  });

  const chartData = data?.dailyBreakdowns ?? [];
  const totalNetProfit = data?.totalNetProfit ?? 0;

  const chartLabels = useMemo(
    () =>
      chartData.map((d) => formatChartLabel(parseChartDate(d.date), period)),
    [chartData, period]
  );

  const chartValues = useMemo(
    () =>
      chartData.map((d) => Number(d.netProfit_after_gst ?? d.netProfit ?? 0)),
    [chartData]
  );

  const barColors = useMemo(
    () => chartValues.map((v) => (v < 0 ? LOSS_RED : PROFIT_GREEN)),
    [chartValues]
  );

  const isMonthView = period === "month";

  const chartOptions = useMemo(
    () => ({
      chart: {
        type: "bar",
        toolbar: { show: false },
        zoom: { enabled: false },
        fontFamily: "inherit",
        parentHeightOffset: 0,
      },
      plotOptions: {
        bar: {
          borderRadius: isMonthView ? 2 : 4,
          columnWidth: isMonthView ? "72%" : "48%",
          distributed: true,
        },
      },
      colors: barColors,
      dataLabels: { enabled: false },
      legend: { show: false },
      xaxis: {
        categories: chartLabels,
        tickPlacement: "on",
        labels: {
          style: { fontSize: isMonthView ? "9px" : "11px" },
          rotate: isMonthView ? 0 : 0,
          hideOverlappingLabels: false,
          trim: false,
          formatter: (value, _timestamp, opts) => {
            if (!isMonthView) return value;
            const index =
              typeof opts?.dataPointIndex === "number"
                ? opts.dataPointIndex
                : chartLabels.indexOf(value);
            if (index < 0) return value;
            const isLast = index === chartLabels.length - 1;
            if (index % 5 !== 0 && !isLast) return "";
            return value;
          },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        forceNiceScale: true,
        labels: {
          formatter: formatAxisInr,
          style: { fontSize: "10px" },
          minWidth: 48,
          offsetX: -6,
        },
      },
      grid: {
        borderColor: "#D1D5DB",
        strokeDashArray: 3,
        padding: {
          left: 18,
          right: 8,
          top: 4,
          bottom: isMonthView ? 0 : 4,
        },
      },
      tooltip: {
        x: {
          formatter: (_val, { dataPointIndex }) => {
            const row = chartData[dataPointIndex];
            const date = parseChartDate(row?.date);
            if (!date) return "";
            return date.toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
          },
        },
        y: {
          formatter: (val) => formatCompactInr(val),
        },
      },
    }),
    [barColors, chartLabels, chartData, isMonthView]
  );

  const chartSeries = useMemo(
    () => [{ name: "Net Profit", data: chartValues }],
    [chartValues]
  );

  return (
    <div className="col-xl-5 col-lg-12 col-12">
      <div className="card h-100 dashboard-chart-card">
        <div className="card-body d-flex flex-column">
          <div className="d-flex flex-wrap align-items-start justify-content-between gap-2">
            <div className="min-w-0">
              <h6 className="dashboard-card-title mb-0">Net Profit</h6>
              <span className="dashboard-card-subtitle">
                Last {period === "month" ? "30 Days" : "7 Days"}
              </span>
            </div>
            <select
              className="form-select bg-base form-select-sm w-auto dashboard-period-select flex-shrink-0"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="week">Weekly</option>
              <option value="month">30 Days</option>
            </select>
          </div>

          <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
            {isLoading ? (
              <h6 className="mb-0 text-muted">Loading...</h6>
            ) : isError ? (
              <button
                type="button"
                className="btn btn-link btn-sm text-danger p-0"
                onClick={() => refetch()}
              >
                Retry
              </button>
            ) : (
              <h6
                className="mb-0 fw-semibold dashboard-metric-value"
                style={{ color: totalNetProfit < 0 ? LOSS_RED : PROFIT_GREEN }}
              >
                {formatCompactInr(totalNetProfit)}
              </h6>
            )}
          </div>

          <div className="mt-auto pt-3 flex-grow-1 d-flex align-items-end">
            {isLoading ? (
              <div className="w-100 text-center py-4">
                <div className="spinner-border spinner-border-sm text-primary" />
              </div>
            ) : isError ? (
              <p className="text-danger text-center w-100 mb-0 small">
                Failed to load data
              </p>
            ) : chartData.length === 0 ? (
              <p className="text-muted text-center w-100 mb-0 small">No data</p>
            ) : (
              <div className="chart-wrap w-100 mt-auto pt-2">
                <ReactApexChart
                  options={chartOptions}
                  series={chartSeries}
                  type="bar"
                  height={isMonthView ? 280 : 250}
                  width="100%"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TotalSubscriberOne;
