"use client";

import DashboardMetricsSkeleton from "@/components/dashboard/DashboardMetricsSkeleton";

/**
 * Full-page metrics skeleton without sidebar/header.
 * Used while auth or initial data is loading — avoids "Guest" shell flash.
 */
export default function DashboardLoadingPage() {
  return (
    <div
      className="dashboard-main-body bg-base"
      style={{ minHeight: "100vh", padding: "24px" }}
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      <DashboardMetricsSkeleton />
    </div>
  );
}
