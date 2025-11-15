"use client";
import Link from "next/link";
import React from "react";
import { useUser } from "@/helper/UserContext";
import { getFirstAccessiblePage } from "@/utils/getFirstAccessiblePage";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const AccessDeniedLayer = () => {
  const { hasSidebarPermission, loading } = useUser();
  const router = useRouter();

  // Get the first accessible page for the user
  const firstAccessiblePage = !loading ? getFirstAccessiblePage(hasSidebarPermission) : "/";

  // Auto-redirect to first accessible page after a short delay
  useEffect(() => {
    if (!loading && firstAccessiblePage !== "/") {
      const timer = setTimeout(() => {
        router.push(firstAccessiblePage);
      }, 3000); // Redirect after 3 seconds

      return () => clearTimeout(timer);
    }
  }, [loading, firstAccessiblePage, router]);

  return (
    <div className="custom-bg">
      <div className="container container--xl">
        <div className="d-flex align-items-center justify-content-between py-24">
          <Link href={firstAccessiblePage} className="">
            <img src="/assets/images/logo.png" alt="" />
          </Link>
          <Link href={firstAccessiblePage} className="btn btn-outline-primary-600 text-sm">
            {" "}
            Go To Home{" "}
          </Link>
        </div>
        {/* <div class="py-res-120 text-center"> */}
        <div className="pt-48 pb-40 text-center">
          <div className="max-w-500-px mx-auto">
            <img src="/assets/images/dog/sd.jpg" alt="Access Denied Dog" />
          </div>
          <div className="max-w-700-px mx-auto mt-40">
            <h3 className="mb-24 max-w-1000-px">Access Denied</h3>
            <p className="text-neutral-500 max-w-700-px text-lg">
              You don't have authorization to get to this page. If it's not too
              much trouble, contact your site executive to demand access.
            </p>
            <Link
              href={firstAccessiblePage}
              className="btn btn-primary-600 px-32 py-16 flex-shrink-0 d-inline-flex align-items-center justify-content-center gap-8 mt-28"
            >
              <i className="ri-home-4-line" /> Go Back To Home
            </Link>
            {firstAccessiblePage !== "/" && (
              <p className="text-sm text-neutral-400 mt-3">
                Redirecting to your accessible page in a few seconds...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessDeniedLayer;
