"use client";
import MasterLayout from "../../../masterLayout/MasterLayout";
import SidebarPermissionGuard from "../../../components/SidebarPermissionGuard";
import VendorMasterLayer from "../../../components/VendorMasterLayer";

const VendorMasterPage = () => {
  return (
    <>
      <SidebarPermissionGuard requiredSidebar="masters">
        {/* MasterLayout */}
        <MasterLayout>
          {/* VendorMasterLayer */}
          <VendorMasterLayer />
        </MasterLayout>
      </SidebarPermissionGuard>
    </>
  );
};

export default VendorMasterPage;
