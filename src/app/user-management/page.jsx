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

          {/* Instructions */}
          <div className="row mt-4">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title">
                    <Icon icon="mdi:information" className="me-2" />
                    How to Manage User Roles
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6">
                      <h6>📋 Steps to Assign Roles:</h6>
                      <ol>
                        <li>Users must first sign up/sign in to your application</li>
                        <li>Their UID will be automatically created in Firebase Auth</li>
                        <li>Use this interface to assign roles to their UID</li>
                        <li>Roles will be stored in Firestore under the 'users' collection</li>
                      </ol>
                    </div>
                    <div className="col-md-6">
                      <h6>🔐 Role Hierarchy:</h6>
                      <ul>
                        <li><strong>Super Admin</strong> - Full system access, can manage roles</li>
                        <li><strong>Admin</strong> - Administrative access, can manage users</li>
                        <li><strong>Manager</strong> - Management access, can view analytics</li>
                        <li><strong>User</strong> - Basic access, personal dashboard</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </MasterLayout>
      </RoleGuard>
    </>
  );
};

export default UserManagementPage; 