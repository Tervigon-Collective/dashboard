"use client";

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import clsx from "clsx";

/**
 * Generic Insights Modal Component
 * Displays AI-generated insights in a modal overlay
 */
const InsightsModal = ({ open, onClose, insights, loading, error }) => {
  const modalRootRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!modalRootRef.current) {
      const element = document.getElementById("insights-modal-root");
      if (element) {
        modalRootRef.current = element;
      } else {
        const created = document.createElement("div");
        created.id = "insights-modal-root";
        document.body.appendChild(created);
        modalRootRef.current = created;
      }
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current && open) {
      scrollRef.current.scrollTop = 0;
    }
  }, [open, insights]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  };

  const handleCopyToClipboard = (text) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        // You could add a toast notification here
        console.log("Copied to clipboard");
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
      });
  };

  if (!open || !modalRootRef.current) {
    return null;
  }

  const modalContent = (
    <div className="insights-overlay" onClick={handleOverlayClick}>
      <div className="insights-drawer" role="dialog" aria-modal="true">
        <header className="insights-header">
          <div className="insights-brand">
            <Icon
              icon="mdi:lightbulb-on-outline"
              style={{ fontSize: "24px", color: "#FFA726" }}
            />
            <div>
              <h4>AI Insights</h4>
            </div>
          </div>
          <button
            type="button"
            className="insights-close"
            onClick={handleClose}
            aria-label="Close Insights"
          >
            ×
          </button>
        </header>

        <main className="insights-body" ref={scrollRef}>
          {loading && (
            <div className="insights-loading">
              <div className="insights-typing">
                <span />
                <span />
                <span />
              </div>
              <p>Analyzing data and generating insights...</p>
            </div>
          )}

          {error && (
            <div className="insights-error">
              <Icon icon="mdi:alert-circle" className="me-2" />
              <div>
                <strong>Error:</strong> {error}
              </div>
            </div>
          )}

          {!loading && !error && insights && (
            <>
              {/* Explanation Section - Check multiple possible response formats */}
              {(insights.explanation || insights.answer || insights.insights?.summary || insights.insights?.explanation) && (
                <section className="insights-section">
                  <div className="insights-section-header">
                    <Icon icon="mdi:information-outline" />
                    <h5>Analysis</h5>
                    {(insights.explanation || insights.answer || insights.insights?.summary || insights.insights?.explanation) && (
                      <button
                        type="button"
                        className="insights-copy-btn"
                        onClick={() => handleCopyToClipboard(
                          insights.explanation || insights.answer || insights.insights?.summary || insights.insights?.explanation || ""
                        )}
                        title="Copy to clipboard"
                      >
                        <Icon icon="mdi:content-copy" />
                      </button>
                    )}
                  </div>
                  <div className="insights-content">
                    <p style={{ whiteSpace: "pre-wrap" }}>
                      {insights.explanation || insights.answer || insights.insights?.summary || insights.insights?.explanation}
                    </p>
                  </div>
                </section>
              )}

              {/* Key Points Section - Check nested structure too */}
              {((insights.key_points && insights.key_points.length > 0) || 
                (insights.insights?.findings && Array.isArray(insights.insights.findings))) && (
                <section className="insights-section">
                  <div className="insights-section-header">
                    <Icon icon="mdi:key-variant" />
                    <h5>Key Points</h5>
                  </div>
                  <ul className="insights-key-points">
                    {(insights.key_points || insights.insights?.findings || []).map((point, index) => (
                      <li key={index}>
                        {typeof point === "string" 
                          ? point 
                          : point.title || point.description || point.text || JSON.stringify(point)}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Recommendations Section - Check nested structure too */}
              {((insights.recommendations && insights.recommendations.length > 0) ||
                (insights.insights?.recommendations && Array.isArray(insights.insights.recommendations))) && (
                <section className="insights-section">
                  <div className="insights-section-header">
                    <Icon icon="mdi:lightbulb-on" />
                    <h5>Recommendations</h5>
                  </div>
                  <ul className="insights-recommendations">
                    {(insights.recommendations || insights.insights?.recommendations || []).map((rec, index) => (
                      <li key={index}>
                        {typeof rec === "string" 
                          ? rec 
                          : rec.action || rec.text || rec.description || JSON.stringify(rec)}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Statistics Section - Check nested structure too */}
              {((insights.statistics && Object.keys(insights.statistics).length > 0) ||
                (insights.insights?.statistics && Object.keys(insights.insights.statistics).length > 0)) && (
                <section className="insights-section">
                  <div className="insights-section-header">
                    <Icon icon="mdi:chart-line" />
                    <h5>Statistics</h5>
                  </div>
                  <div className="insights-statistics">
                    {Object.entries(insights.statistics || insights.insights?.statistics || {}).map(([key, value]) => (
                      <div key={key} className="insights-stat-item">
                        <span className="insights-stat-label">
                          {key.replace(/_/g, " ").replace(/\b\w/g, (l) =>
                            l.toUpperCase()
                          )}
                          :
                        </span>
                        <span className="insights-stat-value">
                          {typeof value === "number"
                            ? value.toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                              })
                            : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Metadata */}
              {(insights.metadata || insights.insights?.metadata) && (
                <div className="insights-metadata">
                  {(insights.metadata?.analysis_time || insights.insights?.metadata?.analysis_time) && (
                    <span>
                      Analyzed:{" "}
                      {new Date(insights.metadata?.analysis_time || insights.insights?.metadata?.analysis_time).toLocaleString()}
                    </span>
                  )}
                  {(insights.metadata?.model_version || insights.insights?.metadata?.model_version) && (
                    <span>Model: {insights.metadata?.model_version || insights.insights?.metadata?.model_version}</span>
                  )}
                </div>
              )}

              {/* Fallback: If insights structure is completely different, show raw content */}
              {!insights.explanation &&
                !insights.answer &&
                !insights.insights?.summary &&
                !insights.insights?.explanation &&
                !insights.key_points &&
                !insights.recommendations &&
                insights && (
                  <section className="insights-section">
                    <div className="insights-content">
                      <p style={{ whiteSpace: "pre-wrap" }}>
                        {JSON.stringify(insights, null, 2)}
                      </p>
                    </div>
                  </section>
                )}
            </>
          )}

          {!loading && !error && !insights && (
            <div className="insights-empty">
              <Icon icon="mdi:information-outline" />
              <p>No insights available. Please try again.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );

  return createPortal(modalContent, modalRootRef.current);
};

export default InsightsModal;
