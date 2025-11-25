"use client";

import React from "react";
import { Icon } from "@iconify/react";

/**
 * Reusable AI Insight Button Component
 * Can be easily added to any graph/chart component
 */
const InsightButton = ({ onClick, loading, disabled, size = "sm" }) => {
  return (
    <button
      className={`btn btn-${size} btn-light border`}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        padding: size === "sm" ? "4px 8px" : "6px 12px",
        borderRadius: "4px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        display: "flex",
        alignItems: "center",
        gap: "4px",
      }}
      title="Get AI Insights"
    >
      {loading ? (
        <>
          <span
            className="spinner-border spinner-border-sm"
            role="status"
            aria-hidden="true"
            style={{ width: "12px", height: "12px" }}
          />
          <span style={{ fontSize: size === "sm" ? "12px" : "14px" }}>
            Analyzing...
          </span>
        </>
      ) : (
        <>
          <Icon
            icon="mdi:lightbulb-on-outline"
            style={{
              fontSize: size === "sm" ? "16px" : "18px",
              color: "#FFA726",
            }}
          />
          <span style={{ fontSize: size === "sm" ? "12px" : "14px" }}>
            AI Insights
          </span>
        </>
      )}
    </button>
  );
};

export default InsightButton;
