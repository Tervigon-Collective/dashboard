"use client";
import MasterLayout from "@/masterLayout/MasterLayout";
import { Breadcrumb } from "react-bootstrap";
import CustomerLayer from "@/components/CustomerLayer";
import RoleGuard from "@/components/RoleGuard";
import { useRole } from "@/hook/useRole";

const CustomerDataPage = () => {
  const { canAccessCustomerData } = useRole();

  return (
    <>
      <RoleGuard requiredRole={["user", "manager", "admin", "super_admin"]}>
        <MasterLayout>
          {/* Breadcrumb */}
          <Breadcrumb title='Customer Data' />
          <CustomerLayer />
        </MasterLayout>
      </RoleGuard>
    </>
  );
};

export default CustomerDataPage;
