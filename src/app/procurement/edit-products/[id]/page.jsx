'use client';
import Breadcrumb from "@/components/Breadcrumb";
import ProductForm from "@/components/ProductForm";
import SidebarPermissionGuard from "@/components/SidebarPermissionGuard";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense } from "react";

// Dynamic route for editing products
function EditProductContent() {
  const params = useParams();
  const id = params?.id;

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
}

export default function EditProductPage() {
  return (
    <Suspense fallback={
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    }>
      <EditProductContent />
    </Suspense>
  );
}

