"use client";

import { useEffect } from "react";

/** V3: sample inventory QR codes removed; legacy scans redirect to storefront. */
const FALLBACK_URL =
  process.env.NEXT_PUBLIC_QR_FALLBACK_URL || "https://www.tiltingheads.com/";

const SampleQrRedirectPage = () => {
  useEffect(() => {
    window.location.href = FALLBACK_URL;
  }, []);

  return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="text-center">
        <div className="spinner-border mb-3" role="status">
          <span className="visually-hidden">Redirecting...</span>
        </div>
        <p className="text-muted mb-0">Redirecting…</p>
      </div>
    </div>
  );
};

export default SampleQrRedirectPage;
