import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/api";
import { fetchDashboardMetrics } from "@/api/dashboardMetricsApi";
import { peekDashboardForceRefresh } from "@/lib/dashboardRefresh";
import { STALE_TIME } from "@/lib/queryClient";
import { buildDashboardMetricsParams } from "./dateRangeUtils";
import { dashboardKeys } from "./queryKeys";

export function useDashboardMetricsQuery(
  dateRange,
  { enabled = true, historicalMode = false } = {}
) {
  const params = useMemo(
    () => buildDashboardMetricsParams(dateRange, { historicalMode }),
    [dateRange?.startDate, dateRange?.endDate, historicalMode]
  );

  return useQuery({
    queryKey: dashboardKeys.metrics(params),
    queryFn: () =>
      fetchDashboardMetrics(apiClient, {
        ...params,
        forceRefresh: peekDashboardForceRefresh(),
      }),
    enabled,
    staleTime:
      params.isToday && !historicalMode ? STALE_TIME.live : STALE_TIME.historical,
    gcTime: 60 * 60 * 1000,
    refetchInterval: params.isToday && !historicalMode ? STALE_TIME.live : false,
    refetchOnWindowFocus: params.isToday && !historicalMode,
    placeholderData: keepPreviousData,
  });
}
