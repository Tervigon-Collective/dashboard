"use client";
import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchAmazonEntityReport } from "../api/api";

const AmazonCampaignDetailsLayer = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [data, setData] = useState([]);
  const [campaignData, setCampaignData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get parameters from URL
  const campaignName = searchParams.get("campaign");
  const campaignId = searchParams.get("campaignId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  useEffect(() => {
    if (campaignName && campaignId && startDate && endDate) {
      fetchAdgroupData();
    }
  }, [campaignName, campaignId, startDate, endDate]);

  const fetchAdgroupData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchAmazonEntityReport({
        startDate,
        endDate,
      });

      if (response.success && response.data) {
        // Find the specific campaign data
        const campaign = response.data[campaignId];

        if (campaign) {
          setCampaignData(campaign);

          // Process adgroup data for the table
          const adgroupData = [];
          Object.values(campaign.adgroups || {}).forEach((adgroup) => {
            const adgroupMetrics = calculateAdgroupMetrics(adgroup);
            adgroupData.push({
              adgroup_id: adgroup.adgroup_id,
              adgroup_name: adgroup.adgroup_name,
              adgroup_status: adgroup.adgroup_status,
              default_bid: adgroup.default_bid,
              ...adgroupMetrics,
            });
          });

          setData(adgroupData);
        } else {
          setError("Campaign not found");
        }
      } else {
        setError("Failed to fetch campaign data");
      }
    } catch (err) {
      setError(err.message || "Failed to fetch adgroup data");
      console.error("Adgroup data error:", err);
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

  const calculateAdgroupMetrics = (adgroup) => {
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalSpend = 0;
    let totalOrders = 0;
    let totalRevenue = 0;
    let totalRoas = 0;
    let totalAcos = 0;

    // Aggregate from daily records
    if (adgroup.daily_records) {
      adgroup.daily_records.forEach((record) => {
        totalImpressions += record.impressions || 0;
        totalClicks += record.clicks || 0;
        totalSpend += record.spend || 0;
        totalOrders += record.orders || 0;
        totalRevenue += record.sales || 0;
      });
    }

    // Calculate derived metrics
    const ctr =
      totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const acos = totalRevenue > 0 ? (totalSpend / totalRevenue) * 100 : 0;

    // Count products
    const productsCount = adgroup.products
      ? Object.keys(adgroup.products).length
      : 0;

    // Get product details
    let productDetails = [];
    if (adgroup.products) {
      Object.keys(adgroup.products).forEach((asin) => {
        const product = adgroup.products[asin];
        productDetails.push(`${product.sku} (ASIN: ${asin})`);
      });
    }

    return {
      totalImpressions,
      totalClicks,
      totalSpend,
      totalOrders,
      totalRevenue,
      ctr,
      cpc,
      roas,
      acos,
      productsCount,
      productDetails: productDetails.join(", ") || "No products",
    };
  };

  const goBack = () => {
    router.back();
  };

  const renderAdgroupTable = () => {
    return (
      <div className="table-responsive">
        <table className="table table-hover">
          <thead className="table-light">
            <tr>
              <th>Adgroup Name</th>
              <th>Status</th>
              <th>Default Bid</th>
              <th>Impressions</th>
              <th>Clicks</th>
              <th>CTR</th>
              <th>CPC</th>
              <th>Spend</th>
              <th>Orders</th>
              <th>Revenue</th>
              <th>ROAS</th>
              <th>ACOS</th>
              <th>Products</th>
              <th>Product Details</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr
                key={index}
                style={{ cursor: "pointer" }}
                onClick={() => {
                  // Navigate to adgroup details page
                  const params = new URLSearchParams({
                    campaign: campaignName,
                    campaignId: campaignId,
                    adgroup: row.adgroup_name,
                    adgroupId: row.adgroup_id,
                    startDate: startDate,
                    endDate: endDate,
                  });
                  router.push(`/amazon-adgroup-details?${params.toString()}`);
                }}
              >
                <td>
                  <div className="d-flex flex-column">
                    <span className="fw-semibold">{row.adgroup_name}</span>
                    <small className="text-muted">ID: {row.adgroup_id}</small>
                  </div>
                </td>
                <td>
                  <span
                    className={`badge ${
                      row.adgroup_status === "ENABLED"
                        ? "bg-success"
                        : row.adgroup_status === "PAUSED"
                        ? "bg-warning"
                        : "bg-secondary"
                    }`}
                  >
                    {row.adgroup_status || "Unknown"}
                  </span>
                </td>
                <td>{formatCurrency(row.default_bid)}</td>
                <td>{formatNumber(row.totalImpressions)}</td>
                <td>{formatNumber(row.totalClicks)}</td>
                <td>{formatPercentage(row.ctr)}</td>
                <td>{formatCurrency(row.cpc)}</td>
                <td
                  style={{
                    color: "#ca8a04",
                    fontWeight: "600",
                  }}
                >
                  {formatCurrency(row.totalSpend)}
                </td>
                <td>{formatNumber(row.totalOrders)}</td>
                <td
                  style={{
                    color: "#16a34a",
                    fontWeight: "600",
                  }}
                >
                  {formatCurrency(row.totalRevenue)}
                </td>
                <td>
                  <span
                    style={{
                      backgroundColor:
                        row.roas >= 3
                          ? "#dcfce7"
                          : row.roas >= 1.5
                          ? "#fef3c7"
                          : row.roas > 0
                          ? "#fee2e2"
                          : "transparent",
                      color:
                        row.roas >= 3
                          ? "#166534"
                          : row.roas >= 1.5
                          ? "#92400e"
                          : row.roas > 0
                          ? "#991b1b"
                          : "#374151",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontWeight: "500",
                    }}
                  >
                    {row.roas.toFixed(2)}x
                  </span>
                </td>
                <td>
                  <span
                    style={{
                      backgroundColor:
                        row.acos <= 30
                          ? "#dcfce7"
                          : row.acos <= 50
                          ? "#fef3c7"
                          : row.acos > 0
                          ? "#fee2e2"
                          : "transparent",
                      color:
                        row.acos <= 30
                          ? "#166534"
                          : row.acos <= 50
                          ? "#92400e"
                          : row.acos > 0
                          ? "#991b1b"
                          : "#374151",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontWeight: "500",
                    }}
                  >
                    {row.acos.toFixed(2)}%
                  </span>
                </td>
                <td>{row.productsCount}</td>
                <td>
                  <div className="text-truncate" style={{ maxWidth: "200px" }}>
                    {row.productDetails}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container-fluid">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <button
                  className="btn btn-outline-secondary me-3"
                  onClick={goBack}
                  style={{
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    padding: "8px 16px",
                  }}
                >
                  <Icon icon="solar:arrow-left-bold" className="me-2" />
                  Back
                </button>
                <div>
                  <h4 className="mb-1">{campaignName}</h4>
                  <p className="text-muted mb-0">
                    Campaign ID: {campaignId} • {startDate} to {endDate}
                  </p>
                </div>
              </div>
              <div className="d-flex align-items-center">
                <Icon
                  icon="logos:amazon-icon"
                  className="me-2"
                  style={{ fontSize: "24px" }}
                />
                <span className="fw-semibold">Amazon Ads</span>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        <div className="text-center py-5">
          <Icon
            icon="eos-icons:loading"
            className="text-primary"
            style={{ fontSize: "48px" }}
          />
          <p className="text-muted mt-2">Loading campaign data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <button
                  className="btn btn-outline-secondary me-3"
                  onClick={goBack}
                  style={{
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    padding: "8px 16px",
                  }}
                >
                  <Icon icon="solar:arrow-left-bold" className="me-2" />
                  Back
                </button>
                <div>
                  <h4 className="mb-1">{campaignName}</h4>
                  <p className="text-muted mb-0">
                    Campaign ID: {campaignId} • {startDate} to {endDate}
                  </p>
                </div>
              </div>
              <div className="d-flex align-items-center">
                <Icon
                  icon="logos:amazon-icon"
                  className="me-2"
                  style={{ fontSize: "24px" }}
                />
                <span className="fw-semibold">Amazon Ads</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error State */}
        <div className="alert alert-danger" role="alert">
          <Icon icon="solar:danger-circle-bold" className="me-2" />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <button
                className="btn btn-outline-secondary me-3"
                onClick={goBack}
                style={{
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  padding: "8px 16px",
                }}
              >
                <Icon icon="solar:arrow-left-bold" className="me-2" />
                Back
              </button>
              <div>
                <h4 className="mb-1">{campaignName}</h4>
                <p className="text-muted mb-0">
                  Campaign ID: {campaignId} • {startDate} to {endDate}
                </p>
              </div>
            </div>
            <div className="d-flex align-items-center">
              <Icon
                icon="logos:amazon-icon"
                className="me-2"
                style={{ fontSize: "24px" }}
              />
              <span className="fw-semibold">Amazon Ads</span>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Summary Cards */}
      {campaignData && (
        <div className="row mb-4">
          <div className="col-md-2 col-6">
            <div
              className="card"
              style={{
                height: "90px",
                border: "none",
                boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                borderRadius: "6px",
              }}
            >
              <div className="card-body d-flex flex-column justify-content-between p-1">
                <div className="d-flex justify-content-between align-items-start">
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: "600",
                      color: "#6B7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                    }}
                  >
                    TOTAL SPEND
                  </span>
                </div>
                <div>
                  <span
                    style={{
                      fontSize: "x-large",
                      fontWeight: "600",
                      color: "#111827",
                      margin: "0",
                      lineHeight: "1",
                      display: "block",
                    }}
                  >
                    {formatCurrency(campaignData.total_spend || 0)}
                  </span>
                </div>
                <div
                  style={{
                    height: "2px",
                    backgroundColor: "#F59E0B",
                    borderRadius: "2px",
                    width: "100%",
                  }}
                ></div>
              </div>
            </div>
          </div>
          <div className="col-md-2 col-6">
            <div
              className="card"
              style={{
                height: "90px",
                border: "none",
                boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                borderRadius: "6px",
              }}
            >
              <div className="card-body d-flex flex-column justify-content-between p-1">
                <div className="d-flex justify-content-between align-items-start">
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: "600",
                      color: "#6B7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                    }}
                  >
                    TOTAL REVENUE
                  </span>
                </div>
                <div>
                  <span
                    style={{
                      fontSize: "x-large",
                      fontWeight: "600",
                      color: "#111827",
                      margin: "0",
                      lineHeight: "1",
                      display: "block",
                    }}
                  >
                    {formatCurrency(campaignData.total_revenue || 0)}
                  </span>
                </div>
                <div
                  style={{
                    height: "2px",
                    backgroundColor: "#10B981",
                    borderRadius: "2px",
                    width: "100%",
                  }}
                ></div>
              </div>
            </div>
          </div>
          <div className="col-md-2 col-6">
            <div
              className="card"
              style={{
                height: "90px",
                border: "none",
                boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                borderRadius: "6px",
              }}
            >
              <div className="card-body d-flex flex-column justify-content-between p-1">
                <div className="d-flex justify-content-between align-items-start">
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: "600",
                      color: "#6B7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                    }}
                  >
                    TOTAL ORDERS
                  </span>
                </div>
                <div>
                  <span
                    style={{
                      fontSize: "x-large",
                      fontWeight: "600",
                      color: "#111827",
                      margin: "0",
                      lineHeight: "1",
                      display: "block",
                    }}
                  >
                    {campaignData.total_orders || 0}
                  </span>
                </div>
                <div
                  style={{
                    height: "2px",
                    backgroundColor: "#3B82F6",
                    borderRadius: "2px",
                    width: "100%",
                  }}
                ></div>
              </div>
            </div>
          </div>
          <div className="col-md-2 col-6">
            <div
              className="card"
              style={{
                height: "90px",
                border: "none",
                boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                borderRadius: "6px",
              }}
            >
              <div className="card-body d-flex flex-column justify-content-between p-1">
                <div className="d-flex justify-content-between align-items-start">
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: "600",
                      color: "#6B7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                    }}
                  >
                    ROAS
                  </span>
                </div>
                <div>
                  <span
                    style={{
                      fontSize: "x-large",
                      fontWeight: "600",
                      color: "#111827",
                      margin: "0",
                      lineHeight: "1",
                      display: "block",
                    }}
                  >
                    {(campaignData.average_roas || 0).toFixed(2)}x
                  </span>
                </div>
                <div
                  style={{
                    height: "2px",
                    backgroundColor: "#8B5CF6",
                    borderRadius: "2px",
                    width: "100%",
                  }}
                ></div>
              </div>
            </div>
          </div>
          <div className="col-md-2 col-6">
            <div
              className="card"
              style={{
                height: "90px",
                border: "none",
                boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                borderRadius: "6px",
              }}
            >
              <div className="card-body d-flex flex-column justify-content-between p-1">
                <div className="d-flex justify-content-between align-items-start">
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: "600",
                      color: "#6B7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                    }}
                  >
                    ACOS
                  </span>
                </div>
                <div>
                  <span
                    style={{
                      fontSize: "x-large",
                      fontWeight: "600",
                      color: "#111827",
                      margin: "0",
                      lineHeight: "1",
                      display: "block",
                    }}
                  >
                    {(campaignData.average_acos || 0).toFixed(2)}%
                  </span>
                </div>
                <div
                  style={{
                    height: "2px",
                    backgroundColor: "#EC4899",
                    borderRadius: "2px",
                    width: "100%",
                  }}
                ></div>
              </div>
            </div>
          </div>
          <div className="col-md-2 col-6">
            <div
              className="card"
              style={{
                height: "90px",
                border: "none",
                boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                borderRadius: "6px",
              }}
            >
              <div className="card-body d-flex flex-column justify-content-between p-1">
                <div className="d-flex justify-content-between align-items-start">
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: "600",
                      color: "#6B7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                    }}
                  >
                    ADGROUPS
                  </span>
                </div>
                <div>
                  <span
                    style={{
                      fontSize: "x-large",
                      fontWeight: "600",
                      color: "#111827",
                      margin: "0",
                      lineHeight: "1",
                      display: "block",
                    }}
                  >
                    {data.length}
                  </span>
                </div>
                <div
                  style={{
                    height: "2px",
                    backgroundColor: "#06B6D4",
                    borderRadius: "2px",
                    width: "100%",
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Adgroups Table */}
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">Adgroups</h5>
        </div>
        <div className="card-body p-0">
          {data.length > 0 ? (
            renderAdgroupTable()
          ) : (
            <div className="text-center py-4">
              <Icon
                icon="solar:chart-2-bold"
                className="text-muted"
                style={{ fontSize: "48px" }}
              />
              <p className="text-muted mt-2">
                No adgroup data available for this campaign
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AmazonCampaignDetailsLayer;
