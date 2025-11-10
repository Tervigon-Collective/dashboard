"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { useUser } from "@/helper/UserContext";
import { apiClient } from "@/api/api";

const ROLE_SUGGESTIONS = {
  super_admin: [
    "Show me the count of orders from Maharashtra in the last month.",
    "What were total orders and revenue last week versus the week before",
    "Give me a weekly trend of net profit and margin percentage for this quarter.",
    "List customers with repeat purchases in the last 60 days.",
  ],
  admin: [
    "Show me the count of orders from Maharashtra in the last month.",
    "What were total orders and revenue last week versus the week before",
    "Give me a weekly trend of net profit and margin percentage for this quarter.",
    "List customers with repeat purchases in the last 60 days.",
    "Show me net profit and orders week over week",
    "Which campaigns are below ROAS 1.0 right now?",
  ],
  manager: [
    "Show me the count of orders from Maharashtra in the last month.",
    "What were total orders and revenue last week versus the week before",
    "Give me a weekly trend of net profit and margin percentage for this quarter.",
    "List customers with repeat purchases in the last 60 days.",
    "Give me the top 5 SKUs by sales in the last 14 days",
  ],
  user: [
    "How many orders came from Maharashtra last month?",
    "Show me the count of orders from Maharashtra in the last month.",
    "What were total orders and revenue last week versus the week before",
    "Give me a weekly trend of net profit and margin percentage for this quarter.",
    "List customers with repeat purchases in the last 60 days.",
    "What’s the current gross ROAS?",
  ],
  none: [
    "What metrics can you show me today?",
    "How do I check yesterday’s sales performance?",
    "What data sources are available in Seleric?",
  ],
};

const FALLBACK_SUGGESTIONS = [
  "What were total orders and revenue last week?",
  "Identify campaigns with falling ROAS",
  "Which customers have repeat purchases in the last 60 days?",
];

const INITIAL_MESSAGE = {
  role: "assistant",
  content:
    "Hi! Ask me anything about your business metrics, operations, or data.",
  metadata: null,
};

const AskSelericModal = ({ open, onClose }) => {
  const { role, user } = useUser();
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const modalRootRef = useRef(null);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  const suggestions = useMemo(() => {
    const base = ROLE_SUGGESTIONS[role] || FALLBACK_SUGGESTIONS;
    if (base.length >= 3) {
      return base.slice(0, 3);
    }
    return [...base, ...FALLBACK_SUGGESTIONS].slice(0, 3);
  }, [role]);

  useEffect(() => {
    if (!modalRootRef.current) {
      const element = document.getElementById("ask-seleric-modal-root");
      if (element) {
        modalRootRef.current = element;
      } else {
        const created = document.createElement("div");
        created.id = "ask-seleric-modal-root";
        document.body.appendChild(created);
        modalRootRef.current = created;
      }
    }
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const closeModal = () => {
    if (onClose) {
      onClose();
    }
  };

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    const requestPayload = {
      question: trimmed,
      trace: true,
      context: {
        user: {
          email: user?.email,
          role,
        },
      },
    };

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: trimmed,
        metadata: null,
      },
      {
        role: "assistant",
        content: null,
        metadata: { typing: true },
      },
    ]);
    setInputValue("");

    try {
      const response = await apiClient.post(
        "/api/ask-seleric/query",
        requestPayload
      );
      const data = response.data;
      setMessages((prev) => {
        const updated = [...prev];
        const typingIndex = updated.findIndex(
          (msg) => msg.role === "assistant" && msg.metadata?.typing
        );
        if (typingIndex !== -1) {
          updated.splice(typingIndex, 1);
        }
        return [
          ...updated,
          {
            role: "assistant",
            content: data.answer,
            metadata: {
              confidence: data.metadata?.confidence,
              agents: data.metadata?.agents,
              traceEnabled: Boolean(data.trace?.length),
              raw: data,
            },
          },
        ];
      });
    } catch (err) {
      const normalizedMessage = (err?.message || "").toLowerCase();
      const isTimeout =
        err?.code === "ECONNABORTED" || normalizedMessage.includes("timeout");
      const isAuthExpired = err?.response?.status === 401;

      const userFriendlyError = isTimeout
        ? "Ask BOS took too long to respond this time. Nothing changed on your side—please try again in a moment."
        : isAuthExpired
        ? "Your session expired. Please sign in again to continue."
        : "Ask BOS isn't reachable right now. Please try again soon.";

      setError(userFriendlyError);
      setMessages((prev) => {
        const updated = prev.filter(
          (msg) => !(msg.role === "assistant" && msg.metadata?.typing)
        );
        return [
          ...updated,
          {
            role: "assistant",
            content: userFriendlyError,
            metadata: null,
          },
        ];
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open || !modalRootRef.current) {
    return null;
  }

  const modalContent = (
    <div className="ask-seleric-overlay" onClick={handleOverlayClick}>
      <div className="ask-seleric-drawer" role="dialog" aria-modal="true">
        <header className="ask-seleric-header">
          <div className="ask-seleric-brand">
            <div className="ask-seleric-logo">
              <Image
                src="/assets/images/make/dashborad-09.jpg"
                alt="Ask Seleric"
                width={32}
                height={32}
              />
            </div>
            <div>
              <h4>Ask BOS</h4>
            </div>
          </div>
          <button
            type="button"
            className="ask-seleric-close"
            onClick={closeModal}
            aria-label="Close Ask Seleric"
          >
            ×
          </button>
        </header>
        <main className="ask-seleric-body" ref={scrollRef}>
          {messages.map((message, index) => (
            <div
              key={`message-${index}`}
              className={clsx("ask-seleric-message", {
                "ask-seleric-message-user": message.role === "user",
                "ask-seleric-message-assistant": message.role === "assistant",
              })}
            >
              <div className="ask-seleric-message-content">
                {message.metadata?.typing ? (
                  <span className="ask-seleric-typing">
                    <span />
                    <span />
                    <span />
                  </span>
                ) : (
                  message.content
                )}
              </div>
              {message.metadata && !message.metadata.typing && (
                <div className="ask-seleric-metadata">
                  {message.metadata.confidence !== undefined && (
                    <span>
                      Confidence: {message.metadata.confidence ?? "n/a"}
                    </span>
                  )}
                  {message.metadata.agents && (
                    <span>Agents: {message.metadata.agents.join(", ")}</span>
                  )}
                </div>
              )}
            </div>
          ))}
          {messages.length === 1 && (
            <div className="ask-seleric-suggestions">
              <p className="ask-seleric-suggestions-label">Try asking:</p>
              <div className="ask-seleric-suggestion-list">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={`suggestion-${idx}`}
                    type="button"
                    className="ask-seleric-suggestion-chip"
                    onClick={() => {
                      setInputValue(suggestion);
                      if (inputRef.current) {
                        inputRef.current.focus();
                      }
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          {error && <div className="ask-seleric-error">{error}</div>}
        </main>
        <form className="ask-seleric-form" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask anything about your dashboards..."
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            disabled={isSubmitting}
          />
          <button type="submit" disabled={isSubmitting || !inputValue.trim()}>
            {isSubmitting ? "Thinking…" : "Ask"}
          </button>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, modalRootRef.current);
};

export default AskSelericModal;
