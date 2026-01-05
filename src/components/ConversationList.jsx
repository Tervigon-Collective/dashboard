"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";

/**
 * ConversationList Component
 * ChatGPT-style sidebar for managing chat conversations and projects.
 * Shows Projects and Chats sections with clear labels and selected states.
 */
export default function ConversationList({
  conversations,
  currentConversationId,
  projects = [],
  currentProjectId,
  onCreateNew,
  onSelectConversation,
  onDeleteConversation,
  onSwitchProject,
  onCreateProject,
  onDeleteProject,
  loading = false,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [deletingProjectId, setDeletingProjectId] = useState(null);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showNewProjectInput, setShowNewProjectInput] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  
  const projectSelectorRef = useRef(null);
  const searchInputRef = useRef(null);

  // Filter conversations by search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) {
      return conversations;
    }
    const query = searchQuery.toLowerCase();
    return conversations.filter(conv =>
      conv.title?.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  // Close project dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        projectSelectorRef.current &&
        !projectSelectorRef.current.contains(event.target)
      ) {
        setShowProjectDropdown(false);
        setShowNewProjectInput(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDelete = async (conversationId, e) => {
    e.stopPropagation();
    
    if (!window.confirm("Are you sure you want to delete this conversation?")) {
      return;
    }

    try {
      setDeletingId(conversationId);
      await onDeleteConversation(conversationId);
    } catch (error) {
      console.error("Failed to delete conversation:", error);
      alert("Failed to delete conversation. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  const handleCreateProject = async (e) => {
    e.stopPropagation();
    if (!newProjectName.trim()) {
      return;
    }
    try {
      await onCreateProject(newProjectName.trim());
      setNewProjectName("");
      setShowNewProjectInput(false);
      setShowProjectDropdown(false);
    } catch (error) {
      console.error("Failed to create project:", error);
      alert("Failed to create project. Please try again.");
    }
  };

  const handleDeleteProject = async (projectId, projectName, e) => {
    e.stopPropagation();
    
    // Prevent deletion of default project
    if (projectId === "default") {
      alert("Cannot delete the default project.");
      return;
    }

    const count = projects.find(p => p.project_id === projectId)?.conversation_count
      ?? conversations.filter(conv => conv.project_id === projectId).length;

    const msg = count > 0
      ? `Delete "${projectName}" and its ${count} conversation(s)? This will permanently remove the project and all chats inside it.`
      : `Delete "${projectName}"? This action cannot be undone.`;

    if (!window.confirm(msg)) {
      return;
    }

    try {
      setDeletingProjectId(projectId);
      await onDeleteProject(projectId);
      setShowProjectDropdown(false);
    } catch (error) {
      console.error("Failed to delete project:", error);
      alert(error.message || "Failed to delete project. Please try again.");
    } finally {
      setDeletingProjectId(null);
    }
  };

  const currentProject = projects.find(p => p.project_id === currentProjectId) || projects[0];

  return (
    <div className="sp-chat-sidebar">
      {/* Top Section: New Chat Button */}
      <div className="sp-chat-sidebar__top">
        <button
          type="button"
          className="btn btn-outline-secondary w-100 btn-sm d-flex align-items-center justify-content-center gap-2"
          onClick={onCreateNew}
          disabled={loading}
          style={{
            borderRadius: "0.5rem",
            fontWeight: 400,
            borderColor: "#e5e7eb",
            color: "#374151",
          }}
        >
          <i className="ri-edit-2-line" style={{ fontSize: "1rem" }}></i>
          New chat
        </button>
      </div>

      {/* Search Section */}
      <div className="sp-chat-sidebar__search">
        <div className="position-relative">
          <i 
            className="ri-search-line position-absolute" 
            style={{ 
              left: 12, 
              top: "50%", 
              transform: "translateY(-50%)", 
              color: "#6c757d",
              fontSize: "0.9rem",
              pointerEvents: "none"
            }}
          ></i>
          <input
            ref={searchInputRef}
            type="text"
            className="form-control form-control-sm ps-5 sp-pill"
            placeholder="Search chats"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ fontSize: "0.875rem" }}
          />
          {searchQuery && (
            <button
              type="button"
              className="btn btn-link btn-sm p-0 position-absolute"
              style={{ right: 8, top: "50%", transform: "translateY(-50%)", color: "#6c757d" }}
              onClick={() => setSearchQuery("")}
              title="Clear search"
            >
              <i className="ri-close-line" style={{ fontSize: "0.9rem" }}></i>
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="sp-chat-sidebar__scroll">
        {/* Projects Section */}
        <div className="pt-1">
          <button
            type="button"
            className="btn btn-link btn-sm p-0 text-muted text-decoration-none w-100 sp-sectionTitle"
            onClick={() => setProjectsExpanded(!projectsExpanded)}
          >
            <span>Projects</span>
            <i className={`ri-arrow-${projectsExpanded ? "down" : "right"}-s-line`} style={{ fontSize: "0.75rem" }}></i>
          </button>

          {projectsExpanded && (
            <div className="mt-2" ref={projectSelectorRef}>
              {/* Current Project Display with Dropdown */}
              <div className="position-relative mb-2">
                <button
                  type="button"
                  className="btn btn-sm w-100 text-start border-0 d-flex align-items-center justify-content-between"
                  onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                  style={{ 
                    fontSize: "0.875rem",
                    padding: "6px 8px",
                    borderRadius: 6,
                    backgroundColor: showProjectDropdown ? "#f8f9fa" : "transparent"
                  }}
                >
                  <span className="text-truncate me-2" style={{ fontWeight: currentProject?.project_id === currentProjectId ? 500 : 400 }}>
                    {currentProject?.name || "General"}
                  </span>
                  <i className={`ri-arrow-${showProjectDropdown ? "up" : "down"}-s-line`} style={{ fontSize: "0.75rem", color: "#6c757d" }}></i>
                </button>
                
                {showProjectDropdown && (
                  <div
                    className="position-absolute top-100 start-0 end-0 mt-1 bg-white border rounded shadow-sm z-3"
                    style={{ maxHeight: "300px", overflowY: "auto", fontSize: "0.875rem" }}
                  >
                    {projects.map((project) => {
                      const isDefault = project.project_id === "default";
                      const isDeleting = deletingProjectId === project.project_id;
                      const hasConversations = project.conversation_count > 0;
                      
                      return (
                        <div
                          key={project.project_id}
                          className={`d-flex align-items-center border-0 ${
                            project.project_id === currentProjectId ? "bg-primary text-white" : ""
                          }`}
                          style={{ 
                            padding: "8px 12px",
                            fontSize: "0.875rem",
                            borderRadius: 4,
                            marginBottom: 2
                          }}
                        >
                          <button
                            type="button"
                            className={`btn btn-sm flex-grow-1 text-start border-0 p-0 ${
                              project.project_id === currentProjectId ? "text-white" : ""
                            }`}
                            onClick={() => {
                              onSwitchProject(project.project_id);
                              setShowProjectDropdown(false);
                            }}
                            style={{ 
                              fontSize: "0.875rem",
                              backgroundColor: "transparent"
                            }}
                            disabled={isDeleting}
                          >
                            <div className="d-flex justify-content-between align-items-center">
                              <span>{project.name}</span>
                              {hasConversations && (
                                <span className={`badge ms-2 ${project.project_id === currentProjectId ? "bg-white text-primary" : "bg-secondary bg-opacity-25 text-secondary"}`} style={{ fontSize: "0.65rem" }}>
                                  {project.conversation_count}
                                </span>
                              )}
                            </div>
                          </button>
                          {!isDefault && onDeleteProject && (
                            <button
                              type="button"
                              className={`btn btn-link btn-sm p-0 ms-2 ${
                                project.project_id === currentProjectId ? "text-white" : "text-muted"
                              }`}
                              onClick={(e) => handleDeleteProject(project.project_id, project.name, e)}
                              disabled={isDeleting}
                              style={{
                                fontSize: "0.875rem",
                                minWidth: "20px",
                                height: "20px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                opacity: 0.7,
                                cursor: "pointer"
                              }}
                              onMouseEnter={(e) => {
                                if (!isDeleting) {
                                  e.currentTarget.style.color = "#dc3545";
                                  e.currentTarget.style.opacity = 1;
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isDeleting) {
                                  e.currentTarget.style.color = project.project_id === currentProjectId ? "#fff" : "#6c757d";
                                  e.currentTarget.style.opacity = 0.7;
                                }
                              }}
                              title={hasConversations ? "Delete project (also deletes its chats)" : "Delete project"}
                              aria-label="Delete project"
                            >
                              {isDeleting ? (
                                <span className="spinner-border spinner-border-sm" role="status">
                                  <span className="visually-hidden">Deleting...</span>
                                </span>
                              ) : (
                                <i className="ri-delete-bin-6-line"></i>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                    
                    {showNewProjectInput ? (
                      <div className="p-2 border-top">
                        <input
                          type="text"
                          className="form-control form-control-sm mb-2"
                          placeholder="Project name"
                          value={newProjectName}
                          onChange={(e) => setNewProjectName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleCreateProject(e);
                            } else if (e.key === "Escape") {
                              setShowNewProjectInput(false);
                              setNewProjectName("");
                            }
                          }}
                          autoFocus
                        />
                        <div className="d-flex gap-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-primary flex-grow-1"
                            onClick={handleCreateProject}
                          >
                            Create
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => {
                              setShowNewProjectInput(false);
                              setNewProjectName("");
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm w-100 text-start border-top"
                        onClick={() => setShowNewProjectInput(true)}
                        style={{ fontSize: "0.875rem", padding: "8px 12px" }}
                      >
                        <i className="ri-add-line me-2"></i>
                        New Project
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Chats Section */}
        <div className="pt-3">
          <div className="sp-sectionTitle mb-2">
            <span>Chats</span>
          </div>

          {loading && filteredConversations.length === 0 ? (
            <div className="text-center text-muted small py-3">Loading conversations...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center text-muted small py-3">
              {searchQuery ? "No conversations match your search." : "No conversations yet. Start a new chat to begin."}
            </div>
          ) : (
            <div className="d-flex flex-column gap-1">
              {filteredConversations.map((conv) => {
                const isActive = conv.conversation_id === currentConversationId;
                const isDeleting = deletingId === conv.conversation_id;

                return (
                  <div
                    key={conv.conversation_id}
                    className={`sp-sidebarItem ${isActive ? "is-active" : ""}`}
                    onClick={() => !isDeleting && onSelectConversation(conv.conversation_id)}
                    style={{
                      cursor: isDeleting ? "wait" : "pointer",
                      userSelect: "none",
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <div
                          className="sp-sidebarItem__title text-truncate"
                          style={{ 
                            lineHeight: 1.4
                          }}
                          title={conv.title}
                        >
                          {conv.title || "Untitled"}
                        </div>
                        <div className="sp-sidebarItem__meta">
                          <span>
                            {formatDate(conv.updated_at)}
                          </span>
                          {conv.item_count > 0 && (
                            <span className="badge bg-secondary bg-opacity-25 text-secondary" style={{ fontSize: "0.65rem" }}>
                              {conv.item_count}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0 ms-2 text-muted"
                        style={{
                          fontSize: "0.875rem",
                          minWidth: "24px",
                          height: "24px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: 0.8,
                        }}
                        onClick={(e) => handleDelete(conv.conversation_id, e)}
                        disabled={isDeleting}
                        title="Delete conversation"
                        aria-label="Delete conversation"
                      >
                        {isDeleting ? (
                          <span className="spinner-border spinner-border-sm" role="status">
                            <span className="visually-hidden">Deleting...</span>
                          </span>
                        ) : (
                          <i className="ri-delete-bin-6-line"></i>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
