import ProductForm from "@/components/ProductForm";
import SidebarPermissionGuard from "@/components/SidebarPermissionGuard";
import Link from "next/link";

export const metadata = {
  title: "Add Product - Procurement",
  description: "Add new product to procurement system",
};

const AddProductPage = () => {
  return (
    <SidebarPermissionGuard requiredSidebar="procurement">
      {/* Form with Back button now inside */}
      <ProductForm mode="add" />
    </SidebarPermissionGuard>
  );
};

export default AddProductPage;
