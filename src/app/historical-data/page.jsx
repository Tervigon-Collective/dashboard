"use client";
import HistoricalDashBoardLayerOne from "@/components/HistoricalDashboardLayerOne";
import MasterLayout from "@/masterLayout/MasterLayout";
import SidebarPermissionGuard from "@/components/SidebarPermissionGuard";

const Page = () => {
  return (
    <>
      <SidebarPermissionGuard requiredSidebar="dashboard">
        {/* MasterLayout */}
        <MasterLayout>
          {/* DashBoardLayerOne */}
          <HistoricalDashBoardLayerOne />
        </MasterLayout>
      </SidebarPermissionGuard>
    </>
  );
};

export default Page;
