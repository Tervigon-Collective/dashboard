"use client";
import MasterLayout from "@/masterLayout/MasterLayout";
import { Breadcrumb } from "react-bootstrap";
import CustomerLayer from "@/components/CustomerLayer";
import SidebarPermissionGuard from "@/components/SidebarPermissionGuard";

const CustomerDataPage = () => {
  return (
    <>
      <SidebarPermissionGuard requiredSidebar="customerData">
        <MasterLayout>
          {/* Breadcrumb */}
          <Breadcrumb title="Customer Data" />
          <CustomerLayer />
        </MasterLayout>
      </SidebarPermissionGuard>
    </>
  );
};

export default CustomerDataPage;
