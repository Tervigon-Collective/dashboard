"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { getGeneratedContent } from "@/services/contentGenerationApi";
import config from "@/config";
import "./History.css";

const normalizeUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = (config?.pythonApi?.baseURL || "").replace(/\/+$/, "");
  let path = url.startsWith("/") ? url : `/${url}`;
  return `${base}${path}`;
};

export default function History() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("latest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch jobs from API
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getGeneratedContent();
        const content = response.content || [];

        // Transform backend data to UI format
        // Backend now returns grouped content by run_id with product_name
        const transformedJobs = content.map((item) => {
          // Use product_name from backend (extracted from brief)
          const productName = item.product_name || "Product";

          // Determine content type from first content item
          const firstContentItem = item.content_items?.[0];
          const contentType = firstContentItem?.content_type || "graphic";
          const typeTag = contentType === "video" ? "video" : "graphic";

          // Get thumbnail from first content item
          let thumbnail = null;
          if (firstContentItem) {
            if (contentType === "video") {
              thumbnail = normalizeUrl(firstContentItem.preview_url || firstContentItem.local_url);
            } else {
              thumbnail = normalizeUrl(firstContentItem.local_url || firstContentItem.url || firstContentItem.image_url);
            }
          }

          return {
            id: item.id || item.run_id,
            runId: item.run_id,
            type: typeTag,
            status: "completed",
            productName: productName,
            createdAt: item.created_at ? new Date(item.created_at) : new Date(),
            thumbnail: thumbnail,
            prompt: item.prompt || "",
            contentItems: item.content_items || [],
            itemCount: item.item_count || item.content_items?.length || 0,
            metadata: item.metadata || {},
          };
        });

        setJobs(transformedJobs);
      } catch (err) {
        console.error("Error fetching generated content:", err);
        setError(err.message || "Failed to load history");
        setJobs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  const filteredJobs = jobs.filter((job) => {
    if (searchQuery && !job.productName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Map filter values to backend types
    if (typeFilter !== "all") {
      if (typeFilter === "image" && job.type !== "graphic") return false;
      if (typeFilter === "video" && job.type !== "video") return false;
      if (typeFilter === "idea") return false; // Ideas not in generated content
    }
    return true;
  });

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    if (sortBy === "latest") {
      return b.createdAt - a.createdAt;
    } else if (sortBy === "oldest") {
      return a.createdAt - b.createdAt;
    }
    return 0;
  });

  const formatDate = (date) => {
    if (!date) return "";
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      // Format as "Dec 8, 2025" to match image design
      return dateObj.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (e) {
      return "";
    }
  };

  return (
    <div className="history-layout">
      {/* Filters */}
      <div className="history-filters">
        <div className="filter-group">
          <Icon icon="solar:magnifer-outline" className="filter-icon" />
          <input
            type="text"
            className="filter-input"
            placeholder="Search by product name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">Type: All</option>
          <option value="image">Graphic</option>
          <option value="video">Video</option>
        </select>

        <select
          className="filter-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="latest">Sort: Latest</option>
          <option value="oldest">Oldest</option>
          <option value="most-used">Most Used</option>
        </select>
      </div>

      <div className="history-content">
        {/* Job List */}
        <div className="history-list">
          {loading ? (
            <div className="history-empty">
              <Icon icon="solar:history-bold" className="empty-icon" />
              <p>Loading...</p>
            </div>
          ) : error ? (
            <div className="history-empty">
              <Icon icon="solar:danger-triangle-bold" className="empty-icon" />
              <p>Error: {error}</p>
            </div>
          ) : sortedJobs.length === 0 ? (
            <div className="history-empty">
              <Icon icon="solar:history-bold" className="empty-icon" />
              <p>No generated content found</p>
            </div>
          ) : (
            <div className="job-list">
              {sortedJobs.map((job) => {
                const itemCountText = job.itemCount > 1
                  ? `${job.itemCount} ${job.type === 'video' ? 'videos' : 'images'}`
                  : `1 ${job.type === 'video' ? 'video' : 'image'}`;

                return (
                  <div
                    key={job.id}
                    className={`job-item ${selectedJob?.id === job.id ? "selected" : ""
                      }`}
                    onClick={() => setSelectedJob(job)}
                  >
                    {/* Icon on left - green checkmark for completed */}
                    <div className="job-icon">
                      <Icon icon="solar:check-circle-bold" className="icon-completed" />
                    </div>

                    <div className="job-info">
                      <div className="job-name">{job.productName}</div>
                      <div className="job-meta-row">
                        <span className="content-type-tag">{itemCountText}</span>
                        <span className="job-date">{formatDate(job.createdAt)}</span>
                      </div>
                    </div>

                    {/* Action button on right */}
                    <button
                      className="job-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedJob(job);
                      }}
                    >
                      <Icon icon="solar:eye-bold" />
                      View
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Details Panel */}
        {selectedJob && (
          <div className="history-details">
            <div className="details-header">
              <div className="details-title">
                {selectedJob.productName}
              </div>
              <button
                className="details-close"
                onClick={() => setSelectedJob(null)}
              >
                <Icon icon="solar:close-circle-bold" />
              </button>
            </div>

            <div className="details-content">
              <div className="details-section">
                <div className="details-label">Product Name</div>
                <div className="details-value">{selectedJob.productName}</div>
              </div>

              <div className="details-section">
                <div className="details-label">Content Type</div>
                <div className="details-value">
                  {selectedJob.itemCount} {selectedJob.type === 'video' ? 'video' : 'image'}{selectedJob.itemCount > 1 ? 's' : ''}
                </div>
              </div>

              <div className="details-section">
                <div className="details-label">Created Date</div>
                <div className="details-value">{formatDate(selectedJob.createdAt)}</div>
              </div>

              {selectedJob.prompt && (
                <div className="details-section">
                  <div className="details-label">Prompt / Storyboard</div>
                  <div className="details-value">
                    <div className="prompt-text">{selectedJob.prompt}</div>
                  </div>
                </div>
              )}

              <div className="details-section">
                <div className="details-label">Generated Content ({selectedJob.itemCount})</div>
                <div className="details-outputs-grid">
                  {selectedJob.contentItems && selectedJob.contentItems.map((contentItem, index) => {
                    const isVideo = contentItem.content_type === "video";

                    return (
                      <div key={contentItem.artifact_id || index} className="output-item">
                        {isVideo && contentItem.video_url ? (
                          <div className="output-video">
                            <video
                              src={normalizeUrl(contentItem.video_url)}
                              controls
                              style={{ width: "100%", maxHeight: "300px" }}
                            />
                          </div>
                        ) : contentItem.local_url || contentItem.url ? (
                          <div className="output-thumbnail">
                            <img
                              src={normalizeUrl(contentItem.local_url || contentItem.url)}
                              alt={`Output ${index + 1}`}
                              onError={(e) => {
                                e.target.src = "/placeholder.jpg";
                              }}
                            />
                          </div>
                        ) : (
                          <div className="output-thumbnail">
                            <Icon icon="solar:gallery-bold" className="empty-thumbnail-icon" />
                          </div>
                        )}

                        {/* Download button for each item */}
                        {contentItem.download_url && (
                          <a
                            href={normalizeUrl(contentItem.download_url)}
                            download
                            className="btn btn-sm btn-secondary"
                            style={{ textDecoration: "none", marginTop: "8px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Icon icon="solar:download-bold" />
                            Download
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



