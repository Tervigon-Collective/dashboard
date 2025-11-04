"use client";
import Breadcrumb from "../../../components/Breadcrumb";
import MasterLayout from "../../../masterLayout/MasterLayout";
import SidebarPermissionGuard from "../../../components/SidebarPermissionGuard";
import VendorMasterLayer from "../../../components/VendorMasterLayer";

const VendorMasterPage = () => {
  return (
    <>
      <SidebarPermissionGuard requiredSidebar="masters">
        {/* MasterLayout */}
        <MasterLayout>
          {/* Breadcrumb */}
          <Breadcrumb title="Components / Manage Masters / Vendor Master" />

          {/* VendorMasterLayer */}
          <VendorMasterLayer />
        </MasterLayout>
      </SidebarPermissionGuard>
    </>
  );
};

export default VendorMasterPage;
