"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import "./GenerationQueue.css";

export default function GenerationQueue() {
  const [isOpen, setIsOpen] = useState(false);
  const [jobs, setJobs] = useState([]);

  // TODO: Connect to actual generation jobs state
  useEffect(() => {
    // This would connect to your generation context/state
    // For now, using empty array
  }, []);

  const activeJobs = jobs.filter(
    (job) => job.status === "generating" || job.status === "optimizing"
  );

  if (activeJobs.length === 0 && !isOpen) {
    return null;
  }

  return (
    <div className={`generation-queue ${isOpen ? "open" : ""}`}>
      <button
        className="generation-queue__toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Icon icon="solar:list-check-bold" className="queue-icon" />
        <span className="queue-count">
          Generation Queue ({activeJobs.length})
        </span>
        <Icon
          icon={isOpen ? "solar:alt-arrow-up" : "solar:alt-arrow-down"}
          className="toggle-icon"
        />
      </button>

      {isOpen && (
        <div className="generation-queue__content">
          {activeJobs.length === 0 ? (
            <div className="generation-queue__empty">
              No active generations
            </div>
          ) : (
            <div className="generation-queue__list">
              {activeJobs.map((job) => (
                <div key={job.id} className="generation-queue__item">
                  <div className="queue-item__info">
                    <div className="queue-item__type">{job.type}</div>
                    <div className="queue-item__name">{job.name}</div>
                  </div>
                  {job.progress !== undefined && (
                    <div className="queue-item__progress">
                      <div
                        className="progress-bar"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                  )}
                  <div className="queue-item__status">{job.status}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

