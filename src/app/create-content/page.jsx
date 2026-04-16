"use client";

import SidebarPermissionGuard from "@/components/SidebarPermissionGuard";
import ContentGeneratorLayout from "@/components/content-generator/ContentGeneratorLayout";

export default function CreateContentPage() {
        return (
    <SidebarPermissionGuard requiredPermission="createContent">
      <ContentGeneratorLayout />
    </SidebarPermissionGuard>
  );
}
