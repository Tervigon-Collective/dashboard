"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import config from "@/config";
import "./CarouselGenerator.css";

const CARD_COUNT_OPTIONS = [4, 5, 6];
const OBJECTIVE_OPTIONS = [
  { value: "awareness", label: "Awareness", icon: "solar:eye-bold" },
  { value: "consideration", label: "Consideration", icon: "solar:heart-bold" },
  { value: "conversion", label: "Conversion", icon: "solar:cart-bold" },
];
const PLATFORM_OPTIONS = [
  { value: "meta", label: "Meta (FB/IG)", icon: "solar:share-bold" },
  { value: "linkedin", label: "LinkedIn", icon: "solar:case-bold" },
];

const STEP_STATES = {
  INPUTS: "inputs",
  STORYBOARD: "storyboard",
  OUTPUT: "output",
};

export default function CarouselGenerator() {
  const [currentStep, setCurrentStep] = useState(STEP_STATES.INPUTS);
  const [productImages, setProductImages] = useState([]);
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [cardCount, setCardCount] = useState(5);
  const [objective, setObjective] = useState("awareness");
  const [platform, setPlatform] = useState("meta");
  const [generatedCards, setGeneratedCards] = useState([]);
  const [carouselImages, setCarouselImages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [error, setError] = useState(null);
  const [carouselId, setCarouselId] = useState(null);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Limit to 3 images total
    const availableSlots = 3 - productImages.length;
    const filesToAdd = files.slice(0, availableSlots);

    filesToAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductImages((prev) => [
          ...prev,
          { id: Date.now() + Math.random(), url: reader.result, file },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (imageId) => {
    setProductImages((prev) => prev.filter((img) => img.id !== imageId));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []).filter((f) =>
      f.type.startsWith("image/")
    );
    if (!files.length) return;

    // Limit to 3 images total
    const availableSlots = 3 - productImages.length;
    const filesToAdd = files.slice(0, availableSlots);

    filesToAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductImages((prev) => [
          ...prev,
          { id: Date.now() + Math.random(), url: reader.result, file },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleGenerate = async () => {
    if (!productName.trim() || !productDescription.trim()) {
      setError("Please provide both product name and description");
      return;
    }

    if (!productImages || productImages.length === 0) {
      setError("Please upload at least one product image");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const newCarouselId = `car_${Date.now()}`;
      setCarouselId(newCarouselId);

      // Prepare carousel spec
      const carouselSpec = {
        carousel_id: newCarouselId,
        objective: objective,
        platform: platform,
        cards: Array.from({ length: cardCount }, (_, i) => ({
          card_id: `card_${i + 1}`,
          position: i,
          title: "",
          copy: "",
          call_to_action: "Learn more",
        })),
      };

      // Try to call backend carousel generation endpoint
      try {
        const response = await fetch(`${config.pythonApi.baseURL}/carousel/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...carouselSpec,
            product_name: productName,
            product_description: productDescription,
          }),
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("ENDPOINT_NOT_FOUND");
          }
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || `Failed to generate carousel: ${response.statusText}`);
        }

        const data = await response.json();
        setGeneratedCards(data.cards || []);
      } catch (backendError) {
        // If backend endpoint not found, use mock data for testing
        if (backendError.message === "ENDPOINT_NOT_FOUND" || backendError.message.includes("Failed to fetch")) {
          console.log("Backend endpoint not available, using mock carousel data");
          
          // Generate mock carousel cards based on product
          const mockCards = Array.from({ length: cardCount }, (_, i) => {
            const cardTypes = [
              { headline: `Discover ${productName}`, body: "Transform your experience with our innovative solution", cta: "Learn More" },
              { headline: "Key Benefits", body: `${productName} delivers exceptional results with proven performance`, cta: "See Features" },
              { headline: "Why Choose Us", body: "Join thousands of satisfied customers who trust our quality", cta: "Get Started" },
              { headline: "Limited Offer", body: "Special pricing available for new customers this month", cta: "Claim Offer" },
              { headline: "Customer Success", body: "Real results from real customers using our product daily", cta: "Read Stories" },
              { headline: "Get Started Today", body: `Experience ${productName} with our risk-free trial period`, cta: "Start Free Trial" },
            ];
            
            const cardData = cardTypes[i] || cardTypes[0];
            return {
              card_id: `card_${i + 1}`,
              position: i,
              headline: cardData.headline,
              body: cardData.body,
              cta: cardData.cta,
            };
          });
          
          setGeneratedCards(mockCards);
        } else {
          throw backendError;
        }
      }
      
      setCurrentStep(STEP_STATES.STORYBOARD);
    } catch (err) {
      console.error("Carousel generation error:", err);
      setError(err.message || "Failed to generate carousel");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateImages = async () => {
    if (!productImages || productImages.length === 0 || !carouselId) {
      setError("Product images are required to generate carousel images");
      return;
    }

    setIsGeneratingImages(true);
    setError(null);

    try {
      // Upload all product images and collect their IDs
      const uploadedImageIds = [];

      for (const productImage of productImages) {
        if (productImage.file) {
          try {
            console.log("Uploading product image...");
            const uploadResult = await fetch(`${config.pythonApi.baseURL}/api/upload/product-image`, {
              method: "POST",
              body: (() => {
                const formData = new FormData();
                formData.append("product_image", productImage.file);
                return formData;
              })(),
            });

            if (!uploadResult.ok) {
              throw new Error(`Upload failed with status ${uploadResult.status}`);
            }

            const uploadData = await uploadResult.json();
            // Backend returns product_image_id, not image_id
            const imageId = uploadData.product_image_id || uploadData.image_id;
            if (imageId) {
              uploadedImageIds.push(imageId);
              console.log("Product image uploaded:", imageId);
            } else {
              console.warn("Upload response missing image ID:", uploadData);
            }
          } catch (uploadError) {
            console.warn("Product image upload failed:", uploadError.message);
            // Continue with other images even if one fails
          }
        }
      }

      if (uploadedImageIds.length === 0) {
        throw new Error("Failed to upload any product images");
      }

      console.log(`Uploaded ${uploadedImageIds.length} product image(s)`);

      // Try to call backend to generate images for each carousel card
      try {
        const response = await fetch(`${config.pythonApi.baseURL}/carousel/${carouselId}/generate-images`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cards: generatedCards,
            product_image_ids: uploadedImageIds,
          }),
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("ENDPOINT_NOT_FOUND");
          }
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || "Failed to generate images");
        }

        const data = await response.json();
        setCarouselImages(data.images || []);
      } catch (backendError) {
        // If backend endpoint not found, use product image as placeholder
        if (backendError.message === "ENDPOINT_NOT_FOUND" || backendError.message.includes("Failed to fetch")) {
          console.log("Backend endpoint not available, using product image as placeholder");

          // Use the first uploaded product image for all carousel cards as placeholder
          const placeholderUrl = productImages[0]?.url || "";
          const mockImages = generatedCards.map((card, idx) => ({
            card_id: card.card_id,
            url: placeholderUrl,
            position: card.position
          }));
          setCarouselImages(mockImages);
        } else {
          throw backendError;
        }
      }
      
      setCurrentStep(STEP_STATES.OUTPUT);
    } catch (err) {
      console.error("Image generation error:", err);
      setError(err.message || "Failed to generate carousel images");
    } finally {
      setIsGeneratingImages(false);
    }
  };

  const handleEditCard = (index, field, value) => {
    setGeneratedCards((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  const handleExport = () => {
    const exportData = {
      carousel_id: carouselId,
      product_name: productName,
      objective: objective,
      platform: platform,
      cards: generatedCards,
      images: carouselImages,
      generated_at: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `carousel_${carouselId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="carousel-generator">
      <div className="carousel-generator__stepper">
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
            {error && (
              <div className="error-message">
                <Icon icon="solar:danger-circle-bold" />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Product Images</label>
              <div className="image-upload-area">
                {productImages.length > 0 ? (
                  <div className="image-upload-grid">
                    {productImages.map((img) => (
                      <div key={img.id} className="image-preview">
                        <img src={img.url} alt="Product" />
                        <button
                          className="image-remove"
                          onClick={() => handleRemoveImage(img.id)}
                          type="button"
                        >
                          <Icon icon="solar:trash-bin-minimalistic-bold" />
                        </button>
                      </div>
                    ))}
                    {productImages.length < 3 && (
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
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g., ZephyrLite"
              />
            </div>

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

            <div className="form-group">
              <label className="form-label">Number of Cards</label>
              <div className="card-count-selector">
                {CARD_COUNT_OPTIONS.map((count) => (
                  <button
                    key={count}
                    className={`option-btn ${cardCount === count ? "active" : ""}`}
                    onClick={() => setCardCount(count)}
                  >
                    <Icon icon="solar:layers-bold" />
                    {count} Cards
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Campaign Objective</label>
              <div className="option-selector">
                {OBJECTIVE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`option-btn ${objective === opt.value ? "active" : ""}`}
                    onClick={() => setObjective(opt.value)}
                  >
                    <Icon icon={opt.icon} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Platform</label>
              <div className="option-selector">
                {PLATFORM_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`option-btn ${platform === opt.value ? "active" : ""}`}
                    onClick={() => setPlatform(opt.value)}
                  >
                    <Icon icon={opt.icon} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="btn-generate"
              onClick={handleGenerate}
              disabled={isGenerating || !productName.trim() || !productDescription.trim() || productImages.length === 0}
            >
              {isGenerating ? (
                <>
                  <Icon icon="svg-spinners:3-dots-fade" />
                  Generating...
                </>
              ) : (
                <>
                  <Icon icon="solar:magic-stick-bold" />
                  Generate Carousel
                </>
              )}
            </button>
          </div>
        </div>

        {/* Step 2: Storyboard */}
        <div
          className={`stepper-column ${
            currentStep === STEP_STATES.STORYBOARD ? "active" : currentStep === STEP_STATES.OUTPUT ? "completed" : "locked"
          }`}
        >
          <div className="stepper-header">
            <div className="stepper-number">2</div>
            <div className="stepper-title">Storyboard</div>
          </div>

          <div className="stepper-content">
            {generatedCards.length > 0 ? (
              <>
                <div className="storyboard-info">
                  <Icon icon="solar:gallery-bold" />
                  <div className="storyboard-info-text">
                    <strong>{generatedCards.length} carousel cards</strong>
                    <span>Edit content before generating images</span>
                  </div>
                </div>

                <div className="carousel-cards-list">
                  {generatedCards.map((card, idx) => (
                    <div key={idx} className="carousel-card-edit">
                      <div className="card-header">
                        <span className="card-number">Card {idx + 1}</span>
                      </div>

                      <div className="card-fields">
                        <div className="form-group-inline">
                          <label>Headline</label>
                          <input
                            type="text"
                            value={card.headline || card.title || ""}
                            onChange={(e) =>
                              handleEditCard(idx, "headline", e.target.value)
                            }
                            placeholder="Enter headline"
                          />
                        </div>

                        <div className="form-group-inline">
                          <label>Body Copy</label>
                          <textarea
                            value={card.body || card.copy || ""}
                            onChange={(e) =>
                              handleEditCard(idx, "body", e.target.value)
                            }
                            placeholder="Enter body text"
                            rows={3}
                          />
                        </div>

                        <div className="form-group-inline">
                          <label>Call to Action</label>
                          <input
                            type="text"
                            value={card.cta || card.call_to_action || ""}
                            onChange={(e) =>
                              handleEditCard(idx, "cta", e.target.value)
                            }
                            placeholder="Enter CTA"
                          />
                        </div>

                        <div className="form-group-inline">
                          <label>Image Prompt</label>
                          <textarea
                            value={card.image_prompt || ""}
                            onChange={(e) =>
                              handleEditCard(idx, "image_prompt", e.target.value)
                            }
                            placeholder="Image generation prompt (auto-generated)"
                            rows={4}
                            readOnly
                            style={{ opacity: 0.8, fontStyle: "italic" }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  className="btn-generate"
                  onClick={handleGenerateImages}
                  disabled={isGeneratingImages || productImages.length === 0}
                >
                  {isGeneratingImages ? (
                    <>
                      <Icon icon="svg-spinners:3-dots-fade" />
                      Generating Images...
                    </>
                  ) : (
                    <>
                      <Icon icon="solar:gallery-add-bold" />
                      Generate Images
                    </>
                  )}
                </button>
              </>
            ) : (
              <div className="empty-state">
                <Icon icon="solar:gallery-bold" />
                <p>Generate a carousel first</p>
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Output */}
        <div
          className={`stepper-column ${
            currentStep === STEP_STATES.OUTPUT ? "active" : "locked"
          }`}
        >
          <div className="stepper-header">
            <div className="stepper-number">3</div>
            <div className="stepper-title">Output</div>
          </div>

          <div className="stepper-content">
            {carouselImages.length > 0 ? (
              <>
                <div className="output-actions">
                  <button className="btn-secondary" onClick={handleExport}>
                    <Icon icon="solar:download-bold" />
                    Export JSON
                  </button>
                </div>

                <div className="carousel-images-grid">
                  {carouselImages.map((image, idx) => (
                    <div key={idx} className="carousel-image-card">
                      <div className="image-number">Card {idx + 1}</div>
                      <div className="image-preview">
                        <img src={image.url || image} alt={`Carousel card ${idx + 1}`} />
                      </div>
                      {generatedCards[idx] && (
                        <div className="image-caption">
                          <p><strong>{generatedCards[idx].headline || generatedCards[idx].title}</strong></p>
                          <p className="image-cta">{generatedCards[idx].cta || generatedCards[idx].call_to_action}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <Icon icon="solar:image-bold" />
                <p>Generate images to see results</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
