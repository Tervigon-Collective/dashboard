"use client";
import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { useBrandkit } from "@/contexts/BrandkitContext";
import * as brandkitApi from "@/services/contentGenerationApi";

const BrandkitManagementModal = ({
  isOpen,
  onClose,
  onEdit,
  onUploadLogo,
}) => {
  const { brandkits, activeBrandkit, switchBrandkit, refresh } = useBrandkit();
  const [isDeleting, setIsDeleting] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isActivating, setIsActivating] = useState(null);

  const handleActivate = async (brandId) => {
    if (brandId === activeBrandkit?.brand_id) return;

    try {
      setIsActivating(brandId);
      await switchBrandkit(brandId);
    } catch (error) {
      alert("Failed to activate brandkit: " + error.message);
    } finally {
      setIsActivating(null);
    }
  };

  const handleDelete = async (brandId) => {
    if (deleteConfirm !== brandId) {
      setDeleteConfirm(brandId);
      return;
    }

    try {
      setIsDeleting(brandId);
      await brandkitApi.deleteBrandkit(brandId);
      await refresh();
      setDeleteConfirm(null);
    } catch (error) {
      alert(
        "Failed to delete brandkit: " +
          (error.response?.data?.detail || error.message)
      );
    } finally {
      setIsDeleting(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="modal-dialog modal-xl modal-dialog-scrollable"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
           <div className="modal-header" style={{ padding: "15px", borderBottom: "1px solid #e9ecef" }}>
             <h6 className="modal-title" style={{ fontSize: "0.875rem", fontWeight: "600", margin: 0 }}>
               Manage Brandkits
             </h6>
            <button 
              type="button" 
              className="btn-close btn-close-sm" 
              onClick={onClose}
              style={{ fontSize: "0.75rem" }}
            />
          </div>
          <div className="modal-body" style={{ padding: "15px", overflowX: "hidden" }}>
            {brandkits.length === 0 ? (
              <div className="text-center" style={{ padding: "40px 20px" }}>
                <Icon
                  icon="solar:palette-bold"
                  width="48"
                  height="48"
                  style={{ color: "#6c757d", marginBottom: "12px", opacity: 0.5 }}
                />
                <h5 style={{ fontSize: "0.9375rem", color: "#6c757d", marginBottom: "8px", fontWeight: "500" }}>
                  No Brandkits Yet
                </h5>
                <p style={{ fontSize: "0.8125rem", color: "#6c757d", margin: 0 }}>
                  Create your first brandkit to get started
                </p>
              </div>
            ) : (
              <div className="table-responsive" style={{ overflowX: "hidden" }}>
                <table className="table" style={{ marginBottom: 0, fontSize: "0.8125rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e9ecef" }}>
                      <th style={{ fontSize: "0.8125rem", fontWeight: "600", padding: "10px 12px", borderBottom: "1px solid #e9ecef" }}>
                        Brand
                      </th>
                      <th style={{ fontSize: "0.8125rem", fontWeight: "600", padding: "10px 12px", borderBottom: "1px solid #e9ecef" }}>
                        Status
                      </th>
                      <th style={{ fontSize: "0.8125rem", fontWeight: "600", padding: "10px 12px", borderBottom: "1px solid #e9ecef" }}>
                        Tagline
                      </th>
                      <th style={{ fontSize: "0.8125rem", fontWeight: "600", padding: "10px 12px", borderBottom: "1px solid #e9ecef" }}>
                        Last Updated
                      </th>
                      <th style={{ fontSize: "0.8125rem", fontWeight: "600", padding: "10px 12px", borderBottom: "1px solid #e9ecef" }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {brandkits.map((brandkit) => {
                      const isActive = brandkit.brand_id === activeBrandkit?.brand_id;
                      const isProcessing =
                        isDeleting === brandkit.brand_id ||
                        isActivating === brandkit.brand_id;

                      return (
                        <tr key={brandkit.brand_id} style={{ borderBottom: "1px solid #f1f3f5" }}>
                          <td style={{ padding: "12px" }}>
                            <div className="d-flex align-items-center gap-2">
                              {isActive && (
                                <Icon
                                  icon="solar:check-circle-bold"
                                  width="16"
                                  height="16"
                                  style={{ color: "#28a745", flexShrink: 0 }}
                                />
                              )}
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: "0.8125rem", fontWeight: "600", marginBottom: "2px" }}>
                                  {brandkit.brand_name}
                                </div>
                                <div style={{ fontSize: "0.6875rem", color: "#6c757d" }}>
                                  {brandkit.brand_id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "12px" }}>
                            {isActive ? (
                              <span 
                                style={{ 
                                  fontSize: "0.6875rem",
                                  padding: "3px 8px",
                                  borderRadius: "12px",
                                  backgroundColor: "#28a745",
                                  color: "#fff",
                                  fontWeight: "500"
                                }}
                              >
                                Active
                              </span>
                            ) : (
                              <span 
                                style={{ 
                                  fontSize: "0.6875rem",
                                  padding: "3px 8px",
                                  borderRadius: "12px",
                                  backgroundColor: "#6c757d",
                                  color: "#fff",
                                  fontWeight: "500"
                                }}
                              >
                                Inactive
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "12px" }}>
                            <div
                              style={{ 
                                maxWidth: "200px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                fontSize: "0.8125rem"
                              }}
                            >
                              {brandkit.tagline || (
                                <span style={{ color: "#6c757d" }}>—</span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "12px" }}>
                            <span style={{ fontSize: "0.75rem", color: "#495057" }}>
                              {formatDate(brandkit.updated_at)}
                            </span>
                          </td>
                          <td style={{ padding: "12px" }}>
                            <div className="d-flex gap-1" style={{ flexWrap: "wrap" }}>
                              {!isActive && (
                                <button
                                  onClick={() => handleActivate(brandkit.brand_id)}
                                  disabled={isProcessing}
                                  title="Set as active brandkit"
                                  style={{
                                    width: "32px",
                                    height: "32px",
                                    padding: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    border: "1px solid #0d6efd",
                                    backgroundColor: "#0d6efd",
                                    color: "#fff",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontSize: "0.75rem",
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isProcessing) {
                                      e.currentTarget.style.backgroundColor = "#0b5ed7";
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = "#0d6efd";
                                  }}
                                >
                                  {isActivating === brandkit.brand_id ? (
                                    <span
                                      className="spinner-border spinner-border-sm"
                                      role="status"
                                      style={{ width: "12px", height: "12px" }}
                                    />
                                  ) : (
                                    <Icon
                                      icon="solar:check-circle-bold"
                                      width="14"
                                      height="14"
                                    />
                                  )}
                                </button>
                              )}
                              <button
                                onClick={() => onEdit(brandkit)}
                                disabled={isProcessing}
                                title="Edit brandkit"
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  padding: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  border: "1px solid #0d6efd",
                                  backgroundColor: "transparent",
                                  color: "#0d6efd",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  fontSize: "0.75rem",
                                }}
                                onMouseEnter={(e) => {
                                  if (!isProcessing) {
                                    e.currentTarget.style.backgroundColor = "#0d6efd";
                                    e.currentTarget.style.color = "#fff";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = "transparent";
                                  e.currentTarget.style.color = "#0d6efd";
                                }}
                              >
                                <Icon
                                  icon="solar:pen-bold"
                                  width="14"
                                  height="14"
                                />
                              </button>
                              <button
                                onClick={() => onUploadLogo(brandkit)}
                                disabled={isProcessing}
                                title="Upload logo"
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  padding: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  border: "1px solid #0d6efd",
                                  backgroundColor: "transparent",
                                  color: "#0d6efd",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  fontSize: "0.75rem",
                                }}
                                onMouseEnter={(e) => {
                                  if (!isProcessing) {
                                    e.currentTarget.style.backgroundColor = "#0d6efd";
                                    e.currentTarget.style.color = "#fff";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = "transparent";
                                  e.currentTarget.style.color = "#0d6efd";
                                }}
                              >
                                <Icon
                                  icon="solar:gallery-bold"
                                  width="14"
                                  height="14"
                                />
                              </button>
                              <button
                                onClick={() => handleDelete(brandkit.brand_id)}
                                disabled={isActive || isProcessing}
                                title={
                                  isActive
                                    ? "Cannot delete active brandkit"
                                    : deleteConfirm === brandkit.brand_id
                                    ? "Click again to confirm"
                                    : "Delete brandkit"
                                }
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  padding: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  border: `1px solid ${deleteConfirm === brandkit.brand_id ? "#dc3545" : isActive ? "#6c757d" : "#dc3545"}`,
                                  backgroundColor: deleteConfirm === brandkit.brand_id ? "#dc3545" : "transparent",
                                  color: deleteConfirm === brandkit.brand_id ? "#fff" : isActive ? "#6c757d" : "#dc3545",
                                  borderRadius: "4px",
                                  cursor: isActive ? "not-allowed" : "pointer",
                                  fontSize: "0.75rem",
                                  opacity: isActive ? 0.5 : 1,
                                }}
                                onMouseEnter={(e) => {
                                  if (!isActive && !isProcessing) {
                                    e.currentTarget.style.backgroundColor = "#dc3545";
                                    e.currentTarget.style.color = "#fff";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isActive) {
                                    e.currentTarget.style.backgroundColor = deleteConfirm === brandkit.brand_id ? "#dc3545" : "transparent";
                                    e.currentTarget.style.color = deleteConfirm === brandkit.brand_id ? "#fff" : "#dc3545";
                                  }
                                }}
                              >
                                {isDeleting === brandkit.brand_id ? (
                                  <span
                                    className="spinner-border spinner-border-sm"
                                    role="status"
                                    style={{ width: "12px", height: "12px" }}
                                  />
                                ) : deleteConfirm === brandkit.brand_id ? (
                                  <Icon
                                    icon="solar:danger-bold"
                                    width="14"
                                    height="14"
                                  />
                                ) : (
                                  <Icon
                                    icon="solar:trash-bin-2-bold"
                                    width="14"
                                    height="14"
                                  />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {brandkits.length > 0 && (
              <div 
                style={{
                  marginTop: "16px",
                  padding: "12px 14px",
                  backgroundColor: "#cfe2ff",
                  borderRadius: "8px",
                  border: "1px solid #b6d4fe",
                }}
              >
                <div className="d-flex align-items-start gap-2">
                  <Icon 
                    icon="solar:info-circle-bold" 
                    width="16" 
                    height="16" 
                    style={{ color: "#084298", flexShrink: 0, marginTop: "2px" }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: "0.8125rem", color: "#084298", display: "block", marginBottom: "8px" }}>
                      Tips:
                    </strong>
                    <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "0.75rem", color: "#084298", lineHeight: "1.6" }}>
                      <li style={{ marginBottom: "4px" }}>
                        Only one brandkit can be active at a time. The active
                        brandkit is used for all content generation.
                      </li>
                      <li style={{ marginBottom: "4px" }}>
                        You cannot delete the active brandkit. Switch to another
                        brandkit first.
                      </li>
                      <li style={{ marginBottom: 0 }}>
                        Use the logo upload to add brand logos after creating a
                        brandkit.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer" style={{ padding: "12px 15px", borderTop: "1px solid #e9ecef" }}>
            <button 
              type="button" 
              onClick={onClose}
              style={{
                padding: "6px 16px",
                fontSize: "0.8125rem",
                backgroundColor: "#6c757d",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "500",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#5c636a";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#6c757d";
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandkitManagementModal;

