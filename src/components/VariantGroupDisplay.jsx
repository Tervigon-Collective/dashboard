"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import VariantRowEditor from "./VariantRowEditor";

/**
 * Component to display variant combinations in collapsible groups
 * with bulk actions for setting MRP/COGS
 */
const VariantGroupDisplay = ({
  groupedVariants,
  vendors,
  onVariantChange,
  onVariantsChange,
  onVariantDelete,
  mode,
}) => {
  const [expandedGroups, setExpandedGroups] = useState({});
  const [bulkValues, setBulkValues] = useState({});

  const toggleGroup = (groupName) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const handleBulkValueChange = (groupName, field, value) => {
    setBulkValues((prev) => ({
      ...prev,
      [`${groupName}_${field}`]: value,
    }));
  };

  const applyBulkValue = (groupName, field) => {
    const value = bulkValues[`${groupName}_${field}`];
    if (!value) {
      alert(`Please enter a ${field} value`);
      return;
    }

    const variantsInGroup = groupedVariants[groupName];
    const updatedVariants = variantsInGroup.map((variant) => ({
      ...variant,
      [field]: value,
      // Recalculate margin if MRP or COGS changed
      ...(field === "mrp" || field === "cogs"
        ? {
            margin:
              (parseFloat(variant.mrp || value) || 0) -
              (parseFloat(variant.cogs || value) || 0),
          }
        : {}),
    }));

    // Update all variants in this group
    onVariantsChange(updatedVariants);

    // Clear bulk value
    setBulkValues((prev) => ({
      ...prev,
      [`${groupName}_${field}`]: "",
    }));
  };

  const groupNames = Object.keys(groupedVariants);

  if (groupNames.length === 0) {
    return (
      <div className="shopify-banner shopify-banner-info">
        <Icon icon="mdi:information" className="me-2" />
        No variants generated yet. Add variant options and values above.
      </div>
    );
  }

  return (
    <div className="shopify-card">
      <div className="shopify-card-header">
        <h5 className="shopify-heading-3">
          <Icon icon="mdi:view-list" className="me-2" width="20" />
          Generated Variants ({Object.values(groupedVariants).flat().length})
        </h5>
        <p className="shopify-text-muted mb-0">
          Fill in details for each variant. You can set bulk values for each
          group.
        </p>
      </div>

      <div className="shopify-card-body">
        {groupNames.map((groupName) => {
          const variants = groupedVariants[groupName];
          const isExpanded = expandedGroups[groupName] !== false; // Default expanded

          return (
            <div
              key={groupName}
              className="border rounded mb-3"
              style={{ borderColor: "#c9cccf" }}
            >
              <div
                className="p-3"
                style={{
                  backgroundColor: "#f6f6f7",
                  borderBottom: "1px solid #c9cccf",
                }}
              >
                <div className="d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center">
                    <button
                      type="button"
                      className="btn btn-sm btn-link text-decoration-none p-0 me-2"
                      onClick={() => toggleGroup(groupName)}
                      style={{ color: "#202223" }}
                    >
                      <Icon
                        icon={
                          isExpanded ? "mdi:chevron-down" : "mdi:chevron-right"
                        }
                        width="24"
                      />
                    </button>
                    <h6 className="shopify-text-muted mb-0">
                      {groupName} ({variants.length} variants)
                    </h6>
                  </div>

                  {/* Bulk Actions */}
                  {isExpanded && (
                    <div className="d-flex gap-2 align-items-center">
                      {/* Bulk MRP */}
                      <span className="shopify-text-small">Set All MRP:</span>
                      <input
                        type="number"
                        className="shopify-input"
                        placeholder="MRP"
                        value={bulkValues[`${groupName}_mrp`] || ""}
                        onChange={(e) =>
                          handleBulkValueChange(
                            groupName,
                            "mrp",
                            e.target.value
                          )
                        }
                        style={{ width: "100px", fontSize: "13px" }}
                      />
                      <button
                        type="button"
                        className="shopify-btn shopify-btn-primary"
                        onClick={() => applyBulkValue(groupName, "mrp")}
                        title="Apply to all variants in this group"
                        style={{ padding: "6px 12px" }}
                      >
                        <Icon icon="mdi:check" width="16" />
                      </button>

                      {/* Bulk COGS */}
                      <span className="shopify-text-small ms-3">
                        Set All COGS:
                      </span>
                      <input
                        type="number"
                        className="shopify-input"
                        placeholder="COGS"
                        value={bulkValues[`${groupName}_cogs`] || ""}
                        onChange={(e) =>
                          handleBulkValueChange(
                            groupName,
                            "cogs",
                            e.target.value
                          )
                        }
                        style={{ width: "100px", fontSize: "13px" }}
                      />
                      <button
                        type="button"
                        className="shopify-btn shopify-btn-primary"
                        onClick={() => applyBulkValue(groupName, "cogs")}
                        title="Apply to all variants in this group"
                        style={{ padding: "6px 12px" }}
                      >
                        <Icon icon="mdi:check" width="16" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="p-3">
                  {variants.map((variant, index) => (
                    <VariantRowEditor
                      key={variant.id}
                      variant={variant}
                      vendors={vendors}
                      onChange={(updatedVariant) =>
                        onVariantChange(updatedVariant)
                      }
                      onDelete={() => onVariantDelete(variant)}
                      isLast={index === variants.length - 1}
                      mode={mode}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VariantGroupDisplay;
