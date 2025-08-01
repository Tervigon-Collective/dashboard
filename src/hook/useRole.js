import { useContext } from 'react';
import { UserContext } from '@/helper/UserContext';
import { roleManager } from '@/utils/roleManager';

export const useRole = () => {
  // First, try to get role from localStorage as fallback
  const getFallbackRole = () => {
    if (typeof window === 'undefined') return 'none';
    return localStorage.getItem('userRole') || 'none';
  };

  // Create fallback return object
  const createFallbackReturn = () => {
    const fallbackRole = getFallbackRole();
    return {
      role: fallbackRole,
      user: null,
      hasRole: (requiredRole) => fallbackRole === requiredRole,
      hasAnyRole: (requiredRoles) => requiredRoles.includes(fallbackRole),
      hasAllRoles: (requiredRoles) => requiredRoles.every(r => fallbackRole === r),
      hasMinimumRole: (minimumRole) => {
        const currentLevel = roleManager.getRoleLevel(fallbackRole);
        const requiredLevel = roleManager.getRoleLevel(minimumRole);
        return currentLevel >= requiredLevel;
      },
      getRoleDisplayName: (userRole = fallbackRole) => roleManager.getRoleDisplayName(userRole),
      canManageUsers: () => roleManager.hasPermission('manage_users'),
      canAccessAdmin: () => roleManager.hasMinimumRole('admin'),
      canManageRoles: () => roleManager.hasPermission('manage_roles'),
      canViewAnalytics: () => roleManager.hasPermission('view_analytics'),
      canCreateUsers: () => roleManager.hasPermission('create_users'),
      hasAnyAccess: () => fallbackRole && fallbackRole !== 'none',
      canAssignRoleTo: (targetRole) => roleManager.canAssignRole(targetRole),
      getAssignableRoles: () => roleManager.getAssignableRoles(),
      getAvailableRoles: () => roleManager.getAvailableRoles(),
      canAccessCustomerData: () => roleManager.hasPermission('view_customer_data'),
      canManageCustomerData: () => roleManager.hasPermission('manage_customer_data'),
      canDeleteCustomerData: () => roleManager.hasPermission('delete_customer_data'),
      getRoleLevel: (userRole = fallbackRole) => roleManager.getRoleLevel(userRole),
      VALID_ROLES: roleManager.getAvailableRoles(),
      ROLE_HIERARCHY: {},
      ROLE_DISPLAY_NAMES: {}
    };
  };

  try {
    // Try to get context
    const context = useContext(UserContext);
    
    // If context is not available, use fallback
    if (!context) {
      return createFallbackReturn();
    }

    const { role, user } = context;

    // Update role manager with current context
    if (role) {
      roleManager.updateRole(role);
    }
    if (user) {
      roleManager.updateUser(user);
    }

    // Check if user has a specific role
    const hasRole = (requiredRole) => {
      return roleManager.hasRole(requiredRole);
    };

    // Check if user has any of the specified roles
    const hasAnyRole = (requiredRoles) => {
      return requiredRoles.some(role => roleManager.hasRole(role));
    };

    // Check if user has all specified roles
    const hasAllRoles = (requiredRoles) => {
      return requiredRoles.every(role => roleManager.hasRole(role));
    };

    // Check if user has minimum role level
    const hasMinimumRole = (minimumRole) => {
      return roleManager.hasMinimumRole(minimumRole);
    };

    // Get role display name
    const getRoleDisplayName = (userRole = role) => {
      return roleManager.getRoleDisplayName(userRole);
    };

    // Check if user can manage other users
    const canManageUsers = () => {
      return roleManager.hasPermission('manage_users');
    };

    // Check if user can access admin features
    const canAccessAdmin = () => {
      return roleManager.hasMinimumRole('admin');
    };

    // Check if user can manage roles
    const canManageRoles = () => {
      return roleManager.hasPermission('manage_roles');
    };

    // Check if user can view analytics
    const canViewAnalytics = () => {
      return roleManager.hasPermission('view_analytics');
    };

    // Check if user can create new users
    const canCreateUsers = () => {
      return roleManager.hasPermission('create_users');
    };

    // Check if user has any access (not "none")
    const hasAnyAccess = () => {
      return roleManager.hasAnyAccess();
    };

    // Check if user can assign a specific role
    const canAssignRoleTo = (targetRole) => {
      return roleManager.canAssignRole(targetRole);
    };

    // Get all valid roles for current user
    const getAssignableRoles = () => {
      return roleManager.getAssignableRoles();
    };

    // Get all available roles (for display purposes)
    const getAvailableRoles = () => {
      return roleManager.getAvailableRoles();
    };

    // Check if user can access customer data
    const canAccessCustomerData = () => {
      return roleManager.hasPermission('view_customer_data');
    };

    // Check if user can manage customer data
    const canManageCustomerData = () => {
      return roleManager.hasPermission('manage_customer_data');
    };

    // Check if user can delete customer data
    const canDeleteCustomerData = () => {
      return roleManager.hasPermission('delete_customer_data');
    };

    // Get role level
    const getRoleLevel = (userRole = role) => {
      return roleManager.getRoleLevel(userRole);
    };

    return {
      role: roleManager.role,
      user,
      hasRole,
      hasAnyRole,
      hasAllRoles,
      hasMinimumRole,
      getRoleDisplayName,
      canManageUsers,
      canAccessAdmin,
      canManageRoles,
      canViewAnalytics,
      canCreateUsers,
      hasAnyAccess,
      canAssignRoleTo,
      getAssignableRoles,
      getAvailableRoles,
      canAccessCustomerData,
      canManageCustomerData,
      canDeleteCustomerData,
      getRoleLevel,
      VALID_ROLES: roleManager.getAvailableRoles(),
      ROLE_HIERARCHY: {},
      ROLE_DISPLAY_NAMES: {}
    };
  } catch (error) {
    console.error('Error in useRole hook:', error);
    return createFallbackReturn();
  }
}; 