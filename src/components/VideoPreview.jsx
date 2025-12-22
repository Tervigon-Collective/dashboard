import React from "react";

/**
 * VideoPreview
 * Simple video player with optional timeline note.
 *
 * Props:
 * - videoUrl: string
 * - timelineNote?: string
 */
export default function VideoPreview({ videoUrl, timelineNote }) {
  if (!videoUrl) {
    return (
      <div className="text-sm text-slate-500">Video generating…</div>
    );
  }

  return (
    <div className="space-y-2">
      <video
        controls
        className="w-full rounded-md border border-slate-200"
        src={videoUrl}
      />
      {timelineNote && (
        <div className="text-xs text-slate-500">{timelineNote}</div>
      )}
    </div>
  );
}

