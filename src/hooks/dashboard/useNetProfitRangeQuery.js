import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/api";
import { STALE_TIME } from "@/lib/queryClient";
import { getNetProfitChartRange } from "./dateRangeUtils";
import { dashboardKeys } from "./queryKeys";

export function useNetProfitRangeQuery(period, { enabled = true } = {}) {
  const { startDate, endDate } = getNetProfitChartRange(period);

  return useQuery({
    queryKey: dashboardKeys.netProfitRange(startDate, endDate),
    queryFn: async () => {
      const response = await apiClient.get(
        `/api/net_profit_single_day?startDate=${startDate}&endDate=${endDate}`
      );
      const payload = response.data?.data ?? {};
      const dailyBreakdowns = payload.dailyBreakdowns || [];
      const totalNetProfit =
        payload.totals?.netProfit_after_gst ??
        payload.totals?.netProfit ??
        0;
      return { dailyBreakdowns, totalNetProfit };
    },
    enabled,
    staleTime: STALE_TIME.charts,
    placeholderData: keepPreviousData,
  });
}
