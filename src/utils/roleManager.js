// Role Management Utility with Best Practices
// This utility provides centralized role management with localStorage persistence

const STORAGE_KEYS = {
  USER_ROLE: 'userRole',
  USER_TOKEN: 'userToken',
  USER_DATA: 'userData',
  ROLE_TIMESTAMP: 'roleTimestamp'
};

// Role hierarchy with clear permissions
const ROLE_HIERARCHY = {
  'none': { level: 0, name: 'No Access', permissions: [] },
  'user': { level: 1, name: 'User', permissions: ['view_dashboard', 'view_customer_data'] },
  'manager': { level: 2, name: 'Manager', permissions: ['view_dashboard', 'view_customer_data', 'view_analytics', 'manage_customer_data'] },
  'admin': { level: 3, name: 'Admin', permissions: ['view_dashboard', 'view_customer_data', 'view_analytics', 'manage_customer_data', 'manage_users', 'create_users', 'assign_roles', 'delete_customer_data'] },
  'super_admin': { level: 4, name: 'Super Admin', permissions: ['view_dashboard', 'view_customer_data', 'view_analytics', 'manage_customer_data', 'manage_users', 'create_users', 'assign_roles', 'delete_customer_data', 'manage_roles', 'system_config'] }
};

// Permission definitions
const PERMISSIONS = {
  view_dashboard: 'Access dashboard',
  view_customer_data: 'View customer data',
  view_analytics: 'View analytics and reports',
  manage_customer_data: 'Manage customer data',
  manage_users: 'Manage user accounts',
  create_users: 'Create new users',
  assign_roles: 'Assign user roles',
  delete_customer_data: 'Delete customer data',
  manage_roles: 'Manage system roles',
  system_config: 'System configuration'
};

class RoleManager {
  constructor() {
    this.role = this.getStoredRole();
    this.user = null;
    this.token = null;
  }

  // Get role from localStorage
  getStoredRole() {
    if (typeof window === 'undefined') return 'none';
    return localStorage.getItem(STORAGE_KEYS.USER_ROLE) || 'none';
  }

  // Set role in localStorage with timestamp
  setStoredRole(role) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
    localStorage.setItem(STORAGE_KEYS.ROLE_TIMESTAMP, Date.now().toString());
  }

  // Get user data from localStorage
  getStoredUserData() {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    return data ? JSON.parse(data) : null;
  }

  // Set user data in localStorage
  setStoredUserData(userData) {
    if (typeof window === 'undefined') return;
    if (userData) {
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    }
  }

  // Get token from localStorage
  getStoredToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEYS.USER_TOKEN);
  }

  // Set token in localStorage
  setStoredToken(token) {
    if (typeof window === 'undefined') return;
    if (token) {
      localStorage.setItem(STORAGE_KEYS.USER_TOKEN, token);
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER_TOKEN);
    }
  }

  // Update role and persist to localStorage
  updateRole(role) {
    this.role = role;
    this.setStoredRole(role);
  }

  // Update user data
  updateUser(user) {
    this.user = user;
    if (user) {
      this.setStoredUserData({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified
      });
    }
  }

  // Update token
  updateToken(token) {
    this.token = token;
    this.setStoredToken(token);
  }

  // Check if user has any access
  hasAnyAccess() {
    const currentRole = this.role || this.getStoredRole();
    return currentRole && currentRole !== 'none';
  }

  // Check if user has a specific role
  hasRole(requiredRole) {
    const currentRole = this.role || this.getStoredRole();
    return currentRole === requiredRole;
  }

  // Check if user has minimum role level
  hasMinimumRole(minimumRole) {
    const currentRole = this.role || this.getStoredRole();
    const currentLevel = ROLE_HIERARCHY[currentRole]?.level || 0;
    const requiredLevel = ROLE_HIERARCHY[minimumRole]?.level || 0;
    return currentLevel >= requiredLevel;
  }

  // Check if user has a specific permission
  hasPermission(permission) {
    const currentRole = this.role || this.getStoredRole();
    const roleData = ROLE_HIERARCHY[currentRole];
    return roleData?.permissions?.includes(permission) || false;
  }

  // Get role display name
  getRoleDisplayName(role = null) {
    const currentRole = role || this.role || this.getStoredRole();
    return ROLE_HIERARCHY[currentRole]?.name || 'No Access';
  }

  // Get role level
  getRoleLevel(role = null) {
    const currentRole = role || this.role || this.getStoredRole();
    return ROLE_HIERARCHY[currentRole]?.level || 0;
  }

  // Get all permissions for current role
  getPermissions(role = null) {
    const currentRole = role || this.role || this.getStoredRole();
    return ROLE_HIERARCHY[currentRole]?.permissions || [];
  }

  // Get all available roles
  getAvailableRoles() {
    return Object.keys(ROLE_HIERARCHY);
  }

  // Check if user can assign a specific role
  canAssignRole(targetRole) {
    const currentRole = this.role || this.getStoredRole();
    const currentLevel = ROLE_HIERARCHY[currentRole]?.level || 0;
    const targetLevel = ROLE_HIERARCHY[targetRole]?.level || 0;
    return currentLevel >= targetLevel;
  }

  // Get assignable roles for current user
  getAssignableRoles() {
    const currentRole = this.role || this.getStoredRole();
    return Object.keys(ROLE_HIERARCHY).filter(role => 
      this.canAssignRole(role)
    );
  }

  // Clear all stored data
  clearAll() {
    if (typeof window === 'undefined') return;
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    this.role = 'none';
    this.user = null;
    this.token = null;
  }

  // Check if session is valid (optional expiry check)
  isSessionValid() {
    const timestamp = localStorage.getItem(STORAGE_KEYS.ROLE_TIMESTAMP);
    if (!timestamp) return false;
    
    const lastUpdate = parseInt(timestamp);
    const now = Date.now();
    const hoursDiff = (now - lastUpdate) / (1000 * 60 * 60);
    
    return hoursDiff < 24; // Session valid for 24 hours
  }

  // Get debug information
  getDebugInfo() {
    return {
      currentRole: this.role,
      storedRole: this.getStoredRole(),
      user: this.user,
      token: this.token ? 'Present' : 'Missing',
      hasAnyAccess: this.hasAnyAccess(),
      permissions: this.getPermissions(),
      localStorage: {
        userRole: this.getStoredRole(),
        userToken: this.getStoredToken() ? 'Present' : 'Missing',
        userData: this.getStoredUserData(),
        timestamp: localStorage.getItem(STORAGE_KEYS.ROLE_TIMESTAMP)
      }
    };
  }
}

// Create singleton instance
const roleManager = new RoleManager();

// Export the singleton and utilities
export { roleManager, ROLE_HIERARCHY, PERMISSIONS, STORAGE_KEYS };
export default roleManager; 