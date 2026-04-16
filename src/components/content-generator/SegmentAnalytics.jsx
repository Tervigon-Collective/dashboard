"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import config from "@/config";
import "./SegmentAnalytics.css";

const SEGMENT_ROLES = {
  S1: { name: "Hook", color: "#FF6B6B" },
  S2: { name: "Message", color: "#4ECDC4" },
  S3: { name: "Proof", color: "#45B7D1" },
  S4: { name: "CTA", color: "#FFA07A" },
};

export default function SegmentAnalytics({ adId, jobId }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (adId || jobId) {
      fetchMetrics();
    }
  }, [adId, jobId]);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);

    try {
      const endpoint = adId
        ? `${config.pythonApi.baseURL}/metrics/ad/${adId}`
        : `${config.pythonApi.baseURL}/metrics/job/${jobId}`;

      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.statusText}`);
      }

      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      console.error("Failed to fetch metrics:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="segment-analytics">
        <div className="analytics-loading">
          <Icon icon="solar:loading-bold" className="spinning" />
          <span>Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="segment-analytics">
        <div className="analytics-error">
          <Icon icon="solar:danger-circle-bold" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="segment-analytics">
        <div className="analytics-empty">
          <Icon icon="solar:chart-2-bold" />
          <span>No metrics available yet</span>
        </div>
      </div>
    );
  }

  const segmentMetrics = metrics.segment_metrics || {};
  const aggregated = metrics.aggregated || {};

  return (
    <div className="segment-analytics">
      <div className="analytics-header">
        <h4>
          <Icon icon="solar:chart-2-bold" />
          Segment Performance
        </h4>
        <button className="btn-refresh" onClick={fetchMetrics}>
          <Icon icon="solar:refresh-bold" />
          Refresh
        </button>
      </div>

      {/* Overall Performance */}
      <div className="aggregated-stats">
        <div className="stat-card">
          <Icon icon="solar:eye-bold" className="stat-icon" />
          <div className="stat-content">
            <span className="stat-label">Total Impressions</span>
            <span className="stat-value">{aggregated.total_impressions?.toLocaleString() || "N/A"}</span>
          </div>
        </div>

        <div className="stat-card">
          <Icon icon="solar:play-circle-bold" className="stat-icon" />
          <div className="stat-content">
            <span className="stat-label">Avg 3s View Rate</span>
            <span className="stat-value">
              {aggregated.avg_three_sec_view_rate
                ? `${(aggregated.avg_three_sec_view_rate * 100).toFixed(1)}%`
                : "N/A"}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <Icon icon="solar:cursor-bold" className="stat-icon" />
          <div className="stat-content">
            <span className="stat-label">Avg CTR</span>
            <span className="stat-value">
              {aggregated.avg_ctr ? `${(aggregated.avg_ctr * 100).toFixed(2)}%` : "N/A"}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <Icon icon="solar:dollar-bold" className="stat-icon" />
          <div className="stat-content">
            <span className="stat-label">Total Spend</span>
            <span className="stat-value">${aggregated.total_spend?.toFixed(2) || "0.00"}</span>
          </div>
        </div>
      </div>

      {/* Segment-Level Metrics */}
      <div className="segments-grid">
        {["S1", "S2", "S3", "S4"].map((segmentId) => {
          const segment = segmentMetrics[segmentId];
          const role = SEGMENT_ROLES[segmentId];

          if (!segment) {
            return (
              <div key={segmentId} className="segment-metrics-card" style={{ "--segment-color": role.color }}>
                <div className="segment-card-header">
                  <span className="segment-badge">{segmentId}</span>
                  <span className="segment-role-name">{role.name}</span>
                </div>
                <div className="no-data">No data available</div>
              </div>
            );
          }

          return (
            <div key={segmentId} className="segment-metrics-card" style={{ "--segment-color": role.color }}>
              <div className="segment-card-header">
                <span className="segment-badge">{segmentId}</span>
                <span className="segment-role-name">{role.name}</span>
              </div>

              <div className="metrics-list">
                <div className="metric-row">
                  <span className="metric-label">Impressions</span>
                  <strong className="metric-value">{segment.impressions?.toLocaleString() || "0"}</strong>
                </div>

                <div className="metric-row">
                  <span className="metric-label">3s View Rate</span>
                  <strong className="metric-value">
                    {segment.three_sec_view_rate
                      ? `${(segment.three_sec_view_rate * 100).toFixed(1)}%`
                      : "0%"}
                  </strong>
                </div>

                <div className="metric-row">
                  <span className="metric-label">Click Rate</span>
                  <strong className="metric-value">
                    {segment.click_through_rate
                      ? `${(segment.click_through_rate * 100).toFixed(2)}%`
                      : "0%"}
                  </strong>
                </div>

                {segment.completion_rate !== undefined && (
                  <div className="metric-row">
                    <span className="metric-label">Completion</span>
                    <strong className="metric-value">
                      {(segment.completion_rate * 100).toFixed(1)}%
                    </strong>
                  </div>
                )}
              </div>

              {/* Tag Performance */}
              {segment.tags && (
                <div className="tag-performance">
                  <h5>Tags</h5>
                  <div className="tag-list">
                    {segment.tags.intent_tag && (
                      <span className="mini-tag">{segment.tags.intent_tag}</span>
                    )}
                    {segment.tags.narrative_mode && (
                      <span className="mini-tag">{segment.tags.narrative_mode}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
