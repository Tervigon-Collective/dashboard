# 📊 Complete Sidebar CRUD Operations Report

## Overview

This document provides a comprehensive analysis of all sidebar items in the dashboard and their CRUD (Create, Read, Update, Delete) operations.

---

## 🎯 **Active Sidebars with Permissions**

### 1. **Dashboard** (`dashboard`)

**Route:** `/` (Home) and `/historical-data`

**Component:** `DashBoardLayerOne.jsx`

**CRUD Operations:**

- ✅ **READ** - View analytics, charts, and reports
- ❌ **CREATE** - No create functionality
- ❌ **UPDATE** - No update functionality
- ❌ **DELETE** - No delete functionality

**Features:**

- View sales analytics
- View profit metrics
- View historical data
- Chart visualizations
- Date range filters

**Access Level:** Manager, Admin, Super Admin

---

### 2. **SKU List** (`skuList`)

**Route:** `/Sku-List`

**Component:** `SkuTableDataLayer.jsx`

**CRUD Operations:**

- ✅ **READ** - View all SKU data
- ❌ **CREATE** - No create functionality (read-only)
- ❌ **UPDATE** - No update functionality (read-only)
- ❌ **DELETE** - No delete functionality (read-only)

**Features:**

- Search SKU data
- Filter by various criteria
- Pagination
- Export/View SKU details
- Display product information

**Access Level:** Manager, Admin, Super Admin

**Note:** This is a **READ-ONLY** sidebar - displays data but doesn't allow modifications

---

### 3. **Product Spend Summary** (`productSpendSummary`)

**Route:** `/product-spend-summary`

**Component:** `ProductSpendSummaryLayer.jsx`

**CRUD Operations:**

- ✅ **READ** - View spending analytics per product
- ❌ **CREATE** - No create functionality (analytics only)
- ❌ **UPDATE** - No update functionality (analytics only)
- ❌ **DELETE** - No delete functionality (analytics only)

**Features:**

- View product-wise ad spend
- View sales data
- Date range selection
- Filter by product
- Analytics and reports

**Access Level:** Manager, Admin, Super Admin

**Note:** This is a **READ-ONLY/ANALYTICS** sidebar - displays aggregated data

---

### 4. **Entity Report** (`entityReport`)

**Route:** `/entity-report`

**Component:** `EntityReportLayer.jsx`

**CRUD Operations:**

- ✅ **READ** - View Google Ads, Meta Ads, and Organic attribution data
- ❌ **CREATE** - No create functionality (report viewer)
- ❌ **UPDATE** - No update functionality (report viewer)
- ❌ **DELETE** - No delete functionality (report viewer)

**Features:**

- View Google Ads data
- View Meta Ads data
- View Organic traffic attribution
- Date range filtering
- Export reports

**Access Level:** Manager, Admin, Super Admin

**Note:** This is a **READ-ONLY/REPORTING** sidebar - displays entity attribution reports

---

### 5. **Procurement** (`procurement`)

**Route:** `/procurement`

**Component:** `ProcurementTableDataLayer.jsx`

**CRUD Operations:**

- ✅ **CREATE** - Add new products with variants and vendors
- ✅ **READ** - View all products, variants, and vendor information
- ✅ **UPDATE** - Edit products, update status, modify variants
- ✅ **DELETE** - Delete products

**Features:**

- **CREATE:**

  - Add new products (`/procurement/add-products`)
  - Add product variants
  - Add vendor information
  - Upload product images

- **READ:**

  - View product list with variants
  - Search products
  - Filter by category, status
  - View product details modal
  - View product images
  - Pagination

- **UPDATE:**

  - Edit product details (`/procurement/edit-products/[id]`)
  - Update product status (Active/Inactive)
  - Modify variants
  - Update pricing (MRP, COGS)
  - Change vendor information

- **DELETE:**
  - Delete products with confirmation
  - Remove variants
  - Remove vendor associations

**Access Level:** User, Manager, Admin, Super Admin

**Note:** This is a **FULL CRUD** sidebar with complete product management capabilities

---

### 6. **Customer Data** (`customerData`)

**Route:** `/customer-data`

**Component:** `CustomerLayer.jsx`

**CRUD Operations:**

- ✅ **READ** - View all customer orders and information
- ❌ **CREATE** - No create functionality (data comes from Shopify)
- ❌ **UPDATE** - No update functionality (synced from Shopify)
- ❌ **DELETE** - No delete functionality (synced from Shopify)

**Features:**

- View customer orders
- Search by email, phone, name, order number
- Filter by date range
- View order details
- View customer information
- Pagination
- Universal search across all fields

**Access Level:** User, Manager, Admin, Super Admin

**Note:** This is a **READ-ONLY** sidebar - data is synced from Shopify API, modifications are not allowed

---

### 7. **Shipping** (`shipping`)

**Route:** `/shipping`

**Component:** `ShippingDashboard.jsx`

**CRUD Operations:**

- ✅ **READ** - View shipping orders and tracking information
- ✅ **CREATE** - Generate waybills for orders
- ✅ **UPDATE** - Update tracking information (via API calls)
- ❌ **DELETE** - No delete functionality

**Features:**

- **READ:**

  - View all shipping orders
  - Search by email, phone, name, order name
  - View order details
  - View tracking history
  - View AWB (Air Waybill) numbers
  - Check BlueDart service availability

- **CREATE:**

  - Generate waybills (single)
  - Generate bulk waybills (for multiple orders)
  - Create shipping labels

- **UPDATE:**
  - Track shipments
  - Update tracking status (via courier API)
  - Fetch latest tracking information

**Access Level:** User, Manager, Admin, Super Admin

**Note:** This is a **LIMITED CRUD** sidebar - can create waybills and read/track shipments, but cannot directly modify order data

---

### 8. **User Management** (`userManagement`)

**Route:** `/user-management`, `/create-user`, `/assign-role`, `/user-role-info`

**Component:** `UserRoleManager.jsx`, `CreateUserLayer.jsx`

**CRUD Operations:**

- ✅ **CREATE** - Create new users
- ✅ **READ** - View all users and their roles
- ✅ **UPDATE** - Update user roles and permissions
- ✅ **DELETE** - Delete user accounts

**Features:**

- **CREATE:**

  - Create new users (`/create-user`)
  - Send email verification
  - Assign initial roles
  - Set sidebar permissions

- **READ:**

  - View all users (`/user-management`)
  - Filter by role
  - Search users
  - View user details
  - View role information (`/user-role-info`)

- **UPDATE:**

  - Edit user roles (`/assign-role`)
  - Update sidebar permissions (granular control)
  - Modify user status

- **DELETE:**
  - Delete user accounts
  - Confirmation modal before deletion

**Access Level:** Admin, Super Admin

**Note:** This is a **FULL CRUD** sidebar with complete user management capabilities

---

### 9. **System Settings** (`systemSettings`)

**Route:** Not implemented yet

**Component:** N/A

**CRUD Operations:**

- ⏳ **Future Implementation**

**Access Level:** Super Admin only

**Note:** Placeholder for future system configuration features

---

## 📈 **Summary by CRUD Type**

### **Full CRUD (Create + Read + Update + Delete):**

1. ✅ **Procurement** - Complete product management
2. ✅ **User Management** - Complete user administration

### **Limited CRUD (Read + Create/Update):**

1. ⚠️ **Shipping** - Read orders + Generate waybills + Track shipments

### **Read-Only:**

1. 📖 **Dashboard** - Analytics and reports
2. 📖 **SKU List** - Product SKU viewer
3. 📖 **Product Spend Summary** - Spending analytics
4. 📖 **Entity Report** - Attribution reports
5. 📖 **Customer Data** - Shopify order viewer

### **Not Implemented:**

1. ⏳ **System Settings** - Future feature

---

## 🎨 **Detailed Functionality Matrix**

| Sidebar               | Create   | Read   | Update   | Delete | Export | Search | Filter | Pagination |
| --------------------- | -------- | ------ | -------- | ------ | ------ | ------ | ------ | ---------- |
| Dashboard             | ❌       | ✅     | ❌       | ❌     | ❌     | ❌     | ✅     | ❌         |
| SKU List              | ❌       | ✅     | ❌       | ❌     | ❌     | ✅     | ✅     | ✅         |
| Product Spend Summary | ❌       | ✅     | ❌       | ❌     | ❌     | ✅     | ✅     | ✅         |
| Entity Report         | ❌       | ✅     | ❌       | ❌     | ✅     | ✅     | ✅     | ✅         |
| **Procurement**       | **✅**   | **✅** | **✅**   | **✅** | ❌     | ✅     | ✅     | ✅         |
| Customer Data         | ❌       | ✅     | ❌       | ❌     | ❌     | ✅     | ✅     | ✅         |
| **Shipping**          | **✅\*** | **✅** | **✅\*** | ❌     | ✅     | ✅     | ✅     | ✅         |
| **User Management**   | **✅**   | **✅** | **✅**   | **✅** | ❌     | ✅     | ✅     | ✅         |
| System Settings       | ⏳       | ⏳     | ⏳       | ⏳     | ⏳     | ⏳     | ⏳     | ⏳         |

**Legend:**

- ✅ = Available
- ❌ = Not Available
- ⏳ = Planned/Future
- **Bold** = Full or significant CRUD operations
- - = Limited (Waybill generation only)

---

## 🔐 **Access Control Summary**

### **User Role:**

- ✅ Procurement (Full CRUD)
- ✅ Customer Data (Read)
- ✅ Shipping (Read + Waybill Generation)

### **Manager Role:**

- ✅ Dashboard (Read)
- ✅ SKU List (Read)
- ✅ Product Spend Summary (Read)
- ✅ Entity Report (Read)
- ✅ Procurement (Full CRUD)
- ✅ Customer Data (Read)
- ✅ Shipping (Read + Waybill Generation)

### **Admin Role:**

- ✅ All Manager permissions +
- ✅ User Management (Full CRUD)

### **Super Admin Role:**

- ✅ All permissions (cannot be restricted)
- ✅ System Settings (when implemented)

---

## 🎯 **Recommendations**

### **Consider Adding CRUD to:**

1. **Customer Data**

   - Add ability to add notes to orders
   - Add ability to mark orders as priority
   - Add manual order entry (if needed)

2. **SKU List**

   - Add ability to edit SKU information
   - Add ability to update inventory levels
   - Add ability to sync with procurement

3. **Dashboard**
   - Add ability to save custom views
   - Add ability to create custom reports
   - Add ability to set alerts/notifications

---

## 📊 **Data Flow**

### **Data Sources:**

1. **Procurement** → Internal Database (MySQL/PostgreSQL)
2. **Customer Data** → Shopify API (Read-only sync)
3. **Shipping** → Shopify + BlueDart API
4. **SKU List** → Shopify Products API
5. **Product Spend Summary** → Aggregated from Ads + Sales data
6. **Entity Report** → Google Ads + Meta Ads + Organic data
7. **User Management** → Firebase Firestore

---

## ✅ **Conclusion**

**Total Sidebars:** 9

- **Full CRUD:** 2 (Procurement, User Management)
- **Limited CRUD:** 1 (Shipping)
- **Read-Only:** 5 (Dashboard, SKU List, Product Spend Summary, Entity Report, Customer Data)
- **Planned:** 1 (System Settings)

**Primary Management Sidebars:** Procurement and User Management
**Primary Viewing Sidebars:** All analytics and reporting sidebars
