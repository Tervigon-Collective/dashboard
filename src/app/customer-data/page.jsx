"use client";
import MasterLayout from "@/masterLayout/MasterLayout";
import CustomerLayer from "@/components/CustomerLayer";
import SidebarPermissionGuard from "@/components/SidebarPermissionGuard";

const CustomerDataPage = () => {
  return (
    <>
      <SidebarPermissionGuard requiredSidebar="customerData">
        <MasterLayout>
          <CustomerLayer />
        </MasterLayout>
      </SidebarPermissionGuard>
    </>
  );
};

export default CustomerDataPage;
