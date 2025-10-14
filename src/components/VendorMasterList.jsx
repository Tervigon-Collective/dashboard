"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";

/**
 * Component to manage the master vendor list
 * Vendors can be added here and then assigned to variants
 */
const VendorMasterList = ({
  vendors,
  onAddVendor,
  onUpdateVendor,
  onRemoveVendor,
}) => {
  const [isAddingVendor, setIsAddingVendor] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState(null);
  const [vendorForm, setVendorForm] = useState({
    vendor_name: "",
    common_name: "",
    manufactured_by: "",
    manufacturing_date: "",
    vendor_status: "",
    imported_by: "",
  });

  const resetForm = () => {
    setVendorForm({
      vendor_name: "",
      common_name: "",
      manufactured_by: "",
      manufacturing_date: "",
      vendor_status: "",
      imported_by: "",
    });
    setIsAddingVendor(false);
    setEditingVendorId(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setVendorForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveVendor = () => {
    if (!vendorForm.vendor_name.trim()) {
      alert("Vendor name is required");
      return;
    }

    if (editingVendorId !== null) {
      onUpdateVendor(editingVendorId, vendorForm);
    } else {
      const newVendor = {
        id: Date.now(),
        ...vendorForm,
      };
      onAddVendor(newVendor);
    }

    resetForm();
  };

  const handleEditVendor = (vendor) => {
    setVendorForm({
      vendor_name: vendor.vendor_name,
      common_name: vendor.common_name || "",
      manufactured_by: vendor.manufactured_by || "",
      manufacturing_date: vendor.manufacturing_date || "",
      vendor_status: vendor.vendor_status || "",
      imported_by: vendor.imported_by || "",
    });
    setEditingVendorId(vendor.id);
    setIsAddingVendor(true);
  };

  return (
    <div className="shopify-card">
      <div className="shopify-card-header">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <h5 className="shopify-heading-3">
              <Icon icon="mdi:account-group" className="me-2" />
              Vendor Master List
            </h5>
            <p className="shopify-text-muted mb-0">
              Create vendors here, then assign them to specific variants below
            </p>
          </div>
          <button
            type="button"
            className="shopify-btn shopify-btn-primary"
            onClick={() => setIsAddingVendor(!isAddingVendor)}
          >
            <Icon icon="lucide:plus" width="16" height="16" className="me-1" />
            {isAddingVendor ? "Cancel" : "Add Vendor"}
          </button>
        </div>
      </div>
      <div className="shopify-card-body">
        {isAddingVendor && (
          <div
            className="border rounded p-3 mb-3"
            style={{ backgroundColor: "#f6f6f7", borderColor: "#c9cccf" }}
          >
            <h6 className="shopify-text-muted mb-3">
              {editingVendorId !== null ? "Edit Vendor" : "Add New Vendor"}
            </h6>

            <div className="shopify-form-grid shopify-form-grid-2">
              <div>
                <label htmlFor="vendor_name" className="shopify-label">
                  Vendor Name *
                </label>
                <input
                  type="text"
                  id="vendor_name"
                  name="vendor_name"
                  className="shopify-input"
                  value={vendorForm.vendor_name}
                  onChange={handleInputChange}
                  placeholder="Enter vendor name"
                />
              </div>
              <div>
                <label htmlFor="common_name" className="shopify-label">
                  Common Name
                </label>
                <input
                  type="text"
                  id="common_name"
                  name="common_name"
                  className="shopify-input"
                  value={vendorForm.common_name}
                  onChange={handleInputChange}
                  placeholder="Enter common name"
                />
              </div>
              <div>
                <label htmlFor="manufactured_by" className="shopify-label">
                  Manufactured By
                </label>
                <input
                  type="text"
                  id="manufactured_by"
                  name="manufactured_by"
                  className="shopify-input"
                  value={vendorForm.manufactured_by}
                  onChange={handleInputChange}
                  placeholder="Enter manufacturer"
                />
              </div>
              <div>
                <label htmlFor="manufacturing_date" className="shopify-label">
                  Manufacturing Date
                </label>
                <input
                  type="date"
                  id="manufacturing_date"
                  name="manufacturing_date"
                  className="shopify-input"
                  value={vendorForm.manufacturing_date}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label htmlFor="vendor_status" className="shopify-label">
                  Vendor Status
                </label>
                <select
                  id="vendor_status"
                  name="vendor_status"
                  className="shopify-select"
                  value={vendorForm.vendor_status}
                  onChange={handleInputChange}
                >
                  <option value="">Select Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label htmlFor="imported_by" className="shopify-label">
                  Imported By
                </label>
                <input
                  type="text"
                  id="imported_by"
                  name="imported_by"
                  className="shopify-input"
                  value={vendorForm.imported_by}
                  onChange={handleInputChange}
                  placeholder="Enter importer name"
                />
              </div>
            </div>

            <div className="d-flex gap-2 mt-3">
              <button
                type="button"
                className="shopify-btn shopify-btn-primary"
                onClick={handleSaveVendor}
              >
                <Icon icon="lucide:save" width="16" className="me-1" />
                {editingVendorId !== null ? "Update Vendor" : "Save Vendor"}
              </button>
              <button
                type="button"
                className="shopify-btn shopify-btn-secondary"
                onClick={resetForm}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {vendors.length === 0 ? (
          <div className="shopify-banner shopify-banner-info">
            <Icon icon="lucide:info" className="me-2" />
            No vendors added yet. Click "Add Vendor" to create your first
            vendor.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="shopify-table">
              <thead>
                <tr>
                  <th>Vendor Name</th>
                  <th>Common Name</th>
                  <th>Manufactured By</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor) => (
                  <tr key={vendor.id}>
                    <td>
                      <strong>{vendor.vendor_name}</strong>
                    </td>
                    <td>{vendor.common_name || "-"}</td>
                    <td>{vendor.manufactured_by || "-"}</td>
                    <td>
                      {vendor.vendor_status && (
                        <span
                          className={`badge ${
                            vendor.vendor_status === "active"
                              ? "bg-success"
                              : "bg-warning"
                          }`}
                        >
                          {vendor.vendor_status}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleEditVendor(vendor)}
                          title="Edit Vendor"
                        >
                          <Icon icon="lucide:edit" width="14" height="14" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => onRemoveVendor(vendor.id)}
                          title="Remove Vendor"
                        >
                          <Icon icon="lucide:trash-2" width="14" height="14" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorMasterList;
