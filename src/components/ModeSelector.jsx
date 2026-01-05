import React, { useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";

/**
 * ModeSelector
 * Dropdown selector for generation mode.
 *
 * Props:
 * - value: current mode ("image" | "shots" | "storyboard-images" | "video")
 * - onChange: function(newValue)
 */
export default function ModeSelector({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const modes = [
    { key: "image", label: "Text → Image" },
    { key: "shots", label: "Text → Storyboard" },
    { key: "storyboard-images", label: "Storyboard → Storyboard Images" },
    { key: "video", label: "Image → Video" },
  ];

  const currentMode = modes.find((m) => m.key === value) || modes[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="mode-selector-dropdown" ref={dropdownRef}>
      <button
        type="button"
        className="mode-selector-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>Mode: {currentMode.label}</span>
        <Icon
          icon={isOpen ? "solar:alt-arrow-up-bold" : "solar:alt-arrow-down-bold"}
          className="dropdown-icon"
        />
      </button>

      {isOpen && (
        <div className="mode-selector-menu">
          {modes.map((mode) => (
        <button
          key={mode.key}
          type="button"
              className={`mode-selector-item ${
                value === mode.key ? "active" : ""
              }`}
              onClick={() => {
                onChange(mode.key);
                setIsOpen(false);
              }}
        >
          {mode.label}
              {value === mode.key && (
                <Icon icon="solar:check-circle-bold" className="check-icon" />
              )}
        </button>
          ))}
        </div>
      )}
    </div>
  );
}
