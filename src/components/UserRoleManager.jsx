"use client";
import { useState, useEffect } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import {
  setUserRole,
  getAllUsers,
  getUsersByRole,
  canManageUsers,
  canManageRoles,
  getRoleDisplayName,
  getValidRoles,
  isValidRole,
  canAssignRoleToSelf,
  deleteUserFromFirebase,
} from "@/utils/firebaseRoleManager";
import { useUser } from "@/helper/UserContext";
import {
  sidebarPermissionsManager,
  AVAILABLE_SIDEBAR_ITEMS,
  getAvailablePermissionLevels,
  PERMISSION_LEVEL_OPERATIONS,
  getPermissionLevelFromOperations,
  DEFAULT_SIDEBAR_PERMISSIONS,
} from "@/utils/sidebarPermissions";
import config from "@/config";

const UserRoleManager = () => {
  const { user, token, role, hasOperation, refreshToken } = useUser();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState("");
  const [sidebarPermissions, setSidebarPermissions] = useState({});
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const validRoles = getValidRoles();

  useEffect(() => {
    loadUsers();
  }, [selectedRole]);

  // Load sidebar permissions when a user is selected for editing
  useEffect(() => {
    if (selectedUser) {
      // Get default permissions for the user's current role
      const defaultPermissions =
        DEFAULT_SIDEBAR_PERMISSIONS[selectedUser.role] ||
        DEFAULT_SIDEBAR_PERMISSIONS.none;

      // Set newRole to current role (even if user can't change it, they can see it)
      setNewRole(selectedUser.role || "user");

      // If user has custom permissions, use ONLY those permissions
      if (
        selectedUser.sidebarPermissions &&
        Object.keys(selectedUser.sidebarPermissions).length > 0
      ) {
        const actualPermissions = {};

        // Get all available sidebar keys
        const allSidebarKeys = Object.keys(AVAILABLE_SIDEBAR_ITEMS);

        // For each available sidebar, check if user has custom permission or use default
        allSidebarKeys.forEach((key) => {
          const customPermission = selectedUser.sidebarPermissions[key];

          if (customPermission !== undefined) {
            // User has explicit permission for this sidebar
            if (
              typeof customPermission === "object" &&
              customPermission !== null
            ) {
              // New format: { enabled: boolean, operations: [] }
              actualPermissions[key] = customPermission;
            } else if (typeof customPermission === "boolean") {
              // Old format: boolean - convert to new format
              const sidebarItem = AVAILABLE_SIDEBAR_ITEMS[key];
              actualPermissions[key] = {
                enabled: customPermission,
                operations: customPermission
                  ? sidebarItem?.availableOperations || ["read"]
                  : [],
              };
            }
          } else {
            // User doesn't have explicit permission, use default for this sidebar
            actualPermissions[key] = defaultPermissions[key] || {
              enabled: false,
              operations: [],
            };
          }
        });

        setSidebarPermissions(actualPermissions);
      } else {
        // No custom permissions, use defaults
        setSidebarPermissions(defaultPermissions);
      }
    }
  }, [selectedUser]);

  // Get available sidebar items for a specific role
  const getAvailableSidebarItems = (userRole) => {
    return sidebarPermissionsManager.getAvailableSidebarItemsForRole(userRole);
  };

  // Initialize sidebar permissions when role changes
  const initializeSidebarPermissions = (userRole) => {
    const availableItems = getAvailableSidebarItems(userRole);
    const defaultPermissions = {};

    Object.keys(availableItems).forEach((key) => {
      defaultPermissions[key] = true; // Default to enabled for available items
    });

    setSidebarPermissions(defaultPermissions);
  };

  // Handle sidebar permission change (both enabled state and permission level)
  const handleSidebarPermissionChange = (permissionKey, isEnabled) => {
    setSidebarPermissions((prev) => {
      const newPermissions = { ...prev };

      if (isEnabled) {
        // If enabling, set to default "read_only" permission level
        const defaultOperations = PERMISSION_LEVEL_OPERATIONS.read_only || [
          "read",
        ];
        newPermissions[permissionKey] = {
          enabled: true,
          operations: defaultOperations,
        };
      } else {
        // If disabling, set to disabled
        newPermissions[permissionKey] = {
          enabled: false,
          operations: [],
        };
      }

      return newPermissions;
    });
  };

  // Handle permission level change
  const handlePermissionLevelChange = (permissionKey, level) => {
    setSidebarPermissions((prev) => ({
      ...prev,
      [permissionKey]: {
        enabled: level !== "none",
        operations:
          level === "none" ? [] : PERMISSION_LEVEL_OPERATIONS[level] || [],
      },
    }));
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      let userList;
      if (selectedRole === "all") {
        userList = await getAllUsers();
      } else {
        userList = await getUsersByRole(selectedRole);
      }
      setUsers(userList);
    } catch (error) {
      console.error("Error loading users:", error);
      setMessage({ type: "error", text: "Failed to load users" });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleUpdate = async () => {
    const canChangeRole = hasOperation("userManagement", "change_role");

    // If user can change roles, validate role selection
    if (canChangeRole) {
      if (!selectedUser || !newRole) {
        setMessage({ type: "error", text: "Please select a user and role" });
        return;
      }

      if (!isValidRole(newRole)) {
        setMessage({ type: "error", text: "Invalid role selected" });
        return;
      }

      // Check if user is trying to modify their own role
      if (selectedUser.uid === user?.uid) {
        // Prevent self-promotion to higher roles
        if (!canAssignRoleToSelf(role || "none", newRole)) {
          setMessage({
            type: "error",
            text: "You cannot promote yourself to a higher role. Only a super admin can promote you.",
          });
          return;
        }
      }
    } else {
      // If user can't change roles, they can only update sidebar permissions
      if (!selectedUser) {
        setMessage({ type: "error", text: "Please select a user" });
        return;
      }
    }

    setUpdating(true);
    try {
      // Get fresh token
      const currentToken = await refreshToken();
      if (!currentToken) {
        setMessage({
          type: "error",
          text: "Failed to refresh authentication token. Please sign out and sign back in.",
        });
        setUpdating(false);
        return;
      }

      // Prepare request body based on permissions
      const requestBody = {
        sidebarPermissions: sidebarPermissions,
      };

      // Only include role if user has change_role permission
      if (canChangeRole && newRole) {
        requestBody.role = newRole;
      }

      // Call backend API to update role and/or sidebar permissions
      const response = await fetch(
        `${config.api.baseURL}/api/users/${selectedUser.uid}/role`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${currentToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (response.ok) {
        const result = await response.json();
        setMessage({
          type: "success",
          text: canChangeRole
            ? "User role and permissions updated successfully!"
            : "User permissions updated successfully!",
        });
        setSelectedUser(null);
        setNewRole("");
        setSidebarPermissions({});
        loadUsers(); // Reload users
      } else {
        const errorData = await response.json();
        setMessage({
          type: "error",
          text: errorData.message || "Failed to update user information",
        });
      }
    } catch (error) {
      console.error("Error updating user:", error);
      setMessage({
        type: "error",
        text: "Failed to update user information",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (
      !confirm(
        "Are you sure you want to delete this user? This will:\n\n• Delete the user from the backend database\n• Delete the user from Firebase Firestore\n• Remove all user data and permissions\n\nThis action cannot be undone."
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      // Get fresh token
      const currentToken = await refreshToken();
      if (!currentToken) {
        setMessage({
          type: "error",
          text: "Failed to refresh authentication token. Please sign out and sign back in.",
        });
        setDeleting(false);
        return;
      }

      // First delete from backend API
      const response = await fetch(
        `${config.api.baseURL}/api/users/${userId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${currentToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        // Then delete from Firebase Authentication
        try {
          const firebaseResult = await deleteUserFromFirebase(userId);

          if (firebaseResult.success) {
            setMessage({
              type: "success",
              text: "User deleted successfully from both backend and Firebase",
            });
          } else {
            setMessage({
              type: "warning",
              text: `User deleted from backend but Firebase deletion failed: ${firebaseResult.error}`,
            });
          }
        } catch (firebaseError) {
          console.error("Firebase deletion error:", firebaseError);
          setMessage({
            type: "warning",
            text: "User deleted from backend but Firebase deletion failed. User may still exist in Firebase Authentication.",
          });
        }

        loadUsers(); // Reload users
      } else {
        const errorData = await response.json();
        setMessage({
          type: "error",
          text: errorData.message || "Failed to delete user from backend",
        });
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      setMessage({ type: "error", text: "Failed to delete user" });
    } finally {
      setDeleting(false);
    }
  };

  const canManage = async () => {
    const canManageUsersResult = await canManageUsers();
    const canManageRolesResult = await canManageRoles();
    return canManageUsersResult || canManageRolesResult;
  };

  if (!user) {
    return (
      <div className="alert alert-warning">
        <Icon icon="mdi:alert-circle" className="me-2" />
        Please sign in to manage user roles.
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h5 className="card-title">
          <Icon icon="mdi:account-multiple" className="me-2" />
          User Role Management
        </h5>
      </div>
      <div className="card-body">
        {/* Message Display */}
        {message.text && (
          <div
            className={`alert alert-${
              message.type === "success" ? "success" : "danger"
            } mb-3`}
          >
            <Icon
              icon={
                message.type === "success"
                  ? "mdi:check-circle"
                  : "mdi:alert-circle"
              }
              className="me-2"
            />
            {message.text}
          </div>
        )}

        {/* Role Filter */}
        <div className="row mb-3">
          <div className="col-md-6">
            <label className="form-label">Filter by Role:</label>
            <select
              className="form-select"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="all">All Roles</option>
              {validRoles.map((role) => (
                <option key={role} value={role}>
                  {getRoleDisplayName(role)}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-6 d-flex align-items-end">
            <button
              className="btn btn-primary"
              onClick={loadUsers}
              disabled={loading}
            >
              <Icon icon="mdi:refresh" className="me-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Delete Information */}
            <div className="alert alert-info mb-3">
              <Icon icon="mdi:information" className="me-2" />
              <strong>Note:</strong> When deleting a user, they will be removed
              from both the backend database and Firebase Firestore. This action
              cannot be undone and will permanently remove all user data and
              permissions.
            </div>

            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Current Role</th>
                    <th>Updated At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((userData) => (
                    <tr key={userData.uid}>
                      <td>
                        <code className="small">{userData.uid}</code>
                      </td>
                      {/* <td>{userData.displayName || 'N/A'}</td>  */}
                      <td>
                        <div className="d-flex align-items-center">
                          <img
                            src={
                              userData.photoURL ||
                              "/assets/images/make/dashborad-03.jpg"
                            }
                            alt=""
                            className="w-40-px h-40-px rounded-circle flex-shrink-0 me-12 overflow-hidden"
                          />
                          <div className="flex-grow-1">
                            <span className="text-md mb-0 fw-normal text-secondary-light">
                              {userData.displayName || userData.email}
                            </span>
                            <br />
                            <small className="text-muted">
                              {userData.email}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>{userData.email || "N/A"}</td>
                      <td>
                        <span
                          className={`badge ${
                            userData.role === "super_admin"
                              ? "bg-danger"
                              : userData.role === "admin"
                              ? "bg-warning"
                              : userData.role === "manager"
                              ? "bg-info"
                              : "bg-secondary"
                          }`}
                        >
                          {getRoleDisplayName(userData.role || "user")}
                        </span>
                      </td>
                      <td>
                        {userData.updatedAt
                          ? new Date(
                              userData.updatedAt.toDate()
                            ).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td>
                        <div className="btn-group" role="group">
                          {hasOperation("userManagement", "update") && (
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => {
                                setSelectedUser(userData);
                                setNewRole(userData.role || "user");
                              }}
                            >
                              <Icon icon="mdi:edit" className="me-1" />
                              Edit Role
                            </button>
                          )}
                          {hasOperation("userManagement", "delete") &&
                            (role === "admin" || role === "super_admin") &&
                            userData.uid !== user?.uid && (
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDeleteUser(userData.uid)}
                                disabled={deleting}
                                title="Delete user (irreversible)"
                              >
                                <Icon icon="mdi:delete" className="me-1" />
                                Delete
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Role Update Modal */}
        {selectedUser && (
          <div
            className="modal fade show d-block"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Update User Role</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setSelectedUser(null);
                      setNewRole("");
                      setSidebarPermissions({});
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">User:</label>
                    <input
                      type="text"
                      className="form-control"
                      value={selectedUser.email || selectedUser.uid}
                      readOnly
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Current Role:</label>
                    <input
                      type="text"
                      className="form-control"
                      value={getRoleDisplayName(selectedUser.role || "user")}
                      readOnly
                    />
                  </div>

                  {/* Only show role change dropdown if user has change_role permission */}
                  {hasOperation("userManagement", "change_role") ? (
                    <div className="mb-3">
                      <label className="form-label">New Role:</label>
                      <select
                        className="form-select"
                        value={newRole}
                        onChange={(e) => {
                          setNewRole(e.target.value);
                          if (e.target.value) {
                            initializeSidebarPermissions(e.target.value);
                          }
                        }}
                      >
                        <option value="">Select a role</option>
                        {validRoles.map((roleOption) => {
                          const isSelfPromotion =
                            selectedUser.uid === user?.uid &&
                            !canAssignRoleToSelf(role || "none", roleOption);

                          return (
                            <option
                              key={roleOption}
                              value={roleOption}
                              disabled={isSelfPromotion}
                            >
                              {getRoleDisplayName(roleOption)}
                              {isSelfPromotion
                                ? " (Self-promotion not allowed)"
                                : ""}
                            </option>
                          );
                        })}
                      </select>
                      {selectedUser.uid === user?.uid && (
                        <small className="text-muted">
                          You can only assign roles at or below your current
                          level to yourself.
                        </small>
                      )}
                    </div>
                  ) : (
                    <div className="alert alert-info">
                      <Icon icon="mdi:information" className="me-2" />
                      You don't have permission to change user roles. Only Super
                      Admins can change roles.
                    </div>
                  )}

                  {/* Sidebar Permissions Section */}
                  {newRole && newRole !== "none" && (
                    <div className="mb-3">
                      <label className="form-label">Sidebar Permissions:</label>
                      <div
                        className="border rounded p-3"
                        style={{ maxHeight: "200px", overflowY: "auto" }}
                      >
                        {Object.keys(getAvailableSidebarItems(newRole)).map(
                          (key) => {
                            const sidebarItem = AVAILABLE_SIDEBAR_ITEMS[key];
                            const permission = sidebarPermissions[key];
                            const isEnabled =
                              permission?.enabled || permission === true;
                            const currentLevel =
                              getPermissionLevelFromOperations(
                                permission?.operations ||
                                  (permission === true
                                    ? sidebarItem.availableOperations
                                    : [])
                              );
                            const availableLevels =
                              getAvailablePermissionLevels(key);

                            return (
                              <div
                                key={key}
                                className="mb-3 p-2 border rounded"
                              >
                                <div className="form-check">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`sidebar-${key}`}
                                    checked={isEnabled}
                                    onChange={(e) =>
                                      handleSidebarPermissionChange(
                                        key,
                                        e.target.checked
                                      )
                                    }
                                  />
                                  <label
                                    className="form-check-label"
                                    htmlFor={`sidebar-${key}`}
                                  >
                                    <Icon
                                      icon={sidebarItem.icon}
                                      className="me-2"
                                    />
                                    {sidebarItem.label}
                                    <small className="text-muted d-block">
                                      {sidebarItem.description}
                                    </small>
                                  </label>
                                </div>

                                {/* Permission Level Dropdown */}
                                {isEnabled && availableLevels.length > 1 && (
                                  <div className="mt-2">
                                    <label className="form-label small">
                                      Permission Level:
                                    </label>
                                    <select
                                      className="form-select form-select-sm"
                                      value={currentLevel}
                                      onChange={(e) =>
                                        handlePermissionLevelChange(
                                          key,
                                          e.target.value
                                        )
                                      }
                                    >
                                      {availableLevels.map((level) => (
                                        <option
                                          key={level.value}
                                          value={level.value}
                                        >
                                          {level.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </div>
                            );
                          }
                        )}
                      </div>
                      <small className="text-muted">
                        Select which sidebar items this user can access. Super
                        admins cannot be restricted.
                      </small>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setSelectedUser(null);
                      setNewRole("");
                      setSidebarPermissions({});
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleRoleUpdate}
                    disabled={updating}
                  >
                    {updating ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Updating...
                      </>
                    ) : (
                      "Update Role"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Users Message */}
        {!loading && users.length === 0 && (
          <div className="text-center py-4">
            <Icon
              icon="mdi:account-off"
              className="text-muted"
              style={{ fontSize: "3rem" }}
            />
            <p className="text-muted mt-2">
              No users found with the selected role.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserRoleManager;
