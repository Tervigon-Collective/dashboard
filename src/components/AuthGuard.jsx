"use client";
import { useUser } from "@/helper/UserContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import DashboardLoadingPage from "@/components/dashboard/DashboardLoadingPage";
import {
  clearAuthData,
  logAuthEvent,
} from "@/utils/authUtils";

/**
 * AuthGuard protects routes from unauthenticated access.
 * While auth resolves, shows metric skeletons only (no sidebar / guest shell).
 */
export default function AuthGuard({ children }) {
  const { user, loading, role, token } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const publicRoutes = [
    "/sign-in",
    "/sign-in/",
    "/sign-up",
    "/sign-up/",
    "/privacy-policy",
    "/privacy-policy/",
    "/terms-of-service",
    "/terms-of-service/",
    "/terms-condition",
    "/terms-condition/",
  ];

  const isQrPublicRoute =
    typeof pathname === "string" &&
    (pathname === "/receiving/qr" || pathname.startsWith("/receiving/qr/"));
  const isPublicRoute = publicRoutes.includes(pathname) || isQrPublicRoute;

  useEffect(() => {
    if (isPublicRoute || loading) return;

    if (!user) {
      logAuthEvent("AUTH_GUARD_FAILED", {
        pathname,
        hasUser: !!user,
        hasToken: !!token,
        role,
      });
      clearAuthData();
      router.replace("/sign-in");
    } else {
      logAuthEvent("AUTH_GUARD_SUCCESS", { pathname });
    }
  }, [user, loading, pathname, router, isPublicRoute, role, token]);

  if (isPublicRoute) {
    return children;
  }

  if (loading) {
    return <DashboardLoadingPage />;
  }

  if (!user) {
    return <DashboardLoadingPage />;
  }

  return children;
}
