"use client";
import { useUser } from "@/helper/UserContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthGuard({ children }) {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!user && pathname !== "/sign-in" && pathname !== "/sign-up") {
      router.replace("/sign-in");
    }
  }, [user, pathname, router]);

  if (!user && pathname !== "/sign-in" && pathname !== "/sign-up") {
    return <div>Loading...</div>;
  }

  return children;
} 