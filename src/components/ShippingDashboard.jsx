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
    const currentPageOrderNames = orders
      .filter(order => !isOrderCancelled(order))
      .map(order => order.order_name);
    const selectedCurrentPage = currentPageOrderNames.length > 0 && 
      currentPageOrderNames.every(name => selectedOrders.has(name));
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
    
    // Update select all state based on current page (excluding cancelled orders)
    const currentPageOrderNames = orders
      .filter(order => !isOrderCancelled(order))
      .map(order => order.order_name);
    const selectedCurrentPage = currentPageOrderNames.length > 0 && 
      currentPageOrderNames.every(name => newSelectedOrders.has(name));
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
      // Select all current page orders (excluding cancelled orders)
      const newSelectedOrders = new Set(selectedOrders);
      orders.forEach(order => {
        if (!isOrderCancelled(order)) {
        newSelectedOrders.add(order.order_name);
        }
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





  // Validate order data for waybill generation
  const validateOrderForWaybill = (order) => {
    const errors = [];
    
    if (!order.shipping_name) {
      errors.push('Shipping name is missing');
    }
    
    if (!order.shipping_address1) {
      errors.push('Shipping address is missing');
    }
    
    if (!order.shipping_zip) {
      errors.push('Shipping pincode is missing');
    }
    
    if (!order.phone) {
      errors.push('Phone number is missing');
    }
    
    // Email is optional - removed validation
    
    if (!order.line_items || !Array.isArray(order.line_items) || order.line_items.length === 0) {
      errors.push('Product information is missing');
    }
    
    // Check BlueDart service availability
    if (order.bluedart_service_available === false) {
      errors.push('BlueDart service not available for this pincode');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  };

  // Enhanced waybill generation with validation
  const generateWaybillWithData = async (order) => {
    try {
      // Validate order data first
      const validation = validateOrderForWaybill(order);
      if (!validation.isValid) {
        alert(`Cannot generate waybill. Please fix the following issues:\n\n${validation.errors.join('\n')}`);
      return;
    }

      const waybillData = createWaybillData(order);
      
      if (!waybillData) {
        alert('Unable to create waybill data. Please check order information.');
        return;
      }

      const response = await fetch(`${config.api.baseURL}/api/shipping/generate-waybill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(waybillData)
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`Waybill generated successfully for ${order.order_name}!\nAWB Number: ${data.data?.awb_number || 'N/A'}`);
        fetchOrders(currentPage, searchTerm, pageSize);
      } else {
        alert(`Failed to generate waybill: ${data.error}`);
      }
    } catch (error) {
      console.error('Generate waybill error:', error);
      alert('Failed to generate waybill. Please try again.');
    }
  };





  // Bulk generate waybills with product data
  const bulkGenerateWaybills = async () => {
    if (selectedOrders.size === 0) {
      alert('Please select at least one order.');
      return;
    }

    setBulkLoading(true);
    setBulkOperation('waybill');

    try {
      const selectedOrderData = orders.filter(order => 
        selectedOrders.has(order.order_name) && 
        !isOrderCancelled(order) && 
        order.bluedart_service_available !== false
      );
      

      
      if (selectedOrderData.length === 0) {
        // Check if any selected orders have unavailable service
        const unavailableOrders = orders.filter(order => 
          selectedOrders.has(order.order_name) && 
          !isOrderCancelled(order) && 
          order.bluedart_service_available === false
        );
        
        if (unavailableOrders.length > 0) {
          const unavailableNames = unavailableOrders.map(order => order.order_name).join(', ');
          alert(`Cannot generate waybills for the following orders due to BlueDart service unavailability:\n\n${unavailableNames}\n\nPlease check pincode and payment method compatibility.`);
        } else {
          alert('No valid orders selected for waybill generation.');
        }
        return;
      }

      // Prepare bulk waybill data
      const bulkWaybillData = selectedOrderData.map(order => {
        const waybillData = createWaybillData(order);
        if (!waybillData) {
          console.error(`Unable to create waybill data for ${order.order_name}`);
          return null;
        }
        return waybillData;
      }).filter(Boolean);
      


      if (bulkWaybillData.length === 0) {
        alert('No valid waybill data could be created for the selected orders.');
      return;
    }

      // Send bulk request to backend
      const response = await fetch(`${config.api.baseURL}/api/shipping/generate-bulk-waybills`, {
            method: 'POST',
            headers: {
          'Content-Type': 'application/json'
            },
        body: JSON.stringify({ waybills: bulkWaybillData })
          });

          const data = await response.json();
          
          if (data.success) {
        alert(`Bulk waybill generation completed successfully for ${bulkWaybillData.length} orders!`);
      setSelectedOrders(new Set());
      setSelectAll(false);
      fetchOrders(currentPage, searchTerm, pageSize);
      } else {
        alert(`Failed to generate bulk waybills: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Bulk waybill generation error:', error);
      alert('Failed to generate waybills for selected orders.');
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
      const response = await fetch(`${config.api.baseURL}/api/shipping/track/${trackingNumber}?courier=${courier}`);

      const data = await response.json();
      
      if (data.success) {
        setTrackingData(data.data);
        
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



  // Fetch tracking history
  const fetchTrackingHistory = async (trackingNumber) => {
    try {
      const response = await fetch(`${config.api.baseURL}/api/shipping/tracking-history/${trackingNumber}`);

      if (response.ok) {
        const data = await response.json();
        setTrackingHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error fetching tracking history:', error);
    }
  };

  // Format product names with quantities for display
  const formatProductNames = (order) => {
    if (!order.line_items || !Array.isArray(order.line_items)) {
      return 'N/A';
    }

    const itemCount = order.line_items.length;
    
    if (itemCount <= 3) {
      // Show individual SKUs for 3 or fewer items
      return order.line_items.map(item => item.lineitem_sku || 'Unknown').join(', ');
    } else {
      // For more than 3 items, show as AccessoriesNx
      return `Accessories${itemCount}x`;
    }
  };

  // Format commodity details with quantities
  const formatCommodityDetails = (order) => {
    if (!order.line_items || !Array.isArray(order.line_items)) {
      return 'N/A';
    }

    const itemCount = order.line_items.length;
    
    if (itemCount <= 3) {
      // Show individual SKUs for 3 or fewer items
      return order.line_items.map(item => {
        const sku = item.lineitem_sku || 'Unknown';
        const quantity = item.lineitem_quantity || 1;
        return quantity > 1 ? item.lineitem_quantity : 1;
      }).join(', ');
    } else {
      // For more than 3 items, show as AccessoriesNx
      return `Accessories${itemCount}x`;
    }
  };

  // Create waybill data structure for API calls
  const createWaybillData = (order) => {
    if (!order.line_items || !Array.isArray(order.line_items)) {
      return null;
    }

    const itemCount = order.line_items.length;
    let commodityDetails = [];
    
    if (itemCount <= 3) {
      // Include all individual SKUs
      commodityDetails = order.line_items.map(item => item.lineitem_sku || 'Unknown');
    } else {
      // For more than 3 items, use AccessoriesNx
      commodityDetails = [`Accessories${itemCount}x`];
    }

    return {
      consignee: {
        ConsigneeName: order.shipping_name || 'N/A',
        ConsigneeAddress1: order.shipping_address1 || 'N/A',
        ConsigneeAddress2: order.shipping_address2 || '',
        ConsigneeAddress3: `${order.shipping_province_name || ''}, ${order.shipping_city || ''}`.trim() || '',
        ConsigneePincode: order.shipping_zip || 'N/A',
        ConsigneeMobile: formatPhoneNumber(order.phone),
        ConsigneeAttention: order.shipping_name || 'N/A',
        ConsigneeEmailID: order.email || ''
      },
      services: {
        ActualWeight: "0.50",
        CreditReferenceNo: order.order_name || 'N/A',
        PieceCount: "1",
        ProductType: 1,
        Commodity: {
          CommodityDetail1: commodityDetails[0] || 'N/A',
          CommodityDetail2: commodityDetails[1] || '',
          CommodityDetail3: commodityDetails[2] || ''
        },
        Dimensions: [
          {
            Breadth: 15,
            Count: 1,
            Height: 15,
            Length: 23
          }
        ],
        Product1: itemCount <= 3 ? (order.line_items?.[0]?.lineitem_sku || 'N/A') : `Accessories${itemCount}x`,
        SKU1: order.line_items?.[0]?.lineitem_sku || 'N/A',
        SubProduct1_1: itemCount <= 3 ? (order.line_items?.[1]?.lineitem_sku || '') : '',
        SubProduct1_2: itemCount <= 3 ? (order.line_items?.[2]?.lineitem_sku || '') : '',
        InvoiceNumber: order.order_name || '',
        orderAmount: order.total || 0,
        itemCount: order.line_items?.reduce((total, item) => total + (item.lineitem_quantity || 1), 0) || 1,
        paymentMethod: order.payment_method
      }
    };
  };



  // Format address for display
  const formatAddress = (order) => {
    const parts = [];
    
    if (order.shipping_address1) parts.push(order.shipping_address1);
    if (order.shipping_address2) parts.push(order.shipping_address2);
    if (order.shipping_city) parts.push(order.shipping_city);
    if (order.shipping_province_name) parts.push(order.shipping_province_name);
    if (order.shipping_zip) parts.push(order.shipping_zip);
    
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  };

  // Format phone number by removing country code prefix
  const formatPhoneNumber = (phone) => {
    if (!phone) return 'N/A';
    
    // Remove "91" prefix if it exists at the beginning
    let formattedPhone = phone.toString().trim();
    
    // Check if phone starts with "91" and has more than 10 digits
    if (formattedPhone.startsWith('91') && formattedPhone.length > 10) {
      formattedPhone = formattedPhone.substring(2);
    }
    
    // If still more than 10 digits, truncate to last 10 digits
    if (formattedPhone.length > 10) {
      formattedPhone = formattedPhone.substring(formattedPhone.length - 10);
    }
    
    return formattedPhone;
  };

  // Check if order is cancelled
  const isOrderCancelled = (order) => {
    return order.payment_status === 'voided' || order.payment_status === 'cancelled';
  };

    // Get shipping status display
  const getShippingStatusDisplay = (order) => {
    // If AWB number exists, show it with status
    if (order.awb_number) {
      return {
        type: 'awb',
        awbNumber: order.awb_number,
        status: order.shipping_status || 'Generated',
        courier: order.courier || 'N/A',
        generatedAt: order.awb_generated_at
      };
    }
    
    // Check BlueDart service availability first
    if (order.bluedart_service_available === false) {
      return {
        type: 'unavailable',
        text: 'Service Unavailable',
        className: 'bg-danger-subtle text-danger',
        icon: 'lucide:x-circle',
        tooltip: 'BlueDart service not available for this pincode and payment method'
      };
    }
    
    // Check if order has required data for waybill generation
    const validation = validateOrderForWaybill(order);
    if (!validation.isValid) {
      return {
        type: 'missing',
        text: 'Missing Data',
        className: 'bg-warning-subtle text-warning',
        icon: 'lucide:alert-triangle',
        tooltip: `Missing: ${validation.errors.join(', ')}`
      };
    }
    
    return {
      type: 'ready',
      text: 'Ready for Shipping',
      className: 'bg-success-subtle text-success',
      icon: 'lucide:package-check',
      tooltip: 'Order is ready for waybill generation'
    };
  };

  // Download TH waybill PDF
  const downloadTHWaybillPDF = async (awbNumber, orderName) => {
    if (!awbNumber) {
      alert('No AWB number available for this order. Please generate an AWB first.');
      return;
    }

    try {
      const response = await fetch(`${config.api.baseURL}/api/shipping/download-th-pdf/${awbNumber}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data?.pdf_base64) {
        // Convert base64 to blob and download
        const byteCharacters = atob(data.data.pdf_base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `TH-Waybill-${awbNumber}-${orderName || 'Order'}.pdf`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        alert(`TH Waybill PDF downloaded successfully for AWB: ${awbNumber}`);
      } else {
        alert(`Failed to download TH waybill: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Download TH waybill error:', error);
      alert('Failed to download TH waybill PDF. Please try again.');
    }
  };

  // Download regular waybill PDF
  const downloadWaybillPDF = async (awbNumber, orderName) => {
    if (!awbNumber) {
      alert('No AWB number available for this order. Please generate an AWB first.');
      return;
    }

    try {
      const response = await fetch(`${config.api.baseURL}/api/shipping/download-pdf/${awbNumber}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Check if response is PDF or JSON
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/pdf')) {
        // Direct PDF download
        const blob = await response.blob();
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `Waybill-${awbNumber}-${orderName || 'Order'}.pdf`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        alert(`Waybill PDF downloaded successfully for AWB: ${awbNumber}`);
      } else {
        // JSON response with base64 data
        try {
        const data = await response.json();
          
          if (data.success && data.data?.pdf_base64) {
            // Convert base64 to blob and download
            const byteCharacters = atob(data.data.pdf_base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `Waybill-${awbNumber}-${orderName || 'Order'}.pdf`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            alert(`Waybill PDF downloaded successfully for AWB: ${awbNumber}`);
          } else {
            alert(`Failed to download waybill: ${data.error || 'Unknown error'}`);
          }
        } catch (jsonError) {
          console.error('JSON parsing error:', jsonError);
          alert('Failed to parse response from server. Please try again.');
        }
      }
    } catch (error) {
      console.error('Download waybill error:', error);
      alert('Failed to download waybill PDF. Please try again.');
    }
  };

  // Download shipping label
  const downloadShippingLabel = async (awbNumber, orderName) => {
    if (!awbNumber) {
      alert('No AWB number available for this order. Please generate an AWB first.');
      return;
    }

    try {
      const response = await fetch(`${config.api.baseURL}/api/shipping/download-th-pdf/${awbNumber}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Check if response is PDF or JSON
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/pdf')) {
        // Direct PDF download
        const blob = await response.blob();
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `Shipping-Label-${awbNumber}-${orderName || 'Order'}.pdf`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        alert(`Shipping label downloaded successfully for AWB: ${awbNumber}`);
      } else {
        // JSON response with base64 data
        try {
          const data = await response.json();
          
          if (data.success && data.data?.pdf_base64) {
            // Convert base64 to blob and download
            const byteCharacters = atob(data.data.pdf_base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `Shipping-Label-${awbNumber}-${orderName || 'Order'}.pdf`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            alert(`Shipping label downloaded successfully for AWB: ${awbNumber}`);
          } else {
            alert(`Failed to download shipping label: ${data.error || 'Unknown error'}`);
          }
        } catch (jsonError) {
          console.error('JSON parsing error:', jsonError);
          alert('Failed to parse response from server. Please try again.');
        }
      }
    } catch (error) {
      console.error('Download shipping label error:', error);
      alert('Failed to download shipping label. Please try again.');
    }
  };

  // Bulk download waybill PDFs
  const bulkDownloadWaybills = async () => {
    const selectedOrderData = orders.filter(order => selectedOrders.has(order.order_name));
    const ordersWithAWB = selectedOrderData.filter(order => order.awb_number && !isOrderCancelled(order));
    
    // Debug: Log what's happening with the filtering
    console.log('Selected orders for PDFs:', selectedOrderData.length);
    console.log('Selected order names for PDFs:', Array.from(selectedOrders));
    console.log('Orders with AWB for PDFs:', ordersWithAWB.length);
    console.log('Orders with AWB details for PDFs:', ordersWithAWB.map(order => ({
      order_name: order.order_name,
      awb_number: order.awb_number,
      cancelled: isOrderCancelled(order)
    })));
    
    if (ordersWithAWB.length === 0) {
      alert('No selected orders have AWB numbers or orders are cancelled. Please generate waybills first.');
      return;
    }

    if (ordersWithAWB.length !== selectedOrderData.length) {
      const missingAWB = selectedOrderData.length - ordersWithAWB.length;
      const missingOrders = selectedOrderData
        .filter(order => !order.awb_number || isOrderCancelled(order))
        .map(order => `${order.order_name} (${!order.awb_number ? 'No AWB' : 'Cancelled'})`);
      
      alert(`${missingAWB} selected order(s) will be skipped:\n\n${missingOrders.join('\n')}\n\nReason: Missing AWB numbers or cancelled orders`);
    }

    setBulkLoading(true);
    setBulkOperation('download');

    try {
      // Extract tracking numbers for bulk API call
      const trackingNumbers = ordersWithAWB.map(order => order.awb_number);
      
      // Debug: Log the tracking numbers being sent
      console.log('Sending tracking numbers for PDFs:', trackingNumbers);
      console.log('Request payload for PDFs:', { trackingNumbers });
      
      const response = await fetch(`${config.api.baseURL}/api/shipping/download-bulk-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ trackingNumbers })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Check if response is PDF or JSON
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/pdf')) {
        // Direct PDF download
        const blob = await response.blob();
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
        link.setAttribute('download', `Bulk-Waybills-${new Date().toISOString().split('T')[0]}.pdf`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        alert(`Bulk waybill PDFs downloaded successfully for ${ordersWithAWB.length} orders!`);
      } else {
        // JSON response with base64 data
        try {
          const data = await response.json();
          
          if (data.success && data.data?.pdf_base64) {
            // Convert base64 to blob and download
            const byteCharacters = atob(data.data.pdf_base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `Bulk-Waybills-${new Date().toISOString().split('T')[0]}.pdf`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            alert(`Bulk waybill PDFs downloaded successfully for ${ordersWithAWB.length} orders!`);
          } else {
            alert(`Failed to download bulk waybills: ${data.error || 'Unknown error'}`);
          }
        } catch (jsonError) {
          console.error('JSON parsing error:', jsonError);
          alert('Failed to parse response from server. Please try again.');
        }
      }
    } catch (error) {
      console.error('Bulk download error:', error);
      alert('Failed to download bulk waybills. Please try again.');
    } finally {
      setBulkLoading(false);
      setBulkOperation(null);
    }
  };

  // Bulk download shipping labels using bulk API
  const bulkDownloadLabels = async () => {
    const selectedOrderData = orders.filter(order => selectedOrders.has(order.order_name));
    const ordersWithAWB = selectedOrderData.filter(order => order.awb_number && !isOrderCancelled(order));
    
    // Debug: Log what's happening with the filtering
    console.log('Selected orders:', selectedOrderData.length);
    console.log('Selected order names:', Array.from(selectedOrders));
    console.log('Orders with AWB:', ordersWithAWB.length);
    console.log('Orders with AWB details:', ordersWithAWB.map(order => ({
      order_name: order.order_name,
      awb_number: order.awb_number,
      cancelled: isOrderCancelled(order)
    })));
    
    if (ordersWithAWB.length === 0) {
      alert('No selected orders have AWB numbers or orders are cancelled. Please generate waybills first.');
      return;
    }

    if (ordersWithAWB.length !== selectedOrderData.length) {
      const missingAWB = selectedOrderData.length - ordersWithAWB.length;
      const missingOrders = selectedOrderData
        .filter(order => !order.awb_number || isOrderCancelled(order))
        .map(order => `${order.order_name} (${!order.awb_number ? 'No AWB' : 'Cancelled'})`);
      
      alert(`${missingAWB} selected order(s) will be skipped:\n\n${missingOrders.join('\n')}\n\nReason: Missing AWB numbers or cancelled orders`);
    }

    setBulkLoading(true);
    setBulkOperation('downloadLabels');

    try {
      // Extract tracking numbers for bulk API call
      const trackingNumbers = ordersWithAWB.map(order => order.awb_number);
      
      // Debug: Log the tracking numbers being sent
      console.log('Sending tracking numbers:', trackingNumbers);
      console.log('Request payload:', { trackingNumbers });
      
      const response = await fetch(`${config.api.baseURL}/api/shipping/download-bulk-th-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ trackingNumbers })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Check if response is PDF or JSON
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/pdf')) {
        // Direct PDF download
        const blob = await response.blob();
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `Bulk-Shipping-Labels-${new Date().toISOString().split('T')[0]}.pdf`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        alert(`Bulk shipping labels downloaded successfully for ${ordersWithAWB.length} orders!`);
      } else {
        // JSON response with base64 data
        try {
          const data = await response.json();
          
          if (data.success && data.data?.pdf_base64) {
            // Convert base64 to blob and download
            const byteCharacters = atob(data.data.pdf_base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `Bulk-Shipping-Labels-${new Date().toISOString().split('T')[0]}.pdf`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            alert(`Bulk shipping labels downloaded successfully for ${ordersWithAWB.length} orders!`);
          } else {
            alert(`Failed to download bulk shipping labels: ${data.error || 'Unknown error'}`);
          }
        } catch (jsonError) {
          console.error('JSON parsing error:', jsonError);
          alert('Failed to parse response from server. Please try again.');
        }
      }
    } catch (error) {
      console.error('Bulk label download error:', error);
      alert('Failed to download bulk shipping labels. Please try again.');
    } finally {
      setBulkLoading(false);
      setBulkOperation(null);
    }
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
                className="btn btn-warning btn-sm d-flex align-items-center gap-2"
                onClick={bulkGenerateWaybills}
                disabled={bulkLoading}
                title={`Generate waybills with product data for ${selectedOrders.size} selected order${selectedOrders.size > 1 ? 's' : ''}`}
              >
                {bulkLoading && bulkOperation === 'waybill' ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status"></span>
                    <span className="d-none d-sm-inline">Generating Waybills...</span>
                  </>
                ) : (
                  <>
                    <Icon icon="lucide:package" width="16" height="16" />
                    <span className="d-none d-sm-inline">Bulk Waybills ({selectedOrders.size})</span>
                  </>
                )}
              </button>
              <button
                className="btn btn-secondary btn-sm d-flex align-items-center gap-2"
                onClick={bulkDownloadWaybills}
                disabled={bulkLoading}
                title={`Download Waybill PDFs for ${selectedOrders.size} selected order${selectedOrders.size > 1 ? 's' : ''}`}
              >
                {bulkLoading && bulkOperation === 'download' ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status"></span>
                    <span className="d-none d-sm-inline">Downloading PDFs...</span>
                  </>
                ) : (
                  <>
                    <Icon icon="lucide:file-text" width="16" height="16" />
                    <span className="d-none d-sm-inline">Bulk PDFs ({selectedOrders.size})</span>
                  </>
                )}
              </button>
              <button
                className="btn btn-info btn-sm d-flex align-items-center gap-2"
                onClick={bulkDownloadLabels}
                disabled={bulkLoading}
                title={`Download Shipping Labels for ${selectedOrders.size} selected order${selectedOrders.size > 1 ? 's' : ''}`}
              >
                {bulkLoading && bulkOperation === 'downloadLabels' ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status"></span>
                    <span className="d-none d-sm-inline">Downloading Labels...</span>
                  </>
                ) : (
                  <>
                    <Icon icon="lucide:tag" width="16" height="16" />
                    <span className="d-none d-sm-inline">Bulk Labels ({selectedOrders.size})</span>
                  </>
                )}
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
                    <th className="border-end px-4 py-3 fw-semibold d-none d-lg-table-cell bg-light">
                      Products
                      <Icon 
                        icon="lucide:info" 
                        width="14" 
                        height="14" 
                        className="ms-1 text-muted" 
                        title="Products: Shows individual names for ≤3 items, Accessories4x+ for >3 items"
                      />
                    </th>
                    <th className="border-end px-4 py-3 fw-semibold d-none d-md-table-cell bg-light">Phone</th>
                    <th className="border-end px-4 py-3 fw-semibold text-center bg-light">Shipping</th>
                    <th className="px-4 py-3 fw-semibold text-center bg-light">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-5 border-0">
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
                      const shippingStatus = getShippingStatusDisplay(order);
                      return (
                        <tr key={order.order_id || index} className={`border-bottom ${selectedOrders.has(order.order_name) ? 'table-active' : ''}`}>
                          <td className="border-end px-4 py-3 align-middle">
                            <div className="form-check d-flex justify-content-center">
                              <input
                                className={`form-check-input ${isOrderCancelled(order) ? 'opacity-50' : ''}`}
                                type="checkbox"
                                checked={selectedOrders.has(order.order_name)}
                                onChange={() => handleOrderSelection(order.order_name)}
                                disabled={isOrderCancelled(order)}
                                title={isOrderCancelled(order) ? "Cannot select cancelled orders" : "Select this order"}
                              />
                            </div>
                          </td>
                          <td className="border-end px-4 py-3 align-middle">
                            <div className="d-flex flex-column">
                              <Link href='#' className='text-primary fw-semibold text-decoration-none mb-1'>
                                {order.order_name}
                              </Link>
                              {isOrderCancelled(order) && (
                                <div className="d-flex align-items-center gap-1 mb-1">
                                  <Icon icon="lucide:x-circle" width="12" height="12" className="text-danger" />
                                  <span className="badge bg-danger-subtle text-danger border border-danger rounded-pill px-2 py-1" 
                                        style={{ fontSize: '9px', fontWeight: '500', letterSpacing: '0.3px' }}>
                                    CANCELLED
                                  </span>
                                </div>
                              )}
                              {!isOrderCancelled(order) && !order.awb_number && (
                                <div className="d-flex align-items-center gap-1 mb-1">
                                  <Icon icon="lucide:alert-circle" width="12" height="12" className="text-warning" />
                                  <span className="badge bg-warning-subtle text-warning border border-warning rounded-pill px-2 py-1" 
                                        style={{ fontSize: '9px', fontWeight: '500', letterSpacing: '0.3px' }}>
                                    NO AWB
                                  </span>
                                </div>
                              )}
                              
                              {/* BlueDart Service Availability Indicator */}
                              {!isOrderCancelled(order) && order.bluedart_service_available === false && (
                                <div className="d-flex align-items-center gap-1 mb-1">
                                  <Icon icon="lucide:x-circle" width="12" height="12" className="text-danger" />
                                  <span className="badge bg-danger-subtle text-danger border border-danger rounded-pill px-2 py-1" 
                                        style={{ fontSize: '9px', fontWeight: '500', letterSpacing: '0.3px' }}
                                        title="BlueDart service not available for this pincode and payment method">
                                    SERVICE UNAVAILABLE
                                  </span>
                                </div>
                              )}
                              
                              {/* BlueDart Service Available Indicator */}
                              {!isOrderCancelled(order) && order.bluedart_service_available === true && !order.awb_number && (
                                <div className="d-flex align-items-center gap-1 mb-1">
                                  <Icon icon="lucide:check-circle" width="12" height="12" className="text-success" />
                                  <span className="badge bg-success-subtle text-success border border-success rounded-pill px-2 py-1" 
                                        style={{ fontSize: '9px', fontWeight: '500', letterSpacing: '0.3px' }}
                                        title="BlueDart service available - ready for waybill generation">
                                    SERVICE AVAILABLE
                                  </span>
                                </div>
                              )}
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
                          <td className="border-end px-4 py-3 d-none d-lg-table-cell align-middle">
                            <div className="text-break" style={{ maxWidth: "150px" }}>
                              <small className="fw-medium">{formatProductNames(order)}</small>
                             
                            </div>
                          </td>
                          <td className="border-end px-4 py-3 d-none d-md-table-cell align-middle">
                            <span className="text-break">{formatPhoneNumber(order.phone)}</span>
                          </td>
                          <td className="border-end px-4 py-3 text-center align-middle">
                            {shippingStatus.type === 'awb' ? (
                              <div className="d-flex flex-column align-items-center">
                                <span className="fw-semibold text-primary mb-1">
                                  {shippingStatus.awbNumber}
                                </span>
                                <small className="text-muted">
                                  {shippingStatus.generatedAt ? 
                                    new Date(shippingStatus.generatedAt).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    }) : 
                                    shippingStatus.status
                                  }
                                  {shippingStatus.courier && shippingStatus.courier !== 'N/A' ? ` • ${shippingStatus.courier}` : ''}
                                </small>
                              </div>
                            ) : (
                              <span 
                                className={`badge ${shippingStatus.className} rounded-pill px-3 py-2`}
                                title={shippingStatus.text === 'Missing Data' ? 
                                  `Missing: ${validateOrderForWaybill(order).errors.join(', ')}` : 
                                  shippingStatus.text
                                }
                              >
                              <Icon icon={shippingStatus.icon} className="me-1" width="12" height="12" />
                              {shippingStatus.text}
                            </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center align-middle">
                            <div className="d-flex gap-1 justify-content-center">
                              <button
                                className="btn btn-sm btn-outline-warning rounded-pill px-3"
                                onClick={() => generateWaybillWithData(order)}
                                disabled={isOrderCancelled(order) || order.bluedart_service_available === false}
                                title={
                                  isOrderCancelled(order) ? "Cannot generate waybill for cancelled orders" :
                                  order.bluedart_service_available === false ? "BlueDart service not available for this pincode and payment method" :
                                  "Generate Waybill with Product Data"
                                }
                              >
                                <Icon icon="lucide:package" width="14" height="14" />
                                <span className="ms-1 d-none d-sm-inline">Waybill</span>
                              </button>

                              {order.awb_number && !isOrderCancelled(order) && (
                                <>
                              <button
                                    className="btn btn-sm btn-outline-secondary rounded-pill px-3"
                                    onClick={() => downloadWaybillPDF(order.awb_number, order.order_name)}
                                    title="Download Waybill PDF (includes TH waybill)"
                              >
                                <Icon icon="lucide:file-text" width="14" height="14" />
                                    <span className="ms-1 d-none d-sm-inline">PDF</span>
                              </button>
                                <button
                                  className="btn btn-sm btn-outline-info rounded-pill px-3"
                                    onClick={() => downloadShippingLabel(order.awb_number, order.order_name)}
                                    title="Download Shipping Label"
                                  >
                                    <Icon icon="lucide:tag" width="14" height="14" />
                                    <span className="ms-1 d-none d-sm-inline">Label</span>
                                </button>
                                </>
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