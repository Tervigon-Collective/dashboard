"use client";
import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchMetaEntityReportHierarchy } from "../api/api";

const CampaignDetailsLayer = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [data, setData] = useState([]);
  const [campaignData, setCampaignData] = useState(null);
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
      const response = await fetchMetaEntityReportHierarchy({
        startDate,
        endDate,
        filter: "campaign",
      });

      if (response.success && response.data) {
        // Find the specific campaign data
        const campaignId = searchParams.get("campaignId");
        const campaign = response.data[campaignId];

        if (campaign) {
          setCampaignData(campaign);

          // Process adset data for the table
          const adsetData = [];
          Object.values(campaign.adsets || {}).forEach((adset) => {
            const adsetMetrics = calculateAdsetMetrics(adset);
            adsetData.push({
              adset_id: adset.adset_id,
              adset_name: adset.adset_name,
              ...adsetMetrics,
            });
          });

          setData(adsetData);
        } else {
          setError("Campaign not found");
        }
      } else {
        setError("Failed to fetch campaign data");
      }
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

  const calculateAdsetMetrics = (adset) => {
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalSpend = 0;
    let totalOrders = 0;
    let totalRevenue = 0;
    let totalCogs = 0;
    let totalActions = {
      onsite_web_purchase: 0,
      onsite_web_add_to_cart: 0,
      onsite_web_initiate_checkout: 0,
      offsite_pixel_purchase: 0,
      offsite_pixel_add_to_cart: 0,
      offsite_pixel_initiate_checkout: 0,
    };
    let totalValues = {
      onsite_web_purchase: 0,
      onsite_web_add_to_cart: 0,
      offsite_pixel_purchase: 0,
      offsite_pixel_add_to_cart: 0,
      initiate_checkout: 0,
    };

    Object.values(adset.ads || {}).forEach((ad) => {
      Object.values(ad.hourly_data || {}).forEach((hourData) => {
        const metaData = hourData.meta_data || {};
        const shopifyData = hourData.shopify_data || [];

        // Use pre-calculated values from API
        totalImpressions += metaData.impressions || 0;
        totalClicks += metaData.clicks || 0;
        totalSpend += metaData.spend || 0;
        totalOrders += shopifyData.length;
        totalRevenue += shopifyData.reduce(
          (sum, order) => sum + (order.total_amount || 0),
          0
        );
        totalCogs += shopifyData.reduce(
          (sum, order) => sum + (order.total_cogs || 0),
          0
        );

        // Aggregate actions and values
        if (metaData.actions) {
          Object.keys(totalActions).forEach((key) => {
            totalActions[key] += metaData.actions[key] || 0;
          });
        }
        if (metaData.values) {
          Object.keys(totalValues).forEach((key) => {
            totalValues[key] += metaData.values[key] || 0;
          });
        }
      });
    });

    const netProfit = totalRevenue - totalCogs - totalSpend;
    const grossRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const netRoas = totalSpend > 0 ? netProfit / totalSpend : 0;
    const ctr =
      totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const cpm =
      totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;

    // Extract SKUs from shopify orders
    const skus = [];
    Object.values(adset.ads || {}).forEach((ad) => {
      Object.values(ad.hourly_data || {}).forEach((hourData) => {
        const shopifyData = hourData.shopify_data || [];
        shopifyData.forEach((order) => {
          if (order.line_items) {
            order.line_items.forEach((item) => {
              if (item.sku) skus.push(item.sku);
            });
          }
        });
      });
    });
    const uniqueSkus = [...new Set(skus)]; // Remove duplicates
    const skuString = uniqueSkus.length > 0 ? uniqueSkus.join(", ") : "";

    return {
      totalImpressions,
      totalClicks,
      totalSpend,
      totalOrders,
      totalRevenue,
      totalCogs,
      netProfit,
      grossRoas,
      netRoas,
      ctr,
      cpc,
      cpm,
      totalActions,
      totalValues,
      productDetails: skuString,
    };
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
              <th>Adset Name</th>
              <th>Impressions</th>
              <th>Clicks</th>
              <th>CTR</th>
              <th>Spend</th>
              <th>CPC</th>
              <th>CPM</th>
              <th>Orders</th>
              <th>Revenue</th>
              <th>Gross ROAS</th>
              <th>Net Profit</th>
              <th>Add to Cart</th>
              <th>Checkout Initiated</th>
              <th>Product Details</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr
                key={index}
                style={{ cursor: "pointer" }}
                onClick={() => {
                  // Navigate to adset details page
                  const params = new URLSearchParams({
                    campaign: campaignName,
                    campaignId: searchParams.get("campaignId"),
                    adset: row.adset_name,
                    adsetId: row.adset_id,
                    startDate: startDate,
                    endDate: endDate,
                  });
                  router.push(`/adset-details?${params.toString()}`);
                }}
              >
                <td style={{ fontWeight: '600' }}>{row.adset_name}</td>
                <td style={{ fontWeight: '500' }}>{formatNumber(row.totalImpressions)}</td>
                <td style={{ fontWeight: '500' }}>{formatNumber(row.totalClicks)}</td>
                <td style={{ fontWeight: '500' }}>{formatPercentage(row.ctr)}</td>
                <td style={{ 
                  color: '#ca8a04',
                  fontWeight: '600'
                }}>
                  {formatCurrency(row.totalSpend)}
                </td>
                <td style={{ fontWeight: '500' }}>{formatCurrency(row.cpc)}</td>
                <td style={{ fontWeight: '500' }}>{formatCurrency(row.cpm)}</td>
                <td style={{ fontWeight: '500' }}>{formatNumber(row.totalOrders)}</td>
                <td style={{ 
                  color: '#16a34a',
                  fontWeight: '600'
                }}>
                  {formatCurrency(row.totalRevenue)}
                </td>
                <td style={{ 
                  color: '#7c3aed',
                  fontWeight: '600'
                }}>
                  {row.grossRoas?.toFixed(2)}x
                </td>
                <td style={{ 
                  color: row.netProfit >= 0 ? '#16a34a' : '#dc2626',
                  fontWeight: '600'
                }}>
                  {formatCurrency(row.netProfit)}
                </td>
                <td style={{ fontWeight: '500' }}>
                  {row.totalActions.onsite_web_add_to_cart || 0}
                </td>
                <td style={{ fontWeight: '500' }}>
                  {row.totalActions.onsite_web_initiate_checkout || 0}
                </td>
                <td style={{ fontWeight: '500', color: '#6b7280' }}>
                  {row.productDetails || "-"}
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
      (sum, row) => sum + (Number(row.totalSpend) || 0),
      0
    );
    const totalRevenue = data.reduce(
      (sum, row) => sum + (Number(row.totalRevenue) || 0),
      0
    );
    const totalOrders = data.reduce(
      (sum, row) => sum + (Number(row.totalOrders) || 0),
      0
    );
    const totalNetProfit = data.reduce(
      (sum, row) => sum + (Number(row.netProfit) || 0),
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
