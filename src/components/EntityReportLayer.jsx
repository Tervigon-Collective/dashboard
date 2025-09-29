"use client";
import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import {
  fetchGoogleAdsReport,
  fetchMetaAdsReport,
  fetchOrganicAttributionReport,
} from "@/api/api";

const EntityReportLayer = () => {
  const [activeTab, setActiveTab] = useState("google");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState({});

  // Date filters
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    campaignName: "",
    level: "campaign",
    adsetName: "",
    adName: "",
  });

  // Set default date range (last 7 days)
  useEffect(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    setFilters((prev) => ({
      ...prev,
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    }));
  }, []);

  const fetchData = async (reportType) => {
    if (!filters.startDate || !filters.endDate) {
      setError("Please select start and end dates");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let response;
      const baseParams = {
        startDate: filters.startDate,
        endDate: filters.endDate,
      };

      switch (reportType) {
        case "google":
          response = await fetchGoogleAdsReport({
            ...baseParams,
            ...(filters.campaignName && { campaignName: filters.campaignName }),
          });
          break;
        case "meta":
          response = await fetchMetaAdsReport({
            ...baseParams,
            level: filters.level,
            ...(filters.campaignName && { campaignName: filters.campaignName }),
            ...(filters.adsetName && { adsetName: filters.adsetName }),
            ...(filters.adName && { adName: filters.adName }),
          });
          break;
        case "organic":
          response = await fetchOrganicAttributionReport({
            ...baseParams,
            ...(filters.campaignName && { campaignName: filters.campaignName }),
          });
          break;
        default:
          throw new Error("Invalid report type");
      }

      setData((prev) => ({
        ...prev,
        [reportType]: response.data || [],
      }));
    } catch (err) {
      setError(err.message || `Failed to fetch ${reportType} report`);
      console.error(`${reportType} report error:`, err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat("en-IN").format(num || 0);
  };

  const formatPercentage = (num) => {
    return `${(num || 0).toFixed(2)}%`;
  };

  const renderGoogleAdsTable = () => {
    const googleData = data.google || [];

    return (
      <div className="table-responsive">
        <table className="table table-hover">
          <thead className="table-light">
            <tr>
              <th>Date</th>
              <th>Campaign</th>
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
            {googleData.map((row, index) => (
              <tr key={index}>
                <td>{row.date_start}</td>
                <td>
                  <span className="badge bg-primary-subtle text-primary">
                    {row.campaign_name}
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

  const renderMetaAdsTable = () => {
    const metaData = data.meta || [];

    return (
      <div className="table-responsive">
        <table className="table table-hover">
          <thead className="table-light">
            <tr>
              <th>Date</th>
              <th>Campaign</th>
              <th>Adset</th>
              <th>Ad</th>
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
            {metaData.map((row, index) => (
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
                <td>
                  <span className="badge bg-secondary-subtle text-secondary">
                    {row.ad_name}
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

  const renderOrganicTable = () => {
    const organicData = data.organic || [];

    return (
      <div className="table-responsive">
        <table className="table table-hover">
          <thead className="table-light">
            <tr>
              <th>Date</th>
              <th>Channel</th>
              <th>Campaign</th>
              <th>Revenue</th>
              <th>COGS</th>
              <th>ROAS</th>
              <th>Net Profit</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {organicData.map((row, index) => (
              <tr key={index}>
                <td>{row.date_start}</td>
                <td>
                  <span className="badge bg-success-subtle text-success">
                    {row.channel}
                  </span>
                </td>
                <td>
                  <span className="badge bg-primary-subtle text-primary">
                    {row.campaign_name}
                  </span>
                </td>
                <td className="fw-semibold text-success">
                  {formatCurrency(row.shopify_revenue)}
                </td>
                <td className="fw-semibold">
                  {formatCurrency(row.shopify_cogs)}
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
                <td>{formatNumber(row.total_sku_quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderSummaryCards = () => {
    const googleData = data.google || [];
    const metaData = data.meta || [];
    const organicData = data.organic || [];

    const totalSpend = [...googleData, ...metaData].reduce(
      (sum, row) => sum + (row.spend || 0),
      0
    );
    const totalRevenue = [...googleData, ...metaData, ...organicData].reduce(
      (sum, row) => sum + (row.shopify_revenue || 0),
      0
    );
    const totalOrders = [...googleData, ...metaData].reduce(
      (sum, row) => sum + (row.shopify_orders || 0),
      0
    );
    const totalNetProfit = [...googleData, ...metaData, ...organicData].reduce(
      (sum, row) => sum + (row.net_profit || 0),
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

  return (
    <div className="card h-100 radius-8 border">
      <div className="card-body p-24">
        <div className="d-flex justify-content-between align-items-center mb-20">
          <h6 className="fw-semibold text-lg mb-0">Entity Report</h6>
          <Icon
            icon="solar:chart-bold"
            className="text-primary"
            style={{ fontSize: "24px" }}
          />
        </div>

        {/* Filters */}
        <div className="row mb-20">
          <div className="col-md-2">
            <label className="form-label">Start Date</label>
            <input
              type="date"
              className="form-control"
              value={filters.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
            />
          </div>
          <div className="col-md-2">
            <label className="form-label">End Date</label>
            <input
              type="date"
              className="form-control"
              value={filters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
            />
          </div>
          <div className="col-md-2">
            <label className="form-label">Campaign Name</label>
            <input
              type="text"
              className="form-control"
              placeholder="Filter by campaign"
              value={filters.campaignName}
              onChange={(e) =>
                handleFilterChange("campaignName", e.target.value)
              }
            />
          </div>
          {activeTab === "meta" && (
            <>
              <div className="col-md-2">
                <label className="form-label">Level</label>
                <select
                  className="form-control"
                  value={filters.level}
                  onChange={(e) => handleFilterChange("level", e.target.value)}
                >
                  <option value="campaign">Campaign</option>
                  <option value="adset">Adset</option>
                  <option value="ad">Ad</option>
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">Adset Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Filter by adset"
                  value={filters.adsetName}
                  onChange={(e) =>
                    handleFilterChange("adsetName", e.target.value)
                  }
                />
              </div>
              <div className="col-md-2">
                <label className="form-label">Ad Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Filter by ad"
                  value={filters.adName}
                  onChange={(e) => handleFilterChange("adName", e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-20">
          <ul className="nav nav-tabs" role="tablist">
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === "google" ? "active" : ""}`}
                onClick={() => setActiveTab("google")}
              >
                <Icon icon="logos:google-icon" className="me-2" />
                Google Ads
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === "meta" ? "active" : ""}`}
                onClick={() => setActiveTab("meta")}
              >
                <Icon icon="logos:meta-icon" className="me-2" />
                Meta Ads
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${
                  activeTab === "organic" ? "active" : ""
                }`}
                onClick={() => setActiveTab("organic")}
              >
                <Icon icon="solar:leaf-bold" className="me-2" />
                Organic Attribution
              </button>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="mb-20">
          <button
            className="btn btn-primary me-2"
            onClick={() => fetchData(activeTab)}
            disabled={loading}
          >
            {loading ? (
              <Icon icon="eos-icons:loading" className="me-1" />
            ) : (
              <Icon icon="solar:magnifer-linear" className="me-1" />
            )}
            {loading ? "Loading..." : "Fetch Data"}
          </button>
          <button
            className="btn btn-success"
            onClick={() => {
              fetchData("google");
              fetchData("meta");
              fetchData("organic");
            }}
            disabled={loading}
          >
            <Icon icon="solar:refresh-bold" className="me-1" />
            Fetch All Reports
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="alert alert-danger" role="alert">
            <Icon icon="solar:danger-circle-bold" className="me-2" />
            {error}
          </div>
        )}

        {/* Summary Cards */}
        {Object.keys(data).some((key) => data[key].length > 0) &&
          renderSummaryCards()}

        {/* Data Tables */}
        <div className="tab-content">
          {activeTab === "google" && renderGoogleAdsTable()}
          {activeTab === "meta" && renderMetaAdsTable()}
          {activeTab === "organic" && renderOrganicTable()}
        </div>

        {/* No Data Message */}
        {!loading &&
          !error &&
          (!data[activeTab] || data[activeTab].length === 0) && (
            <div className="text-center py-4">
              <Icon
                icon="solar:chart-2-bold"
                className="text-muted"
                style={{ fontSize: "48px" }}
              />
              <p className="text-muted mt-2">
                No data available for the selected date range
              </p>
            </div>
          )}
      </div>
    </div>
  );
};

export default EntityReportLayer;
