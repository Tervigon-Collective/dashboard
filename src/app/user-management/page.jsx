import Breadcrumb from "@/components/Breadcrumb";
import MasterLayout from "@/masterLayout/MasterLayout";
import UserRoleManager from "@/components/UserRoleManager";
import SidebarPermissionGuard from "@/components/SidebarPermissionGuard";
import { Icon } from "@iconify/react/dist/iconify.js";

export const metadata = {
  title: "User Management - Admin Dashboard",
  description: "Manage user roles and permissions",
};

const UserManagementPage = () => {
  return (
    <>
      <SidebarPermissionGuard requiredSidebar="userManagement">
        <MasterLayout>
          <Breadcrumb title="User Management" />

          <div className="row">
            <div className="col-12">
              <UserRoleManager />
            </div>
          </div>
        </MasterLayout>
      </SidebarPermissionGuard>
    </>
  );
};

export default UserManagementPage;
