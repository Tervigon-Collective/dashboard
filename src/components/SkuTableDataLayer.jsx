"use client";
import { useEffect, useState, useMemo } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import Modal from "react-modal";
import config from "../config";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Only set Modal app element on the client side
if (typeof window !== "undefined") {
  Modal.setAppElement("body");
}

// Toast notifications
const handleSuccess = (action) => {
  toast.success(`${action} successfully!`, {
    position: "top-right",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  });
};

const handleError = (action) => {
  toast.error(`Failed to ${action}. Please try again.`, {
    position: "top-right",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  });
};

const SkuTableDataLayer = () => {
  const [skuData, setSkuData] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [confirmModalIsOpen, setConfirmModalIsOpen] = useState(false);
  const [deleteSkuName, setDeleteSkuName] = useState(null);
  const [editSku, setEditSku] = useState(null);
  const [newSku, setNewSku] = useState({
    product_name: "",
    sku_name: "",
    variant_title: "NA",
    selling_price: "",
    cogs: "",
    margin: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Search and pagination states
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc'
  });

  // Create a map to store counters for each SKU-variant combination
  const [keyCounters, setKeyCounters] = useState({});

  // Function to get a unique key
  const getUniqueKey = (sku) => {
    const baseKey = `${sku.sku_name}-${sku.variant_title}`;
    if (!keyCounters[baseKey]) {
      setKeyCounters(prev => ({ ...prev, [baseKey]: 1 }));
      return `${baseKey}-1`;
    }
    const newCount = keyCounters[baseKey] + 1;
    setKeyCounters(prev => ({ ...prev, [baseKey]: newCount }));
    return `${baseKey}-${newCount}`;
  };

  // Optimistic update helper
  const updateSkuDataOptimistically = (newData) => {
    setSkuData(newData);
  };

  // Fetch SKU data from backend with error handling and loading state
  const fetchData = async () => {
    setIsLoading(true);
    setErrorMsg(""); // Clear previous errors
    try {
      const response = await fetch(`${config.api.baseURL}/product_metrics`);
      if (!response.ok) {
        throw new Error("Failed to fetch SKU data");
      }
      const data = await response.json();
      setSkuData(data || []);
    } catch (error) {
      console.error("Error fetching SKU data:", error);
      handleError("fetch SKU data");
      setSkuData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = skuData.filter((sku) =>
      Object.values(sku).some((value) =>
        value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [skuData, searchTerm, sortConfig]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredAndSortedData.slice(startIndex, endIndex);

  // Handle sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Handle search
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  // Handle pagination
  const goToPage = (page) => {
    setCurrentPage(page);
  };

  const goToPrevious = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const goToNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  // Handle form field changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewSku((prev) => {
      const updatedSku = { ...prev, [name]: value };
      
      // Automatically calculate margin when selling price or cogs changes
      if (name === 'selling_price' || name === 'cogs') {
        const sellingPrice = name === 'selling_price' ? Number(value) : Number(prev.selling_price);
        const cogs = name === 'cogs' ? Number(value) : Number(prev.cogs);
        
        if (sellingPrice && cogs) {
          updatedSku.margin = (sellingPrice - cogs).toFixed(2);
        }
      }
      
      return updatedSku;
    });
  };

  // Submit new/updated SKU to backend with optimistic update
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    const { product_name, sku_name, variant_title, selling_price, cogs, margin } = newSku;

    // Basic validation
    if (!product_name || !sku_name || !selling_price || !cogs || !margin) {
      setErrorMsg("All fields are required.");
      setIsSubmitting(false);
      return;
    }

    // Store previous data for rollback
    const previousData = [...skuData];

    try {
      // Optimistic update
      if (editSku) {
        // Update existing SKU
        const updatedData = skuData.map(sku => 
          sku.sku_name === editSku.sku_name ? { ...sku, ...newSku } : sku
        );
        updateSkuDataOptimistically(updatedData);
      } else {
        // Add new SKU
        updateSkuDataOptimistically([newSku, ...skuData]);
      }

      // Close modal early for better UX
      closeModal();

      // Make API call
      const url = editSku 
        ? `${config.api.baseURL}/product_metrics/${editSku.sku_name}`
        : `${config.api.baseURL}/product_metrics`;
      
      const response = await fetch(url, {
        method: editSku ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSku),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${editSku ? 'update' : 'create'} SKU`);
      }
      
      const savedSku = await response.json();
      
      // Update with server data to ensure consistency
      if (editSku) {
        setSkuData(prevData => 
          prevData.map(sku => sku.sku_name === editSku.sku_name ? savedSku : sku)
        );
      } else {
        setSkuData(prevData => [savedSku, ...prevData.filter(sku => sku.sku_name !== savedSku.sku_name)]);
      }
      
      handleSuccess(editSku ? "Update SKU" : "Create SKU");
      setCurrentPage(1); // Go to first page to see the new/updated SKU
    } catch (err) {
      console.error(`Error ${editSku ? 'updating' : 'creating'} product metric:`, err);
      // Rollback on error
      updateSkuDataOptimistically(previousData);
      handleError(editSku ? "Update SKU" : "Create SKU");
      setErrorMsg("Failed to save. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit with data validation
  const handleEdit = (sku) => {
    if (!sku) {
      return;
    }
    
    setEditSku(sku);
    setNewSku({
      product_name: sku.product_name || "",
      sku_name: sku.sku_name || "",
      variant_title: sku.variant_title || "NA",
      selling_price: sku.selling_price || "",
      cogs: sku.cogs || "",
      margin: sku.margin || "",
    });
    setModalIsOpen(true);
  };

  // Handle delete with optimistic update
  const handleDelete = async () => {
    // Store previous data for rollback
    const previousData = [...skuData];

    try {
      // Optimistic update
      setSkuData(prevData => prevData.filter(sku => sku.sku_name !== deleteSkuName));
      setConfirmModalIsOpen(false);

      const response = await fetch(`${config.api.baseURL}/product_metrics/${deleteSkuName}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete SKU");
      }

      handleSuccess("Delete SKU");
    } catch (error) {
      console.error("Error deleting product metric:", error);
      // Rollback on error
      updateSkuDataOptimistically(previousData);
      handleError("Delete SKU");
    } finally {
      setDeleteSkuName(null);
    }
  };

  // Reset form helper
  const resetForm = () => {
    setNewSku({
      product_name: "",
      sku_name: "",
      variant_title: "NA",
      selling_price: "",
      cogs: "",
      margin: "",
    });
    setEditSku(null);
    setErrorMsg("");
  };

  // Open modal with reset
  const openModal = () => {
    resetForm();
    setModalIsOpen(true);
  };

  // Close modal with cleanup
  const closeModal = () => {
    setModalIsOpen(false);
    resetForm();
  };

  // Simple table row component
  const TableRow = ({ sku, onEdit, onDelete, uniqueKey }) => (
    <tr key={uniqueKey}>
      <td>{sku.sku_name}</td>
      <td>{sku.product_name}</td>
      <td>{sku.variant_title}</td>
      <td>{sku.selling_price}</td>
      <td>{sku.cogs}</td>
      <td>{sku.margin}</td>
      <td>
        <div className="d-flex flex-row flex-md-row table-actions-mobile gap-2">
          <button
            className="btn btn-sm btn-success"
            onClick={() => onEdit(sku)}
            title="Edit"
          >
            <Icon icon="lucide:edit" width="16" height="16" />
          </button>
          <button
            className="btn btn-sm btn-danger"
            onClick={() => {
              setDeleteSkuName(sku.sku_name);
              setConfirmModalIsOpen(true);
            }}
            title="Delete"
          >
            <Icon icon="lucide:trash" width="16" height="16" />
          </button>
        </div>
      </td>
    </tr>
  );

  // Reset key counters when data changes
  useEffect(() => {
    setKeyCounters({});
  }, [skuData]);

  // Generate pagination numbers
  const getPaginationNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  // Styles for react-modal
  const customStyles = {
    content: {
      top: "50%",
      left: "50%",
      right: "auto",
      bottom: "auto",
      marginRight: "-50%",
      transform: "translate(-50%, -50%)",
      width: "80%",
      maxWidth: "500px",
      opacity: "0.95",
      borderRadius: "10px",
      padding: "20px",
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
    },
    overlay: {
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
  };

  const confirmationStyles = {
    content: {
      top: "50%",
      left: "50%",
      right: "auto",
      bottom: "auto",
      marginRight: "-50%",
      transform: "translate(-50%, -50%)",
      width: "80%",
      maxWidth: "400px",
      opacity: "0.95",
      borderRadius: "10px",
      padding: "20px",
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
    },
    overlay: {
      backgroundColor: "rgba(0, 0, 0, 0.6)",
    },
  };

  return (
    <div className="card basic-data-table">
      <div className="card-header d-flex align-items-center justify-content-between">
        <h5 className="card-title mb-0">SKU Data Table</h5>
        <button
          onClick={openModal}
          className="btn btn-primary d-inline-flex align-items-center"
          style={{ gap: "4px" }}
        >
          <Icon icon="lucide:plus" width="20" height="20" />
          Add New SKU
        </button>
      </div>

      <div className="card-body">
        {/* Search and Items per page controls */}
        <div className="row mb-3">
          <div className="col-md-6">
            <div className="d-flex align-items-center">
              <label className="me-2">Show</label>
              <select
                className="form-select form-select-sm"
                style={{ width: "80px" }}
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <label className="ms-2">entries</label>
            </div>
          </div>
          <div className="col-md-6">
            <div className="d-flex justify-content-end">
              <div className="position-relative">
                <Icon
                  icon="lucide:search"
                  className="position-absolute top-50 translate-middle-y ms-2"
                  width="16"
                  height="16"
                  style={{ left: "8px", color: "#6c757d" }}
                />
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={handleSearch}
                  style={{ paddingLeft: "35px", width: "250px" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="table-responsive">
          <table className="table table-striped table-bordered">
            <thead>
              <tr>
                <th 
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleSort('sku_name')}
                >
                  SKU Name
                  {sortConfig.key === 'sku_name' && (
                    <Icon 
                      icon={sortConfig.direction === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'} 
                      width="14" 
                      height="14" 
                      className="ms-1"
                    />
                  )}
                </th>
                <th 
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleSort('product_name')}
                >
                  Product Name
                  {sortConfig.key === 'product_name' && (
                    <Icon 
                      icon={sortConfig.direction === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'} 
                      width="14" 
                      height="14" 
                      className="ms-1"
                    />
                  )}
                </th>
                <th 
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleSort('variant_title')}
                >
                  Variant
                  {sortConfig.key === 'variant_title' && (
                    <Icon 
                      icon={sortConfig.direction === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'} 
                      width="14" 
                      height="14" 
                      className="ms-1"
                    />
                  )}
                </th>
                <th 
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleSort('selling_price')}
                >
                  Selling Price
                  {sortConfig.key === 'selling_price' && (
                    <Icon 
                      icon={sortConfig.direction === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'} 
                      width="14" 
                      height="14" 
                      className="ms-1"
                    />
                  )}
                </th>
                <th 
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleSort('cogs')}
                >
                  COGS
                  {sortConfig.key === 'cogs' && (
                    <Icon 
                      icon={sortConfig.direction === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'} 
                      width="14" 
                      height="14" 
                      className="ms-1"
                    />
                  )}
                </th>
                <th 
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleSort('margin')}
                >
                  Margin
                  {sortConfig.key === 'margin' && (
                    <Icon 
                      icon={sortConfig.direction === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'} 
                      width="14" 
                      height="14" 
                      className="ms-1"
                    />
                  )}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="text-center">
                    Loading...
                  </td>
                </tr>
              ) : currentData.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center">
                    {searchTerm ? 'No matching records found' : 'No data available'}
                  </td>
                </tr>
              ) : (
                currentData.map((sku, index) => {
                  const uniqueKey = `${sku.sku_name}-${sku.variant_title}-${index}`;
                  return (
                    <TableRow
                      key={uniqueKey}
                      uniqueKey={uniqueKey}
                      sku={sku}
                      onEdit={handleEdit}
                      onDelete={(skuName) => {
                        setDeleteSkuName(skuName);
                        setConfirmModalIsOpen(true);
                      }}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="row mt-3">
            <div className="col-md-6">
              <div className="text-muted">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredAndSortedData.length)} of {filteredAndSortedData.length} entries
                {searchTerm && ` (filtered from ${skuData.length} total entries)`} 
              </div>
            </div>
            <div className="col-md-6">
              <nav className="d-flex justify-content-end">
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={goToPrevious} disabled={currentPage === 1}>
                      Previous
                    </button>
                  </li>
                  
                  {getPaginationNumbers().map((number, index) => (
                    <li key={index} className={`page-item ${number === currentPage ? 'active' : ''} ${number === '...' ? 'disabled' : ''}`}>
                      {number === '...' ? (
                        <span className="page-link">...</span>
                      ) : (
                        <button
                          className="page-link"
                          onClick={() => goToPage(number)}
                        >
                          {number}
                        </button>
                      )}
                    </li>
                  ))}
                  
                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={goToNext} disabled={currentPage === totalPages}>
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        )}
      </div>

      {/* Modal for adding/editing SKU */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        style={customStyles}
        ariaHideApp={false}
        contentLabel={editSku ? "Edit SKU" : "Add New SKU"}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{editSku ? "Edit SKU" : "Add New SKU"}</h5>
            <button type="button" className="btn-close" onClick={closeModal} />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {errorMsg && <div className="alert alert-danger">{errorMsg}</div>}
              <div className="mb-3">
                <label htmlFor="product_name" className="form-label">
                  Product Name
                </label>
                <input
                  type="text"
                  id="product_name"
                  name="product_name"
                  className="form-control"
                  value={newSku.product_name}
                  onChange={handleInputChange}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="sku_name" className="form-label">
                  SKU Name
                </label>
                <input
                  type="text"
                  id="sku_name"
                  name="sku_name"
                  className="form-control"
                  value={newSku.sku_name}
                  onChange={handleInputChange}
                  disabled={!!editSku}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="variant_title" className="form-label">
                  Variant Title
                </label>
                <input
                  type="text"
                  id="variant_title"
                  name="variant_title"
                  className="form-control"
                  value={newSku.variant_title}
                  onChange={handleInputChange}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="selling_price" className="form-label">
                  Selling Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  id="selling_price"
                  name="selling_price"
                  className="form-control"
                  value={newSku.selling_price}
                  onChange={handleInputChange}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="cogs" className="form-label">
                  COGS
                </label>
                <input
                  type="number"
                  step="0.01"
                  id="cogs"
                  name="cogs"
                  className="form-control"
                  value={newSku.cogs}
                  onChange={handleInputChange}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="margin" className="form-label">
                  Margin
                </label>
                <input
                  type="number"
                  step="0.01"
                  id="margin"
                  name="margin"
                  className="form-control"
                  value={newSku.margin}
                  readOnly
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary mx-3"
                onClick={closeModal}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : editSku ? "Update SKU" : "Save SKU"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Confirmation Modal for Deleting SKU */}
      <Modal
        isOpen={confirmModalIsOpen}
        onRequestClose={() => setConfirmModalIsOpen(false)}
        style={confirmationStyles}
        contentLabel="Confirm Deletion"
        ariaHideApp={false}
      >
        <div className="modal-header">
          <h5 className="modal-title">Are you sure?</h5>
          <button
            type="button"
            className="btn-close"
            onClick={() => setConfirmModalIsOpen(false)}
          />
        </div>
        <div className="modal-body">
          <p>Are you sure you want to delete this SKU? This action cannot be undone.</p>
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary mx-3"
            onClick={() => setConfirmModalIsOpen(false)}
          >
            No
          </button>
          <button type="button" className="btn btn-danger" onClick={handleDelete}>
            Yes, Delete
          </button>
        </div>
      </Modal>

      <ToastContainer />
    </div>
  );
};

export default SkuTableDataLayer;
