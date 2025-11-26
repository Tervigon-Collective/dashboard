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
      // On initial open, scroll to top
      if (!insights) {
        scrollRef.current.scrollTop = 0;
      } else {
        // During streaming, scroll to bottom to show latest content
        // Use requestAnimationFrame to ensure DOM has updated
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        });
      }
    }
  }, [open, insights, insights?.explanation, insights?._updateTimestamp]);

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
    <div className="insights-overlay-popup" onClick={handleOverlayClick}>
      <div className="insights-popup" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <header className="insights-header-popup">
          <div className="insights-brand-popup">
            <Icon
              icon="mdi:lightbulb-on-outline"
              style={{ fontSize: "18px", color: "#FFA726" }}
            />
            <h5 style={{ margin: 0, fontSize: "14px", fontWeight: "600" }}>AI Insights</h5>
          </div>
          <button
            type="button"
            className="insights-close-popup"
            onClick={handleClose}
            aria-label="Close Insights"
          >
            <Icon icon="mdi:close" style={{ fontSize: "18px" }} />
          </button>
        </header>

        <main className="insights-body-popup" ref={scrollRef}>
          {loading && !insights && (
            <div className="insights-loading-popup">
              <div className="insights-typing-popup">
                <span />
                <span />
                <span />
              </div>
              <p style={{ fontSize: "12px", margin: 0 }}>Analyzing data and generating insights...</p>
            </div>
          )}

          {loading && insights && (
            <div className="insights-loading-popup" style={{ padding: "8px 0", marginBottom: "12px" }}>
              <div className="insights-typing-popup" style={{ marginBottom: "4px" }}>
                <span />
                <span />
                <span />
              </div>
              <p style={{ fontSize: "11px", margin: 0, color: "#666" }}>Streaming insights...</p>
            </div>
          )}

          {error && (
            <div className="insights-error-popup">
              <Icon icon="mdi:alert-circle" className="me-2" style={{ fontSize: "16px" }} />
              <div style={{ fontSize: "12px" }}>
                <strong>Error:</strong> {error}
              </div>
            </div>
          )}

          {!error && insights && (
            <>
              {/* Explanation Section - Always show if insights exists, even if empty (for streaming) */}
              <section className="insights-section-popup">
                <div className="insights-section-header-popup">
                  <Icon icon="mdi:information-outline" style={{ fontSize: "16px" }} />
                  <h6 style={{ margin: 0, fontSize: "13px", fontWeight: "600" }}>Analysis</h6>
                  {(insights.explanation || insights.answer || insights.insights?.summary || insights.insights?.explanation) && (
                    <button
                      type="button"
                      className="insights-copy-btn-popup"
                      onClick={() => handleCopyToClipboard(
                        insights.explanation || insights.answer || insights.insights?.summary || insights.insights?.explanation || ""
                      )}
                      title="Copy to clipboard"
                    >
                      <Icon icon="mdi:content-copy" style={{ fontSize: "14px" }} />
                    </button>
                  )}
                </div>
                <div className="insights-content-popup">
                  <p 
                    key={`explanation-${insights?._updateTimestamp || Date.now()}`}
                    style={{ whiteSpace: "pre-wrap", fontSize: "12px", lineHeight: "1.5", margin: 0 }}
                  >
                    {insights.explanation || insights.answer || insights.insights?.summary || insights.insights?.explanation || 
                     (loading ? "Generating insights..." : "No explanation available yet.")}
                  </p>
                </div>
              </section>

              {/* Key Points Section - Check nested structure too */}
              {((insights.key_points && insights.key_points.length > 0) || 
                (insights.insights?.findings && Array.isArray(insights.insights.findings))) && (
                <section className="insights-section-popup">
                  <div className="insights-section-header-popup">
                    <Icon icon="mdi:key-variant" style={{ fontSize: "16px" }} />
                    <h6 style={{ margin: 0, fontSize: "13px", fontWeight: "600" }}>Key Points</h6>
                  </div>
                  <ul className="insights-key-points-popup">
                    {(insights.key_points || insights.insights?.findings || []).map((point, index) => (
                      <li key={index} style={{ fontSize: "12px", lineHeight: "1.5" }}>
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
                <section className="insights-section-popup">
                  <div className="insights-section-header-popup">
                    <Icon icon="mdi:lightbulb-on" style={{ fontSize: "16px" }} />
                    <h6 style={{ margin: 0, fontSize: "13px", fontWeight: "600" }}>Recommendations</h6>
                  </div>
                  <ul className="insights-recommendations-popup">
                    {(insights.recommendations || insights.insights?.recommendations || []).map((rec, index) => (
                      <li key={index} style={{ fontSize: "12px", lineHeight: "1.5" }}>
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
                <section className="insights-section-popup">
                  <div className="insights-section-header-popup">
                    <Icon icon="mdi:chart-line" style={{ fontSize: "16px" }} />
                    <h6 style={{ margin: 0, fontSize: "13px", fontWeight: "600" }}>Statistics</h6>
                  </div>
                  <div className="insights-statistics-popup">
                    {Object.entries(insights.statistics || insights.insights?.statistics || {}).map(([key, value]) => (
                      <div key={key} className="insights-stat-item-popup">
                        <span className="insights-stat-label-popup">
                          {key.replace(/_/g, " ").replace(/\b\w/g, (l) =>
                            l.toUpperCase()
                          )}
                          :
                        </span>
                        <span className="insights-stat-value-popup">
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
                <div className="insights-metadata-popup">
                  {(insights.metadata?.analysis_time || insights.insights?.metadata?.analysis_time) && (
                    <span style={{ fontSize: "11px" }}>
                      Analyzed:{" "}
                      {new Date(insights.metadata?.analysis_time || insights.insights?.metadata?.analysis_time).toLocaleString()}
                    </span>
                  )}
                  {(insights.metadata?.model_version || insights.insights?.metadata?.model_version) && (
                    <span style={{ fontSize: "11px" }}>Model: {insights.metadata?.model_version || insights.insights?.metadata?.model_version}</span>
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
                  <section className="insights-section-popup">
                    <div className="insights-section-header-popup">
                      <Icon icon="mdi:information-outline" style={{ fontSize: "16px" }} />
                      <h6 style={{ margin: 0, fontSize: "13px", fontWeight: "600" }}>Raw Response</h6>
                    </div>
                    <div className="insights-content-popup">
                      <p style={{ whiteSpace: "pre-wrap", fontSize: "12px" }}>
                        {JSON.stringify(insights, null, 2)}
                      </p>
                    </div>
                  </section>
                )}
              
              {/* Debug: Show if insights object exists but has no recognizable content */}
              {insights && 
               !insights.explanation && 
               !insights.answer && 
               !insights.insights?.summary && 
               !insights.insights?.explanation && 
               (!insights.key_points || insights.key_points.length === 0) && 
               (!insights.recommendations || insights.recommendations.length === 0) && 
               (!insights.statistics || Object.keys(insights.statistics).length === 0) && (
                <div className="insights-empty-popup" style={{ padding: "16px", textAlign: "center" }}>
                  <Icon icon="mdi:information-outline" style={{ fontSize: "20px", marginBottom: "8px" }} />
                  <p style={{ fontSize: "12px", margin: 0, color: "#666" }}>
                    Insights are being generated. Please wait...
                  </p>
                  <details style={{ marginTop: "12px", fontSize: "11px", textAlign: "left" }}>
                    <summary style={{ cursor: "pointer", color: "#999" }}>Debug Info</summary>
                    <pre style={{ fontSize: "10px", overflow: "auto", maxHeight: "200px", marginTop: "8px" }}>
                      {JSON.stringify(insights, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </>
          )}

          {!loading && !error && !insights && (
            <div className="insights-empty-popup">
              <Icon icon="mdi:information-outline" style={{ fontSize: "20px" }} />
              <p style={{ fontSize: "12px", margin: 0 }}>No insights available. Please try again.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );

  return createPortal(modalContent, modalRootRef.current);
};

export default InsightsModal;
