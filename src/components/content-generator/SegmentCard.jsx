"use client";

import React from "react";
import { Icon } from "@iconify/react";
import TagBadge from "./TagBadge";
import "./SegmentCard.css";

const SEGMENT_ROLES = {
  S1: { name: "Hook", icon: "solar:magnet-bold", color: "#FF6B6B" },
  S2: { name: "Message", icon: "solar:chat-round-line-bold", color: "#4ECDC4" },
  S3: { name: "Proof", icon: "solar:verified-check-bold", color: "#45B7D1" },
  S4: { name: "CTA", icon: "solar:hand-shake-bold", color: "#FFA07A" },
};

export default function SegmentCard({ 
  segment, 
  onEdit, 
  onRegenerate, 
  onSelectVariant,
  showVariants = false 
}) {
  const role = SEGMENT_ROLES[segment.segment_id] || { name: segment.segment_id, icon: "solar:video-frame-bold", color: "#95A5A6" };
  const hasVariants = segment.candidates && segment.candidates.length > 1;

  return (
    <div className="segment-card" style={{ "--segment-color": role.color }}>
      <div className="segment-header">
        <div className="segment-header-left">
          <Icon icon={role.icon} className="segment-icon" />
          <span className="segment-id">{segment.segment_id}</span>
          <span className="segment-role">{role.name}</span>
        </div>
        <div className="segment-header-right">
          <span className="segment-timing">
            <Icon icon="solar:clock-circle-bold" />
            {segment.start_time}s - {segment.end_time}s
          </span>
          <span className="segment-duration">{segment.duration}s</span>
        </div>
      </div>

      {/* Tags Display */}
      {segment.tags && (
        <div className="segment-tags">
          {segment.tags.intent_tag && (
            <TagBadge label="Intent" value={segment.tags.intent_tag} />
          )}
          {segment.tags.neuro_signal_tag && (
            <TagBadge label="Neuro" value={segment.tags.neuro_signal_tag} />
          )}
          {segment.tags.narrative_mode && (
            <TagBadge label="Narrative" value={segment.tags.narrative_mode} />
          )}
          {segment.tags.visual_density && (
            <TagBadge label="Visual" value={segment.tags.visual_density} variant="compact" />
          )}
          {segment.tags.audio_type && (
            <TagBadge label="Audio" value={segment.tags.audio_type} variant="compact" />
          )}
        </div>
      )}

      {/* Script Preview */}
      <div className="segment-script">
        <h5>Script</h5>
        <p>{segment.script || segment.description || "No script available"}</p>
      </div>

      {/* Assets Preview */}
      {segment.assets && segment.assets.length > 0 && (
        <div className="segment-assets">
          <h5>Assets ({segment.assets.length})</h5>
          <div className="assets-grid">
            {segment.assets.map((asset, idx) => (
              <div key={idx} className="asset-preview">
                <img src={asset.url || asset.image_url} alt={asset.alt || `Asset ${idx + 1}`} />
                {asset.motion_prompt && (
                  <div className="asset-motion-hint">
                    <Icon icon="solar:play-circle-bold" />
                    <span>{asset.motion_prompt}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Variants Indicator */}
      {hasVariants && !showVariants && (
        <div className="segment-variants-indicator">
          <Icon icon="solar:layers-bold" />
          <span>{segment.candidates.length} variants available</span>
          <button 
            className="btn-view-variants"
            onClick={() => onSelectVariant && onSelectVariant(segment)}
          >
            View Variants
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="segment-actions">
        <button className="btn-secondary" onClick={() => onEdit && onEdit(segment)}>
          <Icon icon="solar:pen-bold" />
          Edit
        </button>
        <button className="btn-primary" onClick={() => onRegenerate && onRegenerate(segment)}>
          <Icon icon="solar:refresh-bold" />
          Regenerate
        </button>
      </div>
    </div>
  );
}
