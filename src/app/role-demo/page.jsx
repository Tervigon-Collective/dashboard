import Breadcrumb from "@/components/Breadcrumb";
import MasterLayout from "@/masterLayout/MasterLayout";
import RoleGuard from "@/components/RoleGuard";
import RoleBasedContent from "@/components/RoleBasedContent";
import { useRole } from "@/hook/useRole";

const RoleDemoPage = () => {
  return (
    <>
      <MasterLayout>
        <Breadcrumb title='Role-Based Access Demo' />

        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">Role-Based Access Control Demo</h5>
              </div>
              <div className="card-body">
                
                {/* Admin Only Content */}
                <RoleBasedContent requiredRole="admin">
                  <div className="alert alert-success">
                    <h6>🔐 Admin Only Section</h6>
                    <p>This content is only visible to administrators and super admins.</p>
                    <ul>
                      <li>Manage user accounts</li>
                      <li>Access system settings</li>
                      <li>View analytics dashboard</li>
                    </ul>
                  </div>
                </RoleBasedContent>

                {/* Manager Only Content */}
                <RoleBasedContent requiredRole="manager">
                  <div className="alert alert-info">
                    <h6>👥 Manager Only Section</h6>
                    <p>This content is visible to managers, admins, and super admins.</p>
                    <ul>
                      <li>View team performance</li>
                      <li>Manage projects</li>
                      <li>Generate reports</li>
                    </ul>
                  </div>
                </RoleBasedContent>

                {/* User Only Content */}
                <RoleBasedContent requiredRole="user">
                  <div className="alert alert-warning">
                    <h6>👤 User Only Section</h6>
                    <p>This content is visible to all authenticated users.</p>
                    <ul>
                      <li>View personal dashboard</li>
                      <li>Update profile</li>
                      <li>Submit requests</li>
                    </ul>
                  </div>
                </RoleBasedContent>

                {/* Super Admin Only Content */}
                <RoleBasedContent requiredRole="super_admin">
                  <div className="alert alert-danger">
                    <h6>👑 Super Admin Only Section</h6>
                    <p>This content is only visible to super administrators.</p>
                    <ul>
                      <li>Manage system roles</li>
                      <li>Access all features</li>
                      <li>System configuration</li>
                    </ul>
                  </div>
                </RoleBasedContent>

                {/* Multiple Roles Content */}
                <RoleBasedContent requiredRole={["admin", "manager"]}>
                  <div className="alert alert-primary">
                    <h6>🎯 Admin & Manager Section</h6>
                    <p>This content is visible to both admins and managers.</p>
                    <ul>
                      <li>Team management</li>
                      <li>Performance reviews</li>
                      <li>Resource allocation</li>
                    </ul>
                  </div>
                </RoleBasedContent>

                {/* Fallback Content Example */}
                <RoleBasedContent 
                  requiredRole="admin" 
                  fallback={
                    <div className="alert alert-secondary">
                      <h6>⚠️ Access Restricted</h6>
                      <p>You need admin privileges to view this content.</p>
                    </div>
                  }
                >
                  <div className="alert alert-success">
                    <h6>🔐 Secret Admin Content</h6>
                    <p>This is hidden content that only admins can see!</p>
                  </div>
                </RoleBasedContent>

              </div>
            </div>
          </div>
        </div>

        {/* Protected Routes Example */}
        <div className="row mt-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">Protected Routes Demo</h5>
              </div>
              <div className="card-body">
                
                {/* Admin Protected Route */}
                <RoleGuard requiredRole="admin">
                  <div className="alert alert-success">
                    <h6>🛡️ Admin Protected Route</h6>
                    <p>This entire section is protected and only accessible to admins.</p>
                    <p>If you're not an admin, you would be redirected to the access denied page.</p>
                  </div>
                </RoleGuard>

                {/* Manager Protected Route */}
                <RoleGuard requiredRole="manager">
                  <div className="alert alert-info">
                    <h6>🛡️ Manager Protected Route</h6>
                    <p>This section is protected for managers and above.</p>
                  </div>
                </RoleGuard>

              </div>
            </div>
          </div>
        </div>

      </MasterLayout>
    </>
  );
};

export default RoleDemoPage; 