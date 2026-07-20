import { keepPreviousData, useQueries, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { apiClient } from "@/api/api";
import { STALE_TIME } from "@/lib/queryClient";
import { dashboardKeys } from "./queryKeys";

const TIMEFRAMES = ["year", "month", "week"];

async function fetchNetSales(timeframe) {
  const response = await apiClient.get(`/api/net_sales/${timeframe}`);
  return response.data;
}

export function useNetSalesTimeframesQuery({ enabled = true } = {}) {
  const queryClient = useQueryClient();

  const results = useQueries({
    queries: TIMEFRAMES.map((timeframe) => ({
      queryKey: dashboardKeys.netSales(timeframe),
      queryFn: () => fetchNetSales(timeframe),
      enabled,
      staleTime: STALE_TIME.charts,
      gcTime: 60 * 60 * 1000,
      placeholderData: keepPreviousData,
    })),
  });

  const data = useMemo(() => {
    const [year, month, week] = results;
    if (!year.data || !month.data || !week.data) {
      return undefined;
    }
    return {
      Year: year.data,
      Month: month.data,
      Week: week.data,
    };
  }, [results]);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: dashboardKeys.netSalesAll(),
      refetchType: "active",
    });
    await queryClient.refetchQueries({
      queryKey: dashboardKeys.netSalesAll(),
      type: "active",
    });
  }, [queryClient]);

  return {
    data,
    loading: results.some((r) => r.isLoading && !r.data),
    isFetching: results.some((r) => r.isFetching),
    refresh,
    dataUpdatedAt: Math.max(...results.map((r) => r.dataUpdatedAt || 0)),
  };
}
