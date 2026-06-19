"use client";
import { Icon } from "@iconify/react/dist/iconify.js";
import Link from "next/link";
import React, { useState } from "react";
import config from "../../config";
import { useTopSkusQuery } from "@/hooks/dashboard/useTopSkusQuery";
import { useUser } from "@/helper/UserContext";

const TopPerformerOne = () => {
  const { user, loading: authLoading } = useUser();
  const [period, setPeriod] = useState("today");
  const { data: skus = [], isLoading, isError } = useTopSkusQuery(period, 6, {
    enabled: !authLoading && !!user,
  });

  return (
    <div className="col-xxl-3 col-xl-6 col-lg-6 col-md-6 col-sm-12">
      <div className="card h-100">
        <div className="card-body" style={{ overflow: "hidden" }}>
          <div className="d-flex align-items-center flex-wrap gap-2 justify-content-between">
            <h6 className="mb-2 fw-bold text-lg mb-0">Top Performing SKU</h6>
            <div>
              <select
                className="form-select form-select-sm w-auto bg-base border text-secondary-light"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option value="today">Today</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
              </select>
            </div>
          </div>
          <div className="mt-16">
            {isLoading ? (
              <div className="text-center py-4">
                <div className="spinner-border spinner-border-sm text-primary" />
              </div>
            ) : isError ? (
              <p className="text-danger text-center py-4 mb-0">Failed to load data</p>
            ) : skus.length === 0 ? (
              <p className="text-muted text-center py-4 mb-0">No data</p>
            ) : (
              <div>
                {skus.map((item, index) => (
                  <div
                    className="d-flex align-items-center justify-content-between gap-3 mb-12"
                    key={`${item.sku}-${index}`}
                  >
                    <div className="d-flex align-items-center">
                      <div
                        className="w-40-px h-40-px rounded-circle flex-shrink-0 me-12 overflow-hidden"
                        style={{ backgroundColor: "#E3F2FD" }}
                      >
                        <div className="w-100 h-100 d-flex align-items-center justify-content-center fw-bold text-primary">
                          {index + 1}
                        </div>
                      </div>
                      <div className="flex-grow-1">
                        <h6 className="text-md mb-0 fw-medium text-truncate" style={{ maxWidth: 160 }}>
                          {item.sku}
                        </h6>
                      </div>
                    </div>
                    <span className="text-primary-light text-md fw-semibold">
                      ₹{Number(item.total_sales).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Link
            href={`${config.api.baseURL}/`}
            className="btn btn-outline-primary-600 radius-8 px-16 py-9 w-100 mt-16"
            style={{ display: "none" }}
          >
            View All
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TopPerformerOne;
