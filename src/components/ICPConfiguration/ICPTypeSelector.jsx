"use client";
import React from "react";

const ICPTypeSelector = ({ value, onChange, disabled = false }) => {
  return (
    <div className="mb-3">
      <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "500", marginBottom: "4px" }}>
        ICP Type
      </label>
      <div className="d-flex flex-column gap-2">
        <label
          className="d-flex align-items-start p-3 border rounded"
          style={{
            cursor: disabled ? "not-allowed" : "pointer",
            backgroundColor: value === "specific" ? "#e7f3ff" : "#fff",
            borderColor: value === "specific" ? "#0d6efd" : "#dee2e6",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            if (!disabled && value !== "specific") {
              e.currentTarget.style.backgroundColor = "#f8f9fa";
            }
          }}
          onMouseLeave={(e) => {
            if (value !== "specific") {
              e.currentTarget.style.backgroundColor = "#fff";
            }
          }}
        >
          <input
            type="radio"
            name="icp-type"
            value="specific"
            checked={value === "specific"}
            onChange={() => !disabled && onChange("specific")}
            disabled={disabled}
            style={{ marginTop: "2px", marginRight: "8px" }}
          />
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: "0.8125rem", display: "block", marginBottom: "4px" }}>
              Specific Persona
            </strong>
            <p style={{ fontSize: "0.75rem", color: "#6c757d", margin: 0 }}>
              Define a detailed persona (name, appearance, traits) that will be used
              consistently across all ads when humans are shown.
            </p>
          </div>
        </label>

        <label
          className="d-flex align-items-start p-3 border rounded"
          style={{
            cursor: disabled ? "not-allowed" : "pointer",
            backgroundColor: value === "generic" ? "#e7f3ff" : "#fff",
            borderColor: value === "generic" ? "#0d6efd" : "#dee2e6",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            if (!disabled && value !== "generic") {
              e.currentTarget.style.backgroundColor = "#f8f9fa";
            }
          }}
          onMouseLeave={(e) => {
            if (value !== "generic") {
              e.currentTarget.style.backgroundColor = "#fff";
            }
          }}
        >
          <input
            type="radio"
            name="icp-type"
            value="generic"
            checked={value === "generic"}
            onChange={() => !disabled && onChange("generic")}
            disabled={disabled}
            style={{ marginTop: "2px", marginRight: "8px" }}
          />
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: "0.8125rem", display: "block", marginBottom: "4px" }}>
              Generic
            </strong>
            <p style={{ fontSize: "0.75rem", color: "#6c757d", margin: 0 }}>
              Use generic human selection based on product analysis. No specific persona
              details required.
            </p>
          </div>
        </label>
      </div>
    </div>
  );
};

export default ICPTypeSelector;

