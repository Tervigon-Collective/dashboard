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
    <div className="position-relative" ref={dropdownRef} style={{ minWidth: 0, maxWidth: "250px" }}>
      <button
        className="btn btn-outline-secondary d-flex align-items-center gap-2"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading || isSwitching}
        style={{
          minWidth: "200px",
          maxWidth: "100%",
          justifyContent: "space-between",
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <Icon icon="solar:palette-bold" width="16" height="16" />
          <span className="text-truncate">
            {isSwitching
              ? "Switching..."
              : activeBrandkit?.brand_name || "Loading..."}
          </span>
        </div>
        <Icon
          icon={isOpen ? "solar:alt-arrow-up-bold" : "solar:alt-arrow-down-bold"}
          width="12"
          height="12"
        />
      </button>

      {isOpen && (
        <div
          className="dropdown-menu show"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 1050,
            maxHeight: "400px",
            overflowY: "auto",
            overflowX: "hidden",
            minWidth: "250px",
            maxWidth: "100%",
          }}
        >
          {brandkits.length > 0 ? (
            <>
              <h6 className="dropdown-header">Available Brandkits</h6>
              {brandkits.map((bk) => (
                <button
                  key={bk.brand_id}
                  className={`dropdown-item ${
                    bk.brand_id === activeBrandkit?.brand_id ? "active" : ""
                  }`}
                  onClick={() => handleSwitch(bk.brand_id)}
                  disabled={isSwitching}
                  style={{
                    whiteSpace: "normal",
                    overflow: "hidden",
                  }}
                >
                  <div className="d-flex align-items-center justify-content-between" style={{ width: "100%" }}>
                    <span className="text-truncate" style={{ flex: 1, minWidth: 0 }}>{bk.brand_name}</span>
                    {bk.brand_id === activeBrandkit?.brand_id && (
                      <Icon
                        icon="solar:check-circle-bold"
                        width="16"
                        height="16"
                        className="text-success ms-2"
                        style={{ flexShrink: 0 }}
                      />
                    )}
                  </div>
                  {bk.tagline && (
                    <small className="text-muted d-block text-truncate" style={{ width: "100%" }}>
                      {bk.tagline}
                    </small>
                  )}
                </button>
              ))}
              <hr className="dropdown-divider" />
            </>
          ) : (
            <>
              <div className="dropdown-item-text text-muted small">
                No brandkits available
              </div>
              <hr className="dropdown-divider" />
            </>
          )}
          <button
            className="dropdown-item"
            onClick={handleCreateNew}
            disabled={isSwitching}
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            <Icon
              icon="solar:add-circle-bold"
              width="16"
              height="16"
              className="me-2"
            />
            Create New Brandkit
          </button>
          <button
            className="dropdown-item"
            onClick={handleManage}
            disabled={isSwitching}
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            <Icon
              icon="solar:settings-bold"
              width="16"
              height="16"
              className="me-2"
            />
            Manage Brandkits
          </button>
        </div>
      )}
    </div>
  );
};

export default BrandkitSelector;

