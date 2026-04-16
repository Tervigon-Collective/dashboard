"use client";

import { useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";
import { useBrandkit } from "@/contexts/BrandkitContext";
import ModePill from "./ModePill";
import SettingsDrawer from "./SettingsDrawer";
import SuggestionsPopover from "./SuggestionsPopover";
import BrandkitBadge from "./BrandkitBadge";
import "./PlaygroundComposer.css";

const MODE_LABELS = {
  image: "Text → Image",
  shots: "Text → Storyboard",
  "storyboard-images": "Storyboard → Storyboard Images",
  video: "Image → Video",
};

export default function PlaygroundComposer({
  mode,
  onModeChange,
  prompt,
  onPromptChange,
  onUploadImages,
  onGenerate,
  numImages,
  onNumImagesChange,
  referenceImages = [],
  onRemoveReference,
  hasMessages = false,
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [ignoreBrandkit, setIgnoreBrandkit] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const settingsRef = useRef(null);
  const suggestionsRef = useRef(null);
  const { activeBrandkit } = useBrandkit();

  const canGenerate = (prompt && prompt.trim().length > 0) || referenceImages.length > 0;

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canGenerate) {
        onGenerate();
      }
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  // Close popovers when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettings(false);
      }
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="playground-composer">
      {/* Brandkit Badge - Small, top-right */}
      {activeBrandkit && !ignoreBrandkit && (
        <BrandkitBadge
          brandkit={activeBrandkit}
          onIgnore={() => setIgnoreBrandkit(true)}
        />
      )}

      {/* Suggestions Button - Only show when empty or after first message */}
      {!hasMessages && (
        <div className="suggestions-trigger" ref={suggestionsRef}>
          <button
            className="btn-suggestions"
            onClick={() => setShowSuggestions(!showSuggestions)}
          >
            <Icon icon="solar:magic-stick-3-bold" />
            Suggestions
          </button>
          {showSuggestions && (
            <SuggestionsPopover
              onSelect={(chip) => {
                if (chip === "Match brandkit") {
                  setIgnoreBrandkit(false);
                } else {
                  const chipText = chip.toLowerCase().replace("more ", "");
                  onPromptChange((prev) => prev ? `${prev}, ${chipText}` : chipText);
                }
                setShowSuggestions(false);
              }}
            />
          )}
        </div>
      )}

      {/* Main Composer Bar */}
      <div className="composer-bar">
        <div className="composer-left">
          <ModePill mode={mode} onChange={onModeChange} />
          <div className="settings-trigger" ref={settingsRef}>
            <button
              className="btn-settings"
              onClick={() => setShowSettings(!showSettings)}
              title="Settings"
            >
              <Icon icon="solar:settings-bold" />
            </button>
            {showSettings && (
              <SettingsDrawer
                mode={mode}
                numImages={numImages}
                onNumImagesChange={onNumImagesChange}
                onClose={() => setShowSettings(false)}
              />
            )}
          </div>
        </div>

        <div className="composer-input-wrapper">
          <textarea
            ref={textareaRef}
            className="composer-textarea"
            placeholder="Type a message…"
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          {referenceImages.length > 0 && (
            <div className="reference-images-preview">
              {referenceImages.map((img, idx) => (
                <div key={idx} className="reference-preview-item">
                  <img src={img.url} alt="Reference" />
                  <button
                    className="remove-reference"
                    onClick={() => onRemoveReference(img)}
                  >
                    <Icon icon="solar:close-circle-bold" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="composer-right">
          <button
            className="btn-attach"
            onClick={handleFileClick}
            title="Attach images"
          >
            <Icon icon="solar:gallery-add-bold" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="d-none"
            onChange={(e) => onUploadImages(e.target.files)}
          />
          <button
            className="btn-send"
            onClick={onGenerate}
            disabled={!canGenerate}
            title="Send"
          >
            <Icon icon="solar:plain-2-bold" />
          </button>
        </div>
      </div>
    </div>
  );
}

