import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/api";
import { STALE_TIME } from "@/lib/queryClient";
import { totalSalesAfterGst } from "@/utils/totalSalesAfterGst";
import { getPeriodDateRange } from "./dateRangeUtils";
import { dashboardKeys } from "./queryKeys";

export function useProvinceSalesQuery(period, { enabled = true } = {}) {
  const { startDate, endDate } = getPeriodDateRange(period);

  return useQuery({
    queryKey: dashboardKeys.provinceSales(startDate, endDate),
    queryFn: async () => {
      const response = await apiClient.get(
        `/api/order_sales_by_province?start_date=${startDate}&end_date=${endDate}`
      );
      const rows = Array.isArray(response.data) ? response.data : [];
      const total = rows.reduce((sum, item) => {
        const exGst =
          item.total_sales_after_gst ??
          totalSalesAfterGst(item.total_sales) ??
          0;
        return sum + exGst;
      }, 0);
      return { rows, total };
    },
    enabled,
    staleTime: period === "today" ? STALE_TIME.live : STALE_TIME.charts,
    placeholderData: keepPreviousData,
  });
}
