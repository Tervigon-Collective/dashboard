"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import TagBadge from "./TagBadge";
import "./VariantSelector.css";

export default function VariantSelector({ segment, variants, onSelect, onClose }) {
  const [activeVariant, setActiveVariant] = useState(0);

  if (!variants || variants.length === 0) {
    return (
      <div className="variant-selector-modal">
        <div className="variant-selector-content">
          <div className="variant-selector-header">
            <h3>No Variants Available</h3>
            <button className="btn-close" onClick={onClose}>
              <Icon icon="solar:close-circle-bold" />
            </button>
          </div>
          <p>No variants found for this segment.</p>
        </div>
      </div>
    );
  }

  const currentVariant = variants[activeVariant];

  return (
    <div className="variant-selector-modal" onClick={onClose}>
      <div className="variant-selector-content" onClick={(e) => e.stopPropagation()}>
        <div className="variant-selector-header">
          <div>
            <h3>Variants for {segment.segment_id} ({segment.role || "Unknown Role"})</h3>
            <p className="variant-subtitle">Choose the best variant for your ad</p>
          </div>
          <button className="btn-close" onClick={onClose}>
            <Icon icon="solar:close-circle-bold" />
          </button>
        </div>

        {/* Variant Tabs */}
        <div className="variant-tabs">
          {variants.map((variant, idx) => (
            <button
              key={idx}
              className={`variant-tab ${activeVariant === idx ? "active" : ""}`}
              onClick={() => setActiveVariant(idx)}
            >
              <span className="variant-tab-label">Variant {idx + 1}</span>
              {variant.is_primary && (
                <Icon icon="solar:star-bold" className="variant-star" />
              )}
              {variant.confidence && (
                <span className="variant-confidence">
                  {(variant.confidence * 100).toFixed(0)}%
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Variant Preview */}
        <div className="variant-preview">
          <div className="variant-preview-grid">
            {/* Visual Preview */}
            <div className="variant-visual">
              <h4>Visual</h4>
              {currentVariant.asset?.frame_url || currentVariant.asset?.image_url ? (
                <div className="variant-image-container">
                  <img
                    src={currentVariant.asset.frame_url || currentVariant.asset.image_url}
                    alt="Variant frame"
                  />
                  {currentVariant.asset.motion_prompt && (
                    <div className="motion-overlay">
                      <Icon icon="solar:play-circle-bold" />
                      <span>{currentVariant.asset.motion_prompt}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="variant-image-placeholder">
                  <Icon icon="solar:image-bold" />
                  <span>No visual preview</span>
                </div>
              )}
            </div>

            {/* Script Preview */}
            <div className="variant-script-panel">
              <h4>Script</h4>
              <div className="variant-script-text">
                {currentVariant.script?.text || currentVariant.script || "No script available"}
              </div>

              {/* Script Metadata */}
              {currentVariant.script && (
                <div className="variant-metadata">
                  {currentVariant.script.visual_instructions && (
                    <div className="metadata-item">
                      <Icon icon="solar:camera-bold" />
                      <div>
                        <strong>Visual:</strong>
                        <span>{currentVariant.script.visual_instructions}</span>
                      </div>
                    </div>
                  )}

                  {currentVariant.script.emotional_cues && currentVariant.script.emotional_cues.length > 0 && (
                    <div className="metadata-item">
                      <Icon icon="solar:heart-bold" />
                      <div>
                        <strong>Emotional:</strong>
                        <span>{currentVariant.script.emotional_cues.join(", ")}</span>
                      </div>
                    </div>
                  )}

                  {currentVariant.script.timing_notes && (
                    <div className="metadata-item">
                      <Icon icon="solar:clock-circle-bold" />
                      <div>
                        <strong>Timing:</strong>
                        <span>{currentVariant.script.timing_notes}</span>
                      </div>
                    </div>
                  )}

                  {currentVariant.script.word_count && (
                    <div className="metadata-item">
                      <Icon icon="solar:text-bold" />
                      <div>
                        <strong>Words:</strong>
                        <span>{currentVariant.script.word_count}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tags */}
              {currentVariant.tags && (
                <div className="variant-tags">
                  <h5>Tags</h5>
                  <div className="tags-list">
                    {currentVariant.tags.intent_tag && (
                      <TagBadge label="Intent" value={currentVariant.tags.intent_tag} />
                    )}
                    {currentVariant.tags.neuro_signal_tag && (
                      <TagBadge label="Neuro" value={currentVariant.tags.neuro_signal_tag} />
                    )}
                    {currentVariant.tags.narrative_mode && (
                      <TagBadge label="Narrative" value={currentVariant.tags.narrative_mode} />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="variant-actions">
          <button className="btn-navigate" onClick={() => setActiveVariant(Math.max(0, activeVariant - 1))} disabled={activeVariant === 0}>
            <Icon icon="solar:arrow-left-bold" />
            Previous
          </button>

          <button className="btn-use-variant" onClick={() => onSelect(currentVariant)}>
            <Icon icon="solar:check-circle-bold" />
            Use This Variant
          </button>

          <button className="btn-navigate" onClick={() => setActiveVariant(Math.min(variants.length - 1, activeVariant + 1))} disabled={activeVariant === variants.length - 1}>
            Next
            <Icon icon="solar:arrow-right-bold" />
          </button>
        </div>
      </div>
    </div>
  );
}
