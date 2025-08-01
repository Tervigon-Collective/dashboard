import Breadcrumb from "@/components/Breadcrumb";
import MasterLayout from "@/masterLayout/MasterLayout";
import UserRoleManager from "@/components/UserRoleManager";
import RoleGuard from "@/components/RoleGuard";
import { Icon } from "@iconify/react/dist/iconify.js";

export const metadata = {
  title: "User Management - Admin Dashboard",
  description: "Manage user roles and permissions",
};

const UserManagementPage = () => {
  return (
    <>
      <RoleGuard requiredRole={["admin", "super_admin"]}>
        <MasterLayout>
          <Breadcrumb title='User Management' />
          
          <div className="row">
            <div className="col-12">
              <UserRoleManager />
            </div>
          </div>

         

        </MasterLayout>
      </RoleGuard>
    </>
  );
};

export default UserManagementPage; 