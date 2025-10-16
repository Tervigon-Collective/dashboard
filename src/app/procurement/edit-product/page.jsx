"use client";

import Breadcrumb from "@/components/Breadcrumb";
import ProductForm from "@/components/ProductForm";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function EditProductPage() {
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
              <span className="ms-2 text-muted">Please select a product to edit from the procurement list.</span>
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
      {/* Header with Breadcrumb and Back Button in one line */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Breadcrumb title="Procurement / Edit Product" />
        <Link href="/procurement" className="btn btn-outline-secondary btn-sm">
          <i className="icon-arrow-left me-2"></i>
          Back to Procurement
        </Link>
      </div>

      <ProductForm mode="edit" productId={productId} />
    </>
  );
}
