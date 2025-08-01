"use client";
import { useUser } from "@/helper/UserContext";

/**
 * RoleBasedContent conditionally renders content based on user roles.
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to render if user has required role
 * @param {string|Array} props.requiredRole - Required role(s) to show the content
 * @param {React.ReactNode} props.fallback - Optional fallback content to show if user doesn't have required role
 * @param {boolean} props.showForHigherRoles - Whether to show content for users with higher roles (default: true)
 */
export default function RoleBasedContent({ 
  children, 
  requiredRole, 
  fallback = null,
  showForHigherRoles = true 
}) {
  const { role, hasRole, hasAnyRole } = useUser();

  if (!role) {
    return fallback;
  }

  let hasAccess = false;
  
  if (Array.isArray(requiredRole)) {
    hasAccess = hasAnyRole(requiredRole);
  } else {
    hasAccess = hasRole(requiredRole);
  }

  // If showForHigherRoles is true, also check if user has a higher role
  if (showForHigherRoles && !hasAccess) {
    const roleHierarchy = {
      'super_admin': 4,
      'admin': 3,
      'manager': 2,
      'user': 1
    };
    
    const userLevel = roleHierarchy[role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;
    hasAccess = userLevel > requiredLevel;
  }

  if (hasAccess) {
    return children;
  }

  return fallback;
} 