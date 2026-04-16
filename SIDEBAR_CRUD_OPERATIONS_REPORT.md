# 📊 Complete Sidebar CRUD Operations Report

## Overview

This document provides a comprehensive analysis of all sidebar items in the dashboard and their CRUD (Create, Read, Update, Delete) operations.

---

## 🎯 **Active Sidebars with Permissions**

### 1. **Dashboard** (`dashboard`)

**Route:** `/` (Home), `/historical-data`, and `/advanced-analytics`

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
- Advanced analytics
- Chart visualizations
- Date range filters

**Access Level:** Manager, Admin, Super Admin

---

### 2. **Product Spend Summary** (`productSpendSummary`)

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

### 3. **Entity Report** (`entityReport`)

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

### 4. **Procurement** (`procurement`)

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

### 5. **Customer Data** (`customerData`)

**Route:** `/customer-data`

**Component:** `CustomerLayer.jsx`

**CRUD Operations:**

- ✅ **READ** - View all customer orders and information
- ✅ **CREATE** - Bulk upload customer orders via CSV/Excel files
- ❌ **UPDATE** - No update functionality (synced from Shopify)
- ❌ **DELETE** - No delete functionality (synced from Shopify)

**Features:**

- **READ:**

  - View customer orders
  - Search by email, phone, name, order number
  - Filter by date range
  - View order details
  - View customer information
  - Pagination
  - Universal search across all fields

- **CREATE:**
  - Bulk upload customer orders via CSV or Excel files
  - Upload Shopify orders export files
  - Map Excel/CSV columns to backend format
  - Validate and process uploaded data
  - Support for multiple order formats

**Access Level:** User, Manager, Admin, Super Admin

**Note:** This is a **READ + CREATE** sidebar - can view orders and bulk upload new orders via file upload, but cannot update or delete existing orders (synced from Shopify)

---

### 6. **Shipping** (`shipping`)

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

### 7. **Content Craft** (`createContent`)

**Route:** `/create-content`

**Component:** `CreateContentPage`

**CRUD Operations:**

- ✅ **READ** - View previously generated briefs, results, and generation history
- ✅ **CREATE** - Launch new AI generation jobs (text, image, video variants)
- ✅ **UPDATE** - Edit existing generated images (modify prompts, aspect ratios, guidance scale, seed)
- ✅ **DELETE** - Delete generated content items (images and videos)

**Features:**

- **READ:**

  - View previously generated briefs, results, and generation history
  - Review prior jobs with filters and status indicators
  - View generated content with metadata

- **CREATE:**

  - Compose briefs (product name, tone, channels)
  - Submit quick-generate or advanced jobs
  - Launch new AI generation jobs (text, image, video variants)
  - Upload reference imagery and retrieve generated assets

- **UPDATE:**

  - Edit existing generated images
  - Modify image prompts and descriptions
  - Change aspect ratios (film horizontal, widescreen, classic, square, portrait, etc.)
  - Adjust guidance scale and seed values
  - Regenerate images with modifications

- **DELETE:**
  - Delete generated content items (images and videos)
  - Confirmation dialog before deletion
  - Remove items from generation history

**Access Level:** Manager, Admin, Super Admin

**Note:** This is a **FULL CRUD** sidebar – users can create, read, update (edit), and delete generated content

---

### 8. **Receiving Management** (`receivingManagement`)

**Route:** `/receiving-management`

**Component:** `ReceivingManagementPage`

**CRUD Operations:**

- ✅ **CREATE** - Log inbound shipments and ASN details
- ✅ **READ** - View receiving queue, statuses, discrepancies
- ✅ **UPDATE** - Reconcile shipments, adjust quantities, close receipts
- ✅ **DELETE** - Remove staging entries or cancel receipts (with audit trail)

**Features:**

- Multi-step receiving workflow with status tracking
- Item-level discrepancy management
- Vendor and PO cross-references
- Bulk import/export of receiving data
- Activity log and user attribution

**Access Level:** Manager, Admin, Super Admin

**Note:** This is a **FULL CRUD** sidebar – end-to-end receiving orchestration

---

### 9. **Order Management** (`orderManagement`)

**Route:** `/order-management`

**Component:** `OrderManagementPage`

**CRUD Operations:**

- ✅ **CREATE** - Manually create fulfillment orders or exceptions
- ✅ **READ** - Review outgoing orders, pick/pack status, SLAs
- ✅ **UPDATE** - Advance order stages, assign pickers, edit allocations
- ✅ **DELETE** - Void or cancel outbound orders (permission controlled)

**Features:**

- Order queue with filtering by warehouse / priority
- Bulk actions (mark as picked/packed/shipped)
- Carrier assignment and label triggers
- Exception management with notes
- KPI widgets (aging orders, SLA risk)

**Access Level:** Manager, Admin, Super Admin

**Note:** This is a **FULL CRUD** sidebar – central hub for fulfillment execution

---

### 10. **Stock Management** (`stockManagement`)

**Route:** `/stock-management`

**Component:** `StockManagementPage`

**CRUD Operations:**

- ✅ **CREATE** - Register cycle counts, adjustments, transfers
- ✅ **READ** - Monitor on-hand, reserved, and available inventory
- ✅ **UPDATE** - Adjust stock levels, reconcile variances, move stock
- ✅ **DELETE** - Rollback pending adjustments (with permission gates)

**Features:**

- Real-time inventory dashboard by SKU/location
- Cycle count workflows with approvals
- Audit history for every adjustment
- Threshold alerts and low-stock warnings
- Exportable inventory snapshots

**Access Level:** Manager, Admin, Super Admin

**Note:** This is a **FULL CRUD** sidebar – inventory control and governance

---

### 11. **Manage Masters** (`masters`)

**Route:** `/masters`

**Component:** `MastersPage`

**CRUD Operations:**

- ✅ **CREATE** - Add master data records (vendors, warehouses, categories, etc.)
- ✅ **READ** - View complete master datasets
- ✅ **UPDATE** - Edit master attributes, enable/disable records
- ✅ **DELETE** - Archive/remove master entries (subject to referential checks)

**Features:**

- Centralized catalogue for reference data
- Validation rules per master type
- Bulk import/export with templates
- Dependency checks before deletes
- Change history and ownership metadata

**Access Level:** Manager, Admin, Super Admin

**Note:** This is a **FULL CRUD** sidebar – foundation for shared reference data

---

### 12. **User Management** (`userManagement`)

**Route:** `/user-management`, `/create-user`

**Component:** `UserManagement.jsx`, `CreateUserLayer.jsx`

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
  - Set user status (active/inactive)

- **READ:**

  - View all users (`/user-management`)
  - Filter by role (All, No Access, User, Manager, Admin, Super Admin)
  - Search users by email, name, or phone
  - Sort by name, email, role, or date added
  - View user details with avatar/initials
  - Infinite scroll pagination
  - View user status badges

- **UPDATE:**

  - Edit user roles (integrated permissions panel in `/user-management`)
  - Update sidebar permissions with granular CRUD control per sidebar item
  - Set permission levels (none, read, read+create, read+update, full CRUD)
  - Modify user status
  - Real-time permission preview

- **DELETE:**
  - Delete user accounts with confirmation dialog
  - Prevents self-deletion
  - Removes user from both backend and Firebase

**Access Level:** Admin, Super Admin

**Note:** This is a **FULL CRUD** sidebar with complete user management capabilities. Role assignment and permission management are integrated directly into the main user management page via a side panel, rather than separate routes.

---

### 13. **System Settings** (`systemSettings`)

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
2. ✅ **Content Craft** - AI content generation with edit and delete capabilities
3. ✅ **Receiving Management** - Inbound logistics
4. ✅ **Order Management** - Fulfillment execution
5. ✅ **Stock Management** - Inventory control
6. ✅ **Manage Masters** - Reference data catalogues
7. ✅ **User Management** - Complete user administration

### **Limited CRUD (Read + Create/Update):**

1. ⚠️ **Shipping** - Read orders + Generate waybills + Track shipments
2. ⚠️ **Customer Data** - Read orders + Bulk upload (Create) via CSV/Excel

### **Read-Only:**

1. 📖 **Dashboard** - Analytics and reports
2. 📖 **Product Spend Summary** - Spending analytics
3. 📖 **Entity Report** - Attribution reports

### **Not Implemented:**

1. ⏳ **System Settings** - Future feature

---

## 🎨 **Detailed Functionality Matrix**

| Sidebar                  | Create   | Read   | Update   | Delete | Export | Search | Filter | Pagination |
| ------------------------ | -------- | ------ | -------- | ------ | ------ | ------ | ------ | ---------- |
| Dashboard                | ❌       | ✅     | ❌       | ❌     | ❌     | ❌     | ✅     | ❌         |
| Product Spend Summary    | ❌       | ✅     | ❌       | ❌     | ❌     | ✅     | ✅     | ✅         |
| Entity Report            | ❌       | ✅     | ❌       | ❌     | ✅     | ✅     | ✅     | ✅         |
| **Procurement**          | **✅**   | **✅** | **✅**   | **✅** | ✅     | ✅     | ✅     | ✅         |
| Customer Data            | **✅\*** | ✅     | ❌       | ❌     | ❌     | ✅     | ✅     | ✅         |
| **Shipping**             | **✅\*** | **✅** | **✅\*** | ❌     | ✅     | ✅     | ✅     | ✅         |
| **Content Craft**        | **✅**   | **✅** | **✅**   | **✅** | ✅     | ✅     | ✅     | ✅         |
| **Receiving Management** | **✅**   | **✅** | **✅**   | **✅** | ✅     | ✅     | ✅     | ✅         |
| **Order Management**     | **✅**   | **✅** | **✅**   | **✅** | ✅     | ✅     | ✅     | ✅         |
| **Stock Management**     | **✅**   | **✅** | **✅**   | **✅** | ✅     | ✅     | ✅     | ✅         |
| **Manage Masters**       | **✅**   | **✅** | **✅**   | **✅** | ✅     | ✅     | ✅     | ✅         |
| **User Management**      | **✅**   | **✅** | **✅**   | **✅** | ❌     | ✅     | ✅     | ✅         |
| System Settings          | ⏳       | ⏳     | ⏳       | ⏳     | ⏳     | ⏳     | ⏳     | ⏳         |

**Legend:**

- ✅ = Available
- ❌ = Not Available
- ⏳ = Planned/Future
- **Bold** = Full or significant CRUD operations
- \* = Limited (Waybill generation for Shipping, Bulk upload for Customer Data)

---

## 🔐 **Access Control Summary**

### **User Role:**

- ✅ Procurement (Full CRUD)
- ✅ Customer Data (Read)
- ✅ Shipping (Read + Waybill Generation)

### **Manager Role:**

- ✅ Dashboard (Read)
- ✅ Product Spend Summary (Read)
- ✅ Entity Report (Read)
- ✅ Procurement (Full CRUD)
- ✅ Customer Data (Read + Bulk Upload)
- ✅ Shipping (Read + Waybill Generation)
- ✅ Content Craft (Full CRUD)
- ✅ Receiving Management (Full CRUD)
- ✅ Order Management (Full CRUD)
- ✅ Stock Management (Full CRUD)
- ✅ Manage Masters (Full CRUD)

### **Admin Role:**

- ✅ All Manager permissions, including:
  - ✅ Dashboard (Read)
  - ✅ Product Spend Summary (Read)
  - ✅ Entity Report (Read)
  - ✅ Procurement (Full CRUD)
  - ✅ Customer Data (Read + Bulk Upload)
  - ✅ Shipping (Read + Waybill Generation)
  - ✅ Content Craft (Full CRUD)
  - ✅ Receiving Management (Full CRUD)
  - ✅ Order Management (Full CRUD)
  - ✅ Stock Management (Full CRUD)
  - ✅ Manage Masters (Full CRUD)
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

2. **Dashboard**
   - Add ability to save custom views
   - Add ability to create custom reports
   - Add ability to set alerts/notifications

---

## 📊 **Data Flow**

### **Data Sources:**

1. **Procurement** → Internal Database (MySQL/PostgreSQL)
2. **Customer Data** → Shopify API (Read sync) + Bulk Upload (CSV/Excel)
3. **Shipping** → Shopify + BlueDart API
4. **Product Spend Summary** → Aggregated from Ads + Sales data
5. **Entity Report** → Google Ads + Meta Ads + Organic data
6. **Content Craft** → Python AI Backend (Content Generation API)
7. **User Management** → Firebase Firestore

---

## ✅ **Conclusion**

**Total Sidebars:** 13

- **Full CRUD:** 7 (Procurement, Content Craft, Receiving Management, Order Management, Stock Management, Manage Masters, User Management)
- **Limited CRUD:** 2 (Shipping, Customer Data)
- **Read-Only:** 3 (Dashboard, Product Spend Summary, Entity Report)
- **Planned:** 1 (System Settings)

**Note:** SKU List is not included in this report as it is commented out from the sidebar menu and not accessible through the navigation.

**Primary Management Sidebars:** Procurement, Content Craft, Receiving, Order, Stock, Masters, User Management
**Primary Viewing Sidebars:** Analytics, reporting, and Shopify data surfaces
