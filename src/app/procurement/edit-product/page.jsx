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
        <div className="alert alert-warning">
          <h4>Product ID Required</h4>
          <p>Please select a product to edit from the procurement list.</p>
          <Link href="/procurement" className="btn btn-primary">
            <i className="icon-arrow-left me-2"></i>
            Back to Procurement
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Breadcrumb title="Procurement / Edit Product" />

      {/* Back Button */}
      <div className="mb-3 d-flex justify-content-end">
        <Link href="/procurement" className="btn btn-outline-secondary">
          <i className="icon-arrow-left me-2"></i>
          Back to Procurement
        </Link>
      </div>

      <ProductForm mode="edit" productId={productId} />
    </>
  );
}
