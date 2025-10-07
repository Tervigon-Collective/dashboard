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
          // Extract SKUs from shopify orders
          const skus = shopifyData.flatMap((order) =>
            order.line_items
              ? order.line_items.map((item) => item.sku)
              : order.items
              ? order.items.map((item) => item.sku)
              : []
          );
          const uniqueSkus = [...new Set(skus)]; // Remove duplicates
          const skuString = uniqueSkus.length > 0 ? uniqueSkus.join(", ") : "";

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
            product_details: skuString,
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

        // Extract SKUs from organic orders
        const skus = hourData.orders.flatMap((order) =>
          order.line_items
            ? order.line_items.map((item) => item.sku)
            : order.items
            ? order.items.map((item) => item.sku)
            : []
        );
        const uniqueSkus = [...new Set(skus)]; // Remove duplicates
        const skuString = uniqueSkus.length > 0 ? uniqueSkus.join(", ") : "";

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
          product_details: skuString,
        });
      }
    });
  }

  return processedData;
};

const EntityReportLayer = () => {
  const router = useRouter();
  // Date filters - set default to current date
  const getCurrentDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  // Initialize state with sessionStorage data if available
  const getInitialData = () => {
    if (typeof window !== "undefined") {
      // Check if this is a page refresh by looking for a special flag
      const isPageRefresh = sessionStorage.getItem("pageRefreshed") === "true";

      if (isPageRefresh) {
        // Clear sessionStorage on page refresh
        sessionStorage.removeItem("entityReportData");
        sessionStorage.removeItem("entityReportFilters");
        sessionStorage.removeItem("entityReportActiveTab");
        sessionStorage.removeItem("pageRefreshed");
        console.log("Page refreshed - cleared sessionStorage");
      }

      const savedData = sessionStorage.getItem("entityReportData");
      const savedFilters = sessionStorage.getItem("entityReportFilters");
      const savedTab = sessionStorage.getItem("entityReportActiveTab");

      return {
        data: savedData ? JSON.parse(savedData) : {},
        filters: savedFilters
          ? JSON.parse(savedFilters)
          : {
              startDate: getCurrentDate(),
              endDate: getCurrentDate(),
            },
        activeTab: savedTab || "google",
      };
    }
    return {
      data: {},
      filters: {
        startDate: getCurrentDate(),
        endDate: getCurrentDate(),
      },
      activeTab: "google",
    };
  };

  const initialState = getInitialData();
  const [activeTab, setActiveTab] = useState(initialState.activeTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(initialState.data);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [filters, setFilters] = useState(initialState.filters);

  // Restore data from sessionStorage on component mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedData = sessionStorage.getItem("entityReportData");
      if (savedData && Object.keys(JSON.parse(savedData)).length > 0) {
        // Data is already loaded from getInitialData, no need to fetch again
        console.log("Restored data from sessionStorage");
      }

      // Set up beforeunload listener to detect refresh
      const handleBeforeUnload = () => {
        sessionStorage.setItem("pageRefreshed", "true");
      };

      window.addEventListener("beforeunload", handleBeforeUnload);

      // Cleanup
      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    }
  }, []);

  // Save data to sessionStorage
  const saveToSessionStorage = (data, filters, activeTab) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("entityReportData", JSON.stringify(data));
      sessionStorage.setItem("entityReportFilters", JSON.stringify(filters));
      sessionStorage.setItem("entityReportActiveTab", activeTab);
    }
  };

  // Clear sessionStorage
  const clearSessionStorage = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("entityReportData");
      sessionStorage.removeItem("entityReportFilters");
      sessionStorage.removeItem("entityReportActiveTab");
    }
  };

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

      const updatedData = {
        ...data,
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
      };

      setData(updatedData);

      // Save to sessionStorage after successful fetch
      saveToSessionStorage(updatedData, filters, activeTab);

      // Reset pagination when new data is loaded
      setCurrentPage(1);
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
    setError(null);
    // Reset pagination when switching tabs
    setCurrentPage(1);
    // Save active tab to sessionStorage
    if (typeof window !== "undefined") {
      sessionStorage.setItem("entityReportActiveTab", tabName);
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

  // Pagination helper functions
  const getPaginatedData = (dataArray) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return dataArray.slice(startIndex, endIndex);
  };

  const getTotalPages = (dataArray) => {
    return Math.ceil(dataArray.length / itemsPerPage);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const renderPagination = (dataArray) => {
    const totalPages = getTotalPages(dataArray);
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <li
          key={i}
          className={`page-item ${currentPage === i ? "active" : ""}`}
        >
          <button className="page-link" onClick={() => handlePageChange(i)}>
            {i}
          </button>
        </li>
      );
    }

    return (
      <nav aria-label="Table pagination">
        <ul className="pagination justify-content-center">
          <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
            <button
              className="page-link"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <Icon icon="solar:arrow-left-bold" />
            </button>
          </li>
          {pages}
          <li
            className={`page-item ${
              currentPage === totalPages ? "disabled" : ""
            }`}
          >
            <button
              className="page-link"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <Icon icon="solar:arrow-right-bold" />
            </button>
          </li>
        </ul>
        <div className="text-center text-muted">
          Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
          {Math.min(currentPage * itemsPerPage, dataArray.length)} of{" "}
          {dataArray.length} entries
        </div>
      </nav>
    );
  };

  const renderGoogleAdsTable = () => {
    const googleData = data.google || [];
    const paginatedData = getPaginatedData(googleData);

    return (
      <>
        <div className="table-responsive">
          <table className="table table-hover">
            <thead className="table-light">
              <tr>
                <th>Campaign</th>
                <th>Impressions</th>
                <th>Clicks</th>
                <th>CTR</th>
                <th>Spend</th>
                <th>CPC</th>
                <th>Orders</th>
                <th>Revenue</th>
                <th>Net Profit</th>
                <th>Product Details</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, index) => (
                <tr key={index}>
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
                  <td>
                    <small className="text-muted">
                      {row.product_details || "-"}
                    </small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {renderPagination(googleData)}
      </>
    );
  };

  const renderMetaHierarchicalTable = () => {
    const metaHierarchyData = data.metaHierarchy || {};

    // Convert object to array for pagination
    const campaignsArray = Object.entries(metaHierarchyData).map(
      ([campaignId, campaign]) => ({
        campaignId,
        ...campaign,
      })
    );

    const paginatedCampaigns = getPaginatedData(campaignsArray);

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

      // Extract SKUs from shopify orders across all adsets and ads
      const allSkus = [];
      Object.values(campaign.adsets || {}).forEach((adset) => {
        Object.values(adset.ads || {}).forEach((ad) => {
          Object.values(ad.hourly_data || {}).forEach((hourData) => {
            const shopifyData = hourData.shopify_data || [];
            shopifyData.forEach((order) => {
              if (order.line_items) {
                order.line_items.forEach((item) => {
                  if (item.sku) allSkus.push(item.sku);
                });
              }
            });
          });
        });
      });
      const uniqueSkus = [...new Set(allSkus)]; // Remove duplicates
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

    return (
      <>
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
                <th>Net Profit</th>
                <th>Add to Cart</th>
                <th>Checkout Initiated</th>
                <th>Product Details</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCampaigns.map((campaign) => {
                const campaignMetrics = calculateCampaignMetrics(campaign);

                return (
                  <tr
                    key={campaign.campaignId}
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      // Navigate to campaign details page
                      const params = new URLSearchParams({
                        campaign: campaign.campaign_name,
                        campaignId: campaign.campaignId,
                        startDate: filters.startDate,
                        endDate: filters.endDate,
                      });
                      router.push(`/campaign-details?${params.toString()}`);
                    }}
                  >
                    <td>
                      <Icon icon="solar:arrow-right-bold" />
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
                        {campaignMetrics.totalActions.onsite_web_add_to_cart ||
                          0}
                      </small>
                    </td>
                    <td>
                      <small className="text-muted">
                        {campaignMetrics.totalActions
                          .onsite_web_initiate_checkout || 0}
                      </small>
                    </td>
                    <td>
                      <small className="text-muted">
                        {campaignMetrics.productDetails || "-"}
                      </small>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {renderPagination(campaignsArray)}
      </>
    );
  };

  const renderOrganicTable = () => {
    const organicData = data.organic || [];
    const paginatedData = getPaginatedData(organicData);

    return (
      <>
        <div className="table-responsive">
          <table className="table table-hover">
            <thead className="table-light">
              <tr>
                <th>Channel</th>
                <th>Campaign</th>
                <th>Revenue</th>
                <th>COGS</th>
                <th>Net Profit</th>
                <th>Quantity</th>
                <th>Product Details</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, index) => (
                <tr key={index}>
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
                  <td>
                    <small className="text-muted">
                      {row.product_details || "-"}
                    </small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {renderPagination(organicData)}
      </>
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
          <div className="col-md-2">
            <div className="card bg-primary-subtle">
              <div className="card-body text-center">
                <h6 className="text-primary">Total Spend</h6>
                <h4 className="text-primary">{formatCurrency(totalSpend)}</h4>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card bg-success-subtle">
              <div className="card-body text-center">
                <h6 className="text-success">Total Revenue</h6>
                <h4 className="text-success">{formatCurrency(totalRevenue)}</h4>
              </div>
            </div>
          </div>
          <div className="col-md-2">
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
          <div className="col-md-2">
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
          <div className="col-md-2">
            <div className="card bg-info-subtle">
              <div className="card-body text-center">
                <h6 className="text-info">Gross ROAS</h6>
                <h4 className="text-info">{grossRoas.toFixed(2)}x</h4>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card bg-secondary-subtle">
              <div className="card-body text-center">
                <h6 className="text-secondary">Net ROAS</h6>
                <h4 className="text-secondary">{netRoas.toFixed(2)}x</h4>
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
      </div>
    </div>
  );
};

export default EntityReportLayer;
