"use client";
import React, { useState, useEffect } from "react";
import ICPTypeSelector from "./ICPTypeSelector";
import PersonaForm from "./PersonaForm";

const ICPConfiguration = ({ icp, onChange, disabled = false, errors = {} }) => {
  const [localICP, setLocalICP] = useState(
    icp || { enabled: false, type: null }
  );

  useEffect(() => {
    if (icp) {
      setLocalICP(icp);
    }
  }, [icp]);

  const getDefaultPersona = () => ({
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

  const handleEnableToggle = (enabled) => {
    const newICP = enabled
      ? { enabled: true, type: "generic" }
      : { enabled: false, type: null };
    setLocalICP(newICP);
    onChange(newICP);
  };

  const handleTypeChange = (type) => {
    const newICP = {
      enabled: localICP?.enabled || false,
      type,
      persona: type === "specific" ? (localICP?.persona || getDefaultPersona()) : undefined,
    };
    setLocalICP(newICP);
    onChange(newICP);
  };

  const handlePersonaChange = (persona) => {
    const newICP = {
      ...localICP,
      persona,
    };
    setLocalICP(newICP);
    onChange(newICP);
  };

  return (
    <div className="icp-configuration mb-3">
      <div className="mb-3">
        <div className="mb-2" style={{ fontSize: "0.875rem", fontWeight: "600", color: "#212529" }}>
          Ideal Customer Profile (ICP)
        </div>
        <p className="text-muted" style={{ fontSize: "0.75rem", marginBottom: "12px" }}>
          Define a specific persona to use consistently when humans are shown in generated ads.
          If no ICP is configured, the system will use autonomous character selection.
        </p>
      </div>

      {/* Enable/Disable Toggle */}
      <div className="mb-3">
        <label className="d-flex align-items-center" style={{ cursor: disabled ? "not-allowed" : "pointer" }}>
          <input
            type="checkbox"
            checked={localICP?.enabled || false}
            onChange={(e) => !disabled && handleEnableToggle(e.target.checked)}
            disabled={disabled}
            style={{ marginRight: "8px", width: "16px", height: "16px" }}
          />
          <span style={{ fontSize: "0.8125rem", fontWeight: "500" }}>Enable ICP Configuration</span>
        </label>
      </div>

      {localICP?.enabled && (
        <>
          {/* Type Selector */}
          <ICPTypeSelector
            value={localICP.type || null}
            onChange={handleTypeChange}
            disabled={disabled}
          />

          {/* Persona Form (only for specific type) */}
          {localICP.type === "specific" && (
            <PersonaForm
              persona={localICP.persona || getDefaultPersona()}
              onChange={handlePersonaChange}
              disabled={disabled}
              errors={errors || {}}
            />
          )}
        </>
      )}

      {!localICP?.enabled && (
        <div
          className="p-3 rounded"
          style={{
            backgroundColor: "#e7f3ff",
            border: "1px solid #b3d9ff",
            fontSize: "0.75rem",
            color: "#004085",
          }}
        >
          <strong>No ICP configured.</strong> The system will use autonomous character
          selection based on product analysis when humans are shown in ads.
        </div>
      )}
    </div>
  );
};

export default ICPConfiguration;

