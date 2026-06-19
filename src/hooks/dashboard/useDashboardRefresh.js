import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  clearDashboardForceRefresh,
  markDashboardForceRefresh,
} from "@/lib/dashboardRefresh";
import { dashboardKeys } from "./queryKeys";

export function useDashboardRefresh() {
  const queryClient = useQueryClient();

  const refreshAll = useCallback(async () => {
    markDashboardForceRefresh();
    try {
      await queryClient.invalidateQueries({
        queryKey: dashboardKeys.all,
        refetchType: "active",
      });
      await queryClient.refetchQueries({
        queryKey: dashboardKeys.all,
        type: "active",
      });
    } finally {
      clearDashboardForceRefresh();
    }
  }, [queryClient]);

  const refreshMetrics = useCallback(
    async (params) => {
      markDashboardForceRefresh();
      try {
        if (params) {
          await queryClient.invalidateQueries({
            queryKey: dashboardKeys.metrics(params),
            refetchType: "active",
          });
          await queryClient.refetchQueries({
            queryKey: dashboardKeys.metrics(params),
            type: "active",
          });
          return;
        }
        await queryClient.invalidateQueries({
          queryKey: [...dashboardKeys.all, "metrics"],
          refetchType: "active",
        });
        await queryClient.refetchQueries({
          queryKey: [...dashboardKeys.all, "metrics"],
          type: "active",
        });
      } finally {
        clearDashboardForceRefresh();
      }
    },
    [queryClient]
  );

  return { refreshAll, refreshMetrics };
}
