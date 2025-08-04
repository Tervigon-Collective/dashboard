"use client";

import React, { useState, useEffect } from 'react';
import Link from "next/link";
import { Icon } from '@iconify/react';
import config from '../config';

const ShippingDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [bulkOperation, setBulkOperation] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [trackingModal, setTrackingModal] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingHistory, setTrackingHistory] = useState([]);

  // Fetch orders for shipping
  const fetchOrders = async (page = 1, search = "", limit = pageSize) => {
    setLoading(true);
    setError(null);
    
    try {
      let url = `${config.api.baseURL}/api/customer-orders?page=${page}&limit=${limit}`;
      if (search) {
        url += `&name=${encodeURIComponent(search)}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setOrders(data.orders || []);
      setPagination(data.pagination || {
        page: 1,
        limit: limit,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      });
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError("Failed to load orders for shipping.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(currentPage, searchTerm, pageSize);
  }, [currentPage, searchTerm, pageSize]);

  // Reset select all state when page changes
  useEffect(() => {
    const currentPageOrderNames = orders.map(order => order.order_name);
    const selectedCurrentPage = currentPageOrderNames.every(name => selectedOrders.has(name));
    setSelectAll(selectedCurrentPage);
  }, [orders, selectedOrders]);

  // Handle search
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  // Handle pagination
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Handle order selection
  const handleOrderSelection = (orderName) => {
    const newSelectedOrders = new Set(selectedOrders);
    if (newSelectedOrders.has(orderName)) {
      newSelectedOrders.delete(orderName);
    } else {
      newSelectedOrders.add(orderName);
    }
    setSelectedOrders(newSelectedOrders);
    
    // Update select all state based on current page
    const currentPageOrderNames = orders.map(order => order.order_name);
    const selectedCurrentPage = currentPageOrderNames.every(name => newSelectedOrders.has(name));
    setSelectAll(selectedCurrentPage);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectAll) {
      // Deselect only current page orders
      const newSelectedOrders = new Set(selectedOrders);
      orders.forEach(order => {
        newSelectedOrders.delete(order.order_name);
      });
      setSelectedOrders(newSelectedOrders);
      setSelectAll(false);
    } else {
      // Select all current page orders
      const newSelectedOrders = new Set(selectedOrders);
      orders.forEach(order => {
        newSelectedOrders.add(order.order_name);
      });
      setSelectedOrders(newSelectedOrders);
      setSelectAll(true);
    }
  };

  // Handle page size change
  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
    setSelectedOrders(new Set()); // Clear selections when changing page size
    setSelectAll(false);
  };

  // Generate AWB for single order
  const generateAWB = async (orderName) => {
    try {
      const response = await fetch(`${config.api.baseURL}/api/shipping/generate-awb`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          order_name: orderName,
          courier: 'bluedart'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`AWB generated successfully for ${orderName}!`);
        fetchOrders(currentPage, searchTerm, pageSize);
      } else {
        alert(`Failed to generate AWB: ${data.error}`);
      }
    } catch (error) {
      console.error('Generate AWB error:', error);
      alert('Failed to generate AWB. Please try again.');
    }
  };

  // Generate eWaybill for single order
  const generateEWaybill = async (orderName) => {
    try {
      const response = await fetch(`${config.api.baseURL}/api/shipping/generate-ewaybill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          order_name: orderName
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`eWaybill generated successfully for ${orderName}!`);
        fetchOrders(currentPage, searchTerm, pageSize);
      } else {
        alert(`Failed to generate eWaybill: ${data.error}`);
      }
    } catch (error) {
      console.error('Generate eWaybill error:', error);
      alert('Failed to generate eWaybill. Please try again.');
    }
  };

  // Bulk generate AWB
  const bulkGenerateAWB = async () => {
    if (selectedOrders.size === 0) {
      alert('Please select at least one order.');
      return;
    }

    setBulkLoading(true);
    setBulkOperation('awb');

    try {
      const orderNames = Array.from(selectedOrders);
      let successCount = 0;
      let errorCount = 0;

      for (const orderName of orderNames) {
        try {
          const response = await fetch(`${config.api.baseURL}/api/shipping/generate-awb`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              order_name: orderName,
              courier: 'bluedart'
            })
          });

          const data = await response.json();
          
          if (data.success) {
            successCount++;
          } else {
            errorCount++;
            console.error(`Failed for ${orderName}:`, data.error);
          }

          // Add delay between requests
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          errorCount++;
          console.error(`Error for ${orderName}:`, error);
        }
      }

      alert(`Bulk AWB generation completed!\nSuccess: ${successCount}\nFailed: ${errorCount}`);
      setSelectedOrders(new Set());
      setSelectAll(false);
      fetchOrders(currentPage, searchTerm, pageSize);
    } catch (error) {
      console.error('Bulk AWB generation error:', error);
      alert('Failed to generate AWB for selected orders.');
    } finally {
      setBulkLoading(false);
      setBulkOperation(null);
    }
  };

  // Bulk generate eWaybill
  const bulkGenerateEWaybill = async () => {
    if (selectedOrders.size === 0) {
      alert('Please select at least one order.');
      return;
    }

    setBulkLoading(true);
    setBulkOperation('ewaybill');

    try {
      const orderNames = Array.from(selectedOrders);
      let successCount = 0;
      let errorCount = 0;

      for (const orderName of orderNames) {
        try {
          const response = await fetch(`${config.api.baseURL}/api/shipping/generate-ewaybill`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              order_name: orderName
            })
          });

          const data = await response.json();
          
          if (data.success) {
            successCount++;
          } else {
            errorCount++;
            console.error(`Failed for ${orderName}:`, data.error);
          }

          // Add delay between requests
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          errorCount++;
          console.error(`Error for ${orderName}:`, error);
        }
      }

      alert(`Bulk eWaybill generation completed!\nSuccess: ${successCount}\nFailed: ${errorCount}`);
      setSelectedOrders(new Set());
      setSelectAll(false);
      fetchOrders(currentPage, searchTerm, pageSize);
    } catch (error) {
      console.error('Bulk eWaybill generation error:', error);
      alert('Failed to generate eWaybill for selected orders.');
    } finally {
      setBulkLoading(false);
      setBulkOperation(null);
    }
  };

  // Track shipment with enhanced details
  const trackShipment = async (trackingNumber, courier = 'bluedart', orderName = '') => {
    setTrackingLoading(true);
    setTrackingModal(true);
    setTrackingData(null);
    setTrackingHistory([]);

    try {
      const response = await fetch(`${config.api.baseURL}/api/shipping/track/${trackingNumber}?courier=${courier}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setTrackingData(data.data);
        
        // Save tracking data to database
        await saveTrackingData(trackingNumber, courier, data.data, orderName);
        
        // Fetch tracking history
        await fetchTrackingHistory(trackingNumber);
      } else {
        alert(`Failed to track shipment: ${data.error}`);
      }
    } catch (error) {
      console.error('Track shipment error:', error);
      alert('Failed to track shipment. Please try again.');
    } finally {
      setTrackingLoading(false);
    }
  };

  // Save tracking data to database
  const saveTrackingData = async (trackingNumber, courier, trackingData, orderName) => {
    try {
      const response = await fetch(`${config.api.baseURL}/api/shipping/save-tracking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          tracking_number: trackingNumber,
          courier: courier,
          order_name: orderName,
          status: trackingData.status,
          location: trackingData.location,
          last_update: trackingData.last_update,
          estimated_delivery: trackingData.estimated_delivery,
          tracking_details: trackingData
        })
      });

      if (!response.ok) {
        console.error('Failed to save tracking data');
      }
    } catch (error) {
      console.error('Error saving tracking data:', error);
    }
  };

  // Fetch tracking history
  const fetchTrackingHistory = async (trackingNumber) => {
    try {
      const response = await fetch(`${config.api.baseURL}/api/shipping/tracking-history/${trackingNumber}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTrackingHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error fetching tracking history:', error);
    }
  };

  // Download shipping report
  const downloadShippingReport = () => {
    const selectedOrderData = orders.filter(order => selectedOrders.has(order.order_name));
    
    if (selectedOrderData.length === 0) {
      alert('Please select at least one order to download.');
      return;
    }

    const csvContent = [
      ['Order Name', 'Customer Name', 'Phone', 'Address', 'Pincode', 'AWB Number', 'eWaybill Number', 'Courier', 'Status'],
      ...selectedOrderData.map(order => [
        order.order_name || 'N/A',
        order.shipping_name || 'N/A',
        order.phone || 'N/A',
        `${order.shipping_address1 || ''} ${order.shipping_city || ''} ${order.shipping_province_name || ''}`.trim() || 'N/A',
        order.shipping_zip || 'N/A',
        order.awb_number || 'N/A',
        order.ewaybill_number || 'N/A',
        order.courier || 'N/A',
        order.shipping_status || 'N/A'
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `shipping-report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format address for display
  const formatAddress = (order) => {
    const parts = [
      order.shipping_address1,
      order.shipping_city,
      order.shipping_province_name,
      order.shipping_zip
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  };

  // Get shipping status badge
  const getShippingStatusBadge = (order) => {
    if (order.awb_number) {
      return {
        text: 'AWB Generated',
        className: 'bg-info-subtle text-info',
        icon: 'lucide:truck'
      };
    }
    
    if (order.ewaybill_number) {
      return {
        text: 'eWaybill Generated',
        className: 'bg-primary-subtle text-primary',
        icon: 'lucide:file-text'
      };
    }
    
    return {
      text: 'No Shipping',
      className: 'bg-light text-muted',
      icon: 'lucide:package-x'
    };
  };

  return (
    <div className='card basic-data-table'>
      <div className='card-header d-flex align-items-center justify-content-between flex-wrap gap-3'>
        <h5 className='card-title mb-0'>Shipping Management</h5>
        <div className="d-flex align-items-center gap-2">
          <div className="position-relative">
            <Icon
              icon="lucide:search"
              className="position-absolute top-50 translate-middle-y ms-2"
              width="16"
              height="16"
              style={{ left: "8px", color: "#6c757d", zIndex: 1 }}
            />
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Search by Name..."
              value={searchTerm}
              onChange={handleSearch}
              style={{ paddingLeft: "35px", minWidth: "200px" }}
            />
          </div>
          
          {/* Bulk Actions - Only show when orders are selected */}
          {selectedOrders.size > 0 && (
            <>
              <button
                className="btn btn-success btn-sm d-flex align-items-center gap-2"
                onClick={bulkGenerateAWB}
                disabled={bulkLoading}
                title={`Generate AWB for ${selectedOrders.size} selected order${selectedOrders.size > 1 ? 's' : ''}`}
              >
                {bulkLoading && bulkOperation === 'awb' ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status"></span>
                    <span className="d-none d-sm-inline">Generating AWB...</span>
                  </>
                ) : (
                  <>
                    <Icon icon="lucide:truck" width="16" height="16" />
                    <span className="d-none d-sm-inline">Bulk AWB ({selectedOrders.size})</span>
                  </>
                )}
              </button>
              <button
                className="btn btn-primary btn-sm d-flex align-items-center gap-2"
                onClick={bulkGenerateEWaybill}
                disabled={bulkLoading}
                title={`Generate eWaybill for ${selectedOrders.size} selected order${selectedOrders.size > 1 ? 's' : ''}`}
              >
                {bulkLoading && bulkOperation === 'ewaybill' ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status"></span>
                    <span className="d-none d-sm-inline">Generating eWaybill...</span>
                  </>
                ) : (
                  <>
                    <Icon icon="lucide:file-text" width="16" height="16" />
                    <span className="d-none d-sm-inline">Bulk eWaybill ({selectedOrders.size})</span>
                  </>
                )}
              </button>
              <button
                className="btn btn-info btn-sm d-flex align-items-center gap-2"
                onClick={downloadShippingReport}
                title={`Download shipping report for ${selectedOrders.size} selected order${selectedOrders.size > 1 ? 's' : ''}`}
              >
                <Icon icon="lucide:download" width="16" height="16" />
                <span className="d-none d-sm-inline">Download Report</span>
              </button>
            </>
          )}
        </div>
      </div>
      
      <div className='card-body p-0'>
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3 text-muted">Loading orders for shipping...</p>
          </div>
        ) : error ? (
          <div className="alert alert-danger m-3" role="alert">
            <Icon icon="lucide:alert-circle" className="me-2" />
            {error}
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className='table table-hover mb-0 border'>
                <thead className="table-light">
                  <tr>
                    <th className="border-end px-4 py-3 fw-semibold bg-light" style={{ width: '50px' }}>
                      <div className="form-check d-flex justify-content-center">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={selectAll}
                          onChange={handleSelectAll}
                          title="Select all orders"
                        />
                      </div>
                    </th>
                    <th className="border-end px-4 py-3 fw-semibold bg-light">Order</th>
                    <th className="border-end px-4 py-3 fw-semibold bg-light">Customer</th>
                    <th className="border-end px-4 py-3 fw-semibold d-none d-lg-table-cell bg-light">Email</th>
                    <th className="border-end px-4 py-3 fw-semibold d-none d-xl-table-cell bg-light">Address</th>
                    <th className="border-end px-4 py-3 fw-semibold d-none d-md-table-cell bg-light">Phone</th>
                    <th className="border-end px-4 py-3 fw-semibold text-center bg-light">Shipping</th>
                    <th className="px-4 py-3 fw-semibold text-center bg-light">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-5 border-0">
                        <div className="text-muted">
                          <Icon icon="lucide:package" width="48" height="48" className="mb-3 opacity-50" />
                          <p className="mb-0">
                            {searchTerm ? 'No orders found matching your search' : 'No orders available'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    orders.map((order, index) => {
                      const shippingStatus = getShippingStatusBadge(order);
                      return (
                        <tr key={order.order_id || index} className={`border-bottom ${selectedOrders.has(order.order_name) ? 'table-active' : ''}`}>
                          <td className="border-end px-4 py-3 align-middle">
                            <div className="form-check d-flex justify-content-center">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={selectedOrders.has(order.order_name)}
                                onChange={() => handleOrderSelection(order.order_name)}
                                title="Select this order"
                              />
                            </div>
                          </td>
                          <td className="border-end px-4 py-3 align-middle">
                            <div className="d-flex flex-column">
                              <Link href='#' className='text-primary fw-semibold text-decoration-none'>
                                {order.order_name}
                              </Link>
                              <small className="text-muted">
                                {new Date(order.created_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </small>
                              <small className="text-muted d-lg-none">
                                {order.email}
                              </small>
                            </div>
                          </td>
                          <td className="border-end px-4 py-3 align-middle">
                            <div className="d-flex flex-column">
                              <span className="fw-medium">{order.shipping_name || 'N/A'}</span>
                              <small className="text-muted d-xl-none">
                                {formatAddress(order)}
                              </small>
                            </div>
                          </td>
                          <td className="border-end px-4 py-3 d-none d-lg-table-cell align-middle">
                            <span className="text-break">{order.email}</span>
                          </td>
                          <td className="border-end px-4 py-3 d-none d-xl-table-cell align-middle">
                            <div className="text-break" style={{ maxWidth: "200px" }}>
                              {formatAddress(order)}
                            </div>
                          </td>
                          <td className="border-end px-4 py-3 d-none d-md-table-cell align-middle">
                            <span className="text-break">{order.phone || 'N/A'}</span>
                          </td>
                          <td className="border-end px-4 py-3 text-center align-middle">
                            <span className={`badge ${shippingStatus.className} rounded-pill px-3 py-2`}>
                              <Icon icon={shippingStatus.icon} className="me-1" width="12" height="12" />
                              {shippingStatus.text}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center align-middle">
                            <div className="d-flex gap-1 justify-content-center">
                              <button
                                className="btn btn-sm btn-outline-success rounded-pill px-3"
                                onClick={() => generateAWB(order.order_name)}
                                title="Generate AWB"
                              >
                                <Icon icon="lucide:truck" width="14" height="14" />
                                <span className="ms-1 d-none d-sm-inline">AWB</span>
                              </button>
                              <button
                                className="btn btn-sm btn-outline-primary rounded-pill px-3"
                                onClick={() => generateEWaybill(order.order_name)}
                                title="Generate eWaybill"
                              >
                                <Icon icon="lucide:file-text" width="14" height="14" />
                                <span className="ms-1 d-none d-sm-inline">eWaybill</span>
                              </button>
                              {(order.awb_number || order.ewaybill_number) && (
                                <button
                                  className="btn btn-sm btn-outline-info rounded-pill px-3"
                                  onClick={() => trackShipment(
                                    order.awb_number || order.ewaybill_number,
                                    order.courier || 'bluedart',
                                    order.order_name
                                  )}
                                  title="Track Shipment"
                                >
                                  <Icon icon="lucide:map-pin" width="14" height="14" />
                                  <span className="ms-1 d-none d-sm-inline">Track</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination and Page Size */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-center p-4 border-top gap-3">
              <div className="d-flex flex-column flex-sm-row align-items-center gap-3">
                <div className="text-muted small text-center text-sm-start">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} orders
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className="text-muted small">Show:</span>
                  <select 
                    className="form-select form-select-sm" 
                    style={{ width: 'auto' }}
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
                    aria-label="Select page size"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-muted small">per page</span>
                </div>
              </div>
              
              {pagination.totalPages > 1 && (
                <nav aria-label="Orders pagination">
                  <ul className="pagination pagination-sm mb-0">
                    {/* First Page */}
                    <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                      <button 
                        className="page-link border-0" 
                        onClick={() => handlePageChange(1)}
                        disabled={pagination.page === 1}
                        aria-label="Go to first page"
                      >
                        <Icon icon="lucide:chevrons-left" width="16" height="16" />
                      </button>
                    </li>
                    
                    {/* Previous Page */}
                    <li className={`page-item ${!pagination.hasPrev ? 'disabled' : ''}`}>
                      <button 
                        className="page-link border-0" 
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={!pagination.hasPrev}
                        aria-label="Go to previous page"
                      >
                        <Icon icon="lucide:chevron-left" width="16" height="16" />
                      </button>
                    </li>
                    
                    {/* Page Numbers */}
                    {(() => {
                      const pages = [];
                      const totalPages = pagination.totalPages;
                      const currentPage = pagination.page;
                      
                      // Always show first page
                      pages.push(1);
                      
                      // Calculate start and end for page range
                      let start = Math.max(2, currentPage - 1);
                      let end = Math.min(totalPages - 1, currentPage + 1);
                      
                      // Adjust range if near edges
                      if (currentPage <= 3) {
                        end = Math.min(totalPages - 1, 4);
                      } else if (currentPage >= totalPages - 2) {
                        start = Math.max(2, totalPages - 3);
                      }
                      
                      // Add ellipsis after first page if needed
                      if (start > 2) {
                        pages.push('...');
                      }
                      
                      // Add middle pages
                      for (let i = start; i <= end; i++) {
                        pages.push(i);
                      }
                      
                      // Add ellipsis before last page if needed
                      if (end < totalPages - 1) {
                        pages.push('...');
                      }
                      
                      // Always show last page if more than 1 page
                      if (totalPages > 1) {
                        pages.push(totalPages);
                      }
                      
                      return pages.map((page, index) => (
                        <li key={index} className={`page-item ${page === currentPage ? 'active' : ''} ${page === '...' ? 'disabled' : ''}`}>
                          {page === '...' ? (
                            <span className="page-link border-0 text-muted">...</span>
                          ) : (
                            <button
                              className="page-link border-0"
                              onClick={() => handlePageChange(page)}
                              aria-label={`Go to page ${page}`}
                              aria-current={page === currentPage ? 'page' : undefined}
                            >
                              {page}
                            </button>
                          )}
                        </li>
                      ));
                    })()}
                    
                    {/* Next Page */}
                    <li className={`page-item ${!pagination.hasNext ? 'disabled' : ''}`}>
                      <button 
                        className="page-link border-0" 
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={!pagination.hasNext}
                        aria-label="Go to next page"
                      >
                        <Icon icon="lucide:chevron-right" width="16" height="16" />
                      </button>
                    </li>
                    
                    {/* Last Page */}
                    <li className={`page-item ${pagination.page === pagination.totalPages ? 'disabled' : ''}`}>
                      <button 
                        className="page-link border-0" 
                        onClick={() => handlePageChange(pagination.totalPages)}
                        disabled={pagination.page === pagination.totalPages}
                        aria-label="Go to last page"
                      >
                        <Icon icon="lucide:chevrons-right" width="16" height="16" />
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </div>
          </>
        )}
      </div>

      {/* Enhanced Tracking Modal */}
      {trackingModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <Icon icon="lucide:map-pin" className="me-2" />
                  Shipment Tracking Details
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setTrackingModal(false);
                    setTrackingData(null);
                    setTrackingHistory([]);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                {trackingLoading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-3">Tracking shipment...</p>
                  </div>
                ) : trackingData ? (
                  <div>
                    {/* Current Status */}
                    <div className="row mb-4">
                      <div className="col-md-6">
                        <div className="card bg-light">
                          <div className="card-body">
                            <h6 className="card-title">
                              <Icon icon="lucide:info" className="me-2" />
                              Current Status
                            </h6>
                            <div className="d-flex flex-column gap-2">
                              <div className="d-flex justify-content-between">
                                <span className="text-muted">Tracking Number:</span>
                                <span className="fw-medium">{trackingData.awb_number}</span>
                              </div>
                              <div className="d-flex justify-content-between">
                                <span className="text-muted">Courier:</span>
                                <span className="fw-medium">{trackingData.courier}</span>
                              </div>
                              <div className="d-flex justify-content-between">
                                <span className="text-muted">Status:</span>
                                <span className={`badge ${trackingData.status === 'Delivered' ? 'bg-success' : trackingData.status === 'In Transit' ? 'bg-info' : 'bg-warning'}`}>
                                  {trackingData.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="card bg-light">
                          <div className="card-body">
                            <h6 className="card-title">
                              <Icon icon="lucide:map-pin" className="me-2" />
                              Location Details
                            </h6>
                            <div className="d-flex flex-column gap-2">
                              <div className="d-flex justify-content-between">
                                <span className="text-muted">Current Location:</span>
                                <span className="fw-medium">{trackingData.location}</span>
                              </div>
                              <div className="d-flex justify-content-between">
                                <span className="text-muted">Last Update:</span>
                                <span className="fw-medium">{new Date(trackingData.last_update).toLocaleString()}</span>
                              </div>
                              <div className="d-flex justify-content-between">
                                <span className="text-muted">Estimated Delivery:</span>
                                <span className="fw-medium">{trackingData.estimated_delivery}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tracking History */}
                    {trackingHistory.length > 0 && (
                      <div className="mb-4">
                        <h6 className="mb-3">
                          <Icon icon="lucide:history" className="me-2" />
                          Tracking History
                        </h6>
                        <div className="table-responsive">
                          <table className="table table-sm table-bordered">
                            <thead className="table-light">
                              <tr>
                                <th className="small">Date</th>
                                <th className="small">Status</th>
                                <th className="small">Location</th>
                                <th className="small">Details</th>
                              </tr>
                            </thead>
                            <tbody>
                              {trackingHistory.map((entry, index) => (
                                <tr key={index}>
                                  <td className="small">
                                    {new Date(entry.timestamp).toLocaleString()}
                                  </td>
                                  <td className="small">
                                    <span className={`badge ${entry.status === 'Delivered' ? 'bg-success' : entry.status === 'In Transit' ? 'bg-info' : 'bg-warning'}`}>
                                      {entry.status}
                                    </span>
                                  </td>
                                  <td className="small">{entry.location}</td>
                                  <td className="small">{entry.details}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Delivery Tracking */}
                    {trackingData.status === 'Delivered' && (
                      <div className="alert alert-success">
                        <Icon icon="lucide:check-circle" className="me-2" />
                        <strong>Package Delivered!</strong> The shipment has been successfully delivered to the recipient.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Icon icon="lucide:package-x" width="48" height="48" className="mb-3 text-muted" />
                    <p className="text-muted">No tracking information available.</p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setTrackingModal(false);
                    setTrackingData(null);
                    setTrackingHistory([]);
                  }}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    if (trackingData) {
                      trackShipment(trackingData.awb_number, trackingData.courier);
                    }
                  }}
                >
                  <Icon icon="lucide:refresh-cw" className="me-2" />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingDashboard; 