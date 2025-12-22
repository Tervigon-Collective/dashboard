import React from "react";

/**
 * ModeSelector
 * Segmented control / dropdown-like selector for generation mode.
 *
 * Props:
 * - value: current mode ("image" | "shots" | "video")
 * - onChange: function(newValue)
 */
export default function ModeSelector({ value, onChange }) {
  const modes = [
    { key: "image", label: "Image from Prompt" },
    { key: "shots", label: "Storyboard → Shots" },
    { key: "video", label: "Shots → Video" },
  ];

  return (
    <div className="sp-modeSelector" role="tablist" aria-label="Generation mode">
      {modes.map((mode) => {
        const isActive = value === mode.key;
        return (
        <button
          key={mode.key}
          type="button"
          onClick={() => onChange(mode.key)}
            className={`btn btn-sm sp-modeSelector__btn ${isActive ? "is-active" : ""}`}
            aria-pressed={isActive}
        >
          {mode.label}
        </button>
        );
      })}
    </div>
  );
}

