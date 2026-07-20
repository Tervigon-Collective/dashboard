"use client";

import { Icon } from "@iconify/react";

function formatUpdatedAt(timestamp) {
  if (!timestamp) return null;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));
}

export default function DashboardRefreshButton({
  onRefresh,
  isFetching = false,
  dataUpdatedAt,
  label = "Refresh data",
  className = "",
}) {
  return (
    <div
      className={`d-flex align-items-center justify-content-end gap-2 flex-shrink-0 ${className}`}
    >
      {dataUpdatedAt ? (
        <span className="text-secondary-light small">
          Updated {formatUpdatedAt(dataUpdatedAt)}
        </span>
      ) : null}
      <button
        type="button"
        className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
        onClick={onRefresh}
        disabled={isFetching}
        title={label}
      >
        <Icon
          icon="mdi:refresh"
          className={isFetching ? "spin" : ""}
          style={{
            fontSize: 18,
            animation: isFetching ? "spin 1s linear infinite" : undefined,
          }}
        />
        {isFetching ? "Refreshing…" : "Refresh"}
      </button>
      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
