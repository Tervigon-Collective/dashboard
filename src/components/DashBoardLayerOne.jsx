"use client";

import GeneratedContent from "./child/GeneratedContent";
import IndiaSalesHeatMap from "./child/IndiaSalesHeatMap";
import LatestRegisteredOne from "./child/LatestRegisteredOne";
import SalesStatisticOne from "./child/SalesStatisticOne";
import SourceVisitors from "./child/SourceVisitors";
import TopPerformerOne from "./child/TopPerformerOne";
import TotalSubscriberOne from "./child/TotalSubscriberOne";
import UnitCountOne from "./child/UnitCountOne";
import DashboardRefreshButton from "./dashboard/DashboardRefreshButton";
import { useDashboardRefresh } from "@/hooks/dashboard/useDashboardRefresh";
import { useTimeframeData } from "@/helper/TimeframeDataContext";
import { useState } from "react";

const DashBoardLayerOne = () => {
  const { refresh: refreshCharts, dataUpdatedAt, isFetching } = useTimeframeData();
  const { refreshAll } = useDashboardRefresh();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      await refreshCharts();
      await refreshAll();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <>
      <div className="w-100 d-flex justify-content-end align-items-center mb-3">
        <DashboardRefreshButton
          onRefresh={handleRefreshAll}
          isFetching={isRefreshing || isFetching}
          dataUpdatedAt={dataUpdatedAt}
          label="Refresh entire dashboard"
          className="mb-0"
        />
      </div>

      <UnitCountOne showRefresh={false} />

      <section className="row gy-4 mt-1">
        <SalesStatisticOne />
        <TotalSubscriberOne />
      </section>

      <section className="row gy-4">
        <LatestRegisteredOne />
        <TopPerformerOne />
        <GeneratedContent />
        <SourceVisitors />
        <IndiaSalesHeatMap />
      </section>
    </>
  );
};

export default DashBoardLayerOne;
