"use client";
import { useUser } from "@/helper/UserContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader } from "./child/GeneratedContent";
import {
  isUserAuthenticated,
  clearAuthData,
  logAuthEvent,
} from "@/utils/authUtils";

/**
 * AuthGuard protects routes from unauthenticated access.
 * Follows company security standards:
 * - Validates both Firebase user and valid token
 * - Redirects to /sign-in if authentication fails
 * - Prevents access to protected routes without proper authentication
 * - Clears invalid authentication data automatically
 */
export default function AuthGuard({ children }) {
  const { user, loading, role, token } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isValidating, setIsValidating] = useState(true);

  // Define public routes that don't require authentication
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

  // Check if user is authenticated through Firebase (regardless of role)
  const isAuthenticated = !!user;

  // Validate authentication on route changes
  useEffect(() => {
    const validateAuth = async () => {
      setIsValidating(true);

      // If it's a public route, allow access
      if (isPublicRoute) {
        setIsValidating(false);
        return;
      }

      // If still loading, wait
      if (loading) {
        return;
      }

      // Check authentication status
      if (!isAuthenticated) {
        logAuthEvent("AUTH_GUARD_FAILED", {
          pathname,
          hasUser: !!user,
          hasToken: !!token,
          role,
        });

        // Clear any invalid authentication data
        clearAuthData();

        // Redirect to sign-in
        router.replace("/sign-in");
        return;
      }

      logAuthEvent("AUTH_GUARD_SUCCESS", { pathname });

      setIsValidating(false);
    };

    validateAuth();
  }, [
    isAuthenticated,
    loading,
    pathname,
    router,
    isPublicRoute,
    user,
    role,
    token,
  ]);

  // Show loading while validating authentication
  if (loading || isValidating) {
    return <Loader />;
  }

  // Allow access to public routes without authentication
  if (isPublicRoute) {
    return children;
  }

  // If not authenticated and not a public route, show loading (redirect will happen)
  if (!isAuthenticated) {
    return <Loader />;
  }

  // User is authenticated, render protected content
  return children;
}
