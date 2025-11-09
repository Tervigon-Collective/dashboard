"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";
import ExcelJS from "exceljs";
import { DateRangePicker, CustomProvider } from "rsuite";
import enUS from "rsuite/locales/en_US";
import "rsuite/dist/rsuite.min.css";
import {
  fetchGoogleEntityReport,
  fetchMetaEntityReportHierarchy,
  fetchOrganicEntityReport,
  fetchAmazonEntityReport,
} from "../api/api";

// ExcelJS Download Functions
const downloadGoogleReportExcel = async (
  data,
  startDate,
  endDate,
  summary = null
) => {
  if (!data || data.length === 0) {
    alert("No data available to download");
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Google Entity Report");

  // Calculate aggregated totals for ROAS
  const totalSpend = data.reduce((sum, row) => sum + (row.spend || 0), 0);
  const totalRevenue = data.reduce(
    (sum, row) => sum + (row.shopify_revenue || 0),
    0
  );
  const totalCogs = data.reduce((sum, row) => sum + (row.shopify_cogs || 0), 0);
  const totalNetProfit = data.reduce(
    (sum, row) => sum + (row.net_profit || 0),
    0
  );

  const aggregatedGrossRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const aggregatedNetRoas = totalSpend > 0 ? totalNetProfit / totalSpend : 0;

  // Define headers
  const headers = [
    "Campaign",
    "Impressions",
    "Clicks",
    "CTR",
    "CPC",
    "Spend",
    "Orders",
    "Revenue",
    "COGS",
    "Gross ROAS",
    "Net ROAS",
    "Net Profit",
    "Product Details",
  ];

  // Add headers row
  worksheet.addRow(headers);

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE6E6FA" },
  };

  // Add data rows
  data.forEach((row, index) => {
    const rowData = [
      row.campaign_name || "",
      row.impressions > 0 ? row.impressions : "",
      row.clicks > 0 ? row.clicks : "",
      row.ctr > 0 ? `${row.ctr.toFixed(2)}%` : "0.00%",
      row.cpc > 0 ? `₹${row.cpc.toFixed(2)}` : "₹0.00",
      `₹${(row.spend || 0).toFixed(2)}`,
      row.shopify_orders || 0,
      `₹${(row.shopify_revenue || 0).toFixed(2)}`,
      `₹${(row.shopify_cogs || 0).toFixed(2)}`,
      index === 0 ? `${aggregatedGrossRoas.toFixed(2)}x` : "",
      index === 0 ? `${aggregatedNetRoas.toFixed(2)}x` : "",
      `₹${(row.net_profit || 0).toFixed(2)}`,
      row.product_details || "-",
    ];

    worksheet.addRow(rowData);
  });

  // Add total row
  const totalRow = [
    "TOTAL",
    data.reduce((sum, row) => sum + (row.impressions || 0), 0),
    data.reduce((sum, row) => sum + (row.clicks || 0), 0),
    totalSpend > 0
      ? `${(
          (data.reduce((sum, row) => sum + (row.clicks || 0), 0) /
            data.reduce((sum, row) => sum + (row.impressions || 0), 0)) *
          100
        ).toFixed(2)}%`
      : "0.00%",
    totalSpend > 0
      ? `₹${(
          totalSpend / data.reduce((sum, row) => sum + (row.clicks || 0), 0)
        ).toFixed(2)}`
      : "₹0.00",
    `₹${totalSpend.toFixed(2)}`,
    data.reduce((sum, row) => sum + (row.shopify_orders || 0), 0),
    `₹${totalRevenue.toFixed(2)}`,
    `₹${totalCogs.toFixed(2)}`,
    `${aggregatedGrossRoas.toFixed(2)}x`,
    `${aggregatedNetRoas.toFixed(2)}x`,
    `₹${totalNetProfit.toFixed(2)}`,
    "All Products",
  ];

  const totalRowIndex = worksheet.addRow(totalRow);

  // Style total row
  const totalRowStyle = worksheet.getRow(totalRowIndex.number);
  totalRowStyle.font = { bold: true };
  totalRowStyle.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF0F8FF" },
  };

  // Auto-fit columns
  worksheet.columns.forEach((column) => {
    column.width = 15;
  });

  // Generate and download file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Google_Entity_Report_${startDate}_to_${endDate}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
};

const downloadMetaReportExcel = async (
  metaHierarchy,
  startDate,
  endDate,
  summary = null
) => {
  if (!metaHierarchy || Object.keys(metaHierarchy).length === 0) {
    alert("No data available to download");
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Meta Entity Report");

  // Calculate aggregated totals for ROAS across all campaigns
  let totalSpend = 0;
  let totalRevenue = 0;
  let totalCogs = 0;
  let totalNetProfit = 0;

  Object.values(metaHierarchy).forEach((campaign) => {
    const campaignMetrics = calculateCampaignMetrics(campaign);
    totalSpend += campaignMetrics.totalSpend || 0;
    totalRevenue += campaignMetrics.totalRevenue || 0;
    totalCogs += campaignMetrics.totalCogs || 0;
    totalNetProfit += campaignMetrics.netProfit || 0;
  });

  const aggregatedGrossRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const aggregatedNetRoas = totalSpend > 0 ? totalNetProfit / totalSpend : 0;

  // Define headers
  const headers = [
    "Type",
    "Campaign Name",
    "Adset Name",
    "Ad Name",
    "Impressions",
    "Clicks",
    "CTR",
    "CPC",
    "CPM",
    "Spend",
    "Orders",
    "Revenue",
    "COGS",
    "Gross ROAS",
    "Net ROAS",
    "Net Profit",
    "Add to Cart",
    "Checkout Initiated",
    "Product Details",
  ];

  // Add headers row
  worksheet.addRow(headers);

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE6E6FA" },
  };

  let rowIndex = 0;
  Object.values(metaHierarchy).forEach((campaign) => {
    // Campaign level data
    const campaignMetrics = calculateCampaignMetrics(campaign);
    const campaignRow = [
      "Campaign",
      campaign.campaign_name || "",
      "",
      "",
      campaignMetrics.totalImpressions || 0,
      campaignMetrics.totalClicks || 0,
      `${(campaignMetrics.ctr || 0).toFixed(2)}%`,
      `₹${(campaignMetrics.cpc || 0).toFixed(2)}`,
      `₹${(campaignMetrics.cpm || 0).toFixed(2)}`,
      `₹${(campaignMetrics.totalSpend || 0).toFixed(2)}`,
      campaignMetrics.totalOrders || 0,
      `₹${(campaignMetrics.totalRevenue || 0).toFixed(2)}`,
      `₹${(campaignMetrics.totalCogs || 0).toFixed(2)}`,
      rowIndex === 0 ? `${aggregatedGrossRoas.toFixed(2)}x` : "",
      rowIndex === 0 ? `${aggregatedNetRoas.toFixed(2)}x` : "",
      `₹${(campaignMetrics.netProfit || 0).toFixed(2)}`,
      campaignMetrics.totalActions?.onsite_web_add_to_cart || 0,
      campaignMetrics.totalActions?.onsite_web_initiate_checkout || 0,
      campaignMetrics.productDetails || "-",
    ];
    worksheet.addRow(campaignRow);
    rowIndex++;

    // Adset level data
    Object.values(campaign.adsets || {}).forEach((adset) => {
      const adsetMetrics = calculateAdsetMetrics(adset);
      const adsetRow = [
        "Adset",
        campaign.campaign_name || "",
        adset.adset_name || "",
        "",
        adsetMetrics.totalImpressions || 0,
        adsetMetrics.totalClicks || 0,
        `${(adsetMetrics.ctr || 0).toFixed(2)}%`,
        `₹${(adsetMetrics.cpc || 0).toFixed(2)}`,
        `₹${(adsetMetrics.cpm || 0).toFixed(2)}`,
        `₹${(adsetMetrics.totalSpend || 0).toFixed(2)}`,
        adsetMetrics.totalOrders || 0,
        `₹${(adsetMetrics.totalRevenue || 0).toFixed(2)}`,
        `₹${(adsetMetrics.totalCogs || 0).toFixed(2)}`,
        "",
        "",
        `₹${(adsetMetrics.netProfit || 0).toFixed(2)}`,
        adsetMetrics.totalActions?.onsite_web_add_to_cart || 0,
        adsetMetrics.totalActions?.onsite_web_initiate_checkout || 0,
        adsetMetrics.productDetails || "-",
      ];
      worksheet.addRow(adsetRow);

      // Ad level data
      Object.values(adset.ads || {}).forEach((ad) => {
        const adMetrics = calculateAdMetrics(ad);
        const adRow = [
          "Ad",
          campaign.campaign_name || "",
          adset.adset_name || "",
          ad.ad_name || "",
          adMetrics.totalImpressions || 0,
          adMetrics.totalClicks || 0,
          `${(adMetrics.ctr || 0).toFixed(2)}%`,
          `₹${(adMetrics.cpc || 0).toFixed(2)}`,
          `₹${(adMetrics.cpm || 0).toFixed(2)}`,
          `₹${(adMetrics.totalSpend || 0).toFixed(2)}`,
          adMetrics.totalOrders || 0,
          `₹${(adMetrics.totalRevenue || 0).toFixed(2)}`,
          `₹${(adMetrics.totalCogs || 0).toFixed(2)}`,
          "",
          "",
          `₹${(adMetrics.netProfit || 0).toFixed(2)}`,
          adMetrics.totalActions?.onsite_web_add_to_cart || 0,
          adMetrics.totalActions?.onsite_web_initiate_checkout || 0,
          adMetrics.productDetails || "-",
        ];
        worksheet.addRow(adRow);
      });
    });
  });

  // Add total row
  const totalImpressions = Object.values(metaHierarchy).reduce(
    (sum, campaign) => {
      const campaignMetrics = calculateCampaignMetrics(campaign);
      return sum + (campaignMetrics.totalImpressions || 0);
    },
    0
  );

  const totalClicks = Object.values(metaHierarchy).reduce((sum, campaign) => {
    const campaignMetrics = calculateCampaignMetrics(campaign);
    return sum + (campaignMetrics.totalClicks || 0);
  }, 0);

  const totalOrders = Object.values(metaHierarchy).reduce((sum, campaign) => {
    const campaignMetrics = calculateCampaignMetrics(campaign);
    return sum + (campaignMetrics.totalOrders || 0);
  }, 0);

  const totalRow = [
    "TOTAL",
    "",
    "",
    "",
    totalImpressions,
    totalClicks,
    totalImpressions > 0
      ? `${((totalClicks / totalImpressions) * 100).toFixed(2)}%`
      : "0.00%",
    totalClicks > 0 ? `₹${(totalSpend / totalClicks).toFixed(2)}` : "₹0.00",
    totalImpressions > 0
      ? `₹${((totalSpend / totalImpressions) * 1000).toFixed(2)}`
      : "₹0.00",
    `₹${totalSpend.toFixed(2)}`,
    totalOrders,
    `₹${totalRevenue.toFixed(2)}`,
    `₹${totalCogs.toFixed(2)}`,
    `${aggregatedGrossRoas.toFixed(2)}x`,
    `${aggregatedNetRoas.toFixed(2)}x`,
    `₹${totalNetProfit.toFixed(2)}`,
    "",
    "",
    "All Products",
  ];

  const totalRowIndex = worksheet.addRow(totalRow);

  // Style total row
  const totalRowStyle = worksheet.getRow(totalRowIndex.number);
  totalRowStyle.font = { bold: true };
  totalRowStyle.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF0F8FF" },
  };

  // Auto-fit columns
  worksheet.columns.forEach((column) => {
    column.width = 15;
  });

  // Generate and download file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Meta_Entity_Report_${startDate}_to_${endDate}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
};

const downloadOrganicReportExcel = async (
  data,
  startDate,
  endDate,
  summary = null
) => {
  if (!data || data.length === 0) {
    alert("No data available to download");
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Organic Entity Report");

  // Calculate aggregated totals for ROAS
  const totalRevenue = data.reduce(
    (sum, row) => sum + (row.shopify_revenue || 0),
    0
  );
  const totalCogs = data.reduce((sum, row) => sum + (row.shopify_cogs || 0), 0);
  const totalNetProfit = data.reduce(
    (sum, row) => sum + (row.net_profit || 0),
    0
  );

  // For organic, there's no ad spend, so ROAS is calculated differently
  const aggregatedGrossRoas = totalCogs > 0 ? totalRevenue / totalCogs : 0; // Revenue per COGS
  const aggregatedNetRoas = totalCogs > 0 ? totalNetProfit / totalCogs : 0; // Net profit per COGS

  // Define headers
  const headers = [
    "Channel",
    "Campaign",
    "Revenue",
    "COGS",
    "Gross Profit",
    "Net Profit",
    "Gross ROAS",
    "Net ROAS",
    "Product Details",
  ];

  // Add headers row
  worksheet.addRow(headers);

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE6E6FA" },
  };

  // Add data rows
  data.forEach((row, index) => {
    const rowData = [
      row.channel || "",
      row.campaign_name || "",
      `₹${(row.shopify_revenue || 0).toFixed(2)}`,
      `₹${(row.shopify_cogs || 0).toFixed(2)}`,
      `₹${((row.shopify_revenue || 0) - (row.shopify_cogs || 0)).toFixed(2)}`,
      `₹${(row.net_profit || 0).toFixed(2)}`,
      index === 0 ? `${aggregatedGrossRoas.toFixed(2)}x` : "",
      index === 0 ? `${aggregatedNetRoas.toFixed(2)}x` : "",
      row.product_details || "-",
    ];

    worksheet.addRow(rowData);
  });

  // Add total row
  const totalGrossProfit = totalRevenue - totalCogs;
  const totalRow = [
    "TOTAL",
    "",
    `₹${totalRevenue.toFixed(2)}`,
    `₹${totalCogs.toFixed(2)}`,
    `₹${totalGrossProfit.toFixed(2)}`,
    `₹${totalNetProfit.toFixed(2)}`,
    `${aggregatedGrossRoas.toFixed(2)}x`,
    `${aggregatedNetRoas.toFixed(2)}x`,
    "All Products",
  ];

  const totalRowIndex = worksheet.addRow(totalRow);

  // Style total row
  const totalRowStyle = worksheet.getRow(totalRowIndex.number);
  totalRowStyle.font = { bold: true };
  totalRowStyle.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF0F8FF" },
  };

  // Auto-fit columns
  worksheet.columns.forEach((column) => {
    column.width = 15;
  });

  // Generate and download file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Organic_Entity_Report_${startDate}_to_${endDate}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
};

const downloadAmazonReportExcel = async (
  data,
  startDate,
  endDate,
  summary = null
) => {
  if (!data || data.length === 0) {
    alert("No data available to download");
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Amazon Entity Report");

  // Calculate aggregated totals
  const totalSpend = data.reduce((sum, row) => sum + (row.spend || 0), 0);
  const totalRevenue = data.reduce((sum, row) => sum + (row.revenue || 0), 0);
  const totalOrders = data.reduce((sum, row) => sum + (row.orders || 0), 0);
  const totalImpressions = data.reduce(
    (sum, row) => sum + (row.impressions || 0),
    0
  );
  const totalClicks = data.reduce((sum, row) => sum + (row.clicks || 0), 0);

  const aggregatedRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const aggregatedAcos =
    totalRevenue > 0 ? (totalSpend / totalRevenue) * 100 : 0;

  // Define headers
  const headers = [
    "Campaign ID",
    "Campaign Name",
    "Campaign Status",
    "Campaign Type",
    "Budget Amount",
    "Budget Type",
    "Impressions",
    "Clicks",
    "CTR (%)",
    "CPC",
    "Spend",
    "Orders",
    "Revenue",
    "ROAS",
    "ACOS (%)",
    "Adgroups Count",
    "Product Details",
  ];

  // Add headers row
  worksheet.addRow(headers);

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE6E6FA" },
  };

  // Add data rows
  data.forEach((row, index) => {
    const rowData = [
      row.campaign_id || "",
      row.campaign_name || "",
      row.campaign_status || "",
      row.campaign_type || "",
      row.campaign_budget_amount || 0,
      row.campaign_budget_type || "",
      row.impressions || 0,
      row.clicks || 0,
      row.ctr ? `${row.ctr.toFixed(2)}%` : "0.00%",
      row.cpc ? `₹${row.cpc.toFixed(2)}` : "₹0.00",
      `₹${(row.spend || 0).toFixed(2)}`,
      row.orders || 0,
      `₹${(row.revenue || 0).toFixed(2)}`,
      row.roas ? `${row.roas.toFixed(2)}x` : "0.00x",
      row.acos ? `${row.acos.toFixed(2)}%` : "0.00%",
      row.adgroups_count || 0,
      row.product_details || "-",
    ];

    worksheet.addRow(rowData);
  });

  // Add total row
  const totalRow = [
    "TOTAL",
    "",
    "",
    "",
    "",
    "",
    totalImpressions,
    totalClicks,
    totalImpressions > 0
      ? `${((totalClicks / totalImpressions) * 100).toFixed(2)}%`
      : "0.00%",
    totalClicks > 0 ? `₹${(totalSpend / totalClicks).toFixed(2)}` : "₹0.00",
    `₹${totalSpend.toFixed(2)}`,
    totalOrders,
    `₹${totalRevenue.toFixed(2)}`,
    `${aggregatedRoas.toFixed(2)}x`,
    `${aggregatedAcos.toFixed(2)}%`,
    "",
    "All Products",
  ];

  const totalRowIndex = worksheet.addRow(totalRow);

  // Style total row
  const totalRowStyle = worksheet.getRow(totalRowIndex.number);
  totalRowStyle.font = { bold: true };
  totalRowStyle.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF0F8FF" },
  };

  // Auto-fit columns
  worksheet.columns.forEach((column) => {
    column.width = 15;
  });

  // Generate and download file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Amazon_Entity_Report_${startDate}_to_${endDate}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
};

// Data processing functions for new API response structure
const processGoogleData = (data) => {
  const processedData = [];

  // Process campaign data from the new aggregated structure
  Object.keys(data).forEach((key) => {
    // Skip summary object
    if (key === "summary") return;

    const campaign = data[key];

    // Skip campaigns with no meaningful data
    if (campaign.total_impressions === 0 && campaign.total_orders === 0) {
      return;
    }

    // Extract SKUs from product_details array
    let skuString = "";
    if (campaign.product_details && Array.isArray(campaign.product_details)) {
      const skus = campaign.product_details.map((product) => product.sku);
      skuString = skus.length > 0 ? skus.join(", ") : "";
    }

    // Map the aggregated data to our display format
    processedData.push({
      campaign_id: campaign.campaign_id,
      campaign_name: campaign.campaign_name,
      impressions: campaign.total_impressions || 0,
      clicks: campaign.total_clicks || 0,
      spend: campaign.total_spend || 0,
      cpc: campaign.average_cpc || 0,
      ctr: campaign.ctr || 0,
      shopify_orders: campaign.total_orders || 0,
      shopify_revenue: campaign.total_revenue || 0,
      shopify_cogs: campaign.total_cogs || 0,
      gross_roas: campaign.gross_roas || 0,
      net_roas: campaign.net_roas || 0,
      net_profit: campaign.net_profit || 0,
      gross_profit: campaign.gross_profit || 0,
      matched_orders: campaign.matched_orders || 0,
      unmatched_orders: campaign.unmatched_orders || 0,
      attribution_rate: campaign.attribution_rate || 0,
      average_cpm: campaign.average_cpm || 0,
      conversion_rate: campaign.conversion_rate || 0,
      product_details: skuString,
    });
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

// Download functions for each tab
const downloadGoogleReport = (data, startDate, endDate, summary = null) => {
  if (!data || data.length === 0) {
    alert("No data available to download");
    return;
  }

  const headers = [
    "Campaign",
    "Impressions",
    "Clicks",
    "CTR",
    "CPC",
    "Spend",
    "Orders",
    "Revenue",
    "COGS",
    "Gross ROAS",
    "Net ROAS",
    "Net Profit",
    "Product Details",
  ];

  // Calculate aggregated totals for ROAS
  const totalSpend = data.reduce((sum, row) => sum + (row.spend || 0), 0);
  const totalRevenue = data.reduce(
    (sum, row) => sum + (row.shopify_revenue || 0),
    0
  );
  const totalCogs = data.reduce((sum, row) => sum + (row.shopify_cogs || 0), 0);
  const totalNetProfit = data.reduce(
    (sum, row) => sum + (row.net_profit || 0),
    0
  );

  const aggregatedGrossRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const aggregatedNetRoas = totalSpend > 0 ? totalNetProfit / totalSpend : 0;

  // Process campaign data - fix field mapping
  const csvData = data.map((row, index) => ({
    Campaign: row.campaign_name || "",
    Impressions: row.impressions > 0 ? row.impressions : "",
    Clicks: row.clicks > 0 ? row.clicks : "",
    CTR: row.ctr > 0 ? `${row.ctr.toFixed(2)}%` : "0.00%",
    CPC: row.cpc > 0 ? `₹${row.cpc.toFixed(2)}` : "₹0.00",
    Spend: `₹${(row.spend || 0).toFixed(2)}`,
    Orders: row.shopify_orders || 0,
    Revenue: `₹${(row.shopify_revenue || 0).toFixed(2)}`,
    COGS: `₹${(row.shopify_cogs || 0).toFixed(2)}`,
    "Gross ROAS": index === 0 ? `${aggregatedGrossRoas.toFixed(2)}x` : "",
    "Net ROAS": index === 0 ? `${aggregatedNetRoas.toFixed(2)}x` : "",
    "Net Profit": `₹${(row.net_profit || 0).toFixed(2)}`,
    "Product Details": row.product_details || "-",
  }));

  // Add summary section if available
  let summaryData = [];
  if (summary) {
    summaryData = [
      {}, // Empty row
      {
        Campaign: "=== SUMMARY ===",
        Impressions: "",
        Clicks: "",
        CTR: "",
        CPC: "",
        Spend: "",
        Orders: "",
        Revenue: "",
        COGS: "",
        "Gross ROAS": "",
        "Net ROAS": "",
        "Net Profit": "",
        "Product Details": "",
      },
      {
        Campaign: "Total Spend",
        Impressions: "",
        Clicks: "",
        CTR: "",
        CPC: "",
        Spend: `₹${(summary.total_spend || 0).toFixed(2)}`,
        Orders: "",
        Revenue: "",
        COGS: "",
        "Gross ROAS": "",
        "Net ROAS": "",
        "Net Profit": "",
        "Product Details": "",
      },
      {
        Campaign: "Total Revenue",
        Impressions: "",
        Clicks: "",
        CTR: "",
        CPC: "",
        Spend: "",
        Orders: "",
        Revenue: `₹${(summary.total_revenue || 0).toFixed(2)}`,
        COGS: "",
        "Gross ROAS": "",
        "Net ROAS": "",
        "Net Profit": "",
        "Product Details": "",
      },
      {
        Campaign: "Total Orders",
        Impressions: "",
        Clicks: "",
        CTR: "",
        CPC: "",
        Spend: "",
        Orders: summary.total_orders || 0,
        Revenue: "",
        COGS: "",
        "Gross ROAS": "",
        "Net ROAS": "",
        "Net Profit": "",
        "Product Details": "",
      },
      {
        Campaign: "Net Profit",
        Impressions: "",
        Clicks: "",
        CTR: "",
        CPC: "",
        Spend: "",
        Orders: "",
        Revenue: "",
        COGS: "",
        "Gross ROAS": "",
        "Net ROAS": "",
        "Net Profit": `₹${(summary.net_profit || 0).toFixed(2)}`,
        "Product Details": "",
      },
      {
        Campaign: "ROAS Summary",
        Impressions: "",
        Clicks: "",
        CTR: "",
        CPC: "",
        Spend: "",
        Orders: "",
        Revenue: "",
        COGS: "",
        "Gross ROAS": `${(summary.gross_roas || 0).toFixed(2)}x`,
        "Net ROAS": `${(summary.net_roas || 0).toFixed(2)}x`,
        "Net Profit": "",
        "Product Details": "",
      },
      {
        Campaign: "Average CPC",
        Impressions: "",
        Clicks: "",
        CTR: "",
        CPC: `₹${(summary.average_cpc || 0).toFixed(2)}`,
        Spend: "",
        Orders: "",
        Revenue: "",
        COGS: "",
        "Gross ROAS": "",
        "Net ROAS": "",
        "Net Profit": "",
        "Product Details": "",
      },
      {
        Campaign: "CTR",
        Impressions: "",
        Clicks: "",
        CTR: `${(summary.ctr || 0).toFixed(2)}%`,
        CPC: "",
        Spend: "",
        Orders: "",
        Revenue: "",
        COGS: "",
        "Gross ROAS": "",
        "Net ROAS": "",
        "Net Profit": "",
        "Product Details": "",
      },
    ];
  }

  const csvContent = convertToCSV(csvData, headers);

  const filename = `Google_Entity_Report_${startDate}_to_${endDate}.csv`;
  downloadCSV(csvContent, filename);
};

const downloadMetaReport = (
  metaHierarchy,
  startDate,
  endDate,
  summary = null
) => {
  if (!metaHierarchy || Object.keys(metaHierarchy).length === 0) {
    alert("No data available to download");
    return;
  }

  const headers = [
    "Type",
    "Campaign Name",
    "Adset Name",
    "Ad Name",
    "Impressions",
    "Clicks",
    "CTR",
    "CPC",
    "CPM",
    "Spend",
    "Orders",
    "Revenue",
    "COGS",
    "Gross ROAS",
    "Net ROAS",
    "Net Profit",
    "Add to Cart",
    "Checkout Initiated",
    "Product Details",
  ];

  const csvData = [];

  // Calculate aggregated totals for ROAS across all campaigns
  let totalSpend = 0;
  let totalRevenue = 0;
  let totalCogs = 0;
  let totalNetProfit = 0;

  Object.values(metaHierarchy).forEach((campaign) => {
    const campaignMetrics = calculateCampaignMetrics(campaign);
    totalSpend += campaignMetrics.totalSpend || 0;
    totalRevenue += campaignMetrics.totalRevenue || 0;
    totalCogs += campaignMetrics.totalCogs || 0;
    totalNetProfit += campaignMetrics.netProfit || 0;
  });

  const aggregatedGrossRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const aggregatedNetRoas = totalSpend > 0 ? totalNetProfit / totalSpend : 0;

  let rowIndex = 0;
  Object.values(metaHierarchy).forEach((campaign) => {
    // Campaign level data
    const campaignMetrics = calculateCampaignMetrics(campaign);
    csvData.push({
      Type: "Campaign",
      "Campaign Name": campaign.campaign_name || "",
      "Adset Name": "",
      "Ad Name": "",
      Impressions: campaignMetrics.totalImpressions || 0,
      Clicks: campaignMetrics.totalClicks || 0,
      CTR: `${(campaignMetrics.ctr || 0).toFixed(2)}%`,
      CPC: `₹${(campaignMetrics.cpc || 0).toFixed(2)}`,
      CPM: `₹${(campaignMetrics.cpm || 0).toFixed(2)}`,
      Spend: `₹${(campaignMetrics.totalSpend || 0).toFixed(2)}`,
      Orders: campaignMetrics.totalOrders || 0,
      Revenue: `₹${(campaignMetrics.totalRevenue || 0).toFixed(2)}`,
      COGS: `₹${(campaignMetrics.totalCogs || 0).toFixed(2)}`,
      "Gross ROAS": rowIndex === 0 ? `${aggregatedGrossRoas.toFixed(2)}x` : "",
      "Net ROAS": rowIndex === 0 ? `${aggregatedNetRoas.toFixed(2)}x` : "",
      "Net Profit": `₹${(campaignMetrics.netProfit || 0).toFixed(2)}`,
      "Add to Cart": campaignMetrics.totalActions?.onsite_web_add_to_cart || 0,
      "Checkout Initiated":
        campaignMetrics.totalActions?.onsite_web_initiate_checkout || 0,
      "Product Details": campaignMetrics.productDetails || "-",
    });
    rowIndex++;

    // Adset level data
    Object.values(campaign.adsets || {}).forEach((adset) => {
      const adsetMetrics = calculateAdsetMetrics(adset);
      csvData.push({
        Type: "Adset",
        "Campaign Name": campaign.campaign_name || "",
        "Adset Name": adset.adset_name || "",
        "Ad Name": "",
        Impressions: adsetMetrics.totalImpressions || 0,
        Clicks: adsetMetrics.totalClicks || 0,
        CTR: `${(adsetMetrics.ctr || 0).toFixed(2)}%`,
        CPC: `₹${(adsetMetrics.cpc || 0).toFixed(2)}`,
        CPM: `₹${(adsetMetrics.cpm || 0).toFixed(2)}`,
        Spend: `₹${(adsetMetrics.totalSpend || 0).toFixed(2)}`,
        Orders: adsetMetrics.totalOrders || 0,
        Revenue: `₹${(adsetMetrics.totalRevenue || 0).toFixed(2)}`,
        COGS: `₹${(adsetMetrics.totalCogs || 0).toFixed(2)}`,
        "Gross ROAS": "",
        "Net ROAS": "",
        "Net Profit": `₹${(adsetMetrics.netProfit || 0).toFixed(2)}`,
        "Add to Cart": adsetMetrics.totalActions?.onsite_web_add_to_cart || 0,
        "Checkout Initiated":
          adsetMetrics.totalActions?.onsite_web_initiate_checkout || 0,
        "Product Details": adsetMetrics.productDetails || "-",
      });

      // Ad level data
      Object.values(adset.ads || {}).forEach((ad) => {
        const adMetrics = calculateAdMetrics(ad);
        csvData.push({
          Type: "Ad",
          "Campaign Name": campaign.campaign_name || "",
          "Adset Name": adset.adset_name || "",
          "Ad Name": ad.ad_name || "",
          Impressions: adMetrics.totalImpressions || 0,
          Clicks: adMetrics.totalClicks || 0,
          CTR: `${(adMetrics.ctr || 0).toFixed(2)}%`,
          CPC: `₹${(adMetrics.cpc || 0).toFixed(2)}`,
          CPM: `₹${(adMetrics.cpm || 0).toFixed(2)}`,
          Spend: `₹${(adMetrics.totalSpend || 0).toFixed(2)}`,
          Orders: adMetrics.totalOrders || 0,
          Revenue: `₹${(adMetrics.totalRevenue || 0).toFixed(2)}`,
          COGS: `₹${(adMetrics.totalCogs || 0).toFixed(2)}`,
          "Gross ROAS": "",
          "Net ROAS": "",
          "Net Profit": `₹${(adMetrics.netProfit || 0).toFixed(2)}`,
          "Add to Cart": adMetrics.totalActions?.onsite_web_add_to_cart || 0,
          "Checkout Initiated":
            adMetrics.totalActions?.onsite_web_initiate_checkout || 0,
          "Product Details": adMetrics.productDetails || "-",
        });
      });
    });
  });

  // Add summary section if available
  let summaryData = [];
  if (summary) {
    summaryData = [
      {}, // Empty row
      {
        Type: "=== SUMMARY ===",
        "Campaign Name": "",
        "Adset Name": "",
        "Ad Name": "",
        Impressions: "",
        Clicks: "",
        CTR: "",
        CPC: "",
        CPM: "",
        Spend: "",
        Orders: "",
        Revenue: "",
        COGS: "",
        "Gross ROAS": "",
        "Net ROAS": "",
        "Net Profit": "",
        "Add to Cart": "",
        "Checkout Initiated": "",
        "Product Details": "",
      },
      {
        Type: "Total Spend",
        "Campaign Name": "",
        "Adset Name": "",
        "Ad Name": "",
        Impressions: "",
        Clicks: "",
        CTR: "",
        CPC: "",
        CPM: "",
        Spend: `₹${(summary.total_spend || 0).toFixed(2)}`,
        Orders: "",
        Revenue: "",
        COGS: "",
        "Gross ROAS": "",
        "Net ROAS": "",
        "Net Profit": "",
        "Add to Cart": "",
        "Checkout Initiated": "",
        "Product Details": "",
      },
      {
        Type: "Total Revenue",
        "Campaign Name": "",
        "Adset Name": "",
        "Ad Name": "",
        Impressions: "",
        Clicks: "",
        CTR: "",
        CPC: "",
        CPM: "",
        Spend: "",
        Orders: "",
        Revenue: `₹${(summary.total_revenue || 0).toFixed(2)}`,
        COGS: "",
        "Gross ROAS": "",
        "Net ROAS": "",
        "Net Profit": "",
        "Add to Cart": "",
        "Checkout Initiated": "",
        "Product Details": "",
      },
      {
        Type: "Total Orders",
        "Campaign Name": "",
        "Adset Name": "",
        "Ad Name": "",
        Impressions: "",
        Clicks: "",
        CTR: "",
        CPC: "",
        CPM: "",
        Spend: "",
        Orders: summary.total_orders || 0,
        Revenue: "",
        COGS: "",
        "Gross ROAS": "",
        "Net ROAS": "",
        "Net Profit": "",
        "Add to Cart": "",
        "Checkout Initiated": "",
        "Product Details": "",
      },
      {
        Type: "Matched Orders",
        "Campaign Name": "",
        "Adset Name": "",
        "Ad Name": "",
        Impressions: "",
        Clicks: "",
        CTR: "",
        CPC: "",
        CPM: "",
        Spend: "",
        Orders: summary.matched_orders || 0,
        Revenue: "",
        COGS: "",
        "Gross ROAS": "",
        "Net ROAS": "",
        "Net Profit": "",
        "Add to Cart": "",
        "Checkout Initiated": "",
        "Product Details": "",
      },
      {
        Type: "Unmatched Orders",
        "Campaign Name": "",
        "Adset Name": "",
        "Ad Name": "",
        Impressions: "",
        Clicks: "",
        CTR: "",
        CPC: "",
        CPM: "",
        Spend: "",
        Orders: summary.unmatched_orders || 0,
        Revenue: "",
        COGS: "",
        "Gross ROAS": "",
        "Net ROAS": "",
        "Net Profit": "",
        "Add to Cart": "",
        "Checkout Initiated": "",
        "Product Details": "",
      },
      {
        Type: "Attribution Rate",
        "Campaign Name": "",
        "Adset Name": "",
        "Ad Name": "",
        Impressions: "",
        Clicks: "",
        CTR: "",
        CPC: "",
        CPM: "",
        Spend: "",
        Orders: `${(summary.attribution_rate || 0).toFixed(2)}%`,
        Revenue: "",
        COGS: "",
        "Gross ROAS": "",
        "Net ROAS": "",
        "Net Profit": "",
        "Add to Cart": "",
        "Checkout Initiated": "",
        "Product Details": "",
      },
      {
        Type: "Net Profit",
        "Campaign Name": "",
        "Adset Name": "",
        "Ad Name": "",
        Impressions: "",
        Clicks: "",
        CTR: "",
        CPC: "",
        CPM: "",
        Spend: "",
        Orders: "",
        Revenue: "",
        COGS: "",
        "Gross ROAS": "",
        "Net ROAS": "",
        "Net Profit": `₹${(summary.net_profit || 0).toFixed(2)}`,
        "Add to Cart": "",
        "Checkout Initiated": "",
        "Product Details": "",
      },
      {
        Type: "ROAS Summary",
        "Campaign Name": "",
        "Adset Name": "",
        "Ad Name": "",
        Impressions: "",
        Clicks: "",
        CTR: "",
        CPC: "",
        CPM: "",
        Spend: "",
        Orders: "",
        Revenue: "",
        COGS: "",
        "Gross ROAS": `${(summary.gross_roas || 0).toFixed(2)}x`,
        "Net ROAS": `${(summary.net_roas || 0).toFixed(2)}x`,
        "Net Profit": "",
        "Add to Cart": "",
        "Checkout Initiated": "",
        "Product Details": "",
      },
      {
        Type: "Average CPC",
        "Campaign Name": "",
        "Adset Name": "",
        "Ad Name": "",
        Impressions: "",
        Clicks: "",
        CTR: "",
        CPC: `₹${(summary.average_cpc || 0).toFixed(2)}`,
        CPM: "",
        Spend: "",
        Orders: "",
        Revenue: "",
        COGS: "",
        "Gross ROAS": "",
        "Net ROAS": "",
        "Net Profit": "",
        "Add to Cart": "",
        "Checkout Initiated": "",
        "Product Details": "",
      },
      {
        Type: "CTR",
        "Campaign Name": "",
        "Adset Name": "",
        "Ad Name": "",
        Impressions: "",
        Clicks: "",
        CTR: `${(summary.ctr || 0).toFixed(2)}%`,
        CPC: "",
        CPM: "",
        Spend: "",
        Orders: "",
        Revenue: "",
        COGS: "",
        "Gross ROAS": "",
        "Net ROAS": "",
        "Net Profit": "",
        "Add to Cart": "",
        "Checkout Initiated": "",
        "Product Details": "",
      },
    ];
  }

  const csvContent = convertToCSV(csvData, headers);
  const filename = `Meta_Entity_Report_${startDate}_to_${endDate}.csv`;
  downloadCSV(csvContent, filename);
};

const downloadOrganicReport = (data, startDate, endDate, summary = null) => {
  if (!data || data.length === 0) {
    alert("No data available to download");
    return;
  }

  const headers = [
    "Channel",
    "Campaign",
    "Revenue",
    "COGS",
    "Gross Profit",
    "Net Profit",
    "Gross ROAS",
    "Net ROAS",
    "Product Details",
  ];

  // Calculate aggregated totals for ROAS
  const totalRevenue = data.reduce(
    (sum, row) => sum + (row.shopify_revenue || 0),
    0
  );
  const totalCogs = data.reduce((sum, row) => sum + (row.shopify_cogs || 0), 0);
  const totalNetProfit = data.reduce(
    (sum, row) => sum + (row.net_profit || 0),
    0
  );

  // For organic, there's no ad spend, so ROAS is calculated differently
  const aggregatedGrossRoas = totalCogs > 0 ? totalRevenue / totalCogs : 0; // Revenue per COGS
  const aggregatedNetRoas = totalCogs > 0 ? totalNetProfit / totalCogs : 0; // Net profit per COGS

  const csvData = data.map((row, index) => ({
    Channel: row.channel || "",
    Campaign: row.campaign_name || "",
    Revenue: `₹${(row.shopify_revenue || 0).toFixed(2)}`,
    COGS: `₹${(row.shopify_cogs || 0).toFixed(2)}`,
    "Gross Profit": `₹${(
      (row.shopify_revenue || 0) - (row.shopify_cogs || 0)
    ).toFixed(2)}`,
    "Net Profit": `₹${(row.net_profit || 0).toFixed(2)}`,
    "Gross ROAS": index === 0 ? `${aggregatedGrossRoas.toFixed(2)}x` : "",
    "Net ROAS": index === 0 ? `${aggregatedNetRoas.toFixed(2)}x` : "",
    "Product Details": row.product_details || "-",
  }));

  // Add summary section if available
  let summaryData = [];
  if (summary) {
    summaryData = [
      {}, // Empty row
      {
        Channel: "=== SUMMARY ===",
        Campaign: "",
        Revenue: "",
        COGS: "",
        "Gross Profit": "",
        "Net Profit": "",
        "Gross ROAS": "",
        "Net ROAS": "",
        "Product Details": "",
      },
      {
        Channel: "Total Revenue",
        Campaign: "",
        Revenue: `₹${(summary.total_revenue || 0).toFixed(2)}`,
        COGS: "",
        "Gross Profit": "",
        "Net Profit": "",
        "Gross ROAS": "",
        "Net ROAS": "",
        "Product Details": "",
      },
      {
        Channel: "Total COGS",
        Campaign: "",
        Revenue: "",
        COGS: `₹${(summary.total_cogs || 0).toFixed(2)}`,
        "Gross Profit": "",
        "Net Profit": "",
        "Gross ROAS": "",
        "Net ROAS": "",
        "Product Details": "",
      },
      {
        Channel: "Total Orders",
        Campaign: "",
        Revenue: "",
        COGS: "",
        "Gross Profit": "",
        "Net Profit": "",
        "Gross ROAS": "",
        "Net ROAS": "",
        "Product Details": summary.total_orders || 0,
      },
      {
        Channel: "Net Profit",
        Campaign: "",
        Revenue: "",
        COGS: "",
        "Gross Profit": "",
        "Net Profit": `₹${(summary.net_profit || 0).toFixed(2)}`,
        "Gross ROAS": "",
        "Net ROAS": "",
        "Product Details": "",
      },
      {
        Channel: "Profit Margin",
        Campaign: "",
        Revenue: "",
        COGS: "",
        "Gross Profit": "",
        "Net Profit": summary.profit_margin || "0%",
        "Gross ROAS": "",
        "Net ROAS": "",
        "Product Details": "",
      },
      {
        Channel: "Attribution Rate",
        Campaign: "",
        Revenue: "",
        COGS: "",
        "Gross Profit": "",
        "Net Profit": summary.attribution_rate || "0%",
        "Gross ROAS": "",
        "Net ROAS": "",
        "Product Details": "",
      },
      {
        Channel: "Average Order Value",
        Campaign: "",
        Revenue: "",
        COGS: "",
        "Gross Profit": "",
        "Net Profit": summary.average_order_value || "₹0.00",
        "Gross ROAS": "",
        "Net ROAS": "",
        "Product Details": "",
      },
      {
        Channel: "Total Items",
        Campaign: "",
        Revenue: "",
        COGS: "",
        "Gross Profit": "",
        "Net Profit": "",
        "Gross ROAS": "",
        "Net ROAS": "",
        "Product Details": summary.total_items || 0,
      },
    ];
  }

  const csvContent = convertToCSV(csvData, headers);
  const filename = `Organic_Entity_Report_${startDate}_to_${endDate}.csv`;
  downloadCSV(csvContent, filename);
};

// Calculate metrics for a campaign (used in download function)
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
  const allSkus = [];

  Object.values(campaign.adsets || {}).forEach((adset) => {
    Object.values(adset.ads || {}).forEach((ad) => {
      Object.values(ad.hourly_data || {}).forEach((hourData) => {
        const metaData = hourData.meta_data || {};
        const shopifyData = hourData.shopify_data || [];

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

  const netProfit = totalRevenue - totalCogs - totalSpend;
  const grossRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const netRoas = totalSpend > 0 ? netProfit / totalSpend : 0;
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;

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

// Calculate metrics for an adset (used in download function)
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
  const allSkus = [];

  Object.values(adset.ads || {}).forEach((ad) => {
    Object.values(ad.hourly_data || {}).forEach((hourData) => {
      const metaData = hourData.meta_data || {};
      const shopifyData = hourData.shopify_data || [];

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

      shopifyData.forEach((order) => {
        if (order.line_items) {
          order.line_items.forEach((item) => {
            if (item.sku) allSkus.push(item.sku);
          });
        }
      });
    });
  });

  const netProfit = totalRevenue - totalCogs - totalSpend;
  const grossRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const netRoas = totalSpend > 0 ? netProfit / totalSpend : 0;
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;

  const uniqueSkus = [...new Set(allSkus)];
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

// Calculate metrics for an ad (used in download function)
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
  const allSkus = [];

  Object.values(ad.hourly_data || {}).forEach((hourData) => {
    const metaData = hourData.meta_data || {};
    const shopifyData = hourData.shopify_data || [];

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

    shopifyData.forEach((order) => {
      if (order.line_items) {
        order.line_items.forEach((item) => {
          if (item.sku) allSkus.push(item.sku);
        });
      }
    });
  });

  const netProfit = totalRevenue - totalCogs - totalSpend;
  const grossRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const netRoas = totalSpend > 0 ? netProfit / totalSpend : 0;
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;

  const uniqueSkus = [...new Set(allSkus)];
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

const processOrganicData = (data) => {
  const processedData = [];
  const organicAggregates = {};

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

        const campaignName = "Organic Traffic";

        // Initialize organic aggregate if not exists
        if (!organicAggregates[campaignName]) {
          organicAggregates[campaignName] = {
            channel: "organic",
            campaign_name: campaignName,
            shopify_revenue: 0,
            shopify_cogs: 0,
            total_sku_quantity: 0,
            all_skus: new Set(),
          };
        }

        // Aggregate metrics
        organicAggregates[campaignName].shopify_revenue += totalRevenue;
        organicAggregates[campaignName].shopify_cogs += totalCogs;
        organicAggregates[campaignName].total_sku_quantity +=
          hourData.orders.reduce(
            (sum, order) =>
              sum +
              order.items.reduce(
                (itemSum, item) => itemSum + (item.quantity || 0),
                0
              ),
            0
          );

        // Collect SKUs
        skus.forEach((sku) =>
          organicAggregates[campaignName].all_skus.add(sku)
        );
      }
    });

    // Convert aggregated data to processed data
    Object.values(organicAggregates).forEach((campaign) => {
      const totalRevenue = campaign.shopify_revenue;
      const totalCogs = campaign.shopify_cogs;
      const netProfit = totalRevenue - totalCogs;

      // Convert SKU set to string
      const skuString =
        campaign.all_skus.size > 0
          ? Array.from(campaign.all_skus).join(", ")
          : "";

      processedData.push({
        channel: campaign.channel,
        campaign_name: campaign.campaign_name,
        shopify_revenue: totalRevenue,
        shopify_cogs: totalCogs,
        gross_roas: 0, // No ad spend for organic
        net_roas: 0, // No ad spend for organic
        net_profit: netProfit,
        total_sku_quantity: campaign.total_sku_quantity,
        product_details: skuString,
      });
    });
  }

  return processedData;
};

const processAmazonData = (data) => {
  const processedData = [];

  // Process Amazon campaign data from the API response structure
  Object.keys(data).forEach((campaignId) => {
    // Skip summary object
    if (campaignId === "summary") return;

    const campaign = data[campaignId];

    // Calculate totals from daily records
    const totalSpend = campaign.total_spend || 0;
    const totalImpressions = campaign.total_impressions || 0;
    const totalClicks = campaign.total_clicks || 0;
    const totalOrders = campaign.total_orders || 0;
    const totalRevenue = campaign.total_revenue || 0;
    const averageRoas = campaign.average_roas || 0;
    const averageAcos = campaign.average_acos || 0;

    // Calculate CTR and CPC
    const ctr =
      totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;

    // Process product details from adgroups
    let productDetails = [];
    if (campaign.adgroups) {
      Object.keys(campaign.adgroups).forEach((adgroupId) => {
        const adgroup = campaign.adgroups[adgroupId];
        if (adgroup.products) {
          Object.keys(adgroup.products).forEach((asin) => {
            const product = adgroup.products[asin];
            productDetails.push({
              asin: product.asin,
              sku: product.sku,
              impressions: product.total_impressions || 0,
              clicks: product.total_clicks || 0,
              spend: product.total_spend || 0,
              orders: product.total_orders || 0,
              revenue: product.total_revenue || 0,
              roas: product.roas || 0,
              acos: product.acos || 0,
            });
          });
        }
      });
    }

    // Create product details string
    const productDetailsString = productDetails
      .map((p) => `${p.sku} (ASIN: ${p.asin})`)
      .join(", ");

    processedData.push({
      campaign_id: campaignId,
      campaign_name: campaign.campaign_name || "Unknown Campaign",
      campaign_status: campaign.campaign_status || "Unknown",
      campaign_type: campaign.campaign_type || "Unknown",
      campaign_budget_amount: campaign.campaign_budget_amount || 0,
      campaign_budget_type: campaign.campaign_budget_type || "Unknown",
      impressions: totalImpressions,
      clicks: totalClicks,
      ctr: ctr,
      cpc: cpc,
      spend: totalSpend,
      orders: totalOrders,
      revenue: totalRevenue,
      roas: averageRoas,
      acos: averageAcos,
      product_details: productDetailsString || "No products",
      adgroups_count: campaign.adgroups
        ? Object.keys(campaign.adgroups).length
        : 0,
    });
  });

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
  // Infinite scroll state
  const [displayedItemsCount, setDisplayedItemsCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const itemsPerPage = 20; // Items to load per scroll
  const [filters, setFilters] = useState(initialState.filters);
  const [activeTooltip, setActiveTooltip] = useState(null);
  // Ref for scrollable table container
  const tableContainerRef = useRef(null);

  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  // Filter and search state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterConfig, setFilterConfig] = useState({});

  // DateRangePicker state - synced with filters
  const [dateRange, setDateRange] = useState(() => {
    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      return [start, end];
    }
    return null;
  });

  // Sorting function
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
    // Reset infinite scroll when sorting changes
    setDisplayedItemsCount(20);
  };

  // Search and filter function
  const getFilteredAndSortedData = (dataArray) => {
    if (!dataArray || dataArray.length === 0) return [];

    let filtered = dataArray;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((row) =>
        Object.values(row).some(
          (value) =>
            value &&
            value.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        // Handle numeric values
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
        }

        // Handle string values
        aVal = aVal ? aVal.toString().toLowerCase() : "";
        bVal = bVal ? bVal.toString().toLowerCase() : "";

        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  };

  // Restore data from sessionStorage on component mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedData = sessionStorage.getItem("entityReportData");
      if (savedData && Object.keys(JSON.parse(savedData)).length > 0) {
        // Data is compressed, need to fetch fresh data for current tab
        console.log(
          "Compressed data found, fetching fresh data for",
          activeTab
        );
        fetchData(activeTab);
      } else {
        // No saved data, auto-fetch data for current tab with today's date
        console.log("No saved data, auto-fetching data for", activeTab);
        fetchData(activeTab);
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

  // Save data to sessionStorage with compression
  const saveToSessionStorage = (data, filters, activeTab) => {
    if (typeof window !== "undefined") {
      try {
        // Compress the data by removing unnecessary fields and optimizing structure
        const compressedData = compressDataForStorage(data);
        const dataString = JSON.stringify(compressedData);

        // Check if data is too large (localStorage limit is ~5-10MB)
        if (dataString.length > 4 * 1024 * 1024) {
          // 4MB limit
          console.warn("Data too large for sessionStorage, skipping save");
          return;
        }

        sessionStorage.setItem("entityReportData", dataString);
        sessionStorage.setItem("entityReportFilters", JSON.stringify(filters));
        sessionStorage.setItem("entityReportActiveTab", activeTab);
      } catch (error) {
        console.error("Failed to save to sessionStorage:", error);
        // If storage fails due to quota, clear old data
        if (
          error.name === "QuotaExceededError" ||
          error.message.includes("quota")
        ) {
          handleStorageQuotaExceeded();
        } else {
          // For other errors, just clear data and save minimal info
          sessionStorage.removeItem("entityReportData");
          sessionStorage.setItem(
            "entityReportFilters",
            JSON.stringify(filters)
          );
          sessionStorage.setItem("entityReportActiveTab", activeTab);
        }
      }
    }
  };

  // Compress data for storage by removing unnecessary fields
  const compressDataForStorage = (data) => {
    const compressed = {};

    Object.keys(data).forEach((key) => {
      if (key === "google" && Array.isArray(data[key])) {
        // Compress Google data - keep only essential fields
        compressed[key] = data[key].map((item) => ({
          campaign_name: item.campaign_name,
          impressions: item.impressions,
          clicks: item.clicks,
          ctr: item.ctr,
          spend: item.spend,
          cpc: item.cpc,
          shopify_orders: item.shopify_orders,
          shopify_revenue: item.shopify_revenue,
          net_profit: item.net_profit,
          gross_roas: item.gross_roas,
          product_details: item.product_details,
        }));
      } else if (key === "organic" && Array.isArray(data[key])) {
        // Compress Organic data
        compressed[key] = data[key].map((item) => ({
          campaign_name: item.campaign_name,
          shopify_revenue: item.shopify_revenue,
          shopify_cogs: item.shopify_cogs,
          net_profit: item.net_profit,
          total_sku_quantity: item.total_sku_quantity,
          product_details: item.product_details,
        }));
      } else if (key === "metaHierarchy" && typeof data[key] === "object") {
        // Compress Meta hierarchy data - keep only essential structure
        compressed[key] = {};
        Object.keys(data[key]).forEach((campaignId) => {
          const campaign = data[key][campaignId];
          compressed[key][campaignId] = {
            campaign_name: campaign.campaign_name,
            adsets: {},
          };

          // Only keep adset names and basic structure, not full hourly data
          Object.keys(campaign.adsets || {}).forEach((adsetId) => {
            const adset = campaign.adsets[adsetId];
            compressed[key][campaignId].adsets[adsetId] = {
              adset_name: adset.adset_name,
              ads: {},
            };

            // Only keep ad names
            Object.keys(adset.ads || {}).forEach((adId) => {
              const ad = adset.ads[adId];
              compressed[key][campaignId].adsets[adsetId].ads[adId] = {
                ad_name: ad.ad_name,
              };
            });
          });
        });
      } else {
        // Keep summary data as is
        compressed[key] = data[key];
      }
    });

    return compressed;
  };

  // Clear sessionStorage
  const clearSessionStorage = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("entityReportData");
      sessionStorage.removeItem("entityReportFilters");
      sessionStorage.removeItem("entityReportActiveTab");
    }
  };

  // Clear storage if quota exceeded
  const handleStorageQuotaExceeded = () => {
    console.warn("Storage quota exceeded, clearing old data");
    clearSessionStorage();
    // Show user notification
    setError(
      "Data cache cleared due to storage limits. Please refresh the page."
    );
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
        case "amazon":
          response = await fetchAmazonEntityReport(baseParams);
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
          case "amazon":
            processedData = processAmazonData(response.data);
            console.log("Processed Amazon Data:", processedData);
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
        ...(reportType === "amazon" && response.data.summary
          ? { amazonSummary: response.data.summary }
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

      // Reset infinite scroll when new data is loaded
      setDisplayedItemsCount(20);
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

  // Handle DateRangePicker change - just updates filters, doesn't auto-fetch
  const handleDateRangeChange = (range) => {
    setDateRange(range);
    if (range && range[0] && range[1]) {
      const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      setFilters((prev) => ({
        ...prev,
        startDate: formatDate(range[0]),
        endDate: formatDate(range[1]),
      }));
    }
  };

  // Handle OK button click - receives the selected date range from rsuite
  const handleDatePickerOk = (selectedDates) => {
    console.log("OK clicked, selectedDates:", selectedDates);
    if (selectedDates && selectedDates[0] && selectedDates[1]) {
      const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      const newStartDate = formatDate(selectedDates[0]);
      const newEndDate = formatDate(selectedDates[1]);

      console.log("Formatted dates:", newStartDate, newEndDate);

      // Update filters state
      setFilters((prev) => ({
        ...prev,
        startDate: newStartDate,
        endDate: newEndDate,
      }));

      // Create a temporary fetchData that uses the new dates directly
      const fetchWithNewDates = async () => {
        setLoading(true);
        setError(null);

        try {
          let response;
          const baseParams = {
            startDate: newStartDate,
            endDate: newEndDate,
          };

          switch (activeTab) {
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
            case "amazon":
              response = await fetchAmazonEntityReport(baseParams);
              break;
            default:
              throw new Error("Invalid report type");
          }

          let processedData = [];

          if (response.success && response.data) {
            switch (activeTab) {
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
              case "amazon":
                processedData = processAmazonData(response.data);
                console.log("Processed Amazon Data:", processedData);
                break;
            }
          }

          const updatedData = {
            ...data,
            [activeTab]: processedData,
            ...(activeTab === "google" && response.data.summary
              ? { googleSummary: response.data.summary }
              : {}),
            ...(activeTab === "organic" && response.data.summary
              ? { organicSummary: response.data.summary }
              : {}),
            ...(activeTab === "amazon" && response.data.summary
              ? { amazonSummary: response.data.summary }
              : {}),
            ...(activeTab === "meta" && response.data
              ? {
                  metaHierarchy: response.data,
                  metaSummary: response.data.summary || {},
                }
              : {}),
          };

          setData(updatedData);
          saveToSessionStorage(updatedData, filters, activeTab);
          setDisplayedItemsCount(20);
        } catch (err) {
          setError(err.message || `Failed to fetch ${activeTab} report`);
          console.error(`${activeTab} report error:`, err);
        } finally {
          setLoading(false);
        }
      };

      fetchWithNewDates();
    }
  };

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    setError(null);
    // Reset infinite scroll when switching tabs
    setDisplayedItemsCount(20);
    // Save active tab to sessionStorage
    if (typeof window !== "undefined") {
      sessionStorage.setItem("entityReportActiveTab", tabName);
    }

    // Auto-fetch data if the tab has no data
    const hasTabData = () => {
      if (tabName === "meta") {
        return data.metaHierarchy && Object.keys(data.metaHierarchy).length > 0;
      }
      return data[tabName] && data[tabName].length > 0;
    };

    if (!hasTabData()) {
      console.log(`Auto-fetching data for ${tabName} tab (no data found)`);
      fetchData(tabName);
    }
  };

  // Check if there's data available for download
  const hasData = () => {
    if (activeTab === "meta") {
      return data.metaHierarchy && Object.keys(data.metaHierarchy).length > 0;
    }
    return data[activeTab] && data[activeTab].length > 0;
  };

  // Handle download functionality
  const handleDownload = async () => {
    if (!hasData()) {
      alert("No data available to download");
      return;
    }

    const startDate = filters.startDate;
    const endDate = filters.endDate;

    try {
      switch (activeTab) {
        case "google":
          await downloadGoogleReportExcel(
            data.google,
            startDate,
            endDate,
            data.googleSummary
          );
          break;
        case "meta":
          await downloadMetaReportExcel(
            data.metaHierarchy,
            startDate,
            endDate,
            data.metaSummary
          );
          break;
        case "organic":
          await downloadOrganicReportExcel(
            data.organic,
            startDate,
            endDate,
            data.organicSummary
          );
          break;
        case "amazon":
          await downloadAmazonReportExcel(
            data.amazon,
            startDate,
            endDate,
            data.amazonSummary
          );
          break;
        default:
          alert("Invalid tab selected");
      }
    } catch (error) {
      console.error("Error downloading Excel file:", error);
      alert("Error downloading file. Please try again.");
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

  // Infinite scroll helper functions
  const getDisplayedData = (dataArray) => {
    if (!dataArray || dataArray.length === 0) return [];
    return dataArray.slice(0, displayedItemsCount);
  };

  const hasMoreData = (dataArray) => {
    return dataArray && dataArray.length > displayedItemsCount;
  };

  // Load more data when scrolling
  const loadMoreData = useCallback(async () => {
    if (isLoadingMore) return;
    
    setIsLoadingMore(true);
    // Simulate loading delay for skeleton effect
    await new Promise(resolve => setTimeout(resolve, 500));
    setDisplayedItemsCount(prev => prev + itemsPerPage);
    setIsLoadingMore(false);
  }, [isLoadingMore, itemsPerPage]);

  // Reset displayed items when search term changes
  useEffect(() => {
    setDisplayedItemsCount(20);
  }, [searchTerm]);

  // Scroll detection for infinite scroll - listens to table container scroll
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;

      // Trigger load more when user scrolls to 80% of the container
      if (scrollTop + clientHeight >= scrollHeight * 0.8) {
        const currentData = activeTab === "meta" 
          ? (data.metaHierarchy ? Object.values(data.metaHierarchy).flat() : [])
          : (data[activeTab] || []);
        const filteredData = getFilteredAndSortedData(currentData);
        
        if (hasMoreData(filteredData) && !isLoadingMore && !loading) {
          loadMoreData();
        }
      }
    };

    // Handle wheel events to allow page scrolling when table reaches boundaries
    const handleWheel = (e) => {
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      const isAtTop = scrollTop <= 1; // Allow small tolerance
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1; // -1 for rounding issues
      
      // If scrolling down and at bottom, or scrolling up and at top
      // Scroll the window to allow page scrolling
      if (e.deltaY > 0 && isAtBottom) {
        // Scrolling down at bottom - scroll window down
        window.scrollBy({
          top: e.deltaY,
          behavior: 'auto'
        });
      } else if (e.deltaY < 0 && isAtTop) {
        // Scrolling up at top - scroll window up
        window.scrollBy({
          top: e.deltaY,
          behavior: 'auto'
        });
      }
    };

    container.addEventListener('scroll', handleScroll);
    container.addEventListener('wheel', handleWheel, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('wheel', handleWheel);
    };
  }, [displayedItemsCount, isLoadingMore, loading, activeTab, data, searchTerm, sortConfig, loadMoreData]);

  // Skeleton loading component for table rows
  const TableSkeleton = ({ rows = 5, columns = 10 }) => {
    return (
      <>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <tr key={`skeleton-${rowIndex}`}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <td key={`skeleton-${rowIndex}-${colIndex}`}>
                <div
                  className="skeleton"
              style={{
                    height: "20px",
                    backgroundColor: "#e5e7eb",
                    borderRadius: "4px",
                    animation: "skeletonPulse 1.5s ease-in-out infinite",
                  }}
                />
              </td>
            ))}
          </tr>
        ))}
      </>
    );
  };

  // Render loading more indicator
  const renderLoadingMore = () => {
    if (!isLoadingMore) return null;
    return (
      <tr>
        <td colSpan={10} className="text-center py-3">
          <div className="d-flex align-items-center justify-content-center">
            <div
              className="spinner-border spinner-border-sm me-2"
              role="status"
            >
              <span className="visually-hidden">Loading more...</span>
            </div>
            <span className="text-muted">Loading more data...</span>
          </div>
        </td>
      </tr>
    );
  };

  const renderGoogleAdsTable = () => {
    const googleData = data.google || [];
    const filteredAndSortedData = getFilteredAndSortedData(googleData);
    const displayedData = getDisplayedData(filteredAndSortedData);

    // Helper functions for color styling
    const getProfitColor = (profit) => {
      if (profit > 0) return "#dcfce7";
      if (profit < 0) return "#fee2e2";
      return "transparent";
    };

    const getProfitTextColor = (profit) => {
      if (profit > 0) return "#166534";
      if (profit < 0) return "#991b1b";
      return "#374151";
    };

    return (
      <>
        <div 
          ref={tableContainerRef}
          className="table-responsive table-scroll-container"
          style={{
            maxHeight: "calc(100vh - 400px)",
            overflowY: "auto",
            overflowX: "auto",
            position: "relative",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            scrollBehavior: "smooth",
            overscrollBehavior: "auto"
          }}
        >
          <table className="table table-hover" style={{ width: "100%", marginBottom: 0 }}>
            <thead 
              className="table-light"
              style={{
                position: "sticky",
                top: 0,
                zIndex: 10,
                backgroundColor: "#f8f9fa"
              }}
            >
              <tr>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("campaign_name")}
                >
                  Campaign
                  {sortConfig.key === "campaign_name" && (
                    <Icon
                      icon={
                        sortConfig.direction === "asc"
                          ? "solar:arrow-up-bold"
                          : "solar:arrow-down-bold"
                      }
                      className="ms-1"
                    />
                  )}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("impressions")}
                >
                  Impressions
                  {sortConfig.key === "impressions" && (
                    <Icon
                      icon={
                        sortConfig.direction === "asc"
                          ? "solar:arrow-up-bold"
                          : "solar:arrow-down-bold"
                      }
                      className="ms-1"
                    />
                  )}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("clicks")}
                >
                  Clicks
                  {sortConfig.key === "clicks" && (
                    <Icon
                      icon={
                        sortConfig.direction === "asc"
                          ? "solar:arrow-up-bold"
                          : "solar:arrow-down-bold"
                      }
                      className="ms-1"
                    />
                  )}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("ctr")}
                >
                  CTR
                  {sortConfig.key === "ctr" && (
                    <Icon
                      icon={
                        sortConfig.direction === "asc"
                          ? "solar:arrow-up-bold"
                          : "solar:arrow-down-bold"
                      }
                      className="ms-1"
                    />
                  )}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("spend")}
                >
                  Spend
                  {sortConfig.key === "spend" && (
                    <Icon
                      icon={
                        sortConfig.direction === "asc"
                          ? "solar:arrow-up-bold"
                          : "solar:arrow-down-bold"
                      }
                      className="ms-1"
                    />
                  )}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("cpc")}
                >
                  CPC
                  {sortConfig.key === "cpc" && (
                    <Icon
                      icon={
                        sortConfig.direction === "asc"
                          ? "solar:arrow-up-bold"
                          : "solar:arrow-down-bold"
                      }
                      className="ms-1"
                    />
                  )}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("shopify_orders")}
                >
                  Orders
                  {sortConfig.key === "shopify_orders" && (
                    <Icon
                      icon={
                        sortConfig.direction === "asc"
                          ? "solar:arrow-up-bold"
                          : "solar:arrow-down-bold"
                      }
                      className="ms-1"
                    />
                  )}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("shopify_revenue")}
                >
                  Revenue
                  {sortConfig.key === "shopify_revenue" && (
                    <Icon
                      icon={
                        sortConfig.direction === "asc"
                          ? "solar:arrow-up-bold"
                          : "solar:arrow-down-bold"
                      }
                      className="ms-1"
                    />
                  )}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("gross_roas")}
                >
                  Gross ROAS
                  {sortConfig.key === "gross_roas" && (
                    <Icon
                      icon={
                        sortConfig.direction === "asc"
                          ? "solar:arrow-up-bold"
                          : "solar:arrow-down-bold"
                      }
                      className="ms-1"
                    />
                  )}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("net_profit")}
                >
                  Net Profit
                  {sortConfig.key === "net_profit" && (
                    <Icon
                      icon={
                        sortConfig.direction === "asc"
                          ? "solar:arrow-up-bold"
                          : "solar:arrow-down-bold"
                      }
                      className="ms-1"
                    />
                  )}
                </th>
                <th>Product Details</th>
              </tr>
            </thead>
            <tbody>
              {loading && displayedData.length === 0 ? (
                <TableSkeleton rows={10} columns={11} />
              ) : (
                <>
                  {displayedData.map((row, index) => (
                <tr key={index}>
                  <td>{row.campaign_name}</td>
                  <td>{formatNumber(row.impressions)}</td>
                  <td>{formatNumber(row.clicks)}</td>
                  <td>{formatPercentage(row.ctr)}</td>
                  <td
                    style={{
                      color: "#ca8a04",
                      fontWeight: "600",
                    }}
                  >
                    {formatCurrency(row.spend)}
                  </td>
                  <td>{formatCurrency(row.cpc)}</td>
                  <td>{formatNumber(row.shopify_orders)}</td>
                  <td
                    style={{
                      color: "#16a34a",
                      fontWeight: "600",
                    }}
                  >
                    {formatCurrency(row.shopify_revenue)}
                  </td>
                  <td
                    style={{
                      color: "#7c3aed",
                      fontWeight: "600",
                    }}
                  >
                    {(row.gross_roas || 0).toFixed(2)}x
                  </td>
                  <td
                    style={{
                      color: row.net_profit >= 0 ? "#16a34a" : "#dc2626",
                      fontWeight: "600",
                    }}
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
                  {renderLoadingMore()}
                  {isLoadingMore && <TableSkeleton rows={5} columns={11} />}
                </>
              )}
            </tbody>
          </table>
          {!loading && displayedData.length > 0 && (
            <div 
              className="text-center py-3"
              style={{
                position: "sticky",
                bottom: 0,
                backgroundColor: "#fff",
                borderTop: "1px solid #e5e7eb",
                zIndex: 5,
                margin: 0
              }}
            >
              <small className="text-muted">
                Showing {displayedData.length} of {filteredAndSortedData.length} results
                {hasMoreData(filteredAndSortedData) && " - Scroll down to load more"}
              </small>
        </div>
          )}
        </div>
      </>
    );
  };

  const renderMetaHierarchicalTable = () => {
    const metaHierarchyData = data.metaHierarchy || {};

    // Function to calculate campaign metrics (defined first so we can use it below)
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

    // Convert object to array and pre-calculate metrics for sorting
    const campaignsArray = Object.entries(metaHierarchyData).map(
      ([campaignId, campaign]) => {
        const metrics = calculateCampaignMetrics(campaign);
        return {
          campaignId,
          ...campaign,
          // Add calculated metrics as direct properties for sorting
          impressions: metrics.totalImpressions,
          clicks: metrics.totalClicks,
          spend: metrics.totalSpend,
          orders: metrics.totalOrders,
          revenue: metrics.totalRevenue,
          cogs: metrics.totalCogs,
          netProfit: metrics.netProfit,
          grossRoas: metrics.grossRoas,
          netRoas: metrics.netRoas,
          ctr: metrics.ctr,
          cpc: metrics.cpc,
          cpm: metrics.cpm,
          addToCart: metrics.totalActions?.onsite_web_add_to_cart || 0,
          checkoutInitiated:
            metrics.totalActions?.onsite_web_initiate_checkout || 0,
        };
      }
    );

    // Apply filtering and sorting using the user's preferences
    const filteredAndSortedData = getFilteredAndSortedData(campaignsArray);
    const displayedCampaigns = getDisplayedData(filteredAndSortedData);

    // Calculate metrics for an adset (used in download function)
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
      const skus = [];

      Object.values(adset.ads || {}).forEach((ad) => {
        Object.values(ad.hourly_data || {}).forEach((hourData) => {
          const metaData = hourData.meta_data || {};
          const shopifyData = hourData.shopify_data || [];

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

          shopifyData.forEach((order) => {
            if (order.line_items) {
              order.line_items.forEach((item) => {
                if (item.sku) skus.push(item.sku);
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

      const uniqueSkus = [...new Set(skus)];
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

    // Calculate metrics for an ad (used in download function)
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
      const skus = [];

      Object.values(ad.hourly_data || {}).forEach((hourData) => {
        const metaData = hourData.meta_data || {};
        const shopifyData = hourData.shopify_data || [];

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

        shopifyData.forEach((order) => {
          if (order.line_items) {
            order.line_items.forEach((item) => {
              if (item.sku) skus.push(item.sku);
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

      const uniqueSkus = [...new Set(skus)];
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
        <div 
          ref={tableContainerRef}
          className="table-responsive table-scroll-container"
          style={{
            maxHeight: "calc(100vh - 400px)",
            overflowY: "auto",
            overflowX: "auto",
            position: "relative",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            scrollBehavior: "smooth",
            overscrollBehavior: "auto"
          }}
        >
          <table className="table table-hover" style={{ width: "100%", marginBottom: 0 }}>
            <thead 
              className="table-light"
              style={{
                position: "sticky",
                top: 0,
                zIndex: 10,
                backgroundColor: "#f8f9fa"
              }}
            >
              <tr>
                <th
                  style={{ cursor: "pointer", backgroundColor: "#f8f9fa" }}
                  onClick={() => handleSort("campaign_name")}
                >
                  Name
                  {sortConfig.key === "campaign_name" && (
                    <Icon
                      icon={
                        sortConfig.direction === "asc"
                          ? "solar:arrow-up-bold"
                          : "solar:arrow-down-bold"
                      }
                      className="ms-1"
                    />
                  )}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("impressions")}
                >
                  Impressions
                  {sortConfig.key === "impressions" && (
                    <Icon
                      icon={
                        sortConfig.direction === "asc"
                          ? "solar:arrow-up-bold"
                          : "solar:arrow-down-bold"
                      }
                      className="ms-1"
                    />
                  )}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("clicks")}
                >
                  Clicks
                  {sortConfig.key === "clicks" && (
                    <Icon
                      icon={
                        sortConfig.direction === "asc"
                          ? "solar:arrow-up-bold"
                          : "solar:arrow-down-bold"
                      }
                      className="ms-1"
                    />
                  )}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("ctr")}
                >
                  CTR
                  {sortConfig.key === "ctr" && (
                    <Icon
                      icon={
                        sortConfig.direction === "asc"
                          ? "solar:arrow-up-bold"
                          : "solar:arrow-down-bold"
                      }
                      className="ms-1"
                    />
                  )}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("spend")}
                >
                  Spend
                  {sortConfig.key === "spend" && (
                    <Icon
                      icon={
                        sortConfig.direction === "asc"
                          ? "solar:arrow-up-bold"
                          : "solar:arrow-down-bold"
                      }
                      className="ms-1"
                    />
                  )}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("cpc")}
                >
                  CPC
                  {sortConfig.key === "cpc" && (
                    <Icon
                      icon={
                        sortConfig.direction === "asc"
                          ? "solar:arrow-up-bold"
                          : "solar:arrow-down-bold"
                      }
                      className="ms-1"
                    />
                  )}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("cpm")}
                >
                  CPM
                  {sortConfig.key === "cpm" && (
                    <Icon
                      icon={
                        sortConfig.direction === "asc"
                          ? "solar:arrow-up-bold"
                          : "solar:arrow-down-bold"
                      }
                      className="ms-1"
                    />
                  )}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("orders")}
                >
                  Orders
                  {sortConfig.key === "orders" && (
                    <Icon
                      icon={
                        sortConfig.direction === "asc"
                          ? "solar:arrow-up-bold"
                          : "solar:arrow-down-bold"
                      }
                      className="ms-1"
                    />
                  )}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("revenue")}
                >
                  Revenue
                  {sortConfig.key === "revenue" && (
                    <Icon
                      icon={
                        sortConfig.direction === "asc"
                          ? "solar:arrow-up-bold"
                          : "solar:arrow-down-bold"
                      }
                      className="ms-1"
                    />
                  )}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("grossRoas")}
                >
                  Gross ROAS
                  {sortConfig.key === "grossRoas" && (
                    <Icon
                      icon={
                        sortConfig.direction === "asc"
                          ? "solar:arrow-up-bold"
                          : "solar:arrow-down-bold"
                      }
                      className="ms-1"
                    />
                  )}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("netProfit")}
                >
                  Net Profit
                  {sortConfig.key === "netProfit" && (
                    <Icon
                      icon={
                        sortConfig.direction === "asc"
                          ? "solar:arrow-up-bold"
                          : "solar:arrow-down-bold"
                      }
                      className="ms-1"
                    />
                  )}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("addToCart")}
                >
                  Add to Cart
                  {sortConfig.key === "addToCart" && (
                    <Icon
                      icon={
                        sortConfig.direction === "asc"
                          ? "solar:arrow-up-bold"
                          : "solar:arrow-down-bold"
                      }
                      className="ms-1"
                    />
                  )}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("checkoutInitiated")}
                >
                  Checkout Initiated
                  {sortConfig.key === "checkoutInitiated" && (
                    <Icon
                      icon={
                        sortConfig.direction === "asc"
                          ? "solar:arrow-up-bold"
                          : "solar:arrow-down-bold"
                      }
                      className="ms-1"
                    />
                  )}
                </th>
                <th>Product Details</th>
              </tr>
            </thead>
            <tbody>
              {loading && displayedCampaigns.length === 0 ? (
                <TableSkeleton rows={10} columns={13} />
              ) : (
                <>
                  {displayedCampaigns.map((campaign) => {
                const campaignMetrics = calculateCampaignMetrics(campaign);

                // Helper functions for color styling
                const getProfitColor = (profit) => {
                  if (profit > 0) return "#dcfce7";
                  if (profit < 0) return "#fee2e2";
                  return "transparent";
                };

                const getProfitTextColor = (profit) => {
                  if (profit > 0) return "#166534";
                  if (profit < 0) return "#991b1b";
                  return "#374151";
                };

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
                    <td>{campaign.campaign_name}</td>
                    <td>{formatNumber(campaignMetrics.totalImpressions)}</td>
                    <td>{formatNumber(campaignMetrics.totalClicks)}</td>
                    <td>{formatPercentage(campaignMetrics.ctr)}</td>
                    <td
                      style={{
                        color: "#ca8a04",
                        fontWeight: "600",
                      }}
                    >
                      {formatCurrency(campaignMetrics.totalSpend)}
                    </td>
                    <td>{formatCurrency(campaignMetrics.cpc)}</td>
                    <td>{formatCurrency(campaignMetrics.cpm)}</td>
                    <td>{formatNumber(campaignMetrics.totalOrders)}</td>
                    <td
                      style={{
                        color: "#16a34a",
                        fontWeight: "600",
                      }}
                    >
                      {formatCurrency(campaignMetrics.totalRevenue)}
                    </td>
                    <td
                      style={{
                        color: "#7c3aed",
                        fontWeight: "600",
                      }}
                    >
                      {campaignMetrics.grossRoas?.toFixed(2)}x
                    </td>
                    <td
                      style={{
                        color:
                          campaignMetrics.netProfit >= 0
                            ? "#16a34a"
                            : "#dc2626",
                        fontWeight: "600",
                      }}
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
                  {renderLoadingMore()}
                  {isLoadingMore && <TableSkeleton rows={5} columns={13} />}
                </>
              )}
            </tbody>
          </table>
          {!loading && displayedCampaigns.length > 0 && (
            <div 
              className="text-center py-3"
              style={{
                position: "sticky",
                bottom: 0,
                backgroundColor: "#fff",
                borderTop: "1px solid #e5e7eb",
                zIndex: 5,
                margin: 0
              }}
            >
              <small className="text-muted">
                Showing {displayedCampaigns.length} of {filteredAndSortedData.length} results
                {hasMoreData(filteredAndSortedData) && " - Scroll down to load more"}
              </small>
        </div>
          )}
        </div>
      </>
    );
  };

  const renderOrganicTable = () => {
    const organicData = data.organic || [];
    const filteredAndSortedData = getFilteredAndSortedData(organicData);
    const displayedData = getDisplayedData(filteredAndSortedData);

    // Helper functions for color styling
    const getProfitColor = (profit) => {
      if (profit > 0) return "#dcfce7";
      if (profit < 0) return "#fee2e2";
      return "transparent";
    };

    const getProfitTextColor = (profit) => {
      if (profit > 0) return "#166534";
      if (profit < 0) return "#991b1b";
      return "#374151";
    };

    return (
      <>
        <div 
          ref={tableContainerRef}
          className="table-responsive table-scroll-container"
          style={{
            maxHeight: "calc(100vh - 400px)",
            overflowY: "auto",
            overflowX: "auto",
            position: "relative",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            scrollBehavior: "smooth",
            overscrollBehavior: "auto"
          }}
        >
          <table className="table table-hover" style={{ width: "100%", marginBottom: 0 }}>
            <thead 
              className="table-light"
              style={{
                position: "sticky",
                top: 0,
                zIndex: 10,
                backgroundColor: "#f8f9fa"
              }}
            >
              <tr>
                <th
                  style={{ cursor: "pointer", backgroundColor: "#f8f9fa" }}
                  onClick={() => handleSort("campaign_name")}
                >
                  Campaign
                  {sortConfig.key === "campaign_name" && (
                    <Icon
                      icon={
                        sortConfig.direction === "asc"
                          ? "solar:arrow-up-bold"
                          : "solar:arrow-down-bold"
                      }
                      className="ms-1"
                    />
                  )}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("shopify_revenue")}
                >
                  Revenue
                  {sortConfig.key === "shopify_revenue" && (
                    <Icon
                      icon={
                        sortConfig.direction === "asc"
                          ? "solar:arrow-up-bold"
                          : "solar:arrow-down-bold"
                      }
                      className="ms-1"
                    />
                  )}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("shopify_cogs")}
                >
                  COGS
                  {sortConfig.key === "shopify_cogs" && (
                    <Icon
                      icon={
                        sortConfig.direction === "asc"
                          ? "solar:arrow-up-bold"
                          : "solar:arrow-down-bold"
                      }
                      className="ms-1"
                    />
                  )}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("net_profit")}
                >
                  Net Profit
                  {sortConfig.key === "net_profit" && (
                    <Icon
                      icon={
                        sortConfig.direction === "asc"
                          ? "solar:arrow-up-bold"
                          : "solar:arrow-down-bold"
                      }
                      className="ms-1"
                    />
                  )}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("total_sku_quantity")}
                >
                  Quantity
                  {sortConfig.key === "total_sku_quantity" && (
                    <Icon
                      icon={
                        sortConfig.direction === "asc"
                          ? "solar:arrow-up-bold"
                          : "solar:arrow-down-bold"
                      }
                      className="ms-1"
                    />
                  )}
                </th>
                <th>Product Details</th>
              </tr>
            </thead>
            <tbody>
              {loading && displayedData.length === 0 ? (
                <TableSkeleton rows={10} columns={6} />
              ) : (
                <>
                  {displayedData.map((row, index) => (
                <tr key={index}>
                  <td>{row.campaign_name}</td>
                  <td
                    style={{
                      color: "#16a34a",
                      fontWeight: "600",
                    }}
                  >
                    {formatCurrency(row.shopify_revenue)}
                  </td>
                  <td>{formatCurrency(row.shopify_cogs)}</td>
                  <td
                    style={{
                      color: row.net_profit >= 0 ? "#16a34a" : "#dc2626",
                      fontWeight: "600",
                    }}
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
                  {renderLoadingMore()}
                  {isLoadingMore && <TableSkeleton rows={5} columns={6} />}
                </>
              )}
            </tbody>
          </table>
          {!loading && displayedData.length > 0 && (
            <div 
              className="text-center py-3"
              style={{
                position: "sticky",
                bottom: 0,
                backgroundColor: "#fff",
                borderTop: "1px solid #e5e7eb",
                zIndex: 5,
                margin: 0
              }}
            >
              <small className="text-muted">
                Showing {displayedData.length} of {filteredAndSortedData.length} results
                {hasMoreData(filteredAndSortedData) && " - Scroll down to load more"}
              </small>
        </div>
          )}
        </div>
      </>
    );
  };

  const renderAmazonAdsTable = () => {
    const amazonData = data.amazon || [];
    const filteredAndSortedData = getFilteredAndSortedData(amazonData);
    const displayedData = getDisplayedData(filteredAndSortedData);

    // Helper functions for color styling
    const getRoasColor = (roas) => {
      if (roas >= 3) return "#dcfce7"; // Green for high ROAS
      if (roas >= 1.5) return "#fef3c7"; // Yellow for medium ROAS
      if (roas > 0) return "#fee2e2"; // Red for low ROAS
      return "transparent";
    };

    const getRoasTextColor = (roas) => {
      if (roas >= 3) return "#166534";
      if (roas >= 1.5) return "#92400e";
      if (roas > 0) return "#991b1b";
      return "#374151";
    };

    const getAcosColor = (acos) => {
      if (acos <= 30) return "#dcfce7"; // Green for low ACOS
      if (acos <= 50) return "#fef3c7"; // Yellow for medium ACOS
      if (acos > 0) return "#fee2e2"; // Red for high ACOS
      return "transparent";
    };

    const getAcosTextColor = (acos) => {
      if (acos <= 30) return "#166534";
      if (acos <= 50) return "#92400e";
      if (acos > 0) return "#991b1b";
      return "#374151";
    };

    return (
      <>
        {displayedData.length > 0 ? (
          <>
            <div 
              ref={tableContainerRef}
              className="table-responsive table-scroll-container"
              style={{
                maxHeight: "calc(100vh - 400px)",
                overflowY: "auto",
                overflowX: "auto",
                position: "relative",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                scrollBehavior: "smooth"
              }}
            >
              <table className="table table-hover" style={{ width: "100%", marginBottom: 0 }}>
                <thead 
                  className="table-light"
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 10,
                    backgroundColor: "#f8f9fa"
                  }}
                >
                  <tr>
                    <th
                      style={{ cursor: "pointer", backgroundColor: "#f8f9fa" }}
                      onClick={() => handleSort("campaign_name")}
                    >
                      Campaign Name
                      {sortConfig.key === "campaign_name" && (
                        <Icon
                          icon={
                            sortConfig.direction === "asc"
                              ? "solar:arrow-up-bold"
                              : "solar:arrow-down-bold"
                          }
                          className="ms-1"
                        />
                      )}
                    </th>
                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("campaign_status")}
                    >
                      Status
                      {sortConfig.key === "campaign_status" && (
                        <Icon
                          icon={
                            sortConfig.direction === "asc"
                              ? "solar:arrow-up-bold"
                              : "solar:arrow-down-bold"
                          }
                          className="ms-1"
                        />
                      )}
                    </th>
                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("impressions")}
                    >
                      Impressions
                      {sortConfig.key === "impressions" && (
                        <Icon
                          icon={
                            sortConfig.direction === "asc"
                              ? "solar:arrow-up-bold"
                              : "solar:arrow-down-bold"
                          }
                          className="ms-1"
                        />
                      )}
                    </th>
                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("clicks")}
                    >
                      Clicks
                      {sortConfig.key === "clicks" && (
                        <Icon
                          icon={
                            sortConfig.direction === "asc"
                              ? "solar:arrow-up-bold"
                              : "solar:arrow-down-bold"
                          }
                          className="ms-1"
                        />
                      )}
                    </th>
                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("ctr")}
                    >
                      CTR
                      {sortConfig.key === "ctr" && (
                        <Icon
                          icon={
                            sortConfig.direction === "asc"
                              ? "solar:arrow-up-bold"
                              : "solar:arrow-down-bold"
                          }
                          className="ms-1"
                        />
                      )}
                    </th>
                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("cpc")}
                    >
                      CPC
                      {sortConfig.key === "cpc" && (
                        <Icon
                          icon={
                            sortConfig.direction === "asc"
                              ? "solar:arrow-up-bold"
                              : "solar:arrow-down-bold"
                          }
                          className="ms-1"
                        />
                      )}
                    </th>
                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("spend")}
                    >
                      Spend
                      {sortConfig.key === "spend" && (
                        <Icon
                          icon={
                            sortConfig.direction === "asc"
                              ? "solar:arrow-up-bold"
                              : "solar:arrow-down-bold"
                          }
                          className="ms-1"
                        />
                      )}
                    </th>
                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("orders")}
                    >
                      Orders
                      {sortConfig.key === "orders" && (
                        <Icon
                          icon={
                            sortConfig.direction === "asc"
                              ? "solar:arrow-up-bold"
                              : "solar:arrow-down-bold"
                          }
                          className="ms-1"
                        />
                      )}
                    </th>
                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("revenue")}
                    >
                      Revenue
                      {sortConfig.key === "revenue" && (
                        <Icon
                          icon={
                            sortConfig.direction === "asc"
                              ? "solar:arrow-up-bold"
                              : "solar:arrow-down-bold"
                          }
                          className="ms-1"
                        />
                      )}
                    </th>
                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("roas")}
                    >
                      ROAS
                      {sortConfig.key === "roas" && (
                        <Icon
                          icon={
                            sortConfig.direction === "asc"
                              ? "solar:arrow-up-bold"
                              : "solar:arrow-down-bold"
                          }
                          className="ms-1"
                        />
                      )}
                    </th>
                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("acos")}
                    >
                      ACOS
                      {sortConfig.key === "acos" && (
                        <Icon
                          icon={
                            sortConfig.direction === "asc"
                              ? "solar:arrow-up-bold"
                              : "solar:arrow-down-bold"
                          }
                          className="ms-1"
                        />
                      )}
                    </th>
                    <th>Product Details</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && displayedData.length === 0 ? (
                    <TableSkeleton rows={10} columns={11} />
                  ) : (
                    <>
                      {displayedData.map((row, index) => (
                    <tr
                      key={`${row.campaign_id}-${index}`}
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        // Navigate to Amazon campaign details page
                        const params = new URLSearchParams({
                          campaign: row.campaign_name,
                          campaignId: row.campaign_id,
                          startDate: filters.startDate,
                          endDate: filters.endDate,
                        });
                        router.push(
                          `/amazon-campaign-details?${params.toString()}`
                        );
                      }}
                    >
                      <td>
                        <div className="d-flex flex-column">
                          <span className="fw-semibold">
                            {row.campaign_name}
                          </span>
                          <small className="text-muted">
                            ID: {row.campaign_id}
                          </small>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            row.campaign_status === "ENABLED"
                              ? "bg-success"
                              : row.campaign_status === "PAUSED"
                              ? "bg-warning"
                              : "bg-secondary"
                          }`}
                        >
                          {row.campaign_status}
                        </span>
                      </td>
                      <td>{row.impressions?.toLocaleString() || 0}</td>
                      <td>{row.clicks?.toLocaleString() || 0}</td>
                      <td>{row.ctr ? `${row.ctr.toFixed(2)}%` : "0.00%"}</td>
                      <td>{row.cpc ? `₹${row.cpc.toFixed(2)}` : "₹0.00"}</td>
                      <td>{formatCurrency(row.spend)}</td>
                      <td>{row.orders || 0}</td>
                      <td>{formatCurrency(row.revenue)}</td>
                      <td>
                        <span
                          style={{
                            backgroundColor: getRoasColor(row.roas),
                            color: getRoasTextColor(row.roas),
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontWeight: "500",
                          }}
                        >
                          {row.roas ? `${row.roas.toFixed(2)}x` : "0.00x"}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            backgroundColor: getAcosColor(row.acos),
                            color: getAcosTextColor(row.acos),
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontWeight: "500",
                          }}
                        >
                          {row.acos ? `${row.acos.toFixed(2)}%` : "0.00%"}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex flex-column">
                          <span
                            className="text-truncate"
                            style={{ maxWidth: "200px" }}
                          >
                            {row.product_details || "No products"}
                          </span>
                          <small className="text-muted">
                            {row.adgroups_count} adgroup
                            {row.adgroups_count !== 1 ? "s" : ""}
                          </small>
                        </div>
                      </td>
                    </tr>
                  ))}
                      {renderLoadingMore()}
                      {isLoadingMore && <TableSkeleton rows={5} columns={11} />}
                    </>
                  )}
                </tbody>
              </table>
              {!loading && displayedData.length > 0 && (
                <div 
                  className="text-center py-3"
                  style={{
                    position: "sticky",
                    bottom: 0,
                    backgroundColor: "#fff",
                    borderTop: "1px solid #e5e7eb",
                    zIndex: 5,
                    margin: 0
                  }}
                >
                  <small className="text-muted">
                    Showing {displayedData.length} of {filteredAndSortedData.length} results
                    {hasMoreData(filteredAndSortedData) && " - Scroll down to load more"}
                  </small>
            </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-5">
            <Icon
              icon="solar:chart-2-bold"
              className="text-muted"
              style={{ fontSize: "48px" }}
            />
            <p className="text-muted mt-2">
              No Amazon Ads data available for the selected date range
            </p>
          </div>
        )}
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

    // For Google tab, use API summary data directly
    if (activeTab === "google" && data.google && data.google.length > 0) {
      // Get the summary data from the API response
      const googleSummary = data.googleSummary || {};
      const totalSpend = googleSummary.total_spend || 0;
      const totalRevenue = googleSummary.total_revenue || 0;
      const totalOrders = googleSummary.total_orders || 0;
      const grossRoas = googleSummary.gross_roas || 0;
      const netRoas = googleSummary.net_roas || 0;
      const netProfit = googleSummary.net_profit || 0;

      return (
        <div className="row mb-20 g-2">
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
                  <div
                    style={{
                      cursor: "pointer",
                      display: "inline-block",
                      position: "relative",
                    }}
                    onMouseEnter={() => setActiveTooltip("google-spend")}
                    onMouseLeave={() => setActiveTooltip(null)}
                  >
                    <Icon
                      icon="solar:info-circle-bold"
                      style={{
                        fontSize: "10px",
                        color: "#9CA3AF",
                      }}
                    />
                    {activeTooltip === "google-spend" && (
                      <div
                        style={{
                          position: "absolute",
                          background: "#f3f4f6",
                          color: "#374151",
                          padding: "10px 14px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          lineHeight: "1.3",
                          zIndex: 9999,
                          top: "-40px",
                          right: "0",
                          transform: "translateX(0)",
                          pointerEvents: "none",
                          maxWidth: "700px",
                          whiteSpace: "nowrap",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                          border: "1px solid #d1d5db",
                        }}
                      >
                        <div style={{ fontWeight: "600", marginBottom: "2px" }}>
                          Total Spend
                        </div>
                        <div style={{ fontSize: "11px", opacity: "0.9" }}>
                          Total Google Ads expenditure across Search, Display,
                          Shopping, and Video campaigns
                        </div>
                      </div>
                    )}
                  </div>
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
                    {formatCurrency(totalSpend).replace("₹", "₹")}
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
                    TOTAL REVENUE
                  </span>
                  <div
                    style={{
                      cursor: "pointer",
                      display: "inline-block",
                      position: "relative",
                    }}
                    onMouseEnter={() => setActiveTooltip("google-revenue")}
                    onMouseLeave={() => setActiveTooltip(null)}
                  >
                    <Icon
                      icon="solar:info-circle-bold"
                      style={{
                        fontSize: "10px",
                        color: "#9CA3AF",
                      }}
                    />
                    {activeTooltip === "google-revenue" && (
                      <div
                        style={{
                          position: "absolute",
                          background: "#f3f4f6",
                          color: "#374151",
                          padding: "10px 14px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          lineHeight: "1.3",
                          zIndex: 9999,
                          top: "-40px",
                          right: "0",
                          transform: "translateX(0)",
                          pointerEvents: "none",
                          maxWidth: "700px",
                          whiteSpace: "nowrap",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                          border: "1px solid #d1d5db",
                        }}
                      >
                        <div style={{ fontWeight: "600", marginBottom: "2px" }}>
                          Total Revenue
                        </div>
                        <div style={{ fontSize: "11px", opacity: "0.9" }}>
                          Revenue from Shopify orders attributed to Google Ads
                          campaigns
                        </div>
                      </div>
                    )}
                  </div>
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
                    {formatCurrency(totalRevenue).replace("₹", "₹")}
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
                  <div
                    style={{
                      cursor: "pointer",
                      display: "inline-block",
                      position: "relative",
                    }}
                    onMouseEnter={() => setActiveTooltip("google-orders")}
                    onMouseLeave={() => setActiveTooltip(null)}
                  >
                    <Icon
                      icon="solar:info-circle-bold"
                      style={{
                        fontSize: "10px",
                        color: "#9CA3AF",
                      }}
                    />
                    {activeTooltip === "google-orders" && (
                      <div
                        style={{
                          position: "absolute",
                          background: "#f3f4f6",
                          color: "#374151",
                          padding: "10px 14px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          lineHeight: "1.3",
                          zIndex: 9999,
                          top: "-40px",
                          right: "0",
                          transform: "translateX(0)",
                          pointerEvents: "none",
                          maxWidth: "700px",
                          whiteSpace: "nowrap",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                          border: "1px solid #d1d5db",
                        }}
                      >
                        <div style={{ fontWeight: "600", marginBottom: "2px" }}>
                          Total Orders
                        </div>
                        <div style={{ fontSize: "11px", opacity: "0.9" }}>
                          Shopify orders attributed to Google Ads via UTM
                          tracking
                        </div>
                      </div>
                    )}
                  </div>
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
                    {formatNumber(totalOrders)}
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
                    GROSS ROAS
                  </span>
                  <div
                    style={{
                      cursor: "pointer",
                      display: "inline-block",
                      position: "relative",
                    }}
                    onMouseEnter={() => setActiveTooltip("google-gross-roas")}
                    onMouseLeave={() => setActiveTooltip(null)}
                  >
                    <Icon
                      icon="solar:info-circle-bold"
                      style={{
                        fontSize: "10px",
                        color: "#9CA3AF",
                      }}
                    />
                    {activeTooltip === "google-gross-roas" && (
                      <div
                        style={{
                          position: "absolute",
                          background: "#f3f4f6",
                          color: "#374151",
                          padding: "10px 14px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          lineHeight: "1.3",
                          zIndex: 9999,
                          top: "-40px",
                          right: "0",
                          transform: "translateX(0)",
                          pointerEvents: "none",
                          maxWidth: "700px",
                          whiteSpace: "nowrap",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                          border: "1px solid #d1d5db",
                        }}
                      >
                        <div style={{ fontWeight: "600", marginBottom: "2px" }}>
                          Gross ROAS
                        </div>
                        <div style={{ fontSize: "11px", opacity: "0.9" }}>
                          Revenue per rupee (before COGS): Rev ÷ Spend
                        </div>
                      </div>
                    )}
                  </div>
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
                    {grossRoas.toFixed(2)}x
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
                    NET ROAS
                  </span>
                  <div
                    style={{
                      cursor: "pointer",
                      display: "inline-block",
                      position: "relative",
                    }}
                    onMouseEnter={() => setActiveTooltip("google-net-roas")}
                    onMouseLeave={() => setActiveTooltip(null)}
                  >
                    <Icon
                      icon="solar:info-circle-bold"
                      style={{
                        fontSize: "10px",
                        color: "#9CA3AF",
                      }}
                    />
                    {activeTooltip === "google-net-roas" && (
                      <div
                        style={{
                          position: "absolute",
                          background: "#f3f4f6",
                          color: "#374151",
                          padding: "10px 14px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          lineHeight: "1.3",
                          zIndex: 9999,
                          top: "-40px",
                          right: "0",
                          transform: "translateX(0)",
                          pointerEvents: "none",
                          maxWidth: "700px",
                          whiteSpace: "nowrap",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                          border: "1px solid #d1d5db",
                        }}
                      >
                        <div style={{ fontWeight: "600", marginBottom: "2px" }}>
                          Net ROAS
                        </div>
                        <div style={{ fontSize: "11px", opacity: "0.9" }}>
                          Profit per rupee (after COGS): Net Profit ÷ Spend
                        </div>
                      </div>
                    )}
                  </div>
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
                    {netRoas.toFixed(2)}x
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
                    NET PROFIT
                  </span>
                  <div
                    style={{
                      cursor: "pointer",
                      display: "inline-block",
                      position: "relative",
                    }}
                    onMouseEnter={() => setActiveTooltip("google-net-profit")}
                    onMouseLeave={() => setActiveTooltip(null)}
                  >
                    <Icon
                      icon="solar:info-circle-bold"
                      style={{
                        fontSize: "10px",
                        color: "#9CA3AF",
                      }}
                    />
                    {activeTooltip === "google-net-profit" && (
                      <div
                        style={{
                          position: "absolute",
                          background: "#f3f4f6",
                          color: "#374151",
                          padding: "10px 14px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          lineHeight: "1.3",
                          zIndex: 9999,
                          top: "-40px",
                          right: "0",
                          transform: "translateX(0)",
                          pointerEvents: "none",
                          maxWidth: "700px",
                          whiteSpace: "nowrap",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                          border: "1px solid #d1d5db",
                        }}
                      >
                        <div style={{ fontWeight: "600", marginBottom: "2px" }}>
                          Net Profit
                        </div>
                        <div style={{ fontSize: "11px", opacity: "0.9" }}>
                          Profit after costs: Rev - COGS - Ad Spend
                        </div>
                      </div>
                    )}
                  </div>
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
                    {formatCurrency(netProfit).replace("₹", "₹")}
                  </span>
                </div>
                <div
                  style={{
                    height: "2px",
                    backgroundColor: "#EF4444",
                    borderRadius: "2px",
                    width: "100%",
                  }}
                ></div>
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
        <div className="row mb-20 g-2">
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
                  <div
                    style={{
                      cursor: "pointer",
                      display: "inline-block",
                      position: "relative",
                    }}
                    onMouseEnter={() => setActiveTooltip("meta-spend")}
                    onMouseLeave={() => setActiveTooltip(null)}
                  >
                    <Icon
                      icon="solar:info-circle-bold"
                      style={{
                        fontSize: "10px",
                        color: "#9CA3AF",
                      }}
                    />
                    {activeTooltip === "meta-spend" && (
                      <div
                        style={{
                          position: "absolute",
                          background: "#f3f4f6",
                          color: "#374151",
                          padding: "10px 14px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          lineHeight: "1.3",
                          zIndex: 9999,
                          top: "-40px",
                          right: "0",
                          transform: "translateX(0)",
                          pointerEvents: "none",
                          maxWidth: "700px",
                          whiteSpace: "nowrap",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                          border: "1px solid #d1d5db",
                        }}
                      >
                        <div style={{ fontWeight: "600", marginBottom: "2px" }}>
                          Total Spend
                        </div>
                        <div style={{ fontSize: "11px", opacity: "0.9" }}>
                          Meta (Facebook & Instagram) ad spend across all
                          campaigns
                        </div>
                      </div>
                    )}
                  </div>
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
                    {formatCurrency(totalSpend).replace("₹", "₹")}
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
                    TOTAL REVENUE
                  </span>
                  <div
                    style={{
                      cursor: "pointer",
                      display: "inline-block",
                      position: "relative",
                    }}
                    onMouseEnter={() => setActiveTooltip("meta-revenue")}
                    onMouseLeave={() => setActiveTooltip(null)}
                  >
                    <Icon
                      icon="solar:info-circle-bold"
                      style={{
                        fontSize: "10px",
                        color: "#9CA3AF",
                      }}
                    />
                    {activeTooltip === "meta-revenue" && (
                      <div
                        style={{
                          position: "absolute",
                          background: "#f3f4f6",
                          color: "#374151",
                          padding: "10px 14px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          lineHeight: "1.3",
                          zIndex: 9999,
                          top: "-40px",
                          right: "0",
                          transform: "translateX(0)",
                          pointerEvents: "none",
                          maxWidth: "700px",
                          whiteSpace: "nowrap",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                          border: "1px solid #d1d5db",
                        }}
                      >
                        <div style={{ fontWeight: "600", marginBottom: "2px" }}>
                          Total Revenue
                        </div>
                        <div style={{ fontSize: "11px", opacity: "0.9" }}>
                          Revenue from Shopify orders attributed to Meta Ads
                          campaigns
                        </div>
                      </div>
                    )}
                  </div>
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
                    {formatCurrency(totalRevenue).replace("₹", "₹")}
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
                  <div
                    style={{
                      cursor: "pointer",
                      display: "inline-block",
                      position: "relative",
                    }}
                    onMouseEnter={() => setActiveTooltip("meta-orders")}
                    onMouseLeave={() => setActiveTooltip(null)}
                  >
                    <Icon
                      icon="solar:info-circle-bold"
                      style={{
                        fontSize: "10px",
                        color: "#9CA3AF",
                      }}
                    />
                    {activeTooltip === "meta-orders" && (
                      <div
                        style={{
                          position: "absolute",
                          background: "#f3f4f6",
                          color: "#374151",
                          padding: "10px 14px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          lineHeight: "1.3",
                          zIndex: 9999,
                          top: "-40px",
                          right: "0",
                          transform: "translateX(0)",
                          pointerEvents: "none",
                          maxWidth: "700px",
                          whiteSpace: "nowrap",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                          border: "1px solid #d1d5db",
                        }}
                      >
                        <div style={{ fontWeight: "600", marginBottom: "2px" }}>
                          Total Orders
                        </div>
                        <div style={{ fontSize: "11px", opacity: "0.9" }}>
                          Shopify orders attributed to Meta Ads via UTM tracking
                        </div>
                      </div>
                    )}
                  </div>
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
                    {formatNumber(totalOrders)}
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
                    NET PROFIT
                  </span>
                  <div
                    style={{
                      cursor: "pointer",
                      display: "inline-block",
                      position: "relative",
                    }}
                    onMouseEnter={() => setActiveTooltip("meta-profit")}
                    onMouseLeave={() => setActiveTooltip(null)}
                  >
                    <Icon
                      icon="solar:info-circle-bold"
                      style={{
                        fontSize: "10px",
                        color: "#9CA3AF",
                      }}
                    />
                    {activeTooltip === "meta-profit" && (
                      <div
                        style={{
                          position: "absolute",
                          background: "#f3f4f6",
                          color: "#374151",
                          padding: "10px 14px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          lineHeight: "1.3",
                          zIndex: 9999,
                          top: "-40px",
                          right: "0",
                          transform: "translateX(0)",
                          pointerEvents: "none",
                          maxWidth: "700px",
                          whiteSpace: "nowrap",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                          border: "1px solid #d1d5db",
                        }}
                      >
                        <div style={{ fontWeight: "600", marginBottom: "2px" }}>
                          Net Profit
                        </div>
                        <div style={{ fontSize: "11px", opacity: "0.9" }}>
                          Profit after costs: Rev - COGS - Ad Spend
                        </div>
                      </div>
                    )}
                  </div>
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
                    {formatCurrency(netProfit).replace("₹", "₹")}
                  </span>
                </div>
                <div
                  style={{
                    height: "2px",
                    backgroundColor: "#EF4444",
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
                    GROSS ROAS
                  </span>
                  <div
                    style={{
                      cursor: "pointer",
                      display: "inline-block",
                      position: "relative",
                    }}
                    onMouseEnter={() => setActiveTooltip("meta-gross-roas")}
                    onMouseLeave={() => setActiveTooltip(null)}
                  >
                    <Icon
                      icon="solar:info-circle-bold"
                      style={{
                        fontSize: "10px",
                        color: "#9CA3AF",
                      }}
                    />
                    {activeTooltip === "meta-gross-roas" && (
                      <div
                        style={{
                          position: "absolute",
                          background: "#f3f4f6",
                          color: "#374151",
                          padding: "10px 14px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          lineHeight: "1.3",
                          zIndex: 9999,
                          top: "-40px",
                          right: "0",
                          transform: "translateX(0)",
                          pointerEvents: "none",
                          maxWidth: "700px",
                          whiteSpace: "nowrap",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                          border: "1px solid #d1d5db",
                        }}
                      >
                        <div style={{ fontWeight: "600", marginBottom: "2px" }}>
                          Gross ROAS
                        </div>
                        <div style={{ fontSize: "11px", opacity: "0.9" }}>
                          Revenue per rupee (before COGS): Rev ÷ Spend
                        </div>
                      </div>
                    )}
                  </div>
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
                    {grossRoas.toFixed(2)}x
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
                    NET ROAS
                  </span>
                  <div
                    style={{
                      cursor: "pointer",
                      display: "inline-block",
                      position: "relative",
                    }}
                    onMouseEnter={() => setActiveTooltip("meta-net-roas")}
                    onMouseLeave={() => setActiveTooltip(null)}
                  >
                    <Icon
                      icon="solar:info-circle-bold"
                      style={{
                        fontSize: "10px",
                        color: "#9CA3AF",
                      }}
                    />
                    {activeTooltip === "meta-net-roas" && (
                      <div
                        style={{
                          position: "absolute",
                          background: "#f3f4f6",
                          color: "#374151",
                          padding: "10px 14px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          lineHeight: "1.3",
                          zIndex: 9999,
                          top: "-40px",
                          right: "0",
                          transform: "translateX(0)",
                          pointerEvents: "none",
                          maxWidth: "700px",
                          whiteSpace: "nowrap",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                          border: "1px solid #d1d5db",
                        }}
                      >
                        <div style={{ fontWeight: "600", marginBottom: "2px" }}>
                          Net ROAS
                        </div>
                        <div style={{ fontSize: "11px", opacity: "0.9" }}>
                          Profit per rupee (after COGS): Net Profit ÷ Spend
                        </div>
                      </div>
                    )}
                  </div>
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
                    {netRoas.toFixed(2)}x
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
      );
    }

    // For Organic tab, use API summary data directly
    if (activeTab === "organic" && data.organic && data.organic.length > 0) {
      // Get the summary data from the API response
      const organicSummary = data.organicSummary || {};
      const totalRevenue = parseFloat(
        organicSummary.total_revenue?.replace(/[₹,]/g, "") || 0
      );
      const totalCogs = parseFloat(
        organicSummary.total_cogs?.replace(/[₹,]/g, "") || 0
      );
      const totalOrders = organicSummary.total_orders || 0;
      const netProfit = parseFloat(
        organicSummary.net_profit?.replace(/[₹,]/g, "") || 0
      );
      const profitMargin = parseFloat(
        organicSummary.profit_margin?.replace(/%/g, "") || 0
      );
      const grossProfit = totalRevenue - totalCogs;

      return (
        <div className="row mb-20 g-2">
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
                  <div
                    style={{
                      cursor: "pointer",
                      display: "inline-block",
                      position: "relative",
                    }}
                    onMouseEnter={() => setActiveTooltip("organic-revenue")}
                    onMouseLeave={() => setActiveTooltip(null)}
                  >
                    <Icon
                      icon="solar:info-circle-bold"
                      style={{
                        fontSize: "10px",
                        color: "#9CA3AF",
                      }}
                    />
                    {activeTooltip === "organic-revenue" && (
                      <div
                        style={{
                          position: "absolute",
                          background: "#f3f4f6",
                          color: "#374151",
                          padding: "10px 14px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          lineHeight: "1.3",
                          zIndex: 9999,
                          top: "-40px",
                          right: "0",
                          transform: "translateX(0)",
                          pointerEvents: "none",
                          maxWidth: "700px",
                          whiteSpace: "nowrap",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                          border: "1px solid #d1d5db",
                        }}
                      >
                        <div style={{ fontWeight: "600", marginBottom: "2px" }}>
                          Total Revenue
                        </div>
                        <div style={{ fontSize: "11px", opacity: "0.9" }}>
                          Revenue from organic traffic and direct visits
                        </div>
                      </div>
                    )}
                  </div>
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
                    {formatCurrency(totalRevenue).replace("₹", "₹")}
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
                    TOTAL COGS
                  </span>
                  <div
                    style={{
                      cursor: "pointer",
                      display: "inline-block",
                      position: "relative",
                    }}
                    onMouseEnter={() => setActiveTooltip("organic-cogs")}
                    onMouseLeave={() => setActiveTooltip(null)}
                  >
                    <Icon
                      icon="solar:info-circle-bold"
                      style={{
                        fontSize: "10px",
                        color: "#9CA3AF",
                      }}
                    />
                    {activeTooltip === "organic-cogs" && (
                      <div
                        style={{
                          position: "absolute",
                          background: "#f3f4f6",
                          color: "#374151",
                          padding: "10px 14px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          lineHeight: "1.3",
                          zIndex: 9999,
                          top: "-40px",
                          right: "0",
                          transform: "translateX(0)",
                          pointerEvents: "none",
                          maxWidth: "700px",
                          whiteSpace: "nowrap",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                          border: "1px solid #d1d5db",
                        }}
                      >
                        <div style={{ fontWeight: "600", marginBottom: "2px" }}>
                          Total COGS
                        </div>
                        <div style={{ fontSize: "11px", opacity: "0.9" }}>
                          Cost of goods sold for organic orders
                        </div>
                      </div>
                    )}
                  </div>
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
                    {formatCurrency(totalCogs).replace("₹", "₹")}
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
                    TOTAL ORDERS
                  </span>
                  <div
                    style={{
                      cursor: "pointer",
                      display: "inline-block",
                      position: "relative",
                    }}
                    onMouseEnter={() => setActiveTooltip("organic-orders")}
                    onMouseLeave={() => setActiveTooltip(null)}
                  >
                    <Icon
                      icon="solar:info-circle-bold"
                      style={{
                        fontSize: "10px",
                        color: "#9CA3AF",
                      }}
                    />
                    {activeTooltip === "organic-orders" && (
                      <div
                        style={{
                          position: "absolute",
                          background: "#f3f4f6",
                          color: "#374151",
                          padding: "10px 14px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          lineHeight: "1.3",
                          zIndex: 9999,
                          top: "-40px",
                          right: "0",
                          transform: "translateX(0)",
                          pointerEvents: "none",
                          maxWidth: "700px",
                          whiteSpace: "nowrap",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                          border: "1px solid #d1d5db",
                        }}
                      >
                        <div style={{ fontWeight: "600", marginBottom: "2px" }}>
                          Total Orders
                        </div>
                        <div style={{ fontSize: "11px", opacity: "0.9" }}>
                          Orders from organic traffic and direct visits
                        </div>
                      </div>
                    )}
                  </div>
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
                    {formatNumber(totalOrders)}
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
                    GROSS PROFIT
                  </span>
                  <div
                    style={{
                      cursor: "pointer",
                      display: "inline-block",
                      position: "relative",
                    }}
                    onMouseEnter={() =>
                      setActiveTooltip("organic-gross-profit")
                    }
                    onMouseLeave={() => setActiveTooltip(null)}
                  >
                    <Icon
                      icon="solar:info-circle-bold"
                      style={{
                        fontSize: "10px",
                        color: "#9CA3AF",
                      }}
                    />
                    {activeTooltip === "organic-gross-profit" && (
                      <div
                        style={{
                          position: "absolute",
                          background: "#f3f4f6",
                          color: "#374151",
                          padding: "10px 14px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          lineHeight: "1.3",
                          zIndex: 9999,
                          top: "-40px",
                          right: "0",
                          transform: "translateX(0)",
                          pointerEvents: "none",
                          maxWidth: "700px",
                          whiteSpace: "nowrap",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                          border: "1px solid #d1d5db",
                        }}
                      >
                        <div style={{ fontWeight: "600", marginBottom: "2px" }}>
                          Gross Profit
                        </div>
                        <div style={{ fontSize: "11px", opacity: "0.9" }}>
                          Revenue minus COGS: Revenue - COGS
                        </div>
                      </div>
                    )}
                  </div>
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
                    {formatCurrency(grossProfit).replace("₹", "₹")}
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
                    NET PROFIT
                  </span>
                  <div
                    style={{
                      cursor: "pointer",
                      display: "inline-block",
                      position: "relative",
                    }}
                    onMouseEnter={() => setActiveTooltip("organic-net-profit")}
                    onMouseLeave={() => setActiveTooltip(null)}
                  >
                    <Icon
                      icon="solar:info-circle-bold"
                      style={{
                        fontSize: "10px",
                        color: "#9CA3AF",
                      }}
                    />
                    {activeTooltip === "organic-net-profit" && (
                      <div
                        style={{
                          position: "absolute",
                          background: "#f3f4f6",
                          color: "#374151",
                          padding: "10px 14px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          lineHeight: "1.3",
                          zIndex: 9999,
                          top: "-40px",
                          right: "0",
                          transform: "translateX(0)",
                          pointerEvents: "none",
                          maxWidth: "700px",
                          whiteSpace: "nowrap",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                          border: "1px solid #d1d5db",
                        }}
                      >
                        <div style={{ fontWeight: "600", marginBottom: "2px" }}>
                          Net Profit
                        </div>
                        <div style={{ fontSize: "11px", opacity: "0.9" }}>
                          Profit after all costs: Revenue - COGS
                        </div>
                      </div>
                    )}
                  </div>
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
                    {formatCurrency(netProfit).replace("₹", "₹")}
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
                    PROFIT MARGIN
                  </span>
                  <div
                    style={{
                      cursor: "pointer",
                      display: "inline-block",
                      position: "relative",
                    }}
                    onMouseEnter={() =>
                      setActiveTooltip("organic-profit-margin")
                    }
                    onMouseLeave={() => setActiveTooltip(null)}
                  >
                    <Icon
                      icon="solar:info-circle-bold"
                      style={{
                        fontSize: "10px",
                        color: "#9CA3AF",
                      }}
                    />
                    {activeTooltip === "organic-profit-margin" && (
                      <div
                        style={{
                          position: "absolute",
                          background: "#f3f4f6",
                          color: "#374151",
                          padding: "10px 14px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          lineHeight: "1.3",
                          zIndex: 9999,
                          top: "-40px",
                          right: "0",
                          transform: "translateX(0)",
                          pointerEvents: "none",
                          maxWidth: "700px",
                          whiteSpace: "nowrap",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                          border: "1px solid #d1d5db",
                        }}
                      >
                        <div style={{ fontWeight: "600", marginBottom: "2px" }}>
                          Profit Margin
                        </div>
                        <div style={{ fontSize: "11px", opacity: "0.9" }}>
                          Net profit as % of revenue: (Net Profit ÷ Revenue) ×
                          100
                        </div>
                      </div>
                    )}
                  </div>
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
                    {profitMargin.toFixed(1)}%
                  </span>
                </div>
                <div
                  style={{
                    height: "2px",
                    backgroundColor: "#EF4444",
                    borderRadius: "2px",
                    width: "100%",
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // For Amazon tab, use API summary data directly
    if (activeTab === "amazon" && data.amazon && data.amazon.length > 0) {
      // Get the summary data from the API response
      const amazonSummary = data.amazonSummary || {};
      const totalSpend = amazonSummary.total_spend || 0;
      const totalRevenue = amazonSummary.total_revenue || 0;
      const totalOrders = amazonSummary.total_orders || 0;
      const totalImpressions = amazonSummary.total_impressions || 0;
      const totalClicks = amazonSummary.total_clicks || 0;
      const averageRoas = amazonSummary.average_roas || 0;
      const averageAcos = amazonSummary.average_acos || 0;

      return (
        <div className="row mb-20 g-2">
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
                    {formatCurrency(totalSpend)}
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
                    {formatCurrency(totalRevenue)}
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
                    {totalOrders}
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
                    {averageRoas.toFixed(2)}x
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
                    {averageAcos.toFixed(2)}%
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
                    IMPRESSIONS
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
                    {totalImpressions.toLocaleString()}
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
      );
    }

    // Default summary cards for other tabs
    return (
      <div className="row mb-20" style={{ gap: "16px" }}>
        <div className="col-md-3 col-6">
          <div
            className="card"
            style={{
              height: "160px",
              border: "none",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              borderRadius: "12px",
            }}
          >
            <div className="card-body d-flex flex-column justify-content-between p-3">
              <div className="d-flex justify-content-between align-items-start">
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "600",
                    color: "#6B7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  TOTAL SPEND
                </span>
                <span
                  title="Detailed information about this metric"
                  style={{ cursor: "pointer" }}
                >
                  <Icon
                    icon="solar:info-circle-bold"
                    style={{
                      fontSize: "14px",
                      color: "#9CA3AF",
                    }}
                  />
                </span>
              </div>
              <div>
                <h3
                  style={{
                    fontSize: "28px",
                    fontWeight: "700",
                    color: "#111827",
                    margin: "0",
                    lineHeight: "1",
                  }}
                >
                  {formatCurrency(totalSpend).replace("₹", "₹")}
                </h3>
              </div>
              <div
                style={{
                  height: "4px",
                  backgroundColor: "#3B82F6",
                  borderRadius: "2px",
                  width: "100%",
                }}
              ></div>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div
            className="card"
            style={{
              height: "160px",
              border: "none",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              borderRadius: "12px",
            }}
          >
            <div className="card-body d-flex flex-column justify-content-between p-3">
              <div className="d-flex justify-content-between align-items-start">
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "600",
                    color: "#6B7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  TOTAL REVENUE
                </span>
                <span
                  title="Detailed information about this metric"
                  style={{ cursor: "pointer" }}
                >
                  <Icon
                    icon="solar:info-circle-bold"
                    style={{
                      fontSize: "14px",
                      color: "#9CA3AF",
                    }}
                  />
                </span>
              </div>
              <div>
                <h3
                  style={{
                    fontSize: "28px",
                    fontWeight: "700",
                    color: "#111827",
                    margin: "0",
                    lineHeight: "1",
                  }}
                >
                  {formatCurrency(totalRevenue).replace("₹", "₹")}
                </h3>
              </div>
              <div
                style={{
                  height: "4px",
                  backgroundColor: "#10B981",
                  borderRadius: "2px",
                  width: "100%",
                }}
              ></div>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div
            className="card"
            style={{
              height: "160px",
              border: "none",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              borderRadius: "12px",
            }}
          >
            <div className="card-body d-flex flex-column justify-content-between p-3">
              <div className="d-flex justify-content-between align-items-start">
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "600",
                    color: "#6B7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  TOTAL ORDERS
                </span>
                <span
                  title="Detailed information about this metric"
                  style={{ cursor: "pointer" }}
                >
                  <Icon
                    icon="solar:info-circle-bold"
                    style={{
                      fontSize: "14px",
                      color: "#9CA3AF",
                    }}
                  />
                </span>
              </div>
              <div>
                <h3
                  style={{
                    fontSize: "28px",
                    fontWeight: "700",
                    color: "#111827",
                    margin: "0",
                    lineHeight: "1",
                  }}
                >
                  {formatNumber(totalOrders)}
                </h3>
              </div>
              <div
                style={{
                  height: "4px",
                  backgroundColor: "#F59E0B",
                  borderRadius: "2px",
                  width: "100%",
                }}
              ></div>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div
            className="card"
            style={{
              height: "160px",
              border: "none",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              borderRadius: "12px",
            }}
          >
            <div className="card-body d-flex flex-column justify-content-between p-3">
              <div className="d-flex justify-content-between align-items-start">
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "600",
                    color: "#6B7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  NET PROFIT
                </span>
                <span
                  title="Detailed information about this metric"
                  style={{ cursor: "pointer" }}
                >
                  <Icon
                    icon="solar:info-circle-bold"
                    style={{
                      fontSize: "14px",
                      color: "#9CA3AF",
                    }}
                  />
                </span>
              </div>
              <div>
                <h3
                  style={{
                    fontSize: "28px",
                    fontWeight: "700",
                    color: "#111827",
                    margin: "0",
                    lineHeight: "1",
                  }}
                >
                  {formatCurrency(totalNetProfit).replace("₹", "₹")}
                </h3>
              </div>
              <div
                style={{
                  height: "4px",
                  backgroundColor: "#EF4444",
                  borderRadius: "2px",
                  width: "100%",
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <CustomProvider locale={enUS}>
      <div className="card h-100 radius-8 border">
        <div className="card-body p-24">
          {/* Header with Date Picker and Download Button */}
          <div className="d-flex justify-content-between align-items-center mb-20">
            <div className="d-flex align-items-center">
              <h6 className="mb-0 me-2">Entity Report</h6>
              <div
                style={{
                  cursor: "pointer",
                  display: "inline-block",
                  position: "relative",
                }}
                onMouseEnter={() => setActiveTooltip("header")}
                onMouseLeave={() => setActiveTooltip(null)}
              >
                <Icon
                  icon="solar:info-circle-bold"
                  style={{ fontSize: "14px", color: "#9CA3AF" }}
                />
                {activeTooltip === "header" && (
                  <div
                    style={{
                      position: "absolute",
                      background: "#f3f4f6",
                      color: "#374151",
                      padding: "10px 14px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      lineHeight: "1.3",
                      zIndex: 9999,
                      top: "-40px",
                      right: "0",
                      transform: "translateX(0)",
                      pointerEvents: "none",
                      maxWidth: "700px",
                      whiteSpace: "nowrap",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                      border: "1px solid #d1d5db",
                    }}
                  >
                    <div style={{ fontWeight: "600", marginBottom: "2px" }}>
                      Entity Report
                    </div>
                    <div style={{ fontSize: "11px", opacity: "0.9" }}>
                      Analytics dashboard for Google Ads, Meta Ads, and Organic
                      performance tracking
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="d-flex align-items-center" style={{ gap: 12 }}>
              <DateRangePicker
                value={dateRange}
                onChange={handleDateRangeChange}
                format="yyyy-MM-dd"
                showMeridian={false}
                ranges={[]}
                placeholder="Select date range"
                style={{
                  width: 300,
                  borderRadius: 8,
                  border: "1px solid #ccc",
                  fontSize: 16,
                }}
                appearance="subtle"
                cleanable
                menuStyle={{
                  boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                  borderRadius: 8,
                  padding: 8,
                }}
                placement="bottomEnd"
                oneTap={false}
                showOneCalendar={false}
                onOk={handleDatePickerOk}
              />
              <button
                className="btn btn-success btn-icon"
                onClick={() => handleDownload()}
                disabled={loading || !hasData()}
                title="Download Excel Report"
                style={{
                  width: 40,
                  height: 40,
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                }}
              >
                <Icon
                  icon="vscode-icons:file-type-excel"
                  width="24"
                  height="24"
                />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-20">
            <ul
              className="nav nav-tabs"
              role="tablist"
              style={{ borderBottom: "1px solid #e5e7eb" }}
            >
              <li className="nav-item" role="presentation">
                <button
                  className={`nav-link ${
                    activeTab === "google" ? "active" : ""
                  }`}
                  onClick={() => handleTabChange("google")}
                  style={{
                    backgroundColor:
                      activeTab === "google" ? "#f8fafc" : "transparent",
                    border: "none",
                    borderBottom:
                      activeTab === "google"
                        ? "2px solid #6b7280"
                        : "2px solid transparent",
                    color: activeTab === "google" ? "#374151" : "#6b7280",
                    fontWeight: activeTab === "google" ? "500" : "400",
                    borderRadius: "0",
                    padding: "12px 16px",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== "google") {
                      e.target.style.backgroundColor = "#f9fafb";
                      e.target.style.color = "#4b5563";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== "google") {
                      e.target.style.backgroundColor = "transparent";
                      e.target.style.color = "#6b7280";
                    }
                  }}
                >
                  <Icon icon="logos:google-icon" className="me-2" />
                  Google Ads
                </button>
              </li>
              <li className="nav-item" role="presentation">
                <button
                  className={`nav-link ${activeTab === "meta" ? "active" : ""}`}
                  onClick={() => handleTabChange("meta")}
                  style={{
                    backgroundColor:
                      activeTab === "meta" ? "#f8fafc" : "transparent",
                    border: "none",
                    borderBottom:
                      activeTab === "meta"
                        ? "2px solid #6b7280"
                        : "2px solid transparent",
                    color: activeTab === "meta" ? "#374151" : "#6b7280",
                    fontWeight: activeTab === "meta" ? "500" : "400",
                    borderRadius: "0",
                    padding: "12px 16px",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== "meta") {
                      e.target.style.backgroundColor = "#f9fafb";
                      e.target.style.color = "#4b5563";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== "meta") {
                      e.target.style.backgroundColor = "transparent";
                      e.target.style.color = "#6b7280";
                    }
                  }}
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
                  style={{
                    backgroundColor:
                      activeTab === "organic" ? "#f8fafc" : "transparent",
                    border: "none",
                    borderBottom:
                      activeTab === "organic"
                        ? "2px solid #6b7280"
                        : "2px solid transparent",
                    color: activeTab === "organic" ? "#374151" : "#6b7280",
                    fontWeight: activeTab === "organic" ? "500" : "400",
                    borderRadius: "0",
                    padding: "12px 16px",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== "organic") {
                      e.target.style.backgroundColor = "#f9fafb";
                      e.target.style.color = "#4b5563";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== "organic") {
                      e.target.style.backgroundColor = "transparent";
                      e.target.style.color = "#6b7280";
                    }
                  }}
                >
                  <Icon icon="solar:leaf-bold" className="me-2" />
                  Organic Attribution
                </button>
              </li>
              <li className="nav-item" role="presentation">
                <button
                  className={`nav-link ${
                    activeTab === "amazon" ? "active" : ""
                  }`}
                  onClick={() => handleTabChange("amazon")}
                  style={{
                    backgroundColor:
                      activeTab === "amazon" ? "#f8fafc" : "transparent",
                    border: "none",
                    borderBottom:
                      activeTab === "amazon"
                        ? "2px solid #6b7280"
                        : "2px solid transparent",
                    color: activeTab === "amazon" ? "#374151" : "#6b7280",
                    fontWeight: activeTab === "amazon" ? "500" : "400",
                    borderRadius: "0",
                    padding: "12px 16px",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== "amazon") {
                      e.target.style.backgroundColor = "#f9fafb";
                      e.target.style.color = "#4b5563";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== "amazon") {
                      e.target.style.backgroundColor = "transparent";
                      e.target.style.color = "#6b7280";
                    }
                  }}
                >
                  <Icon icon="logos:amazon-icon" className="me-2" />
                  Amazon Ads
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

          {/* Search and Filter Controls */}
          {((data[activeTab] && data[activeTab].length > 0) ||
            (activeTab === "meta" && data.metaHierarchy)) && (
            <div className="row mb-3">
              <div className="col-md-6">
                <div className="input-group">
                  <span className="input-group-text">
                    <Icon icon="solar:magnifer-linear" />
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search all columns..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="col-md-6 text-end">
                <small className="text-muted">
                  {
                    getFilteredAndSortedData(
                      activeTab === "meta"
                        ? data.metaHierarchy
                          ? Object.values(data.metaHierarchy).flat()
                          : []
                        : data[activeTab] || []
                    ).length
                  }{" "}
                  results
                </small>
              </div>
            </div>
          )}

          {/* Data Tables */}
          <div className="tab-content">
            {activeTab === "google" && renderGoogleAdsTable()}
            {activeTab === "meta" && renderMetaHierarchicalTable()}
            {activeTab === "organic" && renderOrganicTable()}
            {activeTab === "amazon" && renderAmazonAdsTable()}
          </div>
        </div>
      </div>
    </CustomProvider>
  );
};

export default EntityReportLayer;
