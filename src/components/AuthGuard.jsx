"use client";
import { useUser } from "@/helper/UserContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader } from "./child/GeneratedContent";

/**
 * AuthGuard protects routes from unauthenticated access.
 * Redirects to /sign-in if user is not authenticated and not loading.
 */
export default function AuthGuard({ children }) {
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user && pathname !== "/sign-in" && pathname !== "/sign-up") {
      router.replace("/sign-in");
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return <Loader />;
  }
  if (!user && pathname !== "/sign-in" && pathname !== "/sign-up") {
    return <Loader />;
  }
  return children;
} 