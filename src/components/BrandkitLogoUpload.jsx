"use client";
import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import * as brandkitApi from "@/services/contentGenerationApi";
import { getLogos } from "@/utils/logoUtils";

const BrandkitLogoUpload = ({ isOpen, onClose, brandkit, onSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [isRemoving, setIsRemoving] = useState(null);
  const [currentLogos, setCurrentLogos] = useState([]);

  // Update logos when brandkit changes
  useEffect(() => {
    if (brandkit) {
      const logos = getLogos(brandkit);
      setCurrentLogos(logos);
    }
  }, [brandkit]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Please select a valid image file (PNG, JPG, GIF, or WEBP)");
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setUploadError("File size must be less than 5MB");
      return;
    }

    setUploadError(null);
    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !brandkit) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const response = await brandkitApi.uploadBrandkitLogo(
        brandkit.brand_id,
        selectedFile
      );
      
      // Update logos from response
      if (response.brandkit) {
        const logos = getLogos(response.brandkit);
        setCurrentLogos(logos);
      }
      
      if (onSuccess) {
        onSuccess(response);
      }
      
      // Reset form
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error("Error uploading logo:", error);
      setUploadError(
        error.response?.data?.detail || error.message || "Failed to upload logo"
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = async (logoPath) => {
    if (!brandkit || !logoPath) return;

    setIsRemoving(logoPath);
    setUploadError(null);

    try {
      const response = await brandkitApi.removeBrandkitLogo(
        brandkit.brand_id,
        logoPath
      );
      
      // Update logos from response
      if (response.brandkit) {
        const logos = getLogos(response.brandkit);
        setCurrentLogos(logos);
      }
      
      if (onSuccess) {
        onSuccess(response);
      }
    } catch (error) {
      console.error("Error removing logo:", error);
      setUploadError(
        error.response?.data?.detail || error.message || "Failed to remove logo"
      );
    } finally {
      setIsRemoving(null);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadError(null);
      onClose();
    }
  };

  if (!isOpen || !brandkit) return null;

  const maxLogos = 20;
  const canUploadMore = currentLogos.length < maxLogos;

  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={handleClose}
    >
      <div
        className="modal-dialog modal-dialog-centered modal-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              Manage Logos for {brandkit.brand_name}
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={handleClose}
              disabled={isUploading || isRemoving}
            />
          </div>
          <div className="modal-body">
            {/* Logo Count */}
            <div className="mb-3">
              <label className="form-label fw-semibold">
                Brand Logos ({currentLogos.length}/{maxLogos})
              </label>
            </div>

            {/* Current Logos Grid */}
            {currentLogos.length > 0 && !previewUrl && (
              <div className="mb-4">
                <div
                  className="logo-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                    gap: "1rem",
                    marginTop: "1rem",
                  }}
                >
                  {currentLogos.map((logoUrl, index) => {
                    // Get the original logo path for removal
                    const logoPath = brandkit.logo_paths?.[index] || 
                                   brandkit.logo_urls?.[index] || 
                                   brandkit.logo_path || 
                                   brandkit.logo_url || 
                                   logoUrl;
                    
                    return (
                      <div
                        key={index}
                        className="logo-item"
                        style={{
                          position: "relative",
                          border: "1px solid #ddd",
                          borderRadius: "8px",
                          padding: "0.5rem",
                          backgroundColor: "#f8f9fa",
                        }}
                      >
                        <img
                          src={logoUrl}
                          alt={`Logo ${index + 1}`}
                          style={{
                            width: "100%",
                            height: "auto",
                            borderRadius: "4px",
                            maxHeight: "120px",
                            objectFit: "contain",
                          }}
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.parentElement.innerHTML = `
                              <div class="text-muted text-center" style="padding: 1rem;">
                                <i>Logo not found</i>
                              </div>
                            `;
                          }}
                        />
                        <div
                          className="logo-actions"
                          style={{
                            marginTop: "0.5rem",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.25rem",
                          }}
                        >
                          <span
                            className="logo-type"
                            style={{
                              fontSize: "0.75rem",
                              color: "#6c757d",
                              textAlign: "center",
                            }}
                          >
                            {index === 0 ? "Primary" : `Logo ${index + 1}`}
                          </span>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleRemoveLogo(logoPath)}
                            disabled={isRemoving === logoPath || isUploading}
                            style={{ width: "100%" }}
                          >
                            {isRemoving === logoPath ? (
                              <span className="spinner-border spinner-border-sm" />
                            ) : (
                              <>
                                <Icon icon="solar:trash-bin-2-bold" width="14" height="14" className="me-1" />
                                Remove
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* No Logos Message */}
            {currentLogos.length === 0 && !previewUrl && (
              <div className="mb-4 text-center text-muted" style={{ padding: "2rem" }}>
                <Icon icon="solar:gallery-bold" width="48" height="48" className="mb-2" />
                <p>No logos uploaded</p>
              </div>
            )}

            {/* File Upload */}
            <div className="mb-3">
              <label className="form-label fw-semibold">
                {currentLogos.length > 0 ? "Upload Additional Logo" : "Upload Logo"}
              </label>
              <div
                className="border border-dashed rounded p-4 text-center"
                style={{
                  cursor: canUploadMore ? "pointer" : "not-allowed",
                  backgroundColor: canUploadMore ? "#f8f9fa" : "#e9ecef",
                  opacity: canUploadMore ? 1 : 0.6,
                }}
              >
                <input
                  type="file"
                  id="logo-upload"
                  className="d-none"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
                  onChange={handleFileSelect}
                  disabled={isUploading || !canUploadMore}
                />
                <label
                  htmlFor="logo-upload"
                  style={{
                    cursor: canUploadMore ? "pointer" : "not-allowed",
                    width: "100%",
                    pointerEvents: canUploadMore ? "auto" : "none",
                  }}
                >
                  <Icon
                    icon="solar:gallery-bold"
                    width="48"
                    height="48"
                    className="text-muted mb-3"
                  />
                  <p className="mb-1">
                    <strong>Choose a file</strong> or drag it here
                  </p>
                  <small className="text-muted">
                    PNG, JPG, GIF, WEBP, or SVG • Max 5MB
                  </small>
                </label>
              </div>
              {!canUploadMore && (
                <p className="text-warning mt-2 mb-0" style={{ fontSize: "0.875rem" }}>
                  Maximum of {maxLogos} logos reached
                </p>
              )}
            </div>

            {/* Preview */}
            {previewUrl && (
              <div className="mb-3">
                <label className="form-label fw-semibold">Preview</label>
                <div
                  className="border rounded p-3 d-flex justify-content-center align-items-center position-relative"
                  style={{ minHeight: "200px", backgroundColor: "#f8f9fa" }}
                >
                  <img
                    src={previewUrl}
                    alt="Preview"
                    style={{ maxWidth: "100%", maxHeight: "200px", objectFit: "contain" }}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-danger position-absolute top-0 end-0 m-2"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                      setUploadError(null);
                    }}
                    disabled={isUploading}
                  >
                    <Icon icon="solar:trash-bin-2-bold" width="14" height="14" />
                  </button>
                </div>
                {selectedFile && (
                  <small className="text-muted d-block mt-2">
                    {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                  </small>
                )}
              </div>
            )}

            {/* Error Message */}
            {uploadError && (
              <div className="alert alert-danger d-flex align-items-center gap-2">
                <Icon icon="solar:danger-circle-bold" width="20" height="20" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Info */}
            <div className="alert alert-info d-flex align-items-start gap-2">
              <Icon icon="solar:info-circle-bold" width="20" height="20" />
              <div>
                <strong>Tip:</strong> Use a transparent PNG for best results. You can upload up to {maxLogos} logos.
                The first logo will be used as the primary logo in your brandkit and may appear in generated content.
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={!selectedFile || isUploading || !canUploadMore}
            >
              {isUploading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                  />
                  Uploading...
                </>
              ) : (
                <>
                  <Icon
                    icon="solar:upload-bold"
                    width="16"
                    height="16"
                    className="me-2"
                  />
                  Upload Logo
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandkitLogoUpload;

