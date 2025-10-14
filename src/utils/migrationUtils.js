// Migration utilities for granular sidebar permissions
// This ensures backward compatibility with existing users

import {
  sidebarPermissionsManager,
  DEFAULT_SIDEBAR_PERMISSIONS,
} from "./sidebarPermissions";

/**
 * Migrate existing users to have default sidebar permissions
 * This is called when the app loads to ensure all users have proper permissions
 */
export const migrateExistingUsers = () => {
  try {
    // Get current user data from localStorage
    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    const currentRole = userData.role || "none";

    // Check if user already has sidebar permissions
    const existingSidebarPermissions = localStorage.getItem(
      "userSidebarPermissions"
    );

    if (!existingSidebarPermissions && currentRole !== "none") {
      // User doesn't have sidebar permissions yet, set defaults
      console.log(
        `Migrating user with role '${currentRole}' to default sidebar permissions`
      );

      const defaultPermissions =
        DEFAULT_SIDEBAR_PERMISSIONS[currentRole] ||
        DEFAULT_SIDEBAR_PERMISSIONS.none;
      sidebarPermissionsManager.updatePermissions(
        currentRole,
        defaultPermissions
      );

      console.log("Migration completed successfully");
      return true;
    }

    return false; // No migration needed
  } catch (error) {
    console.error("Error during migration:", error);
    return false;
  }
};

/**
 * Check if user needs migration
 */
export const needsMigration = () => {
  try {
    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    const currentRole = userData.role || "none";
    const existingSidebarPermissions = localStorage.getItem(
      "userSidebarPermissions"
    );

    // User needs migration if:
    // 1. They have a valid role (not 'none')
    // 2. They don't have sidebar permissions stored yet
    return currentRole !== "none" && !existingSidebarPermissions;
  } catch (error) {
    console.error("Error checking migration status:", error);
    return false;
  }
};

/**
 * Force migration for testing purposes
 */
export const forceMigration = (role = "user") => {
  try {
    console.log(`Force migrating user to role '${role}'`);
    const defaultPermissions =
      DEFAULT_SIDEBAR_PERMISSIONS[role] || DEFAULT_SIDEBAR_PERMISSIONS.none;
    sidebarPermissionsManager.updatePermissions(role, defaultPermissions);
    console.log("Force migration completed");
    return true;
  } catch (error) {
    console.error("Error during force migration:", error);
    return false;
  }
};

/**
 * Get migration status for debugging
 */
export const getMigrationStatus = () => {
  try {
    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    const currentRole = userData.role || "none";
    const existingSidebarPermissions = localStorage.getItem(
      "userSidebarPermissions"
    );

    return {
      currentRole,
      hasSidebarPermissions: !!existingSidebarPermissions,
      needsMigration: needsMigration(),
      sidebarPermissions: existingSidebarPermissions
        ? JSON.parse(existingSidebarPermissions)
        : null,
      defaultPermissions:
        DEFAULT_SIDEBAR_PERMISSIONS[currentRole] ||
        DEFAULT_SIDEBAR_PERMISSIONS.none,
    };
  } catch (error) {
    console.error("Error getting migration status:", error);
    return {
      currentRole: "none",
      hasSidebarPermissions: false,
      needsMigration: false,
      sidebarPermissions: null,
      defaultPermissions: DEFAULT_SIDEBAR_PERMISSIONS.none,
      error: error.message,
    };
  }
};

export default {
  migrateExistingUsers,
  needsMigration,
  forceMigration,
  getMigrationStatus,
};
