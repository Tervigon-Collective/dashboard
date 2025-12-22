import React from "react";

/**
 * ShotGrid
 * Displays shot images in a grid layout.
 *
 * Props:
 * - shots: array of { shot_number, url, shot_description }
 */
export default function ShotGrid({ shots = [] }) {
  if (!shots.length) {
    return (
      <div className="text-sm text-slate-500">No shots generated yet.</div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {shots.map((shot) => (
        <div
          key={shot.task_id || shot.shot_number}
          className="rounded-md border border-slate-200 p-2 space-y-2"
        >
          <div className="text-xs font-medium text-slate-600">
            Shot {shot.shot_number}
          </div>
          <div className="rounded-md overflow-hidden aspect-video bg-slate-50 border border-slate-100">
            <img
              src={shot.url}
              alt={`Shot ${shot.shot_number}`}
              className="w-full h-full object-cover"
            />
          </div>
          {shot.shot_description && (
            <div className="text-xs text-slate-600 line-clamp-2">
              {shot.shot_description}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

