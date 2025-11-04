"use client";
import Breadcrumb from "../../../components/Breadcrumb";
import MasterLayout from "../../../masterLayout/MasterLayout";
import SidebarPermissionGuard from "../../../components/SidebarPermissionGuard";
import ProductMasterLayer from "../../../components/ProductMasterLayer";

const ProductMasterPage = () => {
  return (
    <>
      <SidebarPermissionGuard requiredSidebar="masters">
        {/* MasterLayout */}
        <MasterLayout>
          {/* Breadcrumb */}
          <Breadcrumb title="Components / Manage Masters / Product Master" />

          {/* ProductMasterLayer */}
          <ProductMasterLayer />
        </MasterLayout>
      </SidebarPermissionGuard>
    </>
  );
};

export default ProductMasterPage;
