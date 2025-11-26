/**
 * Build context for hourly efficiency heatmap data
 * @param {Object} hourlyData - Processed hourly data from heatmap
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @param {string} period - Time period (today, weekly, monthly, yearly)
 * @returns {Object} Context object for insights API
 */
export function buildHourlyEfficiencyContext(
  hourlyData,
  startDate,
  endDate,
  period = "monthly"
) {
  if (!hourlyData || !hourlyData.data || hourlyData.data.length === 0) {
    return {
      data_type: "hourly_efficiency",
      domain: "marketing",
      error: "No data available",
    };
  }

  // Calculate summary statistics
  const dataArray = hourlyData.data;
  const totalSpend = dataArray.reduce((sum, item) => sum + (item.spend || 0), 0);
  const totalRevenue = dataArray.reduce((sum, item) => sum + (item.revenue || 0), 0);
  const totalOrders = dataArray.reduce((sum, item) => sum + (item.orders || 0), 0);
  const avgROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  // Find best and worst performing hours
  const sortedByROAS = [...dataArray].sort((a, b) => (b.roas || 0) - (a.roas || 0));
  const bestHour = sortedByROAS[0];
  const worstHour = sortedByROAS[sortedByROAS.length - 1];

  // Count hours below ROAS threshold
  const hoursBelowThreshold = dataArray.filter((item) => (item.roas || 0) < 1.0).length;
  const hoursAboveTarget = dataArray.filter((item) => (item.roas || 0) >= 2.5).length;

  return {
    data_type: "hourly_efficiency",
    domain: "marketing",
    date_range: {
      start: startDate,
      end: endDate,
    },
    period: period,
    metrics: ["roas", "revenue", "spend", "orders"],
    dimensions: ["hour"],
    summary: {
      total_spend: totalSpend,
      total_revenue: totalRevenue,
      total_orders: totalOrders,
      average_roas: avgROAS,
      best_hour_roas: bestHour?.roas || 0,
      worst_hour_roas: worstHour?.roas || 0,
      hours_below_threshold: hoursBelowThreshold,
      hours_above_target: hoursAboveTarget,
    },
    question: "What are the key insights, trends, and actionable recommendations for this hourly efficiency data?",
  };
}

/**
 * Build context for sales summary data
 * @param {Object} salesData - Sales summary data
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Object} Context object
 */
export function buildSalesSummaryContext(salesData, startDate, endDate) {
  return {
    data_type: "sales_summary",
    domain: "erp",
    date_range: {
      start: startDate,
      end: endDate,
    },
    metrics: ["total_sales", "average_order_value"],
    question: "What are the key insights and trends in the sales data?",
  };
}

/**
 * Build context for customer segmentation data
 * @param {Object} segmentData - Customer segmentation data
 * @param {number} periodDays - Analysis period in days
 * @returns {Object} Context object
 */
export function buildCustomerSegmentationContext(segmentData, periodDays = 90) {
  if (!segmentData || !segmentData.segments || segmentData.segments.length === 0) {
    return {
      data_type: "customer_segmentation",
      domain: "customer",
      error: "No data available",
    };
  }

  const segments = segmentData.segments;
  const totalCustomers = segmentData.total_customers || 0;

  return {
    data_type: "customer_segmentation",
    domain: "customer",
    dimensions: ["segment"],
    period_days: periodDays,
    summary: {
      total_customers: totalCustomers,
      segments: segments.map(s => ({
        type: s.segment_type,
        count: s.customer_count,
        percentage: s.percentage,
      })),
    },
    question: "What are the key insights about customer segmentation and distribution?",
  };
}

/**
 * Build context for hourly spend and sales graph data
 * @param {Object} chartData - Chart data with categories and series
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @param {string} period - Time period
 * @param {Array} selectedMetrics - Selected metrics
 * @returns {Object} Context object
 */
export function buildHourlySpendSalesContext(
  chartData,
  startDate,
  endDate,
  period = "monthly",
  selectedMetrics = []
) {
  if (!chartData || !chartData.categories || !chartData.series) {
    return {
      data_type: "hourly_spend_sales",
      domain: "marketing",
      error: "No data available",
    };
  }

  // Calculate summary statistics from series data
  const summary = {};
  chartData.series.forEach((series) => {
    const seriesData = series.data || [];
    if (seriesData.length > 0) {
      summary[series.name] = {
        total: seriesData.reduce((sum, val) => sum + (val || 0), 0),
        average: seriesData.reduce((sum, val) => sum + (val || 0), 0) / seriesData.length,
        min: Math.min(...seriesData),
        max: Math.max(...seriesData),
      };
    }
  });

  return {
    data_type: "hourly_spend_sales",
    domain: "marketing",
    date_range: {
      start: startDate,
      end: endDate,
    },
    period: period,
    metrics: selectedMetrics.length > 0 ? selectedMetrics : chartData.series.map(s => s.name),
    dimensions: ["hour", "date"],
    summary: summary,
    question: "What are the key insights, trends, and actionable recommendations for this hourly spend and sales data?",
  };
}

/**
 * Build context for return and cancellation trends data
 * @param {Array} trendData - Trend data array
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @param {Object} aggregatedMetrics - Aggregated metrics
 * @returns {Object} Context object
 */
export function buildReturnCancelTrendsContext(
  trendData,
  startDate,
  endDate,
  aggregatedMetrics = {}
) {
  if (!trendData || trendData.length === 0) {
    return {
      data_type: "return_cancel_trends",
      domain: "erp",
      error: "No data available",
    };
  }

  return {
    data_type: "return_cancel_trends",
    domain: "erp",
    date_range: {
      start: startDate,
      end: endDate,
    },
    metrics: ["return_orders", "cancel_orders", "return_rate", "cancellation_rate"],
    dimensions: ["date"],
    summary: {
      total_return_orders: aggregatedMetrics.totalReturnOrders || 0,
      total_cancel_orders: aggregatedMetrics.totalCancelOrders || 0,
      avg_return_rate: aggregatedMetrics.avgReturnRate || 0,
      avg_cancellation_rate: aggregatedMetrics.avgCancellationRate || 0,
    },
    question: "What are the key insights and trends in return and cancellation data?",
  };
}

/**
 * Build context for ad spend and revenue overview
 * @param {Object} chartData - Chart series and options
 * @param {string} timeframe - Timeframe (Year, Month, Week)
 * @returns {Object} Context object
 */
export function buildAdSpendRevenueContext(chartData, timeframe = "Year") {
  if (!chartData || !chartData.chartSeries || chartData.chartSeries.length === 0) {
    return {
      data_type: "ad_spend_revenue",
      domain: "marketing",
      error: "No data available",
    };
  }

  // Calculate summary from chart series
  const adSpendSeries = chartData.chartSeries.find(s => s.name === "Ad Spend");
  const revenueSeries = chartData.chartSeries.find(s => s.name === "Total Revenue");

  const summary = {};
  if (adSpendSeries && adSpendSeries.data) {
    const adSpendData = adSpendSeries.data;
    summary.ad_spend = {
      total: adSpendData.reduce((sum, val) => sum + (val || 0), 0),
      average: adSpendData.reduce((sum, val) => sum + (val || 0), 0) / adSpendData.length,
    };
  }
  if (revenueSeries && revenueSeries.data) {
    const revenueData = revenueSeries.data;
    summary.revenue = {
      total: revenueData.reduce((sum, val) => sum + (val || 0), 0),
      average: revenueData.reduce((sum, val) => sum + (val || 0), 0) / revenueData.length,
    };
  }

  // Calculate ROAS if both available
  if (summary.ad_spend && summary.revenue) {
    summary.roas = summary.ad_spend.total > 0 
      ? summary.revenue.total / summary.ad_spend.total 
      : 0;
  }

  return {
    data_type: "ad_spend_revenue",
    domain: "marketing",
    timeframe: timeframe,
    metrics: ["ad_spend", "revenue", "roas"],
    summary: summary,
    question: "What are the key insights and trends in ad spend versus revenue performance?",
  };
}

/**
 * Build context for any generic chart/data visualization
 * @param {Object} data - The data to analyze
 * @param {Object} options - Additional context options
 * @returns {Object} Context object
 */
export function buildGenericContext(data, options = {}) {
  const {
    dataType = "generic",
    domain = "analytics",
    metrics = [],
    dimensions = [],
    dateRange = null,
    question = "What are the key insights and trends in this data?",
  } = options;

  const context = {
    data_type: dataType,
    domain: domain,
    metrics: metrics,
    dimensions: dimensions,
    question: question,
  };

  if (dateRange) {
    context.date_range = dateRange;
  }

  return context;
}
