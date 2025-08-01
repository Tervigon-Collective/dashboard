import { db } from "@/helper/firebase";
import { doc, setDoc, getDoc, collection, getDocs, updateDoc } from "firebase/firestore";

// Valid roles in hierarchy order
export const VALID_ROLES = ['none', 'user', 'manager', 'admin', 'super_admin'];

// Role hierarchy for permission checking
export const ROLE_HIERARCHY = {
  'none': 0,
  'user': 1,
  'manager': 2,
  'admin': 3,
  'super_admin': 4
};

// Role display names
export const ROLE_DISPLAY_NAMES = {
  'none': 'No Access',
  'user': 'User',
  'manager': 'Manager',
  'admin': 'Admin',
  'super_admin': 'Super Admin'
};

// Get valid roles for dropdown
export const getValidRoles = () => {
  return VALID_ROLES;
};

// Get role display name
export const getRoleDisplayName = (role = 'none') => {
  return ROLE_DISPLAY_NAMES[role] || 'No Access';
};

// Check if role is valid
export const isValidRole = (role) => {
  return VALID_ROLES.includes(role);
};

// Check if user has permission to assign a role
export const canAssignRole = (currentUserRole, targetRole) => {
  const currentLevel = ROLE_HIERARCHY[currentUserRole] || 0;
  const targetLevel = ROLE_HIERARCHY[targetRole] || 0;
  
  // Users can only assign roles at or below their own level
  return currentLevel >= targetLevel;
};

// Check if user can manage other users
export const canManageUsers = (userRole) => {
  const roleLevel = ROLE_HIERARCHY[userRole] || 0;
  return roleLevel >= ROLE_HIERARCHY['admin'];
};

// Check if user can manage roles
export const canManageRoles = (userRole) => {
  const roleLevel = ROLE_HIERARCHY[userRole] || 0;
  return roleLevel >= ROLE_HIERARCHY['super_admin'];
};

// Set user role
export const setUserRole = async (userId, role) => {
  try {
    if (!isValidRole(role)) {
      throw new Error('Invalid role');
    }
    
    await setDoc(doc(db, "users", userId), {
      role: role,
      updatedAt: new Date()
    }, { merge: true });
    
    return { success: true };
  } catch (error) {
    console.error('Error setting user role:', error);
    return { success: false, error: error.message };
  }
};

// Get user role
export const getUserRole = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      return userDoc.data().role || 'none';
    }
    return 'none';
  } catch (error) {
    console.error('Error getting user role:', error);
    return 'none';
  }
};

// Get all users
export const getAllUsers = async () => {
  try {
    const usersSnapshot = await getDocs(collection(db, "users"));
    const users = [];
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      users.push({
        uid: doc.id,
        email: userData.email,
        displayName: userData.displayName,
        photoURL: userData.photoURL,
        role: userData.role || 'none',
        status: userData.status || 'active',
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt
      });
    });
    
    return users;
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
};

// Get users by role
export const getUsersByRole = async (role) => {
  try {
    const allUsers = await getAllUsers();
    return allUsers.filter(user => user.role === role);
  } catch (error) {
    console.error('Error getting users by role:', error);
    return [];
  }
};

// Create new user with default role
export const createNewUser = async (userData) => {
  try {
    const { uid, email, displayName, photoURL } = userData;
    
    await setDoc(doc(db, "users", uid), {
      email: email,
      displayName: displayName || email,
      photoURL: photoURL || null,
      role: 'none', // Default role is none - no access
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      emailVerified: false
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error creating new user:', error);
    return { success: false, error: error.message };
  }
};

// Update user status
export const updateUserStatus = async (userId, status) => {
  try {
    await updateDoc(doc(db, "users", userId), {
      status: status,
      updatedAt: new Date()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating user status:', error);
    return { success: false, error: error.message };
  }
}; 