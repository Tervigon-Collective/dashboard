"use client";
import MasterLayout from "@/masterLayout/MasterLayout";
import { Breadcrumb } from "react-bootstrap";
import ShippingDashboard from "@/components/ShippingDashboard";
import SidebarPermissionGuard from "@/components/SidebarPermissionGuard";

const ShippingPage = () => {
  return (
    <>
      <SidebarPermissionGuard requiredSidebar="shipping">
        <MasterLayout>
          {/* Breadcrumb */}
          <Breadcrumb title="Shipping Management" />
          <ShippingDashboard />
        </MasterLayout>
      </SidebarPermissionGuard>
    </>
  );
};

export default ShippingPage;
