"use client";
import MasterLayout from "../../../masterLayout/MasterLayout";
import SidebarPermissionGuard from "../../../components/SidebarPermissionGuard";
import ProductMasterLayer from "../../../components/ProductMasterLayer";

const ProductMasterPage = () => {
  return (
    <>
      <SidebarPermissionGuard requiredSidebar="masters">
        {/* MasterLayout */}
        <MasterLayout>
          {/* ProductMasterLayer */}
          <ProductMasterLayer />
        </MasterLayout>
      </SidebarPermissionGuard>
    </>
  );
};

export default ProductMasterPage;
