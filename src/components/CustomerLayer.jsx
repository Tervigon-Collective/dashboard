"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react/dist/iconify.js";
import * as XLSX from 'xlsx';
import config from "../config";

const CustomerLayer = () => {
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
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [fileData, setFileData] = useState(null);
  const [mappedData, setMappedData] = useState([]);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [pageSize, setPageSize] = useState(10);

  // Fetch orders from API
  const fetchOrders = async (page = 1, search = "", limit = pageSize) => {
    setLoading(true);
    setError(null);
    
    try {
      let url = `${config.api.baseURL}/api/customer-orders?page=${page}&limit=${limit}`;
      if (search) {
        url += `&name=${encodeURIComponent(search)}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json; charset=utf-8'
        }
      });
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
      setError("Failed to load customer orders. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(currentPage, searchTerm, pageSize);
  }, [currentPage, searchTerm, pageSize]);

  // Reset select all state when page changes
  useEffect(() => {
    const currentPageOrderIds = orders
      .map(order => order.order_id);
    const selectedCurrentPage = currentPageOrderIds.every(id => selectedOrders.has(id));
    setSelectAll(selectedCurrentPage && currentPageOrderIds.length > 0);
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

  // Calculate total quantity for an order
  const getTotalQuantity = (lineItems) => {
    if (!lineItems || lineItems.length === 0) {
      return 1; // Default to 1 if no line items available
    }
    return lineItems.reduce((total, item) => total + (item.lineitem_quantity || 0), 0);
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

  // Get status badge for order
  const getStatusBadge = (order) => {
    if (order.payment_status === 'voided') {
      return {
        text: 'Cancelled',
        className: 'bg-danger-subtle text-danger',
        icon: 'lucide:x-circle'
      };
    }
    
    if (order.payment_status === 'paid') {
      return {
        text: 'Paid',
        className: 'bg-success-subtle text-success',
        icon: 'lucide:check-circle'
      };
    }
    
    if (order.payment_status === 'pending') {
      return {
        text: 'Pending',
        className: 'bg-warning-subtle text-warning',
        icon: 'lucide:clock'
      };
    }
    
    return {
      text: 'Unknown',
      className: 'bg-secondary-subtle text-secondary',
      icon: 'lucide:help-circle'
    };
  };

  // Get shipping status badge
  const getShippingStatusBadge = (order) => {
    if (order.awb_number) {
      return {
        text: 'AWB Generated',
        className: 'bg-info-subtle text-info',
        icon: 'lucide:truck',
        tooltip: `BlueDart AWB: ${order.awb_number}`
      };
    }
    
    if (order.ewaybill_number) {
      return {
        text: 'eWaybill Generated',
        className: 'bg-primary-subtle text-primary',
        icon: 'lucide:file-text',
        tooltip: `DHL eWaybill: ${order.ewaybill_number}`
      };
    }
    
    return {
      text: 'No Shipping',
      className: 'bg-light text-muted',
      icon: 'lucide:package-x',
      tooltip: 'No shipping documents generated'
    };
  };
  

  // Format address
  const formatAddress = (order) => {
    const parts = [
      order.shipping_address1,
      order.shipping_address2,
      order.shipping_city,
      order.shipping_province_name,
      order.shipping_zip
    ].filter(Boolean);
    
    return parts.join(", ");
  };

  // Handle view products
  const handleViewProducts = (order) => {
    // Map line_items to products format
    const products = order.line_items?.length > 0 
      ? order.line_items.map(item => ({
          name: item.lineitem_name || 'Unknown Product',
          sku: item.lineitem_sku || 'N/A',
          quantity: item.lineitem_quantity || 0,
          price: item.lineitem_price || 0,
          total: (item.lineitem_quantity || 0) * (item.lineitem_price || 0),
          compare_at_price: item.lineitem_compare_at_price || 0,
          grams: item.lineitem_grams || 0,
          vendor: item.lineitem_vendor || 'N/A',
          requires_shipping: item.lineitem_requires_shipping || false,
          taxable: item.lineitem_taxable || false,
          fulfillment_status: item.lineitem_fulfillment_status || 'unfulfilled',
          gift_card: item.lineitem_gift_card || false
        }))
      : [{
          name: `Order ${order.order_name}`,
          sku: `SKU-${order.order_name?.replace(/[^0-9]/g, '') || 'N/A'}`,
          quantity: 1,
          price: order.subtotal || 0,
          total: order.subtotal || 0
        }];
    
    setSelectedOrder({ order, products });
    setProductModalOpen(true);
  };



  // Handle file upload using SheetJS for robust parsing
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file type
    const fileName = file.name.toLowerCase();
    const isCSV = fileName.endsWith('.csv');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (!isCSV && !isExcel) {
      setUploadError("Please upload a CSV or Excel file (.csv, .xlsx, .xls)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const fileData = new Uint8Array(e.target.result);

        // Use SheetJS to parse the file
        const workbook = XLSX.read(fileData, { 
          type: 'array',
          cellDates: true,
          cellNF: false,
          cellText: false,
          cellStyles: false,
          cellHTML: false
        });

        // Get the first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        if (!worksheet) {
          setUploadError("No data found in the file.");
          return;
        }

        // Convert to JSON with headers, preserving string values for IDs
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1, // Use first row as headers
          defval: '', // Default value for empty cells
          raw: true // Keep raw values to prevent scientific notation
        });

        if (jsonData.length < 2) {
          setUploadError("File must have at least a header row and one data row.");
          return;
        }

        // Extract headers and data
        const headers = jsonData[0];
        const dataRows = jsonData.slice(1);

        // Helper function to format cell values properly
        const formatCellValue = (value, header) => {
          if (value === null || value === undefined) return '';
          
          // Convert to string first
          let strValue = String(value);
          
          // Handle scientific notation for large numbers (like IDs)
          if (strValue.includes('E+') || strValue.includes('e+')) {
            const num = parseFloat(strValue);
            if (!isNaN(num)) {
              // Convert back to full number string
              strValue = num.toLocaleString('fullwide', { useGrouping: false });
            }
          }
          
          // Remove quotes from postal codes and zip codes
          const postalColumns = ['Billing Zip', 'Shipping Zip', 'Zip', 'Postal Code'];
          if (postalColumns.some(col => header && header.includes(col))) {
            strValue = strValue.replace(/^['"]|['"]$/g, ''); // Remove leading/trailing quotes
          }
          
          // Handle specific columns that should be preserved as strings
          const stringColumns = ['Id', 'Order ID', 'ID', 'Payment ID', 'Device ID', 'Receipt Number'];
          if (stringColumns.some(col => header && header.includes(col))) {
            return strValue;
          }
          
          return strValue;
        };

        // Convert to array of objects
        const parsedData = dataRows.map((row, index) => {
          const obj = {};
          headers.forEach((header, colIndex) => {
            obj[header] = formatCellValue(row[colIndex], header);
          });
          return obj;
        });

        if (parsedData.length === 0) {
          setUploadError("No valid data found in file. Please check the format.");
          return;
        }

        setFileData(parsedData);

        mapDataToBackendFormat(parsedData);
              } catch (error) {
          setUploadError(`Error parsing file: ${error.message}`);
        }
    };

    // Read file as array buffer for SheetJS
    reader.readAsArrayBuffer(file);
  };

  // Map Excel/CSV data to backend format
  const mapDataToBackendFormat = (data) => {
    
    const groupedOrders = {};
    let processedRows = 0;
    let skippedRows = 0;
    
    // More flexible order name validation
    const isValidOrderName = (name) => {
      return name && name.trim() && name.length > 0;
    };

    // Helper function to find column by various possible names
    const findColumn = (row, possibleNames) => {
      for (const name of possibleNames) {
        if (row.hasOwnProperty(name)) {
          return row[name];
        }
      }
      return '';
    };
  
    data.forEach((row, index) => {
      // Check if row is valid
      if (!row || typeof row !== 'object') {
        skippedRows++;
        return;
      }
      
      // Try to find order name using various possible column names
      const orderKey = findColumn(row, ['Name', 'Order Name', 'Order', 'Order ID', 'Name']);
      if (!orderKey || !isValidOrderName(orderKey)) {
        skippedRows++;
        return;
      }
  
      if (!groupedOrders[orderKey]) {
        
        // Construct order only once per ID
        const orderId = findColumn(row, ['Id', 'Order ID', 'ID']) || '';
        groupedOrders[orderKey] = {
          order_id: orderId ? `gid://shopify/Order/${orderId}` : `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          
          order_name: orderKey,
          email: findColumn(row, ['Email', 'Customer Email', 'Email Address']),
          subtotal: parseFloat(findColumn(row, ['Subtotal', 'Sub Total', 'Sub-total']) || 0),
          shipping: parseFloat(findColumn(row, ['Shipping', 'Shipping Cost', 'Shipping Amount']) || 0),
          taxes: parseFloat(findColumn(row, ['Taxes', 'Tax', 'Tax Amount']) || 0),
          total: parseFloat(findColumn(row, ['Total', 'Order Total', 'Total Amount']) || 0),
          discount_amount: parseFloat(findColumn(row, ['Discount Amount', 'Discount', 'Discount Total']) || 0),
          created_at: findColumn(row, ['Created at', 'Created At', 'Created Date', 'Date']) || new Date().toISOString(),
  
          // Billing
          billing_name: findColumn(row, ['Billing Name', 'Billing Name', 'Customer Name']),
          billing_company: findColumn(row, ['Billing Company', 'Company']),
          billing_street: findColumn(row, ['Billing Street', 'Billing Address', 'Street']),
          billing_address1: findColumn(row, ['Billing Address1', 'Billing Address', 'Address 1']),
          billing_address2: findColumn(row, ['Billing Address2', 'Address 2']),
          billing_city: findColumn(row, ['Billing City', 'City']),
          billing_zip: findColumn(row, ['Billing Zip', 'Zip', 'Postal Code']),
          billing_country: findColumn(row, ['Billing Country', 'Country']) || 'IN',
          billing_province_name: findColumn(row, ['Billing Province Name', 'Province', 'State']),
          phone: findColumn(row, ['Billing Phone', 'Phone', 'Phone Number']),
  
          // Shipping
          shipping_name: findColumn(row, ['Shipping Name', 'Shipping Name', 'Customer Name']),
          shipping_company: findColumn(row, ['Shipping Company', 'Company']),
          shipping_street: findColumn(row, ['Shipping Street', 'Shipping Address', 'Street']),
          shipping_address1: findColumn(row, ['Shipping Address1', 'Shipping Address', 'Address 1']),
          shipping_address2: findColumn(row, ['Shipping Address2', 'Address 2']),
          shipping_city: findColumn(row, ['Shipping City', 'City']),
          shipping_zip: findColumn(row, ['Shipping Zip', 'Zip', 'Postal Code']),
          shipping_country: findColumn(row, ['Shipping Country', 'Country']) || 'IN',
          shipping_province_name: findColumn(row, ['Shipping Province Name', 'Province', 'State']),
  
          // Fallback shipping from billing if shipping block missing
          ...(findColumn(row, ['Shipping Address1', 'Shipping Address']) ? {} : {
            shipping_name: findColumn(row, ['Billing Name', 'Customer Name']),
            shipping_company: findColumn(row, ['Billing Company', 'Company']),
            shipping_street: findColumn(row, ['Billing Street', 'Billing Address', 'Street']),
            shipping_address1: findColumn(row, ['Billing Address1', 'Address 1']),
            shipping_address2: findColumn(row, ['Billing Address2', 'Address 2']),
            shipping_city: findColumn(row, ['Billing City', 'City']),
            shipping_zip: findColumn(row, ['Billing Zip', 'Zip', 'Postal Code']),
            shipping_country: findColumn(row, ['Billing Country', 'Country']) || 'IN',
            shipping_province_name: findColumn(row, ['Billing Province Name', 'Province', 'State']),
          }),
  
          payment_method: findColumn(row, ['Payment Method', 'Payment Type']),
          payment_status: findColumn(row, ['Financial Status', 'Payment Status', 'Status']) || 'pending',
          fulfillment_status: findColumn(row, ['Fulfillment Status', 'Fulfillment']) || 'unfulfilled',
  
          tax_1_name: findColumn(row, ['Tax 1 Name', 'Tax Name']),
          tax_1_value: parseFloat(findColumn(row, ['Tax 1 Value', 'Tax Value']) || 0),
          tax_2_name: findColumn(row, ['Tax 2 Name']),
          tax_2_value: parseFloat(findColumn(row, ['Tax 2 Value']) || 0),
  
          payment_id: findColumn(row, ['Payment ID', 'Payment ID']),
          payment_terms_name: findColumn(row, ['Payment Terms Name']),
          next_payment_due_at: findColumn(row, ['Next Payment Due At']),
          payment_references: findColumn(row, ['Payment References']),
  
          notes: findColumn(row, ['Notes', 'Note']),
          note_attributes: findColumn(row, ['Note Attributes']),
  
          line_items: []
        };
      }
  
      // Add line item
      const lineItemName = findColumn(row, ['Lineitem name', 'Product Name', 'Name', 'Title']);
      if (lineItemName) { // Only add line item if there's a product name
        groupedOrders[orderKey].line_items.push({
          lineitem_quantity: parseInt(findColumn(row, ['Lineitem quantity', 'Quantity', 'Qty']) || 1),
          lineitem_name: lineItemName,
          lineitem_sku: findColumn(row, ['Lineitem sku', 'SKU', 'Product SKU']) || '',
          lineitem_price: parseFloat(findColumn(row, ['Lineitem price', 'Price', 'Unit Price']) || 0),
          lineitem_compare_at_price: parseFloat(findColumn(row, ['Lineitem compare at price', 'Compare Price']) || 0),
          lineitem_grams: parseInt(findColumn(row, ['Lineitem grams', 'Weight', 'Grams']) || 0),
          lineitem_requires_shipping: findColumn(row, ['Lineitem requires shipping', 'Requires Shipping']) || 'yes',
          lineitem_taxable: findColumn(row, ['Lineitem taxable', 'Taxable']) || 'yes',
          lineitem_fulfillment_status: findColumn(row, ['Lineitem fulfillment status', 'Fulfillment Status']) || 'fulfilled',
          lineitem_vendor: findColumn(row, ['Vendor', 'Product Vendor']) || '',
          lineitem_gift_card: findColumn(row, ['Lineitem gift_card', 'Gift Card']) || 'no',
        });
      }
      
      processedRows++;
    });
  
    const mapped = Object.values(groupedOrders);

    setMappedData(mapped);
  };
  
  // Handle bulk upload
  const handleBulkUpload = async () => {
    if (!mappedData.length) {
      setUploadError("No data to upload. Please check your file.");
      return;
    }

    setUploadLoading(true);
    setUploadError("");
    setUploadSuccess("");

    try {
      // Ensure we're sending an array of customer order objects
      const customerOrders = mappedData.map(order => {
        // Validate required fields
        if (!order.order_id || !order.order_name) {
          throw new Error(`Invalid order data: Missing required fields (order_id: ${order.order_id}, order_name: ${order.order_name})`);
        }

        return {
          order_id: order.order_id,
          order_name: order.order_name,
          created_at: order.created_at || new Date().toISOString(),
          email: order.email || '',
          billing_name: order.billing_name || '',
          billing_address1: order.billing_address1 || '',
          billing_address2: order.billing_address2 || '',
          billing_city: order.billing_city || '',
          billing_zip: order.billing_zip || '',
          billing_province_name: order.billing_province_name || '',
          billing_country: order.billing_country || 'IN',
          billing_phone: order.billing_phone || '',
          shipping_name: order.shipping_name || order.billing_name || '',
          shipping_address1: order.shipping_address1 || order.billing_address1 || '',
          shipping_address2: order.shipping_address2 || order.billing_address2 || '',
          shipping_city: order.shipping_city || order.billing_city || '',
          shipping_zip: order.shipping_zip || order.billing_zip || '',
          shipping_province_name: order.shipping_province_name || order.billing_province_name || '',
          shipping_country: order.shipping_country || order.billing_country || 'IN',
          shipping_phone: order.shipping_phone || order.billing_phone || '',
          payment_method: order.payment_method || '',
          payment_status: order.payment_status || 'pending',
          payment_id: order.payment_id || '',
          payment_references: order.payment_references || '',
          payment_terms_name: order.payment_terms_name || '',
          next_payment_due_at: order.next_payment_due_at || null,
          subtotal: parseFloat(order.subtotal) || 0,
          shipping: parseFloat(order.shipping) || 0,
          taxes: parseFloat(order.taxes) || 0,
          discount_amount: parseFloat(order.discount_amount) || 0,
          total: parseFloat(order.total) || 0,
          tax_1_name: order.tax_1_name || '',
          tax_1_value: parseFloat(order.tax_1_value) || 0,
          tax_2_name: order.tax_2_name || '',
          tax_2_value: parseFloat(order.tax_2_value) || 0,
          notes: order.notes || '',
          note_attributes: order.note_attributes || '',
          phone: order.phone || order.billing_phone || '',
          fulfillment_status: order.fulfillment_status || 'unfulfilled',
          line_items: Array.isArray(order.line_items) ? order.line_items : []
        };
      });



      // Process in smaller batches to avoid rate limiting
      const batchSize = 50; // Smaller batch size
      const batches = [];
      for (let i = 0; i < customerOrders.length; i += batchSize) {
        batches.push(customerOrders.slice(i, i + batchSize));
      }



      let totalProcessed = 0;
      let totalSuccess = 0;
      let totalFailed = 0;
      const errors = [];

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];


        let retryCount = 0;
        const maxRetries = 3;
        let success = false;

        while (retryCount < maxRetries && !success) {
          try {
            const response = await fetch(`${config.api.baseURL}/api/customer-orders/bulk`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(batch),
            });

            if (!response.ok) {
              const errorText = await response.text();
              
              // Check if it's a rate limit error
              if (response.status === 429) {
                const errorData = JSON.parse(errorText);
                const retryAfter = errorData.retryAfter || 60;
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                retryCount++;
                continue;
              }
              
              throw new Error(`Batch ${i + 1} failed: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            
            if (result.success) {
              totalProcessed += result.total_processed || batch.length;
              totalSuccess += result.successful_inserts || batch.length;
              totalFailed += result.failed_inserts || 0;
              
              if (result.errors && result.errors.length > 0) {
                errors.push(...result.errors);
              }
              
  
              success = true;
            } else {
              throw new Error(result.error || `Batch ${i + 1} failed`);
            }

          } catch (error) {
            if (retryCount === maxRetries - 1) {
              // Final attempt failed
              errors.push({
                batch: i + 1,
                error: error.message
              });
              totalFailed += batch.length;
            } else {
              // Wait before retry with exponential backoff
              const waitTime = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
              await new Promise(resolve => setTimeout(resolve, waitTime));
              retryCount++;
            }
          }
        }

        // Add delay between batches to avoid rate limiting
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        }
      }

      // Show results
      if (totalSuccess > 0) {
        setUploadSuccess(`Successfully uploaded ${totalSuccess} orders! Total processed: ${totalProcessed}, Failed: ${totalFailed}${errors.length > 0 ? `, Errors: ${errors.length}` : ''}`);
      } else {
        throw new Error(`All batches failed. Total failed: ${totalFailed}`);
      }
      
      setUploadModalOpen(false);
      setFileData(null);
      setMappedData([]);
      
      // Refresh the orders list
      fetchOrders(currentPage, searchTerm);
    } catch (error) {
      setUploadError(`Failed to upload data: ${error.message}`);
    } finally {
      setUploadLoading(false);
    }
  };

  // Close upload modal
  const closeUploadModal = () => {
    setUploadModalOpen(false);
    setFileData(null);
    setMappedData([]);
    setUploadError("");
    setUploadSuccess("");
  };

  // Handle order selection
  const handleOrderSelection = (orderId) => {
    const newSelectedOrders = new Set(selectedOrders);
    if (newSelectedOrders.has(orderId)) {
      newSelectedOrders.delete(orderId);
    } else {
      newSelectedOrders.add(orderId);
    }
    setSelectedOrders(newSelectedOrders);
    
    // Update select all state based on current page
    const currentPageOrderIds = orders
      .map(order => order.order_id);
    const selectedCurrentPage = currentPageOrderIds.every(id => newSelectedOrders.has(id));
    setSelectAll(selectedCurrentPage && currentPageOrderIds.length > 0);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectAll) {
      // Deselect only current page orders
      const newSelectedOrders = new Set(selectedOrders);
      orders.forEach(order => {
        newSelectedOrders.delete(order.order_id);
      });
      setSelectedOrders(newSelectedOrders);
      setSelectAll(false);
    } else {
      // Select all current page orders (including cancelled/voided)
      const newSelectedOrders = new Set(selectedOrders);
      orders.forEach(order => {
        newSelectedOrders.add(order.order_id);
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

  // Download selected orders
  const downloadSelectedOrders = async () => {
    if (selectedOrders.size === 0) {
      return;
    }

    setDownloading(true);
    try {
      const selectedOrderData = orders.filter(order => selectedOrders.has(order.order_id));
      
      // Find the maximum number of products across all orders to determine column count
      const maxProducts = Math.max(...selectedOrderData.map(order => 
        order.line_items?.length || 1
      ));
      
      // Create dynamic headers for products and SKUs
      const productHeaders = [];
      const skuHeaders = [];
      for (let i = 1; i <= maxProducts; i++) {
        productHeaders.push(`Product${i}`);
        skuHeaders.push(`SKU${i}`);
      }
      
      // Create CSV content with dynamic columns
      const csvContent = [
        ['ORDER NO', 'ORDER DATE', 'MONTH', 'BRAND', 'CUSTOMER NAME', 'ADDRESS', 'PINCODE', 'STATE', 'PHONE NUMBER', 'EMAIL ID', 'AWB NUMBER', ...productHeaders, ...skuHeaders, 'AMOUNT', 'COUNT OF ITEMS', 'PAYMENT MODE'],
        ...selectedOrderData.map(order => {
          // Use order_name as ORDER NO
          const orderNo = order.order_name || 'N/A';
          
          // Format order date
          const orderDate = new Date(order.created_at);
          const formattedDate = orderDate.toISOString().split('T')[0]; // YYYY-MM-DD format
          const month = orderDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }); // Jul'25 format
          
          // Format address
          const address = [
            order.shipping_address1,
            order.shipping_address2,
            order.shipping_city,
            order.shipping_province_name,
            order.shipping_country
          ].filter(Boolean).join(' ');
          
          // Get product names and SKUs in separate arrays
          const lineItems = order.line_items || [];
          const productNames = [];
          const productSkus = [];
          
          // Fill product data
          for (let i = 0; i < maxProducts; i++) {
            if (i < lineItems.length) {
              productNames.push(lineItems[i].lineitem_name || 'N/A');
              productSkus.push(lineItems[i].lineitem_sku || 'N/A');
            } else {
              productNames.push(''); // Empty for orders with fewer products
              productSkus.push('');
            }
          }
          
          // Get total quantity
          const totalQuantity = getTotalQuantity(order.line_items);
          
          // Format payment mode
          const paymentMode = (() => {
            const method = order.payment_method;
            
            // If payment method is null/empty, return "null"
            if (!method || method.trim() === '') {
              return 'null';
            }
            
            // Check if it contains Razorpay, UPI, Cards, Wallets, or NB
            const onlinePaymentKeywords = ['razorpay', 'upi', 'cards', 'wallets', 'nb'];
            const isOnlinePayment = onlinePaymentKeywords.some(keyword => 
              method.toLowerCase().includes(keyword)
            );
            
            if (isOnlinePayment) {
              return 'Online Payment';
            }
            
            // For other cases, return the original method or default
            return method || 'null';
          })();
          
          return [
            orderNo,
            formattedDate,
            month,
            'TILTING HEADS',
            order.shipping_name || 'N/A',
            address,
            order.shipping_zip || 'N/A',
            order.shipping_province_name || 'N/A',
            formatPhoneNumber(order.phone),
            order.email || 'NA',
            order.awb_number || 'N/A',
            ...productNames,
            ...productSkus,
            parseFloat(order.total || 0).toFixed(0),
            totalQuantity,
            paymentMode
          ];
        })
      ].map(row => row.map(cell => {
        // Properly escape quotes and handle special characters
        const cellStr = String(cell || '');
        return `"${cellStr.replace(/"/g, '""')}"`;
      }).join(',')).join('\n');

      // Add BOM (Byte Order Mark) for proper UTF-8 encoding recognition
      const BOM = '\uFEFF';
      const csvWithBOM = BOM + csvContent;
      
      // Create and download file
      const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `selected-customer-orders-report-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      // Download failed silently
    } finally {
      setDownloading(false);
    }
  };

  // Print invoice function
  const printInvoice = () => {
    if (!selectedOrder) return;
    
    setPrinting(true);
    
    // Create print content
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${selectedOrder.order.order_name}</title>
        <style>
          * { box-sizing: border-box; }
          body { 
            margin: 0; 
            padding: 0; 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #333;
            line-height: 1.6;
          }
          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            background: white;
          }
          .invoice-header {
            border-bottom: 3px solid #2c3e50;
            padding-bottom: 30px;
            margin-bottom: 40px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .company-info {
            flex: 1;
          }
          .company-logo {
            font-size: 32px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
            position: relative;
            display: inline-block;
          }
          .company-logo::after {
            content: '🐕';
            font-size: 24px;
            margin-left: 10px;
            animation: bounce 2s infinite;
          }
          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
            60% { transform: translateY(-5px); }
          }
          .company-tagline {
            color: #7f8c8d;
            font-size: 14px;
            margin-bottom: 20px;
          }
          .invoice-details {
            text-align: right;
            flex: 1;
          }
          .invoice-title {
            font-size: 36px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
          }
          .invoice-number {
            font-size: 18px;
            color: #7f8c8d;
            margin-bottom: 5px;
          }
          .invoice-date {
            font-size: 14px;
            color: #7f8c8d;
          }
          .section {
            margin: 30px 0;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #ecf0f1;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
          }
          .info-card {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            padding: 20px;
            border-radius: 12px;
            border-left: 4px solid #3498db;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }
          .info-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(0,0,0,0.15);
          }
          .info-card h4 {
            margin: 0 0 15px 0;
            color: #2c3e50;
            font-size: 16px;
          }
          .info-item {
            margin-bottom: 8px;
            font-size: 14px;
          }
          .info-label {
            font-weight: bold;
            color: #7f8c8d;
            display: inline-block;
            width: 80px;
          }
          .products-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
          }
          .products-table th {
            background: #2c3e50;
            color: white;
            padding: 15px 12px;
            text-align: left;
            font-weight: 600;
          }
          .products-table td {
            padding: 12px;
            border-bottom: 1px solid #ecf0f1;
          }
          .products-table tr:nth-child(even) {
            background: #f8f9fa;
          }
          .products-table tr:hover {
            background: #ecf0f1;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-bold { font-weight: bold; }
          .summary-table {
            width: 350px;
            margin-left: auto;
            border-collapse: collapse;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
          }
          .summary-table td {
            padding: 12px 15px;
            border-bottom: 1px solid #ecf0f1;
          }
          .summary-table .total-row {
            background: #2c3e50;
            color: white;
            font-weight: bold;
            font-size: 18px;
          }
          .summary-table .total-row td {
            border-bottom: none;
          }
          .status-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 25px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
          }
          .status-badge:hover {
            transform: scale(1.05);
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
          }
          .status-paid {
            background: #27ae60;
            color: white;
          }
          .status-pending {
            background: #f39c12;
            color: white;
          }
          .status-fulfilled {
            background: #27ae60;
            color: white;
          }
          .status-unfulfilled {
            background: #95a5a6;
            color: white;
          }
          .status-cancelled {
            background: #e74c3c;
            color: white;
          }
          .footer {
            margin-top: 50px;
            padding-top: 30px;
            border-top: 2px solid #ecf0f1;
            text-align: center;
            color: #7f8c8d;
          }
          .footer h4 {
            color: #2c3e50;
            margin-bottom: 10px;
          }
          @media print {
            body { margin: 0; }
            .invoice-container { padding: 20px; }
            .products-table { box-shadow: none; }
            .summary-table { box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="invoice-header">
            <div class="company-info">
              <div class="company-logo">Tilting Heads</div>
              <div class="company-tagline">Premium Pet Products & Services</div>
              <div style="margin-top: 20px;">
                <div style="font-size: 14px; color: #7f8c8d;">Address: B1/D4, Mohan Cooperative Industrial Estate</div>
                <div style="font-size: 14px; color: #7f8c8d;">New Delhi - 110044, India</div>
                <div style="font-size: 14px; color: #7f8c8d;">Phone: +91 98188 56823</div>
                <div style="font-size: 14px; color: #7f8c8d;">Email: woof@tiltingheads.com</div>
              </div>
            </div>
            <div class="invoice-details">
              <div class="invoice-title">INVOICE</div>
              <div class="invoice-number">Order: ${selectedOrder.order.order_name}</div>
              <div class="invoice-date">Date: ${new Date(selectedOrder.order.created_at).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</div>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-card">
              <h4>Bill To</h4>
              <div class="info-item">
                <span class="info-label">Name:</span> ${selectedOrder.order.shipping_name}
              </div>
              ${selectedOrder.order.shipping_company ? `
              <div class="info-item">
                <span class="info-label">Company:</span> ${selectedOrder.order.shipping_company}
              </div>
              ` : ''}
              <div class="info-item">
                <span class="info-label">Email:</span> ${selectedOrder.order.email || 'N/A'}
              </div>
              <div class="info-item">
                <span class="info-label">Phone:</span> ${selectedOrder.order.phone || 'N/A'}
              </div>
            </div>
            <div class="info-card">
              <h4>Ship To</h4>
              <div class="info-item">
                <span class="info-label">Name:</span> ${selectedOrder.order.shipping_name}
              </div>
              ${selectedOrder.order.shipping_company ? `
              <div class="info-item">
                <span class="info-label">Company:</span> ${selectedOrder.order.shipping_company}
              </div>
              ` : ''}
              <div class="info-item">
                <span class="info-label">Address:</span> ${selectedOrder.order.shipping_address1}
              </div>
              ${selectedOrder.order.shipping_address2 ? `
              <div class="info-item">
                <span class="info-label"></span> ${selectedOrder.order.shipping_address2}
              </div>
              ` : ''}
              <div class="info-item">
                <span class="info-label">City:</span> ${selectedOrder.order.shipping_city}, ${selectedOrder.order.shipping_province_name} ${selectedOrder.order.shipping_zip}
              </div>
              <div class="info-item">
                <span class="info-label">Country:</span> ${selectedOrder.order.shipping_country}
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Products & Services</div>
            <table class="products-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th class="text-center">SKU</th>
                  <th class="text-center">Qty</th>
                  <th class="text-right">Unit Price</th>
                  <th class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${selectedOrder.products.map(product => `
                  <tr>
                    <td class="text-bold">${product.name}</td>
                    <td class="text-center">${product.sku}</td>
                    <td class="text-center">${product.quantity}</td>
                    <td class="text-right">₹${parseFloat(product.price).toFixed(2)}</td>
                    <td class="text-right text-bold">₹${parseFloat(product.total).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <table class="summary-table">
              <tbody>
                <tr>
                  <td class="text-bold">Subtotal:</td>
                  <td class="text-right">₹${parseFloat(selectedOrder.order.subtotal || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td class="text-bold">Taxes:</td>
                  <td class="text-right">₹${parseFloat(selectedOrder.order.taxes || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td class="text-bold">Shipping:</td>
                  <td class="text-right">₹${parseFloat(selectedOrder.order.shipping || 0).toFixed(2)}</td>
                </tr>
                ${selectedOrder.order.discount_amount > 0 ? `
                <tr>
                  <td class="text-bold">Discount:</td>
                  <td class="text-right" style="color: #e74c3c;">-₹${parseFloat(selectedOrder.order.discount_amount).toFixed(2)}</td>
                </tr>
                ` : ''}
                <tr class="total-row">
                  <td class="text-bold">TOTAL:</td>
                  <td class="text-right">₹${parseFloat(selectedOrder.order.total || 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Payment Information</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
              <div>
                <div class="info-item">
                  <span class="info-label">Method:</span> ${selectedOrder.order.payment_method || 'N/A'}
                </div>
                                 <div class="info-item">
                   <span class="info-label">Status:</span> 
                   <span class="status-badge ${selectedOrder.order.payment_status === 'paid' ? 'status-paid' : selectedOrder.order.payment_status === 'voided' ? 'status-cancelled' : 'status-pending'}">
                     ${selectedOrder.order.payment_status === 'paid' ? 'Paid' : selectedOrder.order.payment_status === 'voided' ? 'Cancelled' : 'Pending'}
                   </span>
                 </div>
              </div>
              <div>
                <div class="info-item">
                  <span class="info-label">Fulfillment:</span> 
                  <span class="status-badge ${selectedOrder.order.fulfillment_status === 'fulfilled' ? 'status-fulfilled' : 'status-unfulfilled'}">
                    ${selectedOrder.order.fulfillment_status === 'fulfilled' ? 'Fulfilled' : 'Unfulfilled'}
                  </span>
                </div>
                <div class="info-item">
                  <span class="info-label">Order ID:</span> ${selectedOrder.order.order_id}
                </div>
              </div>
            </div>
          </div>

          <div class="footer">
            <h4>Thank you for choosing Tilting Heads!</h4>
            <p>We appreciate your trust in our premium pet products and services.</p>
            <p style="font-size: 12px; margin-top: 20px;">
              For any questions about this invoice, please contact us at woof@tiltingheads.com
            </p>
            <p style="font-size: 11px; color: #95a5a6; margin-top: 10px;">
              Tilting Heads - Making tails wag since 2020
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
      setPrinting(false);
    };
  };

  return (
    <div className='card basic-data-table'>
      <div className='card-header d-flex align-items-center justify-content-between flex-wrap gap-3'>
        <h5 className='card-title mb-0'>Customer Orders</h5>
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
          
          {/* Download Selected Button - Only show when orders are selected */}
          {selectedOrders.size > 0 && (
            <button
              className="btn btn-success btn-sm d-flex align-items-center gap-2"
              onClick={downloadSelectedOrders}
              disabled={downloading}
              title={`Download ${selectedOrders.size} selected order${selectedOrders.size > 1 ? 's' : ''} in report format`}
            >
              {downloading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status"></span>
                  <span className="d-none d-sm-inline">Downloading...</span>
                </>
              ) : (
                <>
                  <Icon icon="lucide:download" width="16" height="16" />
                  <span className="d-none d-sm-inline">Download ({selectedOrders.size})</span>
                </>
              )}
            </button>
          )}
          
          <button
            className="btn btn-primary btn-sm d-flex align-items-center gap-2"
            onClick={() => setUploadModalOpen(true)}
            title="Bulk Upload Customers"
          >
            <Icon icon="lucide:plus" width="16" height="16" />
            <span className="d-none d-sm-inline">Upload</span>
          </button>
        </div>
      </div>
      
      <div className='card-body p-0'>
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3 text-muted">Loading customer orders...</p>
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
                    <th className="border-end px-4 py-3 fw-semibold text-center bg-light">Qty</th>
                    <th className="border-end px-4 py-3 fw-semibold text-end bg-light">Total</th>
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
                    orders.map((order, index) => (
                      <tr key={order.order_id || index} className={`border-bottom ${selectedOrders.has(order.order_id) ? 'table-active' : ''}`}>
                        <td className="border-end px-4 py-3 align-middle">
                          <div className="form-check d-flex justify-content-center">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={selectedOrders.has(order.order_id)}
                              onChange={() => handleOrderSelection(order.order_id)}
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
                            {/* {order.shipping_company && (
                              <small className="text-muted">{order.shipping_company}</small>
                            )} */}
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
                          <span className="text-break">{formatPhoneNumber(order.phone)}</span>
                        </td>
                        <td className="border-end px-4 py-3 text-center align-middle">
                          <span className="badge bg-primary-subtle text-primary rounded-pill px-3 py-2">
                            {getTotalQuantity(order.line_items)}
                          </span>
                        </td>
                        <td className="border-end px-4 py-3 text-end align-middle">
                          <div className="d-flex flex-column align-items-end">
                            <span className="fw-bold fs-6">
                              ₹{parseFloat(order.total || 0).toFixed(2)}
                            </span>
                            {order.payment_status === 'voided' && (
                              <span className="badge bg-danger-subtle text-danger small mt-1">
                                <Icon icon="lucide:x-circle" className="me-1" width="10" height="10" />
                                Cancelled
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-center align-middle">
                          <button
                            className="btn btn-sm btn-outline-primary rounded-pill px-3"
                            onClick={() => handleViewProducts(order)}
                            title="View Products"
                          >
                            <Icon icon="lucide:package" width="14" height="14" />
                            <span className="ms-1 d-none d-sm-inline">Products</span>
                          </button>
                        </td>
                      </tr>
                    ))
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

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Bulk Upload Customers</h5>
                <button type="button" className="btn-close" onClick={closeUploadModal}></button>
              </div>
              <div className="modal-body">
                {uploadSuccess && (
                  <div className="alert alert-success" role="alert">
                    <Icon icon="lucide:check-circle" className="me-2" />
                    {uploadSuccess}
                  </div>
                )}
                
                {uploadError && (
                  <div className="alert alert-danger" role="alert">
                    <Icon icon="lucide:alert-circle" className="me-2" />
                    {uploadError}
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label">Upload CSV File</label>
                  <input
                    type="file"
                    className="form-control"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                  />
                  <div className="form-text">
                    Upload a Shopify orders export file (CSV, Excel). The system will automatically map columns like Name, Email, Financial Status, etc.
                  </div>
                  {fileData && (
                    <button
                      type="button"
                      className="btn btn-outline-info btn-sm mt-2"
                      onClick={() => {
                        if (fileData.length > 0) {
                          // Show columns info in a more user-friendly way
                          const columns = Object.keys(fileData[0]);
                          setUploadSuccess(`File loaded successfully! Available columns: ${columns.join(', ')}`);
                        }
                      }}
                    >
                      <Icon icon="lucide:info" width="14" height="14" className="me-1" />
                      View Columns
                    </button>
                  )}
                </div>



                {mappedData.length > 0 && (
                  <div className="mb-3">
                    <h6>Mapped Orders Preview ({mappedData.length} orders)</h6>
                    <div className="table-responsive" style={{ maxHeight: '300px' }}>
                      <table className="table table-sm table-bordered">
                        <thead className="table-light">
                          <tr>
                            <th className="small">Order Name</th>
                            <th className="small">Email</th>
                            <th className="small">Total</th>
                            <th className="small">Items</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mappedData.slice(0, 5).map((order, index) => (
                            <tr key={index}>
                              <td className="small">{order.order_name}</td>
                              <td className="small">{order.email}</td>
                              <td className="small">₹{parseFloat(order.total || 0).toFixed(2)}</td>
                              <td className="small">{order.line_items?.length || 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {mappedData.length > 5 && (
                      <small className="text-muted">Showing first 5 orders of {mappedData.length} total orders</small>
                    )}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeUploadModal}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleBulkUpload}
                  disabled={uploadLoading || !mappedData.length}
                >
                  {uploadLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Uploading...
                    </>
                  ) : (
                    'Upload Data'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Details Modal */}
      {productModalOpen && selectedOrder && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <Icon icon="lucide:package" className="me-2" />
                  Order Details - {selectedOrder.order.order_name}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => {
                    setProductModalOpen(false);
                    setSelectedOrder(null);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                {/* Order Summary */}
                <div className="row mb-4">
                  <div className="col-md-6">
                    <h6 className="text-muted mb-3">Order Information</h6>
                    <div className="d-flex flex-column gap-2">
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Order ID:</span>
                        <span className="fw-medium">{selectedOrder.order.order_name}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Customer:</span>
                        <span className="fw-medium">{selectedOrder.order.shipping_name}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Email:</span>
                        <span className="fw-medium">{selectedOrder.order.email || 'N/A'}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Phone:</span>
                        <span className="fw-medium">{formatPhoneNumber(selectedOrder.order.phone)}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Date:</span>
                        <span className="fw-medium">
                          {new Date(selectedOrder.order.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-muted mb-3">Payment Summary</h6>
                    <div className="d-flex flex-column gap-2">
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Subtotal:</span>
                        <span className="fw-medium">₹{parseFloat(selectedOrder.order.subtotal || 0).toFixed(2)}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Taxes:</span>
                        <span className="fw-medium">₹{parseFloat(selectedOrder.order.taxes || 0).toFixed(2)}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Shipping:</span>
                        <span className="fw-medium">₹{parseFloat(selectedOrder.order.shipping || 0).toFixed(2)}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Discount:</span>
                        <span className="fw-medium text-danger">-₹{parseFloat(selectedOrder.order.discount_amount || 0).toFixed(2)}</span>
                      </div>
                      <hr className="my-2" />
                      <div className="d-flex justify-content-between">
                        <span className="fw-bold">Total:</span>
                        <span className="fw-bold fs-5 text-primary">₹{parseFloat(selectedOrder.order.total || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Products Table */}
                <div className="mb-3">
                  <h6 className="text-muted mb-3">Products</h6>
                  <div className="table-responsive">
                    <table className="table table-sm table-bordered">
                      <thead className="table-light">
                        <tr>
                          <th className="small">Product</th>
                          <th className="small text-center d-none d-md-table-cell">SKU</th>
                          <th className="small text-center">Qty</th>
                          <th className="small text-end d-none d-sm-table-cell">Price</th>
                          <th className="small text-end">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.products.map((product, index) => (
                          <tr key={index}>
                            <td className="small">
                              <div className="d-flex align-items-center">
                                <div className="bg-light rounded-circle d-flex align-items-center justify-content-center me-2" 
                                     style={{ width: '32px', height: '32px' }}>
                                  <Icon icon="lucide:package" width="16" height="16" className="text-muted" />
                                </div>
                                <div className="flex-grow-1">
                                  <div className="fw-medium">{product.name}</div>
                                  <div className="text-muted small d-md-none">
                                    SKU: {product.sku}
                                  </div>
                                  {product.vendor && product.vendor !== 'N/A' && (
                                    <div className="text-muted small">Vendor: {product.vendor}</div>
                                  )}
                                  <div className="d-sm-none">
                                    <div className="text-muted small">
                                      Price: ₹{parseFloat(product.price).toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="small text-center d-none d-md-table-cell">
                              <span className="badge bg-light text-dark">{product.sku}</span>
                            </td>
                            <td className="small text-center">
                              <span className="badge bg-primary rounded-pill">{product.quantity}</span>
                            </td>
                            <td className="small text-end d-none d-sm-table-cell">
                              ₹{parseFloat(product.price).toFixed(2)}
                            </td>
                            <td className="small text-end fw-medium">₹{parseFloat(product.total).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="mb-3">
                  <h6 className="text-muted mb-3">Shipping Address</h6>
                  <div className="card bg-light">
                    <div className="card-body py-2">
                      <div className="d-flex align-items-start">
                        <Icon icon="lucide:map-pin" className="me-2 mt-1 text-muted" width="16" height="16" />
                        <div>
                          <div className="fw-medium">{selectedOrder.order.shipping_name}</div>
                          {selectedOrder.order.shipping_company && (
                            <div className="text-muted small">{selectedOrder.order.shipping_company}</div>
                          )}
                          <div className="text-muted small">
                            {selectedOrder.order.shipping_address1}
                            {selectedOrder.order.shipping_address2 && (
                              <>, {selectedOrder.order.shipping_address2}</>
                            )}
                          </div>
                          <div className="text-muted small">
                            {selectedOrder.order.shipping_city}, {selectedOrder.order.shipping_province_name} {selectedOrder.order.shipping_zip}
                          </div>
                          <div className="text-muted small">{selectedOrder.order.shipping_country}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Status */}
                <div className="row">
                  <div className="col-md-6">
                                          <div className="d-flex align-items-center gap-2 mb-2">
                        <span className="text-muted small">Payment Status:</span>
                        {(() => {
                          const status = getStatusBadge(selectedOrder.order);
                          return (
                            <span className={`badge ${status.className}`}>
                              <Icon icon={status.icon} className="me-1" width="12" height="12" />
                              {status.text}
                            </span>
                          );
                        })()}
                      </div>
                    <div className="d-flex align-items-center gap-2">
                      <span className="text-muted small">Fulfillment:</span>
                      <span className={`badge ${selectedOrder.order.fulfillment_status === 'fulfilled' ? 'bg-success' : 'bg-secondary'}`}>
                        {selectedOrder.order.fulfillment_status === 'fulfilled' ? 'Fulfilled' : 'Unfulfilled'}
                      </span>
                    </div>
                  </div>
                                      <div className="col-md-6 text-end">
                      <div className="text-muted small">Payment Method</div>
                      <div className="fw-medium">{selectedOrder.order.payment_method || 'N/A'}</div>
                      {selectedOrder.order.payment_status === 'voided' && (
                        <div className="mt-2">
                          <span className="badge bg-danger-subtle text-danger small">
                            <Icon icon="lucide:x-circle" className="me-1" width="10" height="10" />
                            Order Cancelled
                          </span>
                        </div>
                      )}
                    </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setProductModalOpen(false);
                    setSelectedOrder(null);
                  }}
                >
                  Close
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={printInvoice}
                  disabled={printing}
                >
                  {printing ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Printing...
                    </>
                  ) : (
                    <>
                      <Icon icon="lucide:printer" className="me-2" />
                      Print Invoice
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default CustomerLayer;

