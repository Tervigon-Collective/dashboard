"use client";
import useReactApexChart from "@/hook/useReactApexChart";
import { Icon } from "@iconify/react/dist/iconify.js";
import dynamic from "next/dynamic";
import React, { useEffect, useState } from "react";
import { apiClient } from "../../api/api";
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});
import config from "../../config";
const TotalSubscriberOne = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalNetProfit, setTotalNetProfit] = useState(0);
  const [period, setPeriod] = useState("week"); // 'week' or 'month'

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Calculate date range based on period
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1); // Yesterday to avoid future date issues
    const startDate = new Date(endDate);

    if (period === "week") {
      // Last 7 days (yesterday + 6 days before)
      startDate.setDate(endDate.getDate() - 6);
    } else if (period === "month") {
      // Last 30 days (API limit is 30 days)
      startDate.setDate(endDate.getDate() - 29);
    }

    // Format dates as YYYY-MM-DD
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);

    apiClient
      .get(
        `/api/net_profit_single_day?startDate=${startDateStr}&endDate=${endDateStr}`
      )
      .then((res) => {
        // Extract dailyBreakdowns from the response
        const dailyBreakdowns = res.data?.data?.dailyBreakdowns || [];
        setData(dailyBreakdowns);

        // Extract total net profit from the response
        const total = res.data?.data?.totals?.netProfit || 0;
        setTotalNetProfit(total);

        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching net profit data:", err);
        setError("Failed to load data");
        setLoading(false);
      });
  }, [period]);

  // Prepare chart data
  const chartLabels = data.map((d) => {
    const date = new Date(d.date);
    if (period === "month") {
      // For monthly view, show date as MM-DD
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      return `${mm}-${dd}`;
    } else {
      // For weekly view, show weekday abbreviation
      return date
        .toLocaleDateString("en-US", { weekday: "short" })
        .replace(/\.0$/, "");
    }
  });
  const chartSeries = [
    {
      name: "Net Profit",
      data: data.map((d) => Number(d.netProfit)),
    },
  ];
  // Bar colors: green for profit, red for loss
  const barColors = data.map((d) =>
    Number(d.netProfit) >= 0 ? "#388e3c" : "#d32f2f"
  );

  // Use the total net profit for last 7 days
  const latest = totalNetProfit;
  const latestColor = latest >= 0 ? "#388e3c" : "#d32f2f";
  const formatK = (val) => {
    const n = Math.abs(val);
    return n >= 1000 ? (val / 1000).toFixed(1) + "k" : val.toFixed(2);
  };

  // Chart options
  const barChartOptions = {
    chart: { type: "bar", toolbar: { show: false }, offsetY: 10 },
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: "80%",
        colors: {
          ranges: [
            { from: 0, to: Number.MAX_VALUE, color: "#388e3c" }, // green for profit
            { from: -Number.MAX_VALUE, to: -0.01, color: "#d32f2f" }, // red for loss
          ],
        },
      },
    },
    colors: ["#388e3c"], // fallback
    dataLabels: { enabled: false },
    xaxis: {
      categories: chartLabels,
      labels: {
        style: { fontWeight: 600, fontSize: "12px" },
        rotate: period === "month" ? -45 : -30,
        minHeight: 20,
        maxHeight: 40,
        trim: true,
        hideOverlappingLabels: true,
      },
      tickAmount: period === "month" ? 10 : undefined,
    },
    yaxis: {
      labels: {
        formatter: (val) => `${formatK(val)}`,
        style: { fontWeight: 600 },
      },
    },
    tooltip: {
      y: {
        formatter: (val) => `₹${formatK(val)}`,
      },
    },
    grid: { strokeDashArray: 4 },
    legend: { show: false }, // HIDE LEGEND
  };

  return (
    <div className="col-xxl-3 col-xl-6 col-lg-6 col-md-6 col-sm-12">
      <div className="card h-100 radius-8 border">
        <div className="card-body p-24">
          <div className="d-flex flex-wrap align-items-center justify-content-between mb-16">
            <h6 className="mb-0 fw-semibold text-lg">
              Net Profit{" "}
              {period === "week" ? "(Last 7 Days)" : "(Last 30 Days)"}
            </h6>
            <select
              className="form-select bg-base form-select-sm w-auto"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
          </div>
          <div className="d-flex align-items-center gap-2 mb-20">
            {loading ? (
              <h6 className="fw-semibold mb-0">Loading...</h6>
            ) : error ? (
              <h6 className="fw-semibold mb-0 text-danger">{error}</h6>
            ) : (
              <h6 className="fw-semibold mb-0" style={{ color: latestColor }}>
                ₹{formatK(latest)}
              </h6>
            )}
          </div>
          <ReactApexChart
            options={barChartOptions}
            series={chartSeries}
            type="bar"
            height={260}
          />
        </div>
      </div>
    </div>
  );
};

export default TotalSubscriberOne;
