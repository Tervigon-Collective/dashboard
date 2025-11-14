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
          <div className="modal-header">
            <h5 className="modal-title">Manage Brandkits</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            {brandkits.length === 0 ? (
              <div className="text-center p-5">
                <Icon
                  icon="solar:palette-bold"
                  width="64"
                  height="64"
                  className="text-muted mb-3"
                />
                <h5 className="text-muted">No Brandkits Yet</h5>
                <p className="text-muted">
                  Create your first brandkit to get started
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Brand</th>
                      <th>Status</th>
                      <th>Tagline</th>
                      <th>Last Updated</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {brandkits.map((brandkit) => {
                      const isActive = brandkit.brand_id === activeBrandkit?.brand_id;
                      const isProcessing =
                        isDeleting === brandkit.brand_id ||
                        isActivating === brandkit.brand_id;

                      return (
                        <tr key={brandkit.brand_id}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              {isActive && (
                                <Icon
                                  icon="solar:check-circle-bold"
                                  width="20"
                                  height="20"
                                  className="text-success"
                                />
                              )}
                              <div>
                                <div className="fw-semibold">
                                  {brandkit.brand_name}
                                </div>
                                <small className="text-muted">
                                  {brandkit.brand_id}
                                </small>
                              </div>
                            </div>
                          </td>
                          <td>
                            {isActive ? (
                              <span className="badge bg-success">Active</span>
                            ) : (
                              <span className="badge bg-secondary">Inactive</span>
                            )}
                          </td>
                          <td>
                            <div
                              className="text-truncate"
                              style={{ maxWidth: "200px" }}
                            >
                              {brandkit.tagline || (
                                <span className="text-muted">—</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <small>{formatDate(brandkit.updated_at)}</small>
                          </td>
                          <td>
                            <div className="d-flex gap-2">
                              {!isActive && (
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => handleActivate(brandkit.brand_id)}
                                  disabled={isProcessing}
                                  title="Set as active brandkit"
                                >
                                  {isActivating === brandkit.brand_id ? (
                                    <span
                                      className="spinner-border spinner-border-sm"
                                      role="status"
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
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => onEdit(brandkit)}
                                disabled={isProcessing}
                                title="Edit brandkit"
                              >
                                <Icon
                                  icon="solar:pen-bold"
                                  width="14"
                                  height="14"
                                />
                              </button>
                              <button
                                className="btn btn-sm btn-outline-info"
                                onClick={() => onUploadLogo(brandkit)}
                                disabled={isProcessing}
                                title="Upload logo"
                              >
                                <Icon
                                  icon="solar:gallery-bold"
                                  width="14"
                                  height="14"
                                />
                              </button>
                              <button
                                className={`btn btn-sm ${
                                  deleteConfirm === brandkit.brand_id
                                    ? "btn-danger"
                                    : "btn-outline-danger"
                                }`}
                                onClick={() => handleDelete(brandkit.brand_id)}
                                disabled={isActive || isProcessing}
                                title={
                                  isActive
                                    ? "Cannot delete active brandkit"
                                    : deleteConfirm === brandkit.brand_id
                                    ? "Click again to confirm"
                                    : "Delete brandkit"
                                }
                              >
                                {isDeleting === brandkit.brand_id ? (
                                  <span
                                    className="spinner-border spinner-border-sm"
                                    role="status"
                                  />
                                ) : deleteConfirm === brandkit.brand_id ? (
                                  <>
                                    <Icon
                                      icon="solar:danger-bold"
                                      width="14"
                                      height="14"
                                    />{" "}
                                    Confirm?
                                  </>
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
              <div className="alert alert-info mt-3">
                <div className="d-flex align-items-start gap-2">
                  <Icon icon="solar:info-circle-bold" width="20" height="20" />
                  <div>
                    <strong>Tips:</strong>
                    <ul className="mb-0 mt-2">
                      <li>
                        Only one brandkit can be active at a time. The active
                        brandkit is used for all content generation.
                      </li>
                      <li>
                        You cannot delete the active brandkit. Switch to another
                        brandkit first.
                      </li>
                      <li>
                        Use the logo upload to add brand logos after creating a
                        brandkit.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandkitManagementModal;

