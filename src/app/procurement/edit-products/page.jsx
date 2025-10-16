'use client';
import Breadcrumb from "@/components/Breadcrumb";
import ProductForm from "@/components/ProductForm";
import SidebarPermissionGuard from "@/components/SidebarPermissionGuard";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

// Edit product page using query parameters (compatible with static export)
function EditProductContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  if (!id) {
    return (
      <SidebarPermissionGuard requiredSidebar="procurement">
        <Breadcrumb title="Procurement / Edit Product" />
        <div className="alert alert-warning p-2 d-flex align-items-center justify-content-between" role="alert">
          <div className="d-flex align-items-center">
            <i className="icon-alert-triangle me-2"></i>
            <div>
              <strong>Invalid Product ID</strong>
              <span className="ms-2 text-muted">No product ID provided. Please select a product from the procurement page.</span>
            </div>
          </div>
          <Link href="/procurement" className="btn btn-primary btn-sm">
            Go to Procurement
          </Link>
        </div>
      </SidebarPermissionGuard>
    );
  }

  return (
    <SidebarPermissionGuard requiredSidebar="procurement">
      {/* Header with Breadcrumb and Back Button in one line */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Breadcrumb title="Procurement / Edit Product" />
        <Link href="/procurement" className="btn btn-outline-secondary btn-sm">
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

