"use client";
import useReactApexChart from "@/hook/useReactApexChart";
import dynamic from "next/dynamic";
import { useState, useMemo } from "react";
import { useTimeframeData } from "@/helper/TimeframeDataContext";
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export const Loader = () => (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: 250,
    }}
  >
    <div className="spinner-border text-primary" role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
  </div>
);

const GeneratedContent = () => {
  const [timeframe, setTimeframe] = useState("Year");
  const { data, loading } = useTimeframeData();
  let { paymentStatusChartSeries, paymentStatusChartOptions } =
    useReactApexChart();

  // Prepare chart data from context
  const { chartSeries, chartOptions } = useMemo(() => {
    if (
      !data ||
      !data[timeframe] ||
      !Array.isArray(data[timeframe]) ||
      data[timeframe].length === 0
    ) {
      return { chartSeries: [], chartOptions: {} };
    }
    const raw = data[timeframe];
    let categories;
    if (timeframe === "Month") {
      categories = raw.map((item) => item.date || "");
    } else {
      categories = raw.map((item) => item.month || item.day || item.date || "");
    }
    const adSpend = raw.map((item) => item.spend || 0);
    const totalRevenue = raw.map(
      (item) => (item.totalSales || 0) - (item.cancelledAmount || 0)
    );
    const isMonth = timeframe === "Month";

    // Detect mobile screen size
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    const isSmallMobile =
      typeof window !== "undefined" && window.innerWidth < 576;

    return {
      chartSeries: [
        { name: "Ad Spend", data: adSpend },
        { name: "Total Revenue", data: totalRevenue },
      ],
      chartOptions: {
        chart: {
          type: "bar",
          height: isSmallMobile ? 300 : isMobile ? 320 : 350,
          toolbar: { show: false },
          zoom: { enabled: false },
        },
        plotOptions: {
          bar: {
            borderRadius: 6,
            horizontal: false,
            // Responsive column width: smaller on mobile to prevent overlapping
            columnWidth: isSmallMobile
              ? "30%"
              : isMobile
              ? isMonth
                ? "35%"
                : "35%"
              : isMonth
              ? "40%"
              : 24,
            endingShape: "rounded",
            grouped: true,
            barHeight: "100%",
            dataLabels: {
              position: "top",
            },
          },
        },
        dataLabels: { enabled: false },
        xaxis: {
          categories,
          labels: {
            rotate: isSmallMobile ? -90 : -45,
            style: {
              fontSize: isSmallMobile ? "9px" : isMobile ? "10px" : "11px",
            },
            maxHeight: isSmallMobile ? 60 : isMobile ? 50 : 40,
            trim: true,
            hideOverlappingLabels: true,
          },
          tickAmount: isSmallMobile
            ? Math.min(categories.length, 6)
            : undefined,
        },
        yaxis: {
          labels: {
            formatter: (value) => {
              const num = Math.abs(value);
              if (num >= 10000000) {
                // Crores (1 crore = 10 million)
                return `₹${(value / 10000000).toFixed(1)}Cr`;
              } else if (num >= 100000) {
                // Lakhs (1 lakh = 100,000)
                return `₹${(value / 100000).toFixed(1)}L`;
              } else if (num >= 1000) {
                // Thousands
                return `₹${(value / 1000).toFixed(1)}k`;
              }
              return `₹${value.toFixed(0)}`;
            },
            style: {
              fontSize: isSmallMobile ? "9px" : isMobile ? "10px" : "11px",
            },
            offsetY: 0,
            offsetX: 0,
            minWidth: isSmallMobile ? 40 : isMobile ? 48 : 56,
            align: "right",
          },
          title: {
            text: "₹",
            style: {
              fontWeight: 600,
              fontSize: isSmallMobile ? "10px" : "12px",
            },
          },
          tickAmount: isSmallMobile ? 4 : isMobile ? 5 : 6,
        },
        fill: { opacity: 1 },
        colors: ["#487FFF", "#FFC107"],
        legend: { show: false },
        grid: {
          padding: {
            left: isSmallMobile ? 20 : isMobile ? 24 : 28,
            right: isSmallMobile ? 4 : 8,
          },
          xaxis: {
            lines: {
              show: false,
            },
          },
        },
        // Responsive breakpoints for ApexCharts
        responsive: [
          {
            breakpoint: 576,
            options: {
              chart: {
                height: 300,
              },
              plotOptions: {
                bar: {
                  columnWidth: "30%",
                },
              },
              xaxis: {
                labels: {
                  rotate: -90,
                  style: {
                    fontSize: "9px",
                  },
                  maxHeight: 60,
                },
                tickAmount: Math.min(categories.length, 6),
              },
              yaxis: {
                labels: {
                  formatter: (value) => {
                    const num = Math.abs(value);
                    if (num >= 10000000) {
                      return `₹${(value / 10000000).toFixed(1)}Cr`;
                    } else if (num >= 100000) {
                      return `₹${(value / 100000).toFixed(1)}L`;
                    } else if (num >= 1000) {
                      return `₹${(value / 1000).toFixed(1)}k`;
                    }
                    return `₹${value.toFixed(0)}`;
                  },
                  style: {
                    fontSize: "9px",
                  },
                  minWidth: 40,
                },
                tickAmount: 4,
              },
              grid: {
                padding: {
                  left: 20,
                  right: 4,
                },
              },
            },
          },
          {
            breakpoint: 768,
            options: {
              chart: {
                height: 320,
              },
              plotOptions: {
                bar: {
                  columnWidth: isMonth ? "35%" : "35%",
                },
              },
              xaxis: {
                labels: {
                  rotate: -45,
                  style: {
                    fontSize: "10px",
                  },
                  maxHeight: 50,
                },
              },
              yaxis: {
                labels: {
                  formatter: (value) => {
                    const num = Math.abs(value);
                    if (num >= 10000000) {
                      return `₹${(value / 10000000).toFixed(1)}Cr`;
                    } else if (num >= 100000) {
                      return `₹${(value / 100000).toFixed(1)}L`;
                    } else if (num >= 1000) {
                      return `₹${(value / 1000).toFixed(1)}k`;
                    }
                    return `₹${value.toFixed(0)}`;
                  },
                  style: {
                    fontSize: "10px",
                  },
                  minWidth: 48,
                },
                tickAmount: 5,
              },
              grid: {
                padding: {
                  left: 24,
                  right: 6,
                },
              },
            },
          },
        ],
      },
    };
  }, [data, timeframe]);

  return (
    <div className="col-xxl-7 col-xl-12 col-lg-12 col-md-12 col-sm-12">
      <div className="card" style={{ padding: 14 }}>
        <div className="card-body">
          <div className="d-flex align-items-center flex-wrap gap-2 justify-content-between">
            <h6 className="mb-2 fw-bold text-lg mb-0">
              Ad Spend & Revenue Overview
            </h6>
            <select
              className="form-select form-select-sm w-auto bg-base border text-secondary-light"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
            >
              <option value="Year">Year</option>
              <option value="Month">Month</option>
              <option value="Week">Week</option>
            </select>
          </div>
          {/* Custom legend above chart */}
          <div className="d-flex align-items-center gap-4 mt-3 mb-2">
            <div className="d-flex align-items-center gap-1">
              <span
                className="w-12-px h-12-px rounded-circle"
                style={{ background: "#487FFF" }}
              />
              <span className="fw-semibold text-sm">Ad Spend</span>
            </div>
            <div className="d-flex align-items-center gap-1">
              <span
                className="w-12-px h-12-px rounded-circle"
                style={{ background: "#FFC107" }}
              />
              <span className="fw-semibold text-sm">Total Revenue</span>
            </div>
          </div>
          <div className="mt-40">
            <div className="margin-16-minus">
              {loading ? (
                <Loader />
              ) : chartSeries.length > 0 && chartOptions.xaxis ? (
                <ReactApexChart
                  options={chartOptions}
                  series={chartSeries}
                  type="bar"
                  height={
                    typeof window !== "undefined" && window.innerWidth < 576
                      ? 300
                      : typeof window !== "undefined" && window.innerWidth < 768
                      ? 320
                      : 350
                  }
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height:
                      typeof window !== "undefined" && window.innerWidth < 576
                        ? 300
                        : typeof window !== "undefined" &&
                          window.innerWidth < 768
                        ? 320
                        : 350,
                  }}
                >
                  <p className="text-secondary-light">No data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneratedContent;
