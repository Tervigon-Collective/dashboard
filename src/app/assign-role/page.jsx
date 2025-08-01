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
          
          <div className="row">
            <div className="col-12">
              <AssignRoleLayer />
            </div>
          </div>

          {/* Instructions */}
          <div className="row mt-4">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title">
                    <Icon icon="mdi:information" className="me-2" />
                    Role Assignment Guide
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6">
                      <h6>🔐 Role Hierarchy:</h6>
                      <ul>
                        <li><strong>Super Admin</strong> - Can assign any role, including other super admins</li>
                        <li><strong>Admin</strong> - Can assign admin, manager, and user roles</li>
                        <li><strong>Manager</strong> - Can view and manage team members</li>
                        <li><strong>User</strong> - Basic access to assigned features</li>
                      </ul>
                    </div>
                    <div className="col-md-6">
                      <h6>📋 How to Assign Roles:</h6>
                      <ol>
                        <li>Find the user in the list</li>
                        <li>Click "Assign Role" dropdown</li>
                        <li>Select the new role</li>
                        <li>Role will be updated immediately</li>
                        <li>User will see new permissions on next login</li>
                      </ol>
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

export default AssignRolePage;
