"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react/dist/iconify.js";
import Breadcrumb from "@/components/Breadcrumb";
import SidebarPermissionGuard from "@/components/SidebarPermissionGuard";
import GenerationResultsModal from "@/components/GenerationResultsModal";
import ReviewPromptsModal from "@/components/ReviewPromptsModal";
import { useBrief } from "@/contexts/BriefContext";
import { useGeneration } from "@/contexts/GenerationContext";
import {
  getGeneratedContent,
  getGenerationJobs,
  quickGenerate,
  uploadImages,
  getGenerationStatus,
} from "@/services/contentGenerationApi";

export default function CreateContentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [activeTab, setActiveTab] = useState("create");
  const [uploadedImages, setUploadedImages] = useState([]);
  const [imageUrls, setImageUrls] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formError, setFormError] = useState("");
  const [generationResult, setGenerationResult] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewJobId, setReviewJobId] = useState(null);
  const [generationJobs, setGenerationJobs] = useState([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [formData, setFormData] = useState({
    productName: "",
    shortDescription: "",
    longDescription: "",
    objective: "",
    channel: "",
    tone: "",
    cta: "",
    variantGoal: 4,
  });

  const [generatedContent, setGeneratedContent] = useState([]);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  // Fetch generated content from API
  const fetchGeneratedContent = useCallback(async () => {
    setIsLoadingContent(true);
    try {
      const response = await getGeneratedContent();
      setGeneratedContent(response.content || []);
    } catch (error) {
      console.error("Error fetching generated content:", error);
      setGeneratedContent([]);
    } finally {
      setIsLoadingContent(false);
    }
  }, []);

  // Fetch content on component mount
  useEffect(() => {
    fetchGeneratedContent();
  }, [fetchGeneratedContent]);

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files || []);
    
    // Check if adding these files would exceed the 3-image limit
    if (uploadedImages.length + files.length > 3) {
      alert(`You can only upload a maximum of 3 images. You currently have ${uploadedImages.length} images uploaded.`);
      return;
    }
    
    const newUrls = files.map((file) => URL.createObjectURL(file));

    setUploadedImages((prev) => [...prev, ...files]);
    setImageUrls((prev) => [...prev, ...newUrls]);
  };

  const removeImage = (index) => {
    // Revoke the object URL to prevent memory leaks
    URL.revokeObjectURL(imageUrls[index]);
    
    // Remove from both arrays
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleGenerate = async () => {
    // Clear previous errors
    setFormError("");

    // Validate required fields
    if (
      !formData.productName ||
      !formData.shortDescription ||
      !formData.longDescription
    ) {
      setFormError(
        "Please fill in the required fields: Product Name, Short Description, and Long Description"
      );
      return;
    }

    setIsGenerating(true);
    setGenerationResult(null);

    try {
      // Upload images first
      const imageUrls = [];
      for (const image of uploadedImages) {
        try {
          const response = await uploadImages([image]);
          imageUrls.push(...response.urls);
        } catch (error) {
          console.error("Error uploading image:", error);
        }
      }

      // Map form values to Python backend expected values
      const mapObjective = (objective) => {
        const mapping = {
          "Product Launch": "launch",
          "Drive Sales": "conv",
          "Brand Awareness": "view",
          Remarketing: "remarket",
          Retention: "retention",
        };
        return mapping[objective] || "launch";
      };

      const mapTone = (tone) => {
        const mapping = {
          Warm: "warm",
          Clinical: "clinical",
          Playful: "playful",
          Premium: "premium",
          Street: "street",
          Emotional: "emotional",
          Poetic: "poetic",
        };
        return mapping[tone] || "emotional";
      };

      // Start generation
      const response = await quickGenerate({
        product_name: formData.productName,
        short_description: formData.shortDescription,
        long_description: formData.longDescription,
        campaign_objective: mapObjective(
          formData.objective || "Product Launch"
        ),
        content_channel: formData.channel || "Instagram Reels",
        tone: mapTone(formData.tone || "Emotional"),
        call_to_action: formData.cta || "Let nature lead",
        number_of_variants: formData.variantGoal,
        uploaded_images: imageUrls,
      });

      const jobId = response.job_id;
      setGenerationResult({
        job_id: jobId,
        status: "pending",
        progress: 0,
      });

      // Poll for status updates
      const pollInterval = setInterval(async () => {
        try {
          const status = await getGenerationStatus(jobId);
          setGenerationResult({
            job_id: jobId,
            status: status.status,
            progress: status.progress,
            result: status.result,
            error: status.error,
          });

          // Check for pending_review status
          if (status.status === "pending_review") {
            clearInterval(pollInterval);
            setIsGenerating(false);
            // Open review modal
            setReviewJobId(jobId);
            setIsReviewModalOpen(true);
          } else if (status.status === "completed" || status.status === "failed") {
            clearInterval(pollInterval);
            setIsGenerating(false);
            if (status.status === "completed") {
              setActiveTab("prompts");
              // Refresh the jobs list to show the new completed job
              fetchGenerationJobs();
            }
          }
        } catch (error) {
          console.error("Error checking generation status:", error);
          clearInterval(pollInterval);
          setIsGenerating(false);
        }
      }, 2000);
    } catch (error) {
      console.error("Error generating content:", error);
      setIsGenerating(false);
      setFormError(
        error instanceof Error ? error.message : "Generation failed"
      );
    }
  };

  const handleViewResults = async (jobId) => {
    try {
      setSelectedJobId(jobId);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error opening results modal:", error);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedJobId(null);
  };

  // Set default values
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      objective: "Product Launch",
      channel: "Instagram Reels",
      tone: "Emotional",
      cta: "Let nature lead",
    }));
  }, []);

  // Fetch generation jobs
  const fetchGenerationJobs = async () => {
    setIsLoadingJobs(true);
    try {
      const response = await getGenerationJobs();
      setGenerationJobs(response.jobs);
    } catch (error) {
      console.error("Error fetching generation jobs:", error);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  // Load generation jobs when component mounts and when activeTab changes to prompts
  useEffect(() => {
    if (activeTab === "prompts") {
      fetchGenerationJobs();
    }
  }, [activeTab]);

  // Cleanup object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      imageUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [imageUrls]);

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return (
          <Icon
            icon="solar:check-circle-bold"
            width="16"
            height="16"
            className="text-success"
          />
        );
      case "pending_review":
        return (
          <Icon
            icon="solar:file-text-bold"
            width="16"
            height="16"
            className="text-warning"
          />
        );
      case "edited":
        return (
          <Icon
            icon="solar:edit-bold"
            width="16"
            height="16"
            className="text-info"
          />
        );
      case "generating":
        return (
          <Icon
            icon="solar:clock-circle-bold"
            width="16"
            height="16"
            className="text-primary"
          />
        );
      case "pending":
        return (
          <Icon
            icon="solar:hourglass-bold"
            width="16"
            height="16"
            className="text-warning"
          />
        );
      case "failed":
        return (
          <Icon
            icon="solar:danger-circle-bold"
            width="16"
            height="16"
            className="text-danger"
          />
        );
      default:
        return (
          <Icon
            icon="solar:danger-circle-bold"
            width="16"
            height="16"
            className="text-muted"
          />
        );
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "completed":
        return <span className="badge bg-success">Completed</span>;
      case "pending_review":
        return <span className="badge bg-warning">Awaiting Review</span>;
      case "edited":
        return <span className="badge bg-info">Prompts Edited</span>;
      case "generating":
        return <span className="badge bg-primary">Generating</span>;
      case "pending":
        return <span className="badge bg-secondary">Pending</span>;
      case "failed":
        return <span className="badge bg-danger">Failed</span>;
      default:
        return <span className="badge bg-secondary">{status}</span>;
    }
  };

  const downloadImage = (imageData, filename) => {
    // Implementation for downloading images
    console.log("Download image:", filename);
  };

  return (
    <SidebarPermissionGuard requiredSidebar="createContent">
      {/* Breadcrumb */}
      <Breadcrumb title="Create Content" />

      <div className="container-fluid">
        {/* Tabs */}
        <div className="mb-3">
          <ul
            className="nav nav-tabs"
            role="tablist"
            style={{ borderBottom: "1px solid #e5e7eb" }}
          >
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === "create" ? "active" : ""}`}
                onClick={() => setActiveTab("create")}
                type="button"
                style={{
                  backgroundColor: activeTab === "create" ? "#f8fafc" : "transparent",
                  border: "none",
                  borderBottom: activeTab === "create" ? "2px solid #6b7280" : "2px solid transparent",
                  color: activeTab === "create" ? "#374151" : "#6b7280",
                  fontWeight: activeTab === "create" ? "500" : "400",
                  borderRadius: "0",
                  padding: "12px 20px",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== "create") {
                    e.target.style.backgroundColor = "#f9fafb";
                    e.target.style.color = "#4b5563";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== "create") {
                    e.target.style.backgroundColor = "transparent";
                    e.target.style.color = "#6b7280";
                  }
                }}
              >
                <Icon
                  icon="solar:upload-bold"
                  width="16"
                  height="16"
                  className="me-2"
                />
                Create Content
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === "prompts" ? "active" : ""}`}
                onClick={() => setActiveTab("prompts")}
                type="button"
                style={{
                  backgroundColor: activeTab === "prompts" ? "#f8fafc" : "transparent",
                  border: "none",
                  borderBottom: activeTab === "prompts" ? "2px solid #6b7280" : "2px solid transparent",
                  color: activeTab === "prompts" ? "#374151" : "#6b7280",
                  fontWeight: activeTab === "prompts" ? "500" : "400",
                  borderRadius: "0",
                  padding: "12px 20px",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== "prompts") {
                    e.target.style.backgroundColor = "#f9fafb";
                    e.target.style.color = "#4b5563";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== "prompts") {
                    e.target.style.backgroundColor = "transparent";
                    e.target.style.color = "#6b7280";
                  }
                }}
              >
                <Icon
                  icon="solar:magic-stick-3-bold"
                  width="16"
                  height="16"
                  className="me-2"
                />
                Generated Prompts
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === "content" ? "active" : ""}`}
                onClick={() => setActiveTab("content")}
                type="button"
                style={{
                  backgroundColor: activeTab === "content" ? "#f8fafc" : "transparent",
                  border: "none",
                  borderBottom: activeTab === "content" ? "2px solid #6b7280" : "2px solid transparent",
                  color: activeTab === "content" ? "#374151" : "#6b7280",
                  fontWeight: activeTab === "content" ? "500" : "400",
                  borderRadius: "0",
                  padding: "12px 20px",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== "content") {
                    e.target.style.backgroundColor = "#f9fafb";
                    e.target.style.color = "#4b5563";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== "content") {
                    e.target.style.backgroundColor = "transparent";
                    e.target.style.color = "#6b7280";
                  }
                }}
              >
                <Icon
                  icon="solar:video-library-bold"
                  width="16"
                  height="16"
                  className="me-2"
                />
                Generated Content
              </button>
            </li>
          </ul>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {/* Create Content Tab */}
          {activeTab === "create" && (
            <div className="tab-pane fade show active">
              <div className="card">
                <div className="card-header border-bottom p-24">
                  <h5 className="card-title mb-2">Upload Images & Create Brief</h5>
                  <p className="card-subtitle text-muted mb-0">
                    Upload your product images and provide a brief description to generate content
                  </p>
                </div>
                <div className="card-body p-24">
                  {/* Image Upload */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold mb-2 d-block">Source Images</label>
                    
                    {uploadedImages.length === 0 ? (
                      // Empty state - drag and drop area
                      <div className="border border-dashed border-secondary rounded-3 p-24 text-center bg-light position-relative" style={{ minHeight: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="d-flex flex-column align-items-center">
                          <div className="bg-secondary rounded-circle p-3 mb-3">
                            <Icon
                              icon="solar:upload-bold"
                              width="24"
                              height="24"
                              className="text-white"
                            />
                          </div>
                          <h6 className="fw-semibold text-dark mb-2">Upload images</h6>
                          <p className="text-muted mb-3">Drag and drop or click to select</p>
                          <div className="text-muted small">
                            <span>Supports: JPG, PNG, GIF, WebP</span>
                            <span className="mx-2">•</span>
                            <span>Max 3 images</span>
                            <span className="mx-2">•</span>
                            <span>Max 4MB per image</span>
                          </div>
                        </div>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="position-absolute opacity-0"
                          style={{ 
                            top: 0, 
                            left: 0, 
                            width: '100%', 
                            height: '100%', 
                            cursor: 'pointer',
                            zIndex: 1
                          }}
                          data-max-files="3"
                        />
                      </div>
                    ) : (
                      // Uploaded state - image thumbnails with counter
                      <div>
                        <div className="d-flex gap-3 mb-3">
                          {uploadedImages.map((file, index) => (
                            <div
                              key={index}
                              className="position-relative"
                              style={{ width: '120px', height: '120px' }}
                            >
                              <img
                                src={imageUrls[index]}
                                alt={`Upload ${index + 1}`}
                                className="w-100 h-100 rounded-3"
                                style={{ objectFit: "cover" }}
                              />
                              <button
                                type="button"
                                className="btn btn-danger btn-sm position-absolute top-0 end-0 m-2 rounded-circle"
                                style={{ width: "24px", height: "24px", padding: "0", fontSize: "12px" }}
                                onClick={() => removeImage(index)}
                                title="Remove image"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          
                          {/* Add more images button */}
                          {uploadedImages.length < 3 && (
                            <label
                              className="border border-dashed border-secondary rounded-3 d-flex align-items-center justify-content-center bg-light"
                              style={{ width: '120px', height: '120px', cursor: 'pointer' }}
                            >
                              <Icon
                                icon="solar:add-circle-bold"
                                width="32"
                                height="32"
                                className="text-secondary"
                              />
                              <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="d-none"
                                data-max-files="3"
                              />
                            </label>
                          )}
                        </div>
                        <div className="text-center">
                          <span className="text-muted small">
                            {uploadedImages.length} of 3 images uploaded
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Brief Form */}
                  <div>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Product Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g., Skin Microbiome Shampoo"
                        value={formData.productName}
                        onChange={(e) =>
                          handleInputChange("productName", e.target.value)
                        }
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold">Short Description *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Brief product description (max 200 characters)"
                        value={formData.shortDescription}
                        onChange={(e) =>
                          handleInputChange("shortDescription", e.target.value)
                        }
                        maxLength={200}
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold">Long Description *</label>
                      <textarea
                        className="form-control"
                        rows="4"
                        placeholder="Detailed product description, benefits, and target audience..."
                        value={formData.longDescription}
                        onChange={(e) =>
                          handleInputChange("longDescription", e.target.value)
                        }
                      ></textarea>
                    </div>

                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label fw-semibold">
                            Campaign Objective
                          </label>
                          <select
                            className="form-select"
                            value={formData.objective}
                            onChange={(e) =>
                              handleInputChange("objective", e.target.value)
                            }
                          >
                            <option value="Product Launch">
                              Product Launch
                            </option>
                            <option value="Drive Sales">Drive Sales</option>
                            <option value="Brand Awareness">
                              Brand Awareness
                            </option>
                            <option value="Remarketing">Remarketing</option>
                            <option value="Retention">Retention</option>
                          </select>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label fw-semibold">Content Channel</label>
                          <select
                            className="form-select"
                            value={formData.channel}
                            onChange={(e) =>
                              handleInputChange("channel", e.target.value)
                            }
                          >
                            <option value="Instagram Reels">
                              Instagram Reels
                            </option>
                            <option value="YouTube Shorts">
                              YouTube Shorts
                            </option>
                            <option value="Instagram Carousel">
                              Instagram Carousel
                            </option>
                            <option value="Product Page Hero">
                              Product Page Hero
                            </option>
                            <option value="Facebook Ads">Facebook Ads</option>
                            <option value="Google Ads">Google Ads</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label fw-semibold">Tone</label>
                          <select
                            className="form-select"
                            value={formData.tone}
                            onChange={(e) =>
                              handleInputChange("tone", e.target.value)
                            }
                          >
                            <option value="Warm">Warm</option>
                            <option value="Clinical">Clinical</option>
                            <option value="Playful">Playful</option>
                            <option value="Premium">Premium</option>
                            <option value="Street">Street</option>
                            <option value="Emotional">Emotional</option>
                            <option value="Poetic">Poetic</option>
                          </select>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label fw-semibold">Call to Action</label>
                          <select
                            className="form-select"
                            value={formData.cta}
                            onChange={(e) =>
                              handleInputChange("cta", e.target.value)
                            }
                          >
                            <option value="Buy now">Buy now</option>
                            <option value="Try risk-free">Try risk-free</option>
                            <option value="Learn more">Learn more</option>
                            <option value="Shop the kit">Shop the kit</option>
                            <option value="Let nature lead">
                              Let nature lead
                            </option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold">Number of Variants</label>
                      <input
                        type="number"
                        className="form-control"
                        min="1"
                        max="10"
                        value={formData.variantGoal}
                        onChange={(e) =>
                          handleInputChange("variantGoal", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  {/* Error Message */}
                  {formError && (
                    <div className="alert alert-danger mb-3">
                      <p className="mb-0">{formError}</p>
                    </div>
                  )}

                  <button
                    className="btn btn-primary btn-lg w-100"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <Icon
                          icon="solar:refresh-bold"
                          width="16"
                          height="16"
                          className="me-2 spinner"
                        />
                        Generating Content...
                      </>
                    ) : (
                      <>
                        <Icon
                          icon="solar:magic-stick-3-bold"
                          width="16"
                          height="16"
                          className="me-2"
                        />
                        Generate Content
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Generated Prompts Tab */}
          {activeTab === "prompts" && (
            <div className="tab-pane fade show active">
              <div className="card">
                <div className="card-header border-bottom p-24">
                  <h5 className="card-title mb-2">Generated Prompts</h5>
                  <p className="card-subtitle text-muted mb-0">
                    AI-generated prompts based on your product images and brief
                  </p>
                </div>
                <div className="card-body p-24">
                  <div className="mb-4">
                    {/* Show loading state */}
                    {isLoadingJobs && (
                      <div className="d-flex align-items-center justify-content-center p-4">
                        <Icon
                          icon="solar:refresh-bold"
                          width="24"
                          height="24"
                          className="text-primary me-2"
                        />
                        <span className="text-muted">
                          Loading generation history...
                        </span>
                      </div>
                    )}

                    {/* Show generation status if generating */}
                    {generationResult &&
                      generationResult.status === "processing" && (
                        <div className="border rounded p-3 mb-3">
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <div className="d-flex align-items-center gap-2">
                              <Icon
                                icon="solar:package-bold"
                                width="16"
                                height="16"
                                className="text-muted"
                              />
                              <span className="fw-medium">
                                Generating content...
                              </span>
                              <Icon
                                icon="solar:refresh-bold"
                                width="16"
                                height="16"
                                className="text-primary"
                              />
                            </div>
                          </div>
                          <div className="mb-2">
                            <div className="progress" style={{ height: "8px" }}>
                              <div
                                className="progress-bar bg-primary"
                                style={{
                                  width: `${generationResult.progress}%`,
                                }}
                              ></div>
                            </div>
                            <p className="small text-muted mb-0">
                              {generationResult.progress}% complete
                            </p>
                          </div>
                        </div>
                      )}

                    {/* Show completed generation */}
                    {generationResult &&
                      generationResult.status === "completed" && (
                        <div className="border rounded p-3 mb-3">
                          <div className="d-flex align-items-start justify-content-between mb-2">
                            <div className="d-flex align-items-center gap-2">
                              <Icon
                                icon="solar:package-bold"
                                width="16"
                                height="16"
                                className="text-muted"
                              />
                              <span className="fw-medium">
                                {formData.productName}
                              </span>
                              <Icon
                                icon="solar:check-circle-bold"
                                width="16"
                                height="16"
                                className="text-success"
                              />
                            </div>
                            <div className="d-flex align-items-center gap-2">
                              <button
                                onClick={() =>
                                  handleViewResults(generationResult.job_id)
                                }
                                className="btn btn-sm btn-outline-primary"
                              >
                                <Icon
                                  icon="solar:eye-bold"
                                  width="14"
                                  height="14"
                                  className="me-1"
                                />
                                View Results
                              </button>
                            </div>
                          </div>
                          <p className="text-muted bg-light p-3 rounded mb-0">
                            Content generation completed! Click "View Results"
                            to see the generated prompts and plans.
                          </p>
                        </div>
                      )}

                    {/* Show error if failed */}
                    {generationResult &&
                      generationResult.status === "failed" && (
                        <div className="border border-danger rounded p-3 mb-3 bg-danger bg-opacity-10">
                          <div className="d-flex align-items-start justify-content-between mb-2">
                            <div className="d-flex align-items-center gap-2">
                              <Icon
                                icon="solar:package-bold"
                                width="16"
                                height="16"
                                className="text-danger"
                              />
                              <span className="fw-medium text-danger">
                                Generation Failed
                              </span>
                              <Icon
                                icon="solar:danger-circle-bold"
                                width="16"
                                height="16"
                                className="text-danger"
                              />
                            </div>
                          </div>
                          <p className="text-danger bg-danger bg-opacity-10 p-3 rounded mb-0">
                            {generationResult.error ||
                              "An error occurred during generation. Please try again."}
                          </p>
                        </div>
                      )}

                    {/* Show real generation jobs */}
                    {!isLoadingJobs &&
                      generationJobs.length > 0 &&
                      generationJobs.map((job) => (
                        <div
                          key={job.job_id}
                          className="border rounded p-3 mb-3"
                        >
                          <div className="d-flex align-items-start justify-content-between mb-2">
                            <div className="d-flex align-items-center gap-2">
                              <Icon
                                icon="solar:package-bold"
                                width="16"
                                height="16"
                                className="text-muted"
                              />
                              <span className="fw-medium">
                                {job.product_name}
                              </span>
                              {getStatusIcon(job.status)}
                              <span className="badge bg-secondary small">
                                {job.plan_type}
                              </span>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                              <Icon
                                icon="solar:calendar-bold"
                                width="16"
                                height="16"
                                className="text-muted"
                              />
                              <span className="small text-muted">
                                {new Date(job.created_at).toLocaleDateString()}{" "}
                                at{" "}
                                {new Date(job.created_at).toLocaleTimeString()}
                              </span>
                              {job.status === "pending_review" && (
                                <button
                                  onClick={() => {
                                    setReviewJobId(job.job_id);
                                    setIsReviewModalOpen(true);
                                  }}
                                  className="btn btn-sm btn-warning"
                                >
                                  <Icon
                                    icon="solar:file-text-bold"
                                    width="14"
                                    height="14"
                                    className="me-1"
                                  />
                                  Review Prompts
                                </button>
                              )}
                              {job.status === "completed" && (
                                <button
                                  onClick={() => handleViewResults(job.job_id)}
                                  className="btn btn-sm btn-outline-primary"
                                >
                                  <Icon
                                    icon="solar:eye-bold"
                                    width="14"
                                    height="14"
                                    className="me-1"
                                  />
                                  View Prompts
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="text-muted bg-light p-3 rounded">
                            <p className="small mb-0">
                              <strong>Status:</strong> {getStatusBadge(job.status)}
                              {job.status === "completed" &&
                                ' - Click "View Prompts" to see generated content'}
                              {job.status === "pending_review" &&
                                ' - Click "Review Prompts" to edit before generating images'}
                              {job.status === "generating" &&
                                ` - Generating images in progress`}
                              {job.status === "pending" &&
                                ` - Generating prompts`}
                              {job.status === "failed" &&
                                " - Generation failed"}
                            </p>
                          </div>
                        </div>
                      ))}

                    {/* Show message if no generations */}
                    {!isLoadingJobs &&
                      generationJobs.length === 0 &&
                      !generationResult && (
                        <div className="text-center p-4 text-muted">
                          <Icon
                            icon="solar:package-bold"
                            width="48"
                            height="48"
                            className="text-muted mb-3"
                          />
                          <p className="h5 mb-2">No generated prompts yet</p>
                          <p className="small">
                            Create your first content generation to see prompts
                            here
                          </p>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Generated Content Tab */}
          {activeTab === "content" && (
            <div className="tab-pane fade show active">
              <div className="card">
                <div className="card-header border-bottom p-24">
                  <h5 className="card-title mb-2">Generated Content</h5>
                  <p className="card-subtitle text-muted mb-0">
                    View and manage your generated content organized by product and time
                  </p>
                </div>
                <div className="card-body p-24">
                  {isLoadingContent ? (
                    <div className="d-flex align-items-center justify-content-center p-4">
                      <Icon
                        icon="solar:refresh-bold"
                        width="24"
                        height="24"
                        className="text-muted me-2"
                      />
                      <span className="text-muted">
                        Loading generated content...
                      </span>
                    </div>
                  ) : (
                    <div className="mb-4">
                      {/* Group by product */}
                      {Array.from(
                        new Set(generatedContent.map((item) => item.product))
                      ).map((product) => (
                        <div key={product} className="mb-4">
                          <div className="d-flex align-items-center gap-2 mb-3">
                            <Icon
                              icon="solar:package-bold"
                              width="20"
                              height="20"
                              className="text-muted"
                            />
                            <h6 className="mb-0">{product}</h6>
                            <span className="badge bg-secondary small">
                              {
                                generatedContent.filter(
                                  (item) => item.product === product
                                ).length
                              }{" "}
                              items
                            </span>
                          </div>

                          <div className="row g-3">
                            {generatedContent
                              .filter((item) => item.product === product)
                              .map((item) => (
                                <div key={item.id} className="col-md-4">
                                  <div className="card">
                                    <div
                                      className="position-relative"
                                      style={{
                                        aspectRatio: "16/9",
                                        backgroundColor: "#f8f9fa",
                                      }}
                                    >
                                      {item.image_url || item.local_url ? (
                                        <img
                                          src={item.image_url || item.local_url}
                                          alt={item.title}
                                          className="card-img-top"
                                          style={{
                                            height: "100%",
                                            objectFit: "cover",
                                          }}
                                          onError={(e) => {
                                            // If external URL failed, try local URL
                                            if (
                                              e.target.src.includes(
                                                "cdn-magnific.freepik.com"
                                              ) &&
                                              item.local_url
                                            ) {
                                              e.target.src = `http://localhost:8000${item.local_url}`;
                                            }
                                          }}
                                        />
                                      ) : (
                                        <div className="d-flex align-items-center justify-content-center h-100">
                                          {item.type === "video" ? (
                                            <Icon
                                              icon="solar:video-library-bold"
                                              width="32"
                                              height="32"
                                              className="text-muted"
                                            />
                                          ) : (
                                            <Icon
                                              icon="solar:gallery-bold"
                                              width="32"
                                              height="32"
                                              className="text-muted"
                                            />
                                          )}
                                        </div>
                                      )}
                                      {/* Status overlay */}
                                      <div className="position-absolute top-0 end-0 m-2">
                                        {getStatusBadge(item.status)}
                                      </div>
                                    </div>
                                    <div className="card-body">
                                      <div className="d-flex align-items-center justify-content-between mb-2">
                                        <h6 className="card-title small mb-0">
                                          {item.title}
                                        </h6>
                                        {(item.image_url || item.local_url) && (
                                          <button
                                            className="btn btn-sm btn-outline-secondary"
                                            onClick={() =>
                                              downloadImage(
                                                item,
                                                `${item.title.replace(
                                                  /\s+/g,
                                                  "_"
                                                )}.jpg`
                                              )
                                            }
                                          >
                                            <Icon
                                              icon="solar:download-bold"
                                              width="12"
                                              height="12"
                                            />
                                          </button>
                                        )}
                                      </div>
                                      <div className="d-flex align-items-center gap-2 small text-muted">
                                        <Icon
                                          icon="solar:calendar-bold"
                                          width="12"
                                          height="12"
                                        />
                                        {new Date(
                                          item.timestamp
                                        ).toLocaleDateString()}
                                      </div>
                                      {item.freepik_id && (
                                        <div className="d-flex align-items-center gap-2 small text-primary mt-1">
                                          <span>Generated with Freepik</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}

                      {/* No content message */}
                      {generatedContent.length === 0 && (
                        <div className="text-center p-4 text-muted">
                          <Icon
                            icon="solar:package-bold"
                            width="48"
                            height="48"
                            className="text-muted mb-3"
                          />
                          <p className="h5 mb-2">No generated content yet</p>
                          <p className="small">
                            Create your first content generation to see results
                            here
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Generation Results Modal */}
      {selectedJobId && (
        <GenerationResultsModal
          jobId={selectedJobId}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}

      {/* Review Prompts Modal */}
      {reviewJobId && (
        <ReviewPromptsModal
          jobId={reviewJobId}
          isOpen={isReviewModalOpen}
          onClose={() => {
            setIsReviewModalOpen(false);
            setReviewJobId(null);
          }}
          onApproveSuccess={(jobId) => {
            // Refresh the jobs list
            fetchGenerationJobs();
          }}
        />
      )}
    </SidebarPermissionGuard>
  );
}
