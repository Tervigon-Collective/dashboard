"use client";

import React from "react";
import "./TagBadge.css";

const TAG_COLORS = {
  // Intent tags
  hook: "#FF6B6B",
  relief: "#4ECDC4",
  authority: "#45B7D1",
  urgency: "#FFA07A",
  curiosity: "#9B59B6",
  social_proof: "#3498DB",
  
  // Neuro signals
  pattern_interrupt: "#E74C3C",
  motion_capture: "#2ECC71",
  emotion_spike: "#F39C12",
  contrast_shift: "#E67E22",
  novelty: "#9B59B6",
  
  // Narrative modes
  problem_solution: "#3498DB",
  transformation: "#2ECC71",
  comparison: "#F39C12",
  demonstration: "#E74C3C",
  testimonial: "#9B59B6",
  
  // Visual density
  minimal: "#95A5A6",
  moderate: "#7F8C8D",
  rich: "#34495E",
  maximal: "#2C3E50",
  
  // Audio types
  voiceover: "#3498DB",
  music: "#9B59B6",
  text: "#95A5A6",
  silent: "#7F8C8D",
};

export default function TagBadge({ label, value, variant = "default" }) {
  const color = TAG_COLORS[value?.toLowerCase()] || "#95A5A6";
  
  return (
    <div className={`tag-badge tag-badge-${variant}`} style={{ "--tag-color": color }}>
      <span className="tag-label">{label}:</span>
      <span className="tag-value">{value}</span>
    </div>
  );
}
