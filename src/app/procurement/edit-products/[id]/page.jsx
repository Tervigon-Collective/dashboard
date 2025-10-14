import Breadcrumb from "@/components/Breadcrumb";
import ProductForm from "@/components/ProductForm";
import SidebarPermissionGuard from "@/components/SidebarPermissionGuard";
import Link from "next/link";

export const metadata = {
  title: "Edit Product - Procurement",
  description: "Edit product in procurement system",
};

// Generate static params for static export
// Returns empty array since products are loaded dynamically from API
export async function generateStaticParams() {
  return [];
}

// Dynamic route for editing products
const EditProductPage = async ({ params }) => {
  const { id } = await params;

  return (
    <SidebarPermissionGuard requiredSidebar="procurement">
      <Breadcrumb title="Procurement / Edit Product" />

      {/* Back Button */}
      <div className="mb-3 d-flex justify-content-end">
        <Link href="/procurement" className="btn btn-outline-secondary">
          <i className="icon-arrow-left me-2"></i>
          Back to Procurement
        </Link>
      </div>

      <ProductForm mode="edit" productId={id} />
    </SidebarPermissionGuard>
  );
};

export default EditProductPage;
