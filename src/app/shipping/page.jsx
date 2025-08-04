"use client";
import MasterLayout from "@/masterLayout/MasterLayout";
import { Breadcrumb } from "react-bootstrap";
import ShippingDashboard from "@/components/ShippingDashboard";
import RoleGuard from "@/components/RoleGuard";
import { useRole } from "@/hook/useRole";

const ShippingPage = () => {
  const { canAccessCustomerData } = useRole();

  return (
    <>
      <RoleGuard requiredRole={["user", "manager", "admin", "super_admin"]}>
        <MasterLayout>
          {/* Breadcrumb */}
          <Breadcrumb title='Shipping Management' />
          <ShippingDashboard />
        </MasterLayout>
      </RoleGuard>
    </>
  );
};

export default ShippingPage; 