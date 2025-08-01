"use client";
import { useRole } from "@/hook/useRole";
import { Icon } from "@iconify/react/dist/iconify.js";
import Link from "next/link";

const RoleBasedDashboard = () => {
  const { 
    role, 
    getRoleDisplayName, 
    canManageUsers, 
    canAccessAdmin, 
    canManageRoles, 
    canViewAnalytics 
  } = useRole();

  return (
    <div className="row">
      {/* Welcome Section */}
      <div className="col-12 mb-4">
        <div className="card">
          <div className="card-body">
            <div className="d-flex align-items-center">
              <div className="flex-grow-1">
                <h4 className="mb-1">Welcome back!</h4>
                <p className="text-muted mb-0">
                  You are logged in as: <strong>{getRoleDisplayName()}</strong>
                </p>
              </div>
              <div className="ms-3">
                <span className={`badge fs-6 px-3 py-2 ${
                  role === 'super_admin' ? 'bg-danger' :
                  role === 'admin' ? 'bg-warning' :
                  role === 'manager' ? 'bg-info' :
                  'bg-secondary'
                }`}>
                  {getRoleDisplayName()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Role-Based Quick Actions */}
      <div className="col-12 mb-4">
        <div className="card">
          <div className="card-header">
            <h5 className="card-title mb-0">
              <Icon icon="mdi:lightning-bolt" className="me-2" />
              Quick Actions
            </h5>
          </div>
          <div className="card-body">
            <div className="row">
              {/* All Users */}
              <div className="col-md-3 mb-3">
                <Link href="/profile" className="text-decoration-none">
                  <div className="card border h-100">
                    <div className="card-body text-center">
                      <Icon icon="mdi:account" className="text-primary fs-1 mb-2" />
                      <h6>My Profile</h6>
                      <small className="text-muted">View and edit your profile</small>
                    </div>
                  </div>
                </Link>
              </div>

              {/* Manager and above */}
              {canViewAnalytics() && (
                <div className="col-md-3 mb-3">
                  <Link href="/analytics" className="text-decoration-none">
                    <div className="card border h-100">
                      <div className="card-body text-center">
                        <Icon icon="mdi:chart-line" className="text-success fs-1 mb-2" />
                        <h6>Analytics</h6>
                        <small className="text-muted">View performance metrics</small>
                      </div>
                    </div>
                  </Link>
                </div>
              )}

              {/* Admin and above */}
              {canManageUsers() && (
                <div className="col-md-3 mb-3">
                  <Link href="/assign-role" className="text-decoration-none">
                    <div className="card border h-100">
                      <div className="card-body text-center">
                        <Icon icon="mdi:account-multiple" className="text-warning fs-1 mb-2" />
                        <h6>Manage Users</h6>
                        <small className="text-muted">Assign roles and permissions</small>
                      </div>
                    </div>
                  </Link>
                </div>
              )}

              {/* Super Admin only */}
              {canManageRoles() && (
                <div className="col-md-3 mb-3">
                  <Link href="/role-demo" className="text-decoration-none">
                    <div className="card border h-100">
                      <div className="card-body text-center">
                        <Icon icon="mdi:shield-crown" className="text-danger fs-1 mb-2" />
                        <h6>Role Demo</h6>
                        <small className="text-muted">Test role-based features</small>
                      </div>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Role-Based Content Sections */}
      <div className="col-12">
        <div className="row">
          {/* User Dashboard - All Users */}
          <div className="col-md-6 mb-4">
            <div className="card h-100">
              <div className="card-header">
                <h5 className="card-title mb-0">
                  <Icon icon="mdi:account" className="me-2" />
                  Personal Dashboard
                </h5>
              </div>
              <div className="card-body">
                <div className="row text-center">
                  <div className="col-4">
                    <h4 className="text-primary">12</h4>
                    <small>Tasks</small>
                  </div>
                  <div className="col-4">
                    <h4 className="text-success">5</h4>
                    <small>Completed</small>
                  </div>
                  <div className="col-4">
                    <h4 className="text-warning">3</h4>
                    <small>Pending</small>
                  </div>
                </div>
                <hr />
                <ul className="list-unstyled">
                  <li><Icon icon="mdi:check-circle" className="text-success me-2" />View personal tasks</li>
                  <li><Icon icon="mdi:check-circle" className="text-success me-2" />Update profile information</li>
                  <li><Icon icon="mdi:check-circle" className="text-success me-2" />Submit support requests</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Manager Dashboard */}
          {canViewAnalytics() && (
            <div className="col-md-6 mb-4">
              <div className="card h-100">
                <div className="card-header">
                  <h5 className="card-title mb-0">
                    <Icon icon="mdi:chart-line" className="me-2" />
                    Team Analytics
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row text-center">
                    <div className="col-4">
                      <h4 className="text-info">24</h4>
                      <small>Team Members</small>
                    </div>
                    <div className="col-4">
                      <h4 className="text-success">85%</h4>
                      <small>Performance</small>
                    </div>
                    <div className="col-4">
                      <h4 className="text-warning">12</h4>
                      <small>Projects</small>
                    </div>
                  </div>
                  <hr />
                  <ul className="list-unstyled">
                    <li><Icon icon="mdi:check-circle" className="text-success me-2" />View team performance</li>
                    <li><Icon icon="mdi:check-circle" className="text-success me-2" />Generate reports</li>
                    <li><Icon icon="mdi:check-circle" className="text-success me-2" />Manage projects</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Admin Dashboard */}
          {canManageUsers() && (
            <div className="col-md-6 mb-4">
              <div className="card h-100">
                <div className="card-header">
                  <h5 className="card-title mb-0">
                    <Icon icon="mdi:account-multiple" className="me-2" />
                    User Management
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row text-center">
                    <div className="col-4">
                      <h4 className="text-warning">156</h4>
                      <small>Total Users</small>
                    </div>
                    <div className="col-4">
                      <h4 className="text-success">142</h4>
                      <small>Active</small>
                    </div>
                    <div className="col-4">
                      <h4 className="text-danger">14</h4>
                      <small>Inactive</small>
                    </div>
                  </div>
                  <hr />
                  <ul className="list-unstyled">
                    <li><Icon icon="mdi:check-circle" className="text-success me-2" />Assign user roles</li>
                    <li><Icon icon="mdi:check-circle" className="text-success me-2" />Manage permissions</li>
                    <li><Icon icon="mdi:check-circle" className="text-success me-2" />View user activity</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Super Admin Dashboard */}
          {canManageRoles() && (
            <div className="col-md-6 mb-4">
              <div className="card h-100">
                <div className="card-header">
                  <h5 className="card-title mb-0">
                    <Icon icon="mdi:shield-crown" className="me-2" />
                    System Administration
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row text-center">
                    <div className="col-4">
                      <h4 className="text-danger">4</h4>
                      <small>Roles</small>
                    </div>
                    <div className="col-4">
                      <h4 className="text-success">99.9%</h4>
                      <small>Uptime</small>
                    </div>
                    <div className="col-4">
                      <h4 className="text-info">24/7</h4>
                      <small>Monitoring</small>
                    </div>
                  </div>
                  <hr />
                  <ul className="list-unstyled">
                    <li><Icon icon="mdi:check-circle" className="text-success me-2" />Manage system roles</li>
                    <li><Icon icon="mdi:check-circle" className="text-success me-2" />Configure permissions</li>
                    <li><Icon icon="mdi:check-circle" className="text-success me-2" />System monitoring</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Role Information */}
      <div className="col-12">
        <div className="card">
          <div className="card-header">
            <h5 className="card-title mb-0">
              <Icon icon="mdi:information" className="me-2" />
              Your Role Permissions
            </h5>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <h6>✅ What you can do:</h6>
                <ul>
                  <li>View your personal dashboard</li>
                  <li>Update your profile information</li>
                  <li>Submit support requests</li>
                  {canViewAnalytics() && (
                    <>
                      <li>View team analytics and reports</li>
                      <li>Manage team projects</li>
                    </>
                  )}
                  {canManageUsers() && (
                    <>
                      <li>Assign roles to other users</li>
                      <li>Manage user permissions</li>
                    </>
                  )}
                  {canManageRoles() && (
                    <>
                      <li>Create and manage system roles</li>
                      <li>Configure system-wide permissions</li>
                    </>
                  )}
                </ul>
              </div>
              <div className="col-md-6">
                <h6>🔒 What you cannot do:</h6>
                <ul>
                  {!canViewAnalytics() && (
                    <li>View team analytics and reports</li>
                  )}
                  {!canManageUsers() && (
                    <li>Assign roles to other users</li>
                  )}
                  {!canManageRoles() && (
                    <li>Create and manage system roles</li>
                  )}
                  <li>Access other users' personal data</li>
                  <li>Modify system configurations</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleBasedDashboard; 