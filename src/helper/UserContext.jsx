"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import config from "@/config";
import { sidebarPermissionsManager } from "@/utils/sidebarPermissions";
import { migrateExistingUsers } from "@/utils/migrationUtils";
import { clearAuthData, isUserAuthenticated, securityCheck, logAuthEvent } from "@/utils/authUtils";

// Create the context with a default value
const UserContext = createContext({
  user: null,
  token: null,
  role: "none",
  loading: true,
  hasRole: () => false,
  hasAnyRole: () => false,
  hasAllRoles: () => false,
  getRoleDisplayName: () => "No Access",
  roleHierarchy: {},
  roleDisplayNames: {},
  fetchUserRole: async () => {},
  // New sidebar permission functions
  hasSidebarPermission: () => false,
  getAllSidebarPermissions: () => ({}),
  updateSidebarPermissions: () => {},
  // Operation-level permission functions
  hasOperation: () => false,
  getAllowedOperations: () => [],
  getPermissionLevel: () => "none",
  // Logout function
  logout: () => {},
});

// Export the context for use in other files
export { UserContext };

// LocalStorage keys
const STORAGE_KEYS = {
  USER_ROLE: "userRole",
  // USER_TOKEN: "userToken",
  USER_TOKEN: "idToken",
  USER_DATA: "userData",
};

// LocalStorage utilities
const localStorageUtils = {
  getRole: () => {
    if (typeof window === "undefined") return "none";
    return localStorage.getItem(STORAGE_KEYS.USER_ROLE) || "none";
  },

  setRole: (role) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
  },

  getToken: () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEYS.USER_TOKEN);
  },

  setToken: (token) => {
    if (typeof window === "undefined") return;
    if (token) {
      localStorage.setItem(STORAGE_KEYS.USER_TOKEN, token);
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER_TOKEN);
    }
  },

  getUserData: () => {
    if (typeof window === "undefined") return null;
    const data = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    return data ? JSON.parse(data) : null;
  },

  setUserData: (userData) => {
    if (typeof window === "undefined") return;
    if (userData) {
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    }
  },

  clearAll: () => {
    clearAuthData();
  },
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    console.warn("useUser: UserContext is not available");
    return {
      user: null,
      token: null,
      role: "none",
      loading: true,
      hasRole: () => false,
      hasAnyRole: () => false,
      hasAllRoles: () => false,
      getRoleDisplayName: () => "No Access",
      roleHierarchy: {},
      roleDisplayNames: {},
      fetchUserRole: async () => {},
    };
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [role, setRole] = useState("none");
  const [loading, setLoading] = useState(true);

  // Role hierarchy for permission checking
  const roleHierarchy = {
    none: 0,
    user: 1,
    manager: 2,
    admin: 3,
    super_admin: 4,
  };

  // Role display names
  const roleDisplayNames = {
    none: "No Access",
    user: "User",
    manager: "Manager",
    admin: "Admin",
    super_admin: "Super Admin",
  };

  // Check if user has a specific role
  const hasRole = (requiredRole) => {
    if (!role) return false;
    return role === requiredRole;
  };

  // Check if user has any of the specified roles
  const hasAnyRole = (requiredRoles) => {
    if (!role) return false;
    return requiredRoles.includes(role);
  };

  // Check if user has all specified roles
  const hasAllRoles = (requiredRoles) => {
    if (!role) return false;
    return requiredRoles.every((r) => role === r);
  };

  // Get role display name
  const getRoleDisplayName = (roleName = role) => {
    return roleDisplayNames[roleName] || "No Access";
  };

  // Fetch user role from backend
  const fetchUserRole = async (user) => {
    if (!user) {
      const defaultRole = "none";
      setRole(defaultRole);
      localStorageUtils.setRole(defaultRole);
      return;
    }

    try {
      const idToken = await user.getIdToken();
      setToken(idToken);
      localStorageUtils.setToken(idToken);

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${config.api.baseURL}/api/user/role`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const userRole = data.role || "user"; // Default to "user" instead of "none"
        setRole(userRole);
        localStorageUtils.setRole(userRole);

        // Store user data
        const userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          emailVerified: user.emailVerified,
          role: userRole,
          sidebarPermissions: data.sidebarPermissions || null, // Include sidebar permissions if provided
        };
        localStorageUtils.setUserData(userData);

        // Update sidebar permissions (use custom permissions if provided, otherwise use defaults)
        sidebarPermissionsManager.updatePermissions(
          userRole,
          data.sidebarPermissions
        );

        // Run migration for existing users if needed
        migrateExistingUsers();
      } else {
        const defaultRole = config.fallback?.defaultRole || "user";
        setRole(defaultRole);
        localStorageUtils.setRole(defaultRole);

        // Update sidebar permissions for default role
        sidebarPermissionsManager.updatePermissions(defaultRole);

        // Run migration for existing users if needed
        migrateExistingUsers();
      }
    } catch (error) {
      const defaultRole = config.fallback?.defaultRole || "user";
      setRole(defaultRole);
      localStorageUtils.setRole(defaultRole);

      // Update sidebar permissions for default role
      sidebarPermissionsManager.updatePermissions(defaultRole);

      // Run migration for existing users if needed
      migrateExistingUsers();
    }
  };

  // Check localStorage on mount for cached authentication with security validation
  useEffect(() => {
    const checkLocalStorage = () => {
      // Perform security check first
      if (!securityCheck()) {
        setLoading(false);
        return false;
      }
      
      const cachedRole = localStorageUtils.getRole();
      const cachedToken = localStorageUtils.getToken();
      const cachedUserData = localStorageUtils.getUserData();

      if (cachedRole && cachedRole !== "none" && cachedToken) {
        // Validate token format
        if (!cachedToken.startsWith('eyJ')) {
          console.warn('Invalid cached token format, clearing authentication');
          localStorageUtils.clearAll();
          setLoading(false);
          return false;
        }
        
        setRole(cachedRole);
        setToken(cachedToken);
        setUser({
          uid: cachedUserData.uid,
          email: cachedUserData.email,
          displayName: cachedUserData.displayName,
          emailVerified: cachedUserData.emailVerified,
        });
        setLoading(false);
        return true; // Found valid cached data
      }
      return false; // No cached data
    };

    // Check localStorage first
    if (checkLocalStorage()) {
      return; // If we found cached data, don't set up Firebase listener
    }

    // If no cached data, set up Firebase listener
    let mounted = true;

    try {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!mounted) return;

        setUser(user);

        if (user) {
          // Check if we have a cached role in localStorage
          const cachedRole = localStorageUtils.getRole();

          // If we have a valid cached role, use it immediately
          if (cachedRole && cachedRole !== "none") {
            setRole(cachedRole);
            setLoading(false); // Set loading to false immediately if we have cached data
          } else {
            // No cached role, set a default and stop loading
            const defaultRole = config.fallback?.defaultRole || "user";
            setRole(defaultRole);
            localStorageUtils.setRole(defaultRole);
            setLoading(false);
          }

          // Then fetch the latest role from backend (but don't block UI)
          // This runs in the background
          setTimeout(async () => {
            if (mounted) {
              try {
                await fetchUserRole(user);
              } catch (error) {
                // Silently handle fetch errors
              }
            }
          }, 100); // Small delay to let UI render first
        } else {
          setRole("none");
          setToken(null);
          localStorageUtils.clearAll();
          logAuthEvent('AUTH_STATE_CHANGED', { state: 'signed_out' });
          setLoading(false);
        }
      });

      return () => {
        mounted = false;
        unsubscribe();
      };
    } catch (error) {
      if (mounted) {
        setLoading(false);
      }
    }
  }, []);

  // New sidebar permission functions
  const hasSidebarPermission = (sidebarKey) => {
    return sidebarPermissionsManager.hasSidebarPermission(sidebarKey, role);
  };

  const getAllSidebarPermissions = () => {
    return sidebarPermissionsManager.getAllSidebarPermissions(role);
  };

  const updateSidebarPermissions = (customPermissions) => {
    return sidebarPermissionsManager.updatePermissions(role, customPermissions);
  };

  // Operation-level permission functions
  const hasOperation = (sidebarKey, operation) => {
    return sidebarPermissionsManager.hasOperation(sidebarKey, operation, role);
  };

  const getAllowedOperations = (sidebarKey) => {
    return sidebarPermissionsManager.getAllowedOperations(sidebarKey, role);
  };

  const getPermissionLevel = (sidebarKey) => {
    return sidebarPermissionsManager.getPermissionLevel(sidebarKey, role);
  };

  // Function to refresh the current user's token
  const refreshToken = async () => {
    try {
      // Get the current Firebase user from auth
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.error("No authenticated user found");
        return null;
      }

      const newToken = await currentUser.getIdToken(true); // Force refresh
      setToken(newToken);
      localStorageUtils.setToken(newToken);
      return newToken;
    } catch (error) {
      console.error("Error refreshing token:", error);
      return null;
    }
  };

  // Comprehensive logout function following security standards
  const logout = async () => {
    try {
      logAuthEvent('LOGOUT_ATTEMPT', { userId: user?.uid });
      
      // Clear all authentication data
      localStorageUtils.clearAll();
      sidebarPermissionsManager.clearAll();
      
      // Sign out from Firebase
      await auth.signOut();
      
      // Reset all state
      setUser(null);
      setToken(null);
      setRole("none");
      
      logAuthEvent('LOGOUT_SUCCESS', { userId: user?.uid });
      
      // Force page reload to ensure all components reset
      window.location.href = "/sign-in";
    } catch (error) {
      console.error("Error during logout:", error);
      logAuthEvent('LOGOUT_ERROR', { error: error.message });
      
      // Even if Firebase signOut fails, clear local data
      localStorageUtils.clearAll();
      sidebarPermissionsManager.clearAll();
      setUser(null);
      setToken(null);
      setRole("none");
      window.location.href = "/sign-in";
    }
  };

  const value = {
    user,
    token,
    role,
    loading,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    getRoleDisplayName,
    roleHierarchy,
    roleDisplayNames,
    fetchUserRole,
    refreshToken,
    localStorageUtils,
    // Sidebar permission functions
    hasSidebarPermission,
    getAllSidebarPermissions,
    updateSidebarPermissions,
    // Operation-level permission functions
    hasOperation,
    getAllowedOperations,
    getPermissionLevel,
    // Logout function
    logout,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
