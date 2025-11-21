"use client";
import { useState, useEffect, useRef, useCallback } from "react";
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
  
  // Infinite scroll state
  const [displayedItemsCount, setDisplayedItemsCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const tableContainerRef = useRef(null);
  const permissionsPanelRef = useRef(null);
  const itemsPerPage = 20;

  const validRoles = getValidRoles();

  useEffect(() => {
    loadUsers();
  }, [selectedRole]);

  // Load sidebar permissions when a user is selected for editing
  useEffect(() => {
    if (selectedUser) {
      setNewRole(selectedUser.role || "user");

      // Fetch current permissions from server for this user
      fetchUserCurrentPermissions(selectedUser.uid);
    }
  }, [selectedUser]);

  // Function to fetch current user permissions from server
  const fetchUserCurrentPermissions = async (userId) => {
    try {
      const response = await fetch(
        `${config.api.baseURL}/api/users/uid/${userId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();

        // Check if user has sidebarPermissions in the response
        const userData = data.user;
        const serverPermissions = userData.sidebarPermissions || {};

        if (Object.keys(serverPermissions).length > 0) {
          // Use the actual permissions from the server
          const actualPermissions = {};
          const allSidebarKeys = Object.keys(AVAILABLE_SIDEBAR_ITEMS);

          allSidebarKeys.forEach((key) => {
            const serverPermission = serverPermissions[key];

            if (serverPermission !== undefined) {
              // Use server permission data
              actualPermissions[key] = {
                enabled: serverPermission.enabled || false,
                operations: serverPermission.operations || [],
              };
            } else {
              // Fallback to default for this role
              const defaultPermissions =
                DEFAULT_SIDEBAR_PERMISSIONS[selectedUser.role] ||
                DEFAULT_SIDEBAR_PERMISSIONS.none;
              actualPermissions[key] = defaultPermissions[key] || {
                enabled: false,
                operations: [],
              };
            }
          });

          setSidebarPermissions(actualPermissions);
        } else {
          // User has no custom permissions, use role defaults
          const defaultPermissions =
            DEFAULT_SIDEBAR_PERMISSIONS[selectedUser.role] ||
            DEFAULT_SIDEBAR_PERMISSIONS.none;
          setSidebarPermissions(defaultPermissions);
        }
      } else {
        // Fallback to default permissions
        const defaultPermissions =
          DEFAULT_SIDEBAR_PERMISSIONS[selectedUser.role] ||
          DEFAULT_SIDEBAR_PERMISSIONS.none;
        setSidebarPermissions(defaultPermissions);
      }
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      // Fallback to default permissions
      const defaultPermissions =
        DEFAULT_SIDEBAR_PERMISSIONS[selectedUser.role] ||
        DEFAULT_SIDEBAR_PERMISSIONS.none;
      setSidebarPermissions(defaultPermissions);
    }
  };

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
        const currentOperations = Array.isArray(currentPermission.operations)
          ? currentPermission.operations
          : [];
        const operations =
          currentOperations.length > 0 ? currentOperations : ["read"];

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

      // Ensure operations is always an array
      const currentOperations = Array.isArray(currentPermission.operations)
        ? currentPermission.operations
        : [];
      let newOperations = [...currentOperations];

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

  // Auto-scroll to permissions panel when it opens
  useEffect(() => {
    if (showPermissionsPanel && permissionsPanelRef.current) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        const panelElement = permissionsPanelRef.current;
        if (!panelElement) return;

        // For mobile/tablet (full-screen overlay)
        if (window.innerWidth < 992) {
          // Scroll to top of the panel with offset
          const panelTop = panelElement.getBoundingClientRect().top;
          const scrollOffset = window.pageYOffset || document.documentElement.scrollTop;
          const targetPosition = Math.max(0, panelTop + scrollOffset - 20); // 20px offset from top
          
          window.scrollTo({
            top: targetPosition,
            behavior: "smooth",
          });
        } else {
          // For desktop (side panel), scroll into view smoothly
          panelElement.scrollIntoView({
            behavior: "smooth",
            block: "start",
            inline: "nearest",
          });
          
          // Also ensure the panel header is visible
          const panelHeader = panelElement.querySelector('.card-header');
          if (panelHeader) {
            const headerTop = panelHeader.getBoundingClientRect().top;
            if (headerTop < 0) {
              window.scrollBy({
                top: headerTop - 20,
                behavior: "smooth",
              });
            }
          }
        }
      }, 150);
    }
  }, [showPermissionsPanel, selectedUser]);

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

  // Get displayed data for infinite scroll
  const getDisplayedData = (dataArray) => {
    return dataArray.slice(0, displayedItemsCount);
  };

  // Check if there's more data to load
  const hasMoreData = useCallback((dataArray) => {
    return displayedItemsCount < dataArray.length;
  }, [displayedItemsCount]);

  // Load more data callback
  const loadMoreData = useCallback(async () => {
    if (isLoadingMore || loading) return;
    
    setIsLoadingMore(true);
    // Simulate loading delay for skeleton effect
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setDisplayedItemsCount(prev => prev + itemsPerPage);
    setIsLoadingMore(false);
  }, [isLoadingMore, loading, itemsPerPage]);

  // Reset displayed items when search term, sort, or role filter changes
  useEffect(() => {
    setDisplayedItemsCount(20);
  }, [searchTerm, sortBy, selectedRole]);

  // Scroll detection for infinite scroll
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    // Handle wheel events to allow page scrolling when table reaches boundaries
    const handleWheel = (e) => {
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      const isAtTop = scrollTop <= 1;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
      
      if (e.deltaY > 0 && isAtBottom) {
        window.scrollBy({
          top: e.deltaY,
          behavior: 'auto'
        });
      } else if (e.deltaY < 0 && isAtTop) {
        window.scrollBy({
          top: e.deltaY,
          behavior: 'auto'
        });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: true });
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  if (!user) {
    return (
      <div className="alert alert-warning">
        <Icon icon="mdi:alert-circle" className="me-2" />
        Please sign in to manage users.
      </div>
    );
  }

  return (
    <>
      <style>{`
        .table-scroll-container {
          -webkit-overflow-scrolling: touch;
        }
        .table-scroll-container::-webkit-scrollbar {
          height: 10px;
          width: 10px;
        }
        .table-scroll-container::-webkit-scrollbar-track {
          background: #F3F4F6;
          border-radius: 6px;
        }
        .table-scroll-container::-webkit-scrollbar-thumb {
          background: #D1D5DB;
          border-radius: 6px;
          border: 2px solid #F3F4F6;
        }
        .table-scroll-container::-webkit-scrollbar-thumb:hover {
          background: #9CA3AF;
        }
        .table-scroll-container table {
          border-collapse: separate;
          border-spacing: 0;
        }
        .table-scroll-container table thead th,
        .table-scroll-container table tbody td {
          padding: 12px !important;
          box-sizing: border-box;
        }
        .table-scroll-container table tbody tr {
          border-bottom: 1px solid #F3F4F6;
        }
        .table-scroll-container table tbody tr:last-child {
          border-bottom: none;
        }
        .nav-tabs.flex-nowrap.overflow-auto::-webkit-scrollbar {
          display: none;
        }
        .nav-tabs.flex-nowrap.overflow-auto {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @media (max-width: 992px) {
          .table-scroll-container {
            max-height: calc(100vh - 350px) !important;
            min-height: 400px !important;
          }
        }
        @media (max-width: 768px) {
          .table-scroll-container {
            max-height: calc(100vh - 320px) !important;
            min-height: 350px !important;
          }
          .table-scroll-container table {
            min-width: 700px !important;
          }
          .user-permissions-panel {
            position: fixed !important;
            top: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            left: 0 !important;
            z-index: 1050 !important;
            background: rgba(0, 0, 0, 0.5) !important;
            padding: 1rem !important;
            overflow-y: auto !important;
          }
          .user-permissions-panel .card {
            max-height: 90vh !important;
            margin: 0 !important;
            min-height: auto !important;
          }
          .user-permissions-panel .card-body {
            max-height: calc(90vh - 120px) !important;
          }
        }
        @media (max-width: 576px) {
          .table-scroll-container {
            max-height: calc(100vh - 280px) !important;
            min-height: 300px !important;
          }
          .table-scroll-container table {
            min-width: 600px !important;
            font-size: 0.85rem !important;
          }
          .table-scroll-container th,
          .table-scroll-container td {
            padding: 10px 12px !important;
          }
          .container-fluid {
            padding-left: 0.75rem !important;
            padding-right: 0.75rem !important;
            padding-top: 0.75rem !important;
            padding-bottom: 0.75rem !important;
          }
        }
      `}</style>
      <div className="container-fluid px-2 px-sm-3 px-md-4 py-2 py-sm-3">
        {/* Message Display */}
        {message.text && (
          <div
            className={`alert alert-${
              message.type === "success" ? "success" : "danger"
            } d-flex align-items-center mb-3 border-0 shadow-sm`}
            style={{ fontSize: "0.9rem" }}
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
            <span>{message.text}</span>
          </div>
        )}

        <div className="row g-2 g-md-3">
          {/* Left Panel - User Groups List */}
          <div
            className={`${
              showPermissionsPanel ? "col-lg-7 col-xl-8" : "col-12"
            } col-12`}
          >
            <div className="card basic-data-table border-0 shadow-sm">
              <div className="card-header d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-2 p-3 p-md-4">
                <h5 className="card-title mb-0" style={{ fontSize: "clamp(1rem, 2.5vw, 1.25rem)" }}>User Groups</h5>
                {hasOperation("userManagement", "create") && (
                  <button
                    className="btn btn-primary d-inline-flex align-items-center"
                    onClick={() => {
                      window.location.href = "/create-user";
                    }}
                    style={{ 
                      gap: "6px", 
                      padding: "8px 12px",
                      fontSize: "clamp(0.8rem, 2vw, 0.9rem)",
                      whiteSpace: "nowrap"
                    }}
                  >
                    <Icon icon="lucide:plus" width="18" height="18" />
                    <span className="d-none d-sm-inline">Add New User</span>
                    <span className="d-sm-none">Add</span>
                  </button>
                )}
              </div>

              <div className="card-body d-flex flex-column" style={{ padding: "0.75rem 1rem" }}>
                {/* Search and Filter Controls */}
                <div className="row g-2 g-md-3 mb-2 mb-md-3">
                  <div className="col-12 col-md-6 col-lg-4">
                    <div className="input-group">
                      <span className="input-group-text bg-white">
                        <Icon icon="lucide:search" width="16" height="16" />
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search by email, phone, name"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-12 col-sm-6 col-md-3 col-lg-2">
                    <div className="dropdown w-100">
                      <button
                        className="btn btn-outline-secondary dropdown-toggle w-100 d-flex align-items-center justify-content-between"
                        type="button"
                        data-bs-toggle="dropdown"
                        style={{ fontSize: "0.9rem" }}
                      >
                        <span>Sort</span>
                      </button>
                      <ul className="dropdown-menu border-0 shadow-sm">
                        <li>
                          <button
                            className="dropdown-item d-flex align-items-center"
                            onClick={() => setSortBy("name")}
                            style={{ gap: "8px" }}
                          >
                            <Icon icon="mdi:account" width="16" height="16" />
                            <span>Name</span>
                          </button>
                        </li>
                        <li>
                          <button
                            className="dropdown-item d-flex align-items-center"
                            onClick={() => setSortBy("email")}
                            style={{ gap: "8px" }}
                          >
                            <Icon icon="mdi:email" width="16" height="16" />
                            <span>Email</span>
                          </button>
                        </li>
                        <li>
                          <button
                            className="dropdown-item d-flex align-items-center"
                            onClick={() => setSortBy("role")}
                            style={{ gap: "8px" }}
                          >
                            <Icon icon="mdi:shield-account" width="16" height="16" />
                            <span>Role</span>
                          </button>
                        </li>
                        <li>
                          <button
                            className="dropdown-item d-flex align-items-center"
                            onClick={() => setSortBy("date")}
                            style={{ gap: "8px" }}
                          >
                            <Icon icon="mdi:calendar" width="16" height="16" />
                            <span>Date added</span>
                          </button>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* User Group Filters */}
                <div className="mb-2 mb-md-3">
                  <ul
                    className="nav nav-tabs flex-nowrap overflow-auto"
                    role="tablist"
                    style={{ 
                      borderBottom: "1px solid #e5e7eb",
                      WebkitOverflowScrolling: "touch",
                      scrollbarWidth: "none",
                      msOverflowStyle: "none"
                    }}
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
                        padding: "10px 12px",
                        whiteSpace: "nowrap",
                        fontSize: "clamp(0.8rem, 2vw, 0.9rem)",
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
                      <div className="d-flex align-items-center" style={{ gap: "8px" }}>
                        <Icon 
                          icon="mdi:account-group" 
                          style={{ 
                            fontSize: "1.125rem",
                            lineHeight: 1,
                            display: "inline-flex",
                            alignItems: "center",
                          }} 
                        />
                        <span>All users</span>
                      </div>
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
                        padding: "10px 12px",
                        whiteSpace: "nowrap",
                        fontSize: "clamp(0.8rem, 2vw, 0.9rem)",
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
                      <div className="d-flex align-items-center" style={{ gap: "8px" }}>
                        <Icon 
                          icon="mdi:account-off" 
                          style={{ 
                            fontSize: "1.125rem",
                            lineHeight: 1,
                            display: "inline-flex",
                            alignItems: "center",
                          }} 
                        />
                        <span>No Access</span>
                      </div>
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
                        padding: "10px 12px",
                        whiteSpace: "nowrap",
                        fontSize: "clamp(0.8rem, 2vw, 0.9rem)",
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
                      <div className="d-flex align-items-center" style={{ gap: "8px" }}>
                        <Icon 
                          icon="mdi:account" 
                          style={{ 
                            fontSize: "1.125rem",
                            lineHeight: 1,
                            display: "inline-flex",
                            alignItems: "center",
                          }} 
                        />
                        <span>User</span>
                      </div>
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
                        padding: "10px 12px",
                        whiteSpace: "nowrap",
                        fontSize: "clamp(0.8rem, 2vw, 0.9rem)",
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
                      <div className="d-flex align-items-center" style={{ gap: "8px" }}>
                        <Icon 
                          icon="mdi:account-tie" 
                          style={{ 
                            fontSize: "1.125rem",
                            lineHeight: 1,
                            display: "inline-flex",
                            alignItems: "center",
                          }} 
                        />
                        <span>Manager</span>
                      </div>
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
                        padding: "10px 12px",
                        whiteSpace: "nowrap",
                        fontSize: "clamp(0.8rem, 2vw, 0.9rem)",
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
                      <div className="d-flex align-items-center" style={{ gap: "8px" }}>
                        <Icon 
                          icon="mdi:shield-account" 
                          style={{ 
                            fontSize: "1.125rem",
                            lineHeight: 1,
                            display: "inline-flex",
                            alignItems: "center",
                          }} 
                        />
                        <span>Admin</span>
                      </div>
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
                        padding: "10px 12px",
                        whiteSpace: "nowrap",
                        fontSize: "clamp(0.8rem, 2vw, 0.9rem)",
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
                      <div className="d-flex align-items-center" style={{ gap: "8px" }}>
                        <Icon 
                          icon="mdi:shield-crown" 
                          style={{ 
                            fontSize: "1.125rem",
                            lineHeight: 1,
                            display: "inline-flex",
                            alignItems: "center",
                          }} 
                        />
                        <span>Super Admin</span>
                      </div>
                    </button>
                  </li>
                </ul>
              </div>

                {/* Table */}
                <div
                  ref={tableContainerRef}
                  className="table-scroll-container"
                  style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    overflowX: "auto",
                    scrollBehavior: "smooth",
                    overscrollBehavior: "auto",
                    display: "flex",
                    flexDirection: "column",
                  }}
                  onScroll={(e) => {
                    const target = e.currentTarget;
                    const scrollTop = target.scrollTop;
                    const scrollHeight = target.scrollHeight;
                    const clientHeight = target.clientHeight;

                    if (
                      scrollTop + clientHeight >= scrollHeight - 10 &&
                      hasMoreData(sortedUsers) &&
                      !isLoadingMore &&
                      !loading
                    ) {
                      loadMoreData();
                    }
                  }}
                  onWheel={(e) => {
                    const target = e.currentTarget;
                    const scrollTop = target.scrollTop;
                    const scrollHeight = target.scrollHeight;
                    const clientHeight = target.clientHeight;
                    const isAtTop = scrollTop <= 1;
                    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

                    if (e.deltaY > 0 && isAtBottom) {
                      window.scrollBy({
                        top: e.deltaY,
                        behavior: "auto",
                      });
                    } else if (e.deltaY < 0 && isAtTop) {
                      window.scrollBy({
                        top: e.deltaY,
                        behavior: "auto",
                      });
                    }
                  }}
                >
                  <div className="table-responsive" style={{ flex: 1, minHeight: 0 }}>
                    <table
                      className="table table-hover align-middle mb-0"
                      style={{ fontSize: "14px" }}
                    >
                      <thead
                        style={{
                          backgroundColor: "#f9fafb",
                          borderBottom: "2px solid #e5e7eb",
                          position: "sticky",
                          top: 0,
                          zIndex: 10,
                        }}
                      >
                        <tr>
                          <th
                            style={{
                              fontWeight: "600",
                              color: "#374151",
                              padding: "12px",
                            }}
                          >
                            Name
                          </th>
                          <th
                            style={{
                              fontWeight: "600",
                              color: "#374151",
                              padding: "12px",
                            }}
                          >
                            Status
                          </th>
                          <th
                            style={{
                              fontWeight: "600",
                              color: "#374151",
                              padding: "12px",
                            }}
                          >
                            Role
                          </th>
                          <th
                            style={{
                              fontWeight: "600",
                              color: "#374151",
                              padding: "12px",
                            }}
                          >
                            Date Added
                          </th>
                          <th
                            style={{
                              fontWeight: "600",
                              color: "#374151",
                              padding: "12px",
                              textAlign: "center",
                            }}
                          >
                            Actions
                          </th>
                        </tr>
                      </thead>
                    <tbody>
                      {loading ? (
                        <>
                          {Array.from({ length: 5 }).map((_, rowIndex) => (
                            <tr key={`skeleton-${rowIndex}`}>
                              {Array.from({ length: 5 }).map((_, colIndex) => (
                                <td key={`skeleton-${rowIndex}-${colIndex}`}>
                                  <div
                                    className="skeleton"
                                    style={{
                                      height: "20px",
                                      backgroundColor: "#e5e7eb",
                                      borderRadius: "4px",
                                      animation:
                                        "skeletonPulse 1.5s ease-in-out infinite",
                                    }}
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </>
                      ) : sortedUsers.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="text-center py-4 text-muted">
                            <div className="d-flex flex-column align-items-center">
                              <p className="text-muted mb-0">
                                No users found matching your criteria
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <>
                          {getDisplayedData(sortedUsers).map((userData, index) => {
                        const status = getStatusBadge(userData);
                        return (
                          <tr
                            key={userData.uid}
                            style={{ 
                              borderBottom: "1px solid #F3F4F6",
                              transition: "background-color 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#F9FAFB";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "transparent";
                            }}
                          >
                            <td style={{ padding: "12px", verticalAlign: "middle" }}>
                              <div className="d-flex align-items-center gap-3">
                                {userData.photoURL ? (
                                  <img
                                    src={userData.photoURL}
                                    alt=""
                                    className="rounded-circle flex-shrink-0"
                                    style={{
                                      width: "40px",
                                      height: "40px",
                                      objectFit: "cover",
                                    }}
                                  />
                                ) : (
                                  <div
                                    className="rounded-circle d-flex align-items-center justify-content-center text-white fw-semibold flex-shrink-0"
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
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div
                                    className="fw-medium mb-1"
                                    style={{
                                      color: "#1f2937",
                                      fontSize: "14px",
                                    }}
                                  >
                                    {userData.displayName || userData.email}
                                  </div>
                                  <small className="text-muted" style={{ fontSize: "12px" }}>
                                    {userData.email}
                                  </small>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: "12px", verticalAlign: "middle" }}>
                              <span
                                className={`badge ${status.color} rounded-pill`}
                                style={{
                                  padding: "6px 12px",
                                  fontSize: "0.75rem",
                                  fontWeight: "500",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {status.text}
                              </span>
                            </td>
                            <td style={{ padding: "12px", verticalAlign: "middle" }}>
                              <span style={{ fontSize: "14px", color: "#374151" }}>
                                {getRoleDisplayName(userData.role || "user")}
                              </span>
                            </td>
                            <td style={{ padding: "12px", verticalAlign: "middle" }}>
                              <span style={{ fontSize: "14px", color: "#6b7280" }}>
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
                            <td style={{ padding: "12px", verticalAlign: "middle", textAlign: "center" }}>
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
                          {isLoadingMore && (
                            <>
                              {Array.from({ length: 5 }).map((_, rowIndex) => (
                                <tr key={`skeleton-more-${rowIndex}`}>
                                  {Array.from({ length: 5 }).map((_, colIndex) => (
                                    <td key={`skeleton-more-${rowIndex}-${colIndex}`}>
                                      <div
                                        className="skeleton"
                                        style={{
                                          height: "20px",
                                          backgroundColor: "#e5e7eb",
                                          borderRadius: "4px",
                                          animation:
                                            "skeletonPulse 1.5s ease-in-out infinite",
                                        }}
                                      />
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </>
                          )}
                        </>
                      )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Infinite Scroll Footer - Sticky at bottom */}
                {sortedUsers.length > 0 && (
                  <div
                    className="d-flex justify-content-between align-items-center px-3 py-2"
                    style={{
                      backgroundColor: "#f8f9fa",
                      borderTop: "1px solid #e5e7eb",
                      flexShrink: 0,
                      marginTop: "auto",
                    }}
                  >
                    <div style={{ fontSize: "0.875rem", color: "#6c757d" }}>
                      Showing{" "}
                      <strong>{getDisplayedData(sortedUsers).length}</strong> of{" "}
                      <strong>{sortedUsers.length}</strong> users
                    </div>
                    {hasMoreData(sortedUsers) && (
                      <div style={{ fontSize: "0.875rem", color: "#6c757d" }}>
                        Scroll down to load more
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

            {/* Right Panel - User Permissions */}
            {showPermissionsPanel && selectedUser && (
              <div 
                ref={permissionsPanelRef}
                className={`col-lg-5 col-xl-4 ${showPermissionsPanel ? "user-permissions-panel" : ""}`}
                style={{ scrollMarginTop: "20px" }}
              >
                <div
                  className="card border-0 shadow-sm"
                  style={{ 
                    height: "fit-content", 
                    minHeight: "600px"
                  }}
                >
                  <div className="card-header bg-white border-bottom p-3 p-md-4">
                    <div className="d-flex justify-content-between align-items-center">
                      <h5
                        className="mb-0 fw-semibold"
                        style={{ color: "#1f2937", fontSize: "clamp(0.95rem, 2vw, 1.1rem)" }}
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
                        style={{ fontSize: "1.25rem", minWidth: "32px", minHeight: "32px" }}
                        aria-label="Close"
                      >
                        <Icon icon="mdi:close" />
                      </button>
                    </div>
                  </div>
                  <div
                    className="card-body p-3 p-md-4"
                    style={{ 
                      maxHeight: "calc(100vh - 200px)", 
                      overflowY: "auto" 
                    }}
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
                              onClick={(e) => {
                                // Only toggle if clicking on the main container, not on checkboxes
                                if (
                                  e.target.type !== "checkbox" &&
                                  !e.target.closest(".form-check")
                                ) {
                                  handleSidebarPermissionChange(
                                    key,
                                    !isEnabled
                                  );
                                }
                              }}
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
    </>
  );
};

export default UserManagement;
