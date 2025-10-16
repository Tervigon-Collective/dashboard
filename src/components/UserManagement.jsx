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

const UserManagement = () => {
  const { user, token, role, hasOperation } = useUser();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState("");
  const [sidebarPermissions, setSidebarPermissions] = useState({});
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [showPermissionsPanel, setShowPermissionsPanel] = useState(false);
  const [sortBy, setSortBy] = useState("name");
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  const validRoles = getValidRoles();

  useEffect(() => {
    loadUsers();
  }, [selectedRole]);

  // Load sidebar permissions when a user is selected for editing
  useEffect(() => {
    if (selectedUser) {
      const defaultPermissions =
        DEFAULT_SIDEBAR_PERMISSIONS[selectedUser.role] ||
        DEFAULT_SIDEBAR_PERMISSIONS.none;

      setNewRole(selectedUser.role || "user");

      if (
        selectedUser.sidebarPermissions &&
        Object.keys(selectedUser.sidebarPermissions).length > 0
      ) {
        const actualPermissions = {};
        const allSidebarKeys = Object.keys(AVAILABLE_SIDEBAR_ITEMS);

        allSidebarKeys.forEach((key) => {
          const customPermission = selectedUser.sidebarPermissions[key];

          if (customPermission !== undefined) {
            if (
              typeof customPermission === "object" &&
              customPermission !== null
            ) {
              actualPermissions[key] = customPermission;
            } else if (typeof customPermission === "boolean") {
              const sidebarItem = AVAILABLE_SIDEBAR_ITEMS[key];
              actualPermissions[key] = {
                enabled: customPermission,
                operations: customPermission
                  ? sidebarItem?.availableOperations || ["read"]
                  : [],
              };
            }
          } else {
            actualPermissions[key] = defaultPermissions[key] || {
              enabled: false,
              operations: [],
            };
          }
        });

        setSidebarPermissions(actualPermissions);
      } else {
        setSidebarPermissions(defaultPermissions);
      }
    }
  }, [selectedUser]);

  const getAvailableSidebarItems = (userRole) => {
    return sidebarPermissionsManager.getAvailableSidebarItemsForRole(userRole);
  };

  const initializeSidebarPermissions = (userRole) => {
    const availableItems = getAvailableSidebarItems(userRole);
    const defaultPermissions = {};

    Object.keys(availableItems).forEach((key) => {
      defaultPermissions[key] = true;
    });

    setSidebarPermissions(defaultPermissions);
  };

  const handleSidebarPermissionChange = (permissionKey, isEnabled) => {
    setSidebarPermissions((prev) => {
      const newPermissions = { ...prev };
      const currentPermission = newPermissions[permissionKey] || {
        enabled: false,
        operations: [],
      };

      if (isEnabled) {
        // If enabling and no operations exist, add read permission by default
        // Otherwise, preserve existing operations
        const operations = currentPermission.operations.length > 0 
          ? currentPermission.operations 
          : ["read"];
        
        newPermissions[permissionKey] = {
          enabled: true,
          operations: operations,
        };
      } else {
        newPermissions[permissionKey] = {
          enabled: false,
          operations: [],
        };
      }

      return newPermissions;
    });
  };

  const handleCrudPermissionChange = (permissionKey, operation, isChecked) => {
    setSidebarPermissions((prev) => {
      const newPermissions = { ...prev };
      const currentPermission = newPermissions[permissionKey] || {
        enabled: false,
        operations: [],
      };

      let newOperations = [...currentPermission.operations];

      if (isChecked) {
        // Add operation if not already present
        if (!newOperations.includes(operation)) {
          newOperations.push(operation);
        }
      } else {
        // Remove operation
        newOperations = newOperations.filter((op) => op !== operation);
      }

      newPermissions[permissionKey] = {
        enabled: newOperations.length > 0,
        operations: newOperations,
      };

      return newPermissions;
    });
  };

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

    if (canChangeRole) {
      if (!selectedUser || !newRole) {
        setMessage({ type: "error", text: "Please select a user and role" });
        return;
      }

      if (!isValidRole(newRole)) {
        setMessage({ type: "error", text: "Invalid role selected" });
        return;
      }

      if (selectedUser.uid === user?.uid) {
        if (!canAssignRoleToSelf(role || "none", newRole)) {
          setMessage({
            type: "error",
            text: "You cannot promote yourself to a higher role. Only a super admin can promote you.",
          });
          return;
        }
      }
    } else {
      if (!selectedUser) {
        setMessage({ type: "error", text: "Please select a user" });
        return;
      }
    }

    setUpdating(true);
    try {
      const requestBody = {
        sidebarPermissions: sidebarPermissions,
      };

      if (canChangeRole && newRole) {
        requestBody.role = newRole;
      }

      const response = await fetch(
        `${config.api.baseURL}/api/users/${selectedUser.uid}/role`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (response.ok) {
        setMessage({
          type: "success",
          text: canChangeRole
            ? "User role and permissions updated successfully!"
            : "User permissions updated successfully!",
        });
        setSelectedUser(null);
        setNewRole("");
        setSidebarPermissions({});
        setShowPermissionsPanel(false);
        loadUsers();
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
        "Are you sure you want to delete this user? This will permanently remove all user data and permissions. This action cannot be undone."
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(
        `${config.api.baseURL}/api/users/${userId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        try {
          const firebaseResult = await deleteUserFromFirebase(userId);
          if (firebaseResult.success) {
            setMessage({
              type: "success",
              text: "User deleted successfully",
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
            text: "User deleted from backend but Firebase deletion failed.",
          });
        }
        loadUsers();
      } else {
        const errorData = await response.json();
        setMessage({
          type: "error",
          text: errorData.message || "Failed to delete user",
        });
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      setMessage({ type: "error", text: "Failed to delete user" });
    } finally {
      setDeleting(false);
    }
  };

  const handleUserSelect = (userData) => {
    setSelectedUser(userData);
    setShowPermissionsPanel(true);
  };

  const getStatusBadge = (userData) => {
    // Determine status based on user data
    if (userData.disabled) return { text: "Inactive", color: "bg-secondary" };
    if (userData.role === "super_admin")
      return { text: "Active", color: "bg-success" };
    if (userData.role === "admin")
      return { text: "Active", color: "bg-success" };
    if (userData.role === "manager")
      return { text: "Active", color: "bg-success" };
    return { text: "Active", color: "bg-success" };
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredUsers = users.filter((userData) => {
    const matchesSearch =
      userData.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userData.displayName?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return (a.displayName || a.email || "").localeCompare(
          b.displayName || b.email || ""
        );
      case "email":
        return (a.email || "").localeCompare(b.email || "");
      case "role":
        return (a.role || "").localeCompare(b.role || "");
      case "date":
        return (
          new Date(b.updatedAt?.toDate?.() || 0) -
          new Date(a.updatedAt?.toDate?.() || 0)
        );
      default:
        return 0;
    }
  });

  // Pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = sortedUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(sortedUsers.length / usersPerPage);

  if (!user) {
    return (
      <div className="alert alert-warning">
        <Icon icon="mdi:alert-circle" className="me-2" />
        Please sign in to manage users.
      </div>
    );
  }

  return (
    <div className="container-fluid p-4">
      {/* Header Section */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div>
              <h4 className="h5 mb-0 fw-semibold" style={{ color: "#374151" }}>
                User Groups
              </h4>
            </div>
            <div className="d-flex align-items-center gap-3">
              <div className="position-relative" style={{ width: "280px" }}>
                <Icon
                  icon="mdi:magnify"
                  className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"
                  style={{ zIndex: 10, fontSize: "1rem" }}
                />
                <input
                  type="text"
                  className="form-control ps-5"
                  placeholder="Search by email, phone, name"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    fontSize: "0.9rem",
                    padding: "10px 16px 10px 40px",
                    height: "40px",
                    border: "1px solid #d1d5db",
                  }}
                />
              </div>
              <div className="dropdown">
                <button
                  className="btn btn-outline-secondary dropdown-toggle d-flex align-items-center gap-2"
                  type="button"
                  data-bs-toggle="dropdown"
                  style={{
                    fontSize: "0.9rem",
                    padding: "10px 16px",
                    height: "40px",
                    border: "1px solid #d1d5db",
                  }}
                >
                  <Icon icon="mdi:sort" style={{ fontSize: "1rem" }} />
                  Sort
                </button>
                <ul className="dropdown-menu border-0 shadow-sm">
                  <li>
                    <button
                      className="dropdown-item"
                      onClick={() => setSortBy("name")}
                    >
                      <Icon icon="mdi:account" className="me-2" />
                      Name
                    </button>
                  </li>
                  <li>
                    <button
                      className="dropdown-item"
                      onClick={() => setSortBy("email")}
                    >
                      <Icon icon="mdi:email" className="me-2" />
                      Email
                    </button>
                  </li>
                  <li>
                    <button
                      className="dropdown-item"
                      onClick={() => setSortBy("role")}
                    >
                      <Icon icon="mdi:shield-account" className="me-2" />
                      Role
                    </button>
                  </li>
                  <li>
                    <button
                      className="dropdown-item"
                      onClick={() => setSortBy("date")}
                    >
                      <Icon icon="mdi:calendar" className="me-2" />
                      Date added
                    </button>
                  </li>
                </ul>
              </div>
              <button
                className="btn btn-primary d-flex align-items-center gap-2"
                onClick={() => {
                  // Navigate to create user page or open modal
                  window.location.href = "/create-user";
                }}
                style={{
                  fontSize: "0.9rem",
                  padding: "10px 16px",
                  height: "40px",
                }}
              >
                <Icon icon="mdi:plus" style={{ fontSize: "1rem" }} />
                Add User
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Message Display */}
      {message.text && (
        <div
          className={`alert alert-${
            message.type === "success" ? "success" : "danger"
          } d-flex align-items-center mb-4 mx-auto border-0 shadow-sm`}
          style={{ maxWidth: "800px" }}
        >
          <Icon
            icon={
              message.type === "success"
                ? "mdi:check-circle"
                : "mdi:alert-circle"
            }
            className="me-2"
            style={{ fontSize: "1.25rem" }}
          />
          <span style={{ fontSize: "0.9rem" }}>{message.text}</span>
        </div>
      )}

      <div className="row justify-content-center">
        {/* Left Panel - User Groups List */}
        <div
          className={`${
            showPermissionsPanel ? "col-lg-7" : "col-lg-10"
          } col-12`}
        >
          <div className="card border-0 shadow-sm">
            <div className="card-body p-4">
              {/* User Group Filters */}
              <div className="mb-4">
                <ul
                  className="nav nav-tabs"
                  role="tablist"
                  style={{ borderBottom: "1px solid #e5e7eb" }}
                >
                  <li className="nav-item" role="presentation">
                    <button
                      className={`nav-link ${
                        selectedRole === "all" ? "active" : ""
                      }`}
                      onClick={() => setSelectedRole("all")}
                      style={{
                        backgroundColor:
                          selectedRole === "all" ? "#f8fafc" : "transparent",
                        border: "none",
                        borderBottom:
                          selectedRole === "all"
                            ? "2px solid #6b7280"
                            : "2px solid transparent",
                        color: selectedRole === "all" ? "#374151" : "#6b7280",
                        fontWeight: selectedRole === "all" ? "500" : "400",
                        borderRadius: "0",
                        padding: "12px 16px",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (selectedRole !== "all") {
                          e.target.style.backgroundColor = "#f9fafb";
                          e.target.style.color = "#4b5563";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedRole !== "all") {
                          e.target.style.backgroundColor = "transparent";
                          e.target.style.color = "#6b7280";
                        }
                      }}
                    >
                      <Icon icon="mdi:account-group" className="me-2" />
                      All users
                    </button>
                  </li>
                  {/* No Access */}
                  <li className="nav-item" role="presentation">
                    <button
                      className={`nav-link ${
                        selectedRole === "none" ? "active" : ""
                      }`}
                      onClick={() => setSelectedRole("none")}
                      style={{
                        backgroundColor:
                          selectedRole === "none" ? "#f8fafc" : "transparent",
                        border: "none",
                        borderBottom:
                          selectedRole === "none"
                            ? "2px solid #6b7280"
                            : "2px solid transparent",
                        color: selectedRole === "none" ? "#374151" : "#6b7280",
                        fontWeight: selectedRole === "none" ? "500" : "400",
                        borderRadius: "0",
                        padding: "12px 16px",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (selectedRole !== "none") {
                          e.target.style.backgroundColor = "#f9fafb";
                          e.target.style.color = "#4b5563";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedRole !== "none") {
                          e.target.style.backgroundColor = "transparent";
                          e.target.style.color = "#6b7280";
                        }
                      }}
                    >
                      <Icon icon="mdi:account-off" className="me-2" />
                      No Access
                    </button>
                  </li>

                  {/* User */}
                  <li className="nav-item" role="presentation">
                    <button
                      className={`nav-link ${
                        selectedRole === "user" ? "active" : ""
                      }`}
                      onClick={() => setSelectedRole("user")}
                      style={{
                        backgroundColor:
                          selectedRole === "user" ? "#f8fafc" : "transparent",
                        border: "none",
                        borderBottom:
                          selectedRole === "user"
                            ? "2px solid #6b7280"
                            : "2px solid transparent",
                        color: selectedRole === "user" ? "#374151" : "#6b7280",
                        fontWeight: selectedRole === "user" ? "500" : "400",
                        borderRadius: "0",
                        padding: "12px 16px",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (selectedRole !== "user") {
                          e.target.style.backgroundColor = "#f9fafb";
                          e.target.style.color = "#4b5563";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedRole !== "user") {
                          e.target.style.backgroundColor = "transparent";
                          e.target.style.color = "#6b7280";
                        }
                      }}
                    >
                      <Icon icon="mdi:account" className="me-2" />
                      User
                    </button>
                  </li>

                  {/* Manager */}
                  <li className="nav-item" role="presentation">
                    <button
                      className={`nav-link ${
                        selectedRole === "manager" ? "active" : ""
                      }`}
                      onClick={() => setSelectedRole("manager")}
                      style={{
                        backgroundColor:
                          selectedRole === "manager"
                            ? "#f8fafc"
                            : "transparent",
                        border: "none",
                        borderBottom:
                          selectedRole === "manager"
                            ? "2px solid #6b7280"
                            : "2px solid transparent",
                        color:
                          selectedRole === "manager" ? "#374151" : "#6b7280",
                        fontWeight: selectedRole === "manager" ? "500" : "400",
                        borderRadius: "0",
                        padding: "12px 16px",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (selectedRole !== "manager") {
                          e.target.style.backgroundColor = "#f9fafb";
                          e.target.style.color = "#4b5563";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedRole !== "manager") {
                          e.target.style.backgroundColor = "transparent";
                          e.target.style.color = "#6b7280";
                        }
                      }}
                    >
                      <Icon icon="mdi:account-tie" className="me-2" />
                      Manager
                    </button>
                  </li>

                  {/* Admin */}
                  <li className="nav-item" role="presentation">
                    <button
                      className={`nav-link ${
                        selectedRole === "admin" ? "active" : ""
                      }`}
                      onClick={() => setSelectedRole("admin")}
                      style={{
                        backgroundColor:
                          selectedRole === "admin" ? "#f8fafc" : "transparent",
                        border: "none",
                        borderBottom:
                          selectedRole === "admin"
                            ? "2px solid #6b7280"
                            : "2px solid transparent",
                        color: selectedRole === "admin" ? "#374151" : "#6b7280",
                        fontWeight: selectedRole === "admin" ? "500" : "400",
                        borderRadius: "0",
                        padding: "12px 16px",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (selectedRole !== "admin") {
                          e.target.style.backgroundColor = "#f9fafb";
                          e.target.style.color = "#4b5563";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedRole !== "admin") {
                          e.target.style.backgroundColor = "transparent";
                          e.target.style.color = "#6b7280";
                        }
                      }}
                    >
                      <Icon icon="mdi:shield-account" className="me-2" />
                      Admin
                    </button>
                  </li>

                  {/* Super Admin */}
                  <li className="nav-item" role="presentation">
                    <button
                      className={`nav-link ${
                        selectedRole === "super_admin" ? "active" : ""
                      }`}
                      onClick={() => setSelectedRole("super_admin")}
                      style={{
                        backgroundColor:
                          selectedRole === "super_admin"
                            ? "#f8fafc"
                            : "transparent",
                        border: "none",
                        borderBottom:
                          selectedRole === "super_admin"
                            ? "2px solid #6b7280"
                            : "2px solid transparent",
                        color:
                          selectedRole === "super_admin"
                            ? "#374151"
                            : "#6b7280",
                        fontWeight:
                          selectedRole === "super_admin" ? "500" : "400",
                        borderRadius: "0",
                        padding: "12px 16px",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (selectedRole !== "super_admin") {
                          e.target.style.backgroundColor = "#f9fafb";
                          e.target.style.color = "#4b5563";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedRole !== "super_admin") {
                          e.target.style.backgroundColor = "transparent";
                          e.target.style.color = "#6b7280";
                        }
                      }}
                    >
                      <Icon icon="mdi:shield-crown" className="me-2" />
                      Super Admin
                    </button>
                  </li>
                </ul>
              </div>

              {/* Users Table */}
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <div className="table-responsive">
                  <table
                    className="table table-hover align-middle mb-0"
                    style={{ fontSize: "0.9rem" }}
                  >
                    <thead style={{ backgroundColor: "#f9fafb" }}>
                      <tr>
                        <th
                          className="border-0 fw-semibold text-muted py-4 px-3"
                          style={{
                            fontSize: "0.8rem",
                            letterSpacing: "0.5px",
                            textTransform: "uppercase",
                          }}
                        >
                          Name
                        </th>
                        <th
                          className="border-0 fw-semibold text-muted py-4 px-3"
                          style={{
                            fontSize: "0.8rem",
                            letterSpacing: "0.5px",
                            textTransform: "uppercase",
                          }}
                        >
                          Status
                        </th>
                        <th
                          className="border-0 fw-semibold text-muted py-4 px-3"
                          style={{
                            fontSize: "0.8rem",
                            letterSpacing: "0.5px",
                            textTransform: "uppercase",
                          }}
                        >
                          Role
                        </th>
                        <th
                          className="border-0 fw-semibold text-muted py-4 px-3"
                          style={{
                            fontSize: "0.8rem",
                            letterSpacing: "0.5px",
                            textTransform: "uppercase",
                          }}
                        >
                          Date Added
                        </th>
                        <th
                          className="border-0 fw-semibold text-muted py-4 px-3 text-center"
                          style={{
                            fontSize: "0.8rem",
                            letterSpacing: "0.5px",
                            textTransform: "uppercase",
                          }}
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentUsers.map((userData) => {
                        const status = getStatusBadge(userData);
                        return (
                          <tr
                            key={userData.uid}
                            style={{ borderBottom: "1px solid #f0f0f0" }}
                          >
                            <td className="py-4 px-3">
                              <div className="d-flex align-items-center gap-3">
                                {userData.photoURL ? (
                                  <img
                                    src={userData.photoURL}
                                    alt=""
                                    className="rounded-circle"
                                    style={{
                                      width: "40px",
                                      height: "40px",
                                      objectFit: "cover",
                                    }}
                                  />
                                ) : (
                                  <div
                                    className="rounded-circle d-flex align-items-center justify-content-center text-white fw-semibold"
                                    style={{
                                      width: "40px",
                                      height: "40px",
                                      backgroundColor: "#3b82f6",
                                      fontSize: "0.8rem",
                                    }}
                                  >
                                    {getInitials(
                                      userData.displayName || userData.email
                                    )}
                                  </div>
                                )}
                                <div>
                                  <div
                                    className="fw-medium mb-1"
                                    style={{
                                      color: "#1f2937",
                                      fontSize: "0.9rem",
                                    }}
                                  >
                                    {userData.displayName || userData.email}
                                  </div>
                                  <small
                                    className="text-muted"
                                    style={{ fontSize: "0.8rem" }}
                                  >
                                    {userData.email}
                                  </small>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-3">
                              <span
                                className={`badge ${status.color} rounded-pill`}
                                style={{
                                  padding: "6px 12px",
                                  fontSize: "0.75rem",
                                  fontWeight: "500",
                                }}
                              >
                                {status.text}
                              </span>
                            </td>
                            <td className="py-4 px-3">
                              <span
                                style={{ color: "#6b7280", fontSize: "0.9rem" }}
                              >
                                {getRoleDisplayName(userData.role || "user")}
                              </span>
                            </td>
                            <td className="py-4 px-3">
                              <span
                                className="text-muted"
                                style={{ fontSize: "0.85rem" }}
                              >
                                {userData.updatedAt
                                  ? new Date(
                                      userData.updatedAt.toDate()
                                    ).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })
                                  : "N/A"}
                              </span>
                            </td>
                            <td className="py-4 px-3">
                              <div className="d-flex justify-content-center">
                                <div className="dropdown">
                                  <button
                                    className="btn btn-light border-0 shadow-sm btn-sm d-flex align-items-center gap-2"
                                    type="button"
                                    data-bs-toggle="dropdown"
                                    style={{
                                      padding: "8px 16px",
                                      fontSize: "0.85rem",
                                      backgroundColor: "#f9fafb",
                                      height: "36px",
                                    }}
                                  >
                                    <Icon
                                      icon="mdi:dots-horizontal"
                                      style={{ fontSize: "1rem" }}
                                    />
                                    Manage
                                  </button>
                                  <ul
                                    className="dropdown-menu border-0 shadow-sm"
                                    style={{ minWidth: "200px" }}
                                  >
                                    <li>
                                      <button
                                        className="dropdown-item py-2"
                                        onClick={() =>
                                          handleUserSelect(userData)
                                        }
                                        style={{ fontSize: "0.9rem" }}
                                      >
                                        <Icon
                                          icon="mdi:shield-key"
                                          className="me-2"
                                        />
                                        Setup permissions
                                      </button>
                                    </li>
                                    {hasOperation("userManagement", "delete") &&
                                      (role === "admin" ||
                                        role === "super_admin") &&
                                      userData.uid !== user?.uid && (
                                        <>
                                          <li>
                                            <hr className="dropdown-divider my-1" />
                                          </li>
                                          <li>
                                            <button
                                              className="dropdown-item py-2 text-danger"
                                              onClick={() =>
                                                handleDeleteUser(userData.uid)
                                              }
                                              disabled={deleting}
                                              style={{ fontSize: "0.9rem" }}
                                            >
                                              <Icon
                                                icon="mdi:delete"
                                                className="me-2"
                                              />
                                              Remove user
                                            </button>
                                          </li>
                                        </>
                                      )}
                                  </ul>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  {!loading && sortedUsers.length > 0 && (
                    <div className="d-flex justify-content-between align-items-center mt-4 px-3 pb-3">
                      <div
                        className="text-muted"
                        style={{ fontSize: "0.85rem" }}
                      >
                        Showing {indexOfFirstUser + 1} to{" "}
                        {Math.min(indexOfLastUser, sortedUsers.length)} of{" "}
                        {sortedUsers.length} users
                      </div>
                      <nav>
                        <ul className="pagination pagination-sm mb-0">
                          <li
                            className={`page-item ${
                              currentPage === 1 ? "disabled" : ""
                            }`}
                          >
                            <button
                              className="page-link border-0 shadow-sm"
                              onClick={() => setCurrentPage(currentPage - 1)}
                              disabled={currentPage === 1}
                              style={{
                                backgroundColor:
                                  currentPage === 1 ? "#f9fafb" : "#fff",
                                color: "#6b7280",
                                padding: "8px 12px",
                              }}
                            >
                              <Icon
                                icon="mdi:chevron-left"
                                style={{ fontSize: "1rem" }}
                              />
                            </button>
                          </li>
                          {[...Array(totalPages)].map((_, index) => (
                            <li
                              key={index}
                              className={`page-item ${
                                currentPage === index + 1 ? "active" : ""
                              }`}
                            >
                              <button
                                className="page-link border-0 shadow-sm mx-1"
                                onClick={() => setCurrentPage(index + 1)}
                                style={{
                                  backgroundColor:
                                    currentPage === index + 1
                                      ? "#3b82f6"
                                      : "#fff",
                                  color:
                                    currentPage === index + 1
                                      ? "#fff"
                                      : "#6b7280",
                                  fontWeight:
                                    currentPage === index + 1 ? "500" : "400",
                                  padding: "8px 12px",
                                  minWidth: "36px",
                                }}
                              >
                                {index + 1}
                              </button>
                            </li>
                          ))}
                          <li
                            className={`page-item ${
                              currentPage === totalPages ? "disabled" : ""
                            }`}
                          >
                            <button
                              className="page-link border-0 shadow-sm"
                              onClick={() => setCurrentPage(currentPage + 1)}
                              disabled={currentPage === totalPages}
                              style={{
                                backgroundColor:
                                  currentPage === totalPages
                                    ? "#f9fafb"
                                    : "#fff",
                                color: "#6b7280",
                                padding: "8px 12px",
                              }}
                            >
                              <Icon
                                icon="mdi:chevron-right"
                                style={{ fontSize: "1rem" }}
                              />
                            </button>
                          </li>
                        </ul>
                      </nav>
                    </div>
                  )}
                </div>
              )}

              {/* No Users Message */}
              {!loading && sortedUsers.length === 0 && (
                <div className="text-center py-5">
                  <div
                    className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                    style={{
                      width: "64px",
                      height: "64px",
                      backgroundColor: "#f9fafb",
                    }}
                  >
                    <Icon
                      icon="mdi:account-search"
                      className="text-muted"
                      style={{ fontSize: "2rem" }}
                    />
                  </div>
                  <p className="text-muted mb-0" style={{ fontSize: "0.9rem" }}>
                    No users found matching your criteria
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - User Permissions */}
        {showPermissionsPanel && selectedUser && (
          <div className="col-lg-5">
            <div
              className="card border-0 shadow-sm"
              style={{ height: "fit-content", minHeight: "600px" }}
            >
              <div className="card-header bg-white border-bottom p-4">
                <div className="d-flex justify-content-between align-items-center">
                  <h5
                    className="mb-0 mx-auto fw-semibold"
                    style={{ color: "#1f2937", fontSize: "1.1rem" }}
                  >
                    User Permissions
                  </h5>
                  <button
                    className="btn btn-link text-muted p-0"
                    onClick={() => {
                      setShowPermissionsPanel(false);
                      setSelectedUser(null);
                      setNewRole("");
                      setSidebarPermissions({});
                    }}
                    style={{ fontSize: "1.25rem" }}
                  >
                    <Icon icon="mdi:close" />
                  </button>
                </div>
              </div>
              <div
                className="card-body p-4"
                style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}
              >
                {/* Selected User Details */}
                <div
                  className="d-flex align-items-center gap-3 p-4 mb-4 rounded-3"
                  style={{ backgroundColor: "#f9fafb" }}
                >
                  {selectedUser.photoURL ? (
                    <img
                      src={selectedUser.photoURL}
                      alt=""
                      className="rounded-circle"
                      style={{
                        width: "50px",
                        height: "50px",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center text-white fw-semibold"
                      style={{
                        width: "50px",
                        height: "50px",
                        backgroundColor: "#3b82f6",
                        fontSize: "0.9rem",
                      }}
                    >
                      {getInitials(
                        selectedUser.displayName || selectedUser.email
                      )}
                    </div>
                  )}
                  <div>
                    <div
                      className="fw-medium mb-1"
                      style={{ color: "#1f2937", fontSize: "1rem" }}
                    >
                      {selectedUser.displayName || selectedUser.email}
                    </div>
                    <small
                      className="text-muted"
                      style={{ fontSize: "0.85rem" }}
                    >
                      {selectedUser.email}
                    </small>
                  </div>
                </div>

                {/* Information Banner */}
                <div
                  className="d-flex align-items-start gap-2 p-3 mb-4 rounded-3"
                  style={{
                    backgroundColor: "#eff6ff",
                    border: "1px solid #bfdbfe",
                  }}
                >
                  <Icon
                    icon="mdi:information-outline"
                    className="text-primary mt-1"
                    style={{ fontSize: "1.1rem" }}
                  />
                  <small
                    style={{
                      color: "#1e40af",
                      fontSize: "0.85rem",
                      lineHeight: "1.5",
                    }}
                  >
                    Permission list will update when you select a different user
                    group
                  </small>
                </div>

                {/* User Group Dropdown */}
                <div className="mb-4 p-6">
                  <label
                    className="form-label fw-medium mb-2"
                    style={{ color: "#374151", fontSize: "0.9rem" }}
                  >
                    Role
                  </label>
                  <select
                    className="form-select border-0 shadow-sm"
                    value={newRole}
                    onChange={(e) => {
                      setNewRole(e.target.value);
                      if (e.target.value) {
                        initializeSidebarPermissions(e.target.value);
                      }
                    }}
                    style={{
                      backgroundColor: "#f9fafb",
                      fontSize: "0.9rem",
                      padding: "12px 16px",
                      height: "44px",
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
                </div>

                {/* Permissions List */}
                {newRole && newRole !== "none" && (
                  <div className="mb-4 px-4">
                    <label
                      className="form-label fw-medium mb-3"
                      style={{ color: "#374151", fontSize: "0.9rem" }}
                    >
                      Permissions
                    </label>
                    <div className="permissions-list">
                      {Object.keys(getAvailableSidebarItems(newRole))
                        .filter((key) => {
                          // Only show permissions that are required for the selected role
                          const sidebarItem = AVAILABLE_SIDEBAR_ITEMS[key];
                          return sidebarItem.requiredRoles.includes(newRole);
                        })
                        .map((key) => {
                          const sidebarItem = AVAILABLE_SIDEBAR_ITEMS[key];
                          const permission = sidebarPermissions[key];
                          const isEnabled =
                            permission?.enabled || permission === true;
                          const operations = permission?.operations || [];

                          return (
                            <div
                              key={key}
                              className="mb-4 p-5 border rounded-3 position-relative"
                              style={{
                                backgroundColor: "#ffffff",
                                borderColor: "#e5e7eb",
                                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                                transition: "all 0.2s ease",
                                cursor: "pointer",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = "#3b82f6";
                                e.currentTarget.style.boxShadow =
                                  "0 4px 12px rgba(59, 130, 246, 0.15)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = "#e5e7eb";
                                e.currentTarget.style.boxShadow =
                                  "0 1px 3px rgba(0, 0, 0, 0.1)";
                              }}
                              onClick={() =>
                                handleSidebarPermissionChange(key, !isEnabled)
                              }
                            >
                              {/* Main Permission Toggle */}
                              <div className="d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center gap-4 flex-grow-1">
                                  <div
                                    className="d-flex align-items-center justify-content-center rounded-2"
                                    style={{
                                      width: "48px",
                                      height: "48px",
                                      backgroundColor: isEnabled
                                        ? "#dbeafe"
                                        : "#f3f4f6",
                                      transition: "all 0.2s ease",
                                    }}
                                  >
                                    <Icon
                                      icon={sidebarItem.icon}
                                      style={{
                                        fontSize: "1.25rem",
                                        color: isEnabled
                                          ? "#3b82f6"
                                          : "#6b7280",
                                      }}
                                    />
                                  </div>
                                  <div className="flex-grow-1">
                                    <div
                                      className="fw-semibold mb-1"
                                      style={{
                                        color: "#111827",
                                        fontSize: "1rem",
                                      }}
                                    >
                                      {sidebarItem.label}
                                    </div>
                                    <div
                                      className="text-muted"
                                      style={{
                                        fontSize: "0.875rem",
                                        lineHeight: "1.5",
                                      }}
                                    >
                                      {sidebarItem.description}
                                    </div>
                                  </div>
                                </div>

                                {/* Minimal Toggle Switch */}
                                <div
                                  className="position-relative"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div
                                    style={{
                                      width: "2.5rem",
                                      height: "1.25rem",
                                      backgroundColor: isEnabled
                                        ? "#3b82f6"
                                        : "#d1d5db",
                                      borderRadius: "0.625rem",
                                      position: "relative",
                                      transition: "all 0.2s ease",
                                      cursor: "pointer",
                                    }}
                                    onClick={() =>
                                      handleSidebarPermissionChange(
                                        key,
                                        !isEnabled
                                      )
                                    }
                                  >
                                    <div
                                      style={{
                                        position: "absolute",
                                        top: "2px",
                                        left: isEnabled
                                          ? "calc(100% - 1rem)"
                                          : "2px",
                                        width: "1rem",
                                        height: "1rem",
                                        backgroundColor: "white",
                                        borderRadius: "50%",
                                        transition: "all 0.2s ease",
                                        boxShadow:
                                          "0 1px 2px rgba(0, 0, 0, 0.1)",
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* CRUD Permissions - Only show if the sidebar item supports CRUD */}
                              {isEnabled && sidebarItem.supportsCRUD && (
                                <div
                                  className="mt-4 pt-4"
                                  style={{ borderTop: "1px solid #f3f4f6" }}
                                >
                                  <div className="d-flex align-items-center mb-3">
                                    <span
                                      className="fw-medium text-muted"
                                      style={{
                                        fontSize: "0.75rem",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.5px",
                                      }}
                                    >
                                      Access Level
                                    </span>
                                  </div>
                                  <div className="d-flex flex-wrap gap-6">
                                    {sidebarItem.availableOperations?.includes(
                                      "create"
                                    ) && (
                                      <div className="form-check">
                                        <input
                                          className="form-check-input"
                                          type="checkbox"
                                          id={`${key}-create`}
                                          checked={operations.includes(
                                            "create"
                                          )}
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            handleCrudPermissionChange(
                                              key,
                                              "create",
                                              e.target.checked
                                            );
                                          }}
                                          style={{
                                            cursor: "pointer",
                                            marginTop: "2px",
                                            width: "1rem",
                                            height: "1rem",
                                          }}
                                        />
                                        <label
                                          className="form-check-label ms-2"
                                          htmlFor={`${key}-create`}
                                          style={{
                                            fontSize: "0.875rem",
                                            cursor: "pointer",
                                            color: "#374151",
                                          }}
                                        >
                                          Create
                                        </label>
                                      </div>
                                    )}
                                    {sidebarItem.availableOperations?.includes(
                                      "read"
                                    ) && (
                                      <div className="form-check">
                                        <input
                                          className="form-check-input"
                                          type="checkbox"
                                          id={`${key}-read`}
                                          checked={operations.includes("read")}
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            handleCrudPermissionChange(
                                              key,
                                              "read",
                                              e.target.checked
                                            );
                                          }}
                                          style={{
                                            cursor: "pointer",
                                            marginTop: "2px",
                                            width: "1rem",
                                            height: "1rem",
                                          }}
                                        />
                                        <label
                                          className="form-check-label ms-2"
                                          htmlFor={`${key}-read`}
                                          style={{
                                            fontSize: "0.875rem",
                                            cursor: "pointer",
                                            color: "#374151",
                                          }}
                                        >
                                          Read
                                        </label>
                                      </div>
                                    )}
                                    {sidebarItem.availableOperations?.includes(
                                      "update"
                                    ) && (
                                      <div className="form-check">
                                        <input
                                          className="form-check-input"
                                          type="checkbox"
                                          id={`${key}-update`}
                                          checked={operations.includes(
                                            "update"
                                          )}
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            handleCrudPermissionChange(
                                              key,
                                              "update",
                                              e.target.checked
                                            );
                                          }}
                                          style={{
                                            cursor: "pointer",
                                            marginTop: "2px",
                                            width: "1rem",
                                            height: "1rem",
                                          }}
                                        />
                                        <label
                                          className="form-check-label ms-2"
                                          htmlFor={`${key}-update`}
                                          style={{
                                            fontSize: "0.875rem",
                                            cursor: "pointer",
                                            color: "#374151",
                                          }}
                                        >
                                          Update
                                        </label>
                                      </div>
                                    )}
                                    {sidebarItem.availableOperations?.includes(
                                      "delete"
                                    ) && (
                                      <div className="form-check">
                                        <input
                                          className="form-check-input"
                                          type="checkbox"
                                          id={`${key}-delete`}
                                          checked={operations.includes(
                                            "delete"
                                          )}
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            handleCrudPermissionChange(
                                              key,
                                              "delete",
                                              e.target.checked
                                            );
                                          }}
                                          style={{
                                            cursor: "pointer",
                                            marginTop: "2px",
                                            width: "1rem",
                                            height: "1rem",
                                          }}
                                        />
                                        <label
                                          className="form-check-label ms-2"
                                          htmlFor={`${key}-delete`}
                                          style={{
                                            fontSize: "0.875rem",
                                            cursor: "pointer",
                                            color: "#374151",
                                          }}
                                        >
                                          Delete
                                        </label>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Save Changes Button */}
                <div className="d-flex justify-content-end gap-3 pt-4 border-top px-4">
                  <button
                    className="btn btn-light border-0 px-4"
                    onClick={() => {
                      setShowPermissionsPanel(false);
                      setSelectedUser(null);
                      setNewRole("");
                      setSidebarPermissions({});
                    }}
                    disabled={updating}
                    style={{
                      backgroundColor: "#f9fafb",
                      fontSize: "0.9rem",
                      padding: "12px 24px",
                      height: "44px",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary shadow-sm px-4"
                    onClick={handleRoleUpdate}
                    disabled={updating}
                    style={{
                      fontSize: "0.9rem",
                      padding: "12px 24px",
                      height: "44px",
                    }}
                  >
                    {updating ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Icon icon="mdi:check" className="me-2" />
                        Save changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
