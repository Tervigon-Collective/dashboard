"use client";

import { Icon } from "@iconify/react";
import "./BrandkitBadge.css";

export default function BrandkitBadge({ brandkit, onIgnore }) {
  return (
    <div className="brandkit-badge-small">
      <span className="badge-dot"></span>
      <span className="badge-text">Brandkit: {brandkit.brand_name || "Active"}</span>
      <button className="badge-close" onClick={onIgnore} title="Ignore brandkit">
        <Icon icon="solar:close-circle-bold" />
      </button>
    </div>
  );
}

