"use client";

import React, { useEffect, useRef, useState } from "react";
import ModeSelector from "./ModeSelector";
import PromptInput from "./PromptInput";
import CanvasItem from "./CanvasItem";
import ConversationList from "./ConversationList";
import { useChatHistory } from "@/hooks/useChatHistory";
import {
  chatGenerateImage,
  chatGenerateShots,
  chatGenerateVideo,
  chatGetStatus,
} from "@/services/contentGenerationApi";
import { uploadImages } from "@/services/contentGenerationApi";
import config from "@/config";

const normalizeUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = (config?.pythonApi?.baseURL || "").replace(/\/+$/, "");
  let path = url.startsWith("/") ? url : `/${url}`;
  // If backend returns /product_images/... serve from /uploads/product_images/...
  if (path.startsWith("/product_images/")) {
    path = `/uploads${path}`;
  }
  return `${base}${path}`;
};

/**
 * ChatContentGenerator
 * Unified chat-style UI for image, shots, and video generation.
 */
export default function ChatContentGenerator() {
  const [mode, setMode] = useState("image"); // "image" | "shots" | "video"
  const [prompt, setPrompt] = useState("");
  const [referenceImages, setReferenceImages] = useState([]);
  const [numImages, setNumImages] = useState(1);
  const [canvasItems, setCanvasItems] = useState([]);
  const pollingRef = useRef(new Map());
  const scrollRef = useRef(null);
  const skipNextAutosaveRef = useRef(false);
  const prevProjectIdRef = useRef(null);
  const prevConversationIdRef = useRef(null);
  const [shotEditContext, setShotEditContext] = useState(null); // { parentItemId, shotTaskId?, shotNumber? }
  const shotPollingContextRef = useRef(new Map()); // jobId -> { parentItemId, shotTaskId?, shotNumber?, variantId }

  // Chat history management
  const {
    conversations,
    currentConversationId,
    currentConversation,
    projects,
    currentProjectId,
    loading: historyLoading,
    loadConversations,
    loadConversation,
    createNewConversation,
    autoSaveConversation,
    deleteConversation: deleteConv,
    switchConversation,
    switchProject,
    createNewProject,
    deleteProjectById,
    clearConversation,
  } = useChatHistory();

  // Track if we're loading a conversation to prevent auto-save loop
  const isLoadingConversationRef = useRef(false);

  const fetchImageAsDataUrl = async (url) => {
    const imageUrl = normalizeUrl(url);
    if (!imageUrl) return null;
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const blob = await response.blob();
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return base64;
  };

  // For video mode: if we only have URLs (no IDs/base64), convert URLs to base64 so backend can use them.
  const ensureReferenceImagesBase64 = async (refs) => {
    const urlsToFetch = (refs || [])
      .filter((r) => r && r.url && !(r.base64 && String(r.base64).startsWith("data:image")))
      .map((r) => r.url);
    if (urlsToFetch.length === 0) return refs;

    const updated = [...(refs || [])];
    // Simple sequential fetch to avoid hammering browser/network; can be improved later with a small concurrency pool.
    for (let i = 0; i < updated.length; i++) {
      const r = updated[i];
      if (!r?.url) continue;
      if (r.base64 && String(r.base64).startsWith("data:image")) continue;
      try {
        const base64 = await fetchImageAsDataUrl(r.url);
        updated[i] = { ...r, base64 };
      } catch (e) {
        // Leave as URL only; we'll fail later with a clear error if no usable images exist.
        console.error("Failed to convert reference URL to base64:", e);
      }
    }
    return updated;
  };

  // Load conversation if currentConversationId changes
  useEffect(() => {
    if (currentConversation && currentConversation.canvas_items !== undefined) {
      isLoadingConversationRef.current = true;
      // Restore canvas items from conversation
      setCanvasItems(currentConversation.canvas_items || []);
      
      // Restore settings
      const settings = currentConversation.settings || {};
      if (settings.numImages !== undefined) {
        setNumImages(settings.numImages);
      }
      if (settings.lastMode) {
        setMode(settings.lastMode);
      }
      // Reset flag after state updates
      setTimeout(() => {
        isLoadingConversationRef.current = false;
      }, 100);
    }
  }, [currentConversation]);

  // When switching projects (or when the current conversation is cleared), show a fresh "new chat".
  // The history hook clears the conversation ID on project switch, but this component keeps its own
  // local canvas state, so we must reset it to avoid showing/saving the previous project's chat.
  useEffect(() => {
    const prevProjectId = prevProjectIdRef.current;
    const prevConvId = prevConversationIdRef.current;

    const projectChanged =
      prevProjectId !== null && currentProjectId && prevProjectId !== currentProjectId;
    const conversationCleared = !!prevConvId && !currentConversationId;

    if (projectChanged || conversationCleared) {
      // Prevent any autosave during this transition tick.
      skipNextAutosaveRef.current = true;
      isLoadingConversationRef.current = true;
      setShotEditContext(null);
      shotPollingContextRef.current.clear();

      // Stop any ongoing polling from the previous project/conversation.
      pollingRef.current.forEach((intervalId) => clearInterval(intervalId));
      pollingRef.current.clear();

      // Reset local UI state.
      setCanvasItems([]);
      setPrompt("");
      setReferenceImages([]);
      setMode("image");
      setNumImages(1);

      // Allow normal behavior again on next tick.
      setTimeout(() => {
        isLoadingConversationRef.current = false;
      }, 0);
    }

    prevProjectIdRef.current = currentProjectId ?? null;
    prevConversationIdRef.current = currentConversationId ?? null;
  }, [currentConversationId, currentProjectId]);

  // Auto-save conversation when canvas items change (but not when loading)
  useEffect(() => {
    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false;
      return;
    }
    if (isLoadingConversationRef.current) {
      return; // Don't auto-save while loading a conversation
    }
    if (canvasItems.length > 0) {
      // Auto-save will create conversation if currentConversationId is null
      autoSaveConversation(canvasItems, {
        numImages,
        lastMode: mode,
      });
    }
  }, [canvasItems, numImages, mode, autoSaveConversation]);

  // Cleanup polling intervals on unmount
  useEffect(() => {
    return () => {
      pollingRef.current.forEach((intervalId) => clearInterval(intervalId));
      pollingRef.current.clear();
      shotPollingContextRef.current.clear();
    };
  }, []);

  // Load saved image count (session) for image mode
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem("chat_num_images") || "1");
      if (saved >= 1 && saved <= 4) {
        setNumImages(saved);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Persist image count when in image mode
  useEffect(() => {
    if (mode === "image") {
      try {
        localStorage.setItem("chat_num_images", String(numImages));
      } catch {
        /* ignore */
      }
    }
  }, [numImages, mode]);

  const addCanvasItem = (item) => {
    // Append so newest stays at bottom (chat timeline)
    setCanvasItems((prev) => {
      const newItems = [...prev, item];
      
      // Auto-generate title from first prompt if this is the first item
      // Title auto-generation is handled by the backend, so we don't need to do anything here
      // The auto-save will trigger and backend will generate title from first prompt
      
      return newItems;
    });
  };

  const updateCanvasItem = (key, updater) => {
    setCanvasItems((prev) =>
      prev.map((item) =>
        item.jobId === key || item.id === key ? { ...item, ...updater(item) } : item
      )
    );
  };

  const startPolling = (jobId) => {
    if (pollingRef.current.has(jobId)) return;
    const intervalId = setInterval(async () => {
      try {
        const res = await chatGetStatus(jobId);
        const job = res.job;
        updateCanvasItem(jobId, () => ({
          status: job.status,
          results: job.results,
          optimizedPrompt: job.optimized_prompt,
          error: job.error,
        }));

        if (["completed", "failed"].includes(job.status)) {
          clearInterval(intervalId);
          pollingRef.current.delete(jobId);
        }
      } catch (e) {
        clearInterval(intervalId);
        pollingRef.current.delete(jobId);
      }
    }, 2000);
    pollingRef.current.set(jobId, intervalId);
  };

  const startShotVariantPolling = (jobId, ctx) => {
    if (pollingRef.current.has(jobId)) return;
    shotPollingContextRef.current.set(jobId, ctx);
    const intervalId = setInterval(async () => {
      try {
        const res = await chatGetStatus(jobId);
        const job = res.job;

        setCanvasItems((prev) =>
          prev.map((item) => {
            if (item.id !== ctx.parentItemId) return item;
            const shots = item.results?.shots || [];
            const updatedShots = shots.map((shot) => {
              const matches =
                (ctx.shotTaskId && shot.task_id === ctx.shotTaskId) ||
                (!ctx.shotTaskId && ctx.shotNumber != null && shot.shot_number === ctx.shotNumber);
              if (!matches) return shot;
              const variants = Array.isArray(shot.variants)
                ? shot.variants
                : [
                    {
                      id: shot.task_id || `v0-${shot.shot_number || 0}`,
                      url: shot.url,
                      rawPrompt: shot.shot_description,
                      optimizedPrompt: shot.optimized_prompt,
                      status: "completed",
                      task_id: shot.task_id,
                      all_urls: shot.all_urls,
                    },
                  ];
              const nextVariants = variants.map((v) => {
                if (v.id !== ctx.variantId) return v;
                const firstImage = job?.results?.images?.[0];
                const url = firstImage?.url || v.url;
                return {
                  ...v,
                  status: job.status,
                  url,
                  task_id: firstImage?.task_id || v.task_id,
                  all_urls: firstImage?.all_urls || v.all_urls,
                  optimizedPrompt: job.optimized_prompt ?? v.optimizedPrompt,
                  error: job.error || null,
                };
              });
              const variantIndex = nextVariants.findIndex((v) => v.id === ctx.variantId);
              return {
                ...shot,
                variants: nextVariants,
                // Auto-select latest edited variant when it completes
                selectedVariantIndex:
                  variantIndex >= 0
                    ? variantIndex
                    : Number.isInteger(shot.selectedVariantIndex)
                    ? shot.selectedVariantIndex
                    : 0,
              };
            });
            return {
              ...item,
              results: {
                ...(item.results || {}),
                shots: updatedShots,
              },
            };
          })
        );

        if (["completed", "failed"].includes(job.status)) {
          clearInterval(intervalId);
          pollingRef.current.delete(jobId);
          shotPollingContextRef.current.delete(jobId);
        }
      } catch (e) {
        clearInterval(intervalId);
        pollingRef.current.delete(jobId);
        shotPollingContextRef.current.delete(jobId);
      }
    }, 2000);
    pollingRef.current.set(jobId, intervalId);
  };

  const handleUploadImages = async (fileList) => {
    if (!fileList || !fileList.length) return;
    const files = Array.from(fileList);
    try {
      const resp = await uploadImages(files);
      const uploaded =
        resp.images?.map((img) => ({
          id: img.image_id,
          url: normalizeUrl(img.url),
        })) || [];
      setReferenceImages((prev) => {
        const existingIds = new Set(prev.map((r) => r.id));
        const merged = [...prev];
        uploaded.forEach((u) => {
          if (!existingIds.has(u.id)) merged.push(u);
        });
        return merged;
      });
    } catch (e) {
      console.error("Upload error", e);
    }
  };

  const handleRemoveReference = (ref) => {
    setReferenceImages((prev) => prev.filter((r) => (ref.id ? r.id !== ref.id : r.url !== ref.url)));
  };

  // Inline shot regeneration (from shot card, no main input needed)
  const handleRegenerateShotInline = async (shot, parentItem, newPrompt) => {
    const variantId = crypto.randomUUID();
    const ctx = {
      parentItemId: parentItem?.id || null,
      shotTaskId: shot?.task_id || null,
      shotNumber: shot?.shot_number ?? null,
    };

    // Insert a new variant placeholder into the shot
    setCanvasItems((prev) =>
      prev.map((item) => {
        if (item.id !== ctx.parentItemId) return item;
        const shots = item.results?.shots || [];
        const updatedShots = shots.map((s) => {
          const matches =
            (ctx.shotTaskId && s.task_id === ctx.shotTaskId) ||
            (!ctx.shotTaskId && ctx.shotNumber != null && s.shot_number === ctx.shotNumber);
          if (!matches) return s;

          const variants = Array.isArray(s.variants)
            ? s.variants
            : [
                {
                  id: s.task_id || `v0-${s.shot_number || 0}`,
                  url: s.url,
                  rawPrompt: s.shot_description,
                  optimizedPrompt: s.optimized_prompt,
                  status: "completed",
                  task_id: s.task_id,
                  all_urls: s.all_urls,
                },
              ];

          const nextVariants = [
            ...variants,
            {
              id: variantId,
              rawPrompt: newPrompt,
              status: "optimizing",
              url: null,
              created_at: new Date().toISOString(),
            },
          ];

          return {
            ...s,
            variants: nextVariants,
            selectedVariantIndex: nextVariants.length - 1,
          };
        });
        return {
          ...item,
          results: {
            ...(item.results || {}),
            shots: updatedShots,
          },
        };
      })
    );

    try {
      // Convert shot image to base64 for reference
      let resolvedRefs = [];
      if (shot.url) {
        try {
          const base64 = await fetchImageAsDataUrl(shot.url);
          if (base64) resolvedRefs.push(base64);
        } catch (e) {
          console.error("Failed to convert shot image to base64:", e);
        }
      }

      const resp = await chatGenerateImage({
        prompt: newPrompt,
        reference_image_ids: [],
        reference_images_base64: resolvedRefs.length > 0 ? resolvedRefs : undefined,
        num_images: 1,
      });

      // Mark variant as generating and attach job id
      setCanvasItems((prev) =>
        prev.map((item) => {
          if (item.id !== ctx.parentItemId) return item;
          const shots = item.results?.shots || [];
          const updatedShots = shots.map((s) => {
            const matches =
              (ctx.shotTaskId && s.task_id === ctx.shotTaskId) ||
              (!ctx.shotTaskId && ctx.shotNumber != null && s.shot_number === ctx.shotNumber);
            if (!matches) return s;
            const variants = Array.isArray(s.variants) ? s.variants : [];
            return {
              ...s,
              variants: variants.map((v) =>
                v.id === variantId ? { ...v, status: "generating", jobId: resp.job_id } : v
              ),
            };
          });
          return {
            ...item,
            results: {
              ...(item.results || {}),
              shots: updatedShots,
            },
          };
        })
      );

      startShotVariantPolling(resp.job_id, { ...ctx, variantId });
    } catch (e) {
      setCanvasItems((prev) =>
        prev.map((item) => {
          if (item.id !== ctx.parentItemId) return item;
          const shots = item.results?.shots || [];
          const updatedShots = shots.map((s) => {
            const matches =
              (ctx.shotTaskId && s.task_id === ctx.shotTaskId) ||
              (!ctx.shotTaskId && ctx.shotNumber != null && s.shot_number === ctx.shotNumber);
            if (!matches) return s;
            const variants = Array.isArray(s.variants) ? s.variants : [];
            return {
              ...s,
              variants: variants.map((v) =>
                v.id === variantId ? { ...v, status: "failed", error: e?.message || "Generation failed" } : v
              ),
            };
          });
          return {
            ...item,
            results: {
              ...(item.results || {}),
              shots: updatedShots,
            },
          };
        })
      );
    }
  };

  const regenerateShotVariant = async () => {
    if (!shotEditContext) return;
    const ctx = shotEditContext;
    const variantId = crypto.randomUUID();

    // Insert a new variant placeholder into the shot (so the shot card updates, not a new canvas item)
    setCanvasItems((prev) =>
      prev.map((item) => {
        if (item.id !== ctx.parentItemId) return item;
        const shots = item.results?.shots || [];
        const updatedShots = shots.map((shot) => {
          const matches =
            (ctx.shotTaskId && shot.task_id === ctx.shotTaskId) ||
            (!ctx.shotTaskId && ctx.shotNumber != null && shot.shot_number === ctx.shotNumber);
          if (!matches) return shot;

          const variants = Array.isArray(shot.variants)
            ? shot.variants
            : [
                {
                  id: shot.task_id || `v0-${shot.shot_number || 0}`,
                  url: shot.url,
                  rawPrompt: shot.shot_description,
                  optimizedPrompt: shot.optimized_prompt,
                  status: "completed",
                  task_id: shot.task_id,
                  all_urls: shot.all_urls,
                },
              ];

          const nextVariants = [
            ...variants,
            {
              id: variantId,
              rawPrompt: prompt,
              status: "optimizing",
              url: null,
              created_at: new Date().toISOString(),
            },
          ];

          return {
            ...shot,
            variants: nextVariants,
            selectedVariantIndex: nextVariants.length - 1,
          };
        });
        return {
          ...item,
          results: {
            ...(item.results || {}),
            shots: updatedShots,
          },
        };
      })
    );

    try {
      // Separate image IDs and base64 images (use the current referenceImages as conditioning inputs)
      const reference_image_ids = referenceImages.map((r) => r.id).filter(Boolean);
      const reference_images_base64 = referenceImages
        .filter((r) => r.base64 && r.base64.startsWith("data:image"))
        .map((r) => r.base64);

      const resp = await chatGenerateImage({
        prompt,
        reference_image_ids,
        reference_images_base64: reference_images_base64.length > 0 ? reference_images_base64 : undefined,
        num_images: 1,
      });

      // Mark variant as generating and attach job id by starting a per-shot poller.
      setCanvasItems((prev) =>
        prev.map((item) => {
          if (item.id !== ctx.parentItemId) return item;
          const shots = item.results?.shots || [];
          const updatedShots = shots.map((shot) => {
            const matches =
              (ctx.shotTaskId && shot.task_id === ctx.shotTaskId) ||
              (!ctx.shotTaskId && ctx.shotNumber != null && shot.shot_number === ctx.shotNumber);
            if (!matches) return shot;
            const variants = Array.isArray(shot.variants) ? shot.variants : [];
            return {
              ...shot,
              variants: variants.map((v) =>
                v.id === variantId ? { ...v, status: "generating", jobId: resp.job_id } : v
              ),
            };
          });
          return {
            ...item,
            results: {
              ...(item.results || {}),
              shots: updatedShots,
            },
          };
        })
      );

      startShotVariantPolling(resp.job_id, { ...ctx, variantId });
    } catch (e) {
      setCanvasItems((prev) =>
        prev.map((item) => {
          if (item.id !== ctx.parentItemId) return item;
          const shots = item.results?.shots || [];
          const updatedShots = shots.map((shot) => {
            const matches =
              (ctx.shotTaskId && shot.task_id === ctx.shotTaskId) ||
              (!ctx.shotTaskId && ctx.shotNumber != null && shot.shot_number === ctx.shotNumber);
            if (!matches) return shot;
            const variants = Array.isArray(shot.variants) ? shot.variants : [];
            return {
              ...shot,
              variants: variants.map((v) =>
                v.id === variantId ? { ...v, status: "failed", error: e?.message || "Generation failed" } : v
              ),
            };
          });
          return {
            ...item,
            results: {
              ...(item.results || {}),
              shots: updatedShots,
            },
          };
        })
      );
    } finally {
      // End edit mode after one regeneration; user can click Edit again if needed.
      setShotEditContext(null);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && mode !== "video") return;

    // Create conversation if none exists
    if (!currentConversationId) {
      try {
        await createNewConversation(null, currentProjectId || "default");
      } catch (e) {
        console.error("Failed to create conversation:", e);
        // Continue anyway - conversation might be created later
      }
    }

    // If we're editing a storyboard shot, regenerate into that shot instead of creating a new "Image from Prompt" card.
    if (mode === "image" && shotEditContext) {
      await regenerateShotVariant();
      return;
    }

    const baseItem = {
      id: crypto.randomUUID(),
      jobId: null,
      mode,
      rawPrompt: prompt,
      referenceImages,
      status:
        mode === "shots"
          ? "parsing_storyboard"
          : mode === "video"
          ? "generating_video"
          : "optimizing",
      results: null,
    };

    // Add optimistic card (newest goes to bottom)
    addCanvasItem(baseItem);

    try {
      if (mode === "image") {
        // Separate image IDs and base64 images
        const reference_image_ids = referenceImages.map((r) => r.id).filter(Boolean);
        const reference_images_base64 = referenceImages
          .filter((r) => r.base64 && r.base64.startsWith("data:image"))
          .map((r) => r.base64);
        
        const resp = await chatGenerateImage({
          prompt,
          reference_image_ids,
          reference_images_base64: reference_images_base64.length > 0 ? reference_images_base64 : undefined,
          num_images: numImages,
        });
        updateCanvasItem(baseItem.id, () => ({
          jobId: resp.job_id,
        }));
        startPolling(resp.job_id);
      } else if (mode === "shots") {
        const resp = await chatGenerateShots({
          storyboard_text: prompt,
          reference_image_ids: referenceImages.map((r) => r.id).filter(Boolean),
        });
        updateCanvasItem(baseItem.id, () => ({
          jobId: resp.job_id,
        }));
        startPolling(resp.job_id);
      } else if (mode === "video") {
        // If refs are URL-only (common when selecting generated shots), convert to base64 first.
        const ensuredRefs = await ensureReferenceImagesBase64(referenceImages);
        if (ensuredRefs !== referenceImages) {
          setReferenceImages(ensuredRefs);
        }
        const shotIds = ensuredRefs.map((r) => r.id).filter(Boolean);
        const shotImagesBase64 = ensuredRefs
          .filter((r) => r.base64 && r.base64.startsWith("data:image"))
          .map((r) => r.base64);
        
        if (!shotIds.length && !shotImagesBase64.length) {
          updateCanvasItem(baseItem.id, () => ({
            status: "failed",
            error: "Add at least one shot image to generate a video.",
          }));
          return;
        }
        const resp = await chatGenerateVideo({
          shot_image_ids: shotIds.length > 0 ? shotIds : undefined,
          shot_images_base64: shotImagesBase64.length > 0 ? shotImagesBase64 : undefined,
          storyboard_text: prompt,
        });
        updateCanvasItem(baseItem.id, () => ({
          jobId: resp.job_id,
        }));
        startPolling(resp.job_id);
      }
    } catch (e) {
      updateCanvasItem(baseItem.id, () => ({
        status: "failed",
        error: e?.message || "Generation failed",
      }));
    }
  };

  // Auto-scroll to bottom when new items added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [canvasItems.length]);

  const handleNewChat = async () => {
    clearConversation();
    setShotEditContext(null);
    setCanvasItems([]);
    setPrompt("");
    setReferenceImages([]);
    setMode("image");
    setNumImages(1);
  };

  const handleSelectConversation = async (conversationId) => {
    await switchConversation(conversationId);
  };

  const handleDeleteConversation = async (conversationId) => {
    await deleteConv(conversationId);
    // If deleted conversation was current, reset state
    if (conversationId === currentConversationId) {
      handleNewChat();
    }
  };

  const handleSelectProject = async (projectId) => {
    await switchProject(projectId);
  };

  const handleCreateProject = async (name) => {
    await createNewProject(name);
  };

  const handleDeleteProject = async (projectId) => {
    await deleteProjectById(projectId);
  };

  return (
    <div className="sp-chatgen">
      <div className="sp-chatgen__sidebar">
        <ConversationList
          conversations={conversations}
          currentConversationId={currentConversationId}
          projects={projects}
          currentProjectId={currentProjectId}
          onCreateNew={handleNewChat}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={handleDeleteConversation}
          onSwitchProject={handleSelectProject}
          onCreateProject={handleCreateProject}
          onDeleteProject={handleDeleteProject}
          loading={historyLoading}
        />
      </div>

      <div className="sp-chatgen__main">
        <div className="sp-chatgen__scroll" ref={scrollRef}>
          {canvasItems.length === 0 ? (
            <div className="sp-empty">
              <div className="sp-empty__card">
                <div className="sp-empty__icon" aria-hidden="true" />
                <p className="sp-empty__title">No results yet</p>
                <div className="sp-empty__subtitle">
                  Start with a prompt or add reference images to generate.
                </div>
              </div>
            </div>
          ) : (
            <div className="row g-3">
              {canvasItems.map((item) => (
                <div className="col-12" key={item.id}>
                  <CanvasItem
                    item={item}
                    onEditShot={async (shot, parentItem) => {
                      // Inline editing is now handled within CanvasItem - this is kept for backwards compatibility
                      // but inline editing (onRegenerateShotInline) is the primary path
                    }}
                    onDownloadShot={(shot) => {
                      if (!shot.url) return;
                      try {
                        const link = document.createElement("a");
                        link.href = shot.url;
                        link.download = `shot-${shot.shot_number || ""}.jpg`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      } catch {
                        window.open(shot.url, "_blank");
                      }
                    }}
                    onShotToVideo={async (shot) => {
                      setShotEditContext(null);
                      setMode("video");
                      setPrompt(
                        `Use this shot as part of a video sequence.\n\nShot ${
                          shot.shot_number || ""
                        }: ${
                          shot.shot_description || ""
                        }\n\nDescribe transitions, pacing, and motion for the full video…`
                      );
                      if (shot.url) {
                        try {
                          const base64 = await fetchImageAsDataUrl(shot.url);
                          setReferenceImages([{ id: null, url: shot.url, base64 }]);
                        } catch (error) {
                          console.error(
                            "Failed to convert shot image to base64:",
                            error
                          );
                          setReferenceImages([{ id: null, url: shot.url }]);
                        }
                      }
                    }}
                    onChangeShotVariant={(shot, parentItem, nextIndex) => {
                      setCanvasItems((prev) =>
                        prev.map((it) => {
                          if (it.id !== parentItem?.id) return it;
                          const shots = it.results?.shots || [];
                          const updatedShots = shots.map((s) => {
                            const matches =
                              (shot?.task_id && s.task_id === shot.task_id) ||
                              (!shot?.task_id && shot?.shot_number != null && s.shot_number === shot.shot_number);
                            if (!matches) return s;
                            return { ...s, selectedVariantIndex: nextIndex };
                          });
                          return { ...it, results: { ...(it.results || {}), shots: updatedShots } };
                        })
                      );
                    }}
                    onShotsToVideo={async (shots, parentItem) => {
                      setShotEditContext(null);
                      setMode("video");
                      setPrompt(
                        `Create a smooth video sequence from these storyboard shots.\n\nStoryboard context:\n${parentItem?.rawPrompt || ""}\n\nDescribe transitions, pacing, and motion for the full video…`
                      );
                      // Collect the currently selected version URL for each shot
                      const refs = (shots || [])
                        .map((s) => {
                          const variants =
                            Array.isArray(s.variants) && s.variants.length > 0
                              ? s.variants
                              : [
                                  {
                                    url: s.url,
                                    rawPrompt: s.shot_description,
                                  },
                                ];
                          const selectedIdx = Number.isInteger(s.selectedVariantIndex) ? s.selectedVariantIndex : 0;
                          const current = variants[Math.min(Math.max(selectedIdx, 0), variants.length - 1)] || variants[0];
                          const url = current?.url || s.url;
                          return url ? { id: null, url } : null;
                        })
                        .filter(Boolean);
                      setReferenceImages(refs);
                    }}
                    onRegenerateShotInline={handleRegenerateShotInline}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sp-chatgen__composer">
          <div className="sp-chatgen__composerInner">
            {shotEditContext?.parentItemId && (
              <div className="alert alert-info py-2 mb-2 d-flex justify-content-between align-items-center">
                <div className="small mb-0">
                  Editing <strong>Shot {shotEditContext.shotNumber ?? ""}</strong> — Generate will update the shot card (use{" "}
                  {"<"} {">"} to browse versions).
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setShotEditContext(null)}
                >
                  Done
                </button>
              </div>
            )}
            <div className="mb-3">
              <ModeSelector value={mode} onChange={setMode} />
            </div>

            <PromptInput
              mode={mode}
              prompt={prompt}
              onChangePrompt={setPrompt}
              onUploadImages={handleUploadImages}
              onGenerate={handleGenerate}
              numImages={numImages}
              onChangeNumImages={setNumImages}
              referenceImages={referenceImages}
              onRemoveReference={handleRemoveReference}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

