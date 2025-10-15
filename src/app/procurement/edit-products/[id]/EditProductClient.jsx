'use client';
import Breadcrumb from "@/components/Breadcrumb";
import ProductForm from "@/components/ProductForm";
import SidebarPermissionGuard from "@/components/SidebarPermissionGuard";
import Link from "next/link";

export default function EditProductClient({ productId }) {
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

      <ProductForm mode="edit" productId={productId} />
    </SidebarPermissionGuard>
  );
}

