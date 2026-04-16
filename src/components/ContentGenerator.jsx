"use client";
import { useState, useEffect } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import Modal from "react-modal";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useGeneration } from "@/contexts/GenerationContext";
import { useBrief } from "@/contexts/BriefContext";
import GenerationResultsModal from "./GenerationResultsModal";

// Set Modal app element
if (typeof window !== "undefined") {
  Modal.setAppElement("body");
}

/**
 * Content Generator Component
 * Generates video and graphic content from creative briefs
 * @param {Object} props
 * @param {string} props.briefId - Creative brief ID
 */
export default function ContentGenerator({ briefId }) {
  const [selectedType, setSelectedType] = useState("video"); // 'video' | 'graphic'
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    activeGenerations,
    completedGenerations,
    startVideoGeneration,
    startGraphicGeneration,
    checkGenerationStatus,
    getGenerationsByType,
  } = useGeneration();

  const { currentBrief, fetchBrief } = useBrief();

  // Load brief when component mounts
  useEffect(() => {
    if (briefId && !currentBrief) {
      fetchBrief(briefId);
    }
  }, [briefId, currentBrief, fetchBrief]);

  // Poll for generation status updates
  useEffect(() => {
    const interval = setInterval(() => {
      activeGenerations.forEach((job) => {
        if (job.status === "pending" || job.status === "generating") {
          checkGenerationStatus(job.id);
        }
        // Note: "pending_review" status jobs are kept in activeGenerations but polling stops
        // as they are waiting for user review action, not backend processing
      });
    }, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [activeGenerations, checkGenerationStatus]);

  // Handle start generation
  const handleStartGeneration = async () => {
    if (!currentBrief) {
      toast.error("No brief selected");
      return;
    }

    setIsGenerating(true);

    try {
      let jobId;

      if (selectedType === "video") {
        jobId = await startVideoGeneration(briefId);
        toast.success("Video generation started!");
      } else {
        jobId = await startGraphicGeneration(briefId);
        toast.success("Graphic generation started!");
      }

      // Poll for this specific job
      const pollInterval = setInterval(async () => {
        try {
          await checkGenerationStatus(jobId);
          const job = getGenerationsByType(selectedType).find(
            (j) => j.id === jobId
          );
          if (job && (job.status === "completed" || job.status === "failed" || job.status === "pending_review")) {
            clearInterval(pollInterval);
            setIsGenerating(false);
            if (job.status === "completed") {
              toast.success("Generation completed!");
            } else if (job.status === "pending_review") {
              toast.success("Generation ready for review!");
            } else {
              toast.error("Generation failed");
            }
          }
        } catch (error) {
          console.error("Error checking generation status:", error);
          clearInterval(pollInterval);
          setIsGenerating(false);
        }
      }, 2000);
    } catch (error) {
      console.error("Error starting generation:", error);
      toast.error(`Failed to start generation: ${error.message}`);
      setIsGenerating(false);
    }
  };

  // Get jobs for current type
  const activeJobs = getGenerationsByType(selectedType).filter(
    (job) => job.status === "pending" || job.status === "generating"
  );

  const completedJobs = getGenerationsByType(selectedType).filter(
    (job) => job.status === "completed"
  );

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return (
          <Icon
            icon="solar:check-circle-bold"
            width="18"
            height="18"
            className="text-success"
          />
        );
      case "failed":
        return (
          <Icon
            icon="solar:danger-circle-bold"
            width="18"
            height="18"
            className="text-danger"
          />
        );
      case "generating":
        return (
          <Icon
            icon="solar:refresh-bold"
            width="18"
            height="18"
            className="text-primary"
          />
        );
      default:
        return (
          <Icon
            icon="solar:clock-circle-bold"
            width="18"
            height="18"
            className="text-muted"
          />
        );
    }
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "completed":
        return "bg-success";
      case "failed":
        return "bg-danger";
      case "generating":
        return "bg-primary";
      default:
        return "bg-secondary";
    }
  };

  // Handle view results
  const handleViewResults = (jobId) => {
    setSelectedJobId(jobId);
    setIsModalOpen(true);
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Generation Controls Card */}
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="card-title mb-0 d-flex align-items-center">
            <Icon
              icon={
                selectedType === "video"
                  ? "solar:video-library-bold"
                  : "solar:gallery-bold"
              }
              width="20"
              height="20"
              className="me-2"
            />
            Generate {selectedType === "video" ? "Video" : "Graphic"} Content
          </h5>
        </div>
        <div className="card-body">
          {/* Type Selection Tabs */}
          <div className="mb-4">
            <div className="btn-group w-100" role="group">
              <button
                type="button"
                className={`btn ${
                  selectedType === "video"
                    ? "btn-primary"
                    : "btn-outline-primary"
                }`}
                onClick={() => setSelectedType("video")}
              >
                <Icon
                  icon="solar:video-library-bold"
                  width="18"
                  height="18"
                  className="me-2"
                />
                Video
              </button>
              <button
                type="button"
                className={`btn ${
                  selectedType === "graphic"
                    ? "btn-primary"
                    : "btn-outline-primary"
                }`}
                onClick={() => setSelectedType("graphic")}
              >
                <Icon
                  icon="solar:gallery-bold"
                  width="18"
                  height="18"
                  className="me-2"
                />
                Graphic
              </button>
            </div>
          </div>

          {/* Generation Info & Button */}
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <h6 className="mb-1">
                {selectedType === "video"
                  ? "Video Plan Generation"
                  : "Graphic Plan Generation"}
              </h6>
              <p className="text-muted mb-0 small">
                AI will create a detailed {selectedType} plan based on your
                creative brief
              </p>
            </div>
            <button
              className="btn btn-primary d-inline-flex align-items-center"
              onClick={handleStartGeneration}
              disabled={isGenerating || !currentBrief}
            >
              {isGenerating ? (
                <>
                  <Icon
                    icon="solar:refresh-bold"
                    width="18"
                    height="18"
                    className="me-2"
                  />
                  Generating...
                </>
              ) : (
                <>
                  <Icon
                    icon="solar:play-bold"
                    width="18"
                    height="18"
                    className="me-2"
                  />
                  Start Generation
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Active Generations */}
      {activeJobs.length > 0 && (
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="card-title mb-0">Active Generations</h5>
          </div>
          <div className="card-body">
            {activeJobs.map((job) => (
              <div key={job.id} className="mb-4">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="d-flex align-items-center">
                    {getStatusIcon(job.status)}
                    <div className="ms-3">
                      <p className="mb-0 fw-medium">
                        {job.type === "video" ? "Video Plan" : "Graphic Plan"} -{" "}
                        {job.planId}
                      </p>
                      <small className="text-muted">
                        Started {job.createdAt.toLocaleTimeString()}
                      </small>
                    </div>
                  </div>
                  <span className={`badge ${getStatusBadgeClass(job.status)}`}>
                    {job.status}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="progress mb-2" style={{ height: "8px" }}>
                  <div
                    className="progress-bar progress-bar-striped progress-bar-animated"
                    role="progressbar"
                    style={{ width: `${job.progress}%` }}
                    aria-valuenow={job.progress}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  />
                </div>
                <small className="text-muted">{job.progress}% complete</small>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Generations */}
      {completedJobs.length > 0 && (
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="card-title mb-0">Completed Generations</h5>
          </div>
          <div className="card-body">
            {completedJobs.map((job) => (
              <div
                key={job.id}
                className="d-flex align-items-center justify-content-between p-3 border rounded mb-3"
              >
                <div className="d-flex align-items-center">
                  {getStatusIcon(job.status)}
                  <div className="ms-3">
                    <p className="mb-0 fw-medium">
                      {job.type === "video" ? "Video Plan" : "Graphic Plan"} -{" "}
                      {job.planId}
                    </p>
                    <small className="text-muted">
                      Completed {job.updatedAt.toLocaleTimeString()}
                    </small>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className={`badge ${getStatusBadgeClass(job.status)}`}>
                    {job.status}
                  </span>
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => handleViewResults(job.id)}
                  >
                    <Icon
                      icon="solar:eye-bold"
                      width="16"
                      height="16"
                      className="me-1"
                    />
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {activeJobs.length === 0 &&
        completedJobs.length === 0 &&
        selectedBriefId && (
          <div className="card">
            <div className="card-body text-center py-5">
              <Icon
                icon={
                  selectedType === "video"
                    ? "solar:video-library-bold"
                    : "solar:gallery-bold"
                }
                width="80"
                height="80"
                className="text-muted mb-3"
              />
              <h5 className="mb-2">No {selectedType} generations yet</h5>
              <p className="text-muted mb-4">
                Start generating {selectedType} content based on your creative
                brief
              </p>
              <button
                className="btn btn-primary"
                onClick={handleStartGeneration}
                disabled={!currentBrief}
              >
                <Icon
                  icon="solar:play-bold"
                  width="18"
                  height="18"
                  className="me-2"
                />
                Generate {selectedType === "video" ? "Video" : "Graphic"} Plan
              </button>
            </div>
          </div>
        )}

      {/* Results Modal */}
      {selectedJobId && (
        <GenerationResultsModal
          jobId={selectedJobId}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedJobId(null);
          }}
        />
      )}
    </>
  );
}
