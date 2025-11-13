"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import MasterLayout from "@/masterLayout/MasterLayout";
import Breadcrumb from "@/components/Breadcrumb";
import purchaseRequestApi from "@/services/purchaseRequestApi";

const FALLBACK_URL =
  process.env.NEXT_PUBLIC_QR_FALLBACK_URL ||
  "https://www.tiltingheads.com/collections/all-products";

const formatDate = (value) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return value;
  }
};

const MetadataRow = ({ label, value }) => (
  <div className="d-flex flex-column flex-md-row py-2 border-bottom">
    <div className="col-12 col-md-4 text-muted small">{label}</div>
    <div className="col-12 col-md-8 small text-break">{value ?? "-"}</div>
  </div>
);

const QrDetailPage = ({ params }) => {
  const router = useRouter();
  const { requestId, itemId, token } = params;

  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [qrDetail, setQrDetail] = useState(null);

  // Watch auth state: redirect to fallback if not signed in
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setIsAuthenticated(false);
        setAuthChecked(true);
        window.location.href = FALLBACK_URL;
        return;
      }
      setIsAuthenticated(true);
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  // Fetch QR detail once auth confirmed
  useEffect(() => {
    if (!isAuthenticated || !authChecked) return;

    const fetchDetail = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await purchaseRequestApi.getQrDetail(
          requestId,
          itemId,
          token
        );
        const payload = response?.data || response;
        if (!payload) {
          throw new Error("QR detail not found");
        }
        setQrDetail(payload);
      } catch (err) {
        console.error("Failed to load QR detail", err);
        setError(err.message || "Failed to load QR detail");
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [authChecked, isAuthenticated, itemId, requestId, token]);

  const metadata = useMemo(() => {
    if (!qrDetail?.metadata) return null;
    const meta = qrDetail.metadata;
    return {
      request: meta.request || {},
      item: meta.item || {},
      quality_check: meta.quality_check || {},
    };
  }, [qrDetail]);

  const content = () => {
    if (!authChecked || loading) {
      return (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      );
    }

    if (!metadata) {
      return (
        <div className="text-muted">
          No metadata available for this QR code. Try regenerating the QR from
          Receiving Management.
        </div>
      );
    }

    return (
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">QR Code Detail</h5>
          <div className="small text-muted">
            Request #{requestId} · Item #{itemId}
          </div>
        </div>
        <div className="card-body">
          <h6 className="mb-2">Product</h6>
          <MetadataRow
            label="Product Name"
            value={metadata.item.product_name}
          />
          <MetadataRow
            label="Variant"
            value={metadata.item.variant_display_name}
          />
          <MetadataRow label="SKU" value={metadata.item.sku} />
          <MetadataRow label="HSN" value={metadata.item.hsn_code} />

          <h6 className="mt-4 mb-2">Purchase Request</h6>
          <MetadataRow label="Vendor" value={metadata.request.vendor_name} />
          <MetadataRow
            label="Purchase Order"
            value={metadata.request.purchase_order_number || "-"}
          />
          <MetadataRow
            label="Order Date"
            value={formatDate(metadata.request.order_date)}
          />
          <MetadataRow
            label="Delivery Date"
            value={formatDate(metadata.request.delivery_date)}
          />

          <h6 className="mt-4 mb-2">Quality Check</h6>
          <MetadataRow
            label="Invoice Quantity"
            value={metadata.quality_check.invoice_quantity}
          />
          <MetadataRow
            label="Actual Quantity"
            value={metadata.quality_check.actual_quantity}
          />
          <MetadataRow
            label="Sorted Quantity"
            value={metadata.quality_check.sorted_quantity}
          />
          <MetadataRow
            label="Damaged Quantity"
            value={metadata.quality_check.damage_quantity}
          />
          <MetadataRow
            label="Inspection Date"
            value={formatDate(metadata.quality_check.inspection_date)}
          />
          <MetadataRow
            label="Quality Checker"
            value={metadata.quality_check.quality_checker_name}
          />
          <MetadataRow label="Notes" value={metadata.quality_check.notes} />
        </div>
      </div>
    );
  };

  return (
    <MasterLayout>
      <Breadcrumb title="QR Detail" />
      <div className="container-fluid py-4">
        <div className="col-12 col-lg-8 mx-auto">{content()}</div>
      </div>
    </MasterLayout>
  );
};

export default QrDetailPage;
