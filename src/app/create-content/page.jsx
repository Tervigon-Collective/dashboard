"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react/dist/iconify.js";
import Breadcrumb from "@/components/Breadcrumb";
import SidebarPermissionGuard from "@/components/SidebarPermissionGuard";
import GenerationResultsModal from "@/components/GenerationResultsModal";
import ReviewPromptsModal from "@/components/ReviewPromptsModal";
import BrandkitSelector from "@/components/BrandkitSelector";
import BrandkitFormModal from "@/components/BrandkitFormModal";
import BrandkitManagementModal from "@/components/BrandkitManagementModal";
import BrandkitLogoUpload from "@/components/BrandkitLogoUpload";
import { useBrief } from "@/contexts/BriefContext";
import { useGeneration } from "@/contexts/GenerationContext";
import { useBrandkit } from "@/contexts/BrandkitContext";
import {
  getGeneratedContent,
  getGenerationJobs,
  quickGenerate,
  uploadImages,
  getGenerationStatus,
  editImage,
  getGenerationResults,
  getBrandkit,
} from "@/services/contentGenerationApi";
import config from "@/config";

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
    variantGoal: 1,
  });

  // Brandkit modal states
  const [showBrandkitFormModal, setShowBrandkitFormModal] = useState(false);
  const [showBrandkitManagementModal, setShowBrandkitManagementModal] = useState(false);
  const [showLogoUploadModal, setShowLogoUploadModal] = useState(false);
  const [editingBrandkit, setEditingBrandkit] = useState(null);
  const [uploadingLogoBrandkit, setUploadingLogoBrandkit] = useState(null);

  // Get brandkit context
  const { activeBrandkit, refresh: refreshBrandkit } = useBrandkit();

  const [generatedContent, setGeneratedContent] = useState([]);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [contentTypeFilter, setContentTypeFilter] = useState("all"); // "all", "image", "video"
  const [playingVideoId, setPlayingVideoId] = useState(null); // Track which video is playing
  
  // State for edit functionality
  const [editingImageId, setEditingImageId] = useState(null);
  const [editPrompts, setEditPrompts] = useState({});
  const [isSendingEdit, setIsSendingEdit] = useState(false);
  const [editErrors, setEditErrors] = useState({});

  // Helper function to normalize preview URLs
  const normalizePreviewUrl = (url) => {
    if (!url) return null;
    // If it's already an absolute URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // If it starts with /api/content/preview, convert to Python backend URL
    if (url.startsWith('/api/content/preview')) {
      return `${config.pythonApi.baseURL}${url}`;
    }
    // If it's a relative path, prepend Python backend base URL
    if (url.startsWith('/')) {
      return `${config.pythonApi.baseURL}${url}`;
    }
    // Otherwise return as is (might be a full URL without protocol)
    return url;
  };

  // Helper function to normalize video URLs
  const normalizeVideoUrl = (url) => {
    if (!url) return null;
    // If it's already an absolute URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // If it starts with /api/content/video, convert to Python backend URL
    if (url.startsWith('/api/content/video')) {
      return `${config.pythonApi.baseURL}${url}`;
    }
    // If it's a relative path, prepend Python backend base URL
    if (url.startsWith('/')) {
      return `${config.pythonApi.baseURL}${url}`;
    }
    // Otherwise return as is
    return url;
  };

  // Fetch generated content from API
  const fetchGeneratedContent = useCallback(async () => {
    setIsLoadingContent(true);
    try {
      const response = await getGeneratedContent();
      // Normalize preview URLs and video URLs in the response
      const normalizedContent = (response.content || []).map(item => ({
        ...item,
        preview_url: item.preview_url ? normalizePreviewUrl(item.preview_url) : null,
        local_url: item.local_url ? normalizePreviewUrl(item.local_url) : item.local_url,
        video_url: item.video_url ? normalizeVideoUrl(item.video_url) : null,
        download_url: item.download_url ? normalizeVideoUrl(item.download_url) : item.download_url,
      }));
      setGeneratedContent(normalizedContent);
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
    setFormData((prev) => {
      if (field === "channel") {
        const nextChannel = value;
        return {
          ...prev,
          channel: nextChannel,
          variantGoal: nextChannel === "Video" ? 1 : prev.variantGoal || 1,
        };
      }

      if (field === "variantGoal") {
        if (value === "") {
          return {
            ...prev,
            variantGoal: "",
          };
        }

        const parsedValue = parseInt(value, 10);
        if (Number.isNaN(parsedValue)) {
          return prev;
        }

        const sanitizedValue = Math.min(10, Math.max(1, parsedValue));
        return {
          ...prev,
          variantGoal: sanitizedValue,
        };
      }

      return {
        ...prev,
        [field]: value,
      };
    });
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

    // Validate video requirements
    if (formData.channel === "Video" && uploadedImages.length === 0) {
      setFormError(
        "Product image is required for video generation. Please upload a product image."
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
        content_channel: formData.channel || "Image",
        tone: mapTone(formData.tone || "Emotional"),
        call_to_action: formData.cta || "Let nature lead",
        number_of_variants:
          (formData.channel || "Image") === "Video"
            ? 1
            : parseInt(formData.variantGoal, 10) || 1,
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
              // For video, we need to fetch full results
              if (status.result?.plan_type === "video") {
                try {
                  const fullResults = await getGenerationResults(jobId);
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
      channel: "Image",
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

  const downloadImage = async (item, filename) => {
    try {
      let downloadUrl;

      // Check if download_url is available from API
      if (item.download_url) {
        // Use the download_url from API (e.g., /api/content/download/run_id/artifact_id)
        // Check if it's already a full URL or just a path
        downloadUrl = item.download_url.startsWith('http') 
          ? item.download_url 
          : `${config.pythonApi.baseURL}${item.download_url}`;
      } 
      // If not, try to construct from run_id and artifact_id
      else if (item.run_id && item.artifact_id) {
        downloadUrl = `${config.pythonApi.baseURL}/api/content/download/${item.run_id}/${item.artifact_id}`;
      }
      // Fallback to direct image URL
      else if (item.image_url || item.local_url) {
        // If we have a direct image URL, download it directly
        const imageUrl = item.image_url || 
                        (item.local_url ? `${config.pythonApi.baseURL}${item.local_url}` : null);
        
        if (imageUrl) {
          // Fetch and download
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          return;
        }
      }

      // If we have a download URL, open it in a new window
      if (downloadUrl) {
        window.open(downloadUrl, '_blank');
      } else {
        console.error('No download method available for item:', item);
      }
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  };

  const downloadVideo = async (item, filename) => {
    try {
      let downloadUrl;

      // Check if download_url is available from API (for videos)
      if (item.download_url) {
        // Use the download_url from API (e.g., /api/content/download-video/run_id/clip_id/filename)
        downloadUrl = item.download_url.startsWith('http') 
          ? item.download_url 
          : `${config.pythonApi.baseURL}${item.download_url}`;
      } 
      // If not, try to construct from run_id, clip_id, and filename
      else if (item.run_id && item.clip_id) {
        const videoFilename = filename || `${item.clip_id}_video.mp4`;
        downloadUrl = `${config.pythonApi.baseURL}/api/content/download-video/${item.run_id}/${item.clip_id}/${videoFilename}`;
      }
      // Fallback to video_url
      else if (item.video_url) {
        downloadUrl = item.video_url.startsWith('http') 
          ? item.video_url 
          : `${config.pythonApi.baseURL}${item.video_url}`;
      }

      // If we have a download URL, open it in a new window
      if (downloadUrl) {
        window.open(downloadUrl, '_blank');
      } else {
        console.error('No download method available for video:', item);
      }
    } catch (error) {
      console.error('Failed to download video:', error);
    }
  };

  // Edit image handlers
  const handleEditClick = (imageId) => {
    setEditingImageId(imageId);
    setEditErrors((prev) => ({ ...prev, [imageId]: null }));
  };

  const handleEditPromptChange = (imageId, value) => {
    setEditPrompts((prev) => ({ ...prev, [imageId]: value }));
    // Clear error when user starts typing
    if (editErrors[imageId]) {
      setEditErrors((prev) => ({ ...prev, [imageId]: null }));
    }
  };

  const handleCancelEdit = (imageId) => {
    setEditingImageId(null);
    setEditPrompts((prev) => {
      const newPrompts = { ...prev };
      delete newPrompts[imageId];
      return newPrompts;
    });
    setEditErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[imageId];
      return newErrors;
    });
  };

  const handleSendEdit = async (imageId, runId, artifactId) => {
    const editPrompt = editPrompts[imageId]?.trim();
    
    // Validate prompt
    if (!editPrompt) {
      setEditErrors((prev) => ({ 
        ...prev, 
        [imageId]: "Please enter a description of changes you want" 
      }));
      return;
    }


    setIsSendingEdit(true);
    setEditErrors((prev) => ({ ...prev, [imageId]: null }));

    try {
      // Call the edit image API
      const response = await editImage(runId, artifactId, editPrompt);
      
      if (response.success) {
        // Success! Close edit mode and refresh content
        handleCancelEdit(imageId);
        
        // Wait a bit then refresh to show the new image
        setTimeout(() => {
          fetchGeneratedContent();
        }, 3000);
        
        // Optional: Show success message
        console.log("Edit submitted successfully:", response);
      } else {
        setEditErrors((prev) => ({ 
          ...prev, 
          [imageId]: response.error || "Failed to submit edit" 
        }));
      }
    } catch (error) {
      console.error("Failed to submit edit:", error);
      setEditErrors((prev) => ({ 
        ...prev, 
        [imageId]: error.response?.data?.error || error.message || "Failed to submit edit" 
      }));
    } finally {
      setIsSendingEdit(false);
    }
  };

  // Brandkit modal handlers
  const handleCreateNewBrandkit = () => {
    setEditingBrandkit(null);
    setShowBrandkitFormModal(true);
  };

  const handleManageBrandkits = () => {
    setShowBrandkitManagementModal(true);
  };

  const handleEditBrandkit = async (brandkitSummary) => {
    try {
      // Show management modal is closing but don't close it yet to prevent flash
      // Fetch full brandkit data before editing
      const fullBrandkit = await getBrandkit(brandkitSummary.brand_id);
      setEditingBrandkit(fullBrandkit);
      setShowBrandkitManagementModal(false);
      setShowBrandkitFormModal(true);
    } catch (error) {
      console.error("Error loading brandkit for edit:", error);
      alert("Failed to load brandkit details: " + (error.response?.data?.detail || error.message));
    }
  };

  const handleUploadLogo = (brandkit) => {
    setUploadingLogoBrandkit(brandkit);
    setShowLogoUploadModal(true);
    setShowBrandkitManagementModal(false);
  };

  const handleBrandkitFormSuccess = async () => {
    await refreshBrandkit();
    setShowBrandkitFormModal(false);
    setEditingBrandkit(null);
  };

  const handleLogoUploadSuccess = async () => {
    await refreshBrandkit();
    setShowLogoUploadModal(false);
    setUploadingLogoBrandkit(null);
  };

  return (
    <SidebarPermissionGuard requiredSidebar="createContent">
      {/* Breadcrumb */}
      <Breadcrumb
        title="Create Content"
        rootLabel="Content Craft"
        rootIcon="solar:magic-stick-3-bold"
        rootBreadcrumbLabel="Dashboard"
      />

      <div className="container-fluid" style={{ padding: "15px", overflowX: "hidden" }}>
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
                  {/* Brandkit Selector Section */}
                  <div className="d-flex justify-content-between align-items-center mb-4" style={{ flexWrap: "wrap", gap: "12px" }}>
                    <div style={{ minWidth: 0, flex: "1 1 auto" }}>
                      {activeBrandkit && (
                        <div className="d-flex align-items-center gap-2" style={{ flexWrap: "wrap" }}>
                          <span className="badge bg-light text-dark border">
                            <Icon icon="solar:palette-bold" width="14" height="14" className="me-1" />
                            Active: {activeBrandkit.brand_name}
                          </span>
                          {activeBrandkit.tagline && (
                            <small className="text-muted">"{activeBrandkit.tagline}"</small>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ minWidth: 0, flex: "0 0 auto", maxWidth: "250px", width: "100%" }}>
                      <BrandkitSelector
                        onCreateNew={handleCreateNewBrandkit}
                        onManage={handleManageBrandkits}
                      />
                    </div>
                  </div>

                  {/* Image Upload */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold mb-2 d-block">
                      Source Images {formData.channel === "Video" && <span className="text-danger">*</span>}
                      {formData.channel === "Video" && (
                        <small className="text-muted d-block mt-1">
                          Required for video generation
                        </small>
                      )}
                      {formData.channel === "Image" && (
                        <small className="text-muted d-block mt-1">
                          Optional for image generation
                        </small>
                      )}
                    </label>
                    
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
                    <style dangerouslySetInnerHTML={{__html: `
                      .form-control::placeholder {
                        color: #9ca3af !important;
                        opacity: 1;
                      }
                      .form-control::-webkit-input-placeholder {
                        color: #9ca3af !important;
                      }
                      .form-control::-moz-placeholder {
                        color: #9ca3af !important;
                        opacity: 1;
                      }
                      .form-control:-ms-input-placeholder {
                        color: #9ca3af !important;
                      }
                    `}} />
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Product Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Skin Microbiome Shampoo"
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
                        placeholder="A concise overview of your product"
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
                        placeholder="Detailed product description including key features, benefits, and target audience"
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
                            <option value="Image">Image</option>
                            <option value="Video">Video</option>
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

                    {formData.channel !== "Video" && (
                      <div className="mb-3">
                        <label className="form-label fw-semibold">
                          Number of Variants
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          min="1"
                          max="10"
                        value={
                          formData.variantGoal === ""
                            ? ""
                            : formData.variantGoal
                        }
                          onChange={(e) =>
                            handleInputChange("variantGoal", e.target.value)
                          }
                        />
                      </div>
                    )}
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
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <h5 className="card-title mb-2">Generated Content</h5>
                      <p className="card-subtitle text-muted mb-0">
                        View and manage your generated content organized by product and time
                      </p>
                    </div>
                    {/* Content Type Filter - Icon Only */}
                    <div className="d-flex align-items-center gap-1">
                      <button
                        type="button"
                        className={`btn btn-sm ${
                          contentTypeFilter === "all"
                            ? "btn-dark"
                            : "btn-outline-secondary"
                        }`}
                        onClick={() => setContentTypeFilter("all")}
                        title="All"
                        style={{
                          width: "32px",
                          height: "32px",
                          padding: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon
                          icon="solar:widget-4-bold"
                          width="16"
                          height="16"
                        />
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${
                          contentTypeFilter === "image"
                            ? "btn-dark"
                            : "btn-outline-secondary"
                        }`}
                        onClick={() => setContentTypeFilter("image")}
                        title="Images"
                        style={{
                          width: "32px",
                          height: "32px",
                          padding: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon
                          icon="solar:gallery-bold"
                          width="16"
                          height="16"
                        />
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${
                          contentTypeFilter === "video"
                            ? "btn-dark"
                            : "btn-outline-secondary"
                        }`}
                        onClick={() => setContentTypeFilter("video")}
                        title="Videos"
                        style={{
                          width: "32px",
                          height: "32px",
                          padding: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon
                          icon="solar:video-library-bold"
                          width="16"
                          height="16"
                        />
                      </button>
                    </div>
                  </div>
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
                        new Set(
                          generatedContent
                            .filter((item) => {
                              if (contentTypeFilter === "all") return true;
                              return item.content_type === contentTypeFilter;
                            })
                            .map((item) => item.product)
                        )
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
                                generatedContent
                                  .filter((item) => {
                                    if (item.product !== product) return false;
                                    if (contentTypeFilter === "all") return true;
                                    return item.content_type === contentTypeFilter;
                                  }).length
                              }{" "}
                              items
                            </span>
                          </div>

                          <div className="row g-3">
                            {generatedContent
                              .filter((item) => {
                                if (item.product !== product) return false;
                                if (contentTypeFilter === "all") return true;
                                return item.content_type === contentTypeFilter;
                              })
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
                                      {/* Video Display */}
                                      {item.content_type === "video" ? (
                                        <>
                                          {item.video_url ? (
                                            <div className="w-100 h-100 position-relative">
                                              <video
                                                src={item.video_url}
                                                poster={item.preview_url || undefined}
                                                className="card-img-top"
                                                style={{
                                                  width: "100%",
                                                  height: "100%",
                                                  objectFit: "cover",
                                                }}
                                                controls={playingVideoId === item.id}
                                                preload="metadata"
                                                onPlay={() => setPlayingVideoId(item.id)}
                                                onPause={() => setPlayingVideoId(null)}
                                                onEnded={() => setPlayingVideoId(null)}
                                              >
                                                Your browser does not support the video tag.
                                              </video>
                                              {/* Play button overlay - show when video is not playing */}
                                              {playingVideoId !== item.id && (
                                                <div
                                                  className="position-absolute top-50 start-50 translate-middle"
                                                  style={{
                                                    cursor: "pointer",
                                                    zIndex: 2,
                                                  }}
                                                  onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    const container = e.currentTarget.closest('.position-relative');
                                                    const video = container?.querySelector('video');
                                                    if (video) {
                                                      video.play().catch(err => {
                                                        console.error('Error playing video:', err);
                                                      });
                                                      setPlayingVideoId(item.id);
                                                    }
                                                  }}
                                                >
                                                  <div
                                                    className="rounded-circle d-flex align-items-center justify-content-center"
                                                    style={{
                                                      width: "60px",
                                                      height: "60px",
                                                      backgroundColor: "rgba(0, 0, 0, 0.7)",
                                                      backdropFilter: "blur(4px)",
                                                      transition: "all 0.2s ease",
                                                    }}
                                                    onMouseEnter={(e) => {
                                                      e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.85)";
                                                      e.currentTarget.style.transform = "scale(1.1)";
                                                    }}
                                                    onMouseLeave={(e) => {
                                                      e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
                                                      e.currentTarget.style.transform = "scale(1)";
                                                    }}
                                                  >
                                                    <Icon
                                                      icon="solar:play-bold"
                                                      width="32"
                                                      height="32"
                                                      className="text-white"
                                                      style={{ marginLeft: "4px" }}
                                                    />
                                                  </div>
                                                </div>
                                              )}
                                              {/* Video duration badge */}
                                              {item.duration && (
                                                <div className="position-absolute bottom-0 end-0 m-2">
                                                  <span className="badge bg-dark bg-opacity-75">
                                                    {item.duration}s
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                          ) : item.preview_url ? (
                                            <div className="w-100 h-100 position-relative">
                                              <img
                                                src={item.preview_url}
                                                alt={item.title}
                                                className="card-img-top"
                                                style={{
                                                  width: "100%",
                                                  height: "100%",
                                                  objectFit: "cover",
                                                }}
                                              />
                                              {/* Play button overlay */}
                                              <div
                                                className="position-absolute top-50 start-50 translate-middle"
                                                style={{
                                                  cursor: "pointer",
                                                  zIndex: 2,
                                                }}
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  e.stopPropagation();
                                                  // If video_url is available, we can try to load and play it
                                                  // For now, clicking on preview will just show the video when it loads
                                                  if (item.video_url) {
                                                    // The video element will be created when video_url is available
                                                    // This is a fallback for when only preview is shown
                                                  }
                                                }}
                                              >
                                                <div
                                                  className="rounded-circle d-flex align-items-center justify-content-center"
                                                  style={{
                                                    width: "60px",
                                                    height: "60px",
                                                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                                                    backdropFilter: "blur(4px)",
                                                    transition: "all 0.2s ease",
                                                  }}
                                                  onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.85)";
                                                    e.currentTarget.style.transform = "scale(1.1)";
                                                  }}
                                                  onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
                                                    e.currentTarget.style.transform = "scale(1)";
                                                  }}
                                                >
                                                  <Icon
                                                    icon="solar:play-bold"
                                                    width="32"
                                                    height="32"
                                                    className="text-white"
                                                    style={{ marginLeft: "4px" }}
                                                  />
                                                </div>
                                              </div>
                                              {item.duration && (
                                                <div className="position-absolute bottom-0 end-0 m-2">
                                                  <span className="badge bg-dark bg-opacity-75">
                                                    {item.duration}s
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                          ) : (
                                            <div className="d-flex align-items-center justify-content-center h-100">
                                              <Icon
                                                icon="solar:video-library-bold"
                                                width="32"
                                                height="32"
                                                className="text-muted"
                                              />
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        /* Image Display */
                                        <>
                                          {item.image_url || item.local_url || item.preview_url ? (
                                            <img
                                              src={item.image_url || item.local_url || item.preview_url}
                                              alt={item.title}
                                              className="card-img-top"
                                              style={{
                                                height: "100%",
                                                objectFit: "cover",
                                              }}
                                              onError={(e) => {
                                                // Try fallback URLs in order
                                                const currentSrc = e.target.src;
                                                
                                                // If external URL failed, try local URL
                                                if (
                                                  currentSrc.includes("cdn-magnific.freepik.com") &&
                                                  item.local_url
                                                ) {
                                                  e.target.src = item.local_url;
                                                }
                                                // If local URL failed, try preview URL
                                                else if (
                                                  item.preview_url &&
                                                  !currentSrc.includes(item.preview_url)
                                                ) {
                                                  e.target.src = item.preview_url;
                                                }
                                                // If all failed, hide image and show placeholder
                                                else {
                                                  e.target.style.display = 'none';
                                                  const placeholder = e.target.parentElement.querySelector('.image-placeholder');
                                                  if (placeholder) {
                                                    placeholder.style.display = 'flex';
                                                  }
                                                }
                                              }}
                                            />
                                          ) : (
                                            <div className="d-flex align-items-center justify-content-center h-100">
                                              <Icon
                                                icon="solar:gallery-bold"
                                                width="32"
                                                height="32"
                                                className="text-muted"
                                              />
                                            </div>
                                          )}
                                        </>
                                      )}
                                      {/* Status overlay */}
                                      <div className="position-absolute top-0 end-0 m-2">
                                        {getStatusBadge(item.status)}
                                      </div>
                                    </div>
                                    <div className="card-body">
                                      <div className="d-flex align-items-center justify-content-between mb-3">
                                        <h6 className="card-title fw-bold mb-0">
                                          {item.title}
                                        </h6>
                                        <div className="d-flex gap-2">
                                          {/* Edit button - only for images */}
                                          {item.content_type === "image" && (item.image_url || item.local_url) && (
                                            <button
                                              className="btn btn-sm btn-primary d-flex align-items-center justify-content-center"
                                              onClick={() => handleEditClick(item.id)}
                                              title="Edit this image"
                                              style={{ width: "32px", height: "32px", padding: 0 }}
                                            >
                                              <Icon
                                                icon="solar:pen-bold"
                                                width="14"
                                                height="14"
                                              />
                                            </button>
                                          )}
                                          {/* Download button - for both images and videos */}
                                          {(item.content_type === "image" && (item.image_url || item.local_url)) ||
                                           (item.content_type === "video" && item.video_url) ? (
                                            <button
                                              className="btn btn-sm btn-light border d-flex align-items-center justify-content-center"
                                              onClick={() => {
                                                if (item.content_type === "video") {
                                                  downloadVideo(
                                                    item,
                                                    `${item.title.replace(/\s+/g, "_")}.mp4`
                                                  );
                                                } else {
                                                  downloadImage(
                                                    item,
                                                    `${item.title.replace(/\s+/g, "_")}.jpg`
                                                  );
                                                }
                                              }}
                                              title={`Download this ${item.content_type === "video" ? "video" : "image"}`}
                                              style={{ width: "32px", height: "32px", padding: 0 }}
                                            >
                                              <Icon
                                                icon="solar:download-bold"
                                                width="14"
                                                height="14"
                                                className="text-dark"
                                              />
                                            </button>
                                          ) : null}
                                        </div>
                                      </div>
                                      <div className="d-flex align-items-center gap-2 small text-muted mt-2">
                                        <Icon
                                          icon="solar:calendar-bold"
                                          width="14"
                                          height="14"
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
                                    
                                    {/* Edit Input Section */}
                                    {editingImageId === item.id && (
                                      <div className="card-footer bg-light border-top p-3">
                                        <div className="mb-3">
                                          <label className="form-label small fw-semibold mb-2 d-block">
                                            Describe the changes you want:
                                          </label>
                                          <textarea
                                            className={`form-control ${
                                              editErrors[item.id] ? "is-invalid" : ""
                                            }`}
                                            rows="4"
                                            placeholder="Make it brighter with more vibrant colors..."
                                            value={editPrompts[item.id] || ""}
                                            onChange={(e) =>
                                              handleEditPromptChange(
                                                item.id,
                                                e.target.value
                                              )
                                            }
                                            disabled={isSendingEdit}
                                            style={{ resize: "vertical", minHeight: "100px" }}
                                          />
                                          {editErrors[item.id] && (
                                            <div className="invalid-feedback d-block small mt-1">
                                              {editErrors[item.id]}
                                            </div>
                                          )}
                                        </div>
                                        <div className="d-flex align-items-center justify-content-end mt-3">
                                          <div className="d-flex gap-2">
                                            <button
                                              className="btn btn-sm btn-secondary"
                                              onClick={() => handleCancelEdit(item.id)}
                                              disabled={isSendingEdit}
                                            >
                                              Cancel
                                            </button>
                                            <button
                                              className="btn btn-sm btn-primary d-flex align-items-center gap-1"
                                              onClick={() =>
                                                handleSendEdit(
                                                  item.id,
                                                  item.run_id,
                                                  item.artifact_id
                                                )
                                              }
                                              disabled={
                                                isSendingEdit ||
                                                !editPrompts[item.id]?.trim()
                                              }
                                            >
                                              {isSendingEdit ? (
                                                <>
                                                  <span
                                                    className="spinner-border spinner-border-sm me-1"
                                                    role="status"
                                                  />
                                                  Sending...
                                                </>
                                              ) : (
                                                <>
                                                  <Icon
                                                    icon="solar:plain-2-bold"
                                                    width="14"
                                                    height="14"
                                                    className="me-1"
                                                  />
                                                  Send
                                                </>
                                              )}
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}

                      {/* No content message */}
                      {generatedContent.filter((item) => {
                        if (contentTypeFilter === "all") return true;
                        return item.content_type === contentTypeFilter;
                      }).length === 0 && (
                        <div className="text-center p-4 text-muted">
                          <Icon
                            icon="solar:package-bold"
                            width="48"
                            height="48"
                            className="text-muted mb-3"
                          />
                          <p className="h5 mb-2">
                            {contentTypeFilter === "all"
                              ? "No generated content yet"
                              : contentTypeFilter === "image"
                              ? "No images yet"
                              : "No videos yet"}
                          </p>
                          <p className="small">
                            {contentTypeFilter === "all"
                              ? "Create your first content generation to see results here"
                              : contentTypeFilter === "image"
                              ? "Generate images to see them here"
                              : "Generate videos to see them here"}
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

      {/* Brandkit Form Modal */}
      <BrandkitFormModal
        isOpen={showBrandkitFormModal}
        onClose={() => {
          setShowBrandkitFormModal(false);
          setEditingBrandkit(null);
        }}
        onSuccess={handleBrandkitFormSuccess}
        editBrandkit={editingBrandkit}
      />

      {/* Brandkit Management Modal */}
      <BrandkitManagementModal
        isOpen={showBrandkitManagementModal}
        onClose={() => setShowBrandkitManagementModal(false)}
        onEdit={handleEditBrandkit}
        onUploadLogo={handleUploadLogo}
      />

      {/* Logo Upload Modal */}
      <BrandkitLogoUpload
        isOpen={showLogoUploadModal}
        onClose={() => {
          setShowLogoUploadModal(false);
          setUploadingLogoBrandkit(null);
        }}
        brandkit={uploadingLogoBrandkit}
        onSuccess={handleLogoUploadSuccess}
      />
    </SidebarPermissionGuard>
  );
}
