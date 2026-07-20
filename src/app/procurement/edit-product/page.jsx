"use client";

import Breadcrumb from "@/components/Breadcrumb";
import ProductForm from "@/components/ProductForm";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const EditProductContent = () => {
  const searchParams = useSearchParams();
  const [productId, setProductId] = useState(null);

  useEffect(() => {
    const id = searchParams.get("id");
    setProductId(id);
  }, [searchParams]);

  if (!productId) {
    return (
      <>
        <Breadcrumb title="Procurement / Edit Product" />
        <div className="alert alert-warning p-2 d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center">
            <i className="icon-alert-triangle me-2"></i>
            <div>
              <strong>Product ID Required</strong>
              <span className="ms-2 text-muted">
                Please select a product to edit from the procurement list.
              </span>
            </div>
          </div>
          <Link href="/procurement" className="btn btn-primary btn-sm">
            <i className="icon-arrow-left me-1"></i>
            Back to Procurement
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Breadcrumb title="Procurement / Edit Product" />
      <ProductForm mode="edit" productId={productId} />
    </>
  );
};

export default function EditProductPage() {
  return (
    <Suspense
      fallback={
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ minHeight: "400px" }}
        >
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      }
    >
      <EditProductContent />
    </Suspense>
  );
}
