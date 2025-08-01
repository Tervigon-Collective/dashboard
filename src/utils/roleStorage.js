// Role-based access control with localStorage persistence

const STORAGE_KEYS = {
  USER_ROLE: 'userRole',
  USER_TOKEN: 'userToken',
  USER_DATA: 'userData',
  ROLE_PERMISSIONS: 'rolePermissions',
  LAST_LOGIN: 'lastLogin'
};

// Role hierarchy
const ROLE_HIERARCHY = {
  'none': 0,
  'user': 1,
  'manager': 2,
  'admin': 3,
  'super_admin': 4
};

// Role permissions mapping
const ROLE_PERMISSIONS = {
  'none': {
    canAccessDashboard: false,
    canViewCustomerData: false,
    canManageUsers: false,
    canCreateUsers: false,
    canAssignRoles: false,
    canViewAnalytics: false,
    canManageCustomerData: false,
    canDeleteCustomerData: false
  },
  'user': {
    canAccessDashboard: true,
    canViewCustomerData: true,
    canManageUsers: false,
    canCreateUsers: false,
    canAssignRoles: false,
    canViewAnalytics: false,
    canManageCustomerData: false,
    canDeleteCustomerData: false
  },
  'manager': {
    canAccessDashboard: true,
    canViewCustomerData: true,
    canManageUsers: false,
    canCreateUsers: false,
    canAssignRoles: false,
    canViewAnalytics: true,
    canManageCustomerData: true,
    canDeleteCustomerData: false
  },
  'admin': {
    canAccessDashboard: true,
    canViewCustomerData: true,
    canManageUsers: true,
    canCreateUsers: true,
    canAssignRoles: true,
    canViewAnalytics: true,
    canManageCustomerData: true,
    canDeleteCustomerData: true
  },
  'super_admin': {
    canAccessDashboard: true,
    canViewCustomerData: true,
    canManageUsers: true,
    canCreateUsers: true,
    canAssignRoles: true,
    canViewAnalytics: true,
    canManageCustomerData: true,
    canDeleteCustomerData: true
  }
};

// LocalStorage utilities
export const roleStorage = {
  // Get user role from localStorage
  getRole: () => {
    if (typeof window === 'undefined') return 'none';
    return localStorage.getItem(STORAGE_KEYS.USER_ROLE) || 'none';
  },

  // Set user role in localStorage
  setRole: (role) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
    localStorage.setItem(STORAGE_KEYS.LAST_LOGIN, new Date().toISOString());
  },

  // Get user token from localStorage
  getToken: () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEYS.USER_TOKEN);
  },

  // Set user token in localStorage
  setToken: (token) => {
    if (typeof window === 'undefined') return;
    if (token) {
      localStorage.setItem(STORAGE_KEYS.USER_TOKEN, token);
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER_TOKEN);
    }
  },

  // Get user data from localStorage
  getUserData: () => {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    return data ? JSON.parse(data) : null;
  },

  // Set user data in localStorage
  setUserData: (userData) => {
    if (typeof window === 'undefined') return;
    if (userData) {
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    }
  },

  // Check if user has a specific permission
  hasPermission: (permission) => {
    const role = roleStorage.getRole();
    return ROLE_PERMISSIONS[role]?.[permission] || false;
  },

  // Check if user has minimum role level
  hasMinimumRole: (minimumRole) => {
    const currentRole = roleStorage.getRole();
    const currentLevel = ROLE_HIERARCHY[currentRole] || 0;
    const requiredLevel = ROLE_HIERARCHY[minimumRole] || 0;
    return currentLevel >= requiredLevel;
  },

  // Get role level
  getRoleLevel: (role) => {
    return ROLE_HIERARCHY[role] || 0;
  },

  // Get all permissions for current user
  getPermissions: () => {
    const role = roleStorage.getRole();
    return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS['none'];
  },

  // Check if user has any access
  hasAnyAccess: () => {
    const role = roleStorage.getRole();
    return role && role !== 'none';
  },

  // Clear all role-related data
  clearAll: () => {
    if (typeof window === 'undefined') return;
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  },

  // Get role display name
  getRoleDisplayName: (role) => {
    const displayNames = {
      'none': 'No Access',
      'user': 'User',
      'manager': 'Manager',
      'admin': 'Admin',
      'super_admin': 'Super Admin'
    };
    return displayNames[role] || 'No Access';
  },

  // Get all available roles
  getAvailableRoles: () => {
    return Object.keys(ROLE_HIERARCHY);
  },

  // Check if user can assign a specific role
  canAssignRole: (targetRole) => {
    const currentRole = roleStorage.getRole();
    const currentLevel = ROLE_HIERARCHY[currentRole] || 0;
    const targetLevel = ROLE_HIERARCHY[targetRole] || 0;
    return currentLevel >= targetLevel;
  },

  // Get assignable roles for current user
  getAssignableRoles: () => {
    const currentRole = roleStorage.getRole();
    return Object.keys(ROLE_HIERARCHY).filter(role => 
      roleStorage.canAssignRole(role)
    );
  },

  // Check if session is still valid (optional expiry check)
  isSessionValid: () => {
    const lastLogin = localStorage.getItem(STORAGE_KEYS.LAST_LOGIN);
    if (!lastLogin) return false;
    
    // Optional: Check if session is older than 24 hours
    const lastLoginDate = new Date(lastLogin);
    const now = new Date();
    const hoursDiff = (now - lastLoginDate) / (1000 * 60 * 60);
    
    return hoursDiff < 24; // Session valid for 24 hours
  }
};

// Export constants for use in components
export { ROLE_HIERARCHY, ROLE_PERMISSIONS, STORAGE_KEYS }; 