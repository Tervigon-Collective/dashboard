"use client";
import { useUser } from "@/helper/UserContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader } from "./child/GeneratedContent";
import { Icon } from "@iconify/react/dist/iconify.js";

/**
 * SidebarPermissionGuard protects routes based on sidebar permissions.
 * Redirects to access-denied if user doesn't have permission for the current route.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to render if user has permission
 * @param {string} props.requiredSidebar - Required sidebar permission key
 * @param {React.ReactNode} props.fallback - Optional fallback component to show if access denied
 * @param {boolean} props.redirect - Whether to redirect to access-denied page (default: true)
 */
export default function SidebarPermissionGuard({
  children,
  requiredSidebar,
  fallback = null,
  redirect = true,
}) {
  const { user, loading, hasSidebarPermission } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  // Route to sidebar mapping
  const routeToSidebarMap = {
    "/dashboard": "dashboard",
    "/": "dashboard",
    "/historical-data": "dashboard",
    "/advanced-analytics": "dashboard",
    "/sku-list": "skuList",
    "/product-spend-summary": "productSpendSummary",
    "/procurement": "procurement",
    "/procurement/add-products": "procurement",
    "/procurement/edit-products": "procurement",
    "/entity-report": "entityReport",
    "/customer-data": "customerData",
    "/shipping": "shipping",
    "/user-management": "userManagement",
    "/create-user": "userManagement",
  };

  // Get the required sidebar from props or auto-detect from route
  const sidebarKey = requiredSidebar || routeToSidebarMap[pathname];

  useEffect(() => {
    if (!loading && user && sidebarKey) {
      const hasPermission = hasSidebarPermission(sidebarKey);

      if (!hasPermission && redirect) {
        router.replace("/access-denied");
      }
    }
  }, [user, loading, sidebarKey, hasSidebarPermission, redirect, router]);

  if (loading) {
    return <Loader />;
  }

  if (!user) {
    return <Loader />;
  }

  // If no sidebar key required or found, allow access
  if (!sidebarKey) {
    return children;
  }

  // Check if user has permission
  const hasPermission = hasSidebarPermission(sidebarKey);

  if (!hasPermission) {
    if (fallback) {
      return fallback;
    }
    if (redirect) {
      return (
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ height: "100vh" }}
        >
          <div className="text-center">
            <Icon
              icon="mdi:shield-alert"
              className="text-warning"
              style={{ fontSize: "4rem" }}
            />
            <h3 className="mt-3">Access Denied</h3>
            <p className="text-muted">
              You don't have permission to access this page.
            </p>
            <button
              onClick={() => router.push("/")}
              className="btn btn-primary"
            >
              <Icon icon="mdi:home" className="me-2" />
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }
    return null;
  }

  return children;
}
