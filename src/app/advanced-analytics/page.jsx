"use client";
import { Suspense } from "react";
import AdvancedAnalyticsLayer from "@/components/AdvancedAnalyticsLayer";
import MasterLayout from "@/masterLayout/MasterLayout";
import SidebarPermissionGuard from "@/components/SidebarPermissionGuard";

const LoadingFallback = () => (
  <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
    <div className="text-center">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
      <p className="mt-3 text-muted">Loading advanced analytics...</p>
    </div>
  </div>
);

const Page = () => {
  return (
    <>
      <SidebarPermissionGuard requiredSidebar="dashboard">
        {/* MasterLayout */}
        <MasterLayout>
          {/* AdvancedAnalyticsLayer */}
          <Suspense fallback={<LoadingFallback />}>
            <AdvancedAnalyticsLayer />
          </Suspense>
        </MasterLayout>
      </SidebarPermissionGuard>
    </>
  );
};

export default Page;

