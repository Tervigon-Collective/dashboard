"use client";
import Breadcrumb from "@/components/Breadcrumb";
import MasterLayout from "@/masterLayout/MasterLayout";
import CreateUserLayer from "@/components/CreateUserLayer";
import RoleGuard from "@/components/RoleGuard";
import { Icon } from "@iconify/react/dist/iconify.js";

const CreateUserPage = () => {
  return (
    <>
      <RoleGuard requiredRole={["admin", "super_admin"]}>
        <MasterLayout>
          <Breadcrumb title='Create New User' />
          
          <div className="row">
            <div className="col-12">
              <CreateUserLayer />
            </div>
          </div>

          {/* Instructions */}
          <div className="row mt-4">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title">
                    <Icon icon="mdi:information" className="me-2" />
                    User Creation Guide
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6">
                      <h6>📧 Email Setup:</h6>
                      <ul>
                        <li>Enter the user's email address</li>
                        <li>User will receive a password reset email</li>
                        <li>They can set their password and sign in</li>
                      </ul>
                    </div>
                    <div className="col-md-6">
                      <h6>🔐 Role Assignment:</h6>
                      <ul>
                        <li><strong>No Access</strong> - User cannot access anything</li>
                        <li><strong>User</strong> - Basic access to assigned features</li>
                        <li><strong>Manager</strong> - Team management and analytics</li>
                        <li><strong>Admin</strong> - User management and system access</li>
                        <li><strong>Super Admin</strong> - Full system control</li>
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

export default CreateUserPage; 