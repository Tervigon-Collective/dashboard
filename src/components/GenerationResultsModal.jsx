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

  const downloadImage = async (imageData, artifactId) => {
    try {
      if (!results?.run_id || !artifactId) {
        console.error("Missing run_id or artifact_id for download");
        return;
      }

      // Use the Python backend API endpoint
      const downloadUrl = `http://localhost:8000/api/content/download/${results.run_id}/${artifactId}`;
      
      // Create a link and trigger download
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `generated_${results.run_id}_${artifactId}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to download image:", error);
      // Fallback to direct URL if API fails
      const link = document.createElement("a");
      link.href =
        imageData.url ||
        imageData.local_url ||
        `data:image/jpeg;base64,${imageData.base64}`;
      link.download = `image_${artifactId}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
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
           <div className="modal-header border-bottom p-3">
             <div className="w-100 d-flex align-items-center justify-content-between">
               <div>
                 <h6 className="modal-title d-flex align-items-center gap-2 mb-1">
                   {results?.plan_type === "video" ? (
                     <Icon icon="solar:video-library-bold" width="16" height="16" className="text-primary" />
                   ) : (
                     <Icon icon="solar:gallery-bold" width="16" height="16" className="text-primary" />
                   )}
                   Generated {results?.plan_type === "video" ? "Video" : "Graphic"} Content
                 </h6>
                 <p className="text-muted mb-0 small" style={{ fontSize: '0.8rem' }}>
                   View the generated plan, prompts, and specifications
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

            {error && (
              <div className="text-center py-4">
                <p className="text-danger mb-3 small">{error}</p>
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={fetchResults}
                >
                  Try Again
                </button>
              </div>
            )}

            {results && (
              <div>
                {/* Tabs */}
                <div className="mb-3 pt-2">
                  <ul
                    className="nav nav-tabs"
                    role="tablist"
                    style={{ borderBottom: "1px solid #e5e7eb" }}
                  >
                    <li className="nav-item" role="presentation">
                      <button
                        className={`nav-link ${
                          activeTab === "overview" ? "active" : ""
                        }`}
                        onClick={() => setActiveTab("overview")}
                        type="button"
                        role="tab"
                        style={{
                          backgroundColor:
                            activeTab === "overview" ? "#f8fafc" : "transparent",
                          border: "none",
                          borderBottom:
                            activeTab === "overview" ? "2px solid #6b7280" : "2px solid transparent",
                          color: activeTab === "overview" ? "#374151" : "#6b7280",
                          fontWeight: activeTab === "overview" ? "500" : "400",
                          borderRadius: "0",
                          padding: "8px 16px",
                          transition: "all 0.2s ease",
                          fontSize: '0.875rem',
                        }}
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
                        style={{
                          backgroundColor:
                            activeTab === "images" ? "#f8fafc" : "transparent",
                          border: "none",
                          borderBottom:
                            activeTab === "images" ? "2px solid #6b7280" : "2px solid transparent",
                          color: activeTab === "images" ? "#374151" : "#6b7280",
                          fontWeight: activeTab === "images" ? "500" : "400",
                          borderRadius: "0",
                          padding: "8px 16px",
                          transition: "all 0.2s ease",
                          fontSize: '0.875rem',
                        }}
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
                        style={{
                          backgroundColor:
                            activeTab === "plan" ? "#f8fafc" : "transparent",
                          border: "none",
                          borderBottom:
                            activeTab === "plan" ? "2px solid #6b7280" : "2px solid transparent",
                          color: activeTab === "plan" ? "#374151" : "#6b7280",
                          fontWeight: activeTab === "plan" ? "500" : "400",
                          borderRadius: "0",
                          padding: "8px 16px",
                          transition: "all 0.2s ease",
                          fontSize: '0.875rem',
                        }}
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
                        style={{
                          backgroundColor:
                            activeTab === "prompts" ? "#f8fafc" : "transparent",
                          border: "none",
                          borderBottom:
                            activeTab === "prompts" ? "2px solid #6b7280" : "2px solid transparent",
                          color: activeTab === "prompts" ? "#374151" : "#6b7280",
                          fontWeight: activeTab === "prompts" ? "500" : "400",
                          borderRadius: "0",
                          padding: "8px 16px",
                          transition: "all 0.2s ease",
                          fontSize: '0.875rem',
                        }}
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
                        style={{
                          backgroundColor:
                            activeTab === "specs" ? "#f8fafc" : "transparent",
                          border: "none",
                          borderBottom:
                            activeTab === "specs" ? "2px solid #6b7280" : "2px solid transparent",
                          color: activeTab === "specs" ? "#374151" : "#6b7280",
                          fontWeight: activeTab === "specs" ? "500" : "400",
                          borderRadius: "0",
                          padding: "8px 16px",
                          transition: "all 0.2s ease",
                          fontSize: '0.875rem',
                        }}
                      >
                        Specifications
                      </button>
                    </li>
                  </ul>
                </div>

                <div className="tab-content">
                  {/* Overview Tab */}
                  {activeTab === "overview" && (
                    <div className="tab-pane fade show active mt-2" role="tabpanel">
                      <div className="row g-3">
                        <div className="col-md-6">
                             <div className="card">
                               <div className="card-header bg-light p-2">
                                 <h6 className="card-title mb-0 fw-semibold small">Plan Details</h6>
                               </div>
                               <div className="card-body p-3">
                              <div className="d-flex align-items-center gap-2 mb-2">
                                <Icon
                                  icon="solar:target-bold"
                                  width="14"
                                  height="14"
                                  className="text-muted"
                                />
                                <span className="small" style={{ fontSize: '0.8rem' }}>
                                  Type: {results.plan_type}
                                </span>
                              </div>
                              {results.plan?.duration_sec && (
                                <div className="d-flex align-items-center gap-2 mb-2">
                                  <Icon
                                    icon="solar:clock-circle-bold"
                                    width="14"
                                    height="14"
                                    className="text-muted"
                                  />
                                  <span className="small" style={{ fontSize: '0.8rem' }}>
                                    Duration:{" "}
                                    {formatDuration(results.plan.duration_sec)}
                                  </span>
                                </div>
                              )}
                              {results.plan?.format && (
                                <div className="d-flex align-items-center gap-2 mb-2">
                                  <Icon
                                    icon="solar:video-library-bold"
                                    width="14"
                                    height="14"
                                    className="text-muted"
                                  />
                                  <span className="small" style={{ fontSize: '0.8rem' }}>
                                    Format: {results.plan.format}
                                  </span>
                                </div>
                              )}
                              {results.plan?.neuromarketing_frame && (
                                <div className="d-flex align-items-center gap-2 mb-2">
                                  <Icon
                                    icon="solar:palette-bold"
                                    width="14"
                                    height="14"
                                    className="text-muted"
                                  />
                                  <span className="small" style={{ fontSize: '0.8rem' }}>
                                    Frame: {results.plan.neuromarketing_frame}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                         <div className="col-md-6">
                           <div className="card">
                             <div className="card-header bg-light p-2">
                               <h6 className="card-title mb-0 fw-semibold small">
                                 Generation Stats
                               </h6>
                             </div>
                             <div className="card-body p-3">
                              <div className="small mb-2" style={{ fontSize: '0.8rem' }}>
                                <span className="fw-medium">Artifacts:</span>{" "}
                                {results.artifacts?.length || 0}
                              </div>
                              <div className="small mb-2" style={{ fontSize: '0.8rem' }}>
                                <span className="fw-medium">Prompts:</span>{" "}
                                {results.prompts?.length || 0}
                              </div>
                              <div className="small mb-2" style={{ fontSize: '0.8rem' }}>
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
                    <div className="tab-pane fade show active mt-2" role="tabpanel">
                      <div
                        className="overflow-auto"
                        style={{ maxHeight: "450px", overflowX: 'hidden' }}
                      >
                        <div>
                          {results.generated_images &&
                          results.generated_images.length > 0 ? (
                            results.generated_images.map((imageData, index) => (
                               <div key={imageData.artifact_id} className="card mb-2">
                                 <div className="card-header bg-light p-2">
                                   <div className="d-flex align-items-center justify-content-between">
                                    <h6 className="card-title mb-0 fw-semibold small">
                                      Generated Image {index + 1}
                                    </h6>
                                    {imageData.freepik_result.success && (
                                      <button
                                        className="btn btn-sm btn-outline-primary"
                                        onClick={() =>
                                          downloadImage(
                                            imageData.freepik_result,
                                            imageData.artifact_id
                                          )
                                        }
                                      >
                                        <Icon
                                          icon="solar:download-bold"
                                          width="12"
                                          height="12"
                                          className="me-1"
                                        />
                                        Download
                                      </button>
                                    )}
                                  </div>
                                 </div>
                                 <div className="card-body p-3">
                                   {imageData.freepik_result.success ? (
                                     <div>
                                       {imageData.freepik_result.url ||
                                       imageData.freepik_result.local_url ||
                                       imageData.freepik_result.base64 ? (
                                         <div className="text-center mb-4">
                                           <img
                                             src={
                                               imageData.freepik_result.url ||
                                               imageData.freepik_result
                                                 .local_url ||
                                               `data:image/jpeg;base64,${imageData.freepik_result.base64}`
                                             }
                                             alt={`Generated image ${index + 1}`}
                                             className="img-fluid rounded shadow"
                                             style={{ maxHeight: "400px", width: "auto" }}
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
                                         <div className="bg-light p-3 rounded mt-3">
                                           <h6 className="fw-semibold mb-2 text-secondary d-flex align-items-center small">
                                             <Icon
                                               icon="solar:info-circle-bold"
                                               width="14"
                                               height="14"
                                               className="me-1"
                                             />
                                             Generation Details
                                           </h6>
                                           <div className="row">
                                             <div className="col-md-6 mb-2">
                                               <div className="small text-muted" style={{ fontSize: '0.7rem' }}>Freepik ID</div>
                                               <div className="fw-medium small">{imageData.freepik_result.id || "N/A"}</div>
                                             </div>
                                             <div className="col-md-6 mb-2">
                                               <div className="small text-muted" style={{ fontSize: '0.7rem' }}>Resolution</div>
                                               <div className="fw-medium small">{imageData.freepik_result.metadata.resolution || "N/A"}</div>
                                             </div>
                                             <div className="col-md-6 mb-2">
                                               <div className="small text-muted" style={{ fontSize: '0.7rem' }}>Style</div>
                                               <div className="fw-medium small">{imageData.freepik_result.metadata.style || "N/A"}</div>
                                             </div>
                                             {imageData.freepik_result.metadata.generated_at && (
                                               <div className="col-md-6 mb-2">
                                                 <div className="small text-muted" style={{ fontSize: '0.7rem' }}>Generated</div>
                                                 <div className="fw-medium small">
                                                   {new Date(imageData.freepik_result.metadata.generated_at).toLocaleString()}
                                                 </div>
                                               </div>
                                             )}
                                           </div>
                                         </div>
                                       )}
                                     </div>
                                   ) : (
                                     <div className="text-center py-3">
                                       <Icon
                                         icon="solar:danger-circle-bold"
                                         width="32"
                                         height="32"
                                         className="text-danger mb-2"
                                       />
                                      <p className="text-danger fw-semibold mb-1 small">
                                        Image generation failed
                                      </p>
                                      <p className="small text-muted mb-2" style={{ fontSize: '0.75rem' }}>
                                        {imageData.freepik_result.error ||
                                          "Unknown error"}
                                      </p>
                                     </div>
                                   )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4 text-muted">
                               <Icon
                                 icon="solar:gallery-bold"
                                 width="32"
                                 height="32"
                                 className="text-muted mb-2"
                               />
                               <p className="fw-medium mb-1 small">No images generated yet</p>
                               <p className="small" style={{ fontSize: '0.75rem' }}>
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
                    <div className="tab-pane fade show active mt-2" role="tabpanel">
                      <div
                        className="overflow-auto"
                        style={{ maxHeight: "450px", overflowX: 'hidden' }}
                      >
                       <div className="card">
                           <div className="card-header bg-light p-2">
                             <h6 className="card-title mb-0 fw-semibold small">Content Plan</h6>
                           </div>
                           <div className="card-body p-3">
                             <div className="bg-light p-3 rounded">
                               <pre className="small mb-0" style={{ maxHeight: "350px", overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: '0.75rem' }}>
                                 {JSON.stringify(results.plan, null, 2)}
                               </pre>
                             </div>
                           </div>
                         </div>
                      </div>
                    </div>
                  )}

                  {/* Prompts Tab */}
                  {activeTab === "prompts" && (
                    <div className="tab-pane fade show active mt-2" role="tabpanel">
                      <div
                        className="overflow-auto"
                        style={{ maxHeight: "450px", overflowX: 'hidden' }}
                      >
                        <div>
                          {results.prompts && results.prompts.length > 0 ? (
                             results.prompts.map((prompt, index) => (
                               <div key={prompt.shot_id} className="card mb-2">
                                 <div className="card-header bg-light p-2">
                                   <div className="d-flex align-items-center justify-content-between">
                                     <h6 className="card-title mb-0 fw-semibold small">
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
                                       title="Copy to clipboard"
                                     >
                                       {copiedPrompt === prompt.shot_id ? (
                                         <Icon
                                           icon="solar:check-circle-bold"
                                           width="12"
                                           height="12"
                                         />
                                       ) : (
                                         <Icon
                                           icon="solar:copy-bold"
                                           width="12"
                                           height="12"
                                         />
                                       )}
                                     </button>
                                   </div>
                                 </div>
                                 <div className="card-body p-3">
                                   <div className="bg-light p-3 rounded">
                                     <p
                                       className="small mb-0"
                                       style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: '0.75rem' }}
                                     >
                                       {prompt.prompt}
                                     </p>
                                   </div>
                                 </div>
                               </div>
                             ))
                           ) : (
                             <div className="text-center py-4 text-muted">
                               <Icon
                                 icon="solar:document-text-bold"
                                 width="32"
                                 height="32"
                                 className="text-muted mb-2"
                               />
                               <p className="fw-medium small">No prompts available</p>
                             </div>
                           )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Specifications Tab */}
                  {activeTab === "specs" && (
                    <div className="tab-pane fade show active mt-2" role="tabpanel">
                      <div
                        className="overflow-auto"
                        style={{ maxHeight: "450px", overflowX: 'hidden' }}
                      >
                        <div>
                          {results.artifacts && results.artifacts.length > 0 ? (
                             results.artifacts.map((artifact, index) => (
                               <div
                                 key={artifact.shot_id || index}
                                 className="card mb-2"
                               >
                                 <div className="card-header bg-light p-2">
                                   <h6 className="card-title mb-0 fw-semibold small">
                                     {artifact.shot_id ||
                                       `Specification ${index + 1}`}
                                   </h6>
                                 </div>
                                 <div className="card-body p-3">
                                   <div className="bg-light p-3 rounded">
                                     <pre className="small mb-0" style={{ maxHeight: "250px", overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: '0.75rem' }}>
                                       {JSON.stringify(artifact, null, 2)}
                                     </pre>
                                   </div>
                                 </div>
                               </div>
                             ))
                           ) : (
                             <div className="text-center py-4 text-muted">
                               <Icon
                                 icon="solar:settings-bold"
                                 width="32"
                                 height="32"
                                 className="text-muted mb-2"
                               />
                               <p className="fw-medium small">No specifications available</p>
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
           <div className="modal-footer border-top px-3 py-2">
             <button
               type="button"
               className="btn btn-secondary btn-sm"
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
