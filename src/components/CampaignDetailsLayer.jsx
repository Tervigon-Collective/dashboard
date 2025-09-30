"use client";
import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchMetaAdsReport } from "../api/api";

const CampaignDetailsLayer = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get parameters from URL
  const campaignName = searchParams.get("campaign");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  useEffect(() => {
    if (campaignName && startDate && endDate) {
      fetchAdsetData();
    }
  }, [campaignName, startDate, endDate]);

  const fetchAdsetData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchMetaAdsReport({
        startDate,
        endDate,
        level: "adset",
        campaignName: campaignName,
      });

      setData(response.data || []);
    } catch (err) {
      setError(err.message || "Failed to fetch adset data");
      console.error("Adset data error:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    const numericValue = parseFloat(amount) || 0;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numericValue);
  };

  const formatNumber = (num) => {
    const numericValue = Number(num) || 0;
    return new Intl.NumberFormat("en-IN").format(numericValue);
  };

  const formatPercentage = (num) => {
    const numericValue = parseFloat(num) || 0;
    return `${numericValue.toFixed(2)}%`;
  };

  const goBack = () => {
    router.back();
  };

  const renderAdsetTable = () => {
    return (
      <div className="table-responsive">
        <table className="table table-hover">
          <thead className="table-light">
            <tr>
              <th>Date</th>
              <th>Campaign</th>
              <th>Adset</th>
              <th>Impressions</th>
              <th>Clicks</th>
              <th>CTR</th>
              <th>Spend</th>
              <th>CPC</th>
              <th>Orders</th>
              <th>Revenue</th>
              <th>ROAS</th>
              <th>Net Profit</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index}>
                <td>{row.date_start}</td>
                <td>
                  <span className="badge bg-primary-subtle text-primary">
                    {row.campaign_name}
                  </span>
                </td>
                <td>
                  <span className="badge bg-info-subtle text-info">
                    {row.adset_name}
                  </span>
                </td>
                <td>{formatNumber(row.impressions)}</td>
                <td>{formatNumber(row.clicks)}</td>
                <td>{formatPercentage(row.ctr)}</td>
                <td className="fw-semibold">{formatCurrency(row.spend)}</td>
                <td>{formatCurrency(row.cpc)}</td>
                <td>{formatNumber(row.shopify_orders)}</td>
                <td className="fw-semibold text-success">
                  {formatCurrency(row.shopify_revenue)}
                </td>
                <td className="fw-semibold">
                  <span
                    className={`badge ${
                      row.gross_roas >= 2
                        ? "bg-success-subtle text-success"
                        : "bg-warning-subtle text-warning"
                    }`}
                  >
                    {row.gross_roas?.toFixed(2)}x
                  </span>
                </td>
                <td
                  className={`fw-semibold ${
                    row.net_profit >= 0 ? "text-success" : "text-danger"
                  }`}
                >
                  {formatCurrency(row.net_profit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderSummaryCards = () => {
    const totalSpend = data.reduce(
      (sum, row) => sum + (Number(row.spend) || 0),
      0
    );
    const totalRevenue = data.reduce(
      (sum, row) => sum + (Number(row.shopify_revenue) || 0),
      0
    );
    const totalOrders = data.reduce(
      (sum, row) => sum + (Number(row.shopify_orders) || 0),
      0
    );
    const totalNetProfit = data.reduce(
      (sum, row) => sum + (Number(row.net_profit) || 0),
      0
    );

    return (
      <div className="row mb-20">
        <div className="col-md-3">
          <div className="card bg-primary-subtle">
            <div className="card-body text-center">
              <h6 className="text-primary">Total Spend</h6>
              <h4 className="text-primary">{formatCurrency(totalSpend)}</h4>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-success-subtle">
            <div className="card-body text-center">
              <h6 className="text-success">Total Revenue</h6>
              <h4 className="text-success">{formatCurrency(totalRevenue)}</h4>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-info-subtle">
            <div className="card-body text-center">
              <h6 className="text-info">Total Orders</h6>
              <h4 className="text-info">{formatNumber(totalOrders)}</h4>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-warning-subtle">
            <div className="card-body text-center">
              <h6 className="text-warning">Net Profit</h6>
              <h4
                className={`${
                  totalNetProfit >= 0 ? "text-success" : "text-danger"
                }`}
              >
                {formatCurrency(totalNetProfit)}
              </h4>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!campaignName || !startDate || !endDate) {
    return (
      <div className="card h-100 radius-8 border">
        <div className="card-body p-24 text-center">
          <Icon
            icon="solar:danger-circle-bold"
            className="text-danger"
            style={{ fontSize: "48px" }}
          />
          <h5 className="mt-3">Missing Parameters</h5>
          <p className="text-muted">
            Please navigate from the Entity Report page.
          </p>
          <button className="btn btn-primary" onClick={goBack}>
            <Icon icon="solar:arrow-left-bold" className="me-2" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card h-100 radius-8 border">
      <div className="card-body p-24">
        <div className="d-flex justify-content-between align-items-center mb-20">
          <div>
            <h6 className="fw-semibold text-lg mb-0">
              Campaign Details: {campaignName}
            </h6>
            <p className="text-muted mb-0">
              Date Range: {startDate} to {endDate}
            </p>
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-outline-secondary" onClick={goBack}>
              <Icon icon="solar:arrow-left-bold" className="me-2" />
              Back to Reports
            </button>
            <button
              className="btn btn-primary"
              onClick={fetchAdsetData}
              disabled={loading}
            >
              {loading ? (
                <Icon icon="eos-icons:loading" className="me-1" />
              ) : (
                <Icon icon="solar:refresh-bold" className="me-1" />
              )}
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="alert alert-danger" role="alert">
            <Icon icon="solar:danger-circle-bold" className="me-2" />
            {error}
          </div>
        )}

        {/* Summary Cards */}
        {data.length > 0 && renderSummaryCards()}

        {/* Data Table */}
        {data.length > 0 && renderAdsetTable()}

        {/* No Data Message */}
        {!loading && !error && data.length === 0 && (
          <div className="text-center py-4">
            <Icon
              icon="solar:chart-2-bold"
              className="text-muted"
              style={{ fontSize: "48px" }}
            />
            <p className="text-muted mt-2">
              No adset data available for this campaign
            </p>
          </div>
        )}

        {/* Loading Message */}
        {loading && (
          <div className="text-center py-4">
            <Icon
              icon="eos-icons:loading"
              className="text-primary"
              style={{ fontSize: "48px" }}
            />
            <p className="text-muted mt-2">Loading adset data...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignDetailsLayer;
