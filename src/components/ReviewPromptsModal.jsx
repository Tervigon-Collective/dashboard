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
          <div className="modal-header border-bottom p-3">
            <div className="w-100 d-flex align-items-center justify-content-between">
              <div>
                <h6 className="modal-title d-flex align-items-center gap-2 mb-1">
                  <Icon icon="solar:file-text-bold" width="14" height="14" className="text-primary" />
                  Review Generated Prompts
                </h6>
                <p className="text-muted mb-0 small" style={{ fontSize: '0.8rem' }}>
                  Please review and edit the AI-generated prompts before sending them for image generation
                </p>
              </div>
              <button
                type="button"
                className="btn-close btn-close-sm"
                onClick={onClose}
                aria-label="Close"
              />
            </div>
          </div>

          {/* Modal Body */}
          <div className="modal-body p-3" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
            {loading && (
              <div className="d-flex align-items-center justify-content-center py-4">
                <div className="spinner-border text-primary spinner-border-sm" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}

            {(error || promptError) && (
              <div className="text-center py-4">
                <div className="alert alert-danger small">
                  <strong>Error:</strong>
                  <p className="mb-2 mt-1">{error || promptError}</p>
                  <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={loadPrompts}
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {!loading && !error && !promptError && (
              <div>
                {/* Prompts List */}
                <div style={{ maxHeight: '500px', overflowY: 'auto', overflowX: 'hidden' }}>
                  {prompts.length === 0 && (
                  <div className="text-center py-4 text-muted">
                    <Icon icon="solar:document-text-bold" width="32" height="32" className="text-muted mb-2" />
                    <p className="fw-medium small mb-0">No prompts available</p>
                  </div>
                )}
                {prompts.map((prompt, index) => (
                    <div key={index} className="mb-2">
                      <div className="card">
                        <div className="card-header bg-light p-2">
                          <div className="d-flex align-items-center justify-content-between">
                            <div>
                              <h6 className="card-title mb-1 fw-semibold small">
                                {prompt.type === "shot"
                                  ? `Shot ${prompt.shot_number || index + 1}`
                                  : `Variant ${prompt.variant_number !== undefined ? prompt.variant_number + 1 : index + 1}`}
                              </h6>
                              <span className="badge bg-primary" style={{ fontSize: '0.7rem' }}>{prompt.type}</span>
                            </div>
                            {prompt.metadata?.format && (
                              <span className="badge bg-secondary" style={{ fontSize: '0.7rem' }}>
                                {prompt.metadata.format}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="card-body p-3">
                          <div className="mb-2">
                            <label className="form-label fw-semibold small mb-1">
                              Prompt Text
                            </label>
                            <textarea
                              value={prompt.prompt}
                              onChange={(e) => handleEditPrompt(index, e.target.value)}
                              className="form-control"
                              rows={18}
                              placeholder="Enter prompt text..."
                              style={{ wordBreak: "break-word", fontSize: '0.875rem', resize: 'vertical' }}
                            />
                            <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                              {prompt.prompt.length} characters
                            </small>
                          </div>

                          {(prompt.description || prompt.metadata?.resolution) && (
                            <div className="d-flex gap-3 mt-2">
                              {prompt.description && (
                                <div style={{ fontSize: '0.8rem' }}>
                                  <div className="text-muted mb-1">Description</div>
                                  <div className="fw-medium">{prompt.description}</div>
                                </div>
                              )}
                              {prompt.metadata?.resolution && (
                                <div style={{ fontSize: '0.8rem' }}>
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
                  <div className="alert alert-danger mt-2 py-2 small">
                    <Icon
                      icon="solar:danger-circle-bold"
                      width="16"
                      height="16"
                      className="me-2"
                    />
                    <strong>Error:</strong> {promptError}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="modal-footer border-top px-3 py-2">
            <div className="w-100 d-flex align-items-center justify-content-between">
              <div>
                {hasChanges && (
                  <span className="badge bg-warning me-2" style={{ fontSize: '0.75rem' }}>
                    <Icon
                      icon="solar:edit-bold"
                      width="10"
                      height="10"
                      className="me-1"
                    />
                    Unsaved changes
                  </span>
                )}
                <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                  Job ID: <code>{jobId}</code>
                </small>
              </div>
              <div className="d-flex gap-2">
                <button
                  onClick={handleSaveDraft}
                  disabled={saving || !hasChanges}
                  className="btn btn-outline-primary btn-sm"
                >
                  {saving ? (
                    <>
                      <Icon
                        icon="solar:refresh-bold"
                        width="14"
                        height="14"
                        className="me-1 spinner"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Icon
                        icon="solar:diskette-bold"
                        width="14"
                        height="14"
                        className="me-1"
                      />
                      Save Draft
                    </>
                  )}
                </button>

                <button
                  onClick={onClose}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>

                <button
                  onClick={handleApprove}
                  disabled={approving}
                  className="btn btn-primary btn-sm"
                >
                  {approving ? (
                    <>
                      <Icon
                        icon="solar:refresh-bold"
                        width="14"
                        height="14"
                        className="me-1 spinner"
                      />
                      Approving...
                    </>
                  ) : (
                    <>
                      <Icon
                        icon="solar:check-circle-bold"
                        width="14"
                        height="14"
                        className="me-1"
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


