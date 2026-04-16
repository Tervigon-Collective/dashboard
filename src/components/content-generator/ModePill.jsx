"use client";

import { useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";
import "./ModePill.css";

const MODE_LABELS = {
  image: "Text → Image",
  shots: "Text → Storyboard",
  "storyboard-images": "Storyboard → Storyboard Images",
  video: "Image → Video",
};

export default function ModePill({ mode, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

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

  const currentLabel = MODE_LABELS[mode] || MODE_LABELS.image;

  return (
    <div className="mode-pill" ref={dropdownRef}>
      <button
        className="mode-pill-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="mode-pill-label">{currentLabel}</span>
        <Icon
          icon={isOpen ? "solar:alt-arrow-up-bold" : "solar:alt-arrow-down-bold"}
          className="mode-pill-arrow"
        />
      </button>

      {isOpen && (
        <div className="mode-pill-menu">
          {Object.entries(MODE_LABELS).map(([key, label]) => (
            <button
              key={key}
              className={`mode-pill-item ${mode === key ? "active" : ""}`}
              onClick={() => {
                onChange(key);
                setIsOpen(false);
              }}
            >
              {label}
              {mode === key && (
                <Icon icon="solar:check-circle-bold" className="check-icon" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

