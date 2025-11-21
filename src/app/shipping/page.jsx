"use client";
import MasterLayout from "@/masterLayout/MasterLayout";
import ShippingDashboard from "@/components/ShippingDashboard";
import SidebarPermissionGuard from "@/components/SidebarPermissionGuard";

const ShippingPage = () => {
  return (
    <>
      <SidebarPermissionGuard requiredSidebar="shipping">
        <MasterLayout>
          <ShippingDashboard />
        </MasterLayout>
      </SidebarPermissionGuard>
    </>
  );
};

export default ShippingPage;
