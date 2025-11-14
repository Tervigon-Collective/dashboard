"use client";
import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import * as brandkitApi from "@/services/contentGenerationApi";

const BrandkitFormModal = ({ isOpen, onClose, onSuccess, editBrandkit = null }) => {
  const isEditMode = !!editBrandkit;

  // Form state
  const [formData, setFormData] = useState({
    brand_name: "",
    brand_id: "",
    tagline: "",
    brand_voice_primary: "",
    brand_voice_secondary: [],
    brand_voice_avoid: [],
    core_message: "",
    key_pillars: [],
    emotional_territory: "",
    target_audience_primary: "",
    target_audience_psychographics: [],
    color_primary: "#2C5F4F",
    color_secondary: [],
    color_accent: "#D4A574",
    typography_primary: "",
    typography_secondary: "",
    tone_dos: [],
    tone_donts: [],
    preferred_terms: [],
    avoid_terms: [],
    core_products: [],
    competitors: [],
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Temporary input states for arrays
  const [tempInputs, setTempInputs] = useState({
    brand_voice_secondary: "",
    brand_voice_avoid: "",
    key_pillars: "",
    target_audience_psychographics: "",
    color_secondary: "#8B9D77",
    tone_dos: "",
    tone_donts: "",
    preferred_terms: "",
    avoid_terms: "",
    core_products: "",
    competitor_name: "",
    competitor_positioning: "",
  });

  // Helper function to ensure array of strings
  const ensureStringArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.filter(item => typeof item === 'string');
    }
    return [];
  };

  // Helper function to ensure array of competitor objects
  const ensureCompetitorArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.filter(item => item && typeof item === 'object' && item.name);
    }
    return [];
  };

  // Load edit data or reset for new brandkit
  useEffect(() => {
    if (isEditMode && editBrandkit) {
      // Handle backend data structure mapping for EDIT mode
      const colorPalette = Array.isArray(editBrandkit.color_palette) 
        ? editBrandkit.color_palette 
        : [];
      
      setFormData({
        brand_name: editBrandkit.brand_name || "",
        brand_id: editBrandkit.brand_id || "",
        tagline: editBrandkit.brand_essence?.tagline || "",
        brand_voice_primary: editBrandkit.brand_voice?.primary || editBrandkit.tone_profile?.primary || "",
        brand_voice_secondary: ensureStringArray(editBrandkit.brand_voice?.alternates),
        brand_voice_avoid: ensureStringArray(editBrandkit.brand_voice?.avoid),
        core_message: editBrandkit.brand_essence?.core_message || "",
        key_pillars: ensureStringArray(editBrandkit.unique_selling_points),
        emotional_territory: editBrandkit.brand_essence?.archetype_blend ? 
          Object.entries(editBrandkit.brand_essence.archetype_blend)
            .map(([key, val]) => `${key}: ${val}`)
            .join(", ") : "",
        target_audience_primary: editBrandkit.target_audience?.primary || 
          (typeof editBrandkit.target_audience === 'string' ? editBrandkit.target_audience : ""),
        target_audience_psychographics: ensureStringArray(editBrandkit.target_audience?.psychographics),
        color_primary: colorPalette[0] || "#2C5F4F",
        color_secondary: ensureStringArray(colorPalette.slice(1)),
        color_accent: colorPalette[colorPalette.length - 1] || "#D4A574",
        typography_primary: editBrandkit.typography?.primary || "",
        typography_secondary: editBrandkit.typography?.secondary || "",
        tone_dos: ensureStringArray(editBrandkit.style_guide?.dos),
        tone_donts: ensureStringArray(editBrandkit.style_guide?.donts),
        preferred_terms: ensureStringArray(editBrandkit.keywords?.hero_words || editBrandkit.brand_vocabulary?.hero_words),
        avoid_terms: ensureStringArray(editBrandkit.keywords?.words_to_avoid || editBrandkit.brand_vocabulary?.words_to_avoid),
        core_products: ensureStringArray(editBrandkit.keywords?.product_categories || editBrandkit.brand_vocabulary?.product_categories),
        competitors: ensureCompetitorArray(editBrandkit.competitors),
      });
    } else if (!isEditMode) {
      // Reset form for CREATE mode
      setFormData({
        brand_name: "",
        brand_id: "",
        tagline: "",
        brand_voice_primary: "",
        brand_voice_secondary: [],
        brand_voice_avoid: [],
        core_message: "",
        key_pillars: [],
        emotional_territory: "",
        target_audience_primary: "",
        target_audience_psychographics: [],
        color_primary: "#2C5F4F",
        color_secondary: [],
        color_accent: "#D4A574",
        typography_primary: "",
        typography_secondary: "",
        tone_dos: [],
        tone_donts: [],
        preferred_terms: [],
        avoid_terms: [],
        core_products: [],
        competitors: [],
      });
    }
  }, [isEditMode, editBrandkit]);

  // Auto-generate brand_id from brand_name
  const sanitizeBrandId = (name) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_-]/g, "");
  };

  const handleBrandNameChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      brand_name: value,
      brand_id: isEditMode ? prev.brand_id : sanitizeBrandId(value),
    }));
  };

  // Handle adding items to arrays
  const addToArray = (field, value) => {
    if (value.trim()) {
      setFormData((prev) => ({
        ...prev,
        [field]: [...prev[field], value.trim()],
      }));
      setTempInputs((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const removeFromArray = (field, index) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  // Handle adding competitors
  const addCompetitor = () => {
    if (tempInputs.competitor_name.trim()) {
      setFormData((prev) => ({
        ...prev,
        competitors: [
          ...prev.competitors,
          {
            name: tempInputs.competitor_name.trim(),
            positioning: tempInputs.competitor_positioning.trim() || "",
          },
        ],
      }));
      setTempInputs((prev) => ({
        ...prev,
        competitor_name: "",
        competitor_positioning: "",
      }));
    }
  };

  const removeCompetitor = (index) => {
    setFormData((prev) => ({
      ...prev,
      competitors: prev.competitors.filter((_, i) => i !== index),
    }));
  };

  // Validate form
  const validate = () => {
    const newErrors = {};

    // Required fields
    if (!formData.brand_name.trim()) {
      newErrors.brand_name = "Brand name is required";
    }
    if (!formData.brand_id.trim()) {
      newErrors.brand_id = "Brand ID is required";
    } else if (!/^[a-z0-9_-]+$/.test(formData.brand_id)) {
      newErrors.brand_id = "Brand ID can only contain lowercase letters, numbers, underscores, and hyphens";
    }
    if (!formData.brand_voice_primary.trim()) {
      newErrors.brand_voice_primary = "Primary brand voice is required";
    }
    if (!formData.core_message.trim()) {
      newErrors.core_message = "Core message is required";
    }
    if (formData.key_pillars.length === 0) {
      newErrors.key_pillars = "At least one key pillar is required";
    }
    if (!formData.target_audience_primary.trim()) {
      newErrors.target_audience_primary = "Primary target audience is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Build API payload matching backend Pydantic model expectations
      const payload = {
        brand_name: formData.brand_name.trim(),
        brand_id: formData.brand_id.trim(),
        brand_description: formData.core_message.trim() || "No description provided",
        niche: formData.emotional_territory.trim() || "General",
        brand_voice: {
          primary: formData.brand_voice_primary.trim(),
          alternates: Array.isArray(formData.brand_voice_secondary) 
            ? formData.brand_voice_secondary.filter(item => typeof item === 'string' && item.trim())
            : [],
        },
        brand_essence: {
          tagline: formData.tagline.trim() || undefined,
          core_message: formData.core_message.trim(),
          archetype_blend: formData.emotional_territory.trim() ? {
            "primary": formData.emotional_territory.trim()
          } : undefined,
        },
        unique_selling_points: Array.isArray(formData.key_pillars)
          ? formData.key_pillars.filter(item => typeof item === 'string' && item.trim())
          : [],
        target_audience: formData.target_audience_primary.trim(),
        color_palette: [
          formData.color_primary,
          ...(Array.isArray(formData.color_secondary)
            ? formData.color_secondary.filter(item => typeof item === 'string' && item.trim())
            : []),
          formData.color_accent,
        ],
        typography: {
          primary: formData.typography_primary.trim() || "Sans-serif",
          secondary: formData.typography_secondary.trim() || "Serif",
        },
        style_guide: {
          dos: (() => {
            const filtered = Array.isArray(formData.tone_dos)
              ? formData.tone_dos.filter(item => typeof item === 'string' && item.trim())
              : [];
            // Backend requires at least 1 item
            return filtered.length > 0 ? filtered : ["Be authentic and engaging"];
          })(),
          donts: (() => {
            const filtered = Array.isArray(formData.tone_donts)
              ? formData.tone_donts.filter(item => typeof item === 'string' && item.trim())
              : [];
            // Backend requires at least 1 item
            return filtered.length > 0 ? filtered : ["Avoid jargon"];
          })(),
        },
        brand_vocabulary: {
          hero_words: (() => {
            const filtered = Array.isArray(formData.preferred_terms)
              ? formData.preferred_terms.filter(item => typeof item === 'string' && item.trim())
              : [];
            // Backend requires at least 1 item
            return filtered.length > 0 ? filtered : [formData.brand_name.trim() || "Brand"];
          })(),
          words_to_avoid: Array.isArray(formData.avoid_terms)
            ? formData.avoid_terms.filter(item => typeof item === 'string' && item.trim())
            : [],
          product_categories: Array.isArray(formData.core_products)
            ? formData.core_products.filter(item => typeof item === 'string' && item.trim())
            : [],
        },
        competitors: Array.isArray(formData.competitors)
          ? formData.competitors.filter(comp => comp && typeof comp === 'object' && comp.name)
          : [],
      };

      // Log payload for debugging
      console.log('Brandkit payload being sent:', JSON.stringify(payload, null, 2));
      console.log('Payload type check:', {
        style_guide_dos_type: typeof payload.style_guide.dos,
        style_guide_dos_isArray: Array.isArray(payload.style_guide.dos),
        style_guide_dos_value: payload.style_guide.dos,
        hero_words_type: typeof payload.brand_vocabulary.hero_words,
        hero_words_isArray: Array.isArray(payload.brand_vocabulary.hero_words),
        hero_words_value: payload.brand_vocabulary.hero_words,
        color_palette_type: typeof payload.color_palette,
        color_palette_isArray: Array.isArray(payload.color_palette),
        color_palette_value: payload.color_palette,
      });

      let response;
      if (isEditMode) {
        response = await brandkitApi.updateBrandkit(formData.brand_id, payload);
      } else {
        response = await brandkitApi.createBrandkit(payload);
      }

      onSuccess(response);
      onClose();
    } catch (error) {
      console.error("Error saving brandkit:", error);
      console.error("Error response data:", error.response?.data);
      console.error("Error response status:", error.response?.status);
      
      let errorMessage = error.message;
      if (error.response?.data) {
        // Handle different error response formats
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.detail) {
          // Pydantic validation errors
          if (Array.isArray(error.response.data.detail)) {
            errorMessage = error.response.data.detail
              .map(err => `${err.loc.join('.')}: ${err.msg}`)
              .join('\n');
          } else {
            errorMessage = JSON.stringify(error.response.data.detail);
          }
        } else {
          errorMessage = JSON.stringify(error.response.data);
        }
      }
      
      alert(
        `Failed to ${isEditMode ? "update" : "create"} brandkit:\n\n${errorMessage}`
      );
    } finally {
      setIsSubmitting(false);
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
        className="modal-dialog modal-lg modal-dialog-scrollable"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              {isEditMode ? "Edit Brandkit" : "Create New Brandkit"}
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              disabled={isSubmitting}
            />
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit}>
              {/* Required Section */}
              <div className="mb-4">
                <h6 className="fw-semibold mb-3">Basic Information</h6>

                {/* Brand Name */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Brand Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.brand_name ? "is-invalid" : ""}`}
                    value={formData.brand_name}
                    onChange={(e) => handleBrandNameChange(e.target.value)}
                    placeholder="e.g., Tilting Heads, Glow Naturals"
                    disabled={isSubmitting}
                  />
                  {errors.brand_name && (
                    <div className="invalid-feedback">{errors.brand_name}</div>
                  )}
                </div>

                {/* Brand ID */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Brand ID <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.brand_id ? "is-invalid" : ""}`}
                    value={formData.brand_id}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, brand_id: e.target.value }))
                    }
                    placeholder="e.g., tilting_heads, glow_naturals"
                    disabled={isEditMode || isSubmitting}
                    readOnly={isEditMode}
                  />
                  {errors.brand_id && (
                    <div className="invalid-feedback">{errors.brand_id}</div>
                  )}
                  <small className="text-muted">
                    Lowercase letters, numbers, underscores, and hyphens only
                    {isEditMode && " (Cannot be changed)"}
                  </small>
                </div>

                {/* Tagline */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">Tagline</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.tagline}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, tagline: e.target.value }))
                    }
                    placeholder="e.g., Where Wild Wisdom Meets Modern Care"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Brand Voice */}
              <div className="mb-4">
                <h6 className="fw-semibold mb-3">Brand Voice</h6>

                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Primary Voice <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control ${
                      errors.brand_voice_primary ? "is-invalid" : ""
                    }`}
                    value={formData.brand_voice_primary}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        brand_voice_primary: e.target.value,
                      }))
                    }
                    placeholder="e.g., Calm, Emotional, Poetic"
                    disabled={isSubmitting}
                  />
                  {errors.brand_voice_primary && (
                    <div className="invalid-feedback">{errors.brand_voice_primary}</div>
                  )}
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Secondary Voices</label>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      value={tempInputs.brand_voice_secondary}
                      onChange={(e) =>
                        setTempInputs((prev) => ({
                          ...prev,
                          brand_voice_secondary: e.target.value,
                        }))
                      }
                      placeholder="e.g., Assertive"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addToArray(
                            "brand_voice_secondary",
                            tempInputs.brand_voice_secondary
                          );
                        }
                      }}
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() =>
                        addToArray(
                          "brand_voice_secondary",
                          tempInputs.brand_voice_secondary
                        )
                      }
                      disabled={isSubmitting}
                    >
                      <Icon icon="solar:add-circle-bold" width="16" height="16" />
                    </button>
                  </div>
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    {formData.brand_voice_secondary.map((item, index) => (
                      <span key={index} className="badge bg-secondary d-flex align-items-center gap-1">
                        {item}
                        <button
                          type="button"
                          className="btn-close btn-close-white"
                          style={{ fontSize: "10px" }}
                          onClick={() => removeFromArray("brand_voice_secondary", index)}
                          disabled={isSubmitting}
                        />
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Voices to Avoid</label>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      value={tempInputs.brand_voice_avoid}
                      onChange={(e) =>
                        setTempInputs((prev) => ({
                          ...prev,
                          brand_voice_avoid: e.target.value,
                        }))
                      }
                      placeholder="e.g., Aggressive"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addToArray("brand_voice_avoid", tempInputs.brand_voice_avoid);
                        }
                      }}
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() =>
                        addToArray("brand_voice_avoid", tempInputs.brand_voice_avoid)
                      }
                      disabled={isSubmitting}
                    >
                      <Icon icon="solar:add-circle-bold" width="16" height="16" />
                    </button>
                  </div>
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    {formData.brand_voice_avoid.map((item, index) => (
                      <span key={index} className="badge bg-warning d-flex align-items-center gap-1">
                        {item}
                        <button
                          type="button"
                          className="btn-close"
                          style={{ fontSize: "10px" }}
                          onClick={() => removeFromArray("brand_voice_avoid", index)}
                          disabled={isSubmitting}
                        />
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Brand Essence */}
              <div className="mb-4">
                <h6 className="fw-semibold mb-3">Brand Essence</h6>

                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Core Message <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className={`form-control ${errors.core_message ? "is-invalid" : ""}`}
                    rows="3"
                    value={formData.core_message}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, core_message: e.target.value }))
                    }
                    placeholder="e.g., Return to natural, biologically respectful pet care"
                    disabled={isSubmitting}
                  />
                  {errors.core_message && (
                    <div className="invalid-feedback">{errors.core_message}</div>
                  )}
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Key Pillars <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <input
                      type="text"
                      className={`form-control ${errors.key_pillars ? "is-invalid" : ""}`}
                      value={tempInputs.key_pillars}
                      onChange={(e) =>
                        setTempInputs((prev) => ({ ...prev, key_pillars: e.target.value }))
                      }
                      placeholder="e.g., Speed, Relief, Safety"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addToArray("key_pillars", tempInputs.key_pillars);
                        }
                      }}
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => addToArray("key_pillars", tempInputs.key_pillars)}
                      disabled={isSubmitting}
                    >
                      <Icon icon="solar:add-circle-bold" width="16" height="16" />
                    </button>
                  </div>
                  {errors.key_pillars && (
                    <div className="text-danger small mt-1">{errors.key_pillars}</div>
                  )}
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    {formData.key_pillars.map((item, index) => (
                      <span key={index} className="badge bg-primary d-flex align-items-center gap-1">
                        {item}
                        <button
                          type="button"
                          className="btn-close btn-close-white"
                          style={{ fontSize: "10px" }}
                          onClick={() => removeFromArray("key_pillars", index)}
                          disabled={isSubmitting}
                        />
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Emotional Territory</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.emotional_territory}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        emotional_territory: e.target.value,
                      }))
                    }
                    placeholder="e.g., Calm assurance, biological respect, natural wisdom"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Target Audience */}
              <div className="mb-4">
                <h6 className="fw-semibold mb-3">Target Audience</h6>

                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Primary Audience <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control ${
                      errors.target_audience_primary ? "is-invalid" : ""
                    }`}
                    value={formData.target_audience_primary}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        target_audience_primary: e.target.value,
                      }))
                    }
                    placeholder="e.g., Urban pet parents (25-40)"
                    disabled={isSubmitting}
                  />
                  {errors.target_audience_primary && (
                    <div className="invalid-feedback">
                      {errors.target_audience_primary}
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Psychographics</label>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      value={tempInputs.target_audience_psychographics}
                      onChange={(e) =>
                        setTempInputs((prev) => ({
                          ...prev,
                          target_audience_psychographics: e.target.value,
                        }))
                      }
                      placeholder="e.g., Research-heavy, Health-conscious"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addToArray(
                            "target_audience_psychographics",
                            tempInputs.target_audience_psychographics
                          );
                        }
                      }}
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() =>
                        addToArray(
                          "target_audience_psychographics",
                          tempInputs.target_audience_psychographics
                        )
                      }
                      disabled={isSubmitting}
                    >
                      <Icon icon="solar:add-circle-bold" width="16" height="16" />
                    </button>
                  </div>
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    {formData.target_audience_psychographics.map((item, index) => (
                      <span key={index} className="badge bg-info d-flex align-items-center gap-1">
                        {item}
                        <button
                          type="button"
                          className="btn-close"
                          style={{ fontSize: "10px" }}
                          onClick={() =>
                            removeFromArray("target_audience_psychographics", index)
                          }
                          disabled={isSubmitting}
                        />
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Advanced Settings Accordion */}
              <div className="mb-4">
                <button
                  type="button"
                  className="btn btn-link p-0 text-decoration-none d-flex align-items-center gap-2"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  <Icon
                    icon={
                      showAdvanced
                        ? "solar:alt-arrow-down-bold"
                        : "solar:alt-arrow-right-bold"
                    }
                    width="16"
                    height="16"
                  />
                  <h6 className="mb-0">Advanced Settings (Optional)</h6>
                </button>
              </div>

              {showAdvanced && (
                <>
                  {/* Color Palette */}
                  <div className="mb-4">
                    <h6 className="fw-semibold mb-3">Color Palette</h6>

                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label fw-semibold">Primary Color</label>
                        <input
                          type="color"
                          className="form-control form-control-color"
                          value={formData.color_primary}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              color_primary: e.target.value,
                            }))
                          }
                          disabled={isSubmitting}
                        />
                        <small className="text-muted">{formData.color_primary}</small>
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label fw-semibold">Accent Color</label>
                        <input
                          type="color"
                          className="form-control form-control-color"
                          value={formData.color_accent}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              color_accent: e.target.value,
                            }))
                          }
                          disabled={isSubmitting}
                        />
                        <small className="text-muted">{formData.color_accent}</small>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold">Secondary Colors</label>
                      <div className="d-flex gap-2 align-items-center mb-2">
                        <div className="d-flex align-items-center gap-2 flex-grow-1">
                          <input
                            type="color"
                            className="form-control form-control-color"
                            value={tempInputs.color_secondary}
                            onChange={(e) =>
                              setTempInputs((prev) => ({
                                ...prev,
                                color_secondary: e.target.value,
                              }))
                            }
                            disabled={isSubmitting}
                            style={{ width: "60px", height: "40px" }}
                          />
                          <input
                            type="text"
                            className="form-control"
                            value={tempInputs.color_secondary}
                            onChange={(e) =>
                              setTempInputs((prev) => ({
                                ...prev,
                                color_secondary: e.target.value,
                              }))
                            }
                            placeholder="e.g., #8B9D77"
                            disabled={isSubmitting}
                            style={{ maxWidth: "150px" }}
                          />
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() =>
                            addToArray("color_secondary", tempInputs.color_secondary)
                          }
                          disabled={isSubmitting}
                        >
                          <Icon icon="solar:add-circle-bold" width="16" height="16" className="me-1" />
                          Add
                        </button>
                      </div>
                      {formData.color_secondary.length > 0 && (
                        <div className="border rounded p-2" style={{ backgroundColor: "#f8f9fa" }}>
                          <small className="text-muted d-block mb-2">
                            {formData.color_secondary.length} color{formData.color_secondary.length !== 1 ? 's' : ''} added
                          </small>
                          <div className="d-flex flex-wrap gap-2">
                            {formData.color_secondary.map((color, index) => (
                              <div
                                key={index}
                                className="d-flex align-items-center gap-2 bg-white border rounded p-2"
                                style={{ minWidth: "fit-content" }}
                              >
                                <div
                                  style={{
                                    width: "24px",
                                    height: "24px",
                                    backgroundColor: color,
                                    border: "2px solid #dee2e6",
                                    borderRadius: "4px",
                                  }}
                                  title={color}
                                />
                                <small className="text-monospace" style={{ fontSize: "11px" }}>{color}</small>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-link text-danger p-0"
                                  onClick={() => removeFromArray("color_secondary", index)}
                                  disabled={isSubmitting}
                                  title="Remove color"
                                  style={{ lineHeight: 1 }}
                                >
                                  <Icon icon="solar:trash-bin-2-bold" width="14" height="14" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Typography */}
                  <div className="mb-4">
                    <h6 className="fw-semibold mb-3">Typography</h6>

                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label fw-semibold">Primary Font</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.typography_primary}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              typography_primary: e.target.value,
                            }))
                          }
                          placeholder="e.g., Crimson Pro"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label fw-semibold">Secondary Font</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.typography_secondary}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              typography_secondary: e.target.value,
                            }))
                          }
                          placeholder="e.g., Inter"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tone Guide */}
                  <div className="mb-4">
                    <h6 className="fw-semibold mb-3">Tone Guide</h6>

                    <div className="mb-3">
                      <label className="form-label fw-semibold">Dos</label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          value={tempInputs.tone_dos}
                          onChange={(e) =>
                            setTempInputs((prev) => ({ ...prev, tone_dos: e.target.value }))
                          }
                          placeholder="e.g., Speak to the biology"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addToArray("tone_dos", tempInputs.tone_dos);
                            }
                          }}
                          disabled={isSubmitting}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => addToArray("tone_dos", tempInputs.tone_dos)}
                          disabled={isSubmitting}
                        >
                          <Icon icon="solar:add-circle-bold" width="16" height="16" />
                        </button>
                      </div>
                      <div className="d-flex flex-wrap gap-2 mt-2">
                        {formData.tone_dos.map((item, index) => (
                          <span
                            key={index}
                            className="badge bg-success d-flex align-items-center gap-1"
                          >
                            {item}
                            <button
                              type="button"
                              className="btn-close btn-close-white"
                              style={{ fontSize: "10px" }}
                              onClick={() => removeFromArray("tone_dos", index)}
                              disabled={isSubmitting}
                            />
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold">Don'ts</label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          value={tempInputs.tone_donts}
                          onChange={(e) =>
                            setTempInputs((prev) => ({
                              ...prev,
                              tone_donts: e.target.value,
                            }))
                          }
                          placeholder="e.g., Medical jargon"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addToArray("tone_donts", tempInputs.tone_donts);
                            }
                          }}
                          disabled={isSubmitting}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => addToArray("tone_donts", tempInputs.tone_donts)}
                          disabled={isSubmitting}
                        >
                          <Icon icon="solar:add-circle-bold" width="16" height="16" />
                        </button>
                      </div>
                      <div className="d-flex flex-wrap gap-2 mt-2">
                        {formData.tone_donts.map((item, index) => (
                          <span
                            key={index}
                            className="badge bg-danger d-flex align-items-center gap-1"
                          >
                            {item}
                            <button
                              type="button"
                              className="btn-close btn-close-white"
                              style={{ fontSize: "10px" }}
                              onClick={() => removeFromArray("tone_donts", index)}
                              disabled={isSubmitting}
                            />
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Brand Vocabulary */}
                  <div className="mb-4">
                    <h6 className="fw-semibold mb-3">Brand Vocabulary</h6>

                    <div className="mb-3">
                      <label className="form-label fw-semibold">Preferred Terms</label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          value={tempInputs.preferred_terms}
                          onChange={(e) =>
                            setTempInputs((prev) => ({
                              ...prev,
                              preferred_terms: e.target.value,
                            }))
                          }
                          placeholder="e.g., microbiome-safe"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addToArray("preferred_terms", tempInputs.preferred_terms);
                            }
                          }}
                          disabled={isSubmitting}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() =>
                            addToArray("preferred_terms", tempInputs.preferred_terms)
                          }
                          disabled={isSubmitting}
                        >
                          <Icon icon="solar:add-circle-bold" width="16" height="16" />
                        </button>
                      </div>
                      <div className="d-flex flex-wrap gap-2 mt-2">
                        {formData.preferred_terms.map((item, index) => (
                          <span
                            key={index}
                            className="badge bg-success d-flex align-items-center gap-1"
                          >
                            {item}
                            <button
                              type="button"
                              className="btn-close btn-close-white"
                              style={{ fontSize: "10px" }}
                              onClick={() => removeFromArray("preferred_terms", index)}
                              disabled={isSubmitting}
                            />
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold">Terms to Avoid</label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          value={tempInputs.avoid_terms}
                          onChange={(e) =>
                            setTempInputs((prev) => ({
                              ...prev,
                              avoid_terms: e.target.value,
                            }))
                          }
                          placeholder="e.g., cure, treat, medicine"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addToArray("avoid_terms", tempInputs.avoid_terms);
                            }
                          }}
                          disabled={isSubmitting}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => addToArray("avoid_terms", tempInputs.avoid_terms)}
                          disabled={isSubmitting}
                        >
                          <Icon icon="solar:add-circle-bold" width="16" height="16" />
                        </button>
                      </div>
                      <div className="d-flex flex-wrap gap-2 mt-2">
                        {formData.avoid_terms.map((item, index) => (
                          <span
                            key={index}
                            className="badge bg-danger d-flex align-items-center gap-1"
                          >
                            {item}
                            <button
                              type="button"
                              className="btn-close btn-close-white"
                              style={{ fontSize: "10px" }}
                              onClick={() => removeFromArray("avoid_terms", index)}
                              disabled={isSubmitting}
                            />
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Core Products */}
                  <div className="mb-4">
                    <h6 className="fw-semibold mb-3">Core Products</h6>

                    <div className="mb-3">
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          value={tempInputs.core_products}
                          onChange={(e) =>
                            setTempInputs((prev) => ({
                              ...prev,
                              core_products: e.target.value,
                            }))
                          }
                          placeholder="e.g., Skin Microbiome Shampoo"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addToArray("core_products", tempInputs.core_products);
                            }
                          }}
                          disabled={isSubmitting}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() =>
                            addToArray("core_products", tempInputs.core_products)
                          }
                          disabled={isSubmitting}
                        >
                          <Icon icon="solar:add-circle-bold" width="16" height="16" />
                        </button>
                      </div>
                      <div className="d-flex flex-wrap gap-2 mt-2">
                        {formData.core_products.map((item, index) => (
                          <span
                            key={index}
                            className="badge bg-primary d-flex align-items-center gap-1"
                          >
                            {item}
                            <button
                              type="button"
                              className="btn-close btn-close-white"
                              style={{ fontSize: "10px" }}
                              onClick={() => removeFromArray("core_products", index)}
                              disabled={isSubmitting}
                            />
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Competitors */}
                  <div className="mb-4">
                    <h6 className="fw-semibold mb-3">Competitors</h6>

                    <div className="mb-3">
                      <div className="row">
                        <div className="col-md-5 mb-2">
                          <input
                            type="text"
                            className="form-control"
                            value={tempInputs.competitor_name}
                            onChange={(e) =>
                              setTempInputs((prev) => ({
                                ...prev,
                                competitor_name: e.target.value,
                              }))
                            }
                            placeholder="Competitor name"
                            disabled={isSubmitting}
                          />
                        </div>
                        <div className="col-md-5 mb-2">
                          <input
                            type="text"
                            className="form-control"
                            value={tempInputs.competitor_positioning}
                            onChange={(e) =>
                              setTempInputs((prev) => ({
                                ...prev,
                                competitor_positioning: e.target.value,
                              }))
                            }
                            placeholder="Positioning"
                            disabled={isSubmitting}
                          />
                        </div>
                        <div className="col-md-2 mb-2">
                          <button
                            type="button"
                            className="btn btn-outline-secondary w-100"
                            onClick={addCompetitor}
                            disabled={isSubmitting}
                          >
                            <Icon icon="solar:add-circle-bold" width="16" height="16" />
                          </button>
                        </div>
                      </div>
                      {formData.competitors.length > 0 && (
                        <div className="border rounded p-2 mt-2">
                          {formData.competitors.map((comp, index) => (
                            <div
                              key={index}
                              className="d-flex justify-content-between align-items-center mb-1"
                            >
                              <div>
                                <strong>{comp.name}</strong>
                                {comp.positioning && (
                                  <span className="text-muted small d-block">
                                    {comp.positioning}
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => removeCompetitor(index)}
                                disabled={isSubmitting}
                              >
                                <Icon icon="solar:trash-bin-2-bold" width="14" height="14" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </form>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                  />
                  {isEditMode ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>{isEditMode ? "Update Brandkit" : "Create Brandkit"}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandkitFormModal;

