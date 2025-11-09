"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import Breadcrumb from "../../components/Breadcrumb";
import MasterLayout from "../../masterLayout/MasterLayout";
import SidebarPermissionGuard from "../../components/SidebarPermissionGuard";
import stockManagementApi from "../../services/stockManagementApi";

const StockManagementLayer = () => {
  const [activeTab, setActiveTab] = useState("inventory");

  // Inventory Tab State
  const [inventoryData, setInventoryData] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryCurrentPage, setInventoryCurrentPage] = useState(1);
  const [inventoryTotalPages, setInventoryTotalPages] = useState(1);
  const [inventoryTotalRecords, setInventoryTotalRecords] = useState(0);
  const [inventorySearchTerm, setInventorySearchTerm] = useState("");
  const [inventoryDisplayedItemsCount, setInventoryDisplayedItemsCount] = useState(20);
  const [inventoryLoadingMore, setInventoryLoadingMore] = useState(false);
  const inventoryContainerRef = useRef(null);
  const inventoryItemsPerPage = 20;

  // Returns Management Tab State
  const [returnsData, setReturnsData] = useState([]);
  const [returnsLoading, setReturnsLoading] = useState(true);
  const [returnsCurrentPage, setReturnsCurrentPage] = useState(1);
  const [returnsTotalPages, setReturnsTotalPages] = useState(1);
  const [returnsTotalRecords, setReturnsTotalRecords] = useState(0);
  const [returnsStatusFilter, setReturnsStatusFilter] = useState("pending"); // pending, approved, rejected
  const [returnsDisplayedItemsCount, setReturnsDisplayedItemsCount] = useState(20);
  const [returnsLoadingMore, setReturnsLoadingMore] = useState(false);
  const returnsContainerRef = useRef(null);
  const returnsItemsPerPage = 20;

  // Load inventory data
  const loadInventory = async (page = 1, append = false) => {
    try {
      if (!append) {
        setInventoryLoading(true);
      }
      const result = await stockManagementApi.getAllVariantsInventory(page, 50);
      if (result.success) {
        if (append) {
          setInventoryData((prev) => [...prev, ...result.data]);
        } else {
          setInventoryData(result.data);
          setInventoryDisplayedItemsCount(20); // Reset displayed items
        }
        setInventoryCurrentPage(result.pagination.page);
        setInventoryTotalPages(result.pagination.totalPages);
        setInventoryTotalRecords(result.pagination.total);
      }
    } catch (error) {
      console.error("Error loading inventory:", error);
      if (!append) {
        setInventoryData([]);
      }
    } finally {
      setInventoryLoading(false);
    }
  };

  // Load returns data
  const loadReturns = async (page = 1, status = null, append = false) => {
    try {
      if (!append) {
        setReturnsLoading(true);
      }
      const result = await stockManagementApi.getAllReturns(page, 50, status);
      if (result.success) {
        if (append) {
          setReturnsData((prev) => [...prev, ...result.data]);
        } else {
          setReturnsData(result.data);
          setReturnsDisplayedItemsCount(20); // Reset displayed items
        }
        setReturnsCurrentPage(result.pagination.page);
        setReturnsTotalPages(result.pagination.totalPages);
        setReturnsTotalRecords(result.pagination.total);
      }
    } catch (error) {
      console.error("Error loading returns:", error);
      if (!append) {
        setReturnsData([]);
      }
    } finally {
      setReturnsLoading(false);
    }
  };

  // Handle return approval
  const handleApproveReturn = async (eventId) => {
    if (
      !confirm(
        "Are you sure you want to approve this return? This will add the quantity back to inventory."
      )
    ) {
      return;
    }

    try {
      const result = await stockManagementApi.approveReturn(eventId);
      if (result.success) {
        alert("Return approved successfully!");
        await loadReturns(returnsCurrentPage, returnsStatusFilter);
      }
    } catch (error) {
      console.error("Error approving return:", error);
      const errorMessage = error.message || "Failed to approve return";
      alert(`Error: ${errorMessage}`);
    }
  };

  // Handle return rejection
  const handleRejectReturn = async (eventId) => {
    const reason = prompt("Please enter reason for rejection (optional):");
    if (reason === null) return; // User cancelled

    if (
      !confirm(
        "Are you sure you want to reject this return? This will NOT add the quantity back to inventory."
      )
    ) {
      return;
    }

    try {
      const result = await stockManagementApi.rejectReturn(
        eventId,
        reason || null
      );
      if (result.success) {
        alert("Return rejected successfully!");
        await loadReturns(returnsCurrentPage, returnsStatusFilter);
      }
    } catch (error) {
      console.error("Error rejecting return:", error);
      const errorMessage = error.message || "Failed to reject return";
      alert(`Error: ${errorMessage}`);
    }
  };

  useEffect(() => {
    if (activeTab === "inventory") {
      loadInventory();
      setInventoryDisplayedItemsCount(20);
    } else if (activeTab === "returns") {
      loadReturns(1, returnsStatusFilter);
      setReturnsDisplayedItemsCount(20);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "returns") {
      loadReturns(1, returnsStatusFilter);
      setReturnsDisplayedItemsCount(20);
    }
  }, [returnsStatusFilter]);

  // Reset displayed items when search term changes
  useEffect(() => {
    setInventoryDisplayedItemsCount(20);
  }, [inventorySearchTerm]);

  const tabs = [
    {
      id: "inventory",
      label: "INVENTORY",
      icon: "mdi:package-variant",
    },
    {
      id: "returns",
      label: "RETURNS MANAGEMENT",
      icon: "mdi:arrow-u-left-top",
    },
  ];

  return (
    <div className="card h-100 radius-8 border">
      <div className="card-body p-24">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-20">
          <div className="d-flex align-items-center">
            <h6 className="mb-0 me-2">Stock Management</h6>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          className="mb-4 border-bottom pb-0"
          style={{ overflowX: "auto", overflowY: "hidden" }}
        >
          <div
            className="d-flex gap-2 gap-md-4"
            style={{ minWidth: "max-content", flexWrap: "nowrap" }}
          >
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={`d-flex align-items-center gap-2 px-2 px-md-3 py-2 cursor-pointer position-relative ${
                  activeTab === tab.id ? "text-primary" : "text-muted"
                }`}
                onClick={() => setActiveTab(tab.id)}
                style={{ cursor: "pointer", whiteSpace: "nowrap" }}
              >
                <Icon
                  icon={tab.icon}
                  className="icon"
                  style={{ flexShrink: 0 }}
                />
                <span
                  className="fw-medium"
                  style={{ fontSize: "clamp(12px, 2.5vw, 14px)" }}
                >
                  {tab.label}
                </span>
                {activeTab === tab.id && (
                  <div
                    className="position-absolute bottom-0 start-0 end-0"
                    style={{
                      height: "2px",
                      backgroundColor: "#0d6efd",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === "inventory" && (
            <InventoryTab
              inventoryData={inventoryData}
              isLoading={inventoryLoading}
              currentPage={inventoryCurrentPage}
              totalPages={inventoryTotalPages}
              totalRecords={inventoryTotalRecords}
              loadInventory={loadInventory}
              searchTerm={inventorySearchTerm}
              setSearchTerm={setInventorySearchTerm}
              displayedItemsCount={inventoryDisplayedItemsCount}
              setDisplayedItemsCount={setInventoryDisplayedItemsCount}
              isLoadingMore={inventoryLoadingMore}
              setIsLoadingMore={setInventoryLoadingMore}
              containerRef={inventoryContainerRef}
              itemsPerPage={inventoryItemsPerPage}
            />
          )}

          {activeTab === "returns" && (
            <ReturnsManagementTab
              returnsData={returnsData}
              isLoading={returnsLoading}
              currentPage={returnsCurrentPage}
              totalPages={returnsTotalPages}
              totalRecords={returnsTotalRecords}
              loadReturns={loadReturns}
              statusFilter={returnsStatusFilter}
              setStatusFilter={setReturnsStatusFilter}
              handleApproveReturn={handleApproveReturn}
              handleRejectReturn={handleRejectReturn}
              displayedItemsCount={returnsDisplayedItemsCount}
              setDisplayedItemsCount={setReturnsDisplayedItemsCount}
              isLoadingMore={returnsLoadingMore}
              setIsLoadingMore={setReturnsLoadingMore}
              containerRef={returnsContainerRef}
              itemsPerPage={returnsItemsPerPage}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Inventory Tab Component
const InventoryTab = ({
  inventoryData,
  isLoading,
  currentPage,
  totalPages,
  totalRecords,
  loadInventory,
  searchTerm,
  setSearchTerm,
  displayedItemsCount,
  setDisplayedItemsCount,
  isLoadingMore,
  setIsLoadingMore,
  containerRef,
  itemsPerPage,
}) => {
  // Filter inventory data by search term
  const filteredInventory = inventoryData.filter((item) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      item.product_name?.toLowerCase().includes(searchLower) ||
      item.variant_display_name?.toLowerCase().includes(searchLower) ||
      item.sku?.toLowerCase().includes(searchLower)
    );
  });

  // Get displayed data for infinite scroll
  const getDisplayedData = (dataArray) => {
    return dataArray.slice(0, displayedItemsCount);
  };

  // Check if there's more data to load
  const hasMoreData = useCallback((dataArray) => {
    return displayedItemsCount < dataArray.length || currentPage < totalPages;
  }, [displayedItemsCount, currentPage, totalPages]);

  // Load more data callback
  const loadMoreData = useCallback(async () => {
    if (isLoadingMore || isLoading) return;
    
    setIsLoadingMore(true);
    // Simulate loading delay for skeleton effect
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if we need to fetch more from API
    if (displayedItemsCount >= filteredInventory.length && currentPage < totalPages) {
      await loadInventory(currentPage + 1, true);
    }
    
    setDisplayedItemsCount(prev => prev + itemsPerPage);
    setIsLoadingMore(false);
  }, [isLoadingMore, isLoading, displayedItemsCount, filteredInventory.length, currentPage, totalPages, itemsPerPage, loadInventory, setIsLoadingMore, setDisplayedItemsCount]);

  // Scroll detection for infinite scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Handle wheel events to allow page scrolling when table reaches boundaries
    const handleWheel = (e) => {
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      const isAtTop = scrollTop <= 1;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
      
      if (e.deltaY > 0 && isAtBottom) {
        window.scrollBy({
          top: e.deltaY,
          behavior: 'auto'
        });
      } else if (e.deltaY < 0 && isAtTop) {
        window.scrollBy({
          top: e.deltaY,
          behavior: 'auto'
        });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: true });
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return (
    <>
      {/* Search Bar */}
      <div className="mb-3 d-flex flex-column flex-md-row gap-2 align-items-md-center justify-content-between">
        <div
          className="d-flex align-items-center gap-2 flex-grow-1"
          style={{ maxWidth: "400px" }}
        >
          <div className="position-relative flex-grow-1">
            <Icon
              icon="mdi:magnify"
              className="position-absolute"
              style={{
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#6c757d",
                fontSize: "20px",
              }}
            />
            <input
              type="text"
              className="form-control ps-5"
              placeholder="Search by product name, variant, or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div
        ref={containerRef}
        className="table-responsive table-scroll-container"
        style={{
          maxHeight: "600px",
          overflowY: "auto",
          overflowX: "auto",
          position: "relative",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          scrollBehavior: "smooth",
          overscrollBehavior: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
        onScroll={(e) => {
          const target = e.target;
          const scrollTop = target.scrollTop;
          const scrollHeight = target.scrollHeight;
          const clientHeight = target.clientHeight;
          
          if (scrollTop + clientHeight >= scrollHeight * 0.8) {
            if (hasMoreData(filteredInventory) && !isLoadingMore && !isLoading) {
              loadMoreData();
            }
          }
        }}
        onWheel={(e) => {
          const target = e.currentTarget;
          const scrollTop = target.scrollTop;
          const scrollHeight = target.scrollHeight;
          const clientHeight = target.clientHeight;
          const isAtTop = scrollTop <= 1;
          const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
          
          if (e.deltaY > 0 && isAtBottom) {
            window.scrollBy({
              top: e.deltaY,
              behavior: 'auto'
            });
          } else if (e.deltaY < 0 && isAtTop) {
            window.scrollBy({
              top: e.deltaY,
              behavior: 'auto'
            });
          }
        }}
      >
        <table
          className="table table-hover mb-0"
          style={{ fontSize: "clamp(12px, 2.5vw, 14px)" }}
        >
          <thead
            style={{
              position: "sticky",
              top: 0,
              zIndex: 10,
              backgroundColor: "#f9fafb",
              borderBottom: "2px solid #e5e7eb",
            }}
          >
            <tr>
              <th
                style={{
                  fontWeight: "600",
                  color: "#374151",
                  padding: "12px",
                }}
              >
                Sr No
              </th>
              <th
                style={{
                  fontWeight: "600",
                  color: "#374151",
                  padding: "12px",
                }}
              >
                Product Name
              </th>
              <th
                style={{
                  fontWeight: "600",
                  color: "#374151",
                  padding: "12px",
                }}
              >
                Variant
              </th>
              <th
                style={{
                  fontWeight: "600",
                  color: "#374151",
                  padding: "12px",
                }}
              >
                SKU
              </th>
              <th
                style={{
                  fontWeight: "600",
                  color: "#374151",
                  padding: "12px",
                  textAlign: "center",
                }}
              >
                Available Qty
              </th>
              <th
                style={{
                  fontWeight: "600",
                  color: "#374151",
                  padding: "12px",
                  textAlign: "center",
                }}
              >
                Stock In
              </th>
              <th
                style={{
                  fontWeight: "600",
                  color: "#374151",
                  padding: "12px",
                  textAlign: "center",
                }}
              >
                Stock Out
              </th>
              <th
                style={{
                  fontWeight: "600",
                  color: "#374151",
                  padding: "12px",
                  textAlign: "center",
                }}
              >
                Cancels
              </th>
              <th
                style={{
                  fontWeight: "600",
                  color: "#374151",
                  padding: "12px",
                  textAlign: "center",
                }}
              >
                Approved Returns
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && inventoryData.length === 0 ? (
              <>
                {Array.from({ length: 5 }).map((_, rowIndex) => (
                  <tr key={`skeleton-${rowIndex}`}>
                    {Array.from({ length: 9 }).map((_, colIndex) => (
                      <td key={`skeleton-${rowIndex}-${colIndex}`}>
                        <div
                          className="skeleton"
                          style={{
                            height: "20px",
                            backgroundColor: "#e5e7eb",
                            borderRadius: "4px",
                            animation: "skeletonPulse 1.5s ease-in-out infinite",
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            ) : filteredInventory.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-4">
                  <div className="d-flex flex-column align-items-center">
                    <Icon
                      icon="mdi:package-variant"
                      width="48"
                      height="48"
                      className="text-muted mb-2"
                    />
                    <p className="text-muted mb-0">
                      {searchTerm
                        ? "No matching products found"
                        : "No inventory data available"}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              <>
                {getDisplayedData(filteredInventory).map((item, index) => (
                  <tr key={item.variant_id}>
                    <td style={{ padding: "12px", color: "#374151" }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: "12px", color: "#374151" }}>
                      {item.product_name || "-"}
                    </td>
                    <td style={{ padding: "12px", color: "#374151" }}>
                      {item.variant_display_name || "-"}
                    </td>
                    <td style={{ padding: "12px", color: "#374151" }}>
                      {item.sku || "-"}
                    </td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <span
                        className={`badge ${
                          item.available_quantity > 0
                            ? "bg-success"
                            : item.available_quantity === 0
                            ? "bg-secondary"
                            : "bg-danger"
                        }`}
                      >
                        {item.available_quantity || 0}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        textAlign: "center",
                        color: "#374151",
                      }}
                    >
                      {item.stock_in || 0}
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        textAlign: "center",
                        color: "#374151",
                      }}
                    >
                      {item.stock_out || 0}
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        textAlign: "center",
                        color: "#374151",
                      }}
                    >
                      {item.cancels || 0}
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        textAlign: "center",
                        color: "#374151",
                      }}
                    >
                      {item.approved_returns || 0}
                    </td>
                  </tr>
                ))}
                {isLoadingMore && (
                  <>
                    {Array.from({ length: 5 }).map((_, rowIndex) => (
                      <tr key={`skeleton-more-${rowIndex}`}>
                        {Array.from({ length: 9 }).map((_, colIndex) => (
                          <td key={`skeleton-more-${rowIndex}-${colIndex}`}>
                            <div
                              className="skeleton"
                              style={{
                                height: "20px",
                                backgroundColor: "#e5e7eb",
                                borderRadius: "4px",
                                animation: "skeletonPulse 1.5s ease-in-out infinite",
                              }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Infinite Scroll Footer */}
      {totalRecords > 0 && filteredInventory.length > 0 && (
        <div
          className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2 p-3 border-top"
          style={{
            position: "sticky",
            bottom: 0,
            zIndex: 5,
            backgroundColor: "#f8f9fa",
          }}
        >
          <div style={{ fontSize: "14px", color: "#6c757d" }}>
            Showing <strong>{getDisplayedData(filteredInventory).length}</strong>{" "}
            {searchTerm ? "filtered" : `of ${totalRecords}`} variant
            {getDisplayedData(filteredInventory).length !== 1 ? "s" : ""}
          </div>
          {hasMoreData(filteredInventory) && (
            <div style={{ fontSize: "14px", color: "#6c757d" }}>
              Scroll down to load more
            </div>
          )}
        </div>
      )}
    </>
  );
};

// Returns Management Tab Component
const ReturnsManagementTab = ({
  returnsData,
  isLoading,
  currentPage,
  totalPages,
  totalRecords,
  loadReturns,
  statusFilter,
  setStatusFilter,
  handleApproveReturn,
  handleRejectReturn,
  displayedItemsCount,
  setDisplayedItemsCount,
  isLoadingMore,
  setIsLoadingMore,
  containerRef,
  itemsPerPage,
}) => {
  // Get displayed data for infinite scroll
  const getDisplayedData = (dataArray) => {
    return dataArray.slice(0, displayedItemsCount);
  };

  // Check if there's more data to load
  const hasMoreData = useCallback((dataArray) => {
    return displayedItemsCount < dataArray.length || currentPage < totalPages;
  }, [displayedItemsCount, currentPage, totalPages]);

  // Load more data callback
  const loadMoreData = useCallback(async () => {
    if (isLoadingMore || isLoading) return;
    
    setIsLoadingMore(true);
    // Simulate loading delay for skeleton effect
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if we need to fetch more from API
    if (displayedItemsCount >= returnsData.length && currentPage < totalPages) {
      await loadReturns(currentPage + 1, statusFilter, true);
    }
    
    setDisplayedItemsCount(prev => prev + itemsPerPage);
    setIsLoadingMore(false);
  }, [isLoadingMore, isLoading, displayedItemsCount, returnsData.length, currentPage, totalPages, statusFilter, itemsPerPage, loadReturns, setIsLoadingMore, setDisplayedItemsCount]);

  // Scroll detection for infinite scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Handle wheel events to allow page scrolling when table reaches boundaries
    const handleWheel = (e) => {
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      const isAtTop = scrollTop <= 1;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
      
      if (e.deltaY > 0 && isAtBottom) {
        window.scrollBy({
          top: e.deltaY,
          behavior: 'auto'
        });
      } else if (e.deltaY < 0 && isAtTop) {
        window.scrollBy({
          top: e.deltaY,
          behavior: 'auto'
        });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: true });
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);
  return (
    <>
      {/* Filter Bar */}
      <div className="mb-3 d-flex flex-column flex-md-row gap-2 align-items-md-center justify-content-between">
        <div className="d-flex align-items-center gap-2">
          <label className="mb-0 small text-muted">Filter by Status:</label>
          <select
            className="form-select form-select-sm"
            style={{ width: "auto", minWidth: "150px" }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div
        ref={containerRef}
        className="table-responsive table-scroll-container"
        style={{
          maxHeight: "600px",
          overflowY: "auto",
          overflowX: "auto",
          position: "relative",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          scrollBehavior: "smooth",
          overscrollBehavior: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
        onScroll={(e) => {
          const target = e.target;
          const scrollTop = target.scrollTop;
          const scrollHeight = target.scrollHeight;
          const clientHeight = target.clientHeight;
          
          if (scrollTop + clientHeight >= scrollHeight * 0.8) {
            if (hasMoreData(returnsData) && !isLoadingMore && !isLoading) {
              loadMoreData();
            }
          }
        }}
        onWheel={(e) => {
          const target = e.currentTarget;
          const scrollTop = target.scrollTop;
          const scrollHeight = target.scrollHeight;
          const clientHeight = target.clientHeight;
          const isAtTop = scrollTop <= 1;
          const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
          
          if (e.deltaY > 0 && isAtBottom) {
            window.scrollBy({
              top: e.deltaY,
              behavior: 'auto'
            });
          } else if (e.deltaY < 0 && isAtTop) {
            window.scrollBy({
              top: e.deltaY,
              behavior: 'auto'
            });
          }
        }}
      >
        <table
          className="table table-hover mb-0"
          style={{ fontSize: "clamp(12px, 2.5vw, 14px)" }}
        >
          <thead
            style={{
              position: "sticky",
              top: 0,
              zIndex: 10,
              backgroundColor: "#f9fafb",
              borderBottom: "2px solid #e5e7eb",
            }}
          >
            <tr>
              <th
                style={{
                  fontWeight: "600",
                  color: "#374151",
                  padding: "12px",
                }}
              >
                Sr No
              </th>
              <th
                style={{
                  fontWeight: "600",
                  color: "#374151",
                  padding: "12px",
                }}
              >
                Order Name
              </th>
              <th
                style={{
                  fontWeight: "600",
                  color: "#374151",
                  padding: "12px",
                }}
              >
                Product
              </th>
              <th
                style={{
                  fontWeight: "600",
                  color: "#374151",
                  padding: "12px",
                }}
              >
                Variant
              </th>
              <th
                style={{
                  fontWeight: "600",
                  color: "#374151",
                  padding: "12px",
                  textAlign: "center",
                }}
              >
                Return Qty
              </th>
              <th
                style={{
                  fontWeight: "600",
                  color: "#374151",
                  padding: "12px",
                }}
              >
                Return Date
              </th>
              <th
                style={{
                  fontWeight: "600",
                  color: "#374151",
                  padding: "12px",
                  textAlign: "center",
                }}
              >
                Status
              </th>
              <th
                style={{
                  fontWeight: "600",
                  color: "#374151",
                  padding: "12px",
                }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && returnsData.length === 0 ? (
              <>
                {Array.from({ length: 5 }).map((_, rowIndex) => (
                  <tr key={`skeleton-${rowIndex}`}>
                    {Array.from({ length: 8 }).map((_, colIndex) => (
                      <td key={`skeleton-${rowIndex}-${colIndex}`}>
                        <div
                          className="skeleton"
                          style={{
                            height: "20px",
                            backgroundColor: "#e5e7eb",
                            borderRadius: "4px",
                            animation: "skeletonPulse 1.5s ease-in-out infinite",
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            ) : returnsData.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-4">
                  <div className="d-flex flex-column align-items-center">
                    <Icon
                      icon="mdi:arrow-u-left-top"
                      width="48"
                      height="48"
                      className="text-muted mb-2"
                    />
                    <p className="text-muted mb-0">No returns found</p>
                  </div>
                </td>
              </tr>
            ) : (
              <>
                {getDisplayedData(returnsData).map((returnItem, index) => (
                  <tr key={returnItem.event_id}>
                    <td style={{ padding: "12px", color: "#374151" }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: "12px", color: "#374151" }}>
                      {returnItem.order_name || returnItem.order_id || "-"}
                    </td>
                    <td style={{ padding: "12px", color: "#374151" }}>
                      {returnItem.product_title || "-"}
                    </td>
                    <td style={{ padding: "12px", color: "#374151" }}>
                      {returnItem.variant_title || "-"}
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        textAlign: "center",
                        color: "#374151",
                      }}
                    >
                      {returnItem.qty_delta || 0}
                    </td>
                    <td style={{ padding: "12px", color: "#374151" }}>
                      {returnItem.return_date
                        ? new Date(returnItem.return_date).toLocaleDateString()
                        : "-"}
                    </td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <span
                        className={`badge ${
                          returnItem.approval_status === "approved"
                            ? "bg-success"
                            : returnItem.approval_status === "rejected"
                            ? "bg-danger"
                            : "bg-warning"
                        }`}
                      >
                        {returnItem.approval_status || "pending"}
                      </span>
                    </td>
                    <td style={{ padding: "12px" }}>
                      {returnItem.approval_status === "pending" && (
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() =>
                              handleApproveReturn(returnItem.event_id)
                            }
                            title="Approve Return"
                          >
                            <Icon icon="mdi:check" width="16" height="16" />
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() =>
                              handleRejectReturn(returnItem.event_id)
                            }
                            title="Reject Return"
                          >
                            <Icon icon="mdi:close" width="16" height="16" />
                          </button>
                        </div>
                      )}
                      {returnItem.approval_status === "approved" && (
                        <div className="text-muted small">
                          <div>
                            Approved by {returnItem.approved_by || "N/A"}
                          </div>
                          {returnItem.approved_at && (
                            <div style={{ fontSize: "11px" }}>
                              {new Date(
                                returnItem.approved_at
                              ).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      )}
                      {returnItem.approval_status === "rejected" && (
                        <div className="text-muted small">
                          <div>
                            Rejected by {returnItem.rejected_by || "N/A"}
                          </div>
                          {returnItem.rejected_at && (
                            <div style={{ fontSize: "11px" }}>
                              {new Date(
                                returnItem.rejected_at
                              ).toLocaleDateString()}
                            </div>
                          )}
                          {returnItem.rejection_reason && (
                            <div style={{ fontSize: "11px" }}>
                              Reason: {returnItem.rejection_reason}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {isLoadingMore && (
                  <>
                    {Array.from({ length: 5 }).map((_, rowIndex) => (
                      <tr key={`skeleton-more-${rowIndex}`}>
                        {Array.from({ length: 8 }).map((_, colIndex) => (
                          <td key={`skeleton-more-${rowIndex}-${colIndex}`}>
                            <div
                              className="skeleton"
                              style={{
                                height: "20px",
                                backgroundColor: "#e5e7eb",
                                borderRadius: "4px",
                                animation: "skeletonPulse 1.5s ease-in-out infinite",
                              }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Infinite Scroll Footer */}
      {totalRecords > 0 && returnsData.length > 0 && (
        <div
          className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2 p-3 border-top"
          style={{
            position: "sticky",
            bottom: 0,
            zIndex: 5,
            backgroundColor: "#f8f9fa",
          }}
        >
          <div style={{ fontSize: "14px", color: "#6c757d" }}>
            Showing <strong>{getDisplayedData(returnsData).length}</strong> of{" "}
            <strong>{totalRecords}</strong> returns
          </div>
          {hasMoreData(returnsData) && (
            <div style={{ fontSize: "14px", color: "#6c757d" }}>
              Scroll down to load more
            </div>
          )}
        </div>
      )}
    </>
  );
};

const StockManagementPage = () => {
  return (
    <>
      <SidebarPermissionGuard requiredSidebar="stockManagement">
        {/* MasterLayout */}
        <MasterLayout>
          {/* Breadcrumb */}
          <Breadcrumb title="Inventory Management / Stock Management" />

          {/* StockManagementLayer */}
          <StockManagementLayer />
        </MasterLayout>
      </SidebarPermissionGuard>
    </>
  );
};

export default StockManagementPage;
