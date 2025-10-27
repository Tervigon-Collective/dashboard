"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react/dist/iconify.js";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Breadcrumb from "@/components/Breadcrumb";
import SidebarPermissionGuard from "@/components/SidebarPermissionGuard";
import {
  getReviewPrompts,
  updateReviewPrompts,
  approveReview,
  getGenerationStatus,
} from "@/services/contentGenerationApi";

/**
 * Review Prompts Page
 * Allows users to review and edit AI-generated prompts before sending them to Freepik
 * Uses query parameter ?jobId=xxx instead of dynamic route
 */
export default function ReviewPromptsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get('jobId');

  const [prompts, setPrompts] = useState([]);
  const [originalPrompts, setOriginalPrompts] = useState([]);
  const [planType, setPlanType] = useState("");
  const [runId, setRunId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (jobId) {
      loadPrompts();
    } else {
      setError("Job ID is required");
      setLoading(false);
    }
  }, [jobId]);

  const loadPrompts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getReviewPrompts(jobId);
      setPrompts(data.prompts || []);
      setOriginalPrompts(JSON.parse(JSON.stringify(data.prompts || [])));
      setPlanType(data.plan_type || "");
      setRunId(data.run_id || "");
      setStatus(data.status || "");
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
    try {
      await approveReview(jobId);
      toast.success("Prompts approved! Generating images...");
      
      // Start polling for completion
      const pollInterval = setInterval(async () => {
        try {
          const statusData = await getGenerationStatus(jobId);
          
          if (statusData.status === "completed") {
            clearInterval(pollInterval);
            toast.success("Images generated successfully!");
            router.push(`/create-content?activeTab=prompts&jobId=${jobId}`);
          } else if (statusData.status === "failed") {
            clearInterval(pollInterval);
            toast.error("Image generation failed");
          } else if (statusData.status === "generating") {
            // Show progress
            console.log("Generating images...", statusData.progress);
          }
        } catch (err) {
          console.error("Error polling status:", err);
          clearInterval(pollInterval);
        }
      }, 2000);

      // Redirect after a short delay to show the success message
      setTimeout(() => {
        router.push(`/create-content?activeTab=prompts&jobId=${jobId}`);
      }, 1500);
    } catch (err) {
      console.error("Failed to approve prompts:", err);
      toast.error("Failed to approve prompts");
    } finally {
      setApproving(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <SidebarPermissionGuard requiredSidebar="createContent">
        <Breadcrumb title="Review Prompts" />
        <div className="container-fluid">
          <div className="card">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-center p-5">
                <Icon
                  icon="solar:refresh-bold"
                  width="32"
                  height="32"
                  className="text-primary me-2 spinner"
                />
                <span className="text-muted">Loading prompts...</span>
              </div>
            </div>
          </div>
        </div>
      </SidebarPermissionGuard>
    );
  }

  if (error) {
    return (
      <SidebarPermissionGuard requiredSidebar="createContent">
        <Breadcrumb title="Review Prompts" />
        <div className="container-fluid">
          <div className="card">
            <div className="card-body">
              <div className="alert alert-danger">
                <h5 className="alert-heading">Error Loading Prompts</h5>
                <p className="mb-0">{error}</p>
                <hr />
                <button className="btn btn-primary" onClick={loadPrompts}>
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </SidebarPermissionGuard>
    );
  }

  return (
    <SidebarPermissionGuard requiredSidebar="createContent">
      <Breadcrumb title="Review Prompts" />
      <div className="container-fluid">
        {/* Header */}
        <div className="card mb-4">
          <div className="card-body">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h4 className="mb-1">Review Generated Prompts</h4>
                <p className="text-muted mb-0">
                  Please review and edit the AI-generated prompts before sending them for image generation.
                </p>
              </div>
              <button className="btn btn-outline-secondary" onClick={handleBack}>
                <Icon
                  icon="solar:arrow-left-bold"
                  width="16"
                  height="16"
                  className="me-2"
                />
                Back
              </button>
            </div>
          </div>
        </div>

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
        <div className="row g-4">
          {prompts.map((prompt, index) => (
            <div key={index} className="col-12">
              <div className="card">
                <div className="card-header">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <h5 className="mb-0">
                        {prompt.type === "shot"
                          ? `Shot ${prompt.shot_number || index + 1}`
                          : `Variant ${prompt.variant_number !== undefined ? prompt.variant_number + 1 : index + 1}`}
                      </h5>
                      <span className="badge bg-primary small">{prompt.type}</span>
                    </div>
                    {prompt.metadata?.format && (
                      <span className="badge bg-secondary">
                        {prompt.metadata.format}
                      </span>
                    )}
                  </div>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Prompt Text
                    </label>
                    <textarea
                      value={prompt.prompt}
                      onChange={(e) => handleEditPrompt(index, e.target.value)}
                      className="form-control"
                      rows={8}
                      placeholder="Enter prompt text..."
                    />
                    <small className="text-muted">
                      {prompt.prompt.length} characters
                    </small>
                  </div>

                  <div className="d-flex gap-3">
                    {prompt.description && (
                      <div className="small">
                        <strong>Description:</strong> {prompt.description}
                      </div>
                    )}
                    {prompt.metadata?.resolution && (
                      <div className="small">
                        <strong>Resolution:</strong> {prompt.metadata.resolution}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="card mt-4">
          <div className="card-body">
            <div className="d-flex align-items-center justify-content-between">
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
                  onClick={handleApprove}
                  disabled={approving}
                  className="btn btn-primary btn-lg"
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
                      Approve & Generate Images
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </SidebarPermissionGuard>
  );
}

