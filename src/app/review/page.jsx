"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import SidebarPermissionGuard from "@/components/SidebarPermissionGuard";
import ReviewPromptsModal from "@/components/ReviewPromptsModal";

/**
 * Review Prompts Page
 * Allows users to review and edit AI-generated prompts before sending them to Freepik
 * Uses query parameter ?jobId=xxx instead of dynamic route
 */
export default function ReviewPromptsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get('jobId');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (jobId) {
      setIsModalOpen(true);
    }
  }, [jobId]);

  const handleClose = () => {
    setIsModalOpen(false);
    // Redirect to create-content page
    router.push('/create-content?activeTab=prompts');
  };

  if (!jobId) {
    return null;
  }

  return (
    <SidebarPermissionGuard requiredSidebar="createContent">
      <ReviewPromptsModal
        jobId={jobId}
        isOpen={isModalOpen}
        onClose={handleClose}
        onApproveSuccess={(jobId) => {
          router.push(`/create-content?activeTab=prompts&jobId=${jobId}`);
        }}
      />
    </SidebarPermissionGuard>
  );
}

