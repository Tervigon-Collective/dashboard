export const dashboardKeys = {
  all: ["dashboard"],
  metrics: (params) => [
    ...dashboardKeys.all,
    "metrics",
    params?.startDateOnly,
    params?.endDateOnly,
    params?.startDateTime,
    params?.endDateTime,
    params?.isToday,
    params?.historicalMode,
  ],
  netSales: (timeframe) => [...dashboardKeys.all, "netSales", timeframe],
  netSalesAll: () => [...dashboardKeys.all, "netSales"],
  provinceSales: (startDate, endDate) => [
    ...dashboardKeys.all,
    "provinceSales",
    startDate,
    endDate,
  ],
  topSkus: (startDate, endDate, limit) => [
    ...dashboardKeys.all,
    "topSkus",
    startDate,
    endDate,
    limit,
  ],
  netProfitRange: (startDate, endDate) => [
    ...dashboardKeys.all,
    "netProfitRange",
    startDate,
    endDate,
  ],
  sourceVisitors: (timeframe) => [
    ...dashboardKeys.all,
    "sourceVisitors",
    timeframe,
  ],
};
