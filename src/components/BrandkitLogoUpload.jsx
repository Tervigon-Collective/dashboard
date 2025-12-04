"use client";
import { useState } from "react";
import { Icon } from "@iconify/react";
import * as brandkitApi from "@/services/contentGenerationApi";
import { normalizeLogoUrl } from "@/utils/logoUtils";

const BrandkitLogoUpload = ({ isOpen, onClose, brandkit, onSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

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
      
      if (onSuccess) {
        onSuccess(response);
      }
      
      // Reset form
      setSelectedFile(null);
      setPreviewUrl(null);
      onClose();
    } catch (error) {
      console.error("Error uploading logo:", error);
      setUploadError(
        error.response?.data?.detail || error.message || "Failed to upload logo"
      );
    } finally {
      setIsUploading(false);
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

  // Get current logo URL using normalization helper (prefers logo_url, falls back to logo_path)
  const currentLogoUrl = normalizeLogoUrl(brandkit);

  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={handleClose}
    >
      <div
        className="modal-dialog modal-dialog-centered"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Upload Logo for {brandkit.brand_name}</h5>
            <button
              type="button"
              className="btn-close"
              onClick={handleClose}
              disabled={isUploading}
            />
          </div>
          <div className="modal-body">
            {/* Current Logo */}
            {currentLogoUrl && !previewUrl && (
              <div className="mb-4">
                <label className="form-label fw-semibold">Current Logo</label>
                <div
                  className="border rounded p-3 d-flex justify-content-center align-items-center"
                  style={{ minHeight: "200px", backgroundColor: "#f8f9fa" }}
                >
                  <img
                    src={currentLogoUrl}
                    alt={`${brandkit.brand_name} logo`}
                    style={{ maxWidth: "100%", maxHeight: "200px", objectFit: "contain" }}
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.parentElement.innerHTML = `
                        <div class="text-muted">
                          <i class="text-center">Logo file not found</i>
                        </div>
                      `;
                    }}
                  />
                </div>
              </div>
            )}

            {/* File Upload */}
            <div className="mb-3">
              <label className="form-label fw-semibold">
                {currentLogoUrl ? "Upload New Logo" : "Upload Logo"}
              </label>
              <div
                className="border border-dashed rounded p-4 text-center"
                style={{ cursor: "pointer", backgroundColor: "#f8f9fa" }}
              >
                <input
                  type="file"
                  id="logo-upload"
                  className="d-none"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                />
                <label
                  htmlFor="logo-upload"
                  style={{ cursor: "pointer", width: "100%" }}
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
                    PNG, JPG, GIF, or WEBP • Max 5MB
                  </small>
                </label>
              </div>
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
                <strong>Tip:</strong> Use a transparent PNG for best results. The logo
                will be used in your brandkit and may appear in generated content.
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
              disabled={!selectedFile || isUploading}
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

