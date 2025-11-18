"use client";
import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import * as brandkitApi from "@/services/contentGenerationApi";
import ICPConfiguration from "./ICPConfiguration/ICPConfiguration";

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
    color_primary: [],
    color_secondary: [],
    color_accent: [],
    typography_primary: "",
    typography_secondary: "",
    tone_dos: [],
    tone_donts: [],
    preferred_terms: [],
    avoid_terms: [],
    core_products: [],
    competitors: [],
    icp: null,
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
    color_primary: "#2C5F4F",
    color_secondary: "#8B9D77",
    color_accent: "#D4A574",
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
        color_primary: ensureStringArray(editBrandkit.color_primary || (colorPalette[0] ? [colorPalette[0]] : [])),
        color_secondary: ensureStringArray(editBrandkit.color_secondary || colorPalette.slice(1, -1)),
        color_accent: ensureStringArray(editBrandkit.color_accent || (colorPalette[colorPalette.length - 1] ? [colorPalette[colorPalette.length - 1]] : [])),
        typography_primary: editBrandkit.typography?.primary || "",
        typography_secondary: editBrandkit.typography?.secondary || "",
        tone_dos: ensureStringArray(editBrandkit.style_guide?.dos),
        tone_donts: ensureStringArray(editBrandkit.style_guide?.donts),
        preferred_terms: ensureStringArray(editBrandkit.keywords?.hero_words || editBrandkit.brand_vocabulary?.hero_words),
        avoid_terms: ensureStringArray(editBrandkit.keywords?.words_to_avoid || editBrandkit.brand_vocabulary?.words_to_avoid),
        core_products: ensureStringArray(editBrandkit.keywords?.product_categories || editBrandkit.brand_vocabulary?.product_categories),
        competitors: ensureCompetitorArray(editBrandkit.competitors),
        icp: editBrandkit.icp || null,
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
        color_primary: [],
        color_secondary: [],
        color_accent: [],
        typography_primary: "",
        typography_secondary: "",
        tone_dos: [],
        tone_donts: [],
        preferred_terms: [],
        avoid_terms: [],
        core_products: [],
        competitors: [],
        icp: null,
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

  // Handle ICP change
  const handleICPChange = (icp) => {
    setFormData((prev) => ({
      ...prev,
      icp: icp,
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

    // Validate ICP if enabled and type is specific
    if (formData.icp?.enabled && formData.icp?.type === "specific") {
      const persona = formData.icp.persona;
      if (!persona) {
        newErrors.icp = "Persona details are required for specific ICP type";
      } else {
        if (!persona.name?.trim()) {
          newErrors.icp_persona_name = "Persona name is required";
        }
        if (!persona.title?.trim()) {
          newErrors.icp_persona_title = "Persona title is required";
        }
        if (!persona.age_range?.trim()) {
          newErrors.icp_persona_age_range = "Age range is required";
        }
        if (!persona.gender?.trim()) {
          newErrors.icp_persona_gender = "Gender is required";
        }
        if (!persona.location?.trim()) {
          newErrors.icp_persona_location = "Location is required";
        }
      }
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
          ...(Array.isArray(formData.color_primary)
            ? formData.color_primary.filter(item => typeof item === 'string' && item.trim())
            : []),
          ...(Array.isArray(formData.color_secondary)
            ? formData.color_secondary.filter(item => typeof item === 'string' && item.trim())
            : []),
          ...(Array.isArray(formData.color_accent)
            ? formData.color_accent.filter(item => typeof item === 'string' && item.trim())
            : []),
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
        icp: formData.icp || undefined,
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
          <div className="modal-header" style={{ padding: "15px", borderBottom: "1px solid #e9ecef" }}>
            <h6 className="modal-title" style={{ fontSize: "0.875rem", fontWeight: "600", margin: 0 }}>
              {isEditMode ? "Edit Brandkit" : "Create New Brandkit"}
            </h6>
            <button
              type="button"
              className="btn-close btn-close-sm"
              onClick={onClose}
              disabled={isSubmitting}
              style={{ fontSize: "0.75rem" }}
            />
          </div>
          <div className="modal-body" style={{ padding: "15px", overflowX: "hidden" }}>
            <style>{`
              .modal-body input::placeholder,
              .modal-body textarea::placeholder {
                font-size: 0.75rem !important;
                opacity: 0.7;
              }
            `}</style>
            <form onSubmit={handleSubmit}>
              {/* Required Section */}
              <div className="mb-3">
                <div className="mb-2" style={{ fontSize: "0.875rem", fontWeight: "600", color: "#212529" }}>
                  Basic Information
                </div>

                {/* Brand Name */}
                <div className="mb-2">
                  <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "500", marginBottom: "4px" }}>
                    Brand Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.brand_name ? "is-invalid" : ""}`}
                    value={formData.brand_name}
                    onChange={(e) => handleBrandNameChange(e.target.value)}
                    placeholder="Tilting Heads, Glow Naturals"
                    disabled={isSubmitting}
                    style={{ 
                      fontSize: "0.8125rem", 
                      padding: "6px 12px"
                    }}
                  />
                  {errors.brand_name && (
                    <div className="invalid-feedback" style={{ fontSize: "0.6875rem" }}>{errors.brand_name}</div>
                  )}
                </div>

                {/* Brand ID */}
                <div className="mb-2">
                  <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "500", marginBottom: "4px" }}>
                    Brand ID <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.brand_id ? "is-invalid" : ""}`}
                    value={formData.brand_id}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, brand_id: e.target.value }))
                    }
                    placeholder="tilting_heads, glow_naturals"
                    disabled={isEditMode || isSubmitting}
                    readOnly={isEditMode}
                    style={{ fontSize: "0.8125rem", padding: "6px 12px" }}
                  />
                  {errors.brand_id && (
                    <div className="invalid-feedback" style={{ fontSize: "0.6875rem" }}>{errors.brand_id}</div>
                  )}
                  <small className="text-muted" style={{ fontSize: "0.6875rem", display: "block", marginTop: "4px" }}>
                    Lowercase letters, numbers, underscores, and hyphens only
                    {isEditMode && " (Cannot be changed)"}
                  </small>
                </div>

                {/* Tagline */}
                <div className="mb-2">
                  <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "500", marginBottom: "4px" }}>
                    Tagline
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.tagline}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, tagline: e.target.value }))
                    }
                    placeholder="Where Wild Wisdom Meets Modern Care"
                    disabled={isSubmitting}
                    style={{ fontSize: "0.8125rem", padding: "6px 12px" }}
                  />
                </div>
              </div>

              {/* Brand Voice */}
              <div className="mb-3">
                <div className="mb-2" style={{ fontSize: "0.875rem", fontWeight: "600", color: "#212529" }}>
                  Brand Voice
                </div>

                <div className="mb-2">
                  <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "500", marginBottom: "4px" }}>
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
                    placeholder="Calm, Emotional, Poetic"
                    disabled={isSubmitting}
                    style={{ fontSize: "0.8125rem", padding: "6px 12px" }}
                  />
                  {errors.brand_voice_primary && (
                    <div className="invalid-feedback" style={{ fontSize: "0.6875rem" }}>{errors.brand_voice_primary}</div>
                  )}
                </div>

                <div className="mb-2">
                  <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "500", marginBottom: "4px" }}>
                    Secondary Voices
                  </label>
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
                      placeholder="Assertive"
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
                      style={{ fontSize: "0.8125rem", padding: "6px 12px" }}
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
                      style={{ padding: "6px 10px", fontSize: "0.75rem" }}
                    >
                      <Icon icon="solar:add-circle-bold" width="14" height="14" />
                    </button>
                  </div>
                  <div className="d-flex flex-wrap gap-1 mt-1">
                    {formData.brand_voice_secondary.map((item, index) => (
                      <span key={index} className="badge bg-secondary d-flex align-items-center gap-1" style={{ fontSize: "0.6875rem", padding: "2px 6px" }}>
                        {item}
                        <button
                          type="button"
                          className="btn-close btn-close-white"
                          style={{ fontSize: "8px", width: "8px", height: "8px" }}
                          onClick={() => removeFromArray("brand_voice_secondary", index)}
                          disabled={isSubmitting}
                        />
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mb-2">
                  <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "500", marginBottom: "4px" }}>
                    Voices to Avoid
                  </label>
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
                      placeholder="Aggressive"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addToArray("brand_voice_avoid", tempInputs.brand_voice_avoid);
                        }
                      }}
                      disabled={isSubmitting}
                      style={{ fontSize: "0.8125rem", padding: "6px 12px" }}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() =>
                        addToArray("brand_voice_avoid", tempInputs.brand_voice_avoid)
                      }
                      disabled={isSubmitting}
                      style={{ padding: "6px 10px", fontSize: "0.75rem" }}
                    >
                      <Icon icon="solar:add-circle-bold" width="14" height="14" />
                    </button>
                  </div>
                  <div className="d-flex flex-wrap gap-1 mt-1">
                    {formData.brand_voice_avoid.map((item, index) => (
                      <span key={index} className="badge bg-warning d-flex align-items-center gap-1" style={{ fontSize: "0.6875rem", padding: "2px 6px" }}>
                        {item}
                        <button
                          type="button"
                          className="btn-close"
                          style={{ fontSize: "8px", width: "8px", height: "8px" }}
                          onClick={() => removeFromArray("brand_voice_avoid", index)}
                          disabled={isSubmitting}
                        />
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Brand Essence */}
              <div className="mb-3">
                <div className="mb-2" style={{ fontSize: "0.875rem", fontWeight: "600", color: "#212529" }}>
                  Brand Essence
                </div>

                <div className="mb-2">
                  <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "500", marginBottom: "4px" }}>
                    Core Message <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className={`form-control ${errors.core_message ? "is-invalid" : ""}`}
                    rows="3"
                    value={formData.core_message}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, core_message: e.target.value }))
                    }
                    placeholder="Return to natural, biologically respectful pet care"
                    disabled={isSubmitting}
                    style={{ fontSize: "0.8125rem", padding: "6px 12px" }}
                  />
                  {errors.core_message && (
                    <div className="invalid-feedback" style={{ fontSize: "0.6875rem" }}>{errors.core_message}</div>
                  )}
                </div>

                <div className="mb-2">
                  <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "500", marginBottom: "4px" }}>
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
                      placeholder="Speed, Relief, Safety"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addToArray("key_pillars", tempInputs.key_pillars);
                        }
                      }}
                      disabled={isSubmitting}
                      style={{ fontSize: "0.8125rem", padding: "6px 12px" }}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => addToArray("key_pillars", tempInputs.key_pillars)}
                      disabled={isSubmitting}
                      style={{ padding: "6px 10px", fontSize: "0.75rem" }}
                    >
                      <Icon icon="solar:add-circle-bold" width="14" height="14" />
                    </button>
                  </div>
                  {errors.key_pillars && (
                    <div className="text-danger" style={{ fontSize: "0.6875rem", marginTop: "4px" }}>{errors.key_pillars}</div>
                  )}
                  <div className="d-flex flex-wrap gap-1 mt-1">
                    {formData.key_pillars.map((item, index) => (
                      <span key={index} className="badge bg-primary d-flex align-items-center gap-1" style={{ fontSize: "0.6875rem", padding: "2px 6px" }}>
                        {item}
                        <button
                          type="button"
                          className="btn-close btn-close-white"
                          style={{ fontSize: "8px", width: "8px", height: "8px" }}
                          onClick={() => removeFromArray("key_pillars", index)}
                          disabled={isSubmitting}
                        />
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mb-2">
                  <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "500", marginBottom: "4px" }}>
                    Emotional Territory
                  </label>
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
                    placeholder="Calm assurance, biological respect, natural wisdom"
                    disabled={isSubmitting}
                    style={{ fontSize: "0.8125rem", padding: "6px 12px" }}
                  />
                </div>
              </div>

              {/* Target Audience */}
              <div className="mb-3">
                <div className="mb-2" style={{ fontSize: "0.875rem", fontWeight: "600", color: "#212529" }}>
                  Target Audience
                </div>

                <div className="mb-2">
                  <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "500", marginBottom: "4px" }}>
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
                    placeholder="Urban pet parents (25-40)"
                    disabled={isSubmitting}
                    style={{ fontSize: "0.8125rem", padding: "6px 12px" }}
                  />
                  {errors.target_audience_primary && (
                    <div className="invalid-feedback" style={{ fontSize: "0.6875rem" }}>
                      {errors.target_audience_primary}
                    </div>
                  )}
                </div>

                <div className="mb-2">
                  <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "500", marginBottom: "4px" }}>
                    Psychographics
                  </label>
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
                      placeholder="Research-heavy, Health-conscious"
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
                      style={{ fontSize: "0.8125rem", padding: "6px 12px" }}
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
                      style={{ padding: "6px 10px", fontSize: "0.75rem" }}
                    >
                      <Icon icon="solar:add-circle-bold" width="14" height="14" />
                    </button>
                  </div>
                  <div className="d-flex flex-wrap gap-1 mt-1">
                    {formData.target_audience_psychographics.map((item, index) => (
                      <span key={index} className="badge bg-info d-flex align-items-center gap-1" style={{ fontSize: "0.6875rem", padding: "2px 6px" }}>
                        {item}
                        <button
                          type="button"
                          className="btn-close"
                          style={{ fontSize: "8px", width: "8px", height: "8px" }}
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

              {/* ICP Configuration */}
              <div className="mb-3">
                <ICPConfiguration
                  icp={formData.icp}
                  onChange={handleICPChange}
                  disabled={isSubmitting}
                  errors={errors}
                />
              </div>
              {errors.icp && (
                <div className="text-danger mb-2" style={{ fontSize: "0.75rem" }}>
                  {errors.icp}
                </div>
              )}

              {/* Advanced Settings Accordion */}
              <div className="mb-3">
                <button
                  type="button"
                  className="btn btn-link p-0 text-decoration-none d-flex align-items-center gap-2"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  style={{ fontSize: "0.8125rem", color: "#212529" }}
                >
                  <Icon
                    icon={
                      showAdvanced
                        ? "solar:alt-arrow-down-bold"
                        : "solar:alt-arrow-right-bold"
                    }
                    width="14"
                    height="14"
                  />
                  <span style={{ fontSize: "0.8125rem", fontWeight: "500" }}>Advanced Settings (Optional)</span>
                </button>
              </div>

              {showAdvanced && (
                <>
                  {/* Color Palette - Paletton Inspired */}
                  <div className="mb-3">
                    <div className="mb-3" style={{ fontSize: "0.875rem", fontWeight: "600", color: "#212529" }}>
                      Color Palette
                    </div>

                    {/* My Palette Strip - Inspired by Paletton */}
                    <div
                      style={{
                        backgroundColor: "#f8f9fa",
                        border: "1px solid #e9ecef",
                        borderRadius: "8px",
                        padding: "14px",
                        marginBottom: "16px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: "600",
                          color: "#495057",
                          marginBottom: "12px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <Icon icon="solar:palette-bold" width="14" height="14" />
                        My Palette:
                      </div>
                      <div className="d-flex flex-wrap gap-2 align-items-center">
                        {/* Primary Colors */}
                        {formData.color_primary.map((color, index) => (
                          <div
                            key={`primary-${index}`}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <div
                              style={{
                                width: "52px",
                                height: "52px",
                                backgroundColor: color,
                                border: "3px solid #fff",
                                borderRadius: "8px",
                                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                position: "relative",
                              }}
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const input = document.createElement("input");
                                input.type = "color";
                                input.value = color;
                                input.style.position = "fixed";
                                input.style.left = (rect.left + rect.width / 2) + "px";
                                input.style.top = (rect.top + rect.height / 2) + "px";
                                input.style.width = "1px";
                                input.style.height = "1px";
                                input.style.opacity = "0";
                                input.style.pointerEvents = "none";
                                input.style.zIndex = "10000";
                                document.body.appendChild(input);
                                input.onchange = (ev) => {
                                  const newColors = [...formData.color_primary];
                                  newColors[index] = ev.target.value;
                                  setFormData((prev) => ({
                                    ...prev,
                                    color_primary: newColors,
                                  }));
                                  if (document.body.contains(input)) {
                                    document.body.removeChild(input);
                                  }
                                };
                                input.onblur = () => {
                                  if (document.body.contains(input)) {
                                    document.body.removeChild(input);
                                  }
                                };
                                setTimeout(() => {
                                  input.focus();
                                  input.click();
                                }, 10);
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "scale(1.08)";
                                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.25)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "scale(1)";
                                e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.15)";
                              }}
                              title={`Primary ${index + 1} - Click to change`}
                            />
                            <span
                              style={{
                                fontSize: "0.6875rem",
                                fontWeight: "600",
                                color: "#495057",
                              }}
                            >
                              Primary {index + 1}
                            </span>
                            <span
                              style={{
                                fontSize: "0.625rem",
                                fontFamily: "monospace",
                                color: "#6c757d",
                              }}
                            >
                              {color.toUpperCase()}
                            </span>
                          </div>
                        ))}

                        {/* Secondary Colors */}
                        {formData.color_secondary.map((color, index) => (
                          <div
                            key={`secondary-${index}`}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <div
                              style={{
                                width: "52px",
                                height: "52px",
                                backgroundColor: color,
                                border: "3px solid #fff",
                                borderRadius: "8px",
                                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                              }}
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const input = document.createElement("input");
                                input.type = "color";
                                input.value = color;
                                input.style.position = "fixed";
                                input.style.left = (rect.left + rect.width / 2) + "px";
                                input.style.top = (rect.top + rect.height / 2) + "px";
                                input.style.width = "1px";
                                input.style.height = "1px";
                                input.style.opacity = "0";
                                input.style.pointerEvents = "none";
                                input.style.zIndex = "10000";
                                document.body.appendChild(input);
                                input.onchange = (ev) => {
                                  const newColors = [...formData.color_secondary];
                                  newColors[index] = ev.target.value;
                                  setFormData((prev) => ({
                                    ...prev,
                                    color_secondary: newColors,
                                  }));
                                  if (document.body.contains(input)) {
                                    document.body.removeChild(input);
                                  }
                                };
                                input.onblur = () => {
                                  if (document.body.contains(input)) {
                                    document.body.removeChild(input);
                                  }
                                };
                                setTimeout(() => {
                                  input.focus();
                                  input.click();
                                }, 10);
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "scale(1.08)";
                                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.25)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "scale(1)";
                                e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.15)";
                              }}
                              title={`Secondary ${index + 1} - Click to change`}
                            />
                            <span
                              style={{
                                fontSize: "0.6875rem",
                                fontWeight: "600",
                                color: "#495057",
                              }}
                            >
                              Secondary {index + 1}
                            </span>
                            <span
                              style={{
                                fontSize: "0.625rem",
                                fontFamily: "monospace",
                                color: "#6c757d",
                              }}
                            >
                              {color.toUpperCase()}
                            </span>
                          </div>
                        ))}

                        {/* Accent Colors */}
                        {formData.color_accent.map((color, index) => (
                          <div
                            key={`accent-${index}`}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <div
                              style={{
                                width: "52px",
                                height: "52px",
                                backgroundColor: color,
                                border: "3px solid #fff",
                                borderRadius: "8px",
                                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                              }}
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const input = document.createElement("input");
                                input.type = "color";
                                input.value = color;
                                input.style.position = "fixed";
                                input.style.left = (rect.left + rect.width / 2) + "px";
                                input.style.top = (rect.top + rect.height / 2) + "px";
                                input.style.width = "1px";
                                input.style.height = "1px";
                                input.style.opacity = "0";
                                input.style.pointerEvents = "none";
                                input.style.zIndex = "10000";
                                document.body.appendChild(input);
                                input.onchange = (ev) => {
                                  const newColors = [...formData.color_accent];
                                  newColors[index] = ev.target.value;
                                  setFormData((prev) => ({
                                    ...prev,
                                    color_accent: newColors,
                                  }));
                                  if (document.body.contains(input)) {
                                    document.body.removeChild(input);
                                  }
                                };
                                input.onblur = () => {
                                  if (document.body.contains(input)) {
                                    document.body.removeChild(input);
                                  }
                                };
                                setTimeout(() => {
                                  input.focus();
                                  input.click();
                                }, 10);
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "scale(1.08)";
                                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.25)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "scale(1)";
                                e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.15)";
                              }}
                              title={`Accent ${index + 1} - Click to change`}
                            />
                            <span
                              style={{
                                fontSize: "0.6875rem",
                                fontWeight: "600",
                                color: "#495057",
                              }}
                            >
                              Accent {index + 1}
                            </span>
                            <span
                              style={{
                                fontSize: "0.625rem",
                                fontFamily: "monospace",
                                color: "#6c757d",
                              }}
                            >
                              {color.toUpperCase()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Add Colors Section */}
                    <div className="row g-2">
                      {/* Add Primary Color */}
                      <div className="col-md-4">
                        <div
                          style={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #e9ecef",
                            borderRadius: "8px",
                            padding: "12px",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                          }}
                        >
                          <label
                            className="form-label d-block mb-2"
                            style={{ fontSize: "0.75rem", fontWeight: "600", color: "#495057" }}
                          >
                            Add Primary Color
                          </label>
                          <div className="d-flex gap-2 align-items-center">
                            <div
                              style={{
                                width: "44px",
                                height: "44px",
                                border: "2px solid #e9ecef",
                                borderRadius: "8px",
                                overflow: "hidden",
                                flexShrink: 0,
                              }}
                            >
                              <input
                                type="color"
                                value={tempInputs.color_primary}
                                onChange={(e) =>
                                  setTempInputs((prev) => ({
                                    ...prev,
                                    color_primary: e.target.value,
                                  }))
                                }
                                disabled={isSubmitting}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  border: "none",
                                  cursor: "pointer",
                                  padding: 0,
                                }}
                              />
                            </div>
                            <input
                              type="text"
                              className="form-control"
                              value={tempInputs.color_primary}
                              onChange={(e) =>
                                setTempInputs((prev) => ({
                                  ...prev,
                                  color_primary: e.target.value,
                                }))
                              }
                              placeholder="#2C5F4F"
                              disabled={isSubmitting}
                              style={{
                                flex: 1,
                                fontSize: "0.8125rem",
                                padding: "6px 10px",
                                border: "1px solid #dee2e6",
                                borderRadius: "6px",
                              }}
                              onKeyPress={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addToArray("color_primary", tempInputs.color_primary);
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => addToArray("color_primary", tempInputs.color_primary)}
                              disabled={isSubmitting}
                              style={{
                                width: "44px",
                                height: "44px",
                                padding: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.75rem",
                                fontWeight: "500",
                                backgroundColor: "#0d6efd",
                                color: "#fff",
                                border: "none",
                                borderRadius: "8px",
                                cursor: isSubmitting ? "not-allowed" : "pointer",
                                transition: "all 0.2s ease",
                                flexShrink: 0,
                                opacity: isSubmitting ? 0.6 : 1,
                              }}
                              onMouseEnter={(e) => {
                                if (!isSubmitting) {
                                  e.currentTarget.style.backgroundColor = "#0b5ed7";
                                  e.currentTarget.style.transform = "scale(1.05)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "#0d6efd";
                                e.currentTarget.style.transform = "scale(1)";
                              }}
                            >
                              <Icon icon="solar:add-circle-bold" width="18" height="18" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Add Secondary Color */}
                      <div className="col-md-4">
                        <div
                          style={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #e9ecef",
                            borderRadius: "8px",
                            padding: "12px",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                          }}
                        >
                          <label
                            className="form-label d-block mb-2"
                            style={{ fontSize: "0.75rem", fontWeight: "600", color: "#495057" }}
                          >
                            Add Secondary Color
                          </label>
                          <div className="d-flex gap-2 align-items-center">
                            <div
                              style={{
                                width: "44px",
                                height: "44px",
                                border: "2px solid #e9ecef",
                                borderRadius: "8px",
                                overflow: "hidden",
                                flexShrink: 0,
                              }}
                            >
                              <input
                                type="color"
                                value={tempInputs.color_secondary}
                                onChange={(e) =>
                                  setTempInputs((prev) => ({
                                    ...prev,
                                    color_secondary: e.target.value,
                                  }))
                                }
                                disabled={isSubmitting}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  border: "none",
                                  cursor: "pointer",
                                  padding: 0,
                                }}
                              />
                            </div>
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
                              placeholder="#8B9D77"
                              disabled={isSubmitting}
                              style={{
                                flex: 1,
                                fontSize: "0.8125rem",
                                padding: "6px 10px",
                                border: "1px solid #dee2e6",
                                borderRadius: "6px",
                              }}
                              onKeyPress={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addToArray("color_secondary", tempInputs.color_secondary);
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => addToArray("color_secondary", tempInputs.color_secondary)}
                              disabled={isSubmitting}
                              style={{
                                width: "44px",
                                height: "44px",
                                padding: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.75rem",
                                fontWeight: "500",
                                backgroundColor: "#0d6efd",
                                color: "#fff",
                                border: "none",
                                borderRadius: "8px",
                                cursor: isSubmitting ? "not-allowed" : "pointer",
                                transition: "all 0.2s ease",
                                flexShrink: 0,
                                opacity: isSubmitting ? 0.6 : 1,
                              }}
                              onMouseEnter={(e) => {
                                if (!isSubmitting) {
                                  e.currentTarget.style.backgroundColor = "#0b5ed7";
                                  e.currentTarget.style.transform = "scale(1.05)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "#0d6efd";
                                e.currentTarget.style.transform = "scale(1)";
                              }}
                            >
                              <Icon icon="solar:add-circle-bold" width="18" height="18" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Add Accent Color */}
                      <div className="col-md-4">
                        <div
                          style={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #e9ecef",
                            borderRadius: "8px",
                            padding: "12px",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                          }}
                        >
                          <label
                            className="form-label d-block mb-2"
                            style={{ fontSize: "0.75rem", fontWeight: "600", color: "#495057" }}
                          >
                            Add Accent Color
                          </label>
                          <div className="d-flex gap-2 align-items-center">
                            <div
                              style={{
                                width: "44px",
                                height: "44px",
                                border: "2px solid #e9ecef",
                                borderRadius: "8px",
                                overflow: "hidden",
                                flexShrink: 0,
                              }}
                            >
                              <input
                                type="color"
                                value={tempInputs.color_accent}
                                onChange={(e) =>
                                  setTempInputs((prev) => ({
                                    ...prev,
                                    color_accent: e.target.value,
                                  }))
                                }
                                disabled={isSubmitting}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  border: "none",
                                  cursor: "pointer",
                                  padding: 0,
                                }}
                              />
                            </div>
                            <input
                              type="text"
                              className="form-control"
                              value={tempInputs.color_accent}
                              onChange={(e) =>
                                setTempInputs((prev) => ({
                                  ...prev,
                                  color_accent: e.target.value,
                                }))
                              }
                              placeholder="#D4A574"
                              disabled={isSubmitting}
                              style={{
                                flex: 1,
                                fontSize: "0.8125rem",
                                padding: "6px 10px",
                                border: "1px solid #dee2e6",
                                borderRadius: "6px",
                              }}
                              onKeyPress={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addToArray("color_accent", tempInputs.color_accent);
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => addToArray("color_accent", tempInputs.color_accent)}
                              disabled={isSubmitting}
                              style={{
                                width: "44px",
                                height: "44px",
                                padding: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.75rem",
                                fontWeight: "500",
                                backgroundColor: "#0d6efd",
                                color: "#fff",
                                border: "none",
                                borderRadius: "8px",
                                cursor: isSubmitting ? "not-allowed" : "pointer",
                                transition: "all 0.2s ease",
                                flexShrink: 0,
                                opacity: isSubmitting ? 0.6 : 1,
                              }}
                              onMouseEnter={(e) => {
                                if (!isSubmitting) {
                                  e.currentTarget.style.backgroundColor = "#0b5ed7";
                                  e.currentTarget.style.transform = "scale(1.05)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "#0d6efd";
                                e.currentTarget.style.transform = "scale(1)";
                              }}
                            >
                              <Icon icon="solar:add-circle-bold" width="18" height="18" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Color Lists with Delete Options */}
                    {(formData.color_primary.length > 0 || formData.color_secondary.length > 0 || formData.color_accent.length > 0) && (
                      <div
                        style={{
                          marginTop: "16px",
                          backgroundColor: "#f8f9fa",
                          border: "1px solid #e9ecef",
                          borderRadius: "8px",
                          padding: "14px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: "600",
                            color: "#495057",
                            marginBottom: "12px",
                            paddingBottom: "8px",
                            borderBottom: "1px solid #dee2e6",
                          }}
                        >
                          Manage Colors
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                          {formData.color_primary.map((color, index) => (
                            <div
                              key={`manage-primary-${index}`}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                backgroundColor: "#ffffff",
                                border: "1px solid #dee2e6",
                                borderRadius: "6px",
                                padding: "8px 10px",
                              }}
                            >
                              <div
                                style={{
                                  width: "24px",
                                  height: "24px",
                                  backgroundColor: color,
                                  border: "2px solid #e9ecef",
                                  borderRadius: "4px",
                                }}
                              />
                              <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "#495057" }}>
                                Primary {index + 1}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.6875rem",
                                  fontFamily: "monospace",
                                  color: "#6c757d",
                                }}
                              >
                                {color.toUpperCase()}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeFromArray("color_primary", index)}
                                disabled={isSubmitting}
                                style={{
                                  padding: "2px 4px",
                                  backgroundColor: "transparent",
                                  border: "none",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  color: "#dc3545",
                                  marginLeft: "4px",
                                }}
                                title="Remove"
                              >
                                <Icon icon="solar:trash-bin-2-bold" width="12" height="12" />
                              </button>
                            </div>
                          ))}
                          {formData.color_secondary.map((color, index) => (
                            <div
                              key={`manage-secondary-${index}`}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                backgroundColor: "#ffffff",
                                border: "1px solid #dee2e6",
                                borderRadius: "6px",
                                padding: "8px 10px",
                              }}
                            >
                              <div
                                style={{
                                  width: "24px",
                                  height: "24px",
                                  backgroundColor: color,
                                  border: "2px solid #e9ecef",
                                  borderRadius: "4px",
                                }}
                              />
                              <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "#495057" }}>
                                Secondary {index + 1}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.6875rem",
                                  fontFamily: "monospace",
                                  color: "#6c757d",
                                }}
                              >
                                {color.toUpperCase()}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeFromArray("color_secondary", index)}
                                disabled={isSubmitting}
                                style={{
                                  padding: "2px 4px",
                                  backgroundColor: "transparent",
                                  border: "none",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  color: "#dc3545",
                                  marginLeft: "4px",
                                }}
                                title="Remove"
                              >
                                <Icon icon="solar:trash-bin-2-bold" width="12" height="12" />
                              </button>
                            </div>
                          ))}
                          {formData.color_accent.map((color, index) => (
                            <div
                              key={`manage-accent-${index}`}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                backgroundColor: "#ffffff",
                                border: "1px solid #dee2e6",
                                borderRadius: "6px",
                                padding: "8px 10px",
                              }}
                            >
                              <div
                                style={{
                                  width: "24px",
                                  height: "24px",
                                  backgroundColor: color,
                                  border: "2px solid #e9ecef",
                                  borderRadius: "4px",
                                }}
                              />
                              <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "#495057" }}>
                                Accent {index + 1}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.6875rem",
                                  fontFamily: "monospace",
                                  color: "#6c757d",
                                }}
                              >
                                {color.toUpperCase()}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeFromArray("color_accent", index)}
                                disabled={isSubmitting}
                                style={{
                                  padding: "2px 4px",
                                  backgroundColor: "transparent",
                                  border: "none",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  color: "#dc3545",
                                  marginLeft: "4px",
                                }}
                                title="Remove"
                              >
                                <Icon icon="solar:trash-bin-2-bold" width="12" height="12" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Typography */}
                  <div className="mb-3">
                    <div className="mb-2" style={{ fontSize: "0.875rem", fontWeight: "600", color: "#212529" }}>
                      Typography
                    </div>

                    <div className="row">
                      <div className="col-md-6 mb-2">
                        <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "500", marginBottom: "4px" }}>
                          Primary Font
                        </label>
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
                          placeholder="Crimson Pro"
                          disabled={isSubmitting}
                          style={{ fontSize: "0.8125rem", padding: "6px 12px" }}
                        />
                      </div>
                      <div className="col-md-6 mb-2">
                        <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "500", marginBottom: "4px" }}>
                          Secondary Font
                        </label>
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
                          placeholder="Inter"
                          disabled={isSubmitting}
                          style={{ fontSize: "0.8125rem", padding: "6px 12px" }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tone Guide */}
                  <div className="mb-3">
                    <div className="mb-2" style={{ fontSize: "0.875rem", fontWeight: "600", color: "#212529" }}>
                      Tone Guide
                    </div>

                    <div className="mb-2">
                      <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "500", marginBottom: "4px" }}>
                        Dos
                      </label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          value={tempInputs.tone_dos}
                          onChange={(e) =>
                            setTempInputs((prev) => ({ ...prev, tone_dos: e.target.value }))
                          }
                          placeholder="Speak to the biology"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addToArray("tone_dos", tempInputs.tone_dos);
                            }
                          }}
                          disabled={isSubmitting}
                          style={{ fontSize: "0.8125rem", padding: "6px 12px" }}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => addToArray("tone_dos", tempInputs.tone_dos)}
                          disabled={isSubmitting}
                          style={{ padding: "6px 10px", fontSize: "0.75rem" }}
                        >
                          <Icon icon="solar:add-circle-bold" width="14" height="14" />
                        </button>
                      </div>
                      <div className="d-flex flex-wrap gap-1 mt-1">
                        {formData.tone_dos.map((item, index) => (
                          <span
                            key={index}
                            className="badge bg-success d-flex align-items-center gap-1"
                            style={{ fontSize: "0.6875rem", padding: "2px 6px" }}
                          >
                            {item}
                            <button
                              type="button"
                              className="btn-close btn-close-white"
                              style={{ fontSize: "8px", width: "8px", height: "8px" }}
                              onClick={() => removeFromArray("tone_dos", index)}
                              disabled={isSubmitting}
                            />
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mb-2">
                      <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "500", marginBottom: "4px" }}>
                        Don'ts
                      </label>
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
                          placeholder="Medical jargon"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addToArray("tone_donts", tempInputs.tone_donts);
                            }
                          }}
                          disabled={isSubmitting}
                          style={{ fontSize: "0.8125rem", padding: "6px 12px" }}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => addToArray("tone_donts", tempInputs.tone_donts)}
                          disabled={isSubmitting}
                          style={{ padding: "6px 10px", fontSize: "0.75rem" }}
                        >
                          <Icon icon="solar:add-circle-bold" width="14" height="14" />
                        </button>
                      </div>
                      <div className="d-flex flex-wrap gap-1 mt-1">
                        {formData.tone_donts.map((item, index) => (
                          <span
                            key={index}
                            className="badge bg-danger d-flex align-items-center gap-1"
                            style={{ fontSize: "0.6875rem", padding: "2px 6px" }}
                          >
                            {item}
                            <button
                              type="button"
                              className="btn-close btn-close-white"
                              style={{ fontSize: "8px", width: "8px", height: "8px" }}
                              onClick={() => removeFromArray("tone_donts", index)}
                              disabled={isSubmitting}
                            />
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Brand Vocabulary */}
                  <div className="mb-3">
                    <div className="mb-2" style={{ fontSize: "0.875rem", fontWeight: "600", color: "#212529" }}>
                      Brand Vocabulary
                    </div>

                    <div className="mb-2">
                      <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "500", marginBottom: "4px" }}>
                        Preferred Terms
                      </label>
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
                          placeholder="microbiome-safe"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addToArray("preferred_terms", tempInputs.preferred_terms);
                            }
                          }}
                          disabled={isSubmitting}
                          style={{ fontSize: "0.8125rem", padding: "6px 12px" }}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() =>
                            addToArray("preferred_terms", tempInputs.preferred_terms)
                          }
                          disabled={isSubmitting}
                          style={{ padding: "6px 10px", fontSize: "0.75rem" }}
                        >
                          <Icon icon="solar:add-circle-bold" width="14" height="14" />
                        </button>
                      </div>
                      <div className="d-flex flex-wrap gap-1 mt-1">
                        {formData.preferred_terms.map((item, index) => (
                          <span
                            key={index}
                            className="badge bg-success d-flex align-items-center gap-1"
                            style={{ fontSize: "0.6875rem", padding: "2px 6px" }}
                          >
                            {item}
                            <button
                              type="button"
                              className="btn-close btn-close-white"
                              style={{ fontSize: "8px", width: "8px", height: "8px" }}
                              onClick={() => removeFromArray("preferred_terms", index)}
                              disabled={isSubmitting}
                            />
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mb-2">
                      <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "500", marginBottom: "4px" }}>
                        Terms to Avoid
                      </label>
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
                          placeholder="cure, treat, medicine"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addToArray("avoid_terms", tempInputs.avoid_terms);
                            }
                          }}
                          disabled={isSubmitting}
                          style={{ fontSize: "0.8125rem", padding: "6px 12px" }}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => addToArray("avoid_terms", tempInputs.avoid_terms)}
                          disabled={isSubmitting}
                          style={{ padding: "6px 10px", fontSize: "0.75rem" }}
                        >
                          <Icon icon="solar:add-circle-bold" width="14" height="14" />
                        </button>
                      </div>
                      <div className="d-flex flex-wrap gap-1 mt-1">
                        {formData.avoid_terms.map((item, index) => (
                          <span
                            key={index}
                            className="badge bg-danger d-flex align-items-center gap-1"
                            style={{ fontSize: "0.6875rem", padding: "2px 6px" }}
                          >
                            {item}
                            <button
                              type="button"
                              className="btn-close btn-close-white"
                              style={{ fontSize: "8px", width: "8px", height: "8px" }}
                              onClick={() => removeFromArray("avoid_terms", index)}
                              disabled={isSubmitting}
                            />
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Core Products */}
                  <div className="mb-3">
                    <div className="mb-2" style={{ fontSize: "0.875rem", fontWeight: "600", color: "#212529" }}>
                      Core Products
                    </div>

                    <div className="mb-2">
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
                          placeholder="Skin Microbiome Shampoo"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addToArray("core_products", tempInputs.core_products);
                            }
                          }}
                          disabled={isSubmitting}
                          style={{ fontSize: "0.8125rem", padding: "6px 12px" }}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() =>
                            addToArray("core_products", tempInputs.core_products)
                          }
                          disabled={isSubmitting}
                          style={{ padding: "6px 10px", fontSize: "0.75rem" }}
                        >
                          <Icon icon="solar:add-circle-bold" width="14" height="14" />
                        </button>
                      </div>
                      <div className="d-flex flex-wrap gap-1 mt-1">
                        {formData.core_products.map((item, index) => (
                          <span
                            key={index}
                            className="badge bg-primary d-flex align-items-center gap-1"
                            style={{ fontSize: "0.6875rem", padding: "2px 6px" }}
                          >
                            {item}
                            <button
                              type="button"
                              className="btn-close btn-close-white"
                              style={{ fontSize: "8px", width: "8px", height: "8px" }}
                              onClick={() => removeFromArray("core_products", index)}
                              disabled={isSubmitting}
                            />
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Competitors */}
                  <div className="mb-3">
                    <div className="mb-2" style={{ fontSize: "0.875rem", fontWeight: "600", color: "#212529" }}>
                      Competitors
                    </div>

                    <div className="mb-2">
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
                            style={{ fontSize: "0.8125rem", padding: "6px 12px" }}
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
                            style={{ fontSize: "0.8125rem", padding: "6px 12px" }}
                          />
                        </div>
                        <div className="col-md-2 mb-2">
                          <button
                            type="button"
                            className="btn btn-outline-secondary w-100"
                            onClick={addCompetitor}
                            disabled={isSubmitting}
                            style={{ padding: "6px 10px", fontSize: "0.75rem" }}
                          >
                            <Icon icon="solar:add-circle-bold" width="14" height="14" />
                          </button>
                        </div>
                      </div>
                      {formData.competitors.length > 0 && (
                        <div className="border rounded p-2 mt-2" style={{ backgroundColor: "#f8f9fa" }}>
                          {formData.competitors.map((comp, index) => (
                            <div
                              key={index}
                              className="d-flex justify-content-between align-items-center mb-1"
                              style={{ padding: "6px 0" }}
                            >
                              <div>
                                <strong style={{ fontSize: "0.8125rem" }}>{comp.name}</strong>
                                {comp.positioning && (
                                  <span className="text-muted d-block" style={{ fontSize: "0.6875rem" }}>
                                    {comp.positioning}
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => removeCompetitor(index)}
                                disabled={isSubmitting}
                                style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                              >
                                <Icon icon="solar:trash-bin-2-bold" width="12" height="12" />
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
          <div className="modal-footer" style={{ padding: "12px 15px", borderTop: "1px solid #e9ecef" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: "6px 16px",
                fontSize: "0.8125rem",
                backgroundColor: "#6c757d",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "500",
                marginRight: "8px",
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.backgroundColor = "#5c636a";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#6c757d";
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                padding: "6px 16px",
                fontSize: "0.8125rem",
                backgroundColor: "#0d6efd",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                fontWeight: "500",
                opacity: isSubmitting ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.backgroundColor = "#0b5ed7";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#0d6efd";
              }}
            >
              {isSubmitting ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    style={{ width: "12px", height: "12px" }}
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

