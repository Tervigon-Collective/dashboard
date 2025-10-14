"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";

/**
 * Component to manage vendor assignments for a specific variant
 * Allows assigning multiple vendors to a variant and marking one as primary
 */
const VariantVendorManager = ({
  vendors = [],
  vendorPricing = [],
  onVendorPricingChange,
  variantLabel = "Variant",
}) => {
  const [isAddingVendor, setIsAddingVendor] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);

  // Get vendors that are NOT already assigned to this variant
  const availableVendors = vendors.filter(
    (vendor) =>
      !vendorPricing.some(
        (vp) => vp.vendor_id === vendor.id || vp.vendor_id === vendor.vendor_id
      )
  );

  const handleAddVendorPricing = () => {
    if (!selectedVendorId) {
      alert("Please select a vendor");
      return;
    }

    // Find the vendor details
    const selectedVendor = vendors.find(
      (v) => v.id == selectedVendorId || v.vendor_id == selectedVendorId
    );

    if (!selectedVendor) {
      alert("Selected vendor not found");
      return;
    }

    // If marking as primary, unmark all others
    let updatedPricing = vendorPricing.map((vp) => ({
      ...vp,
      is_primary_vendor: isPrimary ? false : vp.is_primary_vendor,
    }));

    // Add new vendor relationship
    const newVendorPricing = {
      vendor_id: selectedVendor.id || selectedVendor.vendor_id,
      vendor_name: selectedVendor.vendor_name,
      is_primary_vendor: isPrimary,
    };

    updatedPricing.push(newVendorPricing);

    // Update parent component
    onVendorPricingChange(updatedPricing);

    // Reset form
    setSelectedVendorId("");
    setIsPrimary(false);
    setIsAddingVendor(false);
  };

  const handleRemoveVendor = (vendorId) => {
    const updatedPricing = vendorPricing.filter(
      (vp) => vp.vendor_id !== vendorId
    );
    onVendorPricingChange(updatedPricing);
  };

  const handleTogglePrimary = (vendorId) => {
    const updatedPricing = vendorPricing.map((vp) => ({
      ...vp,
      is_primary_vendor: vp.vendor_id === vendorId,
    }));
    onVendorPricingChange(updatedPricing);
  };

  return (
    <div className="border rounded p-3" style={{ backgroundColor: "#f8f9fa" }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0">
          <Icon icon="mdi:truck" className="me-2" width="20" />
          Vendor Pricing for {variantLabel}
        </h6>
        {availableVendors.length > 0 && (
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={() => setIsAddingVendor(!isAddingVendor)}
          >
            <Icon icon="mdi:plus" className="me-1" width="16" />
            Assign Vendor
          </button>
        )}
      </div>

      {/* Add Vendor Form */}
      {isAddingVendor && availableVendors.length > 0 && (
        <div className="card mb-3">
          <div className="card-body">
            <h6 className="mb-3">Assign Vendor to {variantLabel}</h6>

            <div className="row">
              <div className="col-md-8 mb-3">
                <label className="form-label">Select Vendor *</label>
                <select
                  className="form-select"
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                >
                  <option value="">Choose vendor...</option>
                  {availableVendors.map((vendor) => (
                    <option
                      key={vendor.id || vendor.vendor_id}
                      value={vendor.id || vendor.vendor_id}
                    >
                      {vendor.vendor_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-4 mb-3">
                <label className="form-label d-block">Primary Vendor</label>
                <div className="form-check form-switch mt-2">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="isPrimary"
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="isPrimary">
                    {isPrimary ? "Yes" : "No"}
                  </label>
                </div>
              </div>
            </div>

            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={handleAddVendorPricing}
              >
                Add Vendor
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => {
                  setIsAddingVendor(false);
                  setSelectedVendorId("");
                  setIsPrimary(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No vendors message */}
      {vendors.length === 0 && (
        <div className="alert alert-warning mb-0">
          <Icon icon="mdi:alert" className="me-2" />
          Please add vendors in the Vendor Master List above before assigning
          them to variants.
        </div>
      )}

      {/* All vendors assigned message */}
      {vendors.length > 0 &&
        availableVendors.length === 0 &&
        vendorPricing.length > 0 && (
          <div className="alert alert-info mb-3">
            <Icon icon="mdi:information" className="me-2" />
            All vendors have been assigned to this variant.
          </div>
        )}

      {/* No vendor pricing yet */}
      {vendorPricing.length === 0 && vendors.length > 0 && (
        <div className="alert alert-secondary mb-0">
          <Icon icon="mdi:information-outline" className="me-2" />
          No vendors assigned yet. Click "Assign Vendor" to add vendor pricing.
        </div>
      )}

      {/* Display Assigned Vendor Pricing */}
      {vendorPricing.length > 0 && (
        <div>
          <h6 className="mb-2">Assigned Vendors ({vendorPricing.length})</h6>
          <div className="table-responsive">
            <table className="table table-sm table-bordered">
              <thead className="table-light">
                <tr>
                  <th>Vendor Name</th>
                  <th>Primary</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendorPricing.map((vp, index) => (
                  <tr key={index}>
                    <td>
                      {vp.vendor_name || "N/A"}
                      {vp.is_primary_vendor && (
                        <span className="badge bg-success ms-2">Primary</span>
                      )}
                    </td>
                    <td>
                      <div className="form-check form-switch">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={vp.is_primary_vendor}
                          onChange={() => handleTogglePrimary(vp.vendor_id)}
                        />
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleRemoveVendor(vp.vendor_id)}
                        title="Remove Vendor"
                      >
                        <Icon icon="mdi:delete" width="16" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default VariantVendorManager;
