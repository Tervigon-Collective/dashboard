"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getConversations,
  getConversation,
  createConversation,
  updateConversation,
  deleteConversation,
  saveConversationAuto,
  getProjects,
  createProject,
  updateProject,
  deleteProject,
} from "@/services/contentGenerationApi";

const STORAGE_KEY = "chat_current_conversation_id";
const STORAGE_KEY_PROJECT = "chat_current_project_id";

/**
 * Custom hook for managing chat conversation history.
 * Handles loading, saving, creating, and switching between conversations.
 */
export function useChatHistory() {
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [projects, setProjects] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Debounce timer for auto-save
  const saveTimerRef = useRef(null);
  const lastSavedItemsRef = useRef(null);

  // Load current conversation ID and project ID from localStorage on mount
  useEffect(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_KEY);
      if (savedId) {
        setCurrentConversationId(savedId);
      }
      const savedProjectId = localStorage.getItem(STORAGE_KEY_PROJECT);
      if (savedProjectId) {
        setCurrentProjectId(savedProjectId);
      }
    } catch (e) {
      console.warn("Failed to load IDs from localStorage:", e);
    }
  }, []);

  // Save current conversation ID to localStorage
  const saveConversationIdToStorage = useCallback((id) => {
    try {
      if (id) {
        localStorage.setItem(STORAGE_KEY, id);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.warn("Failed to save conversation ID to localStorage:", e);
    }
  }, []);

  // Save current project ID to localStorage
  const saveProjectIdToStorage = useCallback((id) => {
    try {
      if (id) {
        localStorage.setItem(STORAGE_KEY_PROJECT, id);
      } else {
        localStorage.removeItem(STORAGE_KEY_PROJECT);
      }
    } catch (e) {
      console.warn("Failed to save project ID to localStorage:", e);
    }
  }, []);

  // Load all projects
  const loadProjects = useCallback(async () => {
    try {
      setError(null);
      const data = await getProjects();
      const projectsList = data || [];
      setProjects(projectsList);
      
      // If no current project ID, set to first project or default
      if (!currentProjectId && projectsList.length > 0) {
        const defaultProject = projectsList.find(p => p.project_id === "default") || projectsList[0];
        if (defaultProject) {
          setCurrentProjectId(defaultProject.project_id);
          saveProjectIdToStorage(defaultProject.project_id);
        }
      }
      
      return projectsList;
    } catch (e) {
      console.error("Error loading projects:", e);
      setError(e.message || "Failed to load projects");
      return [];
    }
  }, [currentProjectId, saveProjectIdToStorage]);

  // Load all conversations for current project
  const loadConversations = useCallback(async (projectId = null) => {
    try {
      setLoading(true);
      setError(null);
      const targetProjectId = projectId || currentProjectId || "default";
      const data = await getConversations(targetProjectId);
      // Ensure conversations are sorted by updated_at descending (latest first)
      const sorted = (data || []).sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at || 0);
        const dateB = new Date(b.updated_at || b.created_at || 0);
        return dateB - dateA; // Descending order
      });
      setConversations(sorted);
      return sorted;
    } catch (e) {
      console.error("Error loading conversations:", e);
      setError(e.message || "Failed to load conversations");
      return [];
    } finally {
      setLoading(false);
    }
  }, [currentProjectId]);

  // Load a specific conversation
  const loadConversation = useCallback(async (conversationId) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getConversation(conversationId);
      setCurrentConversation(data);
      setCurrentConversationId(conversationId);
      saveConversationIdToStorage(conversationId);
      return data;
    } catch (e) {
      console.error("Error loading conversation:", e);
      setError(e.message || "Failed to load conversation");
      throw e;
    } finally {
      setLoading(false);
    }
  }, [saveConversationIdToStorage]);

  // Create a new conversation
  const createNewConversation = useCallback(async (title = null, projectId = null) => {
    try {
      setLoading(true);
      setError(null);
      const targetProjectId = projectId || currentProjectId || "default";
      const data = await createConversation({
        title,
        canvas_items: [],
        settings: {},
        project_id: targetProjectId,
      });
      setCurrentConversation(data);
      setCurrentConversationId(data.conversation_id);
      saveConversationIdToStorage(data.conversation_id);
      
      // Reload conversations list
      await loadConversations(targetProjectId);
      
      return data;
    } catch (e) {
      console.error("Error creating conversation:", e);
      setError(e.message || "Failed to create conversation");
      throw e;
    } finally {
      setLoading(false);
    }
  }, [currentProjectId, loadConversations, saveConversationIdToStorage]);

  // Save conversation (full update)
  const saveConversation = useCallback(
    async (canvasItems, settings = {}) => {
      if (!currentConversationId) {
        // Create new conversation if none exists
        return await createNewConversation();
      }

      try {
        setError(null);
        const data = await updateConversation(currentConversationId, {
          canvas_items: canvasItems,
          settings,
        });
        setCurrentConversation(data);
        
        // Reload conversations list to update metadata
        await loadConversations(currentProjectId || "default");
        
        return data;
      } catch (e) {
        console.error("Error saving conversation:", e);
        setError(e.message || "Failed to save conversation");
        throw e;
      }
    },
    [currentConversationId, currentProjectId, createNewConversation, loadConversations]
  );

  // Auto-save conversation (debounced)
  const autoSaveConversation = useCallback(
    (canvasItems, settings = {}) => {
      // Clear existing timer
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      // Check if items actually changed
      const itemsKey = JSON.stringify(canvasItems);
      if (itemsKey === lastSavedItemsRef.current) {
        return; // No changes, skip save
      }

      // Set new timer (2 seconds debounce)
      saveTimerRef.current = setTimeout(async () => {
        try {
          if (!currentConversationId) {
            // Create new conversation if none exists
            try {
              const newConv = await createNewConversation();
              if (newConv && newConv.conversation_id) {
                // Update the conversation ID state
                setCurrentConversationId(newConv.conversation_id);
                saveConversationIdToStorage(newConv.conversation_id);
                
                // Save the canvas items to the new conversation
                await saveConversationAuto(newConv.conversation_id, {
                  canvas_items: canvasItems,
                  settings,
                  project_id: currentProjectId || "default",
                });
                lastSavedItemsRef.current = itemsKey;

                // Reload conversations list
                await loadConversations(currentProjectId || "default");
              }
            } catch (createError) {
              console.error("Error creating conversation for auto-save:", createError);
              // If creation fails (e.g., unauthenticated), try again next time
              // Don't update lastSavedItemsRef so it will retry
            }
            return;
          }

          await saveConversationAuto(currentConversationId, {
            canvas_items: canvasItems,
            settings,
            project_id: currentProjectId || "default",
          });
          lastSavedItemsRef.current = itemsKey;

          // Reload conversations list to update updated_at
          await loadConversations(currentProjectId || "default");
        } catch (e) {
          console.error("Error auto-saving conversation:", e);
          // Don't set error state for auto-save failures (non-blocking)
          // Reset lastSavedItemsRef so it will retry on next change
          lastSavedItemsRef.current = null;
        }
      }, 2000); // 2 second debounce
    },
    [currentConversationId, createNewConversation, loadConversations]
  );

  // Delete a conversation
  const deleteConv = useCallback(
    async (conversationId) => {
      try {
        setError(null);
        await deleteConversation(conversationId);
        
        // If deleted conversation was current, clear it
        if (conversationId === currentConversationId) {
          setCurrentConversationId(null);
          setCurrentConversation(null);
          saveConversationIdToStorage(null);
        }
        
        // Reload conversations list
        await loadConversations(currentProjectId || "default");
      } catch (e) {
        console.error("Error deleting conversation:", e);
        setError(e.message || "Failed to delete conversation");
        throw e;
      }
    },
    [currentConversationId, currentProjectId, loadConversations, saveConversationIdToStorage]
  );

  // Switch to a different project
  const switchProject = useCallback(
    async (projectId) => {
      if (projectId === currentProjectId) {
        return; // Already on this project
      }
      
      setCurrentProjectId(projectId);
      saveProjectIdToStorage(projectId);
      
      // Clear current conversation when switching projects
      setCurrentConversationId(null);
      setCurrentConversation(null);
      saveConversationIdToStorage(null);
      
      // Load conversations for the new project
      await loadConversations(projectId);
    },
    [currentProjectId, loadConversations, saveProjectIdToStorage]
  );

  // Create a new project
  const createNewProject = useCallback(async (name) => {
    try {
      setError(null);
      const data = await createProject(name);
      await loadProjects();
      // Optionally switch to the new project
      if (data && data.project_id) {
        await switchProject(data.project_id);
      }
      return data;
    } catch (e) {
      console.error("Error creating project:", e);
      setError(e.message || "Failed to create project");
      throw e;
    }
  }, [loadProjects, switchProject]);

  // Update a project
  const updateProjectName = useCallback(async (projectId, name) => {
    try {
      setError(null);
      await updateProject(projectId, { name });
      await loadProjects();
    } catch (e) {
      console.error("Error updating project:", e);
      setError(e.message || "Failed to update project");
      throw e;
    }
  }, [loadProjects]);

  // Delete a project
  const deleteProjectById = useCallback(async (projectId) => {
    try {
      setError(null);
      await deleteProject(projectId, { delete_conversations: true });
      await loadProjects();
      // If deleted project was current, switch to default
      if (projectId === currentProjectId) {
        await switchProject("default");
      }
    } catch (e) {
      console.error("Error deleting project:", e);
      setError(e.message || "Failed to delete project");
      throw e;
    }
  }, [currentProjectId, loadProjects, switchProject]);

  // Switch to a different conversation
  const switchConversation = useCallback(
    async (conversationId) => {
      if (conversationId === currentConversationId) {
        return; // Already on this conversation
      }

      // Clear auto-save timer
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      lastSavedItemsRef.current = null;

      await loadConversation(conversationId);
    },
    [currentConversationId, loadConversation]
  );

  // Clear current conversation (new chat)
  const clearConversation = useCallback(() => {
    // Clear auto-save timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    lastSavedItemsRef.current = null;

    setCurrentConversationId(null);
    setCurrentConversation(null);
    saveConversationIdToStorage(null);
  }, [saveConversationIdToStorage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []); // Only run on mount

  // Reload conversations when project changes
  useEffect(() => {
    if (currentProjectId) {
      loadConversations(currentProjectId);
    }
  }, [currentProjectId]); // Only depend on currentProjectId

  // Load conversation if ID exists on mount
  useEffect(() => {
    if (currentConversationId && !currentConversation) {
      loadConversation(currentConversationId).catch(() => {
        // If loading fails, clear the ID
        setCurrentConversationId(null);
        saveConversationIdToStorage(null);
      });
    }
  }, [currentConversationId, currentConversation, loadConversation, saveConversationIdToStorage]);

  return {
    conversations,
    currentConversationId,
    currentConversation,
    projects,
    currentProjectId,
    loading,
    error,
    loadConversations,
    loadConversation,
    loadProjects,
    createNewConversation,
    saveConversation,
    autoSaveConversation,
    deleteConversation: deleteConv,
    switchConversation,
    switchProject,
    createNewProject,
    updateProjectName,
    deleteProjectById,
    clearConversation,
  };
}

