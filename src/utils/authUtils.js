/**
 * Authentication utilities following company security standards
 */

// Storage keys for authentication data
export const AUTH_KEYS = {
  USER_TOKEN: 'userToken',
  USER_ROLE: 'userRole', 
  USER_DATA: 'userData',
  LAST_LOGIN: 'lastLogin',
  SIDEBAR_PERMISSIONS: 'sidebarPermissions',
  USER_PERMISSIONS: 'userPermissions',
  AUTH_STATE: 'authState'
};

/**
 * Clear all authentication-related data from storage
 * Following security best practices
 */
export const clearAuthData = () => {
  if (typeof window === 'undefined') return;
  
  // Clear localStorage
  Object.values(AUTH_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
  
  // Clear any additional auth-related keys
  const additionalKeys = [
    'bypass-token',
    'temp-token',
    'refresh-token',
    'firebase:authUser',
    'firebase:host'
  ];
  
  additionalKeys.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
  
  // Clear sessionStorage completely for security
  sessionStorage.clear();
  
  // Clear cookies (if any auth-related cookies exist)
  document.cookie.split(";").forEach(cookie => {
    const eqPos = cookie.indexOf("=");
    const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
    if (name.trim().includes('auth') || name.trim().includes('token')) {
      document.cookie = `${name.trim()}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    }
  });
};

/**
 * Validate Firebase token format
 * Firebase JWT tokens start with 'eyJ'
 */
export const isValidFirebaseToken = (token) => {
  if (!token || typeof token !== 'string') return false;
  return token.startsWith('eyJ') && token.length > 100;
};

/**
 * Check if user has valid authentication
 * @param {Object} user - Firebase user object
 * @param {string} token - Firebase ID token
 * @param {string} role - User role
 * @returns {boolean}
 */
export const isUserAuthenticated = (user, token, role) => {
  return !!(
    user && 
    isValidFirebaseToken(token) && 
    role && 
    role !== 'none'
  );
};

/**
 * Get authentication status for debugging
 */
export const getAuthDebugInfo = () => {
  if (typeof window === 'undefined') return null;
  
  return {
    hasUser: !!localStorage.getItem(AUTH_KEYS.USER_DATA),
    hasToken: !!localStorage.getItem(AUTH_KEYS.USER_TOKEN),
    hasRole: !!localStorage.getItem(AUTH_KEYS.USER_ROLE),
    tokenFormat: localStorage.getItem(AUTH_KEYS.USER_TOKEN)?.substring(0, 10),
    role: localStorage.getItem(AUTH_KEYS.USER_ROLE),
    sessionStorageKeys: Object.keys(sessionStorage),
    localStorageKeys: Object.keys(localStorage).filter(key => 
      key.includes('auth') || key.includes('token') || key.includes('user')
    )
  };
};

/**
 * Security check: Detect and clear bypass tokens
 */
export const securityCheck = () => {
  if (typeof window === 'undefined') return;
  
  const token = localStorage.getItem(AUTH_KEYS.USER_TOKEN);
  
  // Check for bypass tokens or invalid formats
  if (token && (
    token.startsWith('bypass-') ||
    token.startsWith('temp-') ||
    token.startsWith('mock-') ||
    !isValidFirebaseToken(token)
  )) {
    console.warn('Security: Invalid token detected, clearing authentication');
    clearAuthData();
    return false;
  }
  
  return true;
};

/**
 * Log authentication events for security monitoring
 */
export const logAuthEvent = (event, details = {}) => {
  const timestamp = new Date().toISOString();
  console.log(`[AUTH-${event}] ${timestamp}`, details);
  
  // In production, you might want to send this to a logging service
  if (process.env.NODE_ENV === 'production') {
    // Example: send to monitoring service
    // monitoringService.logAuthEvent(event, details);
  }
};
