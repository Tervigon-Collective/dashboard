"use client";
import { useRole } from "@/hook/useRole";
import { Icon } from "@iconify/react/dist/iconify.js";

const UserRoleInfo = () => {
  const { 
    role, 
    getRoleDisplayName, 
    getRoleLevel, 
    canManageUsers, 
    canAccessAdmin, 
    canManageRoles, 
    canViewAnalytics,
    getAvailableRoles 
  } = useRole();

  if (!role) {
    return (
      <div className="alert alert-warning">
        <Icon icon="mdi:alert-circle" className="me-2" />
        Loading user role information...
      </div>
    );
  }

  const roleLevel = getRoleLevel();
  const maxLevel = 4; // super_admin level

  return (
    <div className="card">
      <div className="card-header">
        <h5 className="card-title">
          <Icon icon="mdi:account-key" className="me-2" />
          User Role Information
        </h5>
      </div>
      <div className="card-body">
        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label className="form-label fw-bold">Current Role:</label>
              <div className="d-flex align-items-center">
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

            <div className="mb-3">
              <label className="form-label fw-bold">Role Level:</label>
              <div className="progress" style={{ height: '25px' }}>
                <div 
                  className={`progress-bar ${
                    roleLevel >= 4 ? 'bg-danger' :
                    roleLevel >= 3 ? 'bg-warning' :
                    roleLevel >= 2 ? 'bg-info' :
                    'bg-secondary'
                  }`}
                  style={{ width: `${(roleLevel / maxLevel) * 100}%` }}
                >
                  {roleLevel}/{maxLevel}
                </div>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">Available Roles:</label>
              <div className="d-flex flex-wrap gap-2">
                {getAvailableRoles().map((availableRole) => (
                  <span 
                    key={availableRole}
                    className={`badge ${
                      availableRole === role ? 'bg-primary' : 'bg-light text-dark'
                    }`}
                  >
                    {getRoleDisplayName(availableRole)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="mb-3">
              <label className="form-label fw-bold">Permissions:</label>
              <div className="list-group list-group-flush">
                <div className={`list-group-item d-flex justify-content-between align-items-center ${
                  canManageUsers() ? 'list-group-item-success' : 'list-group-item-secondary'
                }`}>
                  <span>
                    <Icon icon="mdi:account-multiple" className="me-2" />
                    Manage Users
                  </span>
                  {canManageUsers() ? (
                    <Icon icon="mdi:check-circle" className="text-success" />
                  ) : (
                    <Icon icon="mdi:close-circle" className="text-secondary" />
                  )}
                </div>

                <div className={`list-group-item d-flex justify-content-between align-items-center ${
                  canAccessAdmin() ? 'list-group-item-success' : 'list-group-item-secondary'
                }`}>
                  <span>
                    <Icon icon="mdi:shield-crown" className="me-2" />
                    Access Admin Panel
                  </span>
                  {canAccessAdmin() ? (
                    <Icon icon="mdi:check-circle" className="text-success" />
                  ) : (
                    <Icon icon="mdi:close-circle" className="text-secondary" />
                  )}
                </div>

                <div className={`list-group-item d-flex justify-content-between align-items-center ${
                  canManageRoles() ? 'list-group-item-success' : 'list-group-item-secondary'
                }`}>
                  <span>
                    <Icon icon="mdi:account-key" className="me-2" />
                    Manage Roles
                  </span>
                  {canManageRoles() ? (
                    <Icon icon="mdi:check-circle" className="text-success" />
                  ) : (
                    <Icon icon="mdi:close-circle" className="text-secondary" />
                  )}
                </div>

                <div className={`list-group-item d-flex justify-content-between align-items-center ${
                  canViewAnalytics() ? 'list-group-item-success' : 'list-group-item-secondary'
                }`}>
                  <span>
                    <Icon icon="mdi:chart-line" className="me-2" />
                    View Analytics
                  </span>
                  {canViewAnalytics() ? (
                    <Icon icon="mdi:check-circle" className="text-success" />
                  ) : (
                    <Icon icon="mdi:close-circle" className="text-secondary" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <div className="alert alert-info">
            <Icon icon="mdi:information" className="me-2" />
            <strong>Role Hierarchy:</strong> Super Admin → Admin → Manager → User
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserRoleInfo; 