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
          
          console.log("Status check:", newJobId, statusResponse.data.status);
          
          if (statusResponse.data.status === "completed") {
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
                  first_frame_image_url: p.first_frame_image_url || null, // First frame image
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
            }
            setIsGenerating(false);
            return;
          } else if (statusResponse.data.status === "failed") {
            throw new Error(statusResponse.data.error || "Generation failed");
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
                        {generatedOutput.content.shots.map((shot, index) => (
                          <div key={index} className="storyboard-visual-item">
                            <div className="storyboard-header">
                              <span className="shot-number">Shot {index + 1}</span>
                              <div className="storyboard-actions-inline">
                                <button
                                  className="btn-icon"
                                  onClick={() => handleEdit()}
                                  title="Edit description"
                                >
                                  <Icon icon="solar:pen-bold" />
                                </button>
                              </div>
                            </div>

                            {/* First Frame Placeholder */}
                            <div className="first-frame-container">
                              {shot.first_frame_image_url ? (
                                <div className="first-frame-wrapper">
                                  <img 
                                    src={shot.first_frame_image_url}
                                    alt={`Shot ${shot.number} first frame`}
                                    className="first-frame-image"
                                  />
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
                                  {typeof shot.voiceover === 'string' 
                                    ? shot.voiceover 
                                    : (shot.voiceover.text || shot.voiceover.voiceover || JSON.stringify(shot.voiceover))}
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
                              <div 
                                className="storyboard-text"
                                style={{ cursor: 'pointer' }}
                                title="Click to edit description"
                              >
                                {shot.prompt}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
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

