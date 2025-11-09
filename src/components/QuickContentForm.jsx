"use client";
import { useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import * as contentApi from "@/services/contentGenerationApi";
import GenerationResultsModal from "./GenerationResultsModal";

/**
 * Quick Content Form Component
 * Allows quick content generation without creating a full brief
 */
export default function QuickContentForm() {
  const [formData, setFormData] = useState({
    product_name: "",
    short_description: "",
    long_description: "",
    campaign_objective: "Product Launch",
    content_channel: "Image",
    tone: "Emotional",
    call_to_action: "Let nature lead",
    number_of_variants: 1,
  });

  const [uploadedImages, setUploadedImages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData((prev) => {
      if (field === "content_channel") {
        const nextChannel = value;
        return {
          ...prev,
          content_channel: nextChannel,
          number_of_variants:
            nextChannel === "Video"
              ? 1
              : prev.number_of_variants && prev.number_of_variants >= 1
              ? prev.number_of_variants
              : 1,
        };
      }

      if (field === "number_of_variants") {
        if (value === "") {
          return {
            ...prev,
            number_of_variants: "",
          };
        }

        const parsedValue = parseInt(value, 10);
        if (Number.isNaN(parsedValue)) {
          return prev;
        }

        const sanitizedValue = Math.min(10, Math.max(1, parsedValue));
        return {
          ...prev,
          number_of_variants: sanitizedValue,
        };
      }

      return {
        ...prev,
        [field]: value,
      };
    });
  };

  // Handle image upload
  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files || []);
    setUploadedImages((prev) => [...prev, ...files]);
  };

  // Remove image
  const removeImage = (index) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle generate content
  const handleGenerateContent = async () => {
    // Validation
    if (
      !formData.product_name ||
      !formData.short_description ||
      !formData.long_description
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate video requirements
    if (formData.content_channel === "Video" && uploadedImages.length === 0) {
      toast.error("Product image is required for video generation. Please upload a product image.");
      return;
    }

    setIsGenerating(true);
    setGenerationResult(null);

    try {
      // Upload images first
      const imageUrls = [];
      if (uploadedImages.length > 0) {
        toast.info("Uploading images...");
        try {
          const response = await contentApi.uploadImages(uploadedImages);
          imageUrls.push(...response.urls);
          toast.success(`Uploaded ${uploadedImages.length} image(s)`);
        } catch (error) {
          console.error("Error uploading images:", error);
          toast.warning(
            "Failed to upload some images, continuing with generation"
          );
        }
      }

      // Start generation
      toast.info("Starting content generation...");
      const response = await contentApi.quickGenerate({
        ...formData,
        number_of_variants:
          formData.content_channel === "Video"
            ? 1
            : parseInt(formData.number_of_variants, 10) || 1,
        uploaded_images: imageUrls,
      });

      const jobId = response.job_id;
      setGenerationResult({
        job_id: jobId,
        status: "pending",
        progress: 0,
      });

      toast.success("Generation started! Tracking progress...");

      // Poll for status updates
      const pollInterval = setInterval(async () => {
        try {
          const status = await contentApi.getGenerationStatus(jobId);
          setGenerationResult({
            job_id: jobId,
            status: status.status,
            progress: status.progress,
            result: status.result,
            error: status.error,
          });

          if (status.status === "completed") {
            clearInterval(pollInterval);
            setIsGenerating(false);
            
            // For video, we need to fetch full results
            if (status.result?.plan_type === "video") {
              try {
                const fullResults = await contentApi.getGenerationResults(jobId);
                setGenerationResult({
                  job_id: jobId,
                  status: status.status,
                  progress: status.progress,
                  result: fullResults,
                  error: status.error,
                });
              } catch (err) {
                console.error("Error fetching video results:", err);
              }
            }
            
            toast.success("Content generated successfully!");
          } else if (status.status === "failed") {
            clearInterval(pollInterval);
            setIsGenerating(false);
            toast.error(
              `Generation failed: ${status.error || "Unknown error"}`
            );
          }
        } catch (error) {
          console.error("Error checking generation status:", error);
          clearInterval(pollInterval);
          setIsGenerating(false);
          toast.error("Failed to check generation status");
        }
      }, 2000);
    } catch (error) {
      console.error("Error generating content:", error);
      setIsGenerating(false);
      toast.error(`Failed to generate content: ${error.message}`);
      setGenerationResult({
        job_id: "",
        status: "failed",
        progress: 0,
        error: error.message,
      });
    }
  };

  // Handle view results
  const handleViewResults = (jobId) => {
    setSelectedJobId(jobId);
    setIsModalOpen(true);
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return (
          <Icon
            icon="solar:check-circle-bold"
            width="20"
            height="20"
            className="text-success"
          />
        );
      case "failed":
        return (
          <Icon
            icon="solar:danger-circle-bold"
            width="20"
            height="20"
            className="text-danger"
          />
        );
      case "processing":
      case "generating":
        return (
          <Icon
            icon="solar:refresh-bold"
            width="20"
            height="20"
            className="text-primary"
          />
        );
      default:
        return (
          <Icon
            icon="solar:clock-circle-bold"
            width="20"
            height="20"
            className="text-muted"
          />
        );
    }
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "completed":
        return "bg-success";
      case "failed":
        return "bg-danger";
      case "processing":
      case "generating":
        return "bg-primary";
      default:
        return "bg-secondary";
    }
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div className="text-center mb-4">
        <h4 className="mb-2">Quick Content Generator</h4>
        <p className="text-muted">
          Upload images and fill in details to quickly generate compelling
          content
        </p>
      </div>

      {/* Form Card */}
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="card-title mb-0">Product Images & Details</h5>
        </div>
        <div className="card-body">
          {/* Image Upload */}
          <div className="mb-4">
            <label className="form-label">
              Upload Product Images {formData.content_channel === "Video" && <span className="text-danger">*</span>}
              {formData.content_channel === "Video" && (
                <small className="text-muted d-block mt-1">
                  Required for video generation
                </small>
              )}
              {formData.content_channel === "Image" && (
                <small className="text-muted d-block mt-1">
                  Optional for image generation
                </small>
              )}
            </label>
            <div className="mb-3">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="form-control"
                id="imageUpload"
              />
              <small className="form-text text-muted">
                Upload one or more product images for better generation results
              </small>
            </div>

            {/* Image Previews */}
            {uploadedImages.length > 0 && (
              <div className="row g-3">
                {uploadedImages.map((image, index) => (
                  <div key={index} className="col-6 col-md-3">
                    <div className="position-relative">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`Upload ${index + 1}`}
                        className="img-fluid rounded border"
                        style={{
                          height: "120px",
                          width: "100%",
                          objectFit: "cover",
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-danger btn-sm position-absolute top-0 end-0 m-1 rounded-circle"
                        style={{ width: "28px", height: "28px", padding: "0" }}
                        onClick={() => removeImage(index)}
                      >
                        ×
                      </button>
                    </div>
                    <small className="text-muted d-block mt-1 text-truncate">
                      {image.name}
                    </small>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="row g-3 mb-4">
            <div className="col-12">
              <label className="form-label">
                Product Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                value={formData.product_name}
                onChange={(e) =>
                  handleInputChange("product_name", e.target.value)
                }
                placeholder="Enter product name"
                required
              />
            </div>

            <div className="col-12">
              <label className="form-label">
                Short Description <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                value={formData.short_description}
                onChange={(e) =>
                  handleInputChange("short_description", e.target.value)
                }
                placeholder="Brief product description"
                required
              />
            </div>

            <div className="col-12">
              <label className="form-label">
                Long Description <span className="text-danger">*</span>
              </label>
              <textarea
                className="form-control"
                rows="4"
                value={formData.long_description}
                onChange={(e) =>
                  handleInputChange("long_description", e.target.value)
                }
                placeholder="Detailed product description"
                required
              />
            </div>
          </div>

          {/* Campaign Settings */}
          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <label className="form-label">Campaign Objective</label>
              <select
                className="form-select"
                value={formData.campaign_objective}
                onChange={(e) =>
                  handleInputChange("campaign_objective", e.target.value)
                }
              >
                <option value="Product Launch">Product Launch</option>
                <option value="Brand Awareness">Brand Awareness</option>
                <option value="Sales">Sales</option>
                <option value="Engagement">Engagement</option>
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label">Content Channel</label>
              <select
                className="form-select"
                value={formData.content_channel}
                onChange={(e) =>
                  handleInputChange("content_channel", e.target.value)
                }
              >
                <option value="Image">Image</option>
                <option value="Video">Video</option>
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label">Tone</label>
              <select
                className="form-select"
                value={formData.tone}
                onChange={(e) => handleInputChange("tone", e.target.value)}
              >
                <option value="Emotional">Emotional</option>
                <option value="Professional">Professional</option>
                <option value="Casual">Casual</option>
                <option value="Humorous">Humorous</option>
                <option value="Inspirational">Inspirational</option>
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label">Call to Action</label>
              <select
                className="form-select"
                value={formData.call_to_action}
                onChange={(e) =>
                  handleInputChange("call_to_action", e.target.value)
                }
              >
                <option value="Let nature lead">Let nature lead</option>
                <option value="Shop now">Shop now</option>
                <option value="Learn more">Learn more</option>
                <option value="Get started">Get started</option>
                <option value="Try it now">Try it now</option>
              </select>
            </div>

            {formData.content_channel !== "Video" && (
              <div className="col-md-6">
                <label className="form-label">Number of Variants</label>
                <input
                  type="number"
                  className="form-control"
                  min="1"
                  max="10"
                  value={
                    formData.number_of_variants === ""
                      ? ""
                      : formData.number_of_variants
                  }
                  onChange={(e) =>
                    handleInputChange("number_of_variants", e.target.value)
                  }
                />
                <small className="form-text text-muted">
                  Between 1 and 10 variants
                </small>
              </div>
            )}
          </div>

          {/* Generate Button */}
          <button
            className="btn btn-primary w-100 btn-lg"
            onClick={handleGenerateContent}
            disabled={
              isGenerating ||
              !formData.product_name ||
              !formData.short_description ||
              !formData.long_description
            }
          >
            {isGenerating ? (
              <>
                <Icon
                  icon="solar:refresh-bold"
                  width="20"
                  height="20"
                  className="me-2"
                />
                Generating Content...
              </>
            ) : (
              <>
                <Icon
                  icon="solar:magic-stick-3-bold"
                  width="20"
                  height="20"
                  className="me-2"
                />
                Generate Content
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generation Status */}
      {generationResult && (
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="card-title mb-0 d-flex align-items-center">
              {getStatusIcon(generationResult.status)}
              <span className="ms-2">Generation Status</span>
            </h5>
          </div>
          <div className="card-body">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div>
                <p className="mb-1 fw-medium">
                  Job ID: {generationResult.job_id}
                </p>
                <p className="mb-0 text-muted small">
                  Status: {generationResult.status}
                </p>
              </div>
              <span
                className={`badge ${getStatusBadgeClass(
                  generationResult.status
                )}`}
              >
                {generationResult.status}
              </span>
            </div>

            {/* Progress Bar */}
            {(generationResult.status === "processing" ||
              generationResult.status === "generating") && (
              <div className="mb-3">
                <div className="progress mb-2" style={{ height: "12px" }}>
                  <div
                    className="progress-bar progress-bar-striped progress-bar-animated"
                    role="progressbar"
                    style={{ width: `${generationResult.progress}%` }}
                    aria-valuenow={generationResult.progress}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  />
                </div>
                <small className="text-muted">
                  {(() => {
                    const planType = generationResult.result?.plan_type || "graphic";
                    if (planType === "video") {
                      const summary = generationResult.result?.generation_summary || {};
                      const successful = summary.successful_clips || 0;
                      const total = summary.total_clips || 3;
                      if (successful === 0) {
                        return "Planning video clips...";
                      } else if (successful < total) {
                        return `Generating clip ${successful + 1}/${total}...`;
                      } else {
                        return "Finalizing video...";
                      }
                    }
                    return `${generationResult.progress}% complete`;
                  })()}
                </small>
              </div>
            )}

            {/* Completed Actions */}
            {generationResult.status === "completed" && (
              <div className="d-flex gap-2">
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => handleViewResults(generationResult.job_id)}
                >
                  <Icon
                    icon="solar:eye-bold"
                    width="16"
                    height="16"
                    className="me-1"
                  />
                  View Results
                </button>
                <button className="btn btn-sm btn-outline-secondary">
                  <Icon
                    icon="solar:download-bold"
                    width="16"
                    height="16"
                    className="me-1"
                  />
                  Download
                </button>
              </div>
            )}

            {/* Error Display */}
            {generationResult.status === "failed" && generationResult.error && (
              <div className="alert alert-danger mb-0">
                <Icon
                  icon="solar:danger-circle-bold"
                  width="18"
                  height="18"
                  className="me-2"
                />
                <strong>Error:</strong> {generationResult.error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results Modal */}
      {selectedJobId && (
        <GenerationResultsModal
          jobId={selectedJobId}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedJobId(null);
          }}
        />
      )}
    </>
  );
}
