"use client";
import HistoricalDashBoardLayerOne from "@/components/HistoricalDashboardLayerOne";
import MasterLayout from "@/masterLayout/MasterLayout";
import { Breadcrumb } from "react-bootstrap";
import SidebarPermissionGuard from "@/components/SidebarPermissionGuard";

const Page = () => {
  return (
    <>
      <SidebarPermissionGuard requiredSidebar="dashboard">
        {/* MasterLayout */}
        <MasterLayout>
          {/* Breadcrumb */}
          <Breadcrumb title="Historical Data" />

          {/* DashBoardLayerOne */}
          <HistoricalDashBoardLayerOne />
        </MasterLayout>
      </SidebarPermissionGuard>
    </>
  );
};

export default Page;
