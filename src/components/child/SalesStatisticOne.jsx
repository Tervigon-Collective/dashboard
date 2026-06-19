"use client";
import dynamic from "next/dynamic";
import { Icon } from "@iconify/react/dist/iconify.js";
import useReactApexChart from "@/hook/useReactApexChart";
import axios from "axios";
import config from "../../config";
import React, { useState, useEffect, useMemo } from "react";
import { useTimeframeData } from "@/helper/TimeframeDataContext";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

const SalesStatisticOne = () => {
  let { chartOptions, chartSeries } = useReactApexChart();
  const { data, loading: contextLoading } = useTimeframeData();

  const [period, setPeriod] = useState("week");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [chartRevenue, setChartRevenue] = useState(0);
  const [currency, setCurrency] = useState("INR");
  const [chartData, setChartData] = useState({ series: [], labels: [] });

  // For week, month, year, use context
  useEffect(() => {
    if (data && data[capitalizePeriod(period)]) {
      setLoading(contextLoading);
      setError(null);
      const raw = data[capitalizePeriod(period)];
      // Calculate sales as totalSales - cancelledAmount
      const sales = raw.map(
        (item) => (item.totalSales || 0) - (item.cancelledAmount || 0)
      );
      let labels;
      if (period === "month") {
        labels = raw.map((item) => {
          if (item.date) {
            // Format as MM-DD
            const d = new Date(item.date);
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            return `${mm}-${dd}`;
          }
          return "";
        });
      } else {
        labels = raw.map((item) => item.month || item.day || item.date || "");
      }
      setChartData({
        series: [{ name: "Sales", data: sales }],
        labels,
      });
      setChartRevenue(sales.reduce((a, b) => a + b, 0));
      setTotalRevenue(sales.reduce((a, b) => a + b, 0));
      setCurrency("INR");
    }
  }, [period, data, contextLoading]);

  function capitalizePeriod(p) {
    if (p === "week") return "Week";
    if (p === "month") return "Month";
    if (p === "year") return "Year";
    return p;
  }

  return (
    <div className="col-xl-7 col-lg-12 col-12">
      <div className="card h-100 dashboard-chart-card">
        <div className="card-body">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
            <h6 className="dashboard-card-title mb-0">Sales Statistic</h6>
            <select
              className="form-select bg-base form-select-sm w-auto dashboard-period-select"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
          </div>
          <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
            {loading ? (
              <h6 className="mb-0 dashboard-metric-value">Loading...</h6>
            ) : error ? (
              <h6 className="mb-0 dashboard-metric-value text-danger">{error}</h6>
            ) : (
              <h6 className="mb-0 dashboard-metric-value">
                {currency === "INR" ? "₹" : "$"}
                {Number(totalRevenue).toLocaleString()}
              </h6>
            )}
          </div>
          <div className="chart-wrap mt-2">
            <ReactApexChart
              options={{
                ...chartOptions,
                chart: {
                  ...chartOptions.chart,
                  parentHeightOffset: 0,
                },
                grid: {
                  ...chartOptions.grid,
                  padding: { left: 8, right: 8, top: 0, bottom: 0 },
                },
                xaxis: {
                  ...chartOptions.xaxis,
                  categories: chartData.labels.length
                    ? chartData.labels
                    : chartOptions.xaxis?.categories,
                  tickAmount:
                    period === "month" ? 7 : chartOptions.xaxis?.tickAmount,
                  labels: {
                    ...chartOptions.xaxis?.labels,
                    style: { fontSize: "11px" },
                  },
                },
                yaxis: {
                  ...chartOptions.yaxis,
                  labels: {
                    ...chartOptions.yaxis?.labels,
                    style: { fontSize: "11px" },
                    formatter: (val) =>
                      `₹${val >= 1000 ? (val / 1000).toFixed(0) + "k" : val}`,
                  },
                },
              }}
              series={chartData.series}
              type="area"
              height={250}
              width="100%"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesStatisticOne;
