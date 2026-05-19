"use client";

import { useEffect } from "react";

/** V3: Order Management / scan-to-dispatch removed — use Stock Management + Shopify sync. */
export default function OrderManagementPage() {
  useEffect(() => {
    window.location.replace("/stock-management");
  }, []);

  return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="text-center">
        <div className="spinner-border mb-3" role="status">
          <span className="visually-hidden">Redirecting...</span>
        </div>
        <p className="text-muted mb-0">Redirecting to Stock Management…</p>
      </div>
    </div>
  );
}
