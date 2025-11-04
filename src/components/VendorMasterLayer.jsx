"use client";
import React, { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import vendorMasterApi from "../services/vendorMasterApi";

const VendorMasterLayer = () => {
  const [vendors, setVendors] = useState([]);
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
  
  // Form validation errors
  const [formErrors, setFormErrors] = useState({});
  
  // Search, filter, and sort states
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [commonNameFilter, setCommonNameFilter] = useState("all"); // all, with, without
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");

  // Debounce search term (industry best practice: 500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load vendors from API with server-side search, filters, and pagination
  const loadVendors = async (page = 1, resetPage = false) => {
    try {
      setIsLoading(true);
      
      const targetPage = resetPage ? 1 : page;
      
      const options = {
        search: debouncedSearchTerm || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        commonNameFilter: commonNameFilter !== "all" ? commonNameFilter : undefined,
        sortField: sortField || undefined,
        sortDirection: sortDirection || undefined,
      };

      const result = await vendorMasterApi.getAllVendors(targetPage, 20, options);

      if (result.success) {
        setVendors(result.data || []);
        setCurrentPage(result.pagination?.page || targetPage);
        setTotalPages(result.pagination?.totalPages || 1);
        setTotalRecords(result.pagination?.total || 0);
      } else {
        console.error("Failed to load vendors:", result.message);
        setVendors([]);
      }
    } catch (error) {
      console.error("Error loading vendors:", error);
      setVendors([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Track initial mount
  const [isMounted, setIsMounted] = useState(false);
  const prevPageRef = useRef(1);
  const prevFiltersRef = useRef({
    search: "",
    status: "all",
    commonName: "all",
    sort: null,
    sortDir: "asc",
  });

  // Initial load on mount
  useEffect(() => {
    setIsMounted(true);
    loadVendors(1, false);
    prevPageRef.current = 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Single effect to handle all data loading
  useEffect(() => {
    if (!isMounted) return;

    const currentFilters = {
      search: debouncedSearchTerm,
      status: statusFilter,
      commonName: commonNameFilter,
      sort: sortField,
      sortDir: sortDirection,
    };

    const prevFilters = prevFiltersRef.current;
    const prevPage = prevPageRef.current;

    // Check if filters changed
    const filtersChanged =
      prevFilters.search !== currentFilters.search ||
      prevFilters.status !== currentFilters.status ||
      prevFilters.commonName !== currentFilters.commonName ||
      prevFilters.sort !== currentFilters.sort ||
      prevFilters.sortDir !== currentFilters.sortDir;

    // Check if page changed
    const pageChanged = prevPage !== currentPage;

    // If filters changed, reset to page 1 and load
    if (filtersChanged) {
      prevFiltersRef.current = currentFilters;
      if (currentPage !== 1) {
        // Reset page first, let the page change trigger reload
        prevPageRef.current = currentPage;
        setCurrentPage(1);
      } else {
        // Already on page 1, load immediately
        prevPageRef.current = 1;
        loadVendors(1, true);
      }
      return;
    }
    
    // If only page changed (not filters), load that page
    if (pageChanged && currentPage > 0) {
      prevPageRef.current = currentPage;
      loadVendors(currentPage, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted, debouncedSearchTerm, statusFilter, commonNameFilter, sortField, sortDirection, currentPage]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setStatusFilter("all");
    setCommonNameFilter("all");
    setSortField(null);
    setSortDirection("asc");
    setCurrentPage(1);
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
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // Parse validation errors and map to form fields
  const parseValidationErrors = (validationErrors) => {
    const errors = {};
    if (validationErrors && Array.isArray(validationErrors)) {
      validationErrors.forEach((error) => {
        // Parse error message like "vendor_name: Vendor name is required"
        const match = error.match(/^(\w+):\s*(.+)$/);
        if (match) {
          const fieldName = match[1];
          const message = match[2];
          
          // Map backend field names to frontend field names
          const fieldMap = {
            vendor_name: "vendorName",
            vendor_address: "vendorAddress",
            vendor_phone_no: "vendorPhoneNo",
            vendor_gst_number: "vendorGSTNumber",
            common_name: "commonName",
            vendor_status: "vendorStatus",
          };
          
          const frontendField = fieldMap[fieldName] || fieldName;
          errors[frontendField] = message;
        } else {
          // If format doesn't match, show general error
          errors.general = error;
        }
      });
    }
    return errors;
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
        setFormErrors({});

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
        // Parse and display validation errors
        if (result.validationErrors && result.validationErrors.length > 0) {
          const parsedErrors = parseValidationErrors(result.validationErrors);
          setFormErrors(parsedErrors);
        } else {
          setFormErrors({ general: result.message || "An error occurred" });
        }
      }
    } catch (error) {
      console.error("Error adding/updating vendor:", error);
      
      // Handle formatted errors from API service
      if (error.result) {
        if (error.result.validationErrors && error.result.validationErrors.length > 0) {
          const parsedErrors = parseValidationErrors(error.result.validationErrors);
          setFormErrors(parsedErrors);
        } else {
          setFormErrors({ general: error.result.message || error.message || "An error occurred" });
        }
      } else {
        setFormErrors({ general: error.message || "Failed to add/update vendor. Please try again." });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setIsEditMode(false);
    setEditingVendor(null);
    setFormErrors({});
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
    setFormErrors({});
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
          if (result.validationErrors && result.validationErrors.length > 0) {
            alert(`Validation Error:\n${result.validationErrors.join("\n")}`);
          } else {
            alert(`Error: ${result.message}`);
          }
        }
      } catch (error) {
        console.error("Error deleting vendor:", error);
        if (error.result) {
          alert(`Error: ${error.result.message || error.message}`);
        } else {
          alert(`Error: ${error.message || "Failed to delete vendor. Please try again."}`);
        }
      }
    }
  };

  return (
    <div>
      {/* Search, Filter, and Action Bar - Single Line */}
      <div className="d-flex align-items-center gap-2 mb-4 flex-wrap">
        {/* Search Input */}
        <div className="position-relative" style={{ flex: "1 1 250px", minWidth: "200px" }}>
          <Icon
            icon="lucide:search"
            width="16"
            height="16"
            className="position-absolute top-50 translate-middle-y"
            style={{ left: "12px", color: "#6c757d", zIndex: 1 }}
          />
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: "36px", height: "36px", fontSize: "0.875rem" }}
          />
        </div>

        {/* Filter Dropdowns */}
        <select
          className="form-select form-select-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ height: "36px", width: "auto", minWidth: "130px", fontSize: "0.875rem" }}
        >
          <option value="all">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>

        <select
          className="form-select form-select-sm"
          value={commonNameFilter}
          onChange={(e) => setCommonNameFilter(e.target.value)}
          style={{ height: "36px", width: "auto", minWidth: "150px", fontSize: "0.875rem" }}
        >
          <option value="all">All Common Names</option>
          <option value="with">With Common Name</option>
          <option value="without">Without Common Name</option>
        </select>

        {/* Reset Button */}
        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={handleResetFilters}
          title="Reset filters"
          style={{ height: "36px", padding: "6px 12px", fontSize: "0.875rem" }}
        >
          <Icon icon="lucide:x" width="14" height="14" />
        </button>

        {/* Vendor Count */}
        <span className="text-muted ms-auto" style={{ fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
          Showing {vendors.length} of {totalRecords} vendors
        </span>

        {/* Add Button */}
        <button
          onClick={() => {
            setFormErrors({});
            setModalOpen(true);
          }}
          className="btn btn-primary btn-sm d-inline-flex align-items-center"
          style={{ gap: "4px", padding: "6px 14px", height: "36px", fontSize: "0.875rem" }}
        >
          <Icon icon="lucide:plus" width="16" height="16" />
          <span>Add Vendor</span>
        </button>
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
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1 || isLoading}
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
                      onClick={() => setCurrentPage(pageNum)}
                      disabled={isLoading}
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
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={isLoading}
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>

              <button
                className="btn btn-sm"
                style={{ border: "none", background: "none", color: "#495057" }}
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages || isLoading}
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
                    {/* General Error Message */}
                    {formErrors.general && (
                      <div className="alert alert-danger" role="alert">
                        {formErrors.general}
                      </div>
                    )}

                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label htmlFor="vendorName" className="form-label">
                          Vendor Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className={`form-control ${formErrors.vendorName ? "is-invalid" : ""}`}
                          id="vendorName"
                          name="vendorName"
                          value={formData.vendorName}
                          onChange={handleInputChange}
                          required
                        />
                        {formErrors.vendorName && (
                          <div className="invalid-feedback d-block">
                            {formErrors.vendorName}
                          </div>
                        )}
                      </div>
                      <div className="col-md-6 mb-3">
                        <label htmlFor="vendorPhoneNo" className="form-label">
                          Vendor Phone No.{" "}
                          <span className="text-danger">*</span>
                        </label>
                        <input
                          type="tel"
                          className={`form-control ${formErrors.vendorPhoneNo ? "is-invalid" : ""}`}
                          id="vendorPhoneNo"
                          name="vendorPhoneNo"
                          value={formData.vendorPhoneNo}
                          onChange={handleInputChange}
                          required
                        />
                        {formErrors.vendorPhoneNo && (
                          <div className="invalid-feedback d-block">
                            {formErrors.vendorPhoneNo}
                          </div>
                        )}
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
                          className={`form-control ${formErrors.vendorGSTNumber ? "is-invalid" : ""}`}
                          id="vendorGSTNumber"
                          name="vendorGSTNumber"
                          value={formData.vendorGSTNumber}
                          onChange={handleInputChange}
                          required
                        />
                        {formErrors.vendorGSTNumber && (
                          <div className="invalid-feedback d-block">
                            {formErrors.vendorGSTNumber}
                          </div>
                        )}
                      </div>
                      <div className="col-md-6 mb-3">
                        <label htmlFor="commonName" className="form-label">
                          Common Name
                        </label>
                        <input
                          type="text"
                          className={`form-control ${formErrors.commonName ? "is-invalid" : ""}`}
                          id="commonName"
                          name="commonName"
                          value={formData.commonName}
                          onChange={handleInputChange}
                        />
                        {formErrors.commonName && (
                          <div className="invalid-feedback d-block">
                            {formErrors.commonName}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label htmlFor="vendorAddress" className="form-label">
                          Vendor Address <span className="text-danger">*</span>
                        </label>
                        <textarea
                          className={`form-control ${formErrors.vendorAddress ? "is-invalid" : ""}`}
                          id="vendorAddress"
                          name="vendorAddress"
                          rows="3"
                          value={formData.vendorAddress}
                          onChange={handleInputChange}
                          required
                        ></textarea>
                        {formErrors.vendorAddress && (
                          <div className="invalid-feedback d-block">
                            {formErrors.vendorAddress}
                          </div>
                        )}
                      </div>
                      <div className="col-md-6 mb-3">
                        <label htmlFor="vendorStatus" className="form-label">
                          Vendor Status <span className="text-danger">*</span>
                        </label>
                        <select
                          className={`form-select ${formErrors.vendorStatus ? "is-invalid" : ""}`}
                          id="vendorStatus"
                          name="vendorStatus"
                          value={formData.vendorStatus}
                          onChange={handleInputChange}
                          required
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                        {formErrors.vendorStatus && (
                          <div className="invalid-feedback d-block">
                            {formErrors.vendorStatus}
                          </div>
                        )}
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
  );
};

export default VendorMasterLayer;

