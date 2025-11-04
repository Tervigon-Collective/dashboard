"use client";
import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import vendorMasterApi from "../services/vendorMasterApi";

const VendorMasterLayer = () => {
  const [vendors, setVendors] = useState([]);
  const [allVendors, setAllVendors] = useState([]); // Store all vendors for filtering
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    vendorName: "",
    vendorAddress: "",
    vendorPhoneNo: "",
    vendorGSTNumber: "",
    commonName: "",
    vendorStatus: "Active",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [editingVendor, setEditingVendor] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Search, filter, and sort states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [commonNameFilter, setCommonNameFilter] = useState("all"); // all, with, without
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");

  // Load vendors from API
  const loadVendors = async (page = 1) => {
    try {
      setIsLoading(true);
      const result = await vendorMasterApi.getAllVendors(page, 20);

      if (result.success) {
        setAllVendors(result.data);
        setVendors(result.data);
        setCurrentPage(result.pagination.page);
        setTotalPages(result.pagination.totalPages);
        setTotalRecords(result.pagination.total);
      } else {
        console.error("Failed to load vendors:", result.message);
      }
    } catch (error) {
      console.error("Error loading vendors:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load vendors on component mount
  useEffect(() => {
    loadVendors();
  }, []);

  // Search, filter, and sort logic
  useEffect(() => {
    let filtered = [...allVendors];

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((vendor) =>
        vendor.vendor_name?.toLowerCase().includes(search) ||
        vendor.vendor_phone_no?.toLowerCase().includes(search) ||
        vendor.vendor_gst_number?.toLowerCase().includes(search) ||
        vendor.vendor_address?.toLowerCase().includes(search) ||
        vendor.common_name?.toLowerCase().includes(search)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (vendor) => vendor.vendor_status === statusFilter
      );
    }

    // Apply common name filter
    if (commonNameFilter === "with") {
      filtered = filtered.filter((vendor) => vendor.common_name && vendor.common_name.trim() !== "");
    } else if (commonNameFilter === "without") {
      filtered = filtered.filter((vendor) => !vendor.common_name || vendor.common_name.trim() === "");
    }

    // Apply sorting
    if (sortField) {
      filtered.sort((a, b) => {
        let aVal = a[sortField] || "";
        let bVal = b[sortField] || "";
        
        if (typeof aVal === "string") {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }

        if (sortDirection === "asc") {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
          return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
      });
    }

    setVendors(filtered);
  }, [searchTerm, statusFilter, commonNameFilter, sortField, sortDirection, allVendors]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setCommonNameFilter("all");
    setSortField(null);
    setSortDirection("asc");
  };

  // Handle column sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Prepare data for API (convert frontend field names to backend field names)
      const apiData = {
        vendor_name: formData.vendorName,
        vendor_address: formData.vendorAddress,
        vendor_phone_no: formData.vendorPhoneNo,
        vendor_gst_number: formData.vendorGSTNumber,
        common_name: formData.commonName,
        vendor_status: formData.vendorStatus,
      };

      // Call the backend API using the service
      let result;
      if (isEditMode && editingVendor) {
        // Update existing vendor
        result = await vendorMasterApi.updateVendor(
          editingVendor.vendor_id,
          apiData
        );
      } else {
        // Create new vendor
        result = await vendorMasterApi.createVendor(apiData);
      }

      if (result.success) {
        // Reset form and close modal
        setFormData({
          vendorName: "",
          vendorAddress: "",
          vendorPhoneNo: "",
          vendorGSTNumber: "",
          commonName: "",
          vendorStatus: "Active",
        });

        setModalOpen(false);
        setIsEditMode(false);
        setEditingVendor(null);

        // Reload vendors list to show updated data
        await loadVendors(currentPage);

        console.log(
          isEditMode
            ? "Vendor updated successfully:"
            : "Vendor added successfully:",
          result.data
        );
      } else {
        console.error("API Error:", result.message);
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error("Error adding vendor:", error);
      alert("Failed to add vendor. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setIsEditMode(false);
    setEditingVendor(null);
    setFormData({
      vendorName: "",
      vendorAddress: "",
      vendorPhoneNo: "",
      vendorGSTNumber: "",
      commonName: "",
      vendorStatus: "Active",
    });
  };

  const handleEditVendor = (vendor) => {
    setEditingVendor(vendor);
    setIsEditMode(true);
    setFormData({
      vendorName: vendor.vendor_name,
      vendorAddress: vendor.vendor_address,
      vendorPhoneNo: vendor.vendor_phone_no,
      vendorGSTNumber: vendor.vendor_gst_number,
      commonName: vendor.common_name || "",
      vendorStatus: vendor.vendor_status,
    });
    setModalOpen(true);
  };

  const handleDeleteVendor = async (vendor) => {
    if (
      window.confirm(`Are you sure you want to delete "${vendor.vendor_name}"?`)
    ) {
      try {
        const result = await vendorMasterApi.deleteVendor(vendor.vendor_id);

        if (result.success) {
          // Reload vendors list to show updated data
          await loadVendors(currentPage);
          console.log("Vendor deleted successfully:", result.data);
        } else {
          console.error("API Error:", result.message);
          alert(`Error: ${result.message}`);
        }
      } catch (error) {
        console.error("Error deleting vendor:", error);
        alert("Failed to delete vendor. Please try again.");
      }
    }
  };

  return (
    <div className="card h-100 radius-8 border">
      <div className="card-body p-24">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center">
            <h6 className="mb-0 me-2">Vendor Master</h6>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="btn btn-primary d-inline-flex align-items-center"
            style={{ gap: "6px", padding: "8px 16px" }}
          >
            <Icon icon="lucide:plus" width="18" height="18" />
            <span className="d-none d-sm-inline">Add New Vendor</span>
            <span className="d-sm-none">Add</span>
          </button>
        </div>

        {/* Search and Filter Bar */}
        <div className="row g-3 mb-3">
          <div className="col-12 col-md-3">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0">
                <Icon icon="lucide:search" width="16" height="16" />
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search vendors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: "0" }}
              />
            </div>
          </div>
          <div className="col-12 col-md-2">
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div className="col-12 col-md-2">
            <select
              className="form-select"
              value={commonNameFilter}
              onChange={(e) => setCommonNameFilter(e.target.value)}
            >
              <option value="all">All Common Names</option>
              <option value="with">With Common Name</option>
              <option value="without">Without Common Name</option>
            </select>
          </div>
          <div className="col-12 col-md-2">
            <button
              className="btn btn-outline-secondary w-100"
              onClick={handleResetFilters}
              title="Reset all filters"
            >
              <Icon icon="lucide:rotate-ccw" width="16" height="16" className="me-1" />
              <span className="d-none d-sm-inline">Reset</span>
            </button>
          </div>
          <div className="col-12 col-md-3 d-flex justify-content-end align-items-center">
            <small className="text-muted">
              Showing {vendors.length} of {totalRecords} vendors
            </small>
          </div>
        </div>

        {/* Vendors List */}
        <div className="table-responsive scroll-sm">
          <table className="table bordered-table mb-0">
            <thead>
              <tr>
                <th scope="col" style={{ width: "60px" }}>
                  #
                </th>
                <th
                  scope="col"
                  onClick={() => handleSort("vendor_name")}
                  style={{ cursor: "pointer", userSelect: "none" }}
                >
                  <div className="d-flex align-items-center gap-2">
                    Vendor Name
                    {sortField === "vendor_name" && (
                      <Icon
                        icon={
                          sortDirection === "asc"
                            ? "lucide:chevron-up"
                            : "lucide:chevron-down"
                        }
                        width="14"
                        height="14"
                      />
                    )}
                  </div>
                </th>
                <th
                  scope="col"
                  onClick={() => handleSort("vendor_phone_no")}
                  style={{ cursor: "pointer", userSelect: "none" }}
                >
                  <div className="d-flex align-items-center gap-2">
                    Phone No.
                    {sortField === "vendor_phone_no" && (
                      <Icon
                        icon={
                          sortDirection === "asc"
                            ? "lucide:chevron-up"
                            : "lucide:chevron-down"
                        }
                        width="14"
                        height="14"
                      />
                    )}
                  </div>
                </th>
                <th scope="col">GST Number</th>
                <th
                  scope="col"
                  onClick={() => handleSort("vendor_status")}
                  style={{ cursor: "pointer", userSelect: "none" }}
                >
                  <div className="d-flex align-items-center gap-2">
                    Status
                    {sortField === "vendor_status" && (
                      <Icon
                        icon={
                          sortDirection === "asc"
                            ? "lucide:chevron-up"
                            : "lucide:chevron-down"
                        }
                        width="14"
                        height="14"
                      />
                    )}
                  </div>
                </th>
                <th scope="col">Address</th>
                <th scope="col" className="text-center" style={{ width: "120px" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="text-center py-4">
                    <div className="d-flex justify-content-center align-items-center">
                      <div
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                      >
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      Loading vendors...
                    </div>
                  </td>
                </tr>
              ) : vendors.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted">
                    <div className="d-flex flex-column align-items-center">
                      <p className="text-muted mb-0">
                        {searchTerm || statusFilter !== "all" || commonNameFilter !== "all"
                          ? "No vendors match your search criteria."
                          : 'No vendors found. Click "Add New Vendor" to get started.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                vendors.map((vendor, index) => (
                  <tr key={vendor.vendor_id}>
                    <td>
                      <span className="text-secondary-light">
                        {(currentPage - 1) * 20 + index + 1}
                      </span>
                    </td>
                    <td>
                      <span className="text-secondary-light fw-medium">
                        {vendor.vendor_name}
                      </span>
                    </td>
                    <td>
                      <span className="text-secondary-light">
                        {vendor.vendor_phone_no}
                      </span>
                    </td>
                    <td>
                      <span className="text-secondary-light">
                        {vendor.vendor_gst_number}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          vendor.vendor_status === "Active"
                            ? "bg-success"
                            : "bg-secondary"
                        }`}
                        style={{ fontSize: "0.75rem", padding: "4px 8px" }}
                      >
                        {vendor.vendor_status}
                      </span>
                    </td>
                    <td>
                      <span
                        className="text-secondary-light text-truncate d-inline-block"
                        style={{ maxWidth: "200px" }}
                        title={vendor.vendor_address}
                      >
                        {vendor.vendor_address}
                      </span>
                    </td>
                    <td className="text-center">
                      <div className="d-flex gap-2 justify-content-center">
                        <button
                          className="btn btn-sm"
                          style={{
                            border: "1px solid #dee2e6",
                            background: "white",
                            padding: "4px 8px",
                            color: "#495057",
                            borderRadius: "4px",
                          }}
                          title="Edit"
                          onClick={() => handleEditVendor(vendor)}
                        >
                          <Icon icon="lucide:pencil" width="14" height="14" />
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{
                            border: "1px solid #dc3545",
                            background: "white",
                            padding: "4px 8px",
                            color: "#dc3545",
                            borderRadius: "4px",
                          }}
                          title="Delete"
                          onClick={() => handleDeleteVendor(vendor)}
                        >
                          <Icon icon="lucide:trash-2" width="14" height="14" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalRecords > 0 && (
          <div
            className="d-flex justify-content-between align-items-center px-3 py-2"
            style={{
              backgroundColor: "#f8f9fa",
              borderRadius: "0 0 8px 8px",
              marginTop: "0",
            }}
          >
            <div className="d-flex align-items-center gap-2">
              <button
                className="btn btn-sm"
                style={{ border: "none", background: "none", color: "#495057" }}
                onClick={() => loadVendors(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <Icon icon="mdi:chevron-left" width="16" height="16" />
              </button>

              {/* Page Numbers */}
              <div className="d-flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      className="btn btn-sm"
                      style={{
                        border: "none",
                        background:
                          pageNum === currentPage ? "#6f42c1" : "transparent",
                        color: pageNum === currentPage ? "white" : "#495057",
                        borderRadius: "4px",
                        padding: "4px 8px",
                        minWidth: "32px",
                      }}
                      onClick={() => loadVendors(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                {totalPages > 5 && (
                  <>
                    <span className="px-2" style={{ color: "#495057" }}>
                      ...
                    </span>
                    <button
                      className="btn btn-sm"
                      style={{
                        border: "none",
                        background:
                          totalPages === currentPage
                            ? "#6f42c1"
                            : "transparent",
                        color: totalPages === currentPage ? "white" : "#495057",
                        borderRadius: "4px",
                        padding: "4px 8px",
                        minWidth: "32px",
                      }}
                      onClick={() => loadVendors(totalPages)}
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>

              <button
                className="btn btn-sm"
                style={{ border: "none", background: "none", color: "#495057" }}
                onClick={() => loadVendors(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <Icon icon="mdi:chevron-right" width="16" height="16" />
              </button>
            </div>

            <div className="d-flex align-items-center gap-3">
              <div className="d-flex align-items-center gap-2">
                <span style={{ color: "#495057", fontSize: "0.875rem" }}>
                  20/page
                </span>
                <Icon
                  icon="mdi:chevron-down"
                  width="16"
                  height="16"
                  style={{ color: "#495057" }}
                />
              </div>
              <span style={{ color: "#495057", fontSize: "0.875rem" }}>
                Total {totalRecords} record{totalRecords !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        )}

        {/* Add Vendor Modal */}
        {modalOpen && (
          <div
            className="modal fade show d-block"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    {isEditMode ? "Edit Vendor" : "Add New Vendor"}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={handleModalClose}
                  ></button>
                </div>
                <div className="modal-body">
                  <form onSubmit={handleSubmit}>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label htmlFor="vendorName" className="form-label">
                          Vendor Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          id="vendorName"
                          name="vendorName"
                          value={formData.vendorName}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label htmlFor="vendorPhoneNo" className="form-label">
                          Vendor Phone No.{" "}
                          <span className="text-danger">*</span>
                        </label>
                        <input
                          type="tel"
                          className="form-control"
                          id="vendorPhoneNo"
                          name="vendorPhoneNo"
                          value={formData.vendorPhoneNo}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label htmlFor="vendorGSTNumber" className="form-label">
                          Vendor GST Number{" "}
                          <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          id="vendorGSTNumber"
                          name="vendorGSTNumber"
                          value={formData.vendorGSTNumber}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label htmlFor="commonName" className="form-label">
                          Common Name
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          id="commonName"
                          name="commonName"
                          value={formData.commonName}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label htmlFor="vendorAddress" className="form-label">
                          Vendor Address <span className="text-danger">*</span>
                        </label>
                        <textarea
                          className="form-control"
                          id="vendorAddress"
                          name="vendorAddress"
                          rows="3"
                          value={formData.vendorAddress}
                          onChange={handleInputChange}
                          required
                        ></textarea>
                      </div>
                      <div className="col-md-6 mb-3">
                        <label htmlFor="vendorStatus" className="form-label">
                          Vendor Status <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          id="vendorStatus"
                          name="vendorStatus"
                          value={formData.vendorStatus}
                          onChange={handleInputChange}
                          required
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>
                    </div>

                    <div className="modal-footer">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleModalClose}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <span
                              className="spinner-border spinner-border-sm me-2"
                              role="status"
                              aria-hidden="true"
                            ></span>
                            {isEditMode ? "Updating..." : "Saving..."}
                          </>
                        ) : isEditMode ? (
                          "Update Vendor"
                        ) : (
                          "Save Vendor"
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorMasterLayer;

