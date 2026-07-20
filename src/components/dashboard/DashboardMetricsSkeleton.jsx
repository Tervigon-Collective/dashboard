"use client";

const skeletonBase = {
  backgroundColor: "#e5e7eb",
  borderRadius: "6px",
  animation: "skeletonPulse 1.5s ease-in-out infinite",
};

function SkeletonBar({ width = "100%", height = 18, style = {} }) {
  return (
    <span
      style={{ ...skeletonBase, display: "block", width, height, ...style }}
    />
  );
}

function MetricCardSkeleton({ breakdownRows = 3 }) {
  return (
    <div className="col">
      <div className="card shadow-none border h-100">
        <div className="card-body p-20">
          <div className="d-flex flex-wrap align-items-start justify-content-between gap-3">
            <div className="flex-grow-1" style={{ minWidth: 0 }}>
              <SkeletonBar width="50%" height={14} />
              <div className="mt-3">
                <SkeletonBar width="65%" height={36} />
              </div>
            </div>
            <span
              style={{
                ...skeletonBase,
                width: 50,
                height: 50,
                borderRadius: "50%",
                flexShrink: 0,
              }}
            />
          </div>
          <div
            className="my-3"
            style={{
              height: 1,
              background: "#e5e7eb",
              opacity: 0.8,
            }}
          />
          <div className="d-flex flex-column" style={{ gap: 8 }}>
            {Array.from({ length: breakdownRows }).map((_, i) => (
              <SkeletonBar key={i} width="88%" height={18} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const CARD_BREAKDOWN_ROWS = [3, 3, 2, 3, 3, 2, 2, 2, 2, 4];

export default function DashboardMetricsSkeleton({ cardCount = 10 }) {
  return (
    <div
      className="row row-cols-xxxl-5 row-cols-lg-3 row-cols-sm-2 row-cols-1 gy-4 w-100"
      aria-busy="true"
      aria-label="Loading dashboard metrics"
    >
      {Array.from({ length: cardCount }).map((_, i) => (
        <MetricCardSkeleton
          key={i}
          breakdownRows={CARD_BREAKDOWN_ROWS[i] ?? 3}
        />
      ))}
    </div>
  );
}
