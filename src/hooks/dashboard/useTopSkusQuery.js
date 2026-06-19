import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/api";
import { STALE_TIME } from "@/lib/queryClient";
import { getPeriodDateRange } from "./dateRangeUtils";
import { dashboardKeys } from "./queryKeys";

export function useTopSkusQuery(period, limit = 6, { enabled = true } = {}) {
  const { startDate, endDate } = getPeriodDateRange(period);

  return useQuery({
    queryKey: dashboardKeys.topSkus(startDate, endDate, limit),
    queryFn: async () => {
      const response = await apiClient.get(
        `/api/top_skus_by_sales?n=${limit}&start_date=${startDate}&end_date=${endDate}`
      );
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled,
    staleTime: period === "today" ? STALE_TIME.live : STALE_TIME.charts,
    placeholderData: keepPreviousData,
  });
}
