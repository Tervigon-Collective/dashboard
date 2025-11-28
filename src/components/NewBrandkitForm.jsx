"use client";
import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import * as brandkitApi from "@/services/contentGenerationApi";
import ICPConfiguration from "./ICPConfiguration/ICPConfiguration";

const NewBrandkitForm = ({ isOpen, onClose, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1); // 1: Brand Type, 2: Fields, 3: ICP
  const [brandType, setBrandType] = useState("");
  const [formData, setFormData] = useState({
    brand_name: "",
    tagline: "",
    target_audience: "",
    color_palette: [],
    typography: {
      primary: "",
      secondary: null,
      fallback_stack: "Arial, sans-serif",
    },
    logo_path: null,
    brand_description: "",
    niche: "",
  });
  const [icp, setIcp] = useState(null);
  const [icpType, setIcpType] = useState("generic"); // "generic" or "specific"
  const [icpFields, setIcpFields] = useState({
    name: "",
    age_range: "",
    region: "",
    gender: "",
    title: "",
  });
  const [fonts, setFonts] = useState([]);
  const [fontsError, setFontsError] = useState(false);
  const [typoMode, setTypoMode] = useState("dropdown"); // "dropdown" or "manual"
  const [colorMode, setColorMode] = useState("ai"); // "manual" or "ai"
  const [colorTone, setColorTone] = useState("");
  const [manualColor, setManualColor] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatingField, setGeneratingField] = useState(null);
  const [errors, setErrors] = useState({});

  // Fetch Google Fonts on mount
  useEffect(() => {
    const fetchFonts = async () => {
      try {
        const response = await brandkitApi.getGoogleFonts();
        if (response.success && response.fonts) {
          setFonts(response.fonts);
          setFontsError(false);
          setTypoMode("dropdown");
        } else {
          setFontsError(true);
          setTypoMode("manual");
        }
      } catch (error) {
        console.error("Error fetching fonts:", error);
        setFontsError(true);
        setTypoMode("manual");
      }
    };
    if (isOpen) {
      fetchFonts();
    }
  }, [isOpen]);

  // Validate step 1 (Brand Type)
  const validateStep1 = () => {
    if (!brandType.trim()) {
      setErrors({ brand_type: "Brand type is required" });
      return false;
    }
    setErrors({});
    return true;
  };

  // Validate step 2 (Fields)
  const validateStep2 = () => {
    const newErrors = {};
    if (!formData.brand_name.trim()) {
      newErrors.brand_name = "Brand name is required";
    }
    if (!formData.tagline.trim()) {
      newErrors.tagline = "Tagline is required";
    }
    if (!formData.color_palette || formData.color_palette.length === 0) {
      newErrors.color_palette = "At least one color is required";
    }
    if (!formData.typography?.primary) {
      newErrors.typography = "Primary typography is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      if (validateStep2()) {
        setCurrentStep(3);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Generate single field
  const handleGenerateField = async (fieldName, extraParams = {}) => {
    if (!brandType.trim()) {
      alert("Please enter a brand type first");
      return;
    }

    setGeneratingField(fieldName);
    try {
      const response = await brandkitApi.generateField(
        fieldName,
        brandType.trim(),
        {
          industry: formData.niche || "",
        },
        fieldName.startsWith("icp_") ? { icp: { persona: icpFields } } : formData,
        extraParams
      );

      if (fieldName === "color_palette") {
        setFormData((prev) => ({
          ...prev,
          color_palette: response.color_palette || [],
        }));
      } else if (fieldName === "typography") {
        setFormData((prev) => ({
          ...prev,
          typography: response.typography || prev.typography,
        }));
      } else if (fieldName.startsWith("icp_")) {
        // Handle ICP field generation
        if (fieldName === "icp_all_fields") {
          setIcpFields({
            name: response.icp_name || "",
            age_range: response.icp_age_range || "",
            region: response.icp_region || "",
            gender: response.icp_gender || "",
            title: response.icp_title || "",
          });
        } else {
          const fieldKey = fieldName.replace("icp_", "");
          setIcpFields((prev) => ({
            ...prev,
            [fieldKey]: response[fieldName] || prev[fieldKey],
          }));
        }
      } else {
        setFormData((prev) => ({
          ...prev,
          [fieldName]: response[fieldName] || prev[fieldName],
        }));
      }
    } catch (error) {
      console.error(`Error generating ${fieldName}:`, error);
      alert(`Failed to generate ${fieldName}: ${error.response?.data?.detail || error.message}`);
    } finally {
      setGeneratingField(null);
    }
  };

  // Generate all fields
  const handleGenerateAll = async () => {
    if (!brandType.trim()) {
      alert("Please enter a brand type first");
      return;
    }

    setLoading(true);
    try {
      const response = await brandkitApi.generateGlobalBrandkit(
        brandType.trim(),
        {
          industry: formData.niche || "",
          target_market: formData.target_audience || "",
        },
        {}
      );

      setFormData({
        brand_name: response.brand_name || "",
        tagline: response.tagline || response.brand_essence?.tagline || "",
        target_audience: response.target_audience || "",
        color_palette: response.color_palette || [],
        typography: response.typography || {
          primary: "",
          secondary: null,
          fallback_stack: "Arial, sans-serif",
        },
        logo_path: response.logo_path || null,
        brand_description: response.brand_description || "",
        niche: response.niche || "",
      });

      // If ICP is generated, set it
      if (response.icp) {
        setIcp(response.icp);
        setIcpType(response.icp.type || "generic");
      }
    } catch (error) {
      console.error("Error generating brandkit:", error);
      alert(`Failed to generate brandkit: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Generate logo
  const handleGenerateLogo = async (method = "gemini") => {
    if (!formData.brand_name.trim()) {
      alert("Please enter a brand name first");
      return;
    }

    setLoading(true);
    try {
      const response = await brandkitApi.generateLogo(
        formData.brand_name,
        brandType.trim(),
        formData.color_palette,
        "",
        method
      );

      if (response.success && response.logo_path) {
        setFormData((prev) => ({
          ...prev,
          logo_path: response.logo_path,
        }));
        alert("Logo generation started! It will be available shortly.");
      }
    } catch (error) {
      console.error("Error generating logo:", error);
      alert(`Failed to generate logo: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle logo upload
  const handleLogoUpload = async (file) => {
    if (!file) return;

    setLoading(true);
    try {
      // For now, we'll need to create a temporary brandkit or use a different endpoint
      // This will be handled after brandkit creation
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          logo_path: reader.result, // Temporary, will be uploaded after creation
        }));
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading logo:", error);
      alert(`Failed to upload logo: ${error.message}`);
      setLoading(false);
    }
  };

  // Handle manual color addition
  const handleAddManualColor = () => {
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    if (hexPattern.test(manualColor)) {
      setFormData((prev) => ({
        ...prev,
        color_palette: [...prev.color_palette, manualColor],
      }));
      setManualColor("");
    } else {
      alert("Please enter a valid hex color (e.g., #FF5733)");
    }
  };

  // Remove logo
  const handleRemoveLogo = () => {
    setFormData((prev) => ({
      ...prev,
      logo_path: null,
    }));
  };

  // Submit form
  const handleSubmit = async () => {
    if (!validateStep2()) {
      setCurrentStep(2);
      return;
    }

    // Build ICP object if specific
    let finalIcp = null;
    if (icpType === "specific") {
      if (icpFields.name && icpFields.age_range && icpFields.region && icpFields.gender) {
        finalIcp = {
          enabled: true,
          type: "specific",
          persona: {
            name: icpFields.name,
            age_range: icpFields.age_range,
            location: icpFields.region,
            gender: icpFields.gender,
            title: icpFields.title || null,
          },
        };
      }
    } else if (icpType === "generic" && icp) {
      finalIcp = icp;
    }

    setLoading(true);

    try {
      const brandId = formData.brand_name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

      const payload = {
        brand_type: brandType.trim(),
        brand_id: brandId,
        brand_name: formData.brand_name.trim(),
        brand_description: formData.brand_description || formData.tagline,
        niche: formData.niche || finalBrandType,
        color_palette: formData.color_palette,
        typography: formData.typography,
        logo_path: formData.logo_path,
        tagline: formData.tagline.trim(),
        target_audience: formData.target_audience || "",
        icp: finalIcp || undefined,
      };

      const response = await brandkitApi.createNewBrandkit(payload);
      onSuccess(response);
      onClose();
    } catch (error) {
      console.error("Error creating brandkit:", error);
      alert(`Failed to create brandkit: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="modal-dialog modal-xl modal-dialog-scrollable"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header" style={{ padding: "20px", borderBottom: "1px solid #e9ecef" }}>
            <h5 className="modal-title" style={{ fontSize: "1.125rem", fontWeight: "600", margin: 0 }}>
              Create New Brandkit
            </h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>

          <div className="modal-body" style={{ padding: "24px" }}>
            {/* Step Indicator */}
            <div className="d-flex align-items-center justify-content-center mb-4">
              <div className="d-flex align-items-center gap-2">
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: currentStep >= 1 ? "#0d6efd" : "#dee2e6",
                    color: currentStep >= 1 ? "#fff" : "#6c757d",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "600",
                    fontSize: "0.875rem",
                  }}
                >
                  1
                </div>
                <div
                  style={{
                    width: "60px",
                    height: "2px",
                    backgroundColor: currentStep >= 2 ? "#0d6efd" : "#dee2e6",
                  }}
                />
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: currentStep >= 2 ? "#0d6efd" : "#dee2e6",
                    color: currentStep >= 2 ? "#fff" : "#6c757d",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "600",
                    fontSize: "0.875rem",
                  }}
                >
                  2
                </div>
                <div
                  style={{
                    width: "60px",
                    height: "2px",
                    backgroundColor: currentStep >= 3 ? "#0d6efd" : "#dee2e6",
                  }}
                />
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: currentStep >= 3 ? "#0d6efd" : "#dee2e6",
                    color: currentStep >= 3 ? "#fff" : "#6c757d",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "600",
                    fontSize: "0.875rem",
                  }}
                >
                  3
                </div>
              </div>
            </div>

            {/* Step 1: Brand Type */}
            {currentStep === 1 && (
              <div>
                <h6 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "12px" }}>
                  What do you sell, or what is the speciality of your brand? <span className="text-danger">*</span>
                </h6>
                <p style={{ fontSize: "0.875rem", color: "#6c757d", marginBottom: "20px" }}>
                  e.g., pet accessories, home décor, bakery services, fitness coaching
                </p>

                <div className="mb-3">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g., pet accessories, home décor, bakery services"
                    value={brandType}
                    onChange={(e) => {
                      setBrandType(e.target.value);
                      setErrors({});
                    }}
                    required
                    style={{ maxWidth: "600px" }}
                  />
                </div>

                {errors.brand_type && (
                  <div className="text-danger" style={{ fontSize: "0.875rem" }}>
                    {errors.brand_type}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Brand Fields */}
            {currentStep === 2 && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 style={{ fontSize: "1rem", fontWeight: "600", margin: 0 }}>
                    Brand Information
                  </h6>
                  <button
                    type="button"
                    onClick={handleGenerateAll}
                    disabled={loading || generatingField}
                    className="btn btn-primary btn-sm"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Icon icon="solar:magic-stick-3-bold" width="16" height="16" />
                    Generate All with AI
                  </button>
                </div>

                {/* Brand Name */}
                <div className="mb-3">
                  <label className="form-label" style={{ fontSize: "0.875rem", fontWeight: "500" }}>
                    Brand Name <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      value={formData.brand_name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, brand_name: e.target.value }))
                      }
                      placeholder="Enter brand name"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={() => handleGenerateField("brand_name")}
                      disabled={loading || generatingField === "brand_name"}
                      title="Generate with AI"
                    >
                      {generatingField === "brand_name" ? (
                        <span className="spinner-border spinner-border-sm" />
                      ) : (
                        <Icon icon="solar:magic-stick-3-bold" width="16" height="16" />
                      )}
                    </button>
                  </div>
                  {errors.brand_name && (
                    <div className="text-danger" style={{ fontSize: "0.75rem", marginTop: "4px" }}>
                      {errors.brand_name}
                    </div>
                  )}
                </div>

                {/* Tagline */}
                <div className="mb-3">
                  <label className="form-label" style={{ fontSize: "0.875rem", fontWeight: "500" }}>
                    Tagline <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      value={formData.tagline}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, tagline: e.target.value }))
                      }
                      placeholder="Enter tagline"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={() => handleGenerateField("tagline")}
                      disabled={loading || generatingField === "tagline"}
                      title="Generate with AI"
                    >
                      {generatingField === "tagline" ? (
                        <span className="spinner-border spinner-border-sm" />
                      ) : (
                        <Icon icon="solar:magic-stick-3-bold" width="16" height="16" />
                      )}
                    </button>
                  </div>
                  {errors.tagline && (
                    <div className="text-danger" style={{ fontSize: "0.75rem", marginTop: "4px" }}>
                      {errors.tagline}
                    </div>
                  )}
                </div>

                {/* Target Audience */}
                <div className="mb-3">
                  <label className="form-label" style={{ fontSize: "0.875rem", fontWeight: "500" }}>
                    Target Audience
                  </label>
                  <div className="input-group">
                    <textarea
                      className="form-control"
                      value={formData.target_audience}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, target_audience: e.target.value }))
                      }
                      placeholder="Describe your target audience"
                      rows={3}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={() => handleGenerateField("target_audience")}
                      disabled={loading || generatingField === "target_audience"}
                      title="Generate with AI"
                    >
                      {generatingField === "target_audience" ? (
                        <span className="spinner-border spinner-border-sm" />
                      ) : (
                        <Icon icon="solar:magic-stick-3-bold" width="16" height="16" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Color Palette */}
                <div className="mb-3">
                  <label className="form-label" style={{ fontSize: "0.875rem", fontWeight: "500" }}>
                    Color Palette <span className="text-danger">*</span>
                  </label>
                  
                  {/* Mode Toggle */}
                  <div className="d-flex gap-2 mb-2">
                    <button
                      type="button"
                      className={`btn btn-sm ${colorMode === "manual" ? "btn-primary" : "btn-outline-secondary"}`}
                      onClick={() => setColorMode("manual")}
                    >
                      Manual
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${colorMode === "ai" ? "btn-primary" : "btn-outline-secondary"}`}
                      onClick={() => setColorMode("ai")}
                    >
                      AI Generate
                    </button>
                  </div>

                  {/* Manual Mode */}
                  {colorMode === "manual" && (
                    <div className="d-flex gap-2 mb-2">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="#FF5733"
                        value={manualColor}
                        onChange={(e) => setManualColor(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddManualColor();
                          }
                        }}
                        style={{ maxWidth: "200px" }}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-primary"
                        onClick={handleAddManualColor}
                      >
                        Add Color
                      </button>
                    </div>
                  )}

                  {/* AI Mode */}
                  {colorMode === "ai" && (
                    <div className="d-flex gap-2 mb-2">
                      <select
                        className="form-select"
                        value={colorTone}
                        onChange={(e) => setColorTone(e.target.value)}
                        style={{ maxWidth: "200px" }}
                      >
                        <option value="">Select tone/mood (optional)</option>
                        <option value="warm">Warm</option>
                        <option value="cool">Cool</option>
                        <option value="vintage">Vintage</option>
                        <option value="modern">Modern</option>
                        <option value="minimal">Minimal</option>
                        <option value="pastel">Pastel</option>
                        <option value="luxurious">Luxurious</option>
                        <option value="bold">Bold</option>
                        <option value="earthy">Earthy</option>
                        <option value="neon">Neon</option>
                      </select>
                      <button
                        type="button"
                        className="btn btn-outline-primary"
                        onClick={() => handleGenerateField("color_palette", colorTone ? { color_tone: colorTone } : {})}
                        disabled={loading || generatingField === "color_palette"}
                      >
                        {generatingField === "color_palette" ? (
                          <span className="spinner-border spinner-border-sm" />
                        ) : (
                          <>
                            <Icon icon="solar:magic-stick-3-bold" width="16" height="16" /> Generate
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Color Chips */}
                  <div className="d-flex gap-2 align-items-center flex-wrap mb-2">
                    {formData.color_palette.map((color, index) => (
                      <div
                        key={index}
                        style={{
                          width: "60px",
                          height: "60px",
                          backgroundColor: color,
                          borderRadius: "6px",
                          border: "2px solid #dee2e6",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontSize: "0.75rem",
                          fontWeight: "600",
                          textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                          position: "relative",
                        }}
                      >
                        {color}
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              color_palette: prev.color_palette.filter((_, i) => i !== index),
                            }));
                          }}
                          style={{
                            position: "absolute",
                            top: "-8px",
                            right: "-8px",
                            width: "20px",
                            height: "20px",
                            borderRadius: "50%",
                            backgroundColor: "#dc3545",
                            border: "none",
                            color: "#fff",
                            fontSize: "12px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  {errors.color_palette && (
                    <div className="text-danger" style={{ fontSize: "0.75rem", marginTop: "4px" }}>
                      {errors.color_palette}
                    </div>
                  )}
                </div>

                {/* Typography */}
                <div className="mb-3">
                  <label className="form-label" style={{ fontSize: "0.875rem", fontWeight: "500" }}>
                    Typography <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    {typoMode === "dropdown" && !fontsError ? (
                      <select
                        className="form-select"
                        value={formData.typography?.primary || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            typography: { ...prev.typography, primary: e.target.value, fallback_stack: "Arial, sans-serif" },
                          }))
                        }
                        disabled={loading}
                      >
                        <option value="">Select font</option>
                        {fonts.map((font) => (
                          <option key={font.family} value={font.family}>
                            {font.family}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Inter, Roboto, Arial, etc."
                        value={formData.typography?.primary || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            typography: { ...prev.typography, primary: e.target.value, fallback_stack: "Arial, sans-serif" },
                          }))
                        }
                        disabled={loading}
                      />
                    )}
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={() => handleGenerateField("typography")}
                      disabled={loading || generatingField === "typography"}
                      title="Generate with AI"
                    >
                      {generatingField === "typography" ? (
                        <span className="spinner-border spinner-border-sm" />
                      ) : (
                        <Icon icon="solar:magic-stick-3-bold" width="16" height="16" />
                      )}
                    </button>
                  </div>
                  {fontsError && (
                    <small className="text-warning" style={{ fontSize: "0.75rem", display: "block", marginTop: "4px" }}>
                      Google Fonts failed to load. Using manual input.
                    </small>
                  )}
                  {errors.typography && (
                    <div className="text-danger" style={{ fontSize: "0.75rem", marginTop: "4px" }}>
                      {errors.typography}
                    </div>
                  )}
                </div>

                {/* Logo */}
                <div className="mb-3">
                  <label className="form-label" style={{ fontSize: "0.875rem", fontWeight: "500" }}>
                    Logo
                  </label>
                  <div className="d-flex gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleLogoUpload(e.target.files[0])}
                      disabled={loading}
                      className="form-control"
                      style={{ maxWidth: "300px" }}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={() => handleGenerateLogo("gemini")}
                      disabled={loading}
                    >
                      <Icon icon="solar:magic-stick-3-bold" width="16" height="16" /> Generate
                    </button>
                  </div>
                  {formData.logo_path && (
                    <div className="mt-2 d-flex align-items-center gap-2">
                      <img
                        src={formData.logo_path}
                        alt="Logo preview"
                        style={{ maxWidth: "200px", maxHeight: "100px", objectFit: "contain" }}
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={handleRemoveLogo}
                        disabled={loading}
                      >
                        Remove Logo
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: ICP Selection */}
            {currentStep === 3 && (
              <div>
                <h6 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "12px" }}>
                  Ideal Customer Profile (ICP)
                </h6>
                <p style={{ fontSize: "0.875rem", color: "#6c757d", marginBottom: "20px" }}>
                  Choose how you want to define your ideal customer profile.
                </p>

                {/* ICP Type Selection */}
                <div className="mb-3">
                  <div
                    onClick={() => setIcpType("generic")}
                    style={{
                      padding: "16px",
                      marginBottom: "12px",
                      border: `2px solid ${icpType === "generic" ? "#0d6efd" : "#dee2e6"}`,
                      borderRadius: "6px",
                      cursor: "pointer",
                      backgroundColor: icpType === "generic" ? "#f0f7ff" : "#fff",
                    }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <input
                        type="radio"
                        name="icp-type"
                        checked={icpType === "generic"}
                        onChange={() => setIcpType("generic")}
                      />
                      <div>
                        <strong>Generic ICP</strong>
                        <p style={{ fontSize: "0.875rem", color: "#6c757d", margin: "4px 0 0 0" }}>
                          Skip - AI will generate based on brand information.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setIcpType("specific")}
                    style={{
                      padding: "16px",
                      border: `2px solid ${icpType === "specific" ? "#0d6efd" : "#dee2e6"}`,
                      borderRadius: "6px",
                      cursor: "pointer",
                      backgroundColor: icpType === "specific" ? "#f0f7ff" : "#fff",
                    }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <input
                        type="radio"
                        name="icp-type"
                        checked={icpType === "specific"}
                        onChange={() => setIcpType("specific")}
                      />
                      <div>
                        <strong>Specific ICP</strong>
                        <p style={{ fontSize: "0.875rem", color: "#6c757d", margin: "4px 0 0 0" }}>
                          Fill 5 fields (Name, Age Range, Region, Gender, Title).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Generic ICP - Skip (no form) */}
                {icpType === "generic" && (
                  <div className="alert alert-info" style={{ fontSize: "0.875rem" }}>
                    Generic ICP will be automatically generated when you create the brandkit.
                  </div>
                )}

                {/* Specific ICP - 5 Fields */}
                {icpType === "specific" && (
                  <div>
                    {/* Global AI Button */}
                    <div className="mb-3">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleGenerateField("icp_all_fields")}
                        disabled={loading || generatingField === "icp_all_fields"}
                      >
                        {generatingField === "icp_all_fields" ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Icon icon="solar:magic-stick-3-bold" width="16" height="16" className="me-2" />
                            Generate All ICP Fields
                          </>
                        )}
                      </button>
                    </div>

                    {/* Name Field */}
                    <div className="mb-3">
                      <label className="form-label" style={{ fontSize: "0.875rem", fontWeight: "500" }}>
                        Name <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          value={icpFields.name}
                          onChange={(e) => setIcpFields({ ...icpFields, name: e.target.value })}
                          placeholder="e.g., Alex"
                          disabled={loading}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-primary"
                          onClick={() => handleGenerateField("icp_name")}
                          disabled={loading || generatingField === "icp_name"}
                        >
                          {generatingField === "icp_name" ? (
                            <span className="spinner-border spinner-border-sm" />
                          ) : (
                            <Icon icon="solar:magic-stick-3-bold" width="16" height="16" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Age Range Field */}
                    <div className="mb-3">
                      <label className="form-label" style={{ fontSize: "0.875rem", fontWeight: "500" }}>
                        Age Range <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          value={icpFields.age_range}
                          onChange={(e) => setIcpFields({ ...icpFields, age_range: e.target.value })}
                          placeholder="e.g., 25-35"
                          disabled={loading}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-primary"
                          onClick={() => handleGenerateField("icp_age_range")}
                          disabled={loading || generatingField === "icp_age_range"}
                        >
                          {generatingField === "icp_age_range" ? (
                            <span className="spinner-border spinner-border-sm" />
                          ) : (
                            <Icon icon="solar:magic-stick-3-bold" width="16" height="16" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Region Field */}
                    <div className="mb-3">
                      <label className="form-label" style={{ fontSize: "0.875rem", fontWeight: "500" }}>
                        Region <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          value={icpFields.region}
                          onChange={(e) => setIcpFields({ ...icpFields, region: e.target.value })}
                          placeholder="e.g., Urban areas, New York"
                          disabled={loading}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-primary"
                          onClick={() => handleGenerateField("icp_region")}
                          disabled={loading || generatingField === "icp_region"}
                        >
                          {generatingField === "icp_region" ? (
                            <span className="spinner-border spinner-border-sm" />
                          ) : (
                            <Icon icon="solar:magic-stick-3-bold" width="16" height="16" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Gender Field */}
                    <div className="mb-3">
                      <label className="form-label" style={{ fontSize: "0.875rem", fontWeight: "500" }}>
                        Gender <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          value={icpFields.gender}
                          onChange={(e) => setIcpFields({ ...icpFields, gender: e.target.value })}
                          placeholder="e.g., Diverse, Female, Male"
                          disabled={loading}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-primary"
                          onClick={() => handleGenerateField("icp_gender")}
                          disabled={loading || generatingField === "icp_gender"}
                        >
                          {generatingField === "icp_gender" ? (
                            <span className="spinner-border spinner-border-sm" />
                          ) : (
                            <Icon icon="solar:magic-stick-3-bold" width="16" height="16" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Title Field */}
                    <div className="mb-3">
                      <label className="form-label" style={{ fontSize: "0.875rem", fontWeight: "500" }}>
                        Title
                      </label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          value={icpFields.title}
                          onChange={(e) => setIcpFields({ ...icpFields, title: e.target.value })}
                          placeholder="e.g., Marketing Manager, Professional"
                          disabled={loading}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-primary"
                          onClick={() => handleGenerateField("icp_title")}
                          disabled={loading || generatingField === "icp_title"}
                        >
                          {generatingField === "icp_title" ? (
                            <span className="spinner-border spinner-border-sm" />
                          ) : (
                            <Icon icon="solar:magic-stick-3-bold" width="16" height="16" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="modal-footer" style={{ padding: "16px 20px", borderTop: "1px solid #e9ecef" }}>
            <button
              type="button"
              onClick={currentStep === 1 ? onClose : handlePrevious}
              disabled={loading}
              className="btn btn-secondary"
            >
              {currentStep === 1 ? "Cancel" : "Previous"}
            </button>
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={loading}
                className="btn btn-primary"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? "Creating..." : "Create Brandkit"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewBrandkitForm;

