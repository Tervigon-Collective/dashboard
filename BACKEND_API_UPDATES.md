# Backend API Updates for Granular Sidebar Permissions

## Overview

These changes need to be made to your backend API to support the new granular sidebar permissions feature while maintaining backward compatibility.

## 1. Update User Role API Response

### Current API Response (`GET /api/user/role`):

```json
{
  "role": "user",
  "message": "Role retrieved successfully"
}
```

### New API Response (with backward compatibility):

```json
{
  "role": "user",
  "sidebarPermissions": {
    "dashboard": false,
    "procurement": true,
    "customerData": true,
    "shipping": false,
    "analytics": false,
    "userManagement": false,
    "systemSettings": false
  },
  "message": "Role and permissions retrieved successfully"
}
```

## 2. Update User Role Update API

### New API Endpoint: `PUT /api/users/:userId/role`

**Request Body:**

```json
{
  "role": "user",
  "sidebarPermissions": {
    "dashboard": false,
    "procurement": true,
    "customerData": true,
    "shipping": false,
    "analytics": false,
    "userManagement": false,
    "systemSettings": false
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "User role and permissions updated successfully",
  "data": {
    "userId": "user123",
    "role": "user",
    "sidebarPermissions": {
      "dashboard": false,
      "procurement": true,
      "customerData": true,
      "shipping": false,
      "analytics": false,
      "userManagement": false,
      "systemSettings": false
    },
    "updatedAt": "2025-01-13T10:30:00Z"
  }
}
```

## 3. Database Schema Updates

### Add sidebar permissions field to user documents:

**Firebase Firestore:**

```javascript
// User document structure
{
  uid: "user123",
  email: "user@example.com",
  role: "user",
  sidebarPermissions: {
    dashboard: false,
    procurement: true,
    customerData: true,
    shipping: false,
    analytics: false,
    userManagement: false,
    systemSettings: false
  },
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-13T10:30:00Z"
}
```

## 4. Backend Implementation Example

### User Role Controller Update:

```javascript
// controller/usersController.js

const getCurrentUserRole = async (req, res) => {
  try {
    const userId = req.user.uid;

    // Get user from database
    const userDoc = await admin
      .firestore()
      .collection("users")
      .doc(userId)
      .get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = userDoc.data();

    // Return role and sidebar permissions
    res.json({
      role: userData.role || "none",
      sidebarPermissions: userData.sidebarPermissions || null, // null means use defaults
      message: "Role and permissions retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting user role:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, sidebarPermissions } = req.body;
    const updatedBy = req.user.uid;

    // Validate role
    const validRoles = ["none", "user", "manager", "admin", "super_admin"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    // Validate sidebar permissions if provided
    if (sidebarPermissions) {
      const validSidebarKeys = [
        "dashboard",
        "procurement",
        "customerData",
        "shipping",
        "analytics",
        "userManagement",
        "systemSettings",
      ];

      for (const key in sidebarPermissions) {
        if (!validSidebarKeys.includes(key)) {
          return res
            .status(400)
            .json({ error: `Invalid sidebar permission: ${key}` });
        }
      }
    }

    // Update user in database
    const updateData = {
      role: role,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: updatedBy,
    };

    // Only update sidebarPermissions if provided
    if (sidebarPermissions !== undefined) {
      updateData.sidebarPermissions = sidebarPermissions;
    }

    await admin.firestore().collection("users").doc(userId).update(updateData);

    res.json({
      success: true,
      message: "User role and permissions updated successfully",
      data: {
        userId: userId,
        role: role,
        sidebarPermissions: sidebarPermissions,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
```

### Route Updates:

```javascript
// routes/user/userRoutes.js

// Existing route (keep for backward compatibility)
router.get("/role", authMiddleware, getCurrentUserRole);

// New route for updating user role and permissions
router.put("/users/:userId/role", authMiddleware, updateUserRole);
```

## 5. Migration Script for Existing Users

```javascript
// scripts/migrateSidebarPermissions.js

const admin = require("firebase-admin");

const migrateUsers = async () => {
  try {
    const usersSnapshot = await admin.firestore().collection("users").get();

    const defaultPermissions = {
      none: {
        dashboard: false,
        procurement: false,
        customerData: false,
        shipping: false,
        analytics: false,
        userManagement: false,
        systemSettings: false,
      },
      user: {
        dashboard: false,
        procurement: true,
        customerData: true,
        shipping: true,
        analytics: false,
        userManagement: false,
        systemSettings: false,
      },
      manager: {
        dashboard: true,
        procurement: true,
        customerData: true,
        shipping: true,
        analytics: true,
        userManagement: false,
        systemSettings: false,
      },
      admin: {
        dashboard: true,
        procurement: true,
        customerData: true,
        shipping: true,
        analytics: true,
        userManagement: true,
        systemSettings: false,
      },
      super_admin: {
        dashboard: true,
        procurement: true,
        customerData: true,
        shipping: true,
        analytics: true,
        userManagement: true,
        systemSettings: true,
      },
    };

    const batch = admin.firestore().batch();
    let updateCount = 0;

    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      const userRole = userData.role || "none";

      // Only update if user doesn't have sidebarPermissions
      if (!userData.sidebarPermissions) {
        batch.update(doc.ref, {
          sidebarPermissions: defaultPermissions[userRole],
          migratedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        updateCount++;
      }
    });

    if (updateCount > 0) {
      await batch.commit();
      console.log(
        `Migrated ${updateCount} users with default sidebar permissions`
      );
    } else {
      console.log("No users need migration");
    }
  } catch (error) {
    console.error("Migration failed:", error);
  }
};

// Run migration
migrateUsers();
```

## 6. Testing the API

### Test Current User Role:

```bash
curl -X GET "https://your-api.com/api/user/role" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Update User Role:

```bash
curl -X PUT "https://your-api.com/api/users/USER_ID/role" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "user",
    "sidebarPermissions": {
      "procurement": true,
      "customerData": true,
      "shipping": false,
      "analytics": false,
      "userManagement": false,
      "systemSettings": false,
      "profile": true
    }
  }'
```

## 7. Backward Compatibility Notes

1. **Existing API calls will continue to work** - the new `sidebarPermissions` field is optional
2. **If `sidebarPermissions` is null or missing**, the frontend will use default permissions based on role
3. **Existing users will be automatically migrated** when they next sign in
4. **The migration script can be run once** to update all existing users in bulk

## 8. Security Considerations

1. **Validate all sidebar permissions** against allowed values
2. **Ensure users can only assign permissions their role level supports**
3. **Super admins should always have all permissions** (can't be restricted)
4. **Log all permission changes** for audit purposes
5. **Rate limit permission update requests**

---

**Note:** Make sure to test these changes in a development environment before deploying to production.
