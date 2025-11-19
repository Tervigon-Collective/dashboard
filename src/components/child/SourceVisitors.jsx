"use client";
import React, { useEffect, useState } from "react";
import { apiClient } from "../../api/api";
import config from "../../config";

const allowed = ["week", "month", "year"];
const labelMap = {
  week: "Last Week",
  month: "Last Month",
  year: "Last Year",
};

const SourceVisitors = () => {
  const [timeframe, setTimeframe] = useState("week");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    apiClient
      .get(`/api/source_visitor/${timeframe}`)
      .then((res) => {
        if (!cancelled) {
          setData(res.data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError("Failed to load data");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [timeframe]);

  // Compute total
  // Map API fields to UI
  const total = data
    ? [data.fb, data.insta, data.google, data.organic].reduce(
        (a, b) => a + (b || 0),
        0
      )
    : 0;

  // Find the max value for dynamic bar heights
  const maxValue = data
    ? Math.max(
        data.fb || 0,
        data.insta || 0,
        data.google || 0,
        data.organic || 0
      )
    : 1;

  // Prepare bar data for dynamic sorting
  const barData = [
    {
      key: "google",
      label: "Google",
      value: data?.google ?? 0,
      icon: "assets/images/home-nine/source-icon5.png",
      bg: "bg-tb-warning",
      circle: "bg-warning-600",
    },
    {
      key: "insta",
      label: "Instagram",
      value: data?.insta ?? 0,
      icon: "assets/images/home-nine/source-icon2.png",
      bg: "bg-tb-lilac",
      circle: "bg-lilac-600",
    },
    {
      key: "fb",
      label: "Facebook",
      value: data?.fb ?? 0,
      icon: "assets/images/home-nine/source-icon3.png",
      bg: "bg-tb-primary",
      circle: "bg-primary-600",
    },
    {
      key: "organic",
      label: "Organic",
      value: data?.organic ?? 0,
      icon: "assets/images/home-nine/source-icon4.png",
      bg: "bg-tb-success",
      circle: "bg-success-600",
    },
  ];
  // Sort so the highest value comes last (rightmost in row)
  const sortedBars = [...barData].sort((a, b) => b.value - a.value).reverse();

  return (
    <div className="col-xxl-5 col-xl-12 col-lg-12 col-md-12 col-sm-12">
      <div className="card h-100">
        <div className="card-header border-bottom-0 pb-0 d-flex align-items-center flex-wrap gap-2 justify-content-between">
          <h6 className="mb-2 fw-bold text-lg mb-0">Channel Conversion</h6>
          <select
            className="form-select form-select-sm w-auto bg-base border text-secondary-light"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
          >
            {allowed.map((opt) => (
              <option key={opt} value={opt}>
                {labelMap[opt]}
              </option>
            ))}
          </select>
        </div>
        <div className="card-body" style={{ overflow: "hidden" }}>
          <div
            className="position-relative h-100 min-h-320-px"
            style={{ overflow: "hidden" }}
          >
            <div className="md-position-absolute start-0 top-0 mt-20">
              <h6 className="mb-1">
                {loading ? "Loading..." : error ? "--" : total.toLocaleString()}
              </h6>
              <span className="text-secondary-light">
                Total Platform Conversion
              </span>
            </div>
            <div
              className="row g-3 h-100"
              style={{ margin: 0, overflow: "hidden" }}
            >
              {sortedBars.map((bar, idx) => (
                <div
                  key={bar.key}
                  className="col-12 col-md-3 d-flex flex-column justify-content-end"
                  style={{
                    overflow: "hidden",
                    paddingLeft: "0.5rem",
                    paddingRight: "0.5rem",
                  }}
                >
                  <div
                    className={`d-flex flex-column align-items-center justify-content-between rounded-top-4 ${bar.bg}`}
                    style={{
                      minHeight: `${
                        data && maxValue
                          ? Math.min((bar.value / maxValue) * 100, 100)
                          : 50
                      }%`,
                      maxHeight: "100%",
                      width: "100%",
                      padding: "16px 24px 16px 24px",
                      boxSizing: "border-box",
                    }}
                  >
                    <div
                      className="d-flex flex-column align-items-center"
                      style={{
                        flex: 1,
                        justifyContent: "flex-start",
                        paddingTop: "8px",
                      }}
                    >
                      <span
                        className={`w-40-px h-40-px d-flex flex-shrink-0 justify-content-center align-items-center ${bar.circle} rounded-circle mb-12`}
                      >
                        <img src={bar.icon} alt={bar.label} />
                      </span>
                      <span
                        className="text-secondary-light"
                        style={{ fontSize: "12px" }}
                      >
                        {bar.label}
                      </span>
                    </div>
                    <h6
                      className="mb-0"
                      style={{ marginTop: "auto", paddingTop: "8px" }}
                    >
                      {loading ? "--" : error ? "--" : bar.value ?? "--"}
                    </h6>
                  </div>
                </div>
              ))}
            </div>
            {error && <div className="text-danger mt-3">{error}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SourceVisitors;
