"use client";
import { useUser } from "@/helper/UserContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader } from "./child/GeneratedContent";

/**
 * AuthGuard protects routes from unauthenticated access.
 * Redirects to /sign-in if user is not authenticated and not loading.
 * Allows access to public pages without authentication.
 */
export default function AuthGuard({ children }) {
  const { user, loading, role } = useUser();
  const router = useRouter();
  const pathname = usePathname();

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

  const isPublicRoute = publicRoutes.includes(pathname);

  // Check if user is authenticated through Firebase (regardless of role)
  const isAuthenticated = !!user;

  useEffect(() => {
    if (!loading && !isAuthenticated && !isPublicRoute) {
      router.replace("/sign-in");
    }
  }, [isAuthenticated, loading, pathname, router, isPublicRoute, user, role]);

  if (loading) {
    return <Loader />;
  }

  // Allow access to public routes without authentication
  if (isPublicRoute) {
    return children;
  }

  if (!isAuthenticated && !isPublicRoute) {
    return <Loader />;
  }

  return children;
}
