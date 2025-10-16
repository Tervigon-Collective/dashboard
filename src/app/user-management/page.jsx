import MasterLayout from "@/masterLayout/MasterLayout";
import UserManagement from "@/components/UserManagement";
import SidebarPermissionGuard from "@/components/SidebarPermissionGuard";

export const metadata = {
  title: "User Groups - Admin Dashboard",
  description: "Manage user groups and permissions",
};

const UserManagementPage = () => {
  return (
    <>
      <SidebarPermissionGuard requiredSidebar="userManagement">
        <MasterLayout>
          <UserManagement />
        </MasterLayout>
      </SidebarPermissionGuard>
    </>
  );
};

export default UserManagementPage;
