"use client";
import { useUser } from "@/helper/UserContext";
import { useRole } from "@/hook/useRole";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader } from "./child/GeneratedContent";

/**
 * RoleGuard protects routes based on user roles.
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to render if user has required role
 * @param {string|Array} props.requiredRole - Required role(s) to access the route
 * @param {React.ReactNode} props.fallback - Optional fallback component to show if access denied
 * @param {boolean} props.redirect - Whether to redirect to access-denied page (default: true)
 */
export default function RoleGuard({ 
  children, 
  requiredRole, 
  fallback = null, 
  redirect = true 
}) {
  const { user, loading } = useUser();
  const { hasRole, hasAnyRole, hasAnyAccess } = useRole();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      let hasAccess = false;
      
      if (Array.isArray(requiredRole)) {
        hasAccess = hasAnyRole(requiredRole);
      } else {
        hasAccess = hasRole(requiredRole);
      }

      if (!hasAccess && redirect) {
        router.replace("/access-denied");
      }
    }
  }, [user, loading, requiredRole, hasRole, hasAnyRole, redirect, router]);

  if (loading) {
    return <Loader />;
  }

  if (!user) {
    return <Loader />;
  }

  // Check if user has any access at all
  if (!hasAnyAccess()) {
    if (fallback) {
      return fallback;
    }
    if (redirect) {
      return <Loader />;
    }
    return null;
  }

  // Check if user has required role
  let hasAccess = false;
  if (Array.isArray(requiredRole)) {
    hasAccess = hasAnyRole(requiredRole);
  } else {
    hasAccess = hasRole(requiredRole);
  }

  if (!hasAccess) {
    if (fallback) {
      return fallback;
    }
    if (redirect) {
      return <Loader />;
    }
    return null;
  }

  return children;
} 