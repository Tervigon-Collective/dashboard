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
        <div className="alert alert-warning" role="alert">
          <h4 className="alert-heading">Invalid Product ID</h4>
          <p>No product ID provided. Please select a product from the procurement page.</p>
          <hr />
          <Link href="/procurement" className="btn btn-primary">
            Go to Procurement
          </Link>
        </div>
      </SidebarPermissionGuard>
    );
  }

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

