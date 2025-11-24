"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react/dist/iconify.js";
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
  deleteGeneratedContent,
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
    longDescription: "",
    channel: "",
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
  const [editAspectRatios, setEditAspectRatios] = useState({}); // Store aspect ratio per image
  const [editGuidanceScales, setEditGuidanceScales] = useState({}); // Store guidance scale per image
  const [editSeeds, setEditSeeds] = useState({}); // Store seed per image

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
      !formData.longDescription
    ) {
      setFormError(
        "Please fill in the required fields: Product Name and Long Description"
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

      // Start generation
      const response = await quickGenerate({
        product_name: formData.productName,
        long_description: formData.longDescription,
        content_channel: formData.channel || "Image",
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
      channel: "Image",
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

  // Helper function to check if send should be enabled
  const canSendEdit = (imageId) => {
    const hasPrompt = editPrompts[imageId]?.trim();
    // Check if user explicitly selected an aspect ratio (even if it's 1:1)
    const hasExplicitAspectRatio = explicitlySelectedAspectRatios.has(imageId);
    
    // Allow sending if there's a prompt OR if aspect ratio was explicitly selected
    return hasPrompt || hasExplicitAspectRatio;
  };

  // Track which aspect ratios were explicitly selected by the user
  const [explicitlySelectedAspectRatios, setExplicitlySelectedAspectRatios] = useState(new Set());

  // Edit image handlers
  const handleEditClick = (imageId) => {
    setEditingImageId(imageId);
    setEditErrors((prev) => ({ ...prev, [imageId]: null }));
    // Initialize default aspect ratio if not set (but don't mark it as explicitly selected)
    setEditAspectRatios((prev) => {
      if (!prev[imageId]) {
        return { ...prev, [imageId]: "square_1_1" };
      }
      return prev;
    });
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
    setEditAspectRatios((prev) => {
      const newRatios = { ...prev };
      delete newRatios[imageId];
      return newRatios;
    });
    setEditGuidanceScales((prev) => {
      const newScales = { ...prev };
      delete newScales[imageId];
      return newScales;
    });
    setEditSeeds((prev) => {
      const newSeeds = { ...prev };
      delete newSeeds[imageId];
      return newSeeds;
    });
    // Clear the explicit selection tracking when canceling
    setExplicitlySelectedAspectRatios((prev) => {
      const newSet = new Set(prev);
      newSet.delete(imageId);
      return newSet;
    });
  };

  const handleSendEdit = async (imageId, runId, artifactId) => {
    const editPrompt = editPrompts[imageId]?.trim();
    const aspectRatio = editAspectRatios[imageId] || "square_1_1";
    const hasExplicitAspectRatio = explicitlySelectedAspectRatios.has(imageId);
    
    // Validate: need either prompt or explicitly selected aspect ratio
    if (!editPrompt && !hasExplicitAspectRatio) {
      setEditErrors((prev) => ({ 
        ...prev, 
        [imageId]: "Please enter a description of changes or select an aspect ratio" 
      }));
      return;
    }

    setIsSendingEdit(true);
    setEditErrors((prev) => ({ ...prev, [imageId]: null }));

    try {
      // Get aspect ratio from state - always include it
      const aspectRatio = editAspectRatios[imageId] || "square_1_1";
      
      // Debug: Log current state
      console.log("Current editAspectRatios state:", editAspectRatios);
      console.log("Selected aspect ratio for image", imageId, ":", aspectRatio);
      console.log("Edit prompt:", editPrompt || "(empty - aspect ratio change only)");
      
      // Prepare options object - always include aspect_ratio
      const options = {
        aspect_ratio: aspectRatio, // Always send aspect ratio
      };
      
      if (editGuidanceScales[imageId] !== undefined) {
        options.guidance_scale = editGuidanceScales[imageId];
      }
      if (editSeeds[imageId] !== undefined && editSeeds[imageId] !== null && editSeeds[imageId] !== "") {
        options.seed = parseInt(editSeeds[imageId], 10);
      }

      // Log the complete request for debugging
      console.log("Sending edit request with options:", {
        run_id: runId,
        artifact_id: artifactId,
        edit_prompt: editPrompt,
        aspect_ratio: aspectRatio, // Explicitly log aspect_ratio
        ...options,
      });

      // Call the edit image API - allow empty prompt for aspect ratio-only changes
      const response = await editImage(runId, artifactId, editPrompt || "", options);
      
      if (response.success) {
        // Success! Clear explicit selection tracking before closing edit mode
        setExplicitlySelectedAspectRatios((prev) => {
          const newSet = new Set(prev);
          newSet.delete(imageId);
          return newSet;
        });
        // Close edit mode and refresh content
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

  // Delete generated content handler
  const handleDeleteContent = async (item) => {
    // Validate required fields
    if (!item.run_id || !item.artifact_id) {
      console.error("Cannot delete: missing run_id or artifact_id", item);
      alert("Error: Cannot delete this content. Missing required information.");
      return;
    }

    // Confirmation dialog
    const contentType = item.content_type === "video" ? "video" : "image";
    const confirmed = window.confirm(
      `Are you sure you want to delete this ${contentType}? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await deleteGeneratedContent(item.run_id, item.artifact_id);
      
      if (response.status === "success") {
        // Remove the item from the local state immediately for better UX
        setGeneratedContent((prev) =>
          prev.filter((content) => content.id !== item.id)
        );
        
        // Show success message
        console.log("Content deleted successfully:", response.message);
        
        // Optionally refresh the content list to ensure consistency
        setTimeout(() => {
          fetchGeneratedContent();
        }, 500);
      } else {
        throw new Error(response.message || "Failed to delete content");
      }
    } catch (error) {
      console.error("Error deleting content:", error);
      alert(
        `Failed to delete content: ${error.response?.data?.detail || error.message || "Unknown error"}`
      );
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
              <div 
                style={{
                  position: "relative",
                  minHeight: "calc(100vh - 200px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "40px 20px",
                  overflow: "hidden",
                  background: "linear-gradient(135deg, #fafbfc 0%, #ffffff 100%)"
                }}
              >
                {/* Background Image - Ultra Subtle & Clean */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundImage: "url('/assets/images/make/dashborad-09.png')",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    pointerEvents: "none",
                    zIndex: 0,
                    opacity: 0.06,
                    mixBlendMode: "multiply"
                  }}
                />

                {/* Minimal Form Container */}
                <div
                  style={{
                    position: "relative",
                    zIndex: 1,
                    width: "100%",
                    maxWidth: "800px",
                    margin: "0 auto"
                  }}
                >
                  {/* Brandkit Selector - Minimal Top Bar */}
                  <div className="d-flex justify-content-between align-items-center mb-4" style={{ flexWrap: "wrap", gap: "12px" }}>
                    <div style={{ minWidth: 0, flex: "1 1 auto" }}>
                      {activeBrandkit && (
                        <div className="d-flex align-items-center gap-2" style={{ flexWrap: "wrap" }}>
                          <span className="badge bg-light text-dark border" style={{ fontSize: "12px", padding: "4px 8px" }}>
                            <Icon icon="solar:palette-bold" width="12" height="12" className="me-1" />
                            {activeBrandkit.brand_name}
                          </span>
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

                  {/* Main Form Box - Minimal Design */}
                  <div
                    style={{
                      backgroundColor: "white",
                      borderRadius: "16px",
                      padding: "32px",
                      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                      border: "1px solid rgba(0, 0, 0, 0.05)"
                    }}
                  >
                    {/* Image Upload, Product Name and Description Row */}
                    <div className="d-flex gap-3 mb-4" style={{ alignItems: "flex-start" }}>
                      {/* Image Upload - Horizontal Row of Thumbnails */}
                      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div className="d-flex gap-2" style={{ flexWrap: "wrap" }}>
                          {/* Show uploaded images as thumbnails */}
                          {uploadedImages.map((file, index) => (
                            <div
                              key={index}
                              style={{
                                position: "relative",
                                width: "100px",
                                height: "100px",
                                borderRadius: "8px",
                                overflow: "hidden",
                                border: "2px solid #e5e7eb"
                              }}
                            >
                              <img
                                src={imageUrls[index]}
                                alt={`Upload ${index + 1}`}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover"
                                }}
                              />
                              {/* Cancel/Remove Button - Dark gray with pause icon */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  removeImage(index);
                                }}
                                style={{
                                  position: "absolute",
                                  top: "4px",
                                  right: "4px",
                                  width: "28px",
                                  height: "28px",
                                  borderRadius: "6px",
                                  backgroundColor: "#374151",
                                  border: "none",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                  transition: "all 0.2s ease",
                                  zIndex: 2
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = "#4b5563";
                                  e.currentTarget.style.transform = "scale(1.05)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = "#374151";
                                  e.currentTarget.style.transform = "scale(1)";
                                }}
                                title="Remove image"
                              >
                                <Icon
                                  icon="solar:close-circle-bold"
                                  width="16"
                                  height="16"
                                  style={{ color: "white" }}
                                />
                              </button>
                            </div>
                          ))}

                          {/* Add More Upload Box - Show if less than 3 images */}
                          {uploadedImages.length < 3 && (
                            <label
                              style={{
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "100px",
                                height: "100px",
                                borderRadius: "8px",
                                backgroundColor: "#f9fafb",
                                border: "2px dashed #d1d5db",
                                transition: "all 0.2s ease",
                                position: "relative"
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#f3f4f6";
                                e.currentTarget.style.borderColor = "#9ca3af";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "#f9fafb";
                                e.currentTarget.style.borderColor = "#d1d5db";
                              }}
                            >
                              {/* Landscape Icon with Plus */}
                              <div style={{ position: "relative", width: "40px", height: "40px" }}>
                                <svg
                                  width="40"
                                  height="40"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  {/* Mountains - multiple peaks */}
                                  <path
                                    d="M2 18L6 12L10 15L14 9L18 12L22 18H2Z"
                                    fill="#9ca3af"
                                  />
                                  {/* Sun circle - top right */}
                                  <circle
                                    cx="18"
                                    cy="5"
                                    r="3.5"
                                    fill="#9ca3af"
                                  />
                                </svg>
                                {/* Plus sign overlay - bottom right corner */}
                                <div
                                  style={{
                                    position: "absolute",
                                    bottom: "-2px",
                                    right: "-2px",
                                    width: "18px",
                                    height: "18px",
                                    borderRadius: "50%",
                                    backgroundColor: "#6b7280",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    border: "2px solid white",
                                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                                  }}
                                >
                                  <span style={{ color: "white", fontSize: "11px", fontWeight: "bold", lineHeight: "1" }}>+</span>
                                </div>
                              </div>
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
                        {/* Image count indicator */}
                        {uploadedImages.length > 0 && (
                          <div style={{ fontSize: "11px", color: "#6b7280", textAlign: "center" }}>
                            {uploadedImages.length} of 3 images
                          </div>
                        )}
                      </div>

                      {/* Product Name and Description - Stacked on Right */}
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "16px" }}>
                        {/* Product Name Input - Same style as Description */}
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Product Name"
                          value={formData.productName}
                          onChange={(e) =>
                            handleInputChange("productName", e.target.value)
                          }
                          style={{
                            border: "none",
                            borderBottom: "2px solid #e5e7eb",
                            borderRadius: "0",
                            padding: "12px 0",
                            fontSize: "16px",
                            backgroundColor: "transparent",
                            transition: "border-color 0.2s ease",
                            width: "100%"
                          }}
                          onFocus={(e) => {
                            e.target.style.borderBottomColor = "#3b82f6";
                          }}
                          onBlur={(e) => {
                            e.target.style.borderBottomColor = "#e5e7eb";
                          }}
                        />

                        {/* Description Input */}
                        <textarea
                          className="form-control"
                          rows="3"
                          placeholder="Describe your product: benefits, what it does, who it's for, and ingredients"
                          value={formData.longDescription}
                          onChange={(e) =>
                            handleInputChange("longDescription", e.target.value)
                          }
                          style={{
                            border: "none",
                            borderBottom: "2px solid #e5e7eb",
                            borderRadius: "0",
                            padding: "12px 0",
                            fontSize: "16px",
                            backgroundColor: "transparent",
                            resize: "none",
                            transition: "border-color 0.2s ease",
                            width: "100%"
                          }}
                          onFocus={(e) => {
                            e.target.style.borderBottomColor = "#3b82f6";
                          }}
                          onBlur={(e) => {
                            e.target.style.borderBottomColor = "#e5e7eb";
                          }}
                        />
                      </div>
                    </div>

                    {/* Options Row - Image/Video, Variants, Upload */}
                    <div 
                      className="d-flex align-items-center gap-3 mb-4"
                      style={{
                        flexWrap: "wrap",
                        padding: "12px 0",
                        borderTop: "1px solid #f3f4f6",
                        borderBottom: "1px solid #f3f4f6"
                      }}
                    >
                      {/* Image or Video Dropdown - Styled as Button */}
                      <div className="position-relative d-inline-block">
                        <select
                          value={formData.channel}
                          onChange={(e) =>
                            handleInputChange("channel", e.target.value)
                          }
                          style={{
                            appearance: "none",
                            WebkitAppearance: "none",
                            MozAppearance: "none",
                            border: "none",
                            backgroundColor: "#374151",
                            color: "white",
                            fontSize: "14px",
                            fontWeight: "500",
                            padding: "6px 32px 6px 12px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            outline: "none",
                            transition: "all 0.2s ease",
                            minWidth: "100px"
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = "#4b5563";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = "#374151";
                          }}
                        >
                          <option value="Image" style={{ backgroundColor: "#374151", color: "white" }}>Image</option>
                          <option value="Video" style={{ backgroundColor: "#374151", color: "white" }}>Video</option>
                        </select>
                        <Icon
                          icon="solar:alt-arrow-down-bold"
                          width="14"
                          height="14"
                          style={{
                            position: "absolute",
                            right: "10px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "white",
                            pointerEvents: "none"
                          }}
                        />
                      </div>

                      {/* Separator */}
                      <div style={{ width: "1px", height: "20px", backgroundColor: "#e5e7eb" }} />

                      {/* Number of Variants (only for Image) */}
                      {formData.channel === "Image" && (
                        <div className="d-flex align-items-center gap-2">
                          <input
                            type="number"
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
                            placeholder="1"
                            style={{
                              border: "none",
                              backgroundColor: "transparent",
                              fontSize: "14px",
                              fontWeight: "500",
                              width: "50px",
                              padding: "4px 8px",
                              textAlign: "center",
                              outline: "none",
                              color: "#111827"
                            }}
                          />
                          <span style={{ fontSize: "12px", color: "#6b7280" }}>variants</span>
                        </div>
                      )}
                    </div>

                    {/* Error Message */}
                    {formError && (
                      <div 
                        className="mb-3"
                        style={{
                          padding: "12px",
                          backgroundColor: "#fef2f2",
                          border: "1px solid #fecaca",
                          borderRadius: "8px",
                          color: "#dc2626",
                          fontSize: "14px"
                        }}
                      >
                        {formError}
                      </div>
                    )}

                    {/* Generate Button */}
                    <button
                      className="btn w-100"
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      style={{
                        backgroundColor: "#3b82f6",
                        color: "white",
                        border: "none",
                        borderRadius: "12px",
                        padding: "14px 24px",
                        fontSize: "16px",
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        transition: "all 0.2s ease",
                        boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)"
                      }}
                      onMouseEnter={(e) => {
                        if (!isGenerating) {
                          e.target.style.backgroundColor = "#2563eb";
                          e.target.style.transform = "translateY(-1px)";
                          e.target.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.4)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isGenerating) {
                          e.target.style.backgroundColor = "#3b82f6";
                          e.target.style.transform = "translateY(0)";
                          e.target.style.boxShadow = "0 2px 8px rgba(59, 130, 246, 0.3)";
                        }
                      }}
                    >
                      {isGenerating ? (
                        <>
                          <Icon
                            icon="solar:refresh-bold"
                            width="18"
                            height="18"
                            className="spinner"
                            style={{ animation: "spin 1s linear infinite" }}
                          />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Icon
                            icon="solar:magic-stick-3-bold"
                            width="18"
                            height="18"
                          />
                          Generate Content
                        </>
                      )}
                    </button>

                  </div>
                </div>

                {/* Spinner Animation & Custom Styles */}
                <style dangerouslySetInnerHTML={{__html: `
                  @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                  }
                  .form-control::placeholder {
                    color: #9ca3af !important;
                    opacity: 1;
                  }
                  select option {
                    background-color: #374151 !important;
                    color: white !important;
                    padding: 8px 12px !important;
                  }
                  select option:hover {
                    background-color: #4b5563 !important;
                  }
                  select:focus {
                    outline: none;
                    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
                  }
                `}} />
              </div>
            </div>
          )}

          {/* Generated Prompts Tab */}
          {activeTab === "prompts" && (
            <div className="tab-pane fade show active">
              <div 
                style={{
                  position: "relative",
                  height: "calc(100vh - 200px)",
                  overflow: "hidden",
                  background: "linear-gradient(135deg, #fafbfc 0%, #ffffff 100%)"
                }}
              >
                {/* Background Image - Same as Create Content */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundImage: "url('/assets/images/make/dashborad-09.png')",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    pointerEvents: "none",
                    zIndex: 0,
                    opacity: 0.06,
                    mixBlendMode: "multiply"
                  }}
                />
                
                {/* Scrollable Content Container */}
                <div 
                  className="custom-scrollbar-hidden"
                  style={{
                    position: "relative",
                    zIndex: 1,
                    height: "100%",
                    overflowY: "auto",
                    padding: "24px 20px",
                    maxWidth: "900px",
                    margin: "0 auto"
                  }}
                >
                {/* Show loading state */}
                {isLoadingJobs && (
                  <div className="d-flex align-items-center justify-content-center p-5">
                    <Icon
                      icon="solar:refresh-bold"
                      width="20"
                      height="20"
                      className="text-primary"
                      style={{ animation: "spin 1s linear infinite" }}
                    />
                  </div>
                )}

                {/* Show generation status if generating */}
                {generationResult &&
                  generationResult.status === "processing" && (
                    <div 
                      className="mb-3"
                      style={{
                        backgroundColor: "white",
                        borderRadius: "12px",
                        padding: "20px",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)"
                      }}
                    >
                      <div className="d-flex align-items-center gap-2 mb-3">
                        <Icon
                          icon="solar:refresh-bold"
                          width="18"
                          height="18"
                          className="text-primary"
                          style={{ animation: "spin 1s linear infinite" }}
                        />
                        <span className="fw-medium text-dark" style={{ fontSize: "15px" }}>
                          {formData.productName}
                        </span>
                      </div>
                      <div className="progress" style={{ height: "4px", borderRadius: "2px", backgroundColor: "#f3f4f6" }}>
                        <div
                          className="progress-bar bg-primary"
                          style={{
                            width: `${generationResult.progress}%`,
                            borderRadius: "2px"
                          }}
                        ></div>
                      </div>
                    </div>
                  )}

                {/* Show completed generation */}
                {generationResult &&
                  generationResult.status === "completed" && (
                    <div 
                      className="mb-3"
                      style={{
                        backgroundColor: "white",
                        borderRadius: "12px",
                        padding: "20px",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)"
                      }}
                    >
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2">
                          <Icon
                            icon="solar:check-circle-bold"
                            width="18"
                            height="18"
                            className="text-success"
                          />
                          <span className="fw-medium text-dark" style={{ fontSize: "15px" }}>
                            {formData.productName}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            handleViewResults(generationResult.job_id)
                          }
                          className="btn btn-sm"
                          style={{
                            backgroundColor: "#3b82f6",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            padding: "6px 16px",
                            fontSize: "13px",
                            fontWeight: "500"
                          }}
                        >
                          <Icon
                            icon="solar:eye-bold"
                            width="14"
                            height="14"
                            className="me-1"
                          />
                          View
                        </button>
                      </div>
                    </div>
                  )}

                {/* Show error if failed */}
                {generationResult &&
                  generationResult.status === "failed" && (
                    <div 
                      className="mb-3"
                      style={{
                        backgroundColor: "#fef2f2",
                        borderRadius: "12px",
                        padding: "20px",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)"
                      }}
                    >
                      <div className="d-flex align-items-center gap-2">
                        <Icon
                          icon="solar:danger-circle-bold"
                          width="18"
                          height="18"
                          className="text-danger"
                        />
                        <span className="fw-medium text-danger" style={{ fontSize: "15px" }}>
                          {generationResult.error || "Generation failed"}
                        </span>
                      </div>
                    </div>
                  )}

                {/* Show real generation jobs */}
                {!isLoadingJobs &&
                  generationJobs.length > 0 &&
                  generationJobs.map((job) => (
                    <div
                      key={job.job_id}
                      className="mb-3"
                      style={{
                        backgroundColor: "white",
                        borderRadius: "12px",
                        padding: "20px",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                        transition: "all 0.2s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.08)";
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.04)";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2">
                          {getStatusIcon(job.status)}
                          <span className="fw-medium text-dark" style={{ fontSize: "15px" }}>
                            {job.product_name}
                          </span>
                          <span 
                            className="badge"
                            style={{
                              backgroundColor: "#f3f4f6",
                              color: "#6b7280",
                              fontSize: "11px",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              fontWeight: "500"
                            }}
                          >
                            {job.plan_type}
                          </span>
                        </div>
                        <div className="d-flex align-items-center gap-3">
                          <span 
                            className="text-muted"
                            style={{
                              fontSize: "12px"
                            }}
                          >
                            {new Date(job.created_at).toLocaleDateString("en-US", { 
                              month: "short", 
                              day: "numeric",
                              year: "numeric"
                            })}
                          </span>
                          {job.status === "pending_review" && (
                            <button
                              onClick={() => {
                                setReviewJobId(job.job_id);
                                setIsReviewModalOpen(true);
                              }}
                              className="btn btn-sm"
                              style={{
                                backgroundColor: "#f59e0b",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                padding: "6px 16px",
                                fontSize: "13px",
                                fontWeight: "500"
                              }}
                            >
                              <Icon
                                icon="solar:file-text-bold"
                                width="14"
                                height="14"
                                className="me-1"
                              />
                              Review
                            </button>
                          )}
                          {job.status === "completed" && (
                            <button
                              onClick={() => handleViewResults(job.job_id)}
                              className="btn btn-sm"
                              style={{
                                backgroundColor: "#3b82f6",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                padding: "6px 16px",
                                fontSize: "13px",
                                fontWeight: "500"
                              }}
                            >
                              <Icon
                                icon="solar:eye-bold"
                                width="14"
                                height="14"
                                className="me-1"
                              />
                              View
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                {/* Show message if no generations */}
                {!isLoadingJobs &&
                  generationJobs.length === 0 &&
                  !generationResult && (
                    <div 
                      className="text-center"
                      style={{
                        padding: "60px 20px",
                        backgroundColor: "white",
                        borderRadius: "12px",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)"
                      }}
                    >
                      <Icon
                        icon="solar:package-bold"
                        width="48"
                        height="48"
                        className="text-muted mb-3"
                        style={{ opacity: 0.3 }}
                      />
                      <p 
                        className="text-muted mb-0"
                        style={{ fontSize: "15px" }}
                      >
                        No prompts yet
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Hide Scrollbar Styles */}
                <style dangerouslySetInnerHTML={{__html: `
                  .custom-scrollbar-hidden {
                    -ms-overflow-style: none;  /* IE and Edge */
                    scrollbar-width: none;  /* Firefox */
                  }
                  .custom-scrollbar-hidden::-webkit-scrollbar {
                    display: none;  /* Chrome, Safari and Opera */
                  }
                `}} />
              </div>
            </div>
          )}

          {/* Generated Content Tab */}
          {activeTab === "content" && (
            <div className="tab-pane fade show active">
              <div 
                style={{
                  position: "relative",
                  height: "calc(100vh - 200px)",
                  overflow: "hidden",
                  background: "linear-gradient(135deg, #fafbfc 0%, #ffffff 100%)"
                }}
              >
                {/* Background Image - Same as Create Content */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundImage: "url('/assets/images/make/dashborad-09.png')",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    pointerEvents: "none",
                    zIndex: 0,
                    opacity: 0.06,
                    mixBlendMode: "multiply"
                  }}
                />
                
                {/* Scrollable Content Container */}
                <div 
                  className="custom-scrollbar-hidden"
                  style={{
                    position: "relative",
                    zIndex: 1,
                    height: "100%",
                    overflowY: "auto",
                    padding: "24px 20px",
                    maxWidth: "1400px",
                    margin: "0 auto"
                  }}
                >
                  {/* Header - Filter Buttons Only */}
                  <div className="d-flex align-items-center justify-content-end mb-4" style={{ padding: "0 4px" }}>
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
                  
                  {/* Content Body */}
                  <div style={{ padding: "0 4px" }}>
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

                          <div className="generated-content-gallery">
                            {generatedContent
                              .filter((item) => {
                                if (item.product !== product) return false;
                                if (contentTypeFilter === "all") return true;
                                return item.content_type === contentTypeFilter;
                              })
                              .map((item) => (
                                <div key={item.id} style={{ width: "100%" }}>
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
                                          {/* Delete button - for all content types with run_id and artifact_id */}
                                          {item.run_id && item.artifact_id && (
                                            <button
                                              className="btn btn-sm btn-danger d-flex align-items-center justify-content-center"
                                              onClick={() => handleDeleteContent(item)}
                                              title={`Delete this ${item.content_type === "video" ? "video" : "image"}`}
                                              style={{ width: "32px", height: "32px", padding: 0 }}
                                            >
                                              <Icon
                                                icon="solar:trash-bin-trash-bold"
                                                width="14"
                                                height="14"
                                              />
                                            </button>
                                          )}
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
                                      <div className="card-footer border-top p-4" style={{ backgroundColor: "#fafafa" }}>
                                        <div className="mb-4">
                                          <label className="d-block mb-2" style={{ fontSize: "13px", color: "#374151", fontWeight: "500" }}>
                                            Describe the changes you want:
                                          </label>
                                          <textarea
                                            className={`form-control ${
                                              editErrors[item.id] ? "is-invalid" : ""
                                            }`}
                                            rows="3"
                                            placeholder="Make it brighter with more vibrant colors..."
                                            value={editPrompts[item.id] || ""}
                                            onChange={(e) =>
                                              handleEditPromptChange(
                                                item.id,
                                                e.target.value
                                              )
                                            }
                                            disabled={isSendingEdit}
                                            style={{
                                              resize: "vertical",
                                              minHeight: "80px",
                                              border: "1px solid #e5e7eb",
                                              borderRadius: "8px",
                                              padding: "10px 12px",
                                              fontSize: "14px",
                                              backgroundColor: "white",
                                              transition: "border-color 0.15s ease",
                                            }}
                                            onFocus={(e) => {
                                              e.target.style.borderColor = "#3b82f6";
                                              e.target.style.outline = "none";
                                            }}
                                            onBlur={(e) => {
                                              e.target.style.borderColor = "#e5e7eb";
                                            }}
                                          />
                                          {editErrors[item.id] && (
                                            <div className="mt-2" style={{ fontSize: "12px", color: "#dc2626" }}>
                                              {editErrors[item.id]}
                                            </div>
                                          )}
                                        </div>

                                        {/* Aspect Ratio Selection */}
                                        <div className="mb-4">
                                          <label className="d-block mb-2" style={{ fontSize: "13px", color: "#374151", fontWeight: "500" }}>
                                            Aspect ratio:
                                          </label>
                                          <div className="d-flex flex-wrap" style={{ gap: "4px" }}>
                                            {[
                                              { value: "square_1_1", label: "1:1", preview: { w: 1, h: 1 } },
                                              { value: "traditional_3_4", label: "3:4", preview: { w: 3, h: 4 } },
                                              { value: "classic_4_3", label: "4:3", preview: { w: 4, h: 3 } },
                                              { value: "widescreen_16_9", label: "16:9", preview: { w: 16, h: 9 } },
                                              { value: "social_story_9_16", label: "9:16", preview: { w: 9, h: 16 } },
                                              { value: "portrait_2_3", label: "2:3", preview: { w: 2, h: 3 } },
                                              { value: "standard_3_2", label: "3:2", preview: { w: 3, h: 2 } },
                                            ].map((ratio) => {
                                              const isSelected = (editAspectRatios[item.id] || "square_1_1") === ratio.value;
                                              const maxSize = 18;
                                              const aspectRatio = ratio.preview.w / ratio.preview.h;
                                              const previewWidth = aspectRatio >= 1 ? maxSize : maxSize * aspectRatio;
                                              const previewHeight = aspectRatio >= 1 ? maxSize / aspectRatio : maxSize;
                                              
                                              return (
                                                <button
                                                  key={ratio.value}
                                                  type="button"
                                                  onClick={() => {
                                                    const newRatios = {
                                                      ...editAspectRatios,
                                                      [item.id]: ratio.value,
                                                    };
                                                    setEditAspectRatios(newRatios);
                                                    // Mark this aspect ratio as explicitly selected by the user
                                                    setExplicitlySelectedAspectRatios((prev) => {
                                                      const newSet = new Set(prev);
                                                      newSet.add(item.id);
                                                      return newSet;
                                                    });
                                                    console.log("Aspect ratio selected:", ratio.value, "for image:", item.id, "State:", newRatios);
                                                  }}
                                                  disabled={isSendingEdit}
                                                  style={{
                                                    padding: "5px 8px",
                                                    minWidth: "48px",
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    alignItems: "center",
                                                    gap: "3px",
                                                    border: isSelected ? "1.5px solid #6b7280" : "1px solid #e5e7eb",
                                                    borderRadius: "6px",
                                                    backgroundColor: isSelected ? "#f3f4f6" : "white",
                                                    color: "#374151",
                                                    transition: "all 0.15s ease",
                                                    cursor: isSendingEdit ? "not-allowed" : "pointer",
                                                    opacity: isSendingEdit ? 0.6 : 1,
                                                  }}
                                                  onMouseEnter={(e) => {
                                                    if (!isSendingEdit && !isSelected) {
                                                      e.currentTarget.style.borderColor = "#d1d5db";
                                                      e.currentTarget.style.backgroundColor = "#f9fafb";
                                                    }
                                                  }}
                                                  onMouseLeave={(e) => {
                                                    if (!isSendingEdit && !isSelected) {
                                                      e.currentTarget.style.borderColor = "#e5e7eb";
                                                      e.currentTarget.style.backgroundColor = "white";
                                                    }
                                                  }}
                                                >
                                                  <div
                                                    style={{
                                                      width: `${previewWidth}px`,
                                                      height: `${previewHeight}px`,
                                                      backgroundColor: "#e5e7eb",
                                                      border: "1px solid #d1d5db",
                                                      borderRadius: "2px",
                                                    }}
                                                  />
                                                  <span style={{ fontSize: "10px", fontWeight: "400", color: "#6b7280" }}>
                                                    {ratio.label}
                                                  </span>
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>

                                        <div className="d-flex align-items-center justify-content-end" style={{ gap: "8px" }}>
                                          <button
                                            type="button"
                                            onClick={() => handleCancelEdit(item.id)}
                                            disabled={isSendingEdit}
                                            style={{
                                              padding: "8px 16px",
                                              border: "1px solid #d1d5db",
                                              borderRadius: "6px",
                                              backgroundColor: "white",
                                              color: "#374151",
                                              fontSize: "13px",
                                              fontWeight: "500",
                                              cursor: isSendingEdit ? "not-allowed" : "pointer",
                                              transition: "all 0.15s ease",
                                              opacity: isSendingEdit ? 0.6 : 1,
                                            }}
                                            onMouseEnter={(e) => {
                                              if (!isSendingEdit) {
                                                e.currentTarget.style.backgroundColor = "#f9fafb";
                                                e.currentTarget.style.borderColor = "#9ca3af";
                                              }
                                            }}
                                            onMouseLeave={(e) => {
                                              if (!isSendingEdit) {
                                                e.currentTarget.style.backgroundColor = "white";
                                                e.currentTarget.style.borderColor = "#d1d5db";
                                              }
                                            }}
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleSendEdit(
                                                item.id,
                                                item.run_id,
                                                item.artifact_id
                                              )
                                            }
                                            disabled={isSendingEdit || !canSendEdit(item.id)}
                                            style={{
                                              padding: "8px 16px",
                                              border: "none",
                                              borderRadius: "6px",
                                              backgroundColor: "#3b82f6",
                                              color: "white",
                                              fontSize: "13px",
                                              fontWeight: "500",
                                              cursor: (isSendingEdit || !canSendEdit(item.id)) ? "not-allowed" : "pointer",
                                              transition: "all 0.15s ease",
                                              opacity: (isSendingEdit || !canSendEdit(item.id)) ? 0.6 : 1,
                                              display: "flex",
                                              alignItems: "center",
                                              gap: "6px",
                                            }}
                                            onMouseEnter={(e) => {
                                              if (!isSendingEdit && canSendEdit(item.id)) {
                                                e.currentTarget.style.backgroundColor = "#2563eb";
                                              }
                                            }}
                                            onMouseLeave={(e) => {
                                              if (!isSendingEdit && canSendEdit(item.id)) {
                                                e.currentTarget.style.backgroundColor = "#3b82f6";
                                              }
                                            }}
                                          >
                                            {isSendingEdit ? (
                                              <>
                                                <span
                                                  className="spinner-border spinner-border-sm"
                                                  role="status"
                                                  style={{ width: "12px", height: "12px", borderWidth: "2px" }}
                                                />
                                                Sending...
                                              </>
                                            ) : (
                                              <>
                                                <Icon
                                                  icon="solar:plain-2-bold"
                                                  width="14"
                                                  height="14"
                                                />
                                                Send
                                              </>
                                            )}
                                          </button>
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
                
                {/* Hide Scrollbar Styles */}
                <style dangerouslySetInnerHTML={{__html: `
                  .custom-scrollbar-hidden {
                    -ms-overflow-style: none;  /* IE and Edge */
                    scrollbar-width: none;  /* Firefox */
                  }
                  .custom-scrollbar-hidden::-webkit-scrollbar {
                    display: none;  /* Chrome, Safari and Opera */
                  }
                `}} />
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
