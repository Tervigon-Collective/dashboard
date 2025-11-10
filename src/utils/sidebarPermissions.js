// Sidebar Permissions Utility - Works alongside existing role system
// This adds granular sidebar control without breaking existing functionality

const STORAGE_KEYS = {
  USER_SIDEBAR_PERMISSIONS: "userSidebarPermissions",
};

// Default sidebar permissions based on role (fallback for existing users)
// Format: { sidebar: { enabled: boolean, operations: string[] } }
const DEFAULT_SIDEBAR_PERMISSIONS = {
  none: {
    dashboard: { enabled: false, operations: [] },
    procurement: { enabled: false, operations: [] },
    customerData: { enabled: false, operations: [] },
    shipping: { enabled: false, operations: [] },
    skuList: { enabled: false, operations: [] },
    productSpendSummary: { enabled: false, operations: [] },
    entityReport: { enabled: false, operations: [] },
    userManagement: { enabled: false, operations: [] },
    systemSettings: { enabled: false, operations: [] },
    createContent: { enabled: false, operations: [] },
    receivingManagement: { enabled: false, operations: [] },
    stockManagement: { enabled: false, operations: [] },
    masters: { enabled: false, operations: [] },
  },
  user: {
    dashboard: { enabled: false, operations: [] },
    procurement: {
      enabled: true,
      operations: ["read", "create", "update", "delete"],
    }, // Full CRUD
    customerData: { enabled: true, operations: ["read"] }, // Read-only
    shipping: { enabled: true, operations: ["read", "create"] }, // Read + Create waybills
    skuList: { enabled: false, operations: [] },
    productSpendSummary: { enabled: false, operations: [] },
    entityReport: { enabled: false, operations: [] },
    userManagement: { enabled: false, operations: [] },
    systemSettings: { enabled: false, operations: [] },
    createContent: { enabled: false, operations: [] },
    receivingManagement: { enabled: false, operations: [] },
    stockManagement: { enabled: false, operations: [] },
    masters: { enabled: false, operations: [] },
  },
  manager: {
    dashboard: { enabled: true, operations: ["read"] }, // Read-only
    procurement: {
      enabled: true,
      operations: ["read", "create", "update", "delete"],
    }, // Full CRUD
    customerData: { enabled: true, operations: ["read"] }, // Read-only
    shipping: { enabled: true, operations: ["read", "create"] }, // Read + Create waybills
    skuList: {
      enabled: true,
      operations: ["read", "create", "update", "delete"],
    }, // Full CRUD
    productSpendSummary: { enabled: true, operations: ["read"] }, // Read-only
    entityReport: { enabled: true, operations: ["read"] }, // Read-only
    userManagement: { enabled: false, operations: [] },
    systemSettings: { enabled: false, operations: [] },
    createContent: { enabled: true, operations: ["read", "create"] },
    receivingManagement: {
      enabled: true,
      operations: ["read", "create", "update", "delete"],
    }, // Full CRUD
    stockManagement: {
      enabled: true,
      operations: ["read", "create", "update", "delete"],
    }, // Full CRUD
    masters: {
      enabled: true,
      operations: ["read", "create", "update", "delete"],
    }, // Full CRUD
  },
  admin: {
    dashboard: { enabled: true, operations: ["read"] }, // Read-only
    procurement: {
      enabled: true,
      operations: ["read", "create", "update", "delete"],
    }, // Full CRUD
    customerData: { enabled: true, operations: ["read"] }, // Read-only
    shipping: { enabled: true, operations: ["read", "create"] }, // Read + Create waybills
    skuList: {
      enabled: true,
      operations: ["read", "create", "update", "delete"],
    }, // Full CRUD
    productSpendSummary: { enabled: true, operations: ["read"] }, // Read-only
    entityReport: { enabled: true, operations: ["read"] }, // Read-only
    userManagement: {
      enabled: true,
      operations: ["read", "create", "update", "delete", "change_role"], // NO change_role permission
    }, // Can manage users but NOT change roles
    systemSettings: { enabled: false, operations: [] },
    createContent: { enabled: true, operations: ["read", "create"] },
    receivingManagement: {
      enabled: true,
      operations: ["read", "create", "update", "delete"],
    }, // Full CRUD
    stockManagement: {
      enabled: true,
      operations: ["read", "create", "update", "delete"],
    }, // Full CRUD
    masters: {
      enabled: true,
      operations: ["read", "create", "update", "delete"],
    }, // Full CRUD
  },
  super_admin: {
    dashboard: { enabled: true, operations: ["read"] },
    procurement: {
      enabled: true,
      operations: ["read", "create", "update", "delete"],
    },
    customerData: { enabled: true, operations: ["read"] },
    shipping: { enabled: true, operations: ["read", "create"] },
    skuList: {
      enabled: true,
      operations: ["read", "create", "update", "delete"],
    },
    productSpendSummary: { enabled: true, operations: ["read"] },
    entityReport: { enabled: true, operations: ["read"] },
    userManagement: {
      enabled: true,
      operations: ["read", "create", "update", "delete", "change_role"], // Full control including role changes
    },
    systemSettings: {
      enabled: true,
      operations: ["read", "create", "update", "delete"],
    },
    createContent: { enabled: true, operations: ["read", "create"] },
    receivingManagement: {
      enabled: true,
      operations: ["read", "create", "update", "delete"],
    }, // Full CRUD
    stockManagement: {
      enabled: true,
      operations: ["read", "create", "update", "delete"],
    }, // Full CRUD
    masters: {
      enabled: true,
      operations: ["read", "create", "update", "delete"],
    }, // Full CRUD
  },
};

// Operation types for permissions
export const OPERATION_TYPES = {
  READ: "read",
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  CHANGE_ROLE: "change_role", // Special permission for changing user roles
};

// Permission levels (combinations of operations)
export const PERMISSION_LEVELS = {
  NONE: "none",
  READ_ONLY: "read_only",
  READ_CREATE: "read_create",
  READ_UPDATE: "read_update",
  READ_CREATE_UPDATE: "read_create_update",
  FULL_CRUD: "full_crud",
};

// Permission level definitions (what operations each level includes)
export const PERMISSION_LEVEL_OPERATIONS = {
  none: [],
  read_only: ["read"],
  read_create: ["read", "create"],
  read_update: ["read", "update"],
  read_create_update: ["read", "create", "update"],
  full_crud: ["read", "create", "update", "delete"],
};

// Human-readable labels for permission levels
export const PERMISSION_LEVEL_LABELS = {
  none: "No Access",
  read_only: "Read Only",
  read_create: "Read + Create",
  read_update: "Read + Update",
  read_create_update: "Read + Create + Update",
  full_crud: "Full Access (CRUD)",
};

// Get available permission levels for a sidebar based on its capabilities
export const getAvailablePermissionLevels = (sidebarKey) => {
  const sidebarItem = AVAILABLE_SIDEBAR_ITEMS[sidebarKey];
  if (!sidebarItem)
    return [
      { value: PERMISSION_LEVELS.NONE, label: PERMISSION_LEVEL_LABELS.none },
    ];

  const availableOps = sidebarItem.availableOperations || [];
  const levels = [];

  // Check which levels are possible based on available operations
  if (availableOps.length === 0 || !sidebarItem.supportsCRUD) {
    // If no operations or doesn't support CRUD, only read-only
    if (availableOps.includes("read")) {
      levels.push({
        value: PERMISSION_LEVELS.READ_ONLY,
        label: PERMISSION_LEVEL_LABELS.read_only,
      });
    }
    return levels;
  }

  // Add levels based on available operations
  if (availableOps.includes("read")) {
    levels.push({
      value: PERMISSION_LEVELS.READ_ONLY,
      label: PERMISSION_LEVEL_LABELS.read_only,
    });
  }

  if (availableOps.includes("read") && availableOps.includes("create")) {
    levels.push({
      value: PERMISSION_LEVELS.READ_CREATE,
      label: PERMISSION_LEVEL_LABELS.read_create,
    });
  }

  if (availableOps.includes("read") && availableOps.includes("update")) {
    levels.push({
      value: PERMISSION_LEVELS.READ_UPDATE,
      label: PERMISSION_LEVEL_LABELS.read_update,
    });
  }

  if (
    availableOps.includes("read") &&
    availableOps.includes("create") &&
    availableOps.includes("update")
  ) {
    levels.push({
      value: PERMISSION_LEVELS.READ_CREATE_UPDATE,
      label: PERMISSION_LEVEL_LABELS.read_create_update,
    });
  }

  if (
    availableOps.includes("read") &&
    availableOps.includes("create") &&
    availableOps.includes("update") &&
    availableOps.includes("delete")
  ) {
    levels.push({
      value: PERMISSION_LEVELS.FULL_CRUD,
      label: PERMISSION_LEVEL_LABELS.full_crud,
    });
  }

  return levels;
};

// Get permission level from operations array
export const getPermissionLevelFromOperations = (operations = []) => {
  if (!operations || operations.length === 0) return PERMISSION_LEVELS.NONE;

  const sortedOps = [...operations].sort().join(",");

  // Match against each level
  for (const [level, ops] of Object.entries(PERMISSION_LEVEL_OPERATIONS)) {
    if ([...ops].sort().join(",") === sortedOps) {
      return level;
    }
  }

  // Default to read_only if operations include read
  if (operations.includes("read")) {
    return PERMISSION_LEVELS.READ_ONLY;
  }

  return PERMISSION_LEVELS.NONE;
};

// Available sidebar items for the permission system
export const AVAILABLE_SIDEBAR_ITEMS = {
  dashboard: {
    key: "dashboard",
    label: "Dashboard",
    description: "Access dashboard with reports and analytics overview",
    icon: "solar:home-smile-angle-outline",
    requiredRoles: ["manager", "admin", "super_admin"],
    availableOperations: [OPERATION_TYPES.READ], // Dashboard is read-only
    supportsCRUD: false,
  },
  skuList: {
    key: "skuList",
    label: "SKU List",
    description: "View and manage product SKU list",
    icon: "mage:box",
    requiredRoles: ["manager", "admin", "super_admin"],
    availableOperations: [
      OPERATION_TYPES.READ,
      OPERATION_TYPES.CREATE,
      OPERATION_TYPES.UPDATE,
      OPERATION_TYPES.DELETE,
    ],
    supportsCRUD: true, // Supports full CRUD
  },
  productSpendSummary: {
    key: "productSpendSummary",
    label: "Product Spend Summary",
    description: "View product spending analytics",
    icon: "mdi:chart-box-outline",
    requiredRoles: ["manager", "admin", "super_admin"],
    availableOperations: [OPERATION_TYPES.READ], // Analytics is read-only
    supportsCRUD: false,
  },
  entityReport: {
    key: "entityReport",
    label: "Entity Report",
    description: "Generate and view entity reports",
    icon: "solar:chart-2-bold",
    requiredRoles: ["manager", "admin", "super_admin"],
    availableOperations: [OPERATION_TYPES.READ], // Reports are read-only
    supportsCRUD: false,
  },
  procurement: {
    key: "procurement",
    label: "Procurement",
    description: "Access procurement features",
    icon: "mdi:package-variant",
    requiredRoles: ["user", "manager", "admin", "super_admin"],
    availableOperations: [
      OPERATION_TYPES.READ,
      OPERATION_TYPES.CREATE,
      OPERATION_TYPES.UPDATE,
      OPERATION_TYPES.DELETE,
    ],
    supportsCRUD: true, // Supports full CRUD
  },
  customerData: {
    key: "customerData",
    label: "Customer Data",
    description: "View and manage customer information",
    icon: "mdi:database",
    requiredRoles: ["user", "manager", "admin", "super_admin"],
    availableOperations: [OPERATION_TYPES.READ], // Customer data is read-only
    supportsCRUD: false,
  },
  shipping: {
    key: "shipping",
    label: "Shipping",
    description: "Manage shipping and logistics",
    icon: "lucide:package",
    requiredRoles: ["user", "manager", "admin", "super_admin"],
    availableOperations: [OPERATION_TYPES.READ, OPERATION_TYPES.CREATE], // Can read + generate waybills
    supportsCRUD: true, // Partial CRUD
  },
  userManagement: {
    key: "userManagement",
    label: "User Management",
    description: "Manage user accounts and roles",
    icon: "mdi:account-multiple",
    requiredRoles: ["admin", "super_admin"],
    availableOperations: [
      OPERATION_TYPES.READ,
      OPERATION_TYPES.CREATE,
      OPERATION_TYPES.UPDATE,
      OPERATION_TYPES.DELETE,
      OPERATION_TYPES.CHANGE_ROLE, // Special permission for changing user roles
    ],
    supportsCRUD: true, // Supports full CRUD + role management
  },
  systemSettings: {
    key: "systemSettings",
    label: "System Settings",
    description: "Configure system settings",
    icon: "mdi:cog",
    requiredRoles: ["super_admin"],
    availableOperations: [
      OPERATION_TYPES.READ,
      OPERATION_TYPES.CREATE,
      OPERATION_TYPES.UPDATE,
      OPERATION_TYPES.DELETE,
    ],
    supportsCRUD: true,
  },
  createContent: {
    key: "createContent",
    label: "Create Content",
    description: "AI-powered content generation for video and graphics",
    icon: "solar:magic-stick-3-bold",
    requiredRoles: ["manager", "admin", "super_admin"],
    availableOperations: [OPERATION_TYPES.READ, OPERATION_TYPES.CREATE],
    supportsCRUD: true,
  },
  receivingManagement: {
    key: "receivingManagement",
    label: "Receiving Management",
    description: "Manage incoming inventory and receiving processes",
    icon: "mdi:truck-delivery",
    requiredRoles: ["manager", "admin", "super_admin"],
    availableOperations: [
      OPERATION_TYPES.READ,
      OPERATION_TYPES.CREATE,
      OPERATION_TYPES.UPDATE,
      OPERATION_TYPES.DELETE,
    ],
    supportsCRUD: true,
  },
  orderManagement: {
    key: "orderManagement",
    label: "Order Management",
    description: "Track and manage outgoing orders",
    icon: "mdi:clipboard-text",
    requiredRoles: ["manager", "admin", "super_admin"],
    availableOperations: [
      OPERATION_TYPES.READ,
      OPERATION_TYPES.CREATE,
      OPERATION_TYPES.UPDATE,
      OPERATION_TYPES.DELETE,
    ],
    supportsCRUD: true,
  },
  stockManagement: {
    key: "stockManagement",
    label: "Stock Management",
    description: "Monitor and adjust on-hand inventory levels",
    icon: "mdi:warehouse",
    requiredRoles: ["manager", "admin", "super_admin"],
    availableOperations: [
      OPERATION_TYPES.READ,
      OPERATION_TYPES.CREATE,
      OPERATION_TYPES.UPDATE,
      OPERATION_TYPES.DELETE,
    ],
    supportsCRUD: true,
  },
  masters: {
    key: "masters",
    label: "Masters",
    description: "Manage master data and configuration settings",
    icon: "mdi:cog",
    requiredRoles: ["manager", "admin", "super_admin"],
    availableOperations: [
      OPERATION_TYPES.READ,
      OPERATION_TYPES.CREATE,
      OPERATION_TYPES.UPDATE,
      OPERATION_TYPES.DELETE,
    ],
    supportsCRUD: true,
  },
};

class SidebarPermissionsManager {
  constructor() {
    this.permissions = this.getStoredPermissions();
  }

  // Get sidebar permissions from localStorage
  getStoredPermissions() {
    if (typeof window === "undefined") return {};

    try {
      const stored = localStorage.getItem(
        STORAGE_KEYS.USER_SIDEBAR_PERMISSIONS
      );
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.warn("Error parsing stored sidebar permissions:", error);
      return {};
    }
  }

  // Store sidebar permissions in localStorage
  setStoredPermissions(permissions) {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(
        STORAGE_KEYS.USER_SIDEBAR_PERMISSIONS,
        JSON.stringify(permissions)
      );
      this.permissions = permissions;
    } catch (error) {
      console.warn("Error storing sidebar permissions:", error);
    }
  }

  // Update permissions (called when user role changes)
  updatePermissions(userRole, customPermissions = null) {
    let newPermissions;

    if (customPermissions) {
      // Use custom permissions if provided
      newPermissions = this.validatePermissions(userRole, customPermissions);
    } else {
      // Use default permissions for the role
      newPermissions =
        DEFAULT_SIDEBAR_PERMISSIONS[userRole] ||
        DEFAULT_SIDEBAR_PERMISSIONS.none;
    }

    this.setStoredPermissions(newPermissions);
    return newPermissions;
  }

  // Validate that permissions don't exceed role capabilities
  validatePermissions(userRole, permissions) {
    const roleDefaults =
      DEFAULT_SIDEBAR_PERMISSIONS[userRole] || DEFAULT_SIDEBAR_PERMISSIONS.none;
    const validated = {};

    // Super admin can have any permissions
    if (userRole === "super_admin") {
      return { ...roleDefaults, ...permissions };
    }

    // For other roles, only allow permissions that their role level supports
    Object.keys(AVAILABLE_SIDEBAR_ITEMS).forEach((key) => {
      const sidebarItem = AVAILABLE_SIDEBAR_ITEMS[key];
      const roleCanAccess = sidebarItem.requiredRoles.includes(userRole);
      const permission = permissions[key];

      if (!roleCanAccess) {
        // Role can't access this sidebar, set to disabled
        validated[key] = { enabled: false, operations: [] };
      } else if (permission === undefined) {
        // Permission not provided, use default for role
        validated[key] = roleDefaults[key] || {
          enabled: false,
          operations: [],
        };
      } else if (typeof permission === "boolean") {
        // Old format: boolean - convert to new format
        validated[key] = {
          enabled: permission,
          operations: permission
            ? sidebarItem?.availableOperations || ["read"]
            : [],
        };
      } else if (typeof permission === "object" && permission !== null) {
        // New format: { enabled: boolean, operations: [] }
        validated[key] = {
          enabled: permission.enabled === true,
          operations: Array.isArray(permission.operations)
            ? permission.operations
            : [],
        };
      } else {
        // Invalid format, set to disabled
        validated[key] = { enabled: false, operations: [] };
      }
    });

    return validated;
  }

  // Check if user can see a specific sidebar item
  hasSidebarPermission(sidebarKey, userRole = null) {
    // Get current role if not provided
    if (!userRole) {
      const userData = this.getStoredUserData();
      userRole = userData?.role || "none";
    }

    // Super admin always has access to everything
    if (userRole === "super_admin") {
      return true;
    }

    // Check custom permissions first
    const customPermissions = this.getStoredPermissions();
    if (Object.keys(customPermissions).length > 0) {
      const permission = customPermissions[sidebarKey];

      // New format: { enabled: boolean, operations: [] }
      if (permission && typeof permission === "object") {
        return permission.enabled === true;
      }

      // Old format (backward compatibility): boolean
      return permission === true;
    }

    // Fallback to default role permissions
    const defaultPermissions =
      DEFAULT_SIDEBAR_PERMISSIONS[userRole] || DEFAULT_SIDEBAR_PERMISSIONS.none;
    const permission = defaultPermissions[sidebarKey];

    // New format
    if (permission && typeof permission === "object") {
      return permission.enabled === true;
    }

    // Old format (backward compatibility)
    return permission === true;
  }

  // Check if user can perform a specific operation on a sidebar
  hasOperation(sidebarKey, operation, userRole = null) {
    // Get current role if not provided
    if (!userRole) {
      const userData = this.getStoredUserData();
      userRole = userData?.role || "none";
    }

    // Super admin always has all operations
    if (userRole === "super_admin") {
      return true;
    }

    // First check if user has access to the sidebar
    if (!this.hasSidebarPermission(sidebarKey, userRole)) {
      return false;
    }

    // Get the operations for this sidebar
    const operations = this.getAllowedOperations(sidebarKey, userRole);
    return operations.includes(operation);
  }

  // Get all allowed operations for a sidebar
  getAllowedOperations(sidebarKey, userRole = null) {
    // Get current role if not provided
    if (!userRole) {
      const userData = this.getStoredUserData();
      userRole = userData?.role || "none";
    }

    // Super admin has all available operations
    if (userRole === "super_admin") {
      const sidebarItem = AVAILABLE_SIDEBAR_ITEMS[sidebarKey];
      return sidebarItem?.availableOperations || [];
    }

    // Check custom permissions first
    const customPermissions = this.getStoredPermissions();
    if (Object.keys(customPermissions).length > 0) {
      const permission = customPermissions[sidebarKey];

      // New format: { enabled: boolean, operations: [] }
      if (permission && typeof permission === "object") {
        return permission.operations || [];
      }

      // Old format: if true, return all available operations
      if (permission === true) {
        const sidebarItem = AVAILABLE_SIDEBAR_ITEMS[sidebarKey];
        return sidebarItem?.availableOperations || [];
      }

      return [];
    }

    // Fallback to default role permissions
    const defaultPermissions =
      DEFAULT_SIDEBAR_PERMISSIONS[userRole] || DEFAULT_SIDEBAR_PERMISSIONS.none;
    const permission = defaultPermissions[sidebarKey];

    // New format
    if (permission && typeof permission === "object") {
      return permission.operations || [];
    }

    // Old format: if true, return all available operations
    if (permission === true) {
      const sidebarItem = AVAILABLE_SIDEBAR_ITEMS[sidebarKey];
      return sidebarItem?.availableOperations || [];
    }

    return [];
  }

  // Get permission level for a sidebar (read_only, full_crud, etc.)
  getPermissionLevel(sidebarKey, userRole = null) {
    const operations = this.getAllowedOperations(sidebarKey, userRole);
    return getPermissionLevelFromOperations(operations);
  }

  // Get all sidebar permissions for current user
  getAllSidebarPermissions(userRole = null) {
    if (!userRole) {
      const userData = this.getStoredUserData();
      userRole = userData?.role || "none";
    }

    // Super admin always has all permissions
    if (userRole === "super_admin") {
      return Object.keys(AVAILABLE_SIDEBAR_ITEMS).reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {});
    }

    // Check custom permissions first
    const customPermissions = this.getStoredPermissions();
    if (Object.keys(customPermissions).length > 0) {
      return customPermissions;
    }

    // Fallback to default role permissions
    return (
      DEFAULT_SIDEBAR_PERMISSIONS[userRole] || DEFAULT_SIDEBAR_PERMISSIONS.none
    );
  }

  // Get user data from localStorage
  getStoredUserData() {
    if (typeof window === "undefined") return null;

    try {
      const userData = localStorage.getItem("userData");
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.warn("Error parsing stored user data:", error);
      return null;
    }
  }

  // Get available sidebar items for a specific role
  getAvailableSidebarItemsForRole(userRole) {
    const availableItems = {};

    Object.keys(AVAILABLE_SIDEBAR_ITEMS).forEach((key) => {
      const sidebarItem = AVAILABLE_SIDEBAR_ITEMS[key];
      const roleCanAccess = sidebarItem.requiredRoles.includes(userRole);

      if (roleCanAccess) {
        availableItems[key] = sidebarItem;
      }
    });

    return availableItems;
  }

  // Clear all sidebar permissions (on logout)
  clearAll() {
    if (typeof window === "undefined") return;

    localStorage.removeItem(STORAGE_KEYS.USER_SIDEBAR_PERMISSIONS);
    this.permissions = {};
  }

  // Get debug information
  getDebugInfo() {
    const userData = this.getStoredUserData();
    return {
      currentRole: userData?.role || "none",
      storedPermissions: this.getStoredPermissions(),
      allPermissions: this.getAllSidebarPermissions(),
      defaultPermissions: DEFAULT_SIDEBAR_PERMISSIONS[userData?.role || "none"],
    };
  }
}

// Create singleton instance
const sidebarPermissionsManager = new SidebarPermissionsManager();

// Export the singleton and utilities
export { sidebarPermissionsManager, DEFAULT_SIDEBAR_PERMISSIONS, STORAGE_KEYS };
export default sidebarPermissionsManager;
