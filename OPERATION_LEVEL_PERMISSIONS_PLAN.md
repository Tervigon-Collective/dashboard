# 🎯 Operation-Level Permissions Implementation Plan

## Overview

Adding granular operation-level permissions (READ, CREATE, UPDATE, DELETE) on top of sidebar access permissions.

---

## 📊 **Current vs New Structure**

### **Current Structure (Sidebar-Level Only):**

```javascript
{
  "procurement": true,  // User can access Procurement
  "customerData": false // User cannot access Customer Data
}
```

### **New Structure (Operation-Level):**

```javascript
{
  "procurement": {
    "enabled": true,
    "operations": ["read", "create", "update", "delete"]  // Full CRUD
  },
  "customerData": {
    "enabled": true,
    "operations": ["read"]  // Read-only
  }
}
```

---

## 🎯 **Use Cases**

### **Example 1: Read-Only Procurement Access**

**Scenario:** User can see procurement data but cannot add/edit/delete products

**Permission:**

```javascript
{
  "procurement": {
    "enabled": true,
    "operations": ["read"]  // Only read
  }
}
```

**UI Impact:**

- ✅ Can view product list
- ✅ Can search/filter products
- ✅ Can view product details
- ❌ "Add New Product" button hidden
- ❌ "Edit" buttons hidden
- ❌ "Delete" buttons hidden

### **Example 2: Read + Create Only**

**Scenario:** User can view and add new products, but cannot modify existing ones

**Permission:**

```javascript
{
  "procurement": {
    "enabled": true,
    "operations": ["read", "create"]
  }
}
```

**UI Impact:**

- ✅ Can view product list
- ✅ "Add New Product" button visible
- ❌ "Edit" buttons hidden
- ❌ "Delete" buttons hidden

---

## 🏗️ **Implementation Phases**

### **Phase 1: Update Permission Structure** ✅

- [x] Add `OPERATION_TYPES` constants
- [x] Add `PERMISSION_LEVELS` constants
- [x] Update `AVAILABLE_SIDEBAR_ITEMS` with `availableOperations` and `supportsCRUD`
- [x] Update `DEFAULT_SIDEBAR_PERMISSIONS` to include operations

### **Phase 2: Update SidebarPermissionsManager**

- [ ] Add `hasOperation(sidebarKey, operation)` method
- [ ] Add `getAllowedOperations(sidebarKey)` method
- [ ] Update `hasSidebarPermission()` to check `enabled` property
- [ ] Update `updatePermissions()` to handle new structure
- [ ] Add backward compatibility for old format

### **Phase 3: Update UserRoleManager UI**

- [ ] Add operation checkboxes for sidebars that support CRUD
- [ ] Show "Read-Only" badge for non-CRUD sidebars
- [ ] Add "Select All Operations" helper
- [ ] Add permission level dropdown (Read-Only, Full CRUD, etc.)

### **Phase 4: Update Frontend Components**

- [ ] Update Procurement component to check operations
- [ ] Hide/show buttons based on operations
- [ ] Update User Management component
- [ ] Update Shipping component

### **Phase 5: Backend API Updates**

- [ ] Update validation to accept operations array
- [ ] Store operations in Firestore
- [ ] Return operations in API responses

---

## 🔧 **New Helper Methods**

### **1. Check if user can perform an operation:**

```javascript
sidebarPermissionsManager.hasOperation("procurement", "create");
// Returns: true/false
```

### **2. Get all allowed operations for a sidebar:**

```javascript
sidebarPermissionsManager.getAllowedOperations("procurement");
// Returns: ['read', 'create', 'update', 'delete']
```

### **3. Check if sidebar supports CRUD:**

```javascript
const item = AVAILABLE_SIDEBAR_ITEMS["procurement"];
if (item.supportsCRUD) {
  // Show operation checkboxes
}
```

---

## 🎨 **UI Design for Edit Role Modal**

### **Current UI:**

```
☑️ Procurement
☐ Customer Data
☐ Shipping
```

### **New UI:**

```
☑️ Procurement
   Operations: ☑️ Read  ☑️ Create  ☑️ Update  ☑️ Delete

☑️ Customer Data
   (Read-Only - No operations available)

☑️ Shipping
   Operations: ☑️ Read  ☑️ Create (Generate Waybills)
```

---

## 📝 **Data Format Examples**

### **API Request (PUT /users/:userId/role):**

```json
{
  "role": "user",
  "sidebarPermissions": {
    "procurement": {
      "enabled": true,
      "operations": ["read"]
    },
    "customerData": {
      "enabled": true,
      "operations": ["read"]
    },
    "shipping": {
      "enabled": true,
      "operations": ["read", "create"]
    }
  }
}
```

### **API Response:**

```json
{
  "success": true,
  "data": {
    "userId": "abc123",
    "role": "user",
    "sidebarPermissions": {
      "procurement": {
        "enabled": true,
        "operations": ["read"]
      },
      "customerData": {
        "enabled": true,
        "operations": ["read"]
      },
      "shipping": {
        "enabled": true,
        "operations": ["read", "create"]
      }
    }
  }
}
```

---

## 🔄 **Backward Compatibility**

### **Old Format (still supported):**

```javascript
{
  "procurement": true,
  "customerData": false
}
```

### **Auto-conversion to New Format:**

```javascript
{
  "procurement": {
    "enabled": true,
    "operations": ["read", "create", "update", "delete"]  // Default full CRUD
  },
  "customerData": {
    "enabled": false,
    "operations": []
  }
}
```

---

## ⚡ **Quick Implementation (Simplified)**

If you want a **simpler version first**, we can use permission levels instead of individual operations:

### **Permission Levels:**

```javascript
{
  "procurement": "full_crud",      // Full access
  "customerData": "read_only",     // Read-only
  "shipping": "read_create"        // Read + Create
}
```

### **Available Levels:**

- `"none"` - No access
- `"read_only"` - View only
- `"read_create"` - View + Create
- `"read_update"` - View + Edit
- `"read_create_update"` - View + Create + Edit
- `"full_crud"` - View + Create + Edit + Delete

---

## 🎯 **Which Approach Do You Prefer?**

### **Option A: Individual Operations (More Flexible)**

```javascript
{
  "procurement": {
    "enabled": true,
    "operations": ["read", "update"]  // Can view and edit, but not create or delete
  }
}
```

**Pros:**

- Maximum flexibility
- Can create any combination
- Future-proof

**Cons:**

- More complex UI
- More checkboxes

### **Option B: Permission Levels (Simpler)**

```javascript
{
  "procurement": "read_update"  // Predefined level
}
```

**Pros:**

- Simpler UI (dropdown instead of checkboxes)
- Easier to understand
- Faster to configure

**Cons:**

- Less flexible
- Limited to predefined combinations

---

## 💡 **Recommendation**

I recommend **Option B (Permission Levels)** for the first implementation because:

1. ✅ Simpler to implement
2. ✅ Easier for admins to understand
3. ✅ Covers 95% of use cases
4. ✅ Can upgrade to Option A later if needed

The UI would look like this:

```
☑️ Procurement
   Permission Level: [Full CRUD ▼]

☑️ Customer Data
   Permission Level: [Read Only ▼] (Cannot change - data source limitation)

☑️ Shipping
   Permission Level: [Read + Create ▼]
```

---

## 🚀 **Next Steps**

Please choose:

1. **Option A**: Individual operation checkboxes (more complex, more flexible)
2. **Option B**: Permission level dropdown (simpler, covers most cases)

Once you decide, I'll implement it completely!
