"use client";
import { useState, useEffect } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { toast } from "react-toastify";
import * as contentApi from "@/services/contentGenerationApi";
import { useGeneration } from "@/contexts/GenerationContext";

/**
 * Generation Results Modal Component
 * Using Bootstrap modal pattern like Procurement
 * @param {Object} props
 * @param {string} props.jobId - Job ID to display results for
 * @param {boolean} props.isOpen - Modal open state
 * @param {Function} props.onClose - Close handler
 */
export default function GenerationResultsModal({ jobId, isOpen, onClose }) {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedPrompt, setCopiedPrompt] = useState(null);
  const [retryingImage, setRetryingImage] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const { getGenerationById } = useGeneration();

  useEffect(() => {
    if (isOpen && jobId) {
      fetchResults();
    }
  }, [isOpen, jobId]);

  const fetchResults = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await contentApi.getGenerationResults(jobId);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load results");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text, promptId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPrompt(promptId);
      setTimeout(() => setCopiedPrompt(null), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const retryImageGeneration = async (artifactId) => {
    if (!results) return;

    setRetryingImage(artifactId);
    try {
      const retryResult = await contentApi.retryImageGeneration(
        jobId,
        artifactId
      );

      // Update the results with the new image
      setResults((prev) => {
        if (!prev) return prev;

        const updatedImages = prev.generated_images.map((img) =>
          img.artifact_id === artifactId
            ? { ...img, freepik_result: retryResult.freepik_result }
            : img
        );

        return { ...prev, generated_images: updatedImages };
      });
    } catch (err) {
      console.error("Failed to retry image generation:", err);
    } finally {
      setRetryingImage(null);
    }
  };

  const downloadImage = (imageData, filename) => {
    // Create download link
    const link = document.createElement("a");
    link.href =
      imageData.url ||
      imageData.local_url ||
      `data:image/jpeg;base64,${imageData.base64}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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
          <div className="modal-header">
            <h5 className="modal-title d-flex align-items-center gap-2">
              {results?.plan_type === "video" ? (
                <Icon icon="solar:video-library-bold" width="20" height="20" />
              ) : (
                <Icon icon="solar:gallery-bold" width="20" height="20" />
              )}
              Generated {results?.plan_type === "video" ? "Video" : "Graphic"}{" "}
              Content
            </h5>
            <p className="modal-subtitle text-muted mb-0">
              View the generated plan, prompts, and specifications
            </p>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            />
          </div>

          {/* Modal Body */}
          <div className="modal-body">
            {loading && (
              <div className="d-flex align-items-center justify-content-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="text-center py-5">
                <p className="text-danger mb-3">{error}</p>
                <button
                  className="btn btn-outline-primary"
                  onClick={fetchResults}
                >
                  Try Again
                </button>
              </div>
            )}

            {results && (
              <div className="space-y-4">
                {/* Tabs */}
                <ul className="nav nav-tabs" role="tablist">
                  <li className="nav-item" role="presentation">
                    <button
                      className={`nav-link ${
                        activeTab === "overview" ? "active" : ""
                      }`}
                      onClick={() => setActiveTab("overview")}
                      type="button"
                      role="tab"
                    >
                      Overview
                    </button>
                  </li>
                  <li className="nav-item" role="presentation">
                    <button
                      className={`nav-link ${
                        activeTab === "images" ? "active" : ""
                      }`}
                      onClick={() => setActiveTab("images")}
                      type="button"
                      role="tab"
                    >
                      Generated Images
                    </button>
                  </li>
                  <li className="nav-item" role="presentation">
                    <button
                      className={`nav-link ${
                        activeTab === "plan" ? "active" : ""
                      }`}
                      onClick={() => setActiveTab("plan")}
                      type="button"
                      role="tab"
                    >
                      Plan
                    </button>
                  </li>
                  <li className="nav-item" role="presentation">
                    <button
                      className={`nav-link ${
                        activeTab === "prompts" ? "active" : ""
                      }`}
                      onClick={() => setActiveTab("prompts")}
                      type="button"
                      role="tab"
                    >
                      Prompts
                    </button>
                  </li>
                  <li className="nav-item" role="presentation">
                    <button
                      className={`nav-link ${
                        activeTab === "specs" ? "active" : ""
                      }`}
                      onClick={() => setActiveTab("specs")}
                      type="button"
                      role="tab"
                    >
                      Specifications
                    </button>
                  </li>
                </ul>

                <div className="tab-content">
                  {/* Overview Tab */}
                  {activeTab === "overview" && (
                    <div className="tab-pane fade show active" role="tabpanel">
                      <div className="row g-4">
                        <div className="col-md-6">
                          <div className="card">
                            <div className="card-header">
                              <h6 className="card-title mb-0">Plan Details</h6>
                            </div>
                            <div className="card-body">
                              <div className="d-flex align-items-center gap-2 mb-2">
                                <Icon
                                  icon="solar:target-bold"
                                  width="16"
                                  height="16"
                                  className="text-muted"
                                />
                                <span className="small">
                                  Type: {results.plan_type}
                                </span>
                              </div>
                              {results.plan?.duration_sec && (
                                <div className="d-flex align-items-center gap-2 mb-2">
                                  <Icon
                                    icon="solar:clock-circle-bold"
                                    width="16"
                                    height="16"
                                    className="text-muted"
                                  />
                                  <span className="small">
                                    Duration:{" "}
                                    {formatDuration(results.plan.duration_sec)}
                                  </span>
                                </div>
                              )}
                              {results.plan?.format && (
                                <div className="d-flex align-items-center gap-2 mb-2">
                                  <Icon
                                    icon="solar:video-library-bold"
                                    width="16"
                                    height="16"
                                    className="text-muted"
                                  />
                                  <span className="small">
                                    Format: {results.plan.format}
                                  </span>
                                </div>
                              )}
                              {results.plan?.neuromarketing_frame && (
                                <div className="d-flex align-items-center gap-2 mb-2">
                                  <Icon
                                    icon="solar:palette-bold"
                                    width="16"
                                    height="16"
                                    className="text-muted"
                                  />
                                  <span className="small">
                                    Frame: {results.plan.neuromarketing_frame}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="col-md-6">
                          <div className="card">
                            <div className="card-header">
                              <h6 className="card-title mb-0">
                                Generation Stats
                              </h6>
                            </div>
                            <div className="card-body">
                              <div className="small mb-2">
                                <span className="fw-medium">Artifacts:</span>{" "}
                                {results.artifacts?.length || 0}
                              </div>
                              <div className="small mb-2">
                                <span className="fw-medium">Prompts:</span>{" "}
                                {results.prompts?.length || 0}
                              </div>
                              <div className="small mb-2">
                                <span className="fw-medium">Run ID:</span>{" "}
                                {results.run_id}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Generated Images Tab */}
                  {activeTab === "images" && (
                    <div className="tab-pane fade show active" role="tabpanel">
                      <div
                        className="overflow-auto"
                        style={{ maxHeight: "400px" }}
                      >
                        <div className="space-y-4">
                          {results.generated_images &&
                          results.generated_images.length > 0 ? (
                            results.generated_images.map((imageData, index) => (
                              <div key={imageData.artifact_id} className="card">
                                <div className="card-header">
                                  <div className="d-flex align-items-center justify-content-between">
                                    <h6 className="card-title mb-0">
                                      Generated Image {index + 1} -{" "}
                                      {imageData.artifact_id}
                                    </h6>
                                    <div className="d-flex gap-2">
                                      {imageData.freepik_result.success && (
                                        <button
                                          className="btn btn-sm btn-outline-primary"
                                          onClick={() =>
                                            downloadImage(
                                              imageData.freepik_result,
                                              `generated_image_${imageData.artifact_id}.jpg`
                                            )
                                          }
                                        >
                                          <Icon
                                            icon="solar:download-bold"
                                            width="14"
                                            height="14"
                                            className="me-1"
                                          />
                                          Download
                                        </button>
                                      )}
                                      <button
                                        className="btn btn-sm btn-outline-secondary"
                                        onClick={() =>
                                          retryImageGeneration(
                                            imageData.artifact_id
                                          )
                                        }
                                        disabled={
                                          retryingImage ===
                                          imageData.artifact_id
                                        }
                                      >
                                        <Icon
                                          icon="solar:refresh-bold"
                                          width="14"
                                          height="14"
                                          className="me-1"
                                        />
                                        Retry
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                <div className="card-body">
                                  {imageData.freepik_result.success ? (
                                    <div className="space-y-4">
                                      {imageData.freepik_result.url ||
                                      imageData.freepik_result.local_url ||
                                      imageData.freepik_result.base64 ? (
                                        <div className="text-center">
                                          <img
                                            src={
                                              imageData.freepik_result.url ||
                                              imageData.freepik_result
                                                .local_url ||
                                              `data:image/jpeg;base64,${imageData.freepik_result.base64}`
                                            }
                                            alt={`Generated image ${index + 1}`}
                                            className="img-fluid rounded shadow"
                                            style={{ maxHeight: "400px" }}
                                          />
                                        </div>
                                      ) : (
                                        <div className="text-center py-5 text-muted">
                                          <Icon
                                            icon="solar:gallery-bold"
                                            width="48"
                                            height="48"
                                            className="text-muted mb-2"
                                          />
                                          <p>Image not available</p>
                                        </div>
                                      )}

                                      {imageData.freepik_result.metadata && (
                                        <div className="bg-light p-3 rounded">
                                          <h6 className="fw-medium small mb-2">
                                            Generation Details
                                          </h6>
                                          <div className="small">
                                            <p className="mb-1">
                                              <strong>Freepik ID:</strong>{" "}
                                              {imageData.freepik_result.id ||
                                                "N/A"}
                                            </p>
                                            <p className="mb-1">
                                              <strong>Resolution:</strong>{" "}
                                              {imageData.freepik_result.metadata
                                                .resolution || "N/A"}
                                            </p>
                                            <p className="mb-1">
                                              <strong>Style:</strong>{" "}
                                              {imageData.freepik_result.metadata
                                                .style || "N/A"}
                                            </p>
                                            <p className="mb-0">
                                              <strong>Generated:</strong>{" "}
                                              {new Date(
                                                imageData.freepik_result.metadata.generated_at
                                              ).toLocaleString()}
                                            </p>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-center py-5">
                                      <Icon
                                        icon="solar:danger-circle-bold"
                                        width="48"
                                        height="48"
                                        className="text-danger mb-2"
                                      />
                                      <p className="text-danger mb-2">
                                        Image generation failed
                                      </p>
                                      <p className="small text-muted">
                                        {imageData.freepik_result.error ||
                                          "Unknown error"}
                                      </p>
                                      <button
                                        className="btn btn-sm btn-outline-primary mt-3"
                                        onClick={() =>
                                          retryImageGeneration(
                                            imageData.artifact_id
                                          )
                                        }
                                        disabled={
                                          retryingImage ===
                                          imageData.artifact_id
                                        }
                                      >
                                        <Icon
                                          icon="solar:refresh-bold"
                                          width="14"
                                          height="14"
                                          className="me-1"
                                        />
                                        Retry Generation
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-5 text-muted">
                              <Icon
                                icon="solar:gallery-bold"
                                width="48"
                                height="48"
                                className="text-muted mb-2"
                              />
                              <p>No images generated yet</p>
                              <p className="small">
                                Images will appear here after generation
                                completes
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Plan Tab */}
                  {activeTab === "plan" && (
                    <div className="tab-pane fade show active" role="tabpanel">
                      <div
                        className="overflow-auto"
                        style={{ maxHeight: "400px" }}
                      >
                        <div className="card">
                          <div className="card-header">
                            <h6 className="card-title mb-0">Content Plan</h6>
                          </div>
                          <div className="card-body">
                            <pre className="small bg-light p-3 rounded overflow-auto mb-0">
                              {JSON.stringify(results.plan, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Prompts Tab */}
                  {activeTab === "prompts" && (
                    <div className="tab-pane fade show active" role="tabpanel">
                      <div
                        className="overflow-auto"
                        style={{ maxHeight: "400px" }}
                      >
                        <div className="space-y-4">
                          {results.prompts && results.prompts.length > 0 ? (
                            results.prompts.map((prompt, index) => (
                              <div key={prompt.shot_id} className="card">
                                <div className="card-header">
                                  <div className="d-flex align-items-center justify-content-between">
                                    <h6 className="card-title mb-0">
                                      Shot {prompt.shot_id} - Prompt {index + 1}
                                    </h6>
                                    <button
                                      className="btn btn-sm btn-outline-secondary"
                                      onClick={() =>
                                        copyToClipboard(
                                          prompt.prompt,
                                          prompt.shot_id
                                        )
                                      }
                                    >
                                      {copiedPrompt === prompt.shot_id ? (
                                        <Icon
                                          icon="solar:check-circle-bold"
                                          width="14"
                                          height="14"
                                        />
                                      ) : (
                                        <Icon
                                          icon="solar:copy-bold"
                                          width="14"
                                          height="14"
                                        />
                                      )}
                                    </button>
                                  </div>
                                </div>
                                <div className="card-body">
                                  <div className="bg-light p-3 rounded">
                                    <p
                                      className="small mb-0"
                                      style={{ whiteSpace: "pre-wrap" }}
                                    >
                                      {prompt.prompt}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-5 text-muted">
                              No prompts available
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Specifications Tab */}
                  {activeTab === "specs" && (
                    <div className="tab-pane fade show active" role="tabpanel">
                      <div
                        className="overflow-auto"
                        style={{ maxHeight: "400px" }}
                      >
                        <div className="space-y-4">
                          {results.artifacts && results.artifacts.length > 0 ? (
                            results.artifacts.map((artifact, index) => (
                              <div
                                key={artifact.shot_id || index}
                                className="card"
                              >
                                <div className="card-header">
                                  <h6 className="card-title mb-0">
                                    {artifact.shot_id ||
                                      `Specification ${index + 1}`}
                                  </h6>
                                </div>
                                <div className="card-body">
                                  <pre className="small bg-light p-3 rounded overflow-auto mb-0">
                                    {JSON.stringify(artifact, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-5 text-muted">
                              No specifications available
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
