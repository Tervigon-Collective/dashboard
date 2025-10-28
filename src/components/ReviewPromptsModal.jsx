"use client";
import { useState, useEffect } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  getReviewPrompts,
  updateReviewPrompts,
  approveReview,
} from "@/services/contentGenerationApi";

/**
 * Review Prompts Modal Component
 * Allows users to review and edit AI-generated prompts before sending them to Freepik
 * @param {Object} props
 * @param {string} props.jobId - Job ID to display prompts for
 * @param {boolean} props.isOpen - Modal open state
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onApproveSuccess - Success callback
 */
export default function ReviewPromptsModal({ jobId, isOpen, onClose, onApproveSuccess }) {
  const [prompts, setPrompts] = useState([]);
  const [originalPrompts, setOriginalPrompts] = useState([]);
  const [planType, setPlanType] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [promptError, setPromptError] = useState(null);

  useEffect(() => {
    if (isOpen && jobId) {
      loadPrompts();
    }
  }, [isOpen, jobId]);

  const loadPrompts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getReviewPrompts(jobId);
      setPrompts(data.prompts || []);
      setOriginalPrompts(JSON.parse(JSON.stringify(data.prompts || [])));
      setPlanType(data.plan_type || "");
    } catch (err) {
      console.error("Failed to load prompts:", err);
      setError(err.message || "Failed to load prompts");
      toast.error("Failed to load prompts");
    } finally {
      setLoading(false);
    }
  };

  const handleEditPrompt = (index, newPrompt) => {
    const updated = [...prompts];
    updated[index].prompt = newPrompt;
    setPrompts(updated);
    
    // Check if there are changes
    const hasChanges = JSON.stringify(updated) !== JSON.stringify(originalPrompts);
    setHasChanges(hasChanges);
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await updateReviewPrompts(jobId, { prompts });
      setOriginalPrompts(JSON.parse(JSON.stringify(prompts)));
      setHasChanges(false);
      toast.success("Draft saved successfully");
    } catch (err) {
      console.error("Failed to save draft:", err);
      toast.error("Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (
      !confirm(
        "Are you sure you want to approve these prompts and generate images?"
      )
    ) {
      return;
    }

    setApproving(true);
    setPromptError(null);
    
    try {
      console.log("Starting approval process for jobId:", jobId);
      console.log("Current prompts:", prompts);
      
      // If there are changes, save them first
      if (hasChanges) {
        console.log("Saving changes before approval...");
        try {
          await updateReviewPrompts(jobId, { prompts });
          setOriginalPrompts(JSON.parse(JSON.stringify(prompts)));
          setHasChanges(false);
          console.log("Changes saved successfully");
        } catch (err) {
          console.error("Failed to save changes before approval:", err);
          console.error("Error details:", err.response?.data);
          toast.error("Please save your changes first");
          setApproving(false);
          return;
        }
      }

      // Now approve
      console.log("Approving prompts...");
      await approveReview(jobId);
      console.log("Prompts approved successfully");
      toast.success("Prompts approved! Generating images...");
      onClose();
      if (onApproveSuccess) {
        onApproveSuccess(jobId);
      }
    } catch (err) {
      console.error("Failed to approve prompts:", err);
      console.error("Error response:", err.response?.data);
      console.error("Error status:", err.response?.status);
      
      const errorMessage = err.response?.data?.detail 
        || err.response?.data?.message 
        || err.message 
        || "Failed to approve prompts. Please check the console for details.";
      
      setPromptError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setApproving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal fade show d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content">
          {/* Modal Header */}
          <div className="modal-header border-bottom p-5">
            <div className="w-100 d-flex align-items-center justify-content-between">
              <div>
                <h5 className="modal-title d-flex align-items-center gap-2 mb-3">
                  <Icon icon="solar:file-text-bold" width="20" height="20" className="text-primary" />
                  Review Generated Prompts
                </h5>
                <p className="text-muted mb-0 small">
                  Please review and edit the AI-generated prompts before sending them for image generation
                </p>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                aria-label="Close"
              />
            </div>
          </div>

          {/* Modal Body */}
          <div className="modal-body p-5 pb-5" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
            {loading && (
              <div className="d-flex align-items-center justify-content-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}

            {(error || promptError) && (
              <div className="text-center py-5">
                <div className="alert alert-danger">
                  <strong>Error:</strong>
                  <p className="mb-2">{error || promptError}</p>
                  <button
                    className="btn btn-outline-primary"
                    onClick={loadPrompts}
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {!loading && !error && !promptError && (
              <div>
                {/* Info Alert */}
                <div className="alert alert-info mb-4">
                  <Icon
                    icon="solar:info-circle-bold"
                    width="20"
                    height="20"
                    className="me-2"
                  />
                  <strong>Note:</strong> You can edit any of the prompts below. Changes will be saved as a draft when you click "Save Draft" or will be applied when you approve.
                </div>

                {/* Prompts List */}
                <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  {prompts.length === 0 && (
                  <div className="text-center py-5 text-muted">
                    <Icon icon="solar:document-text-bold" width="48" height="48" className="text-muted mb-3" />
                    <p className="fw-medium">No prompts available</p>
                  </div>
                )}
                {prompts.map((prompt, index) => (
                    <div key={index} className="mb-3">
                      <div className="card">
                        <div className="card-header bg-light p-4">
                          <div className="d-flex align-items-center justify-content-between">
                            <div>
                              <h6 className="card-title mb-2 fw-semibold">
                                {prompt.type === "shot"
                                  ? `Shot ${prompt.shot_number || index + 1}`
                                  : `Variant ${prompt.variant_number !== undefined ? prompt.variant_number + 1 : index + 1}`}
                              </h6>
                              <span className="badge bg-primary small">{prompt.type}</span>
                            </div>
                            {prompt.metadata?.format && (
                              <span className="badge bg-secondary">
                                {prompt.metadata.format}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="card-body p-4">
                          <div className="mb-4">
                            <label className="form-label fw-semibold">
                              Prompt Text
                            </label>
                            <textarea
                              value={prompt.prompt}
                              onChange={(e) => handleEditPrompt(index, e.target.value)}
                              className="form-control"
                              rows={8}
                              placeholder="Enter prompt text..."
                              style={{ wordBreak: "break-word" }}
                            />
                            <small className="text-muted">
                              {prompt.prompt.length} characters
                            </small>
                          </div>

                          {(prompt.description || prompt.metadata?.resolution) && (
                            <div className="d-flex gap-4 mt-3">
                              {prompt.description && (
                                <div className="small">
                                  <div className="text-muted mb-1">Description</div>
                                  <div className="fw-medium">{prompt.description}</div>
                                </div>
                              )}
                              {prompt.metadata?.resolution && (
                                <div className="small">
                                  <div className="text-muted mb-1">Resolution</div>
                                  <div className="fw-medium">{prompt.metadata.resolution}</div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Error Banner if approve fails */}
                {promptError && (
                  <div className="alert alert-danger mt-3">
                    <Icon
                      icon="solar:danger-circle-bold"
                      width="20"
                      height="20"
                      className="me-2"
                    />
                    <strong>Error:</strong> {promptError}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="modal-footer border-top">
            <div className="w-100 d-flex align-items-center justify-content-between">
              <div>
                {hasChanges && (
                  <span className="badge bg-warning me-2">
                    <Icon
                      icon="solar:edit-bold"
                      width="12"
                      height="12"
                      className="me-1"
                    />
                    Unsaved changes
                  </span>
                )}
                <small className="text-muted">
                  Job ID: <code>{jobId}</code>
                </small>
              </div>
              <div className="d-flex gap-2">
                <button
                  onClick={handleSaveDraft}
                  disabled={saving || !hasChanges}
                  className="btn btn-outline-primary"
                >
                  {saving ? (
                    <>
                      <Icon
                        icon="solar:refresh-bold"
                        width="16"
                        height="16"
                        className="me-2 spinner"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Icon
                        icon="solar:diskette-bold"
                        width="16"
                        height="16"
                        className="me-2"
                      />
                      Save as Draft
                    </>
                  )}
                </button>

                <button
                  onClick={onClose}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>

                <button
                  onClick={handleApprove}
                  disabled={approving}
                  className="btn btn-primary"
                >
                  {approving ? (
                    <>
                      <Icon
                        icon="solar:refresh-bold"
                        width="16"
                        height="16"
                        className="me-2 spinner"
                      />
                      Approving...
                    </>
                  ) : (
                    <>
                      <Icon
                        icon="solar:check-circle-bold"
                        width="16"
                        height="16"
                        className="me-2"
                      />
                      Approve & Generate
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


