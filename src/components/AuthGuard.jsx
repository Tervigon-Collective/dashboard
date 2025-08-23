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
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  // Define public routes that don't require authentication
  const publicRoutes = [
    "/sign-in",
    "/sign-up", 
    "/privacy-policy",
    "/terms-of-service",
    "/terms-condition"
  ];

  const isPublicRoute = publicRoutes.includes(pathname);

  useEffect(() => {
    if (!loading && !user && !isPublicRoute) {
      router.replace("/sign-in");
    }
  }, [user, loading, pathname, router, isPublicRoute]);

  if (loading) {
    return <Loader />;
  }
  
  // Allow access to public routes without authentication
  if (isPublicRoute) {
    return children;
  }
  
  if (!user && !isPublicRoute) {
    return <Loader />;
  }
  
  return children;
} 