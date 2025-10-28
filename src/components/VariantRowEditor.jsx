"use client";

import { Icon } from "@iconify/react";
import { useState } from "react";

/**
 * Component to edit a single variant row
 * All fields displayed horizontally
 */
const VariantRowEditor = ({
  variant,
  vendors,
  onChange,
  onDelete,
  mode,
  isLast,
}) => {
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);

  const handleFieldChange = (field, value) => {
    const updated = { ...variant, [field]: value };

    // Auto-calculate margin when MRP or COGS changes
    if (field === "mrp" || field === "cogs") {
      const mrp = parseFloat(field === "mrp" ? value : updated.mrp) || 0;
      const cogs = parseFloat(field === "cogs" ? value : updated.cogs) || 0;
      updated.margin = (mrp - cogs).toFixed(2);
    }

    onChange(updated);
  };

  const handleVendorToggle = (vendorId) => {
    const vendorPricing = variant.vendor_pricing || [];
    const existingIndex = vendorPricing.findIndex(
      (vp) => vp.vendor_id == vendorId
    );

    let updatedPricing;

    if (existingIndex >= 0) {
      // Remove vendor
      updatedPricing = vendorPricing.filter((vp) => vp.vendor_id != vendorId);
    } else {
      // Add vendor
      const vendor = vendors.find((v) => (v.id || v.vendor_id) == vendorId);
      if (!vendor) return;

      // Check if this should be primary (first vendor added)
      const isPrimary = vendorPricing.length === 0;

      // If making primary, unmark others
      if (isPrimary) {
        updatedPricing = vendorPricing.map((vp) => ({
          ...vp,
          is_primary_vendor: false,
        }));
      } else {
        updatedPricing = [...vendorPricing];
      }

      updatedPricing.push({
        vendor_id: vendor.id || vendor.vendor_id,
        vendor_name: vendor.vendor_name,
        is_primary_vendor: isPrimary,
      });
    }

    onChange({ ...variant, vendor_pricing: updatedPricing });
  };

  const togglePrimaryVendor = (vendorId) => {
    const vendorPricing = variant.vendor_pricing || [];
    const updatedPricing = vendorPricing.map((vp) => ({
      ...vp,
      is_primary_vendor: vp.vendor_id == vendorId,
    }));
    onChange({ ...variant, vendor_pricing: updatedPricing });
  };

  const assignedVendorIds =
    variant.vendor_pricing?.map((vp) => vp.vendor_id) || [];
  const availableVendors = vendors.filter(
    (v) => !assignedVendorIds.includes(v.id || v.vendor_id)
  );

  return (
    <div
      className={`border rounded p-3 ${!isLast ? "mb-3" : ""}`}
      style={{ backgroundColor: "#fff", borderColor: "#c9cccf" }}
    >
      {/* Variant Name */}
      <div
        className="mb-3 pb-2 d-flex justify-content-between align-items-center"
        style={{ borderBottom: "1px solid #e1e3e5" }}
      >
        <strong style={{ color: "#005bd3", fontSize: "14px" }}>
          <Icon icon="mdi:tag" className="me-1" width="16" />
          {variant.displayName}
        </strong>

        {/* Delete Button - Only show in edit mode */}
        {mode === "edit" && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="btn btn-sm btn-outline-danger"
            style={{ padding: "4px 8px", fontSize: "12px" }}
            title="Delete this variant"
          >
            <Icon icon="lucide:trash-2" width="14" height="14" />
          </button>
        )}
      </div>

      {/* Row 1: MRP, COGS, Quantity, Margin */}
      <div className="row mb-3">
        <div className="col-md-3">
          <label className="shopify-label">MRP *</label>
          <input
            type="number"
            step="0.01"
            className="shopify-input"
            style={{ fontSize: "13px" }}
            placeholder="Enter MRP"
            value={variant.mrp}
            onChange={(e) => handleFieldChange("mrp", e.target.value)}
          />
        </div>
        <div className="col-md-3">
          <label className="shopify-label">COGS *</label>
          <input
            type="number"
            step="0.01"
            className="shopify-input"
            style={{ fontSize: "13px" }}
            placeholder="Enter COGS"
            value={variant.cogs}
            onChange={(e) => handleFieldChange("cogs", e.target.value)}
          />
        </div>
        <div className="col-md-3">
          <label className="shopify-label">Quantity</label>
          <input
            type="number"
            className="shopify-input"
            style={{ fontSize: "13px" }}
            placeholder="Enter quantity"
            value={variant.quantity}
            onChange={(e) => handleFieldChange("quantity", e.target.value)}
          />
        </div>
        <div className="col-md-3">
          <label className="shopify-label">Margin</label>
          <input
            type="number"
            step="0.01"
            className="shopify-input"
            style={{ fontSize: "13px", backgroundColor: "#f6f6f7" }}
            placeholder="Auto-calculated"
            value={variant.margin}
            readOnly
          />
        </div>
      </div>

      {/* Row 2: SKU, Dimensions */}
      <div className="row mb-3">
        <div className="col-md-4">
          <label className="shopify-label">SKU</label>
          <input
            type="text"
            className="shopify-input"
            style={{ fontSize: "13px" }}
            placeholder="Enter SKU manually"
            value={variant.sku}
            onChange={(e) => handleFieldChange("sku", e.target.value)}
          />
        </div>
        <div className="col-md-4">
          <label className="shopify-label">Dimension (with packing)</label>
          <input
            type="text"
            className="shopify-input"
            style={{ fontSize: "13px" }}
            value={variant.dimension_with_packing}
            onChange={(e) =>
              handleFieldChange("dimension_with_packing", e.target.value)
            }
          />
        </div>
        <div className="col-md-4">
          <label className="shopify-label">Dimension (without packing)</label>
          <input
            type="text"
            className="shopify-input"
            style={{ fontSize: "13px" }}
            value={variant.dimension_without_packing}
            onChange={(e) =>
              handleFieldChange("dimension_without_packing", e.target.value)
            }
          />
        </div>
      </div>

      {/* Row 3: Vendors */}
      <div className="row">
        <div className="col-12">
          <label className="shopify-label">Assigned Vendors</label>
          <div className="d-flex flex-wrap gap-2 align-items-center">
            {/* Display assigned vendors */}
            {variant.vendor_pricing && variant.vendor_pricing.length > 0 ? (
              variant.vendor_pricing.map((vp, index) => (
                <span
                  key={index}
                  className={`badge ${
                    vp.is_primary_vendor ? "bg-success" : "bg-secondary"
                  } d-flex align-items-center`}
                  style={{
                    fontSize: "13px",
                    padding: "6px 10px",
                    cursor: "pointer",
                  }}
                  onClick={() => togglePrimaryVendor(vp.vendor_id)}
                  title={
                    vp.is_primary_vendor
                      ? "Primary vendor - click to change"
                      : "Click to make primary"
                  }
                >
                  {vp.is_primary_vendor && (
                    <Icon icon="mdi:star" className="me-1" width="14" />
                  )}
                  {vp.vendor_name}
                  <span
                    className="ms-2"
                    style={{
                      fontSize: "16px",
                      cursor: "pointer",
                      opacity: 0.8,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVendorToggle(vp.vendor_id);
                    }}
                    aria-label="Remove"
                  >
                    ×
                  </span>
                </span>
              ))
            ) : (
              <small className="shopify-text-small">No vendors assigned</small>
            )}

            {/* Add Vendor Button */}
            {vendors.length > 0 && (
              <div className="position-relative">
                <button
                  type="button"
                  className="shopify-btn shopify-btn-secondary"
                  style={{ fontSize: "13px", padding: "6px 12px" }}
                  onClick={() => setShowVendorDropdown(!showVendorDropdown)}
                >
                  <Icon icon="mdi:plus" className="me-1" width="14" />
                  Assign Vendor
                </button>

                {/* Vendor Dropdown */}
                {showVendorDropdown && (
                  <div
                    className="position-absolute bg-white border rounded shadow-sm"
                    style={{
                      top: "100%",
                      left: 0,
                      zIndex: 1000,
                      minWidth: "200px",
                      maxHeight: "200px",
                      overflowY: "auto",
                      marginTop: "4px",
                      borderColor: "#c9cccf",
                    }}
                  >
                    {availableVendors.length > 0 ? (
                      <div className="list-group list-group-flush">
                        {availableVendors.map((vendor) => (
                          <button
                            key={vendor.id || vendor.vendor_id}
                            type="button"
                            className="list-group-item list-group-item-action"
                            style={{ fontSize: "13px" }}
                            onClick={() => {
                              handleVendorToggle(vendor.id || vendor.vendor_id);
                              setShowVendorDropdown(false);
                            }}
                          >
                            {vendor.vendor_name}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-2 shopify-text-small">
                        All vendors assigned
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {vendors.length === 0 && (
              <small className="shopify-text-small">
                Add vendors in the Vendor Master List above
              </small>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VariantRowEditor;
