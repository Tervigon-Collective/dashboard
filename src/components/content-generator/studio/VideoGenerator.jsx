"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { quickGenerate, getGenerationStatus, getReviewPrompts, updateReviewPrompts, approveReview, getGenerationResults, uploadProductImage, regenerateIndividualPrompt, regenerateIndividualStoryboardShot, regenerateFirstFrameImage, editFirstFrameImage } from "../../../services/contentGenerationApi";
import config from "../../../config";
import "./VideoGenerator.css";

const STEP_STATES = {
  INPUTS: "inputs",
  STORYBOARD: "storyboard",
  OUTPUT: "output",
};

const ASPECT_RATIO_OPTIONS = [
  { value: "square_1_1", label: "1:1", icon: "solar:smartphone-bold" },
  { value: "traditional_3_4", label: "3:4", icon: "solar:smartphone-bold" },
  { value: "classic_4_3", label: "4:3", icon: "solar:monitor-bold" },
  { value: "widescreen_16_9", label: "16:9", icon: "solar:monitor-bold" },
  { value: "social_story_9_16", label: "9:16", icon: "solar:smartphone-bold" },
  { value: "film_horizontal_21_9", label: "21:9", icon: "solar:monitor-bold" },
  { value: "film_vertical_9_21", label: "9:21", icon: "solar:smartphone-bold" },
];

export default function VideoGenerator({ initialData }) {
  const [currentStep, setCurrentStep] = useState(STEP_STATES.INPUTS);
  const [productImages, setProductImages] = useState(initialData?.productImages ? initialData.productImages.map((url, idx) => ({ id: Date.now() + idx, url, file: null })) : []); // Pre-fill from initialData
  const [productName, setProductName] = useState(initialData?.productName || "");
  const [productDescription, setProductDescription] = useState(initialData?.productDescription || "");
  const [aspectRatio, setAspectRatio] = useState(initialData?.aspectRatio || "widescreen_16_9");
  const [variants, setVariants] = useState(initialData?.variants || 3);
  const [generatedStoryboard, setGeneratedStoryboard] = useState(initialData?.storyboard || []); // Pre-fill storyboard if provided
  const [results, setResults] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [error, setError] = useState(null);
  const [editingStoryboardIndex, setEditingStoryboardIndex] = useState(null);
  const [editingStoryboardText, setEditingStoryboardText] = useState("");
  const [abortController, setAbortController] = useState(null);
  const [regeneratingStoryboardIndex, setRegeneratingStoryboardIndex] = useState(null);
  const [editingImageIndex, setEditingImageIndex] = useState(null);
  const [editingImagePrompt, setEditingImagePrompt] = useState("");
  const [regeneratingImageIndex, setRegeneratingImageIndex] = useState(null);
  const [isRegeneratingAll, setIsRegeneratingAll] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [initialInputs, setInitialInputs] = useState({ productName: initialData?.productName || "", productDescription: initialData?.productDescription || "", variants: initialData?.variants || 3, productImages: initialData?.productImages ? initialData.productImages.map((url, idx) => ({ id: Date.now() + idx, url, file: null })) : [] });
  const [hasInputChanges, setHasInputChanges] = useState(!initialData?.storyboard); // If storyboard provided, no need to regenerate
  const [imageVersionHistory, setImageVersionHistory] = useState({}); // Track image versions per shot: {shotIndex: [{url, prompt, timestamp}, ...]}
  const [currentImageVersion, setCurrentImageVersion] = useState({}); // Track current version index per shot: {shotIndex: versionIndex}
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [isGeneratingFirstFrames, setIsGeneratingFirstFrames] = useState(false);

  // Auto-advance to storyboard step if initialData provided a storyboard
  useEffect(() => {
    if (initialData?.storyboard && generatedStoryboard.length > 0) {
      setCurrentStep(STEP_STATES.STORYBOARD);
      // Trigger first frame generation for each shot
      generateFirstFramesForStoryboard();
    }
  }, [initialData]);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductImages((prev) => {
          const newImages = [...prev, { 
            id: Date.now() + Math.random(), 
            url: reader.result,
            file: file // Store the original File object
          }];
          setHasInputChanges(true);
          return newImages;
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (id) => {
    setProductImages((prev) => prev.filter((img) => img.id !== id));
    setHasInputChanges(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    files.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setProductImages((prev) => {
            const newImages = [...prev, { 
              id: Date.now() + Math.random(), 
              url: reader.result,
              file: file // Store the original File object
            }];
            setHasInputChanges(true);
            return newImages;
          });
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleGenerateStoryboard = async () => {
    if (!productName.trim() || !productDescription.trim()) {
      setError("Please provide both product name and description");
      return;
    }

    if (productImages.length === 0) {
      setError("Please upload at least one product image");
      return;
    }

    // Cancel previous request if any
    if (abortController) {
      abortController.abort();
      console.log("Previous request cancelled");
    }

    // Create new abort controller
    const newAbortController = new AbortController();
    setAbortController(newAbortController);

    setIsGenerating(true);
    setError(null);

    try {
      // Step 1: Upload all product images to the backend first
      const uploadedImageUrls = [];
      for (const img of productImages) {
        if (img.file) {
          const uploadResult = await uploadProductImage(img.file);
          uploadedImageUrls.push(uploadResult.url);
        } else if (img.url && img.url.startsWith('http')) {
          // Image from initialData (already uploaded URL)
          uploadedImageUrls.push(img.url);
        }
      }

      if (uploadedImageUrls.length === 0) {
        throw new Error("Failed to upload product images");
      }

      // Step 2: Call quick generate API for VIDEO generation
      const formData = {
        product_name: productName,
        long_description: productDescription,
        content_channel: "Video", // This triggers video generation
        number_of_variants: variants,
        uploaded_images: uploadedImageUrls,
        aspect_ratio: aspectRatio,
      };

      const response = await quickGenerate(formData);
      const newJobId = response.job_id;
      setJobId(newJobId);
      
      // Give backend time to initialize job before polling
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 3: Poll for job status until it reaches "pending_review" or "completed"
      let attempts = 0;
      const maxAttempts = 120; // 120 seconds max for video generation (longer than images)
      
      while (attempts < maxAttempts) {
        // Check if aborted
        if (newAbortController.signal.aborted) {
          console.log("Generation aborted by user");
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        
        let statusResponse;
        try {
          statusResponse = await getGenerationStatus(newJobId);
        } catch (statusError) {
          // If job not found yet (404), continue polling
          if (statusError.response?.status === 404) {
            console.log(`Job ${newJobId} not found yet, continuing to poll...`);
            attempts++;
            continue;
          }
          // For other errors, throw
          throw statusError;
        }
        
        if (statusResponse.status === "pending_review") {
          // Step 4: Fetch the generated storyboard prompts
          try {
            const reviewData = await getReviewPrompts(newJobId);
            setGeneratedStoryboard(reviewData.prompts || []);
            setCurrentStep(STEP_STATES.STORYBOARD);
            // Save current inputs as initial and reset change flag
            setInitialInputs({ productName, productDescription, variants, productImages: [...productImages] });
            setHasInputChanges(false);
            break;
          } catch (reviewError) {
            // If 400 error (not yet ready), continue polling
            if (reviewError.response?.status === 400) {
              console.log(`Review not ready yet for job ${newJobId}, continuing to poll...`);
              attempts++;
              continue;
            }
            // For other errors, throw
            throw reviewError;
          }
        } else if (statusResponse.status === "completed") {
          // Job completed - try to fetch review prompts if available
          try {
            const reviewData = await getReviewPrompts(newJobId);
            if (reviewData.prompts && reviewData.prompts.length > 0) {
              setGeneratedStoryboard(reviewData.prompts);
              setCurrentStep(STEP_STATES.STORYBOARD);
              setInitialInputs({ productName, productDescription, variants, productImages: [...productImages] });
              setHasInputChanges(false);
              break;
            } else {
              throw new Error("Job completed but no storyboard data available");
            }
          } catch (reviewErr) {
            throw new Error(`Job completed but failed to fetch storyboard: ${reviewErr.message}`);
          }
        } else if (statusResponse.status === "failed") {
          throw new Error(statusResponse.error || "Generation failed");
        }
        
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error("Timeout waiting for storyboard generation");
      }

    } catch (err) {
      if (err.name === 'AbortError' || newAbortController.signal.aborted) {
        console.log("Request was cancelled");
        return;
      }
      console.error("Error generating storyboard:", err);
      setError(err.message || "Failed to generate storyboard");
    } finally {
      setIsGenerating(false);
      setAbortController(null);
    }
  };

  // Function to generate first frame images for all shots in storyboard
  const generateFirstFramesForStoryboard = async () => {
    if (!jobId && !initialData?.storyboard) return;
    
    setIsGeneratingFirstFrames(true);
    setError(null);

    try {
      const shotsToGenerate = generatedStoryboard.map((shot, idx) => ({
        index: idx,
        description: shot.description || shot.prompt,
        shotNumber: shot.number || shot.shot_number
      }));

      // Generate first frame for each shot
      for (const shot of shotsToGenerate) {
        try {
          const result = await regenerateFirstFrameImage(jobId || 'temp-job-id', shot.index);
          
          // Update storyboard with first frame image
          setGeneratedStoryboard(prev => {
            const updated = [...prev];
            if (updated[shot.index]) {
              updated[shot.index] = {
                ...updated[shot.index],
                first_frame_image: result.image_url || result.url
              };
            }
            return updated;
          });

          // Initialize image version history
          setImageVersionHistory(prev => ({
            ...prev,
            [shot.index]: [{
              url: result.image_url || result.url,
              prompt: shot.description,
              timestamp: Date.now()
            }]
          }));

          setCurrentImageVersion(prev => ({
            ...prev,
            [shot.index]: 0
          }));

        } catch (shotError) {
          console.error(`Failed to generate first frame for shot ${shot.index}:`, shotError);
          // Continue with other shots even if one fails
        }
      }

    } catch (err) {
      console.error("Error generating first frames:", err);
      setError(err.message || "Failed to generate first frame images");
    } finally {
      setIsGeneratingFirstFrames(false);
    }
  };

  const handleAcceptStoryboard = async () => {
    setError(null); // Clear any previous errors first
    
    // If no jobId (storyboard from IdeaGenerator), create a new generation job with the storyboard
    if (!jobId) {
      await handleGenerateVideoFromExistingStoryboard();
      return;
    }

    // Cancel previous request if any
    if (abortController) {
      abortController.abort();
      console.log("Previous request cancelled");
    }

    // Create new abort controller
    const newAbortController = new AbortController();
    setAbortController(newAbortController);

    setIsGeneratingVideo(true);
    setError(null);

    try {
      // Build selected image versions mapping
      const selectedImages = {};
      generatedStoryboard.forEach((shot, index) => {
        const selectedFilename = getSelectedImageFilename(shot, index);
        selectedImages[index] = selectedFilename;
      });

      // Send selected image versions to backend before approval
      await updateReviewPrompts(jobId, {
        prompts: generatedStoryboard,
        selected_images: selectedImages
      });

      // Approve the storyboard to start actual video generation
      await approveReview(jobId);

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 180; // 3 minutes max for video generation
      
      while (attempts < maxAttempts) {
        // Check if aborted
        if (newAbortController.signal.aborted) {
          console.log("Generation aborted by user");
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const statusResponse = await getGenerationStatus(jobId);
        
        if (statusResponse.status === "completed") {
          // Fetch full results from the results endpoint
          const resultsData = await getGenerationResults(jobId);
          
          // Extract generated videos from the results
          const generatedVideos = resultsData.generated_videos || [];
          
          if (generatedVideos.length > 0) {
            // Normalize the video data with full URLs
            const normalizedVideos = generatedVideos.map((video, index) => {
              return {
                artifact_id: video.artifact_id || `video_artifact_${index}`,
                video_url: video.video_url ? `${config.pythonApi.baseURL}${video.video_url}` : null,
                thumbnail_url: video.thumbnail_url ? `${config.pythonApi.baseURL}${video.thumbnail_url}` : null,
                download_url: video.download_url ? `${config.pythonApi.baseURL}${video.download_url}` : null,
                // Keep other fields
                duration: video.duration,
                format: video.format,
              };
            });
            
            setResults(normalizedVideos);
            setCurrentStep(STEP_STATES.OUTPUT);
          } else {
            throw new Error("No videos generated");
          }
          break;
        } else if (statusResponse.status === "failed") {
          throw new Error(statusResponse.error || "Generation failed");
        }
        
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error("Timeout waiting for video generation");
      }

    } catch (err) {
      if (err.name === 'AbortError' || newAbortController.signal.aborted) {
        console.log("Request was cancelled");
        return;
      }
      console.error("Error generating video:", err);
      setError(err.message || "Failed to generate video");
      setCurrentStep(STEP_STATES.STORYBOARD); // Stay on storyboard step if failed
    } finally {
      setIsGeneratingVideo(false);
      setAbortController(null);
    }
  };

  // Handle video generation when storyboard comes from initialData (no jobId)
  const handleGenerateVideoFromExistingStoryboard = async () => {
    setIsGeneratingVideo(true);
    setError(null);

    try {
      // Upload product images first
      const uploadedImageUrls = [];
      for (const img of productImages) {
        try {
          if (img.file) {
            // Upload file object
            const uploadResult = await uploadProductImage(img.file);
            uploadedImageUrls.push(uploadResult.url);
          } else if (img.url) {
            if (img.url.startsWith('http')) {
              // Already an HTTP URL, use directly
              uploadedImageUrls.push(img.url);
            } else if (img.url.startsWith('data:')) {
              // Base64 data URL, need to upload it
              // Convert data URL to File object
              const response = await fetch(img.url);
              const blob = await response.blob();
              const file = new File([blob], `image_${Date.now()}.png`, { type: blob.type });
              const uploadResult = await uploadProductImage(file);
              uploadedImageUrls.push(uploadResult.url);
            }
          }
        } catch (imgError) {
          console.warn(`Failed to process image:`, imgError);
          // Continue with other images even if one fails
        }
      }

      if (uploadedImageUrls.length === 0) {
        throw new Error("Failed to process product images. Please ensure images are properly uploaded.");
      }

      // Create a brief with the existing storyboard (don't regenerate)
      console.log("Using existing storyboard for video generation, skipping storyboard regeneration");
      
      const briefData = {
        product_name: productName,
        long_description: productDescription,
        content_channel: "Video",
        aspect_ratio: aspectRatio,
        number_of_variants: variants,
        uploaded_images: uploadedImageUrls
      };

      // Call quickGenerate to create the brief and job
      const response = await quickGenerate(briefData);
      console.log("Quick generate response (for brief creation):", response);

      const newJobId = response.job_id;
      if (!newJobId) {
        throw new Error("No job ID returned from server");
      }

      setJobId(newJobId);

      // Wait for the job to reach "pending_review" status first
      // The backend generates storyboard in background, we need to wait for it
      console.log("Waiting for job to reach pending_review status...");
      const maxPollAttempts = 60;
      let pollAttempt = 0;
      let jobReachedReview = false;
      
      while (pollAttempt < maxPollAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          const statusResponse = await getGenerationStatus(newJobId);
          console.log(`Poll attempt ${pollAttempt + 1}: status = ${statusResponse.status}`);
          
          if (statusResponse.status === "pending_review") {
            jobReachedReview = true;
            console.log("Job reached pending_review, now updating with existing storyboard");
            break;
          } else if (statusResponse.status === "failed") {
            throw new Error(statusResponse.error || "Job failed during setup");
          }
        } catch (err) {
          console.warn(`Status check attempt ${pollAttempt + 1} failed:`, err);
        }
        
        pollAttempt++;
      }

      if (!jobReachedReview) {
        console.warn("Job didn't reach pending_review in time, will try to update storyboard anyway");
      }

      // Now update the storyboard with our existing one from IdeaGenerator
      try {
        const existingStoryboard = generatedStoryboard.map((shot, idx) => ({
          shot_number: shot.number || shot.shot_number || (idx + 1),
          prompt: shot.description || shot.prompt,
          voiceover: shot.voiceover || null
        }));
        
        console.log("Updating job with existing storyboard from IdeaGenerator:", existingStoryboard);
        await updateReviewPrompts(newJobId, existingStoryboard);
        console.log("Successfully updated storyboard");
      } catch (updateErr) {
        console.error("Failed to update storyboard:", updateErr);
        throw new Error("Could not update storyboard with existing one. The generated storyboard will be used instead.");
      }

      // Now approve and generate video directly
      try {
        console.log("Approving review to start video generation...");
        await approveReview(newJobId);
        console.log("Approved review, video generation should start");
      } catch (approveErr) {
        console.error("Approval failed:", approveErr);
        throw new Error("Could not approve review for video generation");
      }

      // Poll for video completion
      const maxAttempts = 120;
      let attempts = 0;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const statusResponse = await getGenerationStatus(newJobId);
        console.log(`Status check attempt ${attempts + 1}:`, statusResponse);
        
        if (statusResponse.status === "completed") {
          const resultsData = await getGenerationResults(newJobId);
          setResults(resultsData.results || []);
          setCurrentStep(STEP_STATES.OUTPUT);
          break;
        } else if (statusResponse.status === "failed") {
          throw new Error(statusResponse.error || "Generation failed");
        }
        
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error("Timeout waiting for video generation");
      }

    } catch (err) {
      console.error("Error generating video from storyboard:", err);
      setError(err.message || "Failed to generate video");
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleRegenerateStoryboard = async () => {
    // Cancel previous request if any
    if (abortController) {
      abortController.abort();
      console.log("Previous request cancelled");
    }

    setIsRegeneratingAll(true);
    setGeneratedStoryboard([]);
    setJobId(null);
    setError(null); // Clear any previous errors
    await handleGenerateStoryboard();
    setIsRegeneratingAll(false);
  };

  const handleRegenerateIndividualStoryboard = async (index) => {
    if (!jobId) {
      setError("No job ID found");
      return;
    }

    setRegeneratingStoryboardIndex(index);
    setError(null);

    try {
      // Call backend to regenerate this specific storyboard shot using AI
      const response = await regenerateIndividualStoryboardShot(jobId, index);
      
      if (response.success && response.new_prompt) {
        // Update the storyboard shot in state
        const updatedStoryboard = [...generatedStoryboard];
        updatedStoryboard[index].prompt = response.new_prompt;
        setGeneratedStoryboard(updatedStoryboard);
      }
    } catch (err) {
      console.error("Error regenerating storyboard shot:", err);
      setError(err.message || "Failed to regenerate storyboard shot");
    } finally {
      setRegeneratingStoryboardIndex(null);
    }
  };

  const handleEditStoryboard = async (index, newPrompt) => {
    const updatedStoryboard = [...generatedStoryboard];
    updatedStoryboard[index].prompt = newPrompt;
    setGeneratedStoryboard(updatedStoryboard);

    // Update storyboard on backend
    if (jobId) {
      try {
        await updateReviewPrompts(jobId, { prompts: updatedStoryboard });
      } catch (err) {
        console.error("Error updating storyboard:", err);
      }
    }
  };

  const handleSaveStoryboardEdit = async (index) => {
    await handleEditStoryboard(index, editingStoryboardText);
    setEditingStoryboardIndex(null);
    setEditingStoryboardText("");
  };

  const handleCancelStoryboardEdit = () => {
    setEditingStoryboardIndex(null);
    setEditingStoryboardText("");
  };

  const handleEditFirstFrameImage = async (index) => {
    // Get the current prompt for this shot
    const currentShot = generatedStoryboard[index];
    const currentPrompt = currentShot?.prompts?.first_frame_prompt || "";
    
    setEditingImageIndex(index);
    setEditingImagePrompt(currentPrompt);
  };

  const handleSaveImageEdit = async (index) => {
    if (!jobId || !editingImagePrompt.trim()) {
      setError("Please provide a prompt");
      return;
    }

    setRegeneratingImageIndex(index);
    setEditingImageIndex(null);
    setError(null);

    try {
      const response = await editFirstFrameImage(jobId, index, editingImagePrompt);
      
      if (response.success) {
        // Add to version history
        const timestamp = Date.now();
        const newVersionUrl = `${config.pythonApi.baseURL}${response.new_image_url}?v=${timestamp}`;
        
        setImageVersionHistory(prev => {
          const shotHistory = prev[index] || [];
          const newHistory = {
            ...prev,
            [index]: [...shotHistory, {
              url: newVersionUrl,
              prompt: editingImagePrompt,
              timestamp: timestamp
            }]
          };
          
          // Set current version to show the latest (newly added version)
          setCurrentImageVersion(prevVersions => ({
            ...prevVersions,
            [index]: newHistory[index].length // Point to the latest version
          }));
          
          return newHistory;
        });
        
        // Refresh storyboard data
        const reviewData = await getReviewPrompts(jobId);
        setGeneratedStoryboard(reviewData.prompts || []);
      }
    } catch (err) {
      console.error("Error editing first frame image:", err);
      setError(err.message || "Failed to edit first frame image");
    } finally {
      setRegeneratingImageIndex(null);
      setEditingImagePrompt("");
    }
  };

  const handleCancelImageEdit = () => {
    setEditingImageIndex(null);
    setEditingImagePrompt("");
  };

  const handlePreviousImageVersion = (index) => {
    setCurrentImageVersion(prev => ({
      ...prev,
      [index]: Math.max(0, (prev[index] || 0) - 1)
    }));
  };

  const handleNextImageVersion = (index) => {
    const maxVersion = (imageVersionHistory[index]?.length || 0);
    setCurrentImageVersion(prev => ({
      ...prev,
      [index]: Math.min(maxVersion, (prev[index] || 0) + 1)
    }));
  };

  const getDisplayImageUrl = (shot, index) => {
    const currentVersion = currentImageVersion[index] || 0;
    const versionHistory = imageVersionHistory[index] || [];
    
    // If there are versions and we're viewing a historical version, use that
    if (versionHistory.length > 0 && currentVersion > 0 && currentVersion <= versionHistory.length) {
      return versionHistory[currentVersion - 1].url;
    }
    
    // Otherwise use the latest from storyboard with cache busting
    if (shot.first_frame_image_url) {
      const timestamp = versionHistory.length > 0 ? versionHistory[versionHistory.length - 1].timestamp : Date.now();
      return `${config.pythonApi.baseURL}${shot.first_frame_image_url}?v=${timestamp}`;
    }
    
    return null;
  };

  const getSelectedImageFilename = (shot, index) => {
    const currentVersion = currentImageVersion[index] || 0;
    const versionHistory = imageVersionHistory[index] || [];
    
    // If a specific version is selected, extract filename from version URL
    if (versionHistory.length > 0 && currentVersion > 0 && currentVersion <= versionHistory.length) {
      const versionUrl = versionHistory[currentVersion - 1].url;
      // Extract filename from URL (e.g., /runs/{run_id}/shots/{clip_id}/first_frame_v123.png)
      const match = versionUrl.match(/\/([^\/\?]+)(?:\?.*)?$/);
      return match ? match[1] : 'first_frame.png';
    }
    
    // Default to first_frame.png
    return 'first_frame.png';
  };

  const handleRegenerateFirstFrameImage = async (index) => {
    if (!jobId) {
      setError("No job ID found");
      return;
    }

    setRegeneratingImageIndex(index);
    setError(null);

    try {
      // Call backend to regenerate this specific first frame image
      const response = await regenerateFirstFrameImage(jobId, index);
      
      if (response.success) {
        // Add to version history
        const timestamp = Date.now();
        const newVersionUrl = `${config.pythonApi.baseURL}${response.new_image_url}?v=${timestamp}`;
        
        setImageVersionHistory(prev => {
          const shotHistory = prev[index] || [];
          const newHistory = {
            ...prev,
            [index]: [...shotHistory, {
              url: newVersionUrl,
              prompt: "Regenerated",
              timestamp: timestamp
            }]
          };
          
          // Set current version to show the latest (newly added version)
          setCurrentImageVersion(prevVersions => ({
            ...prevVersions,
            [index]: newHistory[index].length // Point to the latest version
          }));
          
          return newHistory;
        });
        
        // Refresh the storyboard data to get updated first frame image
        const reviewData = await getReviewPrompts(jobId);
        setGeneratedStoryboard(reviewData.prompts || []);
      }
    } catch (err) {
      console.error("Error regenerating first frame image:", err);
      setError(err.message || "Failed to regenerate first frame image");
    } finally {
      setRegeneratingImageIndex(null);
    }
  };

  return (
    <div className="video-generator">
      <div className="video-generator__stepper">
        {/* Step 1: Inputs */}
        <div
          className={`stepper-column ${
            currentStep === STEP_STATES.INPUTS ? "active" : ""
          }`}
        >
          <div className="stepper-header">
            <div className="stepper-number">1</div>
            <div className="stepper-title">Inputs</div>
          </div>

          <div className="stepper-content">
            <div className="form-group">
              <label className="form-label">Product Images</label>
              <div
                className="image-upload-area"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                {productImages.length > 0 ? (
                  <div className="image-preview-grid">
                    {productImages.map((img) => (
                      <div key={img.id} className="image-preview-item">
                        <img src={img.url} alt="Product" />
                        <button
                          className="image-remove"
                          onClick={() => handleRemoveImage(img.id)}
                        >
                          <Icon icon="solar:trash-bin-minimalistic-bold" />
                        </button>
                      </div>
                    ))}
                    {productImages.length < 5 && (
                      <label className="image-upload-add">
                        <Icon icon="solar:add-circle-bold" className="upload-icon" />
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                          className="image-upload-input"
                        />
                      </label>
                    )}
                  </div>
                ) : (
                  <label className="image-upload-label">
                    <Icon icon="solar:gallery-add-bold" className="upload-icon" />
                    <span>Upload product images</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="image-upload-input"
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Product Name</label>
              <input
                type="text"
                className="form-input"
                value={productName}
                onChange={(e) => {
                  setProductName(e.target.value);
                  setHasInputChanges(true);
                }}
                placeholder="e.g., ZephyrLite"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Product Description</label>
              <textarea
                className="form-textarea"
                value={productDescription}
                onChange={(e) => {
                  setProductDescription(e.target.value);
                  setHasInputChanges(true);
                }}
                placeholder="Describe your product..."
                rows={4}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Aspect Ratio</label>
              <div className="aspect-ratio-grid">
                {ASPECT_RATIO_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`aspect-ratio-btn ${aspectRatio === option.value ? "active" : ""}`}
                    onClick={() => {
                      setAspectRatio(option.value);
                      setHasInputChanges(true);
                    }}
                  >
                    <Icon 
                      icon={option.icon} 
                      className={option.value.includes("widescreen") || option.value.includes("film_horizontal") || option.value.includes("classic") ? "icon-landscape" : ""}
                    />
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Video Shots</label>
              <input
                type="number"
                className="form-input"
                value={variants}
                onChange={(e) => {
                  setVariants(Number(e.target.value));
                  setHasInputChanges(true);
                }}
                min="2"
                max="8"
                placeholder="Number of video shots"
              />
            </div>

            <button
              className="btn btn-primary"
              onClick={handleGenerateStoryboard}
              disabled={isGenerating || currentStep !== STEP_STATES.INPUTS || !productName.trim() || !productDescription.trim() || !hasInputChanges}
            >
              {isGenerating && currentStep === STEP_STATES.INPUTS ? "Generating..." : "Generate Storyboard →"}
            </button>
          </div>
        </div>

        {/* Step 2: Storyboard */}
        <div
          className={`stepper-column ${
            currentStep === STEP_STATES.STORYBOARD || currentStep === STEP_STATES.OUTPUT ? "active" : ""
          }`}
        >
          <div className="stepper-header">
            <div className="stepper-number">2</div>
            <div className="stepper-title">Storyboard</div>
            {generatedStoryboard.length > 0 && (
              <button
                className="btn-icon gallery-icon"
                onClick={() => setShowGalleryModal(true)}
                title="View all images"
              >
                <Icon icon="solar:eye-bold" />
              </button>
            )}
          </div>

          {(isGenerating && currentStep === STEP_STATES.INPUTS) || isRegeneratingAll ? (
            <div className="stepper-loading">
              <Icon icon="solar:refresh-bold" className="loading-spinner" />
              <p>{isRegeneratingAll ? "Regenerating all shots..." : "Generating storyboard..."}</p>
            </div>
          ) : generatedStoryboard.length > 0 ? (
            <div className="stepper-content">
              <div className="storyboard-visual-list">
                {generatedStoryboard.map((shot, index) => (
                  <div key={index} className="storyboard-visual-item">
                    <div className="storyboard-header">
                      <span className="shot-number">Shot {index + 1}</span>
                      <div className="storyboard-actions-inline">
                        {editingStoryboardIndex === index ? (
                          <>
                            <button
                              className="btn-icon"
                              onClick={() => handleSaveStoryboardEdit(index)}
                              title="Save"
                            >
                              <Icon icon="solar:check-circle-bold" />
                            </button>
                            <button
                              className="btn-icon"
                              onClick={handleCancelStoryboardEdit}
                              title="Cancel"
                            >
                              <Icon icon="solar:close-circle-bold" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="btn-icon"
                              onClick={() => handleRegenerateIndividualStoryboard(index)}
                              title={jobId ? "Regenerate this shot" : "Use 'Regenerate Storyboard' to generate new shots"}
                              disabled={regeneratingStoryboardIndex === index || !jobId}
                            >
                              {regeneratingStoryboardIndex === index ? (
                                <Icon icon="solar:refresh-bold" className="spinning" />
                              ) : (
                                <Icon icon="solar:refresh-bold" />
                              )}
                            </button>
                            <button
                              className="btn-icon"
                              onClick={() => {
                                setEditingStoryboardIndex(index);
                                setEditingStoryboardText(shot.prompt);
                              }}
                              title="Edit description"
                            >
                              <Icon icon="solar:pen-bold" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* First Frame Image */}
                    <div className="first-frame-container">
                      {editingImageIndex === index ? (
                        <div className="image-edit-dialog">
                          <div className="image-edit-header">
                            <span>Edit Image Prompt</span>
                            <div className="image-edit-actions">
                              <button
                                className="btn-icon"
                                onClick={() => handleSaveImageEdit(index)}
                                title="Save & Regenerate"
                              >
                                <Icon icon="solar:check-circle-bold" />
                              </button>
                              <button
                                className="btn-icon"
                                onClick={handleCancelImageEdit}
                                title="Cancel"
                              >
                                <Icon icon="solar:close-circle-bold" />
                              </button>
                            </div>
                          </div>
                          <textarea
                            className="image-edit-textarea"
                            value={editingImagePrompt}
                            onChange={(e) => setEditingImagePrompt(e.target.value)}
                            placeholder="Enter a detailed prompt for the image..."
                            rows={6}
                            autoFocus
                          />
                        </div>
                      ) : shot.first_frame_image_url ? (
                        <div className="first-frame-wrapper">
                          <img 
                            src={getDisplayImageUrl(shot, index)}
                            alt={`Shot ${index + 1} first frame`}
                            className="first-frame-image"
                            key={getDisplayImageUrl(shot, index)} // Force reload on URL change
                          />
                          {/* Version Navigation */}
                          {imageVersionHistory[index]?.length > 0 && (
                            <div className="image-version-nav">
                              <button
                                className="version-nav-btn"
                                onClick={() => handlePreviousImageVersion(index)}
                                disabled={(currentImageVersion[index] || 0) <= 0}
                                title="Previous version"
                              >
                                <Icon icon="solar:alt-arrow-left-bold" />
                              </button>
                              <span className="version-indicator">
                                {(currentImageVersion[index] || 0) + 1} / {(imageVersionHistory[index]?.length || 0) + 1}
                              </span>
                              <button
                                className="version-nav-btn"
                                onClick={() => handleNextImageVersion(index)}
                                disabled={(currentImageVersion[index] || 0) >= (imageVersionHistory[index]?.length || 0)}
                                title="Next version"
                              >
                                <Icon icon="solar:alt-arrow-right-bold" />
                              </button>
                            </div>
                          )}
                          <div className="first-frame-overlay">
                            <button
                              className="frame-action-btn"
                              onClick={() => handleEditFirstFrameImage(index)}
                              title="Edit frame prompt"
                              disabled={regeneratingImageIndex === index}
                            >
                              {regeneratingImageIndex === index ? (
                                <Icon icon="solar:refresh-bold" className="spinning" />
                              ) : (
                                <Icon icon="solar:pen-bold" />
                              )}
                            </button>
                            <button
                              className="frame-action-btn"
                              onClick={() => handleRegenerateFirstFrameImage(index)}
                              title="Regenerate frame"
                              disabled={regeneratingImageIndex === index}
                            >
                              {regeneratingImageIndex === index ? (
                                <Icon icon="solar:refresh-bold" className="spinning" />
                              ) : (
                                <Icon icon="solar:refresh-bold" />
                              )}
                            </button>
                          </div>
                        </div>
                      ) : isGeneratingFirstFrames ? (
                        <div className="first-frame-placeholder">
                          <Icon icon="solar:refresh-bold" className="spinning" />
                          <span>Generating first frame...</span>
                        </div>
                      ) : (
                        <div className="first-frame-placeholder">
                          <Icon icon="solar:gallery-bold" />
                          <span>First frame not available</span>
                        </div>
                      )}
                    </div>

                    {/* Voiceover */}
                    {shot.voiceover && (
                      <div className="voiceover-section">
                        <div className="voiceover-header">
                          <Icon icon="solar:microphone-2-bold" />
                          <span>Voiceover</span>
                        </div>
                        <div className="voiceover-text">
                          {shot.voiceover.text || shot.voiceover}
                        </div>
                        {shot.voiceover.duration && (
                          <div className="voiceover-meta">
                            Duration: {shot.voiceover.duration}s
                          </div>
                        )}
                      </div>
                    )}

                    {/* Story Description */}
                    <div className="story-description">
                      {regeneratingStoryboardIndex === index ? (
                        <div className="storyboard-regenerating">
                          <Icon icon="solar:refresh-bold" className="spinning" />
                          <span>Regenerating shot...</span>
                        </div>
                      ) : editingStoryboardIndex === index ? (
                        <textarea
                          className="storyboard-edit-textarea"
                          value={editingStoryboardText}
                          onChange={(e) => setEditingStoryboardText(e.target.value)}
                          rows={4}
                          autoFocus
                        />
                      ) : (
                        <div 
                          className="storyboard-text"
                          onClick={() => {
                            setEditingStoryboardIndex(index);
                            setEditingStoryboardText(shot.prompt);
                          }}
                          style={{ cursor: 'pointer' }}
                          title="Click to edit description"
                        >
                          {shot.prompt}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <div className="error-message">
                  <Icon icon="solar:danger-circle-bold" />
                  {error}
                </div>
              )}

              <div className="storyboard-actions">
                <button
                  className="btn btn-sm btn-outline"
                  onClick={handleRegenerateStoryboard}
                  disabled={isGenerating || isRegeneratingAll}
                >
                  <Icon icon="solar:refresh-bold" />
                  Regenerate Storyboard
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleAcceptStoryboard}
                  disabled={isGenerating || isGeneratingVideo}
                >
                  {isGeneratingVideo ? "Generating Video..." : "Accept & Generate Video →"}
                </button>
              </div>
            </div>
          ) : (
            <div className="stepper-locked">
              <Icon icon="solar:lock-password-bold" className="locked-icon" />
              <p>Generate storyboard to unlock</p>
            </div>
          )}
        </div>

        {/* Step 3: Output */}
        <div
          className={`stepper-column ${
            currentStep === STEP_STATES.OUTPUT ? "active" : ""
          }`}
        >
          <div className="stepper-header">
            <div className="stepper-number">3</div>
            <div className="stepper-title">Output</div>
          </div>

          {isGeneratingVideo ? (
            <div className="stepper-loading">
              <Icon icon="solar:refresh-bold" className="loading-spinner" />
              <p>Generating video...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="stepper-content">
              <div className="videos-grid">
                {results.map((result, index) => {
                  return (
                    <div key={result.artifact_id || index} className="video-card">
                      <div className="video-player">
                        {result.video_url ? (
                          <video 
                            controls
                            className="video-element"
                            poster={result.thumbnail_url}
                          >
                            <source src={result.video_url} type="video/mp4" />
                            Your browser does not support the video tag.
                          </video>
                        ) : (
                          <div className="video-placeholder">
                            <Icon icon="solar:video-library-bold" />
                            <span>Video not available</span>
                          </div>
                        )}
                      </div>
                      <div className="video-actions">
                        {result.download_url && (
                          <a
                            href={result.download_url}
                            download
                            className="btn btn-sm btn-outline"
                            style={{ textDecoration: "none" }}
                          >
                            <Icon icon="solar:download-bold" />
                            Download
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {error && (
                <div className="error-message">
                  <Icon icon="solar:danger-circle-bold" />
                  {error}
                </div>
              )}
            </div>
          ) : (
            <div className="stepper-locked">
              <Icon icon="solar:lock-password-bold" className="locked-icon" />
              <p>Accept storyboard to unlock</p>
            </div>
          )}
        </div>
      </div>

      {/* Image Gallery Modal */}
      {showGalleryModal && (
        <div className="gallery-modal-overlay" onClick={() => setShowGalleryModal(false)}>
          <div className="gallery-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="gallery-modal-header">
              <div className="gallery-modal-title">Storyboard</div>
              <button
                className="btn-icon"
                onClick={() => setShowGalleryModal(false)}
                title="Close"
              >
                <Icon icon="solar:close-circle-bold" />
              </button>
            </div>
            <div className="gallery-storyboard-list">
              {generatedStoryboard.map((shot, index) => {
                const imageUrl = getDisplayImageUrl(shot, index);
                const voiceoverText = shot.voiceover?.text || shot.voiceover || shot.prompt;
                return imageUrl ? (
                  <div key={index} className="gallery-storyboard-item">
                    <div className="gallery-shot-header">Shot {index + 1}</div>
                    <div className="gallery-shot-content">
                      <img
                        src={imageUrl}
                        alt={`Shot ${index + 1}`}
                        className="gallery-shot-image"
                      />
                      <div className="gallery-shot-text">
                        {voiceoverText || "No voiceover"}
                      </div>
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

