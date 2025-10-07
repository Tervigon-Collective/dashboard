"use client";
import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";
import {
  fetchGoogleEntityReport,
  fetchMetaEntityReportHierarchy,
  fetchOrganicEntityReport,
} from "../api/api";

// Data processing functions for new API response structure
const processGoogleData = (data) => {
  const processedData = [];
  const summary = data.summary || {};

  // Process campaign data from the new structure
  Object.keys(data).forEach((key) => {
    // Skip summary object
    if (key === "summary") return;

    const campaign = data[key];
    if (campaign.hourly_data) {
      Object.values(campaign.hourly_data).forEach((hourData) => {
        // Process both cases: with google_data and without (shopify_data only)
        const googleData = hourData.google_data || {};
        const shopifyData = hourData.shopify_data || [];

        // Get metrics from API response
        const impressions = googleData.impressions || 0;
        const clicks = googleData.clicks || 0;
        const spend = googleData.spend || 0;
        const cpc = googleData.cpc || 0;
        const ctr = googleData.ctr || 0;

        const shopifyOrders = shopifyData.length;
        const shopifyRevenue = shopifyData.reduce(
          (sum, order) => sum + (order.total_amount || 0),
          0
        );

        // Calculate ROAS per row
        const grossRoas = spend > 0 ? shopifyRevenue / spend : 0;
        const netProfit =
          shopifyData.reduce((sum, order) => sum + (order.net_profit || 0), 0) -
          spend;
        const netRoas = spend > 0 ? netProfit / spend : 0;

        // Only add rows that have either google data or shopify data
        if (impressions > 0 || shopifyOrders > 0) {
          processedData.push({
            date_start: hourData.date
              ? hourData.date.split("T")[0]
              : "2025-09-24",
            campaign_name: campaign.campaign_name,
            impressions,
            clicks,
            spend,
            cpc,
            ctr,
            shopify_orders: shopifyOrders,
            shopify_revenue: shopifyRevenue,
            gross_roas: grossRoas,
            net_roas: netRoas,
            net_profit: netProfit,
          });
        }
      });
    }
  });

  return processedData;
};

const processMetaData = (data) => {
  // For Meta data, we don't need to process it into a flat array
  // The hierarchical structure should be preserved for the hierarchical table
  // This function is kept for compatibility but returns empty array
  // The actual data will be stored as metaHierarchy in the state
  return [];
};

const processOrganicData = (data) => {
  const processedData = [];

  // Process organic data from hourly_data structure
  if (data.hourly_data) {
    const { matched = [], unmatched = [] } = data.hourly_data;

    [...matched, ...unmatched].forEach((hourData) => {
      if (hourData.orders && hourData.orders.length > 0) {
        // Extract numeric values from formatted currency strings
        const totalRevenue = hourData.orders.reduce((sum, order) => {
          const amount =
            order.financial?.total_amount || order.total_amount || "₹0.00";
          const numericAmount = parseFloat(amount.replace(/[₹,]/g, "")) || 0;
          return sum + numericAmount;
        }, 0);

        const totalCogs = hourData.orders.reduce((sum, order) => {
          const cogs =
            order.financial?.total_cogs || order.total_cogs || "₹0.00";
          const numericCogs = parseFloat(cogs.replace(/[₹,]/g, "")) || 0;
          return sum + numericCogs;
        }, 0);

        const netProfit = totalRevenue - totalCogs;

        processedData.push({
          date_start: new Date(hourData.hour).toISOString().split("T")[0],
          channel: "organic",
          campaign_name: "Organic Traffic",
          shopify_revenue: totalRevenue,
          shopify_cogs: totalCogs,
          gross_roas: 0, // No ad spend for organic
          net_profit: netProfit,
          total_sku_quantity: hourData.orders.reduce(
            (sum, order) =>
              sum +
              order.items.reduce(
                (itemSum, item) => itemSum + (item.quantity || 0),
                0
              ),
            0
          ),
        });
      }
    });
  }

  return processedData;
};

const EntityReportLayer = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("google");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState({});
  const [expandedCampaigns, setExpandedCampaigns] = useState(new Set());
  const [expandedAdsets, setExpandedAdsets] = useState(new Set());

  // Date filters
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
  });

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
          response = await fetchGoogleEntityReport(baseParams);
          break;
        case "meta":
          response = await fetchMetaEntityReportHierarchy({
            ...baseParams,
            filter: "campaign",
          });
          break;
        case "organic":
          response = await fetchOrganicEntityReport(baseParams);
          break;
        default:
          throw new Error("Invalid report type");
      }

      // Process the response data based on the new API structure
      let processedData = [];

      if (response.success && response.data) {
        switch (reportType) {
          case "google":
            processedData = processGoogleData(response.data);
            console.log("Processed Google Data:", processedData);
            break;
          case "meta":
            processedData = processMetaData(response.data);
            console.log("Processed Meta Data:", processedData);
            break;
          case "organic":
            processedData = processOrganicData(response.data);
            break;
        }
      }

      setData((prev) => ({
        ...prev,
        [reportType]: processedData,
        ...(reportType === "google" && response.data.summary
          ? { googleSummary: response.data.summary }
          : {}),
        ...(reportType === "organic" && response.data.summary
          ? { organicSummary: response.data.summary }
          : {}),
        ...(reportType === "meta" && response.data
          ? {
              metaHierarchy: response.data,
              metaSummary: response.data.summary || {},
            }
          : {}),
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

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    // Clear data when switching tabs to avoid confusion
    setData({});
    setError(null);
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

  const renderMetaHierarchicalTable = () => {
    const metaHierarchyData = data.metaHierarchy || {};

    const toggleCampaign = (campaignId) => {
      const newExpanded = new Set(expandedCampaigns);
      if (newExpanded.has(campaignId)) {
        newExpanded.delete(campaignId);
        // Also collapse all adsets for this campaign
        const newExpandedAdsets = new Set(expandedAdsets);
        Object.keys(metaHierarchyData[campaignId]?.adsets || {}).forEach(
          (adsetId) => {
            newExpandedAdsets.delete(adsetId);
          }
        );
        setExpandedAdsets(newExpandedAdsets);
      } else {
        newExpanded.add(campaignId);
      }
      setExpandedCampaigns(newExpanded);
    };

    const toggleAdset = (adsetId) => {
      const newExpanded = new Set(expandedAdsets);
      if (newExpanded.has(adsetId)) {
        newExpanded.delete(adsetId);
      } else {
        newExpanded.add(adsetId);
      }
      setExpandedAdsets(newExpanded);
    };

    const calculateCampaignMetrics = (campaign) => {
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

      Object.values(campaign.adsets || {}).forEach((adset) => {
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
      });

      const netProfit = totalRevenue - totalCogs - totalSpend;
      const grossRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
      const netRoas = totalSpend > 0 ? netProfit / totalSpend : 0;
      const ctr =
        totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
      const cpm =
        totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;

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
      };
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
      };
    };

    const calculateAdMetrics = (ad) => {
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

      const netProfit = totalRevenue - totalCogs - totalSpend;
      const grossRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
      const netRoas = totalSpend > 0 ? netProfit / totalSpend : 0;
      const ctr =
        totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
      const cpm =
        totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;

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
      };
    };

    return (
      <div className="table-responsive">
        <table className="table table-hover">
          <thead className="table-light">
            <tr>
              <th style={{ width: "30px" }}></th>
              <th>Type</th>
              <th>Name</th>
              <th>Impressions</th>
              <th>Clicks</th>
              <th>CTR</th>
              <th>Spend</th>
              <th>CPC</th>
              <th>CPM</th>
              <th>Orders</th>
              <th>Revenue</th>
              <th>Gross ROAS</th>
              <th>Net ROAS</th>
              <th>Net Profit</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(metaHierarchyData).map(([campaignId, campaign]) => {
              const campaignMetrics = calculateCampaignMetrics(campaign);
              const isCampaignExpanded = expandedCampaigns.has(campaignId);

              return (
                <React.Fragment key={campaignId}>
                  {/* Campaign Row */}
                  <tr
                    className="table-primary"
                    style={{ cursor: "pointer" }}
                    onClick={() => toggleCampaign(campaignId)}
                  >
                    <td>
                      <i
                        className={`fas fa-chevron-${
                          isCampaignExpanded ? "down" : "right"
                        }`}
                      ></i>
                    </td>
                    <td>
                      <span className="badge bg-primary">Campaign</span>
                    </td>
                    <td className="fw-bold">{campaign.campaign_name}</td>
                    <td>{formatNumber(campaignMetrics.totalImpressions)}</td>
                    <td>{formatNumber(campaignMetrics.totalClicks)}</td>
                    <td>{formatPercentage(campaignMetrics.ctr)}</td>
                    <td className="fw-semibold">
                      {formatCurrency(campaignMetrics.totalSpend)}
                    </td>
                    <td>{formatCurrency(campaignMetrics.cpc)}</td>
                    <td>{formatCurrency(campaignMetrics.cpm)}</td>
                    <td>{formatNumber(campaignMetrics.totalOrders)}</td>
                    <td className="fw-semibold text-success">
                      {formatCurrency(campaignMetrics.totalRevenue)}
                    </td>
                    <td className="fw-semibold">
                      <span
                        className={`badge ${
                          campaignMetrics.grossRoas >= 2
                            ? "bg-success-subtle text-success"
                            : "bg-warning-subtle text-warning"
                        }`}
                      >
                        {campaignMetrics.grossRoas?.toFixed(2)}x
                      </span>
                    </td>
                    <td className="fw-semibold">
                      <span
                        className={`badge ${
                          campaignMetrics.netRoas >= 2
                            ? "bg-success-subtle text-success"
                            : "bg-warning-subtle text-warning"
                        }`}
                      >
                        {campaignMetrics.netRoas?.toFixed(2)}x
                      </span>
                    </td>
                    <td
                      className={`fw-semibold ${
                        campaignMetrics.netProfit >= 0
                          ? "text-success"
                          : "text-danger"
                      }`}
                    >
                      {formatCurrency(campaignMetrics.netProfit)}
                    </td>
                    <td>
                      <small className="text-muted">
                        Purchases:{" "}
                        {campaignMetrics.totalActions.onsite_web_purchase +
                          campaignMetrics.totalActions.offsite_pixel_purchase}
                      </small>
                    </td>
                  </tr>

                  {/* Adset Rows */}
                  {isCampaignExpanded &&
                    Object.entries(campaign.adsets || {}).map(
                      ([adsetId, adset]) => {
                        const adsetMetrics = calculateAdsetMetrics(adset);
                        const isAdsetExpanded = expandedAdsets.has(adsetId);

                        return (
                          <React.Fragment key={adsetId}>
                            {/* Adset Row */}
                            <tr
                              className="table-info"
                              style={{ cursor: "pointer", paddingLeft: "20px" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleAdset(adsetId);
                              }}
                            >
                              <td style={{ paddingLeft: "30px" }}>
                                <i
                                  className={`fas fa-chevron-${
                                    isAdsetExpanded ? "down" : "right"
                                  }`}
                                ></i>
                              </td>
                              <td>
                                <span className="badge bg-info">Adset</span>
                              </td>
                              <td
                                className="fw-semibold"
                                style={{ paddingLeft: "20px" }}
                              >
                                {adset.adset_name}
                              </td>
                              <td>
                                {formatNumber(adsetMetrics.totalImpressions)}
                              </td>
                              <td>{formatNumber(adsetMetrics.totalClicks)}</td>
                              <td>{formatPercentage(adsetMetrics.ctr)}</td>
                              <td className="fw-semibold">
                                {formatCurrency(adsetMetrics.totalSpend)}
                              </td>
                              <td>{formatCurrency(adsetMetrics.cpc)}</td>
                              <td>{formatCurrency(adsetMetrics.cpm)}</td>
                              <td>{formatNumber(adsetMetrics.totalOrders)}</td>
                              <td className="fw-semibold text-success">
                                {formatCurrency(adsetMetrics.totalRevenue)}
                              </td>
                              <td className="fw-semibold">
                                <span
                                  className={`badge ${
                                    adsetMetrics.grossRoas >= 2
                                      ? "bg-success-subtle text-success"
                                      : "bg-warning-subtle text-warning"
                                  }`}
                                >
                                  {adsetMetrics.grossRoas?.toFixed(2)}x
                                </span>
                              </td>
                              <td className="fw-semibold">
                                <span
                                  className={`badge ${
                                    adsetMetrics.netRoas >= 2
                                      ? "bg-success-subtle text-success"
                                      : "bg-warning-subtle text-warning"
                                  }`}
                                >
                                  {adsetMetrics.netRoas?.toFixed(2)}x
                                </span>
                              </td>
                              <td
                                className={`fw-semibold ${
                                  adsetMetrics.netProfit >= 0
                                    ? "text-success"
                                    : "text-danger"
                                }`}
                              >
                                {formatCurrency(adsetMetrics.netProfit)}
                              </td>
                              <td>
                                <small className="text-muted">
                                  Purchases:{" "}
                                  {adsetMetrics.totalActions
                                    .onsite_web_purchase +
                                    adsetMetrics.totalActions
                                      .offsite_pixel_purchase}
                                </small>
                              </td>
                            </tr>

                            {/* Ad Rows */}
                            {isAdsetExpanded &&
                              Object.entries(adset.ads || {}).map(
                                ([adId, ad]) => {
                                  const adMetrics = calculateAdMetrics(ad);

                                  return (
                                    <tr key={adId} className="table-light">
                                      <td style={{ paddingLeft: "60px" }}></td>
                                      <td>
                                        <span className="badge bg-secondary">
                                          Ad
                                        </span>
                                      </td>
                                      <td style={{ paddingLeft: "40px" }}>
                                        {ad.ad_name}
                                      </td>
                                      <td>
                                        {formatNumber(
                                          adMetrics.totalImpressions
                                        )}
                                      </td>
                                      <td>
                                        {formatNumber(adMetrics.totalClicks)}
                                      </td>
                                      <td>{formatPercentage(adMetrics.ctr)}</td>
                                      <td className="fw-semibold">
                                        {formatCurrency(adMetrics.totalSpend)}
                                      </td>
                                      <td>{formatCurrency(adMetrics.cpc)}</td>
                                      <td>{formatCurrency(adMetrics.cpm)}</td>
                                      <td>
                                        {formatNumber(adMetrics.totalOrders)}
                                      </td>
                                      <td className="fw-semibold text-success">
                                        {formatCurrency(adMetrics.totalRevenue)}
                                      </td>
                                      <td className="fw-semibold">
                                        <span
                                          className={`badge ${
                                            adMetrics.grossRoas >= 2
                                              ? "bg-success-subtle text-success"
                                              : "bg-warning-subtle text-warning"
                                          }`}
                                        >
                                          {adMetrics.grossRoas?.toFixed(2)}x
                                        </span>
                                      </td>
                                      <td className="fw-semibold">
                                        <span
                                          className={`badge ${
                                            adMetrics.netRoas >= 2
                                              ? "bg-success-subtle text-success"
                                              : "bg-warning-subtle text-warning"
                                          }`}
                                        >
                                          {adMetrics.netRoas?.toFixed(2)}x
                                        </span>
                                      </td>
                                      <td
                                        className={`fw-semibold ${
                                          adMetrics.netProfit >= 0
                                            ? "text-success"
                                            : "text-danger"
                                        }`}
                                      >
                                        {formatCurrency(adMetrics.netProfit)}
                                      </td>
                                      <td>
                                        <small className="text-muted">
                                          Purchases:{" "}
                                          {adMetrics.totalActions
                                            .onsite_web_purchase +
                                            adMetrics.totalActions
                                              .offsite_pixel_purchase}
                                        </small>
                                      </td>
                                    </tr>
                                  );
                                }
                              )}
                          </React.Fragment>
                        );
                      }
                    )}
                </React.Fragment>
              );
            })}
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
    // Only show summary for the currently active tab
    const currentData = data[activeTab] || [];

    const totalSpend = currentData.reduce(
      (sum, row) => sum + (Number(row.spend) || 0),
      0
    );
    const totalRevenue = currentData.reduce(
      (sum, row) => sum + (Number(row.shopify_revenue) || 0),
      0
    );
    const totalOrders = currentData.reduce(
      (sum, row) => sum + (Number(row.shopify_orders) || 0),
      0
    );
    const totalNetProfit = currentData.reduce(
      (sum, row) => sum + (Number(row.net_profit) || 0),
      0
    );

    // For Google tab, show ROAS cards instead of regular summary
    if (activeTab === "google" && data.google && data.google.length > 0) {
      // Get the summary data from the API response
      const googleSummary = data.googleSummary || {};
      const grossRoas = googleSummary.gross_roas || 0;
      const netRoas = googleSummary.net_roas || 0;

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
                <h6 className="text-info">Gross ROAS</h6>
                <h4 className="text-info">{grossRoas.toFixed(2)}x</h4>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-warning-subtle">
              <div className="card-body text-center">
                <h6 className="text-warning">Net ROAS</h6>
                <h4 className="text-warning">{netRoas.toFixed(2)}x</h4>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // For Meta tab, show meta-specific summary cards using API summary data
    if (activeTab === "meta" && data.metaHierarchy) {
      // Get the summary data from the API response
      const metaSummary = data.metaSummary || {};
      const totalSpend = metaSummary.total_spend || 0;
      const totalRevenue = metaSummary.total_revenue || 0;
      const totalOrders = metaSummary.total_orders || 0;
      const netProfit = metaSummary.net_profit || 0;
      const grossRoas = metaSummary.gross_roas || 0;
      const netRoas = metaSummary.net_roas || 0;
      const matchedOrders = metaSummary.matched_orders || 0;
      const unmatchedOrders = metaSummary.unmatched_orders || 0;
      const attributionRate = metaSummary.attribution_rate || 0;

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
                <small className="text-muted">
                  Matched: {matchedOrders} | Unmatched: {unmatchedOrders}
                </small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-warning-subtle">
              <div className="card-body text-center">
                <h6 className="text-warning">Net Profit</h6>
                <h4 className={`text-${netProfit >= 0 ? "success" : "danger"}`}>
                  {formatCurrency(netProfit)}
                </h4>
                <small className="text-muted">
                  Attribution: {attributionRate.toFixed(1)}%
                </small>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // For Organic tab, show organic-specific summary cards
    if (activeTab === "organic" && data.organic && data.organic.length > 0) {
      // Get the summary data from the API response
      const organicSummary = data.organicSummary || {};
      const totalRevenue = parseFloat(
        organicSummary.total_revenue?.replace(/[₹,]/g, "") || 0
      );
      const totalCogs = parseFloat(
        organicSummary.total_cogs?.replace(/[₹,]/g, "") || 0
      );
      const netProfit = parseFloat(
        organicSummary.net_profit?.replace(/[₹,]/g, "") || 0
      );
      const profitMargin = parseFloat(
        organicSummary.profit_margin?.replace(/%/g, "") || 0
      );

      return (
        <div className="row mb-20">
          <div className="col-md-3">
            <div className="card bg-success-subtle">
              <div className="card-body text-center">
                <h6 className="text-success">Total Revenue</h6>
                <h4 className="text-success">{formatCurrency(totalRevenue)}</h4>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-warning-subtle">
              <div className="card-body text-center">
                <h6 className="text-warning">Total COGS</h6>
                <h4 className="text-warning">{formatCurrency(totalCogs)}</h4>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-info-subtle">
              <div className="card-body text-center">
                <h6 className="text-info">Net Profit</h6>
                <h4 className="text-info">{formatCurrency(netProfit)}</h4>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-primary-subtle">
              <div className="card-body text-center">
                <h6 className="text-primary">Profit Margin</h6>
                <h4 className="text-primary">{profitMargin.toFixed(1)}%</h4>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Default summary cards for other tabs
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

        {/* Filters and Action Buttons in One Row */}
        <div className="row mb-20 align-items-end">
          <div className="col-md-3">
            <label className="form-label">Start Date</label>
            <input
              type="date"
              className="form-control"
              value={filters.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label">End Date</label>
            <input
              type="date"
              className="form-control"
              value={filters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
            />
          </div>
          <div className="col-md-2">
            <button
              className="btn btn-primary w-100"
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
          </div>
          <div className="col-md-2">
            <button
              className="btn btn-success w-100"
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
        </div>

        {/* Tabs */}
        <div className="mb-20">
          <ul className="nav nav-tabs" role="tablist">
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === "google" ? "active" : ""}`}
                onClick={() => handleTabChange("google")}
              >
                <Icon icon="logos:google-icon" className="me-2" />
                Google Ads
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === "meta" ? "active" : ""}`}
                onClick={() => handleTabChange("meta")}
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
                onClick={() => handleTabChange("organic")}
              >
                <Icon icon="solar:leaf-bold" className="me-2" />
                Organic Attribution
              </button>
            </li>
          </ul>
        </div>

        {/* Error Message */}
        {error && (
          <div className="alert alert-danger" role="alert">
            <Icon icon="solar:danger-circle-bold" className="me-2" />
            {error}
          </div>
        )}

        {/* Summary Cards */}
        {((data[activeTab] && data[activeTab].length > 0) ||
          (activeTab === "meta" && data.metaHierarchy)) &&
          renderSummaryCards()}

        {/* Data Tables */}
        <div className="tab-content">
          {activeTab === "google" && renderGoogleAdsTable()}
          {activeTab === "meta" && renderMetaHierarchicalTable()}
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
