"use client";
import { useState } from "react";
import { Icon } from "@iconify/react";

const BrandkitModeSelectionModal = ({ isOpen, onClose, onSelectMode }) => {
  const [selectedMode, setSelectedMode] = useState(null);

  if (!isOpen) return null;

  const handleContinue = () => {
    if (selectedMode) {
      onSelectMode(selectedMode);
      onClose();
    }
  };

  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="modal-dialog modal-dialog-centered"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header" style={{ padding: "20px", borderBottom: "1px solid #e9ecef" }}>
            <h5 className="modal-title" style={{ fontSize: "1.125rem", fontWeight: "600", margin: 0 }}>
              Create New Brandkit
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
            />
          </div>
          <div className="modal-body" style={{ padding: "24px" }}>
            <p style={{ fontSize: "0.875rem", color: "#6c757d", marginBottom: "24px" }}>
              Select how you would like to create your brandkit:
            </p>

            <div className="d-flex flex-column gap-3">
              {/* Mode 1: New Brand Creation */}
              <div
                onClick={() => setSelectedMode("new_brand")}
                style={{
                  padding: "20px",
                  border: `2px solid ${selectedMode === "new_brand" ? "#0d6efd" : "#dee2e6"}`,
                  borderRadius: "8px",
                  cursor: "pointer",
                  backgroundColor: selectedMode === "new_brand" ? "#f0f7ff" : "#fff",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (selectedMode !== "new_brand") {
                    e.currentTarget.style.borderColor = "#adb5bd";
                    e.currentTarget.style.backgroundColor = "#f8f9fa";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedMode !== "new_brand") {
                    e.currentTarget.style.borderColor = "#dee2e6";
                    e.currentTarget.style.backgroundColor = "#fff";
                  }
                }}
              >
                <div className="d-flex align-items-start gap-3">
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      border: `2px solid ${selectedMode === "new_brand" ? "#0d6efd" : "#dee2e6"}`,
                      backgroundColor: selectedMode === "new_brand" ? "#0d6efd" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: "2px",
                    }}
                  >
                    {selectedMode === "new_brand" && (
                      <Icon
                        icon="solar:check-circle-bold"
                        width="16"
                        height="16"
                        style={{ color: "#fff" }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h6 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "8px", color: "#212529" }}>
                      New Brand Creation
                    </h6>
                    <p style={{ fontSize: "0.875rem", color: "#6c757d", margin: 0 }}>
                      Create a brandkit from scratch with AI assistance. Start by selecting your brand type, then fill in the details.
                    </p>
                  </div>
                </div>
              </div>

              {/* Mode 2: Existing Brand Continuation */}
              <div
                onClick={() => setSelectedMode("existing_brand")}
                style={{
                  padding: "20px",
                  border: `2px solid ${selectedMode === "existing_brand" ? "#0d6efd" : "#dee2e6"}`,
                  borderRadius: "8px",
                  cursor: "pointer",
                  backgroundColor: selectedMode === "existing_brand" ? "#f0f7ff" : "#fff",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (selectedMode !== "existing_brand") {
                    e.currentTarget.style.borderColor = "#adb5bd";
                    e.currentTarget.style.backgroundColor = "#f8f9fa";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedMode !== "existing_brand") {
                    e.currentTarget.style.borderColor = "#dee2e6";
                    e.currentTarget.style.backgroundColor = "#fff";
                  }
                }}
              >
                <div className="d-flex align-items-start gap-3">
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      border: `2px solid ${selectedMode === "existing_brand" ? "#0d6efd" : "#dee2e6"}`,
                      backgroundColor: selectedMode === "existing_brand" ? "#0d6efd" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: "2px",
                    }}
                  >
                    {selectedMode === "existing_brand" && (
                      <Icon
                        icon="solar:check-circle-bold"
                        width="16"
                        height="16"
                        style={{ color: "#fff" }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h6 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "8px", color: "#212529" }}>
                      Existing Brand Continuation
                    </h6>
                    <p style={{ fontSize: "0.875rem", color: "#6c757d", margin: 0 }}>
                      Continue with an existing brand. Extract data from a website URL or connect to your database for ICP analysis.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer" style={{ padding: "16px 20px", borderTop: "1px solid #e9ecef" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 16px",
                fontSize: "0.875rem",
                backgroundColor: "#6c757d",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "500",
                marginRight: "8px",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleContinue}
              disabled={!selectedMode}
              style={{
                padding: "8px 16px",
                fontSize: "0.875rem",
                backgroundColor: selectedMode ? "#0d6efd" : "#6c757d",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: selectedMode ? "pointer" : "not-allowed",
                fontWeight: "500",
                opacity: selectedMode ? 1 : 0.6,
              }}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandkitModeSelectionModal;

