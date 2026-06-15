"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { DateRangePicker, CustomProvider } from "rsuite";
import enUS from "rsuite/locales/en_US";
import "rsuite/dist/rsuite.min.css";
import purchaseRequestApi from "../../services/purchaseRequestApi";
import { formatFreightInr } from "../../utils/freightDistribution";

function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return [start, end];
}

function getLastMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  end.setHours(23, 59, 59, 999);
  return [start, end];
}

function getLast30DaysRange() {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - 29);
  start.setHours(0, 0, 0, 0);
  return [start, end];
}

function formatDateParam(date) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

const DATE_RANGES = [
  { label: "This month", value: getCurrentMonthRange },
  { label: "Last month", value: getLastMonthRange },
  { label: "Last 30 days", value: getLast30DaysRange },
];

function SummaryCard({ label, value, icon, accent }) {
  return (
    <div className="col-6 col-md-4 col-xl">
      <div
        className="p-3 border rounded h-100"
        style={{ backgroundColor: "#f8f9fa" }}
      >
        <div className="d-flex align-items-center gap-2 mb-1">
          <Icon icon={icon} width={18} style={{ color: accent }} />
          <span className="text-muted small">{label}</span>
        </div>
        <div className="fw-semibold fs-5">{value}</div>
      </div>
    </div>
  );
}

export default function VendorSpendSummaryTab({ onViewRequest }) {
  const [dateRange, setDateRange] = useState(getCurrentMonthRange);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedVendors, setExpandedVendors] = useState(new Set());
  const [sortField, setSortField] = useState("grand_total");
  const [sortDirection, setSortDirection] = useState("desc");

  const fetchSummary = useCallback(async (range) => {
    if (!range?.[0] || !range?.[1]) return;

    setLoading(true);
    setError("");
    try {
      const from = formatDateParam(range[0]);
      const to = formatDateParam(range[1]);
      const result = await purchaseRequestApi.getVendorSpendSummary(from, to);
      if (result.success) {
        setSummary(result.data);
        setExpandedVendors(new Set());
      } else {
        setSummary(null);
        setError(result.message || "Failed to load vendor spend summary");
      }
    } catch (err) {
      setSummary(null);
      setError(err.message || "Failed to load vendor spend summary");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary(dateRange);
  }, [dateRange, fetchSummary]);

  const sortedVendors = useMemo(() => {
    if (!summary?.vendors) return [];
    const vendors = [...summary.vendors];
    vendors.sort((a, b) => {
      let valueA = a[sortField];
      let valueB = b[sortField];
      if (sortField === "company_name") {
        valueA = (a.company_name || "").toLowerCase();
        valueB = (b.company_name || "").toLowerCase();
      }
      if (valueA === valueB) return 0;
      if (valueA == null) return 1;
      if (valueB == null) return -1;
      if (typeof valueA === "string") {
        return sortDirection === "asc"
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      }
      return sortDirection === "asc" ? valueA - valueB : valueB - valueA;
    });
    return vendors;
  }, [summary?.vendors, sortField, sortDirection]);

  const toggleVendor = (vendorId) => {
    setExpandedVendors((prev) => {
      const next = new Set(prev);
      const key = String(vendorId);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "company_name" ? "asc" : "desc");
    }
  };

  const sortIcon = (field) => {
    if (sortField !== field) return "mdi:unfold-more-horizontal";
    return sortDirection === "asc" ? "mdi:arrow-up" : "mdi:arrow-down";
  };

  const totals = summary?.totals;
  const hasData = sortedVendors.length > 0;

  return (
    <div className="card basic-data-table">
      <div className="card-header d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
        <div>
          <h5 className="card-title mb-1">Vendor Spend Summary</h5>
          <p className="text-muted small mb-0">
            Fulfilled purchase requests by vendor (filtered by PR created date)
          </p>
        </div>
        <CustomProvider locale={enUS}>
          <DateRangePicker
            value={dateRange}
            onChange={(value) => {
              if (value) setDateRange(value);
            }}
            format="yyyy-MM-dd"
            ranges={DATE_RANGES.map(({ label, value }) => ({
              label,
              value: value(),
            }))}
            placement="bottomEnd"
            style={{ minWidth: 240 }}
          />
        </CustomProvider>
      </div>

      <div className="card-body">
        {error && (
          <div className="alert alert-danger py-2" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : (
          <>
            {totals && (
              <div className="row g-3 mb-4">
                <SummaryCard
                  label="Grand total"
                  value={formatFreightInr(totals.grand_total)}
                  icon="mdi:cash-multiple"
                  accent="#198754"
                />
                <SummaryCard
                  label="Items total"
                  value={formatFreightInr(totals.items_net_total)}
                  icon="mdi:package-variant"
                  accent="#0d6efd"
                />
                <SummaryCard
                  label="Freight total"
                  value={formatFreightInr(totals.freight_total)}
                  icon="mdi:truck"
                  accent="#fd7e14"
                />
                <SummaryCard
                  label="Vendor freight"
                  value={formatFreightInr(totals.vendor_freight_total)}
                  icon="mdi:truck-check"
                  accent="#6f42c1"
                />
                <SummaryCard
                  label="PRs / Vendors"
                  value={`${totals.pr_count} / ${totals.vendor_count}`}
                  icon="mdi:file-document-multiple"
                  accent="#20c997"
                />
              </div>
            )}

            {!hasData && !error && (
              <div className="text-center py-5 text-muted">
                <Icon
                  icon="mdi:chart-box-outline"
                  width={48}
                  className="mb-2 opacity-50"
                />
                <p className="mb-0">
                  No fulfilled purchase requests in this date range.
                </p>
              </div>
            )}

            {hasData && (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: 40 }} />
                      <th
                        role="button"
                        onClick={() => handleSort("company_name")}
                        className="user-select-none"
                      >
                        Vendor{" "}
                        <Icon icon={sortIcon("company_name")} width={14} />
                      </th>
                      <th
                        role="button"
                        onClick={() => handleSort("pr_count")}
                        className="text-end user-select-none"
                      >
                        PRs <Icon icon={sortIcon("pr_count")} width={14} />
                      </th>
                      <th
                        role="button"
                        onClick={() => handleSort("items_net_total")}
                        className="text-end user-select-none"
                      >
                        Items total{" "}
                        <Icon icon={sortIcon("items_net_total")} width={14} />
                      </th>
                      <th
                        role="button"
                        onClick={() => handleSort("freight_total")}
                        className="text-end user-select-none"
                      >
                        Freight{" "}
                        <Icon icon={sortIcon("freight_total")} width={14} />
                      </th>
                      <th
                        role="button"
                        onClick={() => handleSort("vendor_freight_total")}
                        className="text-end user-select-none"
                      >
                        Vendor freight{" "}
                        <Icon
                          icon={sortIcon("vendor_freight_total")}
                          width={14}
                        />
                      </th>
                      <th
                        role="button"
                        onClick={() => handleSort("grand_total")}
                        className="text-end user-select-none"
                      >
                        Grand total{" "}
                        <Icon icon={sortIcon("grand_total")} width={14} />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedVendors.map((vendor) => {
                      const vendorKey = String(
                        vendor.vendor_id ?? vendor.company_name
                      );
                      const isExpanded = expandedVendors.has(vendorKey);

                      return (
                        <React.Fragment key={vendorKey}>
                          <tr>
                            <td>
                              <button
                                type="button"
                                className="btn btn-sm btn-link p-0 text-secondary"
                                onClick={() => toggleVendor(vendorKey)}
                                aria-expanded={isExpanded}
                                aria-label={
                                  isExpanded ? "Collapse vendor" : "Expand vendor"
                                }
                              >
                                <Icon
                                  icon={
                                    isExpanded
                                      ? "mdi:chevron-down"
                                      : "mdi:chevron-right"
                                  }
                                  width={20}
                                />
                              </button>
                            </td>
                            <td>
                              <div className="fw-medium">
                                {vendor.company_name}
                              </div>
                              {vendor.vendor_name &&
                                vendor.vendor_name !== vendor.company_name && (
                                  <div className="text-muted small">
                                    {vendor.vendor_name}
                                  </div>
                                )}
                            </td>
                            <td className="text-end">{vendor.pr_count}</td>
                            <td className="text-end">
                              {formatFreightInr(vendor.items_net_total)}
                            </td>
                            <td className="text-end">
                              {formatFreightInr(vendor.freight_total)}
                            </td>
                            <td className="text-end">
                              {formatFreightInr(vendor.vendor_freight_total)}
                            </td>
                            <td className="text-end fw-semibold">
                              {formatFreightInr(vendor.grand_total)}
                            </td>
                          </tr>
                          {isExpanded &&
                            vendor.purchase_requests?.map((pr) => (
                              <tr
                                key={pr.request_id}
                                className="table-secondary"
                              >
                                <td />
                                <td className="ps-4">
                                  <span className="badge bg-light text-dark border me-2">
                                    {pr.pr_number || `PR-${pr.request_id}`}
                                  </span>
                                  <span className="text-muted small">
                                    {formatDisplayDate(pr.created_at)}
                                  </span>
                                </td>
                                <td />
                                <td className="text-end">
                                  {formatFreightInr(pr.items_net_total)}
                                </td>
                                <td className="text-end">
                                  {formatFreightInr(pr.freight_cost)}
                                </td>
                                <td className="text-end">
                                  {formatFreightInr(pr.vendor_freight_cost)}
                                </td>
                                <td className="text-end">
                                  <div className="d-flex align-items-center justify-content-end gap-2">
                                    <span className="fw-medium">
                                      {formatFreightInr(pr.grand_total)}
                                    </span>
                                    {onViewRequest && (
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-primary py-0 px-1"
                                        title="View PR details"
                                        onClick={() =>
                                          onViewRequest(
                                            {
                                              request_id: pr.request_id,
                                              status: "fulfilled",
                                            },
                                            "receipt-details"
                                          )
                                        }
                                      >
                                        <Icon icon="mdi:eye" width={16} />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
