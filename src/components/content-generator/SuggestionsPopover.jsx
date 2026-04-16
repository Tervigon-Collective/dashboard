"use client";

import "./SuggestionsPopover.css";

const QUICK_CHIPS = [
  "More cinematic",
  "More premium lighting",
  "More minimal background",
  "Match brandkit",
];

export default function SuggestionsPopover({ onSelect }) {
  return (
    <div className="suggestions-popover">
      <div className="suggestions-header">Quick suggestions</div>
      <div className="suggestions-chips">
        {QUICK_CHIPS.map((chip) => (
          <button
            key={chip}
            className="suggestion-chip"
            onClick={() => onSelect(chip)}
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}

