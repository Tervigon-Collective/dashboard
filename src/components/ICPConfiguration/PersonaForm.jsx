"use client";
import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";

const PersonaForm = ({ persona, onChange, disabled = false, errors = {} }) => {
  const [localPersona, setLocalPersona] = useState(persona || {
    name: "",
    title: "",
    age_range: "",
    gender: "",
    location: "",
    appearance: "",
    wardrobe_style: "",
    behavioral_traits: "",
    core_motivations: [],
  });

  useEffect(() => {
    if (persona) {
      setLocalPersona(persona);
    }
  }, [persona]);

  const handleFieldChange = (field, value) => {
    const updated = { ...localPersona, [field]: value };
    setLocalPersona(updated);
    onChange(updated);
  };

  const handleMotivationAdd = () => {
    const updated = {
      ...localPersona,
      core_motivations: [...(localPersona.core_motivations || []), ""],
    };
    setLocalPersona(updated);
    onChange(updated);
  };

  const handleMotivationChange = (index, value) => {
    const updated = {
      ...localPersona,
      core_motivations: localPersona.core_motivations?.map((m, i) =>
        i === index ? value : m
      ) || [],
    };
    setLocalPersona(updated);
    onChange(updated);
  };

  const handleMotivationRemove = (index) => {
    const updated = {
      ...localPersona,
      core_motivations: localPersona.core_motivations?.filter((_, i) => i !== index) || [],
    };
    setLocalPersona(updated);
    onChange(updated);
  };

  const handleArrayFieldChange = (field, value) => {
    const lines = value.split("\n").filter((line) => line.trim());
    const updated = { ...localPersona, [field]: lines };
    setLocalPersona(updated);
    onChange(updated);
  };

  return (
    <div className="persona-form">
      <div className="mb-3">
        <div className="mb-2" style={{ fontSize: "0.875rem", fontWeight: "600", color: "#212529" }}>
          Persona Details
        </div>

        {/* Basic Information */}
        <div className="mb-3">
          <div className="mb-2" style={{ fontSize: "0.8125rem", fontWeight: "500", color: "#495057" }}>
            Basic Information
          </div>

          <div className="row g-2 mb-2">
            <div className="col-md-6">
              <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "500", marginBottom: "4px" }}>
                Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className={`form-control ${errors.icp_persona_name ? "is-invalid" : ""}`}
                value={localPersona.name || ""}
                onChange={(e) => handleFieldChange("name", e.target.value)}
                placeholder="e.g., Aditi Sharma"
                disabled={disabled}
                required
                style={{ fontSize: "0.8125rem", padding: "6px 12px" }}
              />
              {errors.icp_persona_name && (
                <div className="invalid-feedback" style={{ fontSize: "0.6875rem" }}>
                  {errors.icp_persona_name}
                </div>
              )}
            </div>

            <div className="col-md-6">
              <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "500", marginBottom: "4px" }}>
                Title <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className={`form-control ${errors.icp_persona_title ? "is-invalid" : ""}`}
                value={localPersona.title || ""}
                onChange={(e) => handleFieldChange("title", e.target.value)}
                placeholder="e.g., Pet Mom"
                disabled={disabled}
                required
                style={{ fontSize: "0.8125rem", padding: "6px 12px" }}
              />
              {errors.icp_persona_title && (
                <div className="invalid-feedback" style={{ fontSize: "0.6875rem" }}>
                  {errors.icp_persona_title}
                </div>
              )}
            </div>
          </div>

          <div className="row g-2 mb-2">
            <div className="col-md-6">
              <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "500", marginBottom: "4px" }}>
                Age Range <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className={`form-control ${errors.icp_persona_age_range ? "is-invalid" : ""}`}
                value={localPersona.age_range || ""}
                onChange={(e) => handleFieldChange("age_range", e.target.value)}
                placeholder="e.g., 25-44"
                disabled={disabled}
                required
                style={{ fontSize: "0.8125rem", padding: "6px 12px" }}
              />
              {errors.icp_persona_age_range && (
                <div className="invalid-feedback" style={{ fontSize: "0.6875rem" }}>
                  {errors.icp_persona_age_range}
                </div>
              )}
            </div>

            <div className="col-md-6">
              <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "500", marginBottom: "4px" }}>
                Gender <span className="text-danger">*</span>
              </label>
              <select
                className={`form-control ${errors.icp_persona_gender ? "is-invalid" : ""}`}
                value={localPersona.gender || ""}
                onChange={(e) => handleFieldChange("gender", e.target.value)}
                disabled={disabled}
                required
                style={{ fontSize: "0.8125rem", padding: "6px 12px" }}
              >
                <option value="">Select...</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="non-binary">Non-binary</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
              {errors.icp_persona_gender && (
                <div className="invalid-feedback" style={{ fontSize: "0.6875rem" }}>
                  {errors.icp_persona_gender}
                </div>
              )}
            </div>
          </div>

          <div className="mb-2">
            <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "500", marginBottom: "4px" }}>
              Location <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              className={`form-control ${errors.icp_persona_location ? "is-invalid" : ""}`}
              value={localPersona.location || ""}
              onChange={(e) => handleFieldChange("location", e.target.value)}
              placeholder="e.g., Urban & Tier 1 cities (Delhi, Mumbai, Bangalore...)"
              disabled={disabled}
              required
              style={{ fontSize: "0.8125rem", padding: "6px 12px" }}
            />
            {errors.icp_persona_location && (
              <div className="invalid-feedback" style={{ fontSize: "0.6875rem" }}>
                {errors.icp_persona_location}
              </div>
            )}
          </div>
        </div>

        {/* Appearance & Style */}
        <div className="mb-3">
          <div className="mb-2" style={{ fontSize: "0.8125rem", fontWeight: "500", color: "#495057" }}>
            Appearance & Style
          </div>

          <div className="mb-2">
            <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "500", marginBottom: "4px" }}>
              Appearance
            </label>
            <textarea
              className="form-control"
              value={localPersona.appearance || ""}
              onChange={(e) => handleFieldChange("appearance", e.target.value)}
              placeholder="e.g., Indian woman, urban professional, clean aesthetic, photogenic"
              rows={3}
              disabled={disabled}
              style={{ fontSize: "0.8125rem", padding: "6px 12px" }}
            />
          </div>

          <div className="mb-2">
            <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "500", marginBottom: "4px" }}>
              Wardrobe Style
            </label>
            <textarea
              className="form-control"
              value={localPersona.wardrobe_style || ""}
              onChange={(e) => handleFieldChange("wardrobe_style", e.target.value)}
              placeholder="e.g., Premium, clean, photogenic - loves showing off her pet and home"
              rows={2}
              disabled={disabled}
              style={{ fontSize: "0.8125rem", padding: "6px 12px" }}
            />
          </div>
        </div>

        {/* Behavioral Traits */}
        <div className="mb-3">
          <div className="mb-2" style={{ fontSize: "0.8125rem", fontWeight: "500", color: "#495057" }}>
            Behavioral Traits
          </div>

          <div className="mb-2">
            <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "500", marginBottom: "4px" }}>
              Behavioral Traits
            </label>
            <textarea
              className="form-control"
              value={localPersona.behavioral_traits || ""}
              onChange={(e) => handleFieldChange("behavioral_traits", e.target.value)}
              placeholder="e.g., Emotional, caring, seeks guilt relief, values vet-backed trust..."
              rows={3}
              disabled={disabled}
              style={{ fontSize: "0.8125rem", padding: "6px 12px" }}
            />
          </div>
        </div>

        {/* Core Motivations */}
        <div className="mb-3">
          <div className="mb-2" style={{ fontSize: "0.8125rem", fontWeight: "500", color: "#495057" }}>
            Core Motivations
          </div>
          <p className="text-muted" style={{ fontSize: "0.6875rem", marginBottom: "8px" }}>
            List the key motivations that drive this persona's purchasing decisions.
          </p>

          {localPersona.core_motivations?.map((motivation, index) => (
            <div key={index} className="d-flex gap-2 mb-2">
              <input
                type="text"
                className="form-control"
                value={motivation}
                onChange={(e) => handleMotivationChange(index, e.target.value)}
                placeholder="e.g., Guilt Relief: Feels bad for not spending enough time on pet"
                disabled={disabled}
                style={{ fontSize: "0.8125rem", padding: "6px 12px" }}
              />
              <button
                type="button"
                onClick={() => handleMotivationRemove(index)}
                disabled={disabled}
                className="btn btn-outline-danger"
                style={{ padding: "6px 12px", fontSize: "0.75rem", whiteSpace: "nowrap" }}
              >
                <Icon icon="solar:trash-bin-2-bold" width="14" height="14" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={handleMotivationAdd}
            disabled={disabled}
            className="btn btn-outline-primary"
            style={{ padding: "6px 12px", fontSize: "0.75rem" }}
          >
            <Icon icon="solar:add-circle-bold" width="14" height="14" style={{ marginRight: "4px" }} />
            Add Motivation
          </button>
        </div>

        {/* Optional Fields */}
        <div className="mb-3">
          <div className="mb-2" style={{ fontSize: "0.8125rem", fontWeight: "500", color: "#495057" }}>
            Additional Information (Optional)
          </div>

          <div className="mb-2">
            <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "500", marginBottom: "4px" }}>
              Psychological Drivers
            </label>
            <textarea
              className="form-control"
              value={localPersona.psychological_drivers?.join("\n") || ""}
              onChange={(e) => handleArrayFieldChange("psychological_drivers", e.target.value)}
              placeholder="One per line:&#10;Status through care: Feels proud when others notice...&#10;Projection: The pet is often a mirror..."
              rows={4}
              disabled={disabled}
              style={{ fontSize: "0.8125rem", padding: "6px 12px" }}
            />
            <small className="text-muted" style={{ fontSize: "0.6875rem" }}>
              Enter one driver per line
            </small>
          </div>

          <div className="mb-2">
            <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "500", marginBottom: "4px" }}>
              Funnel Flow
            </label>
            <input
              type="text"
              className="form-control"
              value={localPersona.funnel_flow || ""}
              onChange={(e) => handleFieldChange("funnel_flow", e.target.value)}
              placeholder="e.g., Speed → Relief → Safety → Aesthetic Pride"
              disabled={disabled}
              style={{ fontSize: "0.8125rem", padding: "6px 12px" }}
            />
          </div>

          <div className="mb-2">
            <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "500", marginBottom: "4px" }}>
              Engagement Patterns
            </label>
            <textarea
              className="form-control"
              value={localPersona.engagement_patterns?.join("\n") || ""}
              onChange={(e) => handleArrayFieldChange("engagement_patterns", e.target.value)}
              placeholder="One per line:&#10;Buys quickly when content hits an emotional chord...&#10;Engages most during evenings (7-11 PM)..."
              rows={4}
              disabled={disabled}
              style={{ fontSize: "0.8125rem", padding: "6px 12px" }}
            />
            <small className="text-muted" style={{ fontSize: "0.6875rem" }}>
              Enter one pattern per line
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonaForm;

