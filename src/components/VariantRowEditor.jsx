"use client";

import { Icon } from "@iconify/react";
import { useState, useMemo } from "react";
import { Combobox } from "@headlessui/react";

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
  const [vendorQuery, setVendorQuery] = useState("");

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

  // Handle single company selection (replace existing, don't add multiple)
  const handleCompanySelect = (vendorId) => {
    if (!vendorId) {
      // Remove company if null
      onChange({ ...variant, vendor_pricing: [] });
      setVendorQuery("");
      return;
    }

    const vendor = vendors.find((v) => v.vendor_id == vendorId);
    if (!vendor) return;

    // Replace existing vendor with new one (single selection only)
    const updatedPricing = [
      {
        vendor_id: vendor.vendor_id, // vendor_master.vendor_id
        vendor_name: vendor.vendor_name, // For display
        is_primary_vendor: true, // Always primary since there's only one
      },
    ];

    onChange({ ...variant, vendor_pricing: updatedPricing });
    setVendorQuery(""); // Clear search after selection
  };

  // Get currently selected company (single selection)
  const selectedCompany = variant.vendor_pricing?.[0] || null;
  const selectedVendor = selectedCompany
    ? vendors.find((v) => v.vendor_id === selectedCompany.vendor_id)
    : null;

  // Filter vendors based on search query (show all vendors for selection)
  const filteredVendors = useMemo(() => {
    if (!vendorQuery.trim()) return vendors;
    const query = vendorQuery.toLowerCase();
    return vendors.filter(
      (vendor) =>
        (vendor.company_name &&
          vendor.company_name.toLowerCase().includes(query)) ||
        (vendor.vendor_name && vendor.vendor_name.toLowerCase().includes(query))
    );
  }, [vendors, vendorQuery]);

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

      {/* Row 3: Company/Vendors - Single Selection */}
      <div className="row">
        <div className="col-12">
          <label className="shopify-label">
            Company Name <span className="text-danger">*</span>
          </label>
          {vendors.length > 0 ? (
            <div className="position-relative">
              <Combobox
                value={selectedVendor}
                onChange={(vendor) => {
                  handleCompanySelect(vendor ? vendor.vendor_id : null);
                }}
              >
                <div className="position-relative">
                  <Combobox.Input
                    className="form-control"
                    placeholder="Select company..."
                    displayValue={(vendor) => {
                      if (vendor) {
                        return vendor.company_name
                          ? `${vendor.company_name} (${vendor.vendor_name})`
                          : vendor.vendor_name;
                      }
                      // Show search query if typing, otherwise show selected company
                      if (vendorQuery) return vendorQuery;
                      if (selectedVendor) {
                        return selectedVendor.company_name
                          ? `${selectedVendor.company_name} (${selectedVendor.vendor_name})`
                          : selectedVendor.vendor_name;
                      }
                      return "";
                    }}
                    onChange={(event) => setVendorQuery(event.target.value)}
                  />
                  <Combobox.Options
                    className="list-group position-absolute w-100 shadow-sm mt-1"
                    style={{
                      maxHeight: "240px",
                      overflowY: "auto",
                      zIndex: 1050,
                    }}
                  >
                    {filteredVendors.length === 0 ? (
                      <Combobox.Option
                        value={null}
                        disabled
                        className="list-group-item disabled"
                      >
                        No companies found
                      </Combobox.Option>
                    ) : (
                      filteredVendors.map((vendor) => (
                        <Combobox.Option
                          key={vendor.vendor_id}
                          value={vendor}
                          className={({ active }) =>
                            `list-group-item list-group-item-action ${
                              active ? "active" : ""
                            }`
                          }
                        >
                          {vendor.company_name
                            ? `${vendor.company_name} (${vendor.vendor_name})`
                            : vendor.vendor_name}
                        </Combobox.Option>
                      ))
                    )}
                  </Combobox.Options>
                </div>
              </Combobox>
            </div>
          ) : (
            <small className="shopify-text-small text-muted">
              No companies available. Please add companies in the Vendor Master
              module.
            </small>
          )}
        </div>
      </div>

      {/* Row 1: MRP, COGS, MOQ, Sample Quantity, Margin */}
      <div className="row mb-3">
        <div className="col-md-2">
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
        <div className="col-md-2">
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
        <div className="col-md-2">
          <label className="shopify-label">MOQ*</label>
          <input
            type="number"
            className="shopify-input"
            style={{ fontSize: "13px" }}
            placeholder="Enter MOQ"
            value={variant.moq || ""}
            onChange={(e) => handleFieldChange("moq", e.target.value)}
            required
          />
        </div>
        <div className="col-md-2">
          <label className="shopify-label">Sample Quantity</label>
          <input
            type="number"
            className="shopify-input"
            style={{ fontSize: "13px" }}
            placeholder="Enter sample quantity"
            value={variant.sample_quantity || ""}
            onChange={(e) =>
              handleFieldChange("sample_quantity", e.target.value)
            }
          />
        </div>
        <div className="col-md-2">
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
    </div>
  );
};

export default VariantRowEditor;
