import React, { useRef } from "react";

/**
 * PromptInput
 * Unified input area that adapts per mode.
 *
 * Props:
 * - mode: "image" | "shots" | "video"
 * - prompt: string (main text / storyboard / pacing)
 * - onChangePrompt: fn(string)
 * - onUploadImages: fn(FileList)
 * - onGenerate: fn()
 * - numImages: number (for mode image)
 * - onChangeNumImages: fn(number)
 */
export default function PromptInput({
  mode,
  prompt,
  onChangePrompt,
  onUploadImages,
  onGenerate,
  numImages = 1,
  onChangeNumImages,
  referenceImages = [],
  onRemoveReference,
}) {
  const fileInputRef = useRef(null);

  const placeholderMap = {
    image: "Describe the image you want to create…",
    shots: "Shot 1: … Shot 2: … (storyboard / shot list)",
    video: "Describe pacing, transitions, and motion for the video…",
  };

  const handleFileClick = () => fileInputRef.current?.click();

  const canGenerate = (prompt && prompt.trim().length > 0) || referenceImages.length > 0;
  const isImageMode = mode === "image";
  const isShotsMode = mode === "shots";

  return (
    <div className="sp-composerCard">
      <div className="p-3">
        <div className="mb-3">
          <textarea
            className="form-control sp-composerTextarea"
            placeholder={placeholderMap[mode]}
            value={prompt}
            onChange={(e) => onChangePrompt(e.target.value)}
            rows={3}
          />
        </div>

        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              onClick={handleFileClick}
              className="btn btn-outline-secondary btn-sm sp-btnGhost"
            >
              + Reference images
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="d-none"
              onChange={(e) => onUploadImages(e.target.files)}
            />
            {referenceImages.length > 0 && (
              <span className="text-muted small">{referenceImages.length} image{referenceImages.length > 1 ? "s" : ""} added</span>
            )}
          </div>

          <div className="d-flex align-items-center gap-3 ms-auto">
            {isImageMode && (
              <div className="d-flex align-items-center gap-2 small text-muted">
                <span className="text-muted">Images</span>
                <div className="d-flex align-items-center gap-2 border rounded-pill px-2 py-1 bg-light">
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-secondary p-0"
                    style={{ textDecoration: "none" }}
                    onClick={() => onChangeNumImages(Math.max(1, numImages - 1))}
                    disabled={numImages <= 1}
                  >
                    −
                  </button>
                  <span className="fw-semibold text-dark" style={{ minWidth: 12, textAlign: "center" }}>
                    {numImages}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-secondary p-0"
                    style={{ textDecoration: "none" }}
                    onClick={() => onChangeNumImages(Math.min(4, numImages + 1))}
                    disabled={numImages >= 4}
                  >
                    +
                  </button>
                </div>
              </div>
            )}
            {isShotsMode && (
              <div className="text-muted small">Images are generated per shot</div>
            )}
            <button
              type="button"
              onClick={onGenerate}
              className="btn btn-dark px-4 sp-btnPrimary"
              disabled={!canGenerate}
            >
              Generate
            </button>
          </div>
        </div>

        {referenceImages.length > 0 && (
          <div className="mt-3">
            <div className="text-muted small mb-1">Reference images</div>
            <div className="d-flex flex-wrap gap-2">
              {referenceImages.map((img, idx) => (
                <div
                  key={img.id || img.url || `ref-${idx}`}
                  className="position-relative border rounded"
                  style={{
                    width: 64,
                    height: 64,
                    overflow: "hidden",
                    background: "#f8f9fa",
                  }}
                >
                  <img
                    src={img.url}
                    alt="ref"
                    className="w-100 h-100"
                    style={{ objectFit: "cover", display: "block" }}
                    onError={(e) => {
                      e.currentTarget.src =
                        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='100%25' height='100%25' fill='%23f1f3f5'/%3E%3Ctext x='50%25' y='55%25' font-size='10' fill='%2399a' text-anchor='middle'%3ENO PREVIEW%3C/text%3E%3C/svg%3E";
                    }}
                  />
                  {onRemoveReference && (
                    <button
                      type="button"
                      className="btn-close position-absolute top-0 end-0"
                      aria-label="Remove"
                      style={{ width: 12, height: 12 }}
                      onClick={() => onRemoveReference(img)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

