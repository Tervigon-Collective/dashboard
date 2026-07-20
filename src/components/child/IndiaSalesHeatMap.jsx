"use client";

import React from "react";
import IndiaHeatMap from "./IndiaHeatMap";
import { useProvinceSalesQuery } from "@/hooks/dashboard/useProvinceSalesQuery";
import { useUser } from "@/helper/UserContext";

const IndiaSalesHeatMap = () => {
  const { user, loading: authLoading } = useUser();
  const [period, setPeriod] = React.useState("today");

  const { data, isLoading, isError, refetch, isFetching } =
    useProvinceSalesQuery(period, {
      enabled: !authLoading && !!user,
    });

  const salesData = data?.rows ?? [];
  const totalSales = data?.total ?? 0;

  return (
    <div className="col-12">
      <div className="card radius-8 border-0 h-100 shadow-sm">
        <div className="card-body p-0">
          <div className="d-flex flex-column flex-md-row align-items-stretch align-items-md-center justify-content-between gap-3 px-3 px-md-4 py-3 border-bottom">
            <div className="min-w-0">
              <h6 className="mb-1 fw-semibold text-lg">Sales by Region</h6>
              {!isLoading && !isError && (
                <p className="mb-0 text-secondary-light small">
                  Total Sales:{" "}
                  <span className="text-primary-600 fw-semibold">
                    ₹{Number(totalSales).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </span>
                </p>
              )}
            </div>
            <select
              className="form-select form-select-sm bg-base border text-secondary-light ms-md-auto"
              style={{ minWidth: 120, maxWidth: 160 }}
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              disabled={isFetching}
            >
              <option value="today">Today</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
          </div>

          <div
            className="position-relative w-100 px-2 px-md-3 pb-3"
            style={{
              minHeight: "clamp(320px, 52vw, 480px)",
            }}
          >
            {isLoading ? (
              <div
                className="d-flex justify-content-center align-items-center h-100"
                style={{ minHeight: "clamp(320px, 52vw, 480px)" }}
              >
                <div className="spinner-border text-primary" role="status" />
              </div>
            ) : isError ? (
              <div
                className="d-flex justify-content-center align-items-center h-100"
                style={{ minHeight: "clamp(320px, 52vw, 480px)" }}
              >
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => refetch()}
                >
                  Retry
                </button>
              </div>
            ) : salesData.length === 0 ? (
              <div
                className="d-flex justify-content-center align-items-center h-100"
                style={{ minHeight: "clamp(320px, 52vw, 480px)" }}
              >
                <p className="mb-0 text-muted">No sales data for this period</p>
              </div>
            ) : (
              <IndiaHeatMap salesData={salesData} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndiaSalesHeatMap;
