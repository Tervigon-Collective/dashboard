import React from "react";

/**
 * CanvasItem
 * Represents a single generation card with lifecycle states.
 *
 * Props:
 * - item: {
 *     id, mode, rawPrompt, optimizedPrompt, status,
 *     referenceImages (array of {url, name?}),
 *     results (images or video)
 *   }
 * - onEditShot(shot, item)
 * - onDownloadShot(shot, item)
 * - onShotToVideo(shot, item)
 * - onChangeShotVariant(shot, item, nextIndex)
 * - onShotsToVideo(shots, item)
 */
export default function CanvasItem({
  item,
  onEditShot,
  onDownloadShot,
  onShotToVideo,
  onChangeShotVariant,
  onShotsToVideo,
  onRegenerateShotInline,
}) {
  const [collapsed, setCollapsed] = React.useState(true);
  const [editingShotKey, setEditingShotKey] = React.useState(null); // Key of shot being edited inline
  const [editPrompt, setEditPrompt] = React.useState(""); // Local prompt for inline editing

  const statusLabel = {
    optimizing: "Optimizing prompt",
    generating: item.mode === "video" ? "Generating video" : "Generating image",
    parsing_storyboard: "Preparing storyboard",
    generating_video: "Generating video",
    completed: "Ready",
    failed: "Failed",
  }[item.status] || item.status;

  const statusClass = {
    optimizing: "bg-warning-subtle text-warning-emphasis border border-warning-subtle",
    generating: "bg-primary-subtle text-primary-emphasis border border-primary-subtle",
    parsing_storyboard: "bg-warning-subtle text-warning-emphasis border border-warning-subtle",
    generating_video: "bg-primary-subtle text-primary-emphasis border border-primary-subtle",
    completed: "bg-success-subtle text-success-emphasis border border-success-subtle",
    failed: "bg-danger-subtle text-danger-emphasis border border-danger-subtle",
  }[item.status] || "bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle";

  const truncatedPrompt = collapsed
    ? item.rawPrompt?.split("\n").slice(0, 2).join("\n")
    : item.rawPrompt;

  const showToggle = item.rawPrompt && item.rawPrompt.split("\n").length > 2;

  const renderBody = () => {
    if (item.mode === "image") {
      const images = item.results?.images || [];
      const isLoading = ["optimizing", "generating"].includes(item.status) || images.length === 0;
      return (
        <div className="py-2">
          {isLoading && (
            <div className="rounded border border-light bg-light-subtle p-3 text-center text-muted small">
              <div className="placeholder-glow">
                <div className="placeholder col-12 mb-2" style={{ height: 160 }} />
              </div>
              Generating image…
            </div>
          )}
          {!isLoading && (
            <div className="row g-2">
              {images.map((img, idx) => {
                const key = img.task_id || img.url || `img-${idx}`;
                return (
                  <div className="col-6 col-md-4" key={key}>
                  <div className="ratio ratio-1x1 border rounded" style={{ overflow: "hidden" }}>
                    <img src={img.url} alt="Generated" className="w-100 h-100" style={{ objectFit: "cover" }} />
                  </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    if (item.mode === "shots") {
      const shots = item.results?.shots || [];
      const isLoading = ["parsing_storyboard", "generating", "optimizing"].includes(item.status) || shots.length === 0;
      const placeholderCount = Math.max(3, shots.length || 3);
      return (
        <div className="py-2">
          {isLoading && (
            <div className="row g-2">
              {Array.from({ length: placeholderCount }).map((_, idx) => (
                <div className="col-12 col-md-6" key={idx}>
                  <div className="border rounded p-2 bg-light-subtle">
                    <div className="placeholder-glow">
                      <div className="placeholder col-4 mb-2" />
                      <div className="placeholder col-12 mb-2" style={{ height: 120 }} />
                      <div className="placeholder col-8" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!isLoading && (
            <>
              <div className="d-flex justify-content-end mb-2">
                <button
                  type="button"
                  className="btn btn-outline-dark btn-sm"
                  onClick={() => onShotsToVideo && onShotsToVideo(shots, item)}
                  title="Generate a video using all shots (uses your selected < > versions)"
                >
                  All Shots → Video
                </button>
              </div>

              <div className="row g-3">
                {shots.map((shot, idx) => {
                  const key = shot.task_id || shot.shot_number || `shot-${idx}`;

                  const variants =
                    Array.isArray(shot.variants) && shot.variants.length > 0
                      ? shot.variants
                      : [
                          {
                            id: shot.task_id || `v0-${shot.shot_number || idx}`,
                            url: shot.url,
                            rawPrompt: shot.shot_description,
                            optimizedPrompt: shot.optimized_prompt,
                            status: "completed",
                            task_id: shot.task_id,
                            all_urls: shot.all_urls,
                          },
                        ];

                  const selectedIdxRaw = Number.isInteger(shot.selectedVariantIndex)
                    ? shot.selectedVariantIndex
                    : 0;
                  const selectedIdx = Math.min(Math.max(selectedIdxRaw, 0), Math.max(0, variants.length - 1));
                  const currentVariant = variants[selectedIdx] || variants[0];

                  const displayUrl = currentVariant?.url || shot.url;
                  const displayPrompt =
                    currentVariant?.rawPrompt ||
                    currentVariant?.prompt ||
                    currentVariant?.shot_description ||
                    shot.shot_description;

                  const canNav = variants.length > 1;
                  const isVariantLoading =
                    currentVariant?.status && ["optimizing", "generating"].includes(currentVariant.status);

                  const handlePrev = () =>
                    onChangeShotVariant && onChangeShotVariant(shot, item, Math.max(0, selectedIdx - 1));
                  const handleNext = () =>
                    onChangeShotVariant &&
                    onChangeShotVariant(shot, item, Math.min(variants.length - 1, selectedIdx + 1));

                  const resolvedShotForActions = {
                    ...shot,
                    url: displayUrl,
                    shot_description: displayPrompt,
                    selectedVariantIndex: selectedIdx,
                    variants,
                  };

                  const isEditing = editingShotKey === key;
                  const handleEdit = () => {
                    setEditingShotKey(key);
                    setEditPrompt(displayPrompt || "");
                  };
                  const handleCancelEdit = () => {
                    setEditingShotKey(null);
                    setEditPrompt("");
                  };
                  const handleSendEdit = async () => {
                    if (!editPrompt.trim()) return;
                    if (onRegenerateShotInline) {
                      await onRegenerateShotInline(resolvedShotForActions, item, editPrompt.trim());
                    }
                    setEditingShotKey(null);
                    setEditPrompt("");
                  };
                  const handleDownload = () => onDownloadShot && onDownloadShot(resolvedShotForActions, item);
                  const handleShotToVideo = () => onShotToVideo && onShotToVideo(resolvedShotForActions, item);

                  return (
                    <div className="col-12 col-md-6" key={key}>
                      <div className="border rounded p-2 h-100 d-flex flex-column">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="badge bg-light text-secondary border">Shot {shot.shot_number}</span>
                          <div className="d-flex align-items-center gap-1">
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm"
                              style={{ padding: "0.15rem 0.45rem" }}
                              onClick={handlePrev}
                              disabled={!canNav || selectedIdx === 0 || isEditing}
                              title="Previous version"
                            >
                              {"<"}
                            </button>
                            <span className="small text-muted" style={{ minWidth: 54, textAlign: "center" }}>
                              {selectedIdx + 1}/{variants.length}
                            </span>
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm"
                              style={{ padding: "0.15rem 0.45rem" }}
                              onClick={handleNext}
                              disabled={!canNav || selectedIdx === variants.length - 1 || isEditing}
                              title="Next version"
                            >
                              {">"}
                            </button>
                          </div>
                        </div>

                        <div className="ratio ratio-16x9 border rounded mb-2 position-relative" style={{ overflow: "hidden" }}>
                          {displayUrl ? (
                            <img
                              src={displayUrl}
                              alt={`Shot ${shot.shot_number}`}
                              className="w-100 h-100"
                              style={{ objectFit: "cover" }}
                            />
                          ) : (
                            <div className="w-100 h-100 bg-light-subtle d-flex align-items-center justify-content-center text-muted small">
                              Generating…
                            </div>
                          )}
                          {isVariantLoading && (
                            <div
                              className="position-absolute top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center"
                              style={{ background: "rgba(255,255,255,0.55)" }}
                            >
                              <div className="small text-muted">Updating…</div>
                            </div>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="sp-shotEdit flex-grow-1">
                            <textarea
                              className="sp-shotEdit__textarea"
                              value={editPrompt}
                              onChange={(e) => setEditPrompt(e.target.value)}
                              placeholder="Edit the prompt for this shot..."
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                                  e.preventDefault();
                                  handleSendEdit();
                                }
                              }}
                            />
                            <div className="sp-shotEdit__actions">
                              <button
                                type="button"
                                className="sp-shotEdit__btn sp-shotEdit__btn--send"
                                onClick={handleSendEdit}
                                disabled={!editPrompt.trim()}
                              >
                                Send
                              </button>
                              <button
                                type="button"
                                className="sp-shotEdit__btn sp-shotEdit__btn--cancel"
                                onClick={handleCancelEdit}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="small text-muted flex-grow-1" style={{ lineHeight: 1.4, whiteSpace: "pre-wrap" }}>
                              {displayPrompt}
                            </div>

                            <div className="d-flex flex-wrap gap-2 mt-2 small">
                              <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm"
                                onClick={handleEdit}
                                disabled={isVariantLoading}
                              >
                                Edit
                              </button>
                              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleDownload}>
                                Download
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-dark btn-sm ms-auto"
                                onClick={handleShotToVideo}
                                title="Use this selected version as input to video generation"
                              >
                                Shots → Video
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      );
    }

    if (item.mode === "video") {
      const videoUrl = item.results?.video_url;
      const isLoading = ["generating_video", "generating", "optimizing"].includes(item.status) || !videoUrl;
      return (
        <div className="py-2">
          {isLoading && (
            <div className="rounded border border-light bg-light-subtle p-3 text-center text-muted small">
              <div className="placeholder-glow">
                <div className="placeholder col-12 mb-2" style={{ height: 180 }} />
              </div>
              Generating video…
            </div>
          )}
          {!isLoading && (
            <video controls className="w-100 rounded border" src={videoUrl} />
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="card border-light shadow-sm mb-3">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div className="d-flex flex-column">
            <div className="fw-semibold text-dark">
              {item.mode === "image"
                ? "Image from Prompt"
                : item.mode === "shots"
                ? "Storyboard → Shots"
                : "Shots → Video"}
            </div>
            <span className={`badge ${statusClass} mt-1`}>
              {statusLabel}
            </span>
          </div>
        </div>

        {item.referenceImages?.length > 0 && (
          <div className="d-flex flex-wrap gap-2 mb-2">
            {item.referenceImages.map((img, idx) => (
              <div key={idx} className="border rounded" style={{ width: 42, height: 42, overflow: "hidden" }}>
                <img
                  src={img.url}
                  alt={img.name || "ref"}
                  className="w-100 h-100"
                  style={{ objectFit: "cover" }}
                />
              </div>
            ))}
          </div>
        )}

        {item.rawPrompt && (
          <div className="mb-3">
            <div className="text-muted small mb-1">Prompt</div>
            <div
              className="position-relative bg-light rounded p-2 small"
              style={{ maxHeight: collapsed ? 64 : "none", overflow: "hidden" }}
            >
              <pre className="m-0" style={{ fontFamily: "inherit", whiteSpace: "pre-wrap" }}>
                {truncatedPrompt}
              </pre>
              {collapsed && showToggle && (
                <div
                  className="position-absolute bottom-0 start-0 end-0"
                  style={{
                    height: 40,
                    background: "linear-gradient(180deg, rgba(248,249,250,0) 0%, rgba(248,249,250,1) 100%)",
                  }}
                />
              )}
            </div>
            {showToggle && (
              <button
                type="button"
                className="btn btn-link btn-sm px-0"
                onClick={() => setCollapsed((c) => !c)}
              >
                {collapsed ? "View full prompt" : "Collapse prompt"}
              </button>
            )}
          </div>
        )}

        <div className="border-top pt-2">{renderBody()}</div>
      </div>
    </div>
  );
}

