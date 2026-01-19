"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { quickGenerate, getGenerationStatus, getReviewPrompts, updateReviewPrompts, approveReview, getGenerationResults, uploadProductImage, regenerateIndividualPrompt, chatGenerateImage, chatGetStatus } from "../../../services/contentGenerationApi";
import config from "../../../config";
import "./ImageGenerator.css";

const STEP_STATES = {
  INPUTS: "inputs",
  PROMPT: "prompt",
  RESULTS: "results",
};

export default function ImageGenerator({ initialData }) {
  const [currentStep, setCurrentStep] = useState(STEP_STATES.INPUTS);
  const [productImages, setProductImages] = useState(initialData?.productImages ? initialData.productImages.map((url, idx) => ({ id: Date.now() + idx, url, file: null })) : []); // Pre-fill from initialData
  const [productName, setProductName] = useState(initialData?.productName || "");
  const [productDescription, setProductDescription] = useState(initialData?.productDescription || "");
  const [variants, setVariants] = useState(initialData?.variants || 5);
  const [generatedPrompts, setGeneratedPrompts] = useState(initialData?.prompt ? [{ prompt: initialData.prompt, variant_index: 0 }] : []); // Pre-fill prompt if provided
  const [results, setResults] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [error, setError] = useState(null);
  const [editingPromptIndex, setEditingPromptIndex] = useState(null);
  const [editingPromptText, setEditingPromptText] = useState("");
  const [abortController, setAbortController] = useState(null);
  const [regeneratingPromptIndex, setRegeneratingPromptIndex] = useState(null);
  const [isRegeneratingAll, setIsRegeneratingAll] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [initialInputs, setInitialInputs] = useState({ productName: initialData?.productName || "", productDescription: initialData?.productDescription || "", variants: initialData?.variants || 5, productImages: initialData?.productImages ? initialData.productImages.map((url, idx) => ({ id: Date.now() + idx, url, file: null })) : [] });
  const [hasInputChanges, setHasInputChanges] = useState(!initialData?.prompt); // If prompt provided, no need to regenerate

  // Auto-advance to prompt step if initialData provided a prompt
  useEffect(() => {
    if (initialData?.prompt && generatedPrompts.length > 0) {
      setCurrentStep(STEP_STATES.PROMPT);
      setError(null); // Clear any previous errors
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

  const handleGeneratePrompt = async () => {
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

      // Step 2: Call quick generate API to create brief and get prompts
      const formData = {
        product_name: productName,
        long_description: productDescription,
        content_channel: "Image",
        number_of_variants: variants,
        uploaded_images: uploadedImageUrls, // Use uploaded URLs instead of base64
        // Don't send product_image_id - let backend extract it from uploaded_images
      };

      const response = await quickGenerate(formData);
      const newJobId = response.job_id;
      setJobId(newJobId);

      // Step 3: Poll for job status until it reaches "pending_review"
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds max
      
      while (attempts < maxAttempts) {
        // Check if aborted
        if (newAbortController.signal.aborted) {
          console.log("Generation aborted by user");
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResponse = await getGenerationStatus(newJobId);
        
        if (statusResponse.status === "pending_review") {
          // Step 4: Fetch the generated prompts
          const reviewData = await getReviewPrompts(newJobId);
          setGeneratedPrompts(reviewData.prompts || []);
          setCurrentStep(STEP_STATES.PROMPT);
          // Save current inputs as initial and reset change flag
          setInitialInputs({ productName, productDescription, variants, productImages: [...productImages] });
          setHasInputChanges(false);
          break;
        } else if (statusResponse.status === "failed") {
          throw new Error(statusResponse.error || "Generation failed");
        }
        
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error("Timeout waiting for prompt generation");
      }

    } catch (err) {
      if (err.name === 'AbortError' || newAbortController.signal.aborted) {
        console.log("Request was cancelled");
        return;
      }
      console.error("Error generating prompt:", err);
      setError(err.message || "Failed to generate prompt");
    } finally {
      setIsGenerating(false);
      setAbortController(null);
    }
  };

  const handleAcceptPrompt = async () => {
    setError(null); // Clear any previous errors first
    
    // If no jobId (prompt from IdeaGenerator), create a new generation job with the prompt
    if (!jobId) {
      await handleGenerateImagesFromExistingPrompt();
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

    setIsGeneratingImages(true);
    setError(null);

    try {
      // Approve the prompts to start actual generation
      await approveReview(jobId);

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 120; // 2 minutes max
      
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
          
          // Extract generated images from the results
          const generatedImages = resultsData.generated_images || [];
          
          if (generatedImages.length > 0) {
            // Normalize the image data with full URLs
            const normalizedImages = generatedImages.map((img, index) => {
              const freepikResult = img.freepik_result || {};
              const localUrl = freepikResult.local_url;
              const downloadUrl = freepikResult.download_url;
              
              return {
                artifact_id: img.artifact_id || `artifact_${index}`,
                // Construct full URL for local_url
                local_url: localUrl ? `${config.pythonApi.baseURL}${localUrl}` : null,
                // Construct full URL for download_url
                download_url: downloadUrl ? `${config.pythonApi.baseURL}${downloadUrl}` : null,
                // Keep other fields
                url: freepikResult.url,
                base64: freepikResult.base64,
              };
            });
            
            setResults(normalizedImages);
            setCurrentStep(STEP_STATES.RESULTS);
          } else {
            throw new Error("No images generated");
          }
          break;
        } else if (statusResponse.status === "failed") {
          throw new Error(statusResponse.error || "Generation failed");
        }
        
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error("Timeout waiting for image generation");
      }

    } catch (err) {
      if (err.name === 'AbortError' || newAbortController.signal.aborted) {
        console.log("Request was cancelled");
        return;
      }
      console.error("Error generating images:", err);
      setError(err.message || "Failed to generate images");
      setCurrentStep(STEP_STATES.PROMPT); // Stay on prompt step if failed
    } finally {
      setIsGeneratingImages(false);
      setAbortController(null);
    }
  };

  // Handle image generation when prompt comes from initialData (no jobId)
  // Use direct chat API to skip prompt regeneration entirely
  const handleGenerateImagesFromExistingPrompt = async () => {
    setIsGeneratingImages(true);
    setError(null);

    try {
      console.log("Using existing prompt for DIRECT image generation (no prompt regeneration)");
      
      // Upload product images first and get their IDs
      const uploadedImageIds = [];
      for (const img of productImages) {
        try {
          if (img.file) {
            // Upload file object
            const uploadResult = await uploadProductImage(img.file);
            console.log("Upload result:", uploadResult);
            // Backend returns product_image_id
            uploadedImageIds.push(uploadResult.product_image_id);
          } else if (img.url) {
            if (img.url.startsWith('http')) {
              // Extract image ID from URL if possible
              const urlMatch = img.url.match(/product_images\/([a-f0-9-]+)/);
              if (urlMatch) {
                uploadedImageIds.push(urlMatch[1]);
              } else {
                console.warn("Could not extract image ID from URL:", img.url);
              }
            } else if (img.url.startsWith('data:')) {
              // Base64 data URL, need to upload it
              const response = await fetch(img.url);
              const blob = await response.blob();
              const file = new File([blob], `image_${Date.now()}.png`, { type: blob.type });
              const uploadResult = await uploadProductImage(file);
              console.log("Upload result for base64:", uploadResult);
              uploadedImageIds.push(uploadResult.product_image_id);
            }
          }
        } catch (imgError) {
          console.error(`Failed to process image:`, imgError);
        }
      }

      console.log("Uploaded image IDs:", uploadedImageIds);
      console.log("Product images array:", productImages);

      if (uploadedImageIds.length === 0) {
        console.warn("No product images were uploaded, continuing without reference images");
      }

      // Generate images for each prompt using the direct chat API
      const allResults = [];
      for (let i = 0; i < generatedPrompts.length; i++) {
        const promptObj = generatedPrompts[i];
        console.log(`Generating image ${i + 1}/${generatedPrompts.length} with prompt:`, promptObj.prompt);
        console.log(`Using reference_image_ids:`, uploadedImageIds);
        
        try {
          // Create image generation job (returns job_id, not actual images)
          const createResult = await chatGenerateImage({
            prompt: promptObj.prompt,
            reference_image_ids: uploadedImageIds,
            num_images: 1,
            aspect_ratio: "1:1",
            quality: "high"
          });

          console.log(`Created image generation job ${i + 1}:`, createResult);
          
          if (!createResult.job_id) {
            throw new Error("No job ID returned from image generation API");
          }

          // Poll for job completion
          const maxPollAttempts = 60;
          let pollAttempt = 0;
          let jobCompleted = false;
          let generatedImages = [];

          console.log(`Starting to poll for job ${createResult.job_id}, max attempts: ${maxPollAttempts}`);

          while (pollAttempt < maxPollAttempts && !jobCompleted) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between polls
            
            try {
              const statusResponse = await chatGetStatus(createResult.job_id);
              console.log(`Poll attempt ${pollAttempt + 1} for job ${i + 1}, raw response:`, JSON.stringify(statusResponse, null, 2));
              
              // Response has format: { success: true, job: { status, results, ... } }
              const job = statusResponse.job || statusResponse;
              const jobStatus = job.status;
              
              console.log(`Job ${createResult.job_id} status: "${jobStatus}"`);
              
              if (jobStatus === "completed") {
                console.log(`Job completed! Results object:`, job.results);
                // Get results from the job object
                if (job.results && job.results.images && job.results.images.length > 0) {
                  generatedImages = job.results.images;
                  console.log(`Got ${generatedImages.length} images from completed job:`, generatedImages);
                } else {
                  console.warn(`Job marked completed but no images found in results:`, job);
                }
                jobCompleted = true;
              } else if (jobStatus === "failed") {
                const errorMsg = job.error || "Job failed during image generation";
                console.error(`Job failed:`, errorMsg, job);
                throw new Error(errorMsg);
              } else {
                console.log(`Job still processing, status: ${jobStatus}`);
              }
            } catch (pollError) {
              console.error(`Poll attempt ${pollAttempt + 1} for image ${i + 1} failed:`, pollError);
              // Don't throw here, continue polling
            }
            
            pollAttempt++;
          }

          console.log(`Polling finished. jobCompleted: ${jobCompleted}, attempts: ${pollAttempt}, images: ${generatedImages.length}`);

          if (!jobCompleted) {
            throw new Error(`Timeout waiting for image ${i + 1} generation`);
          }

          // Add generated images to results
          if (generatedImages.length > 0) {
            for (const img of generatedImages) {
              allResults.push({
                variant_index: i,
                prompt: promptObj.prompt,
                image_url: img.image_url || img.url || img,
                timestamp: Date.now()
              });
            }
          }
        } catch (genError) {
          console.error(`Failed to generate image for prompt ${i}:`, genError);
          setError(`Failed to generate image ${i + 1}: ${genError.message}`);
        }
      }

      if (allResults.length === 0) {
        throw new Error("No images were generated successfully");
      }

      console.log("All images generated:", allResults);
      setResults(allResults);
      setCurrentStep(STEP_STATES.RESULTS);

    } catch (err) {
      console.error("Error generating images from prompt:", err);
      setError(err.message || "Failed to generate images");
    } finally {
      setIsGeneratingImages(false);
    }
  };

  const handleRegeneratePrompt = async () => {
    // Cancel previous request if any
    if (abortController) {
      abortController.abort();
      console.log("Previous request cancelled");
    }

    setIsRegeneratingAll(true);
    setGeneratedPrompts([]);
    setJobId(null);
    setError(null); // Clear any previous errors
    await handleGeneratePrompt();
    setIsRegeneratingAll(false);
  };

  const handleRegenerateIndividualPrompt = async (index) => {
    if (!jobId) {
      setError("No job ID found");
      return;
    }

    setRegeneratingPromptIndex(index);
    setError(null);

    try {
      // Call backend to regenerate this specific prompt using AI
      const response = await regenerateIndividualPrompt(jobId, index);
      
      if (response.success && response.new_prompt) {
        // Update the prompt in state
        const updatedPrompts = [...generatedPrompts];
        updatedPrompts[index].prompt = response.new_prompt;
        setGeneratedPrompts(updatedPrompts);
      }
    } catch (err) {
      console.error("Error regenerating prompt:", err);
      setError(err.message || "Failed to regenerate prompt");
    } finally {
      setRegeneratingPromptIndex(null);
    }
  };

  const handleEditPrompt = async (index, newPrompt) => {
    const updatedPrompts = [...generatedPrompts];
    updatedPrompts[index].prompt = newPrompt;
    setGeneratedPrompts(updatedPrompts);

    // Update prompts on backend
    if (jobId) {
      try {
        await updateReviewPrompts(jobId, { prompts: updatedPrompts });
      } catch (err) {
        console.error("Error updating prompts:", err);
      }
    }
  };

  const handleSavePromptEdit = async (index) => {
    await handleEditPrompt(index, editingPromptText);
    setEditingPromptIndex(null);
    setEditingPromptText("");
  };

  const handleCancelPromptEdit = () => {
    setEditingPromptIndex(null);
    setEditingPromptText("");
  };

  return (
    <div className="image-generator">
      <div className="image-generator__stepper">
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
              <label className="form-label">Variants</label>
              <input
                type="number"
                className="form-input"
                value={variants}
                onChange={(e) => {
                  setVariants(Number(e.target.value));
                  setHasInputChanges(true);
                }}
                min="1"
                max="10"
                placeholder="Enter number of variants"
              />
            </div>

            <button
              className="btn btn-primary"
              onClick={handleGeneratePrompt}
              disabled={isGenerating || currentStep !== STEP_STATES.INPUTS || !productName.trim() || !productDescription.trim() || !hasInputChanges}
            >
              {isGenerating && currentStep === STEP_STATES.INPUTS ? "Generating..." : "Generate Prompt →"}
            </button>
          </div>
        </div>

        {/* Step 2: Prompt */}
        <div
          className={`stepper-column ${
            currentStep === STEP_STATES.PROMPT || currentStep === STEP_STATES.RESULTS ? "active" : ""
          }`}
        >
          <div className="stepper-header">
            <div className="stepper-number">2</div>
            <div className="stepper-title">Prompt</div>
          </div>

          {(isGenerating && currentStep === STEP_STATES.INPUTS) || isRegeneratingAll ? (
            <div className="stepper-loading">
              <Icon icon="solar:refresh-bold" className="loading-spinner" />
              <p>{isRegeneratingAll ? "Regenerating all prompts..." : "Generating prompts..."}</p>
            </div>
          ) : generatedPrompts.length > 0 ? (
            <div className="stepper-content">
              <div className="prompts-list">
                {generatedPrompts.map((promptObj, index) => (
                  <div key={index} className="prompt-item">
                    <div className="prompt-header">
                      <span className="prompt-number">Variant {index + 1}</span>
                      <div className="prompt-actions-inline">
                        {editingPromptIndex === index ? (
                          <>
                            <button
                              className="btn-icon"
                              onClick={() => handleSavePromptEdit(index)}
                              title="Save"
                            >
                              <Icon icon="solar:check-circle-bold" />
                            </button>
                            <button
                              className="btn-icon"
                              onClick={handleCancelPromptEdit}
                              title="Cancel"
                            >
                              <Icon icon="solar:close-circle-bold" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="btn-icon"
                              onClick={() => handleRegenerateIndividualPrompt(index)}
                              title={jobId ? "Regenerate this prompt" : "Use 'Regenerate Prompts' to generate new prompts"}
                              disabled={regeneratingPromptIndex === index || !jobId}
                            >
                              {regeneratingPromptIndex === index ? (
                                <Icon icon="solar:refresh-bold" className="spinning" />
                              ) : (
                                <Icon icon="solar:refresh-bold" />
                              )}
                            </button>
                            <button
                              className="btn-icon"
                              onClick={() => {
                                setEditingPromptIndex(index);
                                setEditingPromptText(promptObj.prompt);
                              }}
                              title="Edit"
                            >
                              <Icon icon="solar:pen-bold" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {regeneratingPromptIndex === index ? (
                      <div className="prompt-regenerating">
                        <Icon icon="solar:refresh-bold" className="spinning" />
                        <span>Regenerating prompt...</span>
                      </div>
                    ) : editingPromptIndex === index ? (
                      <textarea
                        className="prompt-edit-textarea"
                        value={editingPromptText}
                        onChange={(e) => setEditingPromptText(e.target.value)}
                        rows={6}
                        autoFocus
                      />
                    ) : (
                      <div 
                        className="prompt-text"
                        onClick={() => {
                          setEditingPromptIndex(index);
                          setEditingPromptText(promptObj.prompt);
                        }}
                        style={{ cursor: 'pointer' }}
                        title="Click to edit"
                      >
                        {promptObj.prompt}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {error && (
                <div className="error-message">
                  <Icon icon="solar:danger-circle-bold" />
                  {error}
                </div>
              )}

              <div className="prompt-actions">
                <button
                  className="btn btn-sm btn-outline"
                  onClick={handleRegeneratePrompt}
                  disabled={isGenerating || isRegeneratingAll}
                >
                  <Icon icon="solar:refresh-bold" />
                  Regenerate Prompts
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleAcceptPrompt}
                  disabled={isGenerating || isGeneratingImages}
                >
                  {isGeneratingImages ? "Generating Images..." : "Accept & Generate →"}
                </button>
              </div>
            </div>
          ) : (
            <div className="stepper-locked">
              <Icon icon="solar:lock-password-bold" className="locked-icon" />
              <p>Generate prompt to unlock</p>
            </div>
          )}
        </div>

        {/* Step 3: Results */}
        <div
          className={`stepper-column ${
            currentStep === STEP_STATES.RESULTS ? "active" : ""
          }`}
        >
          <div className="stepper-header">
            <div className="stepper-number">3</div>
            <div className="stepper-title">Results</div>
          </div>

          {isGeneratingImages ? (
            <div className="stepper-loading">
              <Icon icon="solar:refresh-bold" className="loading-spinner" />
              <p>Generating images...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="stepper-content">
              <div className="results-grid">
                {results.map((result, index) => {
                  // Use base64 if available, otherwise use local_url
                  const imageSrc = result.base64 
                    ? (result.base64.startsWith('data:') ? result.base64 : `data:image/png;base64,${result.base64}`)
                    : (result.local_url || result.url || result.image_url);
                    
                  return (
                    <div key={result.artifact_id || index} className="result-card">
                      <div className="result-image">
                        <img 
                          src={imageSrc}
                          alt={`Result ${index + 1}`}
                          onError={(e) => {
                            // If base64 fails, try local_url
                            if (result.base64 && result.local_url) {
                              e.target.src = result.local_url;
                            } else {
                              e.target.src = "/placeholder.jpg";
                            }
                          }}
                        />
                      </div>
                      <div className="result-actions">
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
              <p>Accept prompt to unlock</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

