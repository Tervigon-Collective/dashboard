"use client";

import { Icon } from "@iconify/react";
import "./SettingsDrawer.css";

export default function SettingsDrawer({
  mode,
  numImages,
  onNumImagesChange,
  onClose,
}) {
  return (
    <div className="settings-drawer">
      <div className="settings-drawer-header">
        <span className="settings-title">Settings</span>
        <button className="settings-close" onClick={onClose}>
          <Icon icon="solar:close-circle-bold" />
        </button>
      </div>

      <div className="settings-drawer-content">
        {mode === "image" && (
          <div className="settings-group">
            <label className="settings-label">Variants</label>
            <div className="settings-control">
              <input
                type="range"
                min="1"
                max="10"
                value={numImages}
                onChange={(e) => onNumImagesChange(Number(e.target.value))}
                className="settings-slider"
              />
              <span className="settings-value">{numImages}</span>
            </div>
          </div>
        )}

        {mode === "video" && (
          <>
            <div className="settings-group">
              <label className="settings-label">Aspect Ratio</label>
              <select className="settings-select">
                <option>9:16</option>
                <option>16:9</option>
                <option>1:1</option>
                <option>4:5</option>
                <option>9:21</option>
              </select>
            </div>
            <div className="settings-group">
              <label className="settings-label">Duration</label>
              <select className="settings-select">
                <option>10 seconds</option>
                <option>15 seconds</option>
                <option>30 seconds</option>
              </select>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

