"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SidebarPermissionGuard from "@/components/SidebarPermissionGuard";
import MasterLayout from "@/masterLayout/MasterLayout";
import Breadcrumb from "@/components/Breadcrumb";
import purchaseRequestApi from "@/services/purchaseRequestApi";

const QR_REDIRECT_URL = "https://www.tiltingheads.com/";

const extractParams = (slugSegments, searchParams) => {
  if (slugSegments?.length >= 3) {
    const [requestId, itemId, token] = slugSegments;
    return { requestId, itemId, token };
  }

  if (searchParams) {
    const requestId = searchParams.requestId ?? "";
    const itemId = searchParams.itemId ?? "";
    const token = searchParams.token ?? "";

    if (requestId && itemId && token) {
      return { requestId, itemId, token };
    }
  }

  return { requestId: undefined, itemId: undefined, token: undefined };
};

const QrDetailPageClient = ({ params, searchParams }) => {
  const router = useRouter();

  const slug = useMemo(() => {
    if (!params) return [];

    if (Array.isArray(params.slug)) {
      return params.slug;
    }

    if (typeof params.slug === "string") {
      return [params.slug];
    }

    return [];
  }, [params]);

  const searchParamValues = useMemo(() => {
    if (!searchParams) {
      return null;
    }

    const entries = Object.entries(searchParams);

    if (entries.length === 0) {
      return null;
    }

    return entries.reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        acc[key] = value;
      }
      return acc;
    }, {});
  }, [searchParams]);

  const { requestId, itemId, token } = useMemo(
    () => extractParams(slug, searchParamValues),
    [slug, searchParamValues]
  );

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDetail = async () => {
      if (!requestId || !itemId || !token) {
        setError("Invalid QR code parameters");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await purchaseRequestApi.getQrDetail(
          requestId,
          itemId,
          token
        );

        if (response.success) {
          setDetail(response.data);
        } else {
          setError(response.message || "Failed to load QR detail");
        }
      } catch (err) {
        console.error("Error loading QR detail:", err);
        const message = err.message || "Failed to load QR detail";

        if (message.toLowerCase().includes("auth")) {
          window.location.href = QR_REDIRECT_URL;
          return;
        }

        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [requestId, itemId, token]);

  const metadata = detail?.metadata || {};
  const requestInfo = metadata.request || {};
  const itemInfo = metadata.item || {};
  const qcInfo = metadata.quality_check || {};

  return (
    <SidebarPermissionGuard requiredSidebar="receivingManagement">
      <MasterLayout>
        <Breadcrumb title="Receiving / QR Detail" />
        <div className="container-fluid py-4">
          {loading ? (
            <div className="d-flex justify-content-center align-items-center py-5">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : error ? (
            <div className="alert alert-danger" role="alert">
              <div className="d-flex justify-content-between align-items-center">
                <span>{error}</span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-light"
                  onClick={() => router.back()}
                >
                  Go Back
                </button>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="mb-0">QR Code Details</h5>
                  <div className="text-muted" style={{ fontSize: "0.875rem" }}>
                    Generated on{" "}
                    {detail?.generated_at
                      ? new Date(detail.generated_at).toLocaleString()
                      : "-"}
                  </div>
                </div>

                <div className="row g-4">
                  <div className="col-12 col-lg-6">
                    <div className="border rounded p-3 h-100">
                      <h6 className="text-muted mb-3">Vendor Information</h6>
                      <div className="mb-2">
                        <strong>Vendor:</strong>{" "}
                        {requestInfo.vendor_name || "-"}
                      </div>
                      <div className="mb-2">
                        <strong>Phone:</strong>{" "}
                        {requestInfo.vendor_phone_no || "-"}
                      </div>
                      <div className="mb-2">
                        <strong>GST:</strong>{" "}
                        {requestInfo.vendor_gst_number || "-"}
                      </div>
                      <div className="mb-2">
                        <strong>Address:</strong>{" "}
                        {requestInfo.vendor_address || "-"}
                      </div>
                    </div>
                  </div>
                  <div className="col-12 col-lg-6">
                    <div className="border rounded p-3 h-100">
                      <h6 className="text-muted mb-3">Delivery Information</h6>
                      <div className="mb-2">
                        <strong>Order Date:</strong>{" "}
                        {requestInfo.order_date
                          ? new Date(
                              requestInfo.order_date
                            ).toLocaleDateString()
                          : "-"}
                      </div>
                      <div className="mb-2">
                        <strong>Delivery Date:</strong>{" "}
                        {requestInfo.delivery_date
                          ? new Date(
                              requestInfo.delivery_date
                            ).toLocaleDateString()
                          : "-"}
                      </div>
                      <div className="mb-2">
                        <strong>Purchase Order #:</strong>{" "}
                        {requestInfo.purchase_order_number || "-"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="table-responsive mt-4">
                  <table className="table table-bordered">
                    <thead className="table-light">
                      <tr>
                        <th>Product Name</th>
                        <th>Variant</th>
                        <th>SKU</th>
                        <th>HSN</th>
                        <th>Quantity</th>
                        <th>Rate</th>
                        <th>Taxable Amt</th>
                        <th>IGST %</th>
                        <th>SGST %</th>
                        <th>CGST %</th>
                        <th>GST Amt</th>
                        <th>Net Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{itemInfo.product_name || "-"}</td>
                        <td>{itemInfo.variant_display_name || "-"}</td>
                        <td>{itemInfo.sku || "-"}</td>
                        <td>{itemInfo.hsn_code || "-"}</td>
                        <td>{itemInfo.quantity ?? "-"}</td>
                        <td>
                          {itemInfo.rate !== undefined
                            ? `₹${parseFloat(itemInfo.rate).toFixed(2)}`
                            : "-"}
                        </td>
                        <td>
                          {itemInfo.taxable_amt !== undefined
                            ? `₹${parseFloat(itemInfo.taxable_amt).toFixed(2)}`
                            : "-"}
                        </td>
                        <td>
                          {itemInfo.igst_percent !== undefined
                            ? `${parseFloat(itemInfo.igst_percent).toFixed(2)}%`
                            : "-"}
                        </td>
                        <td>
                          {itemInfo.sgst_percent !== undefined
                            ? `${parseFloat(itemInfo.sgst_percent).toFixed(2)}%`
                            : "-"}
                        </td>
                        <td>
                          {itemInfo.cgst_percent !== undefined
                            ? `${parseFloat(itemInfo.cgst_percent).toFixed(2)}%`
                            : "-"}
                        </td>
                        <td>
                          {itemInfo.gst_amt !== undefined
                            ? `₹${parseFloat(itemInfo.gst_amt).toFixed(2)}`
                            : "-"}
                        </td>
                        <td>
                          {itemInfo.net_amount !== undefined
                            ? `₹${parseFloat(itemInfo.net_amount).toFixed(2)}`
                            : "-"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="border rounded p-3 mt-4">
                  <h6 className="text-muted mb-3">
                    Quality Inspection Results
                  </h6>
                  <div className="row g-3">
                    <div className="col-6 col-md-3">
                      <strong>Invoice Qty:</strong>{" "}
                      {qcInfo.invoice_quantity ?? "-"}
                    </div>
                    <div className="col-6 col-md-3">
                      <strong>Actual Qty:</strong>{" "}
                      {qcInfo.actual_quantity ?? "-"}
                    </div>
                    <div className="col-6 col-md-3">
                      <strong>Sorted Qty:</strong>{" "}
                      {qcInfo.sorted_quantity ?? "-"}
                    </div>
                    <div className="col-6 col-md-3">
                      <strong>Damage Qty:</strong>{" "}
                      {qcInfo.damage_quantity ?? "-"}
                    </div>
                    <div className="col-6 col-md-3">
                      <strong>Shortfall:</strong>{" "}
                      {qcInfo.shortfall_quantity ?? "-"}
                    </div>
                    <div className="col-6 col-md-3">
                      <strong>Extra:</strong> {qcInfo.extra_quantity ?? "-"}
                    </div>
                    <div className="col-12 col-md-4">
                      <strong>Checker:</strong>{" "}
                      {qcInfo.quality_checker_name || "-"}
                    </div>
                    <div className="col-12 col-md-4">
                      <strong>Inspection Date:</strong>{" "}
                      {qcInfo.inspection_date
                        ? new Date(qcInfo.inspection_date).toLocaleDateString()
                        : "-"}
                    </div>
                    <div className="col-12">
                      <strong>Notes:</strong>
                      <div>{qcInfo.notes || "-"}</div>
                    </div>
                  </div>
                </div>

                {metadata.qr_url && (
                  <div className="mt-4">
                    <a
                      href={metadata.qr_url}
                      className="btn btn-outline-secondary"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open QR URL
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </MasterLayout>
    </SidebarPermissionGuard>
  );
};

export default QrDetailPageClient;
