"use client";
import Breadcrumb from "@/components/Breadcrumb";
import MasterLayout from "@/masterLayout/MasterLayout";
import CreateUserLayer from "@/components/CreateUserLayer";
import SidebarPermissionGuard from "@/components/SidebarPermissionGuard";
import { Icon } from "@iconify/react/dist/iconify.js";

const CreateUserPage = () => {
  return (
    <>
      <SidebarPermissionGuard requiredSidebar="userManagement">
        <MasterLayout>
          <Breadcrumb title="Create New User" />

          <div className="row">
            <div className="col-12">
              <CreateUserLayer />
            </div>
          </div>
        </MasterLayout>
      </SidebarPermissionGuard>
    </>
  );
};

export default CreateUserPage;
