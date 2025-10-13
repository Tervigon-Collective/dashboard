# Admin Role Restrictions Implementation

## 🎯 Overview

This document describes the implementation of role change restrictions, where **Admin users can manage user accounts but CANNOT change user roles**. Only **Super Admins** have the power to change user roles.

---

## 🔐 Security Model

### **Role Hierarchy**

```
Super Admin (Level 4) - Full control including role changes
    ↓
Admin (Level 3) - Can manage users but NOT change roles
    ↓
Manager (Level 2) - Limited access
    ↓
User (Level 1) - Basic access
    ↓
None (Level 0) - No access
```

### **Permission Matrix**

| Action                         | Super Admin | Admin | Manager | User |
| ------------------------------ | ----------- | ----- | ------- | ---- |
| **View Users**                 | ✅          | ✅    | ❌      | ❌   |
| **Create Users**               | ✅          | ✅    | ❌      | ❌   |
| **Update User Details**        | ✅          | ✅    | ❌      | ❌   |
| **Delete Users**               | ✅          | ✅    | ❌      | ❌   |
| **Change User Roles**          | ✅          | ❌    | ❌      | ❌   |
| **Update Sidebar Permissions** | ✅          | ✅    | ❌      | ❌   |

---

## 🛠️ Implementation Details

### **1. New Permission Type: `change_role`**

Added a new operation type specifically for role management:

```javascript
// src/utils/sidebarPermissions.js
export const OPERATION_TYPES = {
  READ: "read",
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  CHANGE_ROLE: "change_role", // Special permission for changing user roles
};
```

### **2. Updated User Management Permissions**

**Super Admin** (Full Control):

```javascript
userManagement: {
  enabled: true,
  operations: ["read", "create", "update", "delete", "change_role"], // Includes change_role
}
```

**Admin** (No Role Change):

```javascript
userManagement: {
  enabled: true,
  operations: ["read", "create", "update", "delete"], // NO change_role permission
}
```

### **3. Frontend Changes**

#### **File: `src/components/UserRoleManager.jsx`**

**A. Conditional Role Dropdown Display:**

```javascript
{hasOperation("userManagement", "change_role") ? (
  <div className="mb-3">
    <label className="form-label">New Role:</label>
    <select className="form-select" value={newRole} onChange={...}>
      {/* Role options */}
    </select>
  </div>
) : (
  <div className="alert alert-info">
    <Icon icon="mdi:information" className="me-2" />
    You don't have permission to change user roles. Only Super Admins can change roles.
  </div>
)}
```

**B. Updated Role Update Logic:**

```javascript
const handleRoleUpdate = async () => {
  const canChangeRole = hasOperation("userManagement", "change_role");

  // Prepare request body based on permissions
  const requestBody = {
    sidebarPermissions: sidebarPermissions,
  };

  // Only include role if user has change_role permission
  if (canChangeRole && newRole) {
    requestBody.role = newRole;
  }

  // Send to backend...
};
```

### **4. Backend Validation**

#### **File: `Dashboard_Backend/routes/user/userManagementRoutes.js`**

**A. Role Change Permission Check:**

```javascript
// Check if user is trying to change role (role is provided in request)
// Only super_admin can change roles, admin can only update sidebar permissions
if (role !== undefined) {
  if (req.user.role !== "super_admin") {
    return res.status(403).json({
      success: false,
      error: "Permission denied",
      message:
        "Only Super Admins can change user roles. Admins can only update sidebar permissions.",
    });
  }
}
```

**B. Conditional Update Logic:**

```javascript
// Prepare update data
const updateData = {
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedBy: req.user.uid,
};

// Only update role if it's provided
if (role !== undefined) {
  updateData.role = role;
}

// Only update sidebarPermissions if provided
if (normalizedSidebarPermissions !== null) {
  updateData.sidebarPermissions = normalizedSidebarPermissions;
}
```

---

## 📋 User Experience

### **Super Admin Experience**

1. Opens "Edit Role" modal for any user
2. **Sees "New Role" dropdown** with all role options
3. Can change both role AND sidebar permissions
4. Success message: "User role and permissions updated successfully!"

### **Admin Experience**

1. Opens "Edit Role" modal for any user
2. **Sees "Current Role" (read-only)**
3. **Sees informational message**: "You don't have permission to change user roles. Only Super Admins can change roles."
4. **Can still update sidebar permissions**
5. Success message: "User permissions updated successfully!"

---

## 🧪 Testing Scenarios

### **Test 1: Super Admin Changes User Role**

```bash
# Login as Super Admin
PUT /api/users/{userId}/role
{
  "role": "manager",
  "sidebarPermissions": { ... }
}

Expected: ✅ Success - Role changed to "manager"
```

### **Test 2: Admin Tries to Change User Role**

```bash
# Login as Admin
PUT /api/users/{userId}/role
{
  "role": "manager",
  "sidebarPermissions": { ... }
}

Expected: ❌ 403 Forbidden - "Only Super Admins can change user roles"
```

### **Test 3: Admin Updates Sidebar Permissions Only**

```bash
# Login as Admin
PUT /api/users/{userId}/role
{
  "sidebarPermissions": {
    "procurement": { "enabled": true, "operations": ["read"] }
  }
}

Expected: ✅ Success - Permissions updated, role unchanged
```

### **Test 4: Admin Opens Edit Role Modal**

```bash
# Login as Admin
# Open "Edit Role" modal for any user

Expected UI:
- ✅ Shows "Current Role: Admin" (read-only)
- ❌ Does NOT show "New Role" dropdown
- ✅ Shows info message about permission restriction
- ✅ Shows sidebar permissions (editable)
- ✅ "Update" button works for permissions only
```

---

## 🔄 API Endpoint Behavior

### **PUT `/api/users/:userId/role`**

**Required Headers:**

```json
{
  "Authorization": "Bearer {token}",
  "Content-Type": "application/json"
}
```

**Request Body (Super Admin):**

```json
{
  "role": "manager",
  "sidebarPermissions": {
    "procurement": { "enabled": true, "operations": ["read", "create"] },
    "dashboard": { "enabled": true, "operations": ["read"] }
  }
}
```

**Request Body (Admin - Permissions Only):**

```json
{
  "sidebarPermissions": {
    "procurement": { "enabled": true, "operations": ["read", "create"] },
    "dashboard": { "enabled": true, "operations": ["read"] }
  }
}
```

**Success Response:**

```json
{
  "success": true,
  "message": "User role and permissions updated successfully",
  "data": {
    "userId": "abc123",
    "role": "manager",
    "sidebarPermissions": { ... }
  }
}
```

**Error Response (Admin trying to change role):**

```json
{
  "success": false,
  "error": "Permission denied",
  "message": "Only Super Admins can change user roles. Admins can only update sidebar permissions."
}
```

---

## 📁 Files Modified

### **Frontend:**

1. `src/utils/sidebarPermissions.js`

   - Added `CHANGE_ROLE` operation type
   - Updated `userManagement` available operations
   - Modified default permissions for `admin` and `super_admin` roles

2. `src/components/UserRoleManager.jsx`
   - Added conditional rendering for role dropdown
   - Updated `handleRoleUpdate` to check `change_role` permission
   - Modified request body to conditionally include `role`
   - Added informational alert for restricted users

### **Backend:**

3. `Dashboard_Backend/routes/user/userManagementRoutes.js`
   - Added permission check for role changes
   - Made role field optional in update data
   - Updated response messages based on what was changed
   - Added logic to conditionally update role vs permissions only

---

## ✅ Benefits

1. **Enhanced Security**: Prevents privilege escalation by regular admins
2. **Clear Separation of Duties**: Only Super Admins can modify access levels
3. **Maintains Flexibility**: Admins can still manage user permissions
4. **User-Friendly**: Clear messaging about permission limitations
5. **Backward Compatible**: Existing functionality preserved
6. **Audit Trail**: Backend logs who made what changes

---

## 🚀 Future Enhancements

Potential improvements for the future:

1. **Audit Log UI**: Display role change history in user profile
2. **Role Change Notifications**: Email alerts when roles are changed
3. **Approval Workflow**: Require Super Admin approval for role changes
4. **Bulk Role Management**: Change multiple user roles at once
5. **Custom Roles**: Create custom roles with specific permission sets

---

## 📝 Notes

- **Existing users maintain their permissions** - No data migration needed
- **Super Admins are unaffected** - Full control retained
- **Admins can still do their job** - Can manage users and permissions, just not change roles
- **Backend enforces security** - Frontend checks are for UX only, backend validates everything

---

**Last Updated:** October 13, 2025
**Implemented By:** AI Assistant
**Status:** ✅ Complete and Tested
