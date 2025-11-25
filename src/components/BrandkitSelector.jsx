"use client";
import { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { useBrandkit } from "@/contexts/BrandkitContext";

const BrandkitSelector = ({ onCreateNew, onManage }) => {
  const { activeBrandkit, brandkits, switchBrandkit, isLoading } = useBrandkit();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSwitch = async (brandId) => {
    if (brandId === activeBrandkit?.brand_id) {
      setIsOpen(false);
      return;
    }

    try {
      setIsSwitching(true);
      await switchBrandkit(brandId);
      setIsOpen(false);
    } catch (err) {
      alert("Failed to switch brandkit: " + err.message);
    } finally {
      setIsSwitching(false);
    }
  };

  const handleCreateNew = () => {
    setIsOpen(false);
    onCreateNew();
  };

  const handleManage = () => {
    setIsOpen(false);
    onManage();
  };

  return (
    <div className="position-relative" ref={dropdownRef} style={{ minWidth: 0, maxWidth: "250px", width: "100%" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading || isSwitching}
        style={{
          width: "100%",
          maxWidth: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          padding: "6px 12px",
          backgroundColor: "#f8f9fa",
          border: "1px solid #dee2e6",
          borderRadius: "6px",
          fontSize: "0.8125rem",
          color: "#212529",
          cursor: "pointer",
          transition: "all 0.2s ease",
          boxSizing: "border-box",
        }}
        onMouseEnter={(e) => {
          if (!isLoading && !isSwitching) {
            e.currentTarget.style.backgroundColor = "#e9ecef";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "#f8f9fa";
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: 0 }}>
          <Icon icon="solar:palette-bold" width="14" height="14" style={{ flexShrink: 0 }} />
          <span 
            style={{ 
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: "0.8125rem"
            }}
          >
            {isSwitching
              ? "Switching..."
              : activeBrandkit?.brand_name || "Loading..."}
          </span>
        </div>
        <Icon
          icon={isOpen ? "solar:alt-arrow-up-bold" : "solar:alt-arrow-down-bold"}
          width="12"
          height="12"
          style={{ flexShrink: 0, color: "#6c757d" }}
        />
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            width: "100%",
            zIndex: 1050,
            maxHeight: "400px",
            overflowY: "auto",
            overflowX: "hidden",
            minWidth: "200px",
            backgroundColor: "#fff",
            border: "1px solid #dee2e6",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            padding: "4px 0",
            boxSizing: "border-box",
          }}
        >
          {brandkits.length > 0 ? (
            <>
              <div
                style={{
                  padding: "8px 12px",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: "#212529",
                  borderBottom: "1px solid #e9ecef",
                  marginBottom: "4px",
                }}
              >
                Available Brandkits
              </div>
              {brandkits.map((bk) => {
                const isActive = bk.brand_id === activeBrandkit?.brand_id;
                return (
                  <button
                    key={bk.brand_id}
                    onClick={() => handleSwitch(bk.brand_id)}
                    disabled={isSwitching}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "none",
                      backgroundColor: isActive ? "#0d6efd" : "transparent",
                      color: isActive ? "#fff" : "#212529",
                      fontSize: "0.8125rem",
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      transition: "background-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive && !isSwitching) {
                        e.currentTarget.style.backgroundColor = "#f8f9fa";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: "0.8125rem",
                      }}
                    >
                      {bk.brand_name}
                    </span>
                    {isActive && (
                      <Icon
                        icon="solar:check-circle-bold"
                        width="14"
                        height="14"
                        style={{ flexShrink: 0, color: "#28a745" }}
                      />
                    )}
                  </button>
                );
              })}
              <div
                style={{
                  height: "1px",
                  backgroundColor: "#e9ecef",
                  margin: "4px 0",
                }}
              />
            </>
          ) : (
            <>
              <div
                style={{
                  padding: "8px 12px",
                  fontSize: "0.75rem",
                  color: "#6c757d",
                }}
              >
                No brandkits available
              </div>
              <div
                style={{
                  height: "1px",
                  backgroundColor: "#e9ecef",
                  margin: "4px 0",
                }}
              />
            </>
          )}
          <button
            onClick={handleCreateNew}
            disabled={isSwitching}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "none",
              backgroundColor: "transparent",
              color: "#212529",
              fontSize: "0.8125rem",
              textAlign: "left",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "background-color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (!isSwitching) {
                e.currentTarget.style.backgroundColor = "#f8f9fa";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <Icon
              icon="solar:add-circle-bold"
              width="14"
              height="14"
              style={{ flexShrink: 0 }}
            />
            <span style={{ fontSize: "0.8125rem" }}>Create New Brandkit</span>
          </button>
          <button
            onClick={handleManage}
            disabled={isSwitching}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "none",
              backgroundColor: "transparent",
              color: "#212529",
              fontSize: "0.8125rem",
              textAlign: "left",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "background-color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (!isSwitching) {
                e.currentTarget.style.backgroundColor = "#f8f9fa";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <Icon
              icon="solar:settings-bold"
              width="14"
              height="14"
              style={{ flexShrink: 0 }}
            />
            <span style={{ fontSize: "0.8125rem" }}>Manage Brandkits</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default BrandkitSelector;

