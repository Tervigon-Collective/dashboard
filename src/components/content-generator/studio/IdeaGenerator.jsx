"use client";

import { useState } from "react";
import axios from "axios";
import { Icon } from "@iconify/react";
import config from "../../../config";
import "./IdeaGenerator.css";

export default function IdeaGenerator({ onSwitchToGenerator }) {
  const [productImages, setProductImages] = useState([]);
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [outputType, setOutputType] = useState("image-prompt"); // "image-prompt" | "storyboard"
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [generatedOutput, setGeneratedOutput] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [error, setError] = useState(null);
  const [showBrandkitModal, setShowBrandkitModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [editedShots, setEditedShots] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  // Per-shot editing state
  const [shotEdits, setShotEdits] = useState({}); // { shotIndex: { prompt, voiceover, imageUrl } }
  const [editingShots, setEditingShots] = useState({}); // { shotIndex: true } - tracks which shots are in edit mode
  const [regeneratingShots, setRegeneratingShots] = useState({}); // { shotIndex: { field: true } }
  const [savingShots, setSavingShots] = useState({}); // { shotIndex: true }
  const [regeneratingAll, setRegeneratingAll] = useState(false);

  // Helper function to clean image URLs (remove query parameters)
  const cleanImageUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    // Check if URL has query parameters before cleaning
    const hasQueryParams = url.includes('?') || url.includes('%3F');
    if (hasQueryParams) {
      console.warn(`cleanImageUrl: Found query params in URL, cleaning: ${url.substring(0, 100)}...`);
    }
    // Remove ALL query parameters (handle both ? and encoded %3F)
    // Use a more robust approach: split by ? and take first part, then split by %3F and take first part
    let cleaned = url;
    if (cleaned.includes('?')) {
      cleaned = cleaned.split('?')[0];
    }
    if (cleaned.includes('%3F')) {
      cleaned = cleaned.split('%3F')[0];
    }
    cleaned = cleaned.trim();
    if (!cleaned || cleaned === 'null' || cleaned === 'undefined' || cleaned === '') {
      return null;
    }
    if (hasQueryParams) {
      console.log(`cleanImageUrl: Cleaned URL: ${cleaned.substring(0, 100)}...`);
    }
    return cleaned;
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductImages((prev) => [...prev, { id: Date.now(), url: reader.result }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (id) => {
    setProductImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    files.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setProductImages((prev) => [...prev, { id: Date.now(), url: reader.result }]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleGenerate = async () => {
    if (!productName.trim() || !productDescription.trim()) {
      setError("Please fill in product name and description");
      return;
    }

    setIsGenerating(true);
    setError(null);
    
    try {
      // Call the idea generation API
      const response = await axios.post(
        `${config.pythonApi.baseURL}/api/generate/idea`,
        {
          product_name: productName,
          long_description: productDescription,
          idea_type: outputType === "image-prompt" ? "image-prompt" : "storyboard",
          number_of_variants: 1,
          uploaded_images: productImages.map(img => img.url),
          product_image_id: null
        }
      );

      const newJobId = response.data.job_id;
      setJobId(newJobId);

      // Poll for completion with exponential backoff
      let attempts = 0;
      const maxAttempts = 120;
      let pollDelay = 1000; // Start with 1s
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, pollDelay));
        
        try {
          const statusResponse = await axios.get(
            `${config.pythonApi.baseURL}/api/generate/status/${newJobId}`,
            { timeout: 10000 } // 10 second timeout
          );
          
          const currentStatus = statusResponse.data?.status || "unknown";
          console.log("Status check:", newJobId, "Status:", currentStatus, "Type:", typeof currentStatus, "Full response:", JSON.stringify(statusResponse.data));
          
          // Handle both "completed" and "pending_review" statuses - both mean the storyboard is ready
          const isReady = currentStatus === "completed" || currentStatus === "pending_review";
          console.log(`Job ${newJobId} ready check: ${isReady} (status: "${currentStatus}")`);
          
          if (isReady) {
            console.log(`Job ${newJobId} is ready (status: ${currentStatus}), fetching review data...`);
            // Fetch the generated prompts
            const reviewResponse = await axios.get(
              `${config.pythonApi.baseURL}/api/generate/review/${newJobId}`,
              { timeout: 10000 }
            );
            
            console.log("Review data received:", reviewResponse.data);
            
            const prompts = reviewResponse.data.prompts || [];
            if (outputType === "image-prompt") {
              setGeneratedOutput({
                type: outputType,
                content: prompts[0]?.prompt || "Generation failed",
                metadata: prompts[0]
              });
            } else {
              // Storyboard format - match VideoGenerator structure
              const shots = prompts.map((p, idx) => {
                console.log(`Processing shot ${idx + 1}:`, p);
                return {
                  number: idx + 1,
                  clip_number: p.clip_number,
                  beat: p.beat,
                  duration: p.duration,
                  description: p.description || "",
                  prompt: p.prompt || "", // Full story prompt
                  first_frame_image_url: cleanImageUrl(p.first_frame_image_url), // First frame image (cleaned)
                  voiceover: p.prompts?.voiceover_line || null, // Voiceover with text and duration
                  metadata: p.metadata || {}
                };
              });
              
              console.log("Final shots:", shots);
              
              setGeneratedOutput({
                type: outputType,
                content: {
                  shots
                },
                rawPrompts: prompts // Store raw prompts for sending to VideoGenerator
              });
              
              // Initialize shot edits state from loaded shots
              const initialEdits = {};
              shots.forEach((shot, idx) => {
                initialEdits[idx] = {
                  prompt: shot.prompt,
                  voiceover: typeof shot.voiceover === 'string' 
                    ? shot.voiceover 
                    : (shot.voiceover?.text || ""),
                  imageUrl: cleanImageUrl(shot.first_frame_image_url)
                };
              });
              setShotEdits(initialEdits);
            }
            setIsGenerating(false);
            return;
          } else if (currentStatus === "failed") {
            throw new Error(statusResponse.data.error || "Generation failed");
          } else {
            // Still processing - log for debugging
            console.log(`Job ${newJobId} still processing, status: ${currentStatus}, continuing to poll...`);
          }
        } catch (pollError) {
          console.warn(`Poll attempt ${attempts + 1} failed:`, pollError.message);
          // Only retry on network/timeout errors, not on API errors
          if (pollError.response) {
            // API responded with error
            if (pollError.response.status === 400 || pollError.response.status === 404) {
              // Job not ready yet, continue polling
              pollDelay = Math.min(pollDelay + 500, 5000); // Increase delay up to 5s
            } else {
              throw pollError;
            }
          } else {
            // Network error, retry with backoff
            pollDelay = Math.min(pollDelay + 500, 5000);
          }
        }
        
        attempts++;
      }
      
      throw new Error("Idea generation timeout");
    } catch (err) {
      console.error("Error generating idea:", err);
      setError(err.message || "Failed to generate idea");
      setIsGenerating(false);
    }
  };

  const handleRegenerate = () => {
    setGeneratedOutput(null);
    handleGenerate();
  };

  const handleEdit = () => {
    setIsEditing(true);
    if (outputType === "image-prompt") {
      setEditedContent(generatedOutput.content);
    } else {
      setEditedShots(generatedOutput.content.shots.map(s => ({ ...s })));
    }
  };

  const handleSaveEdit = () => {
    if (outputType === "image-prompt") {
      setGeneratedOutput({
        ...generatedOutput,
        content: editedContent
      });
    } else {
      setGeneratedOutput({
        ...generatedOutput,
        content: {
          shots: editedShots
        }
      });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent("");
    setEditedShots([]);
  };

  const handleShotEdit = (index, newDescription) => {
    const updated = [...editedShots];
    updated[index] = { ...updated[index], description: newDescription };
    setEditedShots(updated);
  };

  // Per-shot edit handlers
  const handleShotFieldEdit = (shotIndex, field, value) => {
    setShotEdits(prev => ({
      ...prev,
      [shotIndex]: {
        ...prev[shotIndex],
        [field]: value
      }
    }));
  };

  const handleEditShot = (shotIndex) => {
    // Initialize edit state with current values
    const shot = generatedOutput.content.shots[shotIndex];
    setShotEdits(prev => ({
      ...prev,
      [shotIndex]: {
        prompt: shot.prompt || "",
        voiceover: typeof shot.voiceover === 'string' 
          ? shot.voiceover 
          : (shot.voiceover?.text || ""),
        imageUrl: shot.first_frame_image_url || null
      }
    }));
    setEditingShots(prev => ({ ...prev, [shotIndex]: true }));
  };

  const handleCancelShotEdit = (shotIndex) => {
    // Revert to original values
    setShotEdits(prev => {
      const updated = { ...prev };
      delete updated[shotIndex];
      return updated;
    });
    setEditingShots(prev => {
      const updated = { ...prev };
      delete updated[shotIndex];
      return updated;
    });
  };

  const handleRegenerateShotField = async (shotIndex, field) => {
    if (!jobId) return;
    
    setRegeneratingShots(prev => ({
      ...prev,
      [shotIndex]: { ...prev[shotIndex], [field]: true }
    }));

    try {
      const currentEdit = shotEdits[shotIndex] || {};
      let response;

      if (field === "prompt") {
        response = await axios.post(
          `${config.pythonApi.baseURL}/api/generate/review/${jobId}/storyboard/${shotIndex}/regenerate-prompt`,
          { previous_prompt: currentEdit.prompt || generatedOutput.content.shots[shotIndex]?.prompt }
        );
      } else if (field === "voiceover") {
        response = await axios.post(
          `${config.pythonApi.baseURL}/api/generate/review/${jobId}/storyboard/${shotIndex}/regenerate-voiceover`,
          { 
            prompt_text: currentEdit.prompt || generatedOutput.content.shots[shotIndex]?.prompt,
            previous_voiceover: currentEdit.voiceover || (typeof generatedOutput.content.shots[shotIndex]?.voiceover === 'string' 
              ? generatedOutput.content.shots[shotIndex].voiceover 
              : generatedOutput.content.shots[shotIndex]?.voiceover?.text)
          }
        );
      } else if (field === "image") {
        response = await axios.post(
          `${config.pythonApi.baseURL}/api/generate/review/${jobId}/storyboard/${shotIndex}/regenerate-image`,
          { 
            prompt_text: currentEdit.prompt || generatedOutput.content.shots[shotIndex]?.prompt
          }
        );
      }

      console.log(`Regenerate ${field} response for shot ${shotIndex}:`, response?.data);
      
      if (response?.data?.success) {
        const newValue = response.data.new_value;
        console.log(`New value for shot ${shotIndex}, field ${field}:`, newValue);
        
        // If in edit mode, update edit state; otherwise update generated output directly
        const isEditingShot = editingShots[shotIndex];
        if (isEditingShot) {
          handleShotFieldEdit(shotIndex, field, newValue);
        }
        
        // Always update the generated output
        const updatedShots = [...generatedOutput.content.shots];
        if (field === "prompt") {
          updatedShots[shotIndex].prompt = newValue;
        } else if (field === "voiceover") {
          if (typeof updatedShots[shotIndex].voiceover === 'object') {
            updatedShots[shotIndex].voiceover.text = newValue;
          } else {
            updatedShots[shotIndex].voiceover = newValue;
          }
        } else if (field === "image") {
          // Remove any existing query parameters - store clean URL in state
          const baseUrl = cleanImageUrl(newValue);
          
          console.log(`Updating image URL for shot ${shotIndex}:`, {
            oldUrl: updatedShots[shotIndex].first_frame_image_url,
            newUrl: baseUrl,
            isEditingShot
          });
          
          // Store clean URL without cache buster (cache buster will be added during render)
          updatedShots[shotIndex].first_frame_image_url = baseUrl;
          
          // Clear shotEdit.imageUrl if not in edit mode to ensure we use the updated shot URL
          if (!isEditingShot && shotEdits[shotIndex]?.imageUrl !== undefined) {
            setShotEdits(prev => {
              const updated = { ...prev };
              if (updated[shotIndex]) {
                delete updated[shotIndex].imageUrl;
                if (Object.keys(updated[shotIndex]).length === 0) {
                  delete updated[shotIndex];
                }
              }
              return updated;
            });
          } else if (isEditingShot) {
            // Also update shotEdits if in edit mode (clean URL without cache buster)
            handleShotFieldEdit(shotIndex, "imageUrl", baseUrl);
          }
        }
        
        setGeneratedOutput({
          ...generatedOutput,
          content: { shots: updatedShots }
        });
        
        console.log(`State updated for shot ${shotIndex}, field ${field}:`, {
          newValue,
          updatedShot: updatedShots[shotIndex]
        });
      }
    } catch (err) {
      console.error(`Error regenerating ${field} for shot ${shotIndex}:`, err);
      setError(`Failed to regenerate ${field}: ${err.message}`);
    } finally {
      setRegeneratingShots(prev => {
        const updated = { ...prev };
        if (updated[shotIndex]) {
          delete updated[shotIndex][field];
          if (Object.keys(updated[shotIndex]).length === 0) {
            delete updated[shotIndex];
          }
        }
        return updated;
      });
    }
  };

  const handleSaveShot = async (shotIndex) => {
    if (!jobId) return;
    
    setSavingShots(prev => ({ ...prev, [shotIndex]: true }));

    try {
      const edit = shotEdits[shotIndex] || {};
      const shot = generatedOutput.content.shots[shotIndex];
      
      // Build request payload with only changed fields
      const payload = {};
      if (edit.prompt !== undefined && edit.prompt !== shot.prompt) {
        payload.prompt_text = edit.prompt;
      }
      if (edit.voiceover !== undefined) {
        const currentVoiceover = typeof shot.voiceover === 'string' 
          ? shot.voiceover 
          : (shot.voiceover?.text || "");
        if (edit.voiceover !== currentVoiceover) {
          payload.voiceover_text = edit.voiceover;
        }
      }
      if (edit.imageUrl !== undefined && edit.imageUrl !== shot.first_frame_image_url) {
        payload.first_frame_image_url = edit.imageUrl;
      }
      
      // If no changes, just exit edit mode
      if (Object.keys(payload).length === 0) {
        setEditingShots(prev => {
          const updated = { ...prev };
          delete updated[shotIndex];
          return updated;
        });
        return;
      }
      
      const response = await axios.post(
        `${config.pythonApi.baseURL}/api/generate/review/${jobId}/storyboard/${shotIndex}/save`,
        payload
      );

      if (response.data.success) {
        // Update generated output with saved values
        const updatedShots = [...generatedOutput.content.shots];
        if (edit.prompt !== undefined) {
          updatedShots[shotIndex].prompt = edit.prompt;
        }
        if (edit.voiceover !== undefined) {
          if (typeof updatedShots[shotIndex].voiceover === 'object') {
            updatedShots[shotIndex].voiceover.text = edit.voiceover;
          } else {
            updatedShots[shotIndex].voiceover = edit.voiceover;
          }
        }
        if (edit.imageUrl !== undefined) {
          updatedShots[shotIndex].first_frame_image_url = edit.imageUrl;
        }
        
        setGeneratedOutput({
          ...generatedOutput,
          content: { shots: updatedShots }
        });
        
        // Exit edit mode
        setEditingShots(prev => {
          const updated = { ...prev };
          delete updated[shotIndex];
          return updated;
        });
      }
    } catch (err) {
      console.error(`Error saving shot ${shotIndex}:`, err);
      setError(`Failed to save shot: ${err.response?.data?.detail || err.message}`);
    } finally {
      setSavingShots(prev => {
        const updated = { ...prev };
        delete updated[shotIndex];
        return updated;
      });
    }
  };

  const handleRegenerateAll = async (fields) => {
    if (!jobId) return;
    
    setRegeneratingAll(true);

    try {
      const response = await axios.post(
        `${config.pythonApi.baseURL}/api/generate/review/${jobId}/storyboard/regenerate-all`,
        { fields }
      );

      if (response.data.success) {
        // Reload review data
        const reviewResponse = await axios.get(
          `${config.pythonApi.baseURL}/api/generate/review/${jobId}`
        );
        
        const prompts = reviewResponse.data.prompts || [];
        const shots = prompts.map((p, idx) => ({
          number: idx + 1,
          clip_number: p.clip_number,
          beat: p.beat,
          duration: p.duration,
          description: p.description || "",
          prompt: p.prompt || "",
          first_frame_image_url: cleanImageUrl(p.first_frame_image_url), // First frame image (cleaned)
          voiceover: p.prompts?.voiceover_line || null,
          metadata: p.metadata || {}
        }));
        
        setGeneratedOutput({
          ...generatedOutput,
          content: { shots },
          rawPrompts: prompts
        });
        
        // Update shot edits
        const updatedEdits = {};
        shots.forEach((shot, idx) => {
          updatedEdits[idx] = {
            prompt: shot.prompt,
            voiceover: typeof shot.voiceover === 'string' 
              ? shot.voiceover 
              : (shot.voiceover?.text || ""),
            imageUrl: cleanImageUrl(shot.first_frame_image_url)
          };
        });
        setShotEdits(updatedEdits);
      }
    } catch (err) {
      console.error("Error regenerating all:", err);
      setError(`Failed to regenerate all: ${err.message}`);
    } finally {
      setRegeneratingAll(false);
    }
  };

  const handleSendToGenerator = () => {
    if (!generatedOutput || !onSwitchToGenerator) return;

    if (outputType === "image-prompt") {
      // Send to Image Generator
      onSwitchToGenerator("image", {
        productName,
        productDescription,
        productImages: productImages.map(img => img.url),
        prompt: generatedOutput.content,
        variants: 1
      });
    } else {
      // Send to Video Generator with storyboard
      onSwitchToGenerator("video", {
        productName,
        productDescription,
        productImages: productImages.map(img => img.url),
        storyboard: generatedOutput.content.shots,
        variants: 1,
        aspectRatio: "widescreen_16_9"
      });
    }
  };

  const handleSaveToLibrary = async () => {
    if (!generatedOutput) return;

    setIsSaving(true);
    try {
      // Simulate saving to library
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // TODO: Implement actual save to library API
      alert("Saved to library successfully!");
    } catch (err) {
      console.error("Error saving to library:", err);
      setError("Failed to save to library");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="idea-generator">
      {error && (
        <div className="error-banner" style={{
          padding: "12px 16px",
          backgroundColor: "#fee",
          color: "#c00",
          borderRadius: "4px",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <Icon icon="solar:danger-bold" />
          {error}
        </div>
      )}
      <div className="idea-generator__layout">
        {/* Left: Input Panel */}
        <div className="idea-generator__inputs">
          <div className="input-panel">
            <div className="panel-label">Inputs</div>

            {/* Product Image Upload */}
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
                    <span>Drag & drop or click to upload</span>
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

            {/* Product Name */}
            <div className="form-group">
              <label className="form-label">Product Name</label>
              <input
                type="text"
                className="form-input"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g., ZephyrLite"
              />
            </div>

            {/* Product Description */}
            <div className="form-group">
              <label className="form-label">Product Description</label>
              <textarea
                className="form-textarea"
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="Describe your product..."
                rows={4}
              />
            </div>

            {/* Output Type Toggle */}
            <div className="form-group">
              <label className="form-label">Output Type</label>
              <div className="output-type-toggle">
                <button
                  className={`toggle-option ${outputType === "image-prompt" ? "active" : ""
                    }`}
                  onClick={() => setOutputType("image-prompt")}
                >
                  <Icon icon="solar:gallery-bold" />
                  Image Prompt
                </button>
                <button
                  className={`toggle-option ${outputType === "storyboard" ? "active" : ""
                    }`}
                  onClick={() => setOutputType("storyboard")}
                >
                  <Icon icon="solar:video-library-bold" />
                  Storyboard
                </button>
              </div>
            </div>

            {/* Advanced Options */}
            <div className="form-group">
              <button
                className="advanced-toggle"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <Icon
                  icon={
                    showAdvanced
                      ? "solar:alt-arrow-up"
                      : "solar:alt-arrow-down"
                  }
                />
                Advanced Options
              </button>
              {showAdvanced && (
                <div className="advanced-options">
                  <div className="form-group">
                    <label className="form-label">Tone</label>
                    <select className="form-select">
                      <option>Professional</option>
                      <option>Casual</option>
                      <option>Luxury</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Audience</label>
                    <input type="text" className="form-input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Platform</label>
                    <select className="form-select">
                      <option>Meta</option>
                      <option>Amazon</option>
                      <option>Website</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="input-panel__actions">
              <button
                className="btn btn-primary"
                onClick={handleGenerate}
                disabled={isGenerating || !productName.trim() || !productDescription.trim()}
              >
                {isGenerating ? "Generating..." : "Generate Idea"}
              </button>
              <button className="btn btn-secondary">Save as Draft</button>
            </div>
          </div>
        </div>

        {/* Right: Output Panel */}
        <div className="idea-generator__output">
          <div className="output-panel">
            <div className="panel-label">Output</div>

            {!generatedOutput ? (
              <div className="output-empty">
                <Icon icon="solar:document-text-bold" className="empty-icon" />
                <p>No output yet</p>
                <p className="empty-subtitle">
                  Generate to see {outputType === "image-prompt" ? "prompt" : "storyboard"}
                </p>
              </div>
            ) : (
              <div className="output-content">
                {/* Brandkit Badge */}
                <div 
                  className="brandkit-badge"
                  onClick={() => setShowBrandkitModal(true)}
                  style={{ cursor: "pointer" }}
                >
                  <Icon icon="solar:palette-bold" />
                  <span>Brandkit Applied</span>
                  <span className="badge-details">
                    Typography: Roboto • Colors: 3 • Visual style: Minimal
                  </span>
                </div>

                {/* Output Content */}
                {outputType === "image-prompt" ? (
                  <div className="prompt-output">
                    {isEditing ? (
                      <textarea
                        className="prompt-edit-textarea"
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        rows={8}
                        style={{
                          width: "100%",
                          padding: "12px",
                          borderRadius: "8px",
                          border: "1px solid #ddd",
                          fontSize: "14px",
                          fontFamily: "inherit",
                          resize: "vertical"
                        }}
                      />
                    ) : (
                      <div className="prompt-text">{generatedOutput.content}</div>
                    )}
                    <div className="prompt-actions">
                      {isEditing ? (
                        <>
                          <button className="btn btn-sm btn-primary" onClick={handleSaveEdit}>
                            <Icon icon="solar:check-circle-bold" />
                            Save
                          </button>
                          <button className="btn btn-sm btn-outline" onClick={handleCancelEdit}>
                            <Icon icon="solar:close-circle-bold" />
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="btn btn-sm btn-outline" onClick={handleEdit}>
                            <Icon icon="solar:pen-bold" />
                            Edit
                          </button>
                          <button className="btn btn-sm btn-outline" onClick={handleRegenerate}>
                            <Icon icon="solar:refresh-bold" />
                            Regenerate
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="storyboard-output">
                    {isEditing ? (
                      <div className="storyboard-edit">
                        {editedShots.map((shot, idx) => (
                          <div key={idx} className="storyboard-shot-edit">
                            <div className="shot-number">Shot {shot.number}</div>
                            <textarea
                              value={shot.description}
                              onChange={(e) => handleShotEdit(idx, e.target.value)}
                              rows={3}
                              style={{
                                width: "100%",
                                padding: "8px",
                                borderRadius: "6px",
                                border: "1px solid #ddd",
                                fontSize: "13px",
                                fontFamily: "inherit",
                                resize: "vertical"
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="storyboard-visual">
                        {generatedOutput.content.shots.map((shot, index) => {
                          const isEditingShot = editingShots[index];
                          const shotEdit = shotEdits[index] || {};
                          const isRegenerating = regeneratingShots[index] || {};
                          const isSavingShot = savingShots[index];
                          const currentPrompt = isEditingShot && shotEdit.prompt !== undefined 
                            ? shotEdit.prompt 
                            : shot.prompt;
                          const currentVoiceover = isEditingShot && shotEdit.voiceover !== undefined
                            ? shotEdit.voiceover 
                            : (typeof shot.voiceover === 'string' 
                              ? shot.voiceover 
                              : (shot.voiceover?.text || ""));
                          // Get image URL - use edited version if in edit mode, otherwise use shot's URL
                          // Remove any existing query parameters to get clean base URL
                          const rawImageUrl = (isEditingShot && shotEdit.imageUrl !== undefined) 
                            ? shotEdit.imageUrl 
                            : (shot.first_frame_image_url || null);
                          
                          // Clean the URL to remove any query parameters
                          const baseImageUrl = cleanImageUrl(rawImageUrl);
                          
                          // Add cache buster only when rendering (not stored in state)
                          // Extract version number from filename if present (e.g., first_frame_v123456.png -> use that version)
                          // This ensures we use the actual file version for cache busting
                          let currentImageUrl = null;
                          if (baseImageUrl) {
                            // Extract version from filename (e.g., first_frame_v123456.png -> 123456)
                            const versionMatch = baseImageUrl.match(/v(\d+)/);
                            if (versionMatch) {
                              // Use the version from filename as cache buster
                              // baseImageUrl is already clean (no query params), so we can safely add the cache buster
                              currentImageUrl = `${baseImageUrl}?v=${versionMatch[1]}`;
                            } else {
                              // If no version in filename, use a hash of the URL to ensure stability
                              const urlHash = baseImageUrl.split('').reduce((acc, char) => {
                                return ((acc << 5) - acc) + char.charCodeAt(0) | 0;
                              }, 0);
                              currentImageUrl = `${baseImageUrl}?t=${Math.abs(urlHash)}`;
                            }
                          }
                          
                          // Debug logging for shot 3 (index 2)
                          if (index === 2) {
                            console.log(`Shot ${index + 1} (index ${index}) image URL:`, {
                              isEditingShot,
                              shotEditImageUrl: shotEdit.imageUrl,
                              shotFirstFrameUrl: shot.first_frame_image_url,
                              baseImageUrl,
                              currentImageUrl,
                              fullUrl: currentImageUrl ? `${config.pythonApi.baseURL}${currentImageUrl}` : null
                            });
                          }
                          
                          return (
                          <div key={index} className="storyboard-visual-item">
                            <div className="storyboard-header">
                              <span className="shot-number">Shot {index + 1}</span>
                              <div className="storyboard-actions-inline">
                                  {isEditingShot ? (
                                    <>
                                <button
                                        className="btn-icon btn-sm btn-primary"
                                        onClick={() => handleSaveShot(index)}
                                        disabled={isSavingShot}
                                        title="Save changes"
                                      >
                                        <Icon icon="solar:check-circle-bold" />
                                      </button>
                                      <button
                                        className="btn-icon btn-sm"
                                        onClick={() => handleCancelShotEdit(index)}
                                        disabled={isSavingShot}
                                        title="Cancel editing"
                                      >
                                        <Icon icon="solar:close-circle-bold" />
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      className="btn-icon btn-sm"
                                      onClick={() => handleEditShot(index)}
                                      title="Edit shot"
                                >
                                  <Icon icon="solar:pen-bold" />
                                </button>
                                  )}
                              </div>
                            </div>

                              {/* First Frame Image */}
                            <div className="first-frame-container">
                                {currentImageUrl ? (
                                <div className="first-frame-wrapper">
                                  <img 
                                      src={currentImageUrl ? `${config.pythonApi.baseURL}${currentImageUrl}` : ''}
                                    alt={`Shot ${shot.number} first frame`}
                                    className="first-frame-image"
                                    key={`img-${index}-${baseImageUrl}`}
                                    onError={(e) => {
                                        console.error("Failed to load first frame image:", currentImageUrl ? `${config.pythonApi.baseURL}${currentImageUrl}` : 'no URL');
                                      e.target.style.display = "none";
                                    }}
                                    onLoad={() => {
                                      console.log("Image loaded successfully:", currentImageUrl ? `${config.pythonApi.baseURL}${currentImageUrl}` : 'no URL');
                                    }}
                                  />
                                    <div className="first-frame-actions">
                                      <button
                                        className="btn-icon btn-sm"
                                        onClick={() => handleRegenerateShotField(index, "image")}
                                        disabled={isRegenerating.image}
                                        title="Regenerate image"
                                      >
                                        <Icon icon="solar:refresh-bold" 
                                          className={isRegenerating.image ? "spinning" : ""} />
                                      </button>
                                    </div>
                                </div>
                              ) : (
                                <div className="first-frame-placeholder">
                                  <Icon icon="solar:gallery-bold" />
                                  <span>First frame not available</span>
                                    <button
                                      className="btn btn-sm btn-outline"
                                      onClick={() => handleRegenerateShotField(index, "image")}
                                      disabled={isRegenerating.image}
                                    >
                                      {isRegenerating.image ? "Generating..." : "Generate Image"}
                                    </button>
                                </div>
                              )}
                            </div>

                            {/* Voiceover */}
                              <div className="voiceover-section">
                                <div className="voiceover-header">
                                  <Icon icon="solar:microphone-2-bold" />
                                  <span>Voiceover</span>
                                  <div className="voiceover-actions">
                                    <button
                                      className="btn-icon btn-sm"
                                      onClick={() => handleRegenerateShotField(index, "voiceover")}
                                      disabled={isRegenerating.voiceover}
                                      title="Regenerate voiceover"
                                    >
                                      <Icon icon="solar:refresh-bold" 
                                        className={isRegenerating.voiceover ? "spinning" : ""} />
                                    </button>
                                </div>
                                </div>
                                {isEditingShot ? (
                                  <textarea
                                    className="voiceover-text-edit"
                                    value={currentVoiceover}
                                    onChange={(e) => handleShotFieldEdit(index, "voiceover", e.target.value)}
                                    rows={2}
                                    placeholder="Voiceover text..."
                                  />
                                ) : (
                                  <div className="voiceover-text-readonly">
                                    {currentVoiceover || <span className="text-muted">No voiceover</span>}
                                  </div>
                                )}
                                {shot.voiceover?.duration && (
                                  <div className="voiceover-meta">
                                    Duration: {shot.voiceover.duration}s
                                  </div>
                                )}
                              </div>

                              {/* Story Description / Prompt */}
                            <div className="story-description">
                                <div className="story-description-header">
                                  <span>Shot Prompt</span>
                                  <button
                                    className="btn-icon btn-sm"
                                    onClick={() => handleRegenerateShotField(index, "prompt")}
                                    disabled={isRegenerating.prompt}
                                    title="Regenerate prompt"
                                  >
                                    <Icon icon="solar:refresh-bold" 
                                      className={isRegenerating.prompt ? "spinning" : ""} />
                                  </button>
                              </div>
                                {isEditingShot ? (
                                  <textarea
                                    className="storyboard-text-edit"
                                    value={currentPrompt}
                                    onChange={(e) => handleShotFieldEdit(index, "prompt", e.target.value)}
                                    rows={4}
                                    placeholder="Shot description/prompt..."
                                  />
                                ) : (
                                  <div className="storyboard-text-readonly">
                                    {currentPrompt || <span className="text-muted">No prompt</span>}
                            </div>
                                )}
                          </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {/* Global Actions Toolbar */}
                    <div className="storyboard-global-actions">
                      <div className="global-actions-label">Regenerate All:</div>
                      <button 
                        className="btn btn-sm btn-outline"
                        onClick={() => handleRegenerateAll(["prompt"])}
                        disabled={regeneratingAll}
                      >
                        <Icon icon="solar:refresh-bold" className={regeneratingAll ? "spinning" : ""} />
                        All Prompts
                          </button>
                      <button 
                        className="btn btn-sm btn-outline"
                        onClick={() => handleRegenerateAll(["voiceover"])}
                        disabled={regeneratingAll}
                      >
                        <Icon icon="solar:refresh-bold" className={regeneratingAll ? "spinning" : ""} />
                        All Voiceovers
                          </button>
                      <button 
                        className="btn btn-sm btn-outline"
                        onClick={() => handleRegenerateAll(["image"])}
                        disabled={regeneratingAll}
                      >
                        <Icon icon="solar:refresh-bold" className={regeneratingAll ? "spinning" : ""} />
                        All Images
                          </button>
                      <button 
                        className="btn btn-sm btn-outline"
                        onClick={() => handleRegenerateAll(["prompt", "voiceover", "image"])}
                        disabled={regeneratingAll}
                      >
                        <Icon icon="solar:refresh-bold" className={regeneratingAll ? "spinning" : ""} />
                        Everything
                          </button>
                    </div>
                  </div>
                )}

                {/* Primary Actions */}
                <div className="output-primary-actions">
                  <button 
                    className="btn btn-primary"
                    onClick={handleSendToGenerator}
                    disabled={!onSwitchToGenerator}
                  >
                    <Icon icon={outputType === "image-prompt" ? "solar:gallery-send-bold" : "solar:video-frame-play-bold"} />
                    {outputType === "image-prompt"
                      ? "Send → Image Generator"
                      : "Send → Video Generator"}
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={handleSaveToLibrary}
                    disabled={isSaving}
                  >
                    <Icon icon="solar:bookmark-bold" />
                    {isSaving ? "Saving..." : "Save to Library"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Brandkit Modal */}
      {showBrandkitModal && generatedOutput?.brandkit && (
        <div className="modal-overlay" onClick={() => setShowBrandkitModal(false)}>
          <div className="modal-content brandkit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Brand Kit Applied</h3>
              <button className="modal-close" onClick={() => setShowBrandkitModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="brandkit-section">
                <h4><Icon icon="solar:text-bold" /> Typography</h4>
                <p><strong>Font:</strong> {generatedOutput.brandkit.typography?.font || "N/A"}</p>
                <p><strong>Size:</strong> {generatedOutput.brandkit.typography?.size || "N/A"}</p>
              </div>
              <div className="brandkit-section">
                <h4><Icon icon="solar:palette-bold" /> Colors</h4>
                <div className="color-list">
                  {generatedOutput.brandkit.colors?.primary && (
                    <div className="color-item">
                      <span className="color-label">Primary:</span>
                      <span className="color-value">{generatedOutput.brandkit.colors.primary}</span>
                      <span 
                        className="color-swatch" 
                        style={{ backgroundColor: generatedOutput.brandkit.colors.primary }}
                      />
                    </div>
                  )}
                  {generatedOutput.brandkit.colors?.secondary && (
                    <div className="color-item">
                      <span className="color-label">Secondary:</span>
                      <span className="color-value">{generatedOutput.brandkit.colors.secondary}</span>
                      <span 
                        className="color-swatch" 
                        style={{ backgroundColor: generatedOutput.brandkit.colors.secondary }}
                      />
                    </div>
                  )}
                  {generatedOutput.brandkit.colors?.accent && (
                    <div className="color-item">
                      <span className="color-label">Accent:</span>
                      <span className="color-value">{generatedOutput.brandkit.colors.accent}</span>
                      <span 
                        className="color-swatch" 
                        style={{ backgroundColor: generatedOutput.brandkit.colors.accent }}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="brandkit-section">
                <h4><Icon icon="solar:camera-bold" /> Visual Style</h4>
                <p>{generatedOutput.brandkit.visual_style || "N/A"}</p>
              </div>
              <div className="brandkit-section">
                <h4><Icon icon="solar:chat-round-bold" /> Tone</h4>
                <p>{generatedOutput.brandkit.tone || "N/A"}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

