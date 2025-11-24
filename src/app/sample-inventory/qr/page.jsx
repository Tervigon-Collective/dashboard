"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const FALLBACK_URL =
  process.env.NEXT_PUBLIC_QR_FALLBACK_URL || "https://www.tiltingheads.com/";

const SampleQrRedirectPage = () => {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    const procurementVariantId = searchParams.get("procurementVariantId");
    const masterVariantId = searchParams.get("masterVariantId");
    const token = searchParams.get("token");

    if (!procurementVariantId || !masterVariantId || !token) {
      setStatus("invalid");
      return;
    }

    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // Guest scan (no dashboard session) → send to Tilting Heads
        window.location.href = FALLBACK_URL;
        return;
      }

      // Authenticated dashboard user scan → land in Stock Management, Sample Products tab
      const redirectParams = new URLSearchParams({
        fromQr: "1",
        procurementVariantId: procurementVariantId,
        masterVariantId: masterVariantId,
        token: token,
      });

      const targetUrl = `/stock-management?${redirectParams.toString()}`;
      window.location.href = targetUrl;
    });

    setStatus("redirecting");

    return () => unsubscribe();
  }, [searchParams]);

  if (status === "invalid") {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-center">
          <p className="text-danger mb-0">Invalid QR code.</p>
        </div>
      </div>
    );
  }

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
