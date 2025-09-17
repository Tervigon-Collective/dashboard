"use client";
import Breadcrumb from "@/components/Breadcrumb";
import MasterLayout from "@/masterLayout/MasterLayout";
import AssignRoleLayer from "@/components/AssignRoleLayer";
import RoleGuard from "@/components/RoleGuard";
import { Icon } from "@iconify/react/dist/iconify.js";

const AssignRolePage = () => {
  return (
    <>
      <RoleGuard requiredRole={["admin", "super_admin"]}>
        <MasterLayout>
          <Breadcrumb title='Assign Roles' />
          

              <AssignRoleLayer />

        </MasterLayout>
      </RoleGuard>
    </>
  );
};

export default AssignRolePage;
