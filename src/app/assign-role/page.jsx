"use client";
import Breadcrumb from "@/components/Breadcrumb";
import MasterLayout from "@/masterLayout/MasterLayout";
import AssignRoleLayer from "@/components/AssignRoleLayer";
import SidebarPermissionGuard from "@/components/SidebarPermissionGuard";
import { Icon } from "@iconify/react/dist/iconify.js";

const AssignRolePage = () => {
  return (
    <>
      <SidebarPermissionGuard requiredSidebar="userManagement">
        <MasterLayout>
          <Breadcrumb title="Assign Roles" />

          <AssignRoleLayer />
        </MasterLayout>
      </SidebarPermissionGuard>
    </>
  );
};

export default AssignRolePage;
