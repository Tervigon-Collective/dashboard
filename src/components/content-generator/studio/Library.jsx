"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import {
  getGeneratedContent,
  deleteGeneratedContent,
  editImage
} from "../../../services/contentGenerationApi";
import config from "../../../config";
import "./Library.css";

const LIBRARY_TABS = {
  all: "all",
  images: "images",
  videos: "videos",
};

// Helper function to normalize URLs
const normalizeUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  if (url.startsWith("/")) {
    // Use config.pythonApi.baseURL instead of hardcoded localhost
    const baseURL = config.pythonApi.baseURL.replace(/\/$/, ""); // Remove trailing slash if present
    return `${baseURL}${url}`;
  }
  return url;
};

export default function Library() {
  const [activeTab, setActiveTab] = useState(LIBRARY_TABS.all);
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  // Fetch assets from API
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getGeneratedContent();
        const content = response.content || [];

        // Flatten content_items from grouped data
        const flattenedAssets = [];
        content.forEach((run) => {
          const productName = run.product_name || "Product";
          const runId = run.run_id;
          const createdAt = run.created_at;

          // Add each content item as a separate asset
          if (run.content_items && run.content_items.length > 0) {
            run.content_items.forEach((item, index) => {
              flattenedAssets.push({
                id: `${runId}_${item.artifact_id || index}`,
                runId: runId,
                artifactId: item.artifact_id,
                type: item.content_type || "image",
                thumbnail: normalizeUrl(item.local_url || item.preview_url || item.url),
                name: productName,
                product: productName,
                createdAt: createdAt ? new Date(createdAt) : new Date(),
                downloadUrl: normalizeUrl(item.download_url),
                videoUrl: item.content_type === "video" ? normalizeUrl(item.video_url) : null,
                prompt: item.prompt || run.prompt || "",
              });
            });
          }
        });

        setAssets(flattenedAssets);
      } catch (err) {
        console.error("Error fetching library assets:", err);
        setError(err.message || "Failed to load library");
        setAssets([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, []);

  // Delete handler
  const handleDelete = async (asset) => {
    if (!confirm("Are you sure you want to delete this content? This action cannot be undone.")) {
      return;
    }

    try {
      // Optimistic update
      setAssets(assets.filter(a => a.id !== asset.id));

      await deleteGeneratedContent(asset.runId, asset.artifactId);
    } catch (err) {
      console.error("Error deleting content:", err);
      // Revert if failed
      setError("Failed to delete content. Please try again.");
      // In a real app we might want to refetch here
    }
  };

  // Edit state
  const [editingAsset, setEditingAsset] = useState(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [editAspectRatio, setEditAspectRatio] = useState("square_1_1");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Open edit modal
  const handleEditClick = (asset) => {
    setEditingAsset(asset);
    setEditPrompt("");
    setEditAspectRatio("square_1_1");
  };

  // Submit edit
  const handleEditSubmit = async () => {
    if (!editingAsset) return;

    try {
      setIsSubmittingEdit(true);
      await editImage(
        editingAsset.runId,
        editingAsset.artifactId,
        editPrompt,
        { aspect_ratio: editAspectRatio }
      );
      setEditingAsset(null);
      alert("Edit job started! Check the History tab for progress.");
    } catch (err) {
      console.error("Error starting edit:", err);
      alert("Failed to start edit job.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Play video state
  const [playingVideoId, setPlayingVideoId] = useState(null);

  // Filter and sort assets
  const filteredAssets = assets
    .filter((asset) => {
      // Filter by tab
      if (activeTab === "images" && asset.type !== "image") return false;
      if (activeTab === "videos" && asset.type !== "video") return false;

      // Filter by search query (product name)
      if (searchQuery && !asset.product.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt) - new Date(a.createdAt);
      } else if (sortBy === "oldest") {
        return new Date(a.createdAt) - new Date(b.createdAt);
      } else if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

  return (
    <div className="library-layout">
      {/* Tabs */}
      <div className="library-tabs">
        {Object.entries(LIBRARY_TABS).map(([key, value]) => (
          <button
            key={key}
            className={`library-tab ${activeTab === value ? "active" : ""}`}
            onClick={() => setActiveTab(value)}
          >
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </button>
        ))}
      </div>

      {/* Filters and Controls */}
      <div className="library-controls">
        <div className="library-filters">
          <input
            type="text"
            className="filter-input"
            placeholder="Search by product name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="library-view-controls">
          <select
            className="filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name">Name</option>
          </select>
          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}
            >
              <Icon icon="solar:widget-4-bold" />
            </button>
            <button
              className={`view-btn ${viewMode === "list" ? "active" : ""}`}
              onClick={() => setViewMode("list")}
            >
              <Icon icon="solar:list-bold" />
            </button>
          </div>
        </div>
      </div>

      {/* Assets Grid/List */}
      <div className="library-content">
        {loading ? (
          <div className="library-empty">
            <Icon icon="solar:refresh-bold" className="empty-icon spinning" />
            <p>Loading library...</p>
          </div>
        ) : error ? (
          <div className="library-empty">
            <Icon icon="solar:danger-circle-bold" className="empty-icon" />
            <p>Error loading library</p>
            <p className="empty-subtitle">{error}</p>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="library-empty">
            <Icon icon="solar:folder-bold" className="empty-icon" />
            <p>No assets found</p>
            <p className="empty-subtitle">
              {searchQuery ? "Try a different search" : "Generate content to see it here"}
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="assets-grid">
            {filteredAssets.map((asset) => (
              <div key={asset.id} className="asset-card">
                <div className="asset-thumbnail">
                  {asset.type === "video" && asset.videoUrl ? (
                    playingVideoId === asset.id ? (
                      <video
                        src={asset.videoUrl}
                        controls
                        autoPlay
                        className="asset-video-player"
                        onEnded={() => setPlayingVideoId(null)}
                      />
                    ) : (
                      <video src={asset.videoUrl} className="asset-video-preview" />
                    )
                  ) : asset.thumbnail ? (
                    <img
                      src={asset.thumbnail}
                      alt={asset.name}
                      onError={(e) => {
                        e.target.src = "/placeholder.jpg";
                      }}
                    />
                  ) : (
                    <div className="asset-placeholder">
                      <Icon icon="solar:gallery-bold" />
                    </div>
                  )}

                  {/* Overlay Actions - Only show if NOT playing video */}
                  {playingVideoId !== asset.id && (
                    <div className="asset-overlay">
                      <div className="asset-actions">
                        {/* Edit Button (Graphics only) */}
                        {asset.type === "image" && (
                          <button
                            className="asset-action-btn"
                            title="Edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(asset);
                            }}
                          >
                            <Icon icon="solar:pen-bold" />
                          </button>
                        )}

                        {/* Download Button */}
                        {asset.downloadUrl && (
                          <a
                            href={asset.downloadUrl}
                            download
                            className="asset-action-btn"
                            title="Download"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Icon icon="solar:download-bold" />
                          </a>
                        )}

                        {/* Play Button (Videos only) */}
                        {asset.type === "video" && asset.videoUrl && (
                          <button
                            className="asset-action-btn"
                            title="Play"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPlayingVideoId(asset.id);
                            }}
                          >
                            <Icon icon="solar:play-circle-bold" />
                          </button>
                        )}

                        {/* Delete Button */}
                        <button
                          className="asset-action-btn delete-btn"
                          title="Delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(asset);
                          }}
                        >
                          <Icon icon="solar:trash-bin-trash-bold" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="asset-info">
                  <div className="asset-name">{asset.name}</div>
                  <div className="asset-meta">
                    <span className="asset-type">{asset.type}</span>
                    <span className="asset-date">
                      {new Date(asset.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (

          <div className="assets-list">
            {filteredAssets.map((asset) => (
              <div key={asset.id} className="asset-list-item">
                <div className="asset-list-thumbnail">
                  {asset.type === "video" && asset.videoUrl ? (
                    <video src={asset.videoUrl} />
                  ) : asset.thumbnail ? (
                    <img
                      src={asset.thumbnail}
                      alt={asset.name}
                      onError={(e) => {
                        e.target.src = "/placeholder.jpg";
                      }}
                    />
                  ) : (
                    <div className="asset-placeholder">
                      <Icon icon="solar:gallery-bold" />
                    </div>
                  )}
                </div>
                <div className="asset-list-info">
                  <div className="asset-list-name">{asset.name}</div>
                  <div className="asset-list-meta">
                    <span>{asset.type}</span>
                    <span>•</span>
                    <span>{new Date(asset.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="asset-list-actions">
                  {/* Edit Button (Graphics only) */}
                  {asset.type === "image" && (
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(asset);
                      }}
                    >
                      <Icon icon="solar:pen-bold" />
                      Edit
                    </button>
                  )}

                  {asset.downloadUrl && (
                    <a
                      href={asset.downloadUrl}
                      download
                      className="btn btn-sm btn-outline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Icon icon="solar:download-bold" />
                      Download
                    </a>
                  )}

                  {/* Delete Button */}
                  <button
                    className="btn btn-sm btn-outline text-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(asset);
                    }}
                  >
                    <Icon icon="solar:trash-bin-trash-bold" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal / Overlay */}
      {editingAsset && (
        <div className="edit-modal-overlay">
          <div className="edit-modal">
            <div className="edit-modal-header">
              <div className="edit-modal-title">Edit Graphic</div>
              <button
                className="close-btn"
                onClick={() => setEditingAsset(null)}
              >
                <Icon icon="solar:close-circle-bold" />
              </button>
            </div>

            <div className="edit-modal-body">
              <div className="edit-preview">
                <img src={editingAsset.thumbnail} alt="Original" />
              </div>

              <div className="edit-form">
                <div className="form-group">
                  <label>Describe the changes you want:</label>
                  <textarea
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder="Make it brighter with more vibrant colors..."
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label>Aspect ratio:</label>
                  <div className="aspect-ratio-options">
                    {[
                      { id: "square_1_1", label: "1:1", icon: "solar:smartphone-bold" },
                      { id: "portrait_3_4", label: "3:4", icon: "solar:smartphone-bold" },
                      { id: "classic_4_3", label: "4:3", icon: "solar:monitor-bold" },
                      { id: "widescreen_16_9", label: "16:9", icon: "solar:monitor-bold" },
                      { id: "social_story_9_16", label: "9:16", icon: "solar:smartphone-bold" },
                      { id: "portrait_2_3", label: "2:3", icon: "solar:smartphone-bold" },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        className={`aspect-option ${editAspectRatio === opt.id ? "active" : ""}`}
                        onClick={() => setEditAspectRatio(opt.id)}
                      >
                        <Icon icon={opt.icon} className={opt.id === "widescreen_16_9" ? "rotate-90" : ""} />
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="edit-modal-footer">
              <button
                className="btn btn-outline"
                onClick={() => setEditingAsset(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleEditSubmit}
                disabled={isSubmittingEdit}
              >
                {isSubmittingEdit ? (
                  <>
                    <Icon icon="solar:refresh-bold" className="spinning" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Icon icon="solar:magic-stick-3-bold" />
                    Generate Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

