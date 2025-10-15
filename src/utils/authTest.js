/**
 * Authentication flow test utilities
 * Run these in browser console to test authentication
 */

// Test authentication status
export const testAuthStatus = () => {
  console.log('=== Authentication Status Test ===');
  
  const authData = {
    userToken: localStorage.getItem('userToken'),
    userRole: localStorage.getItem('userRole'),
    userData: localStorage.getItem('userData'),
    sessionKeys: Object.keys(sessionStorage),
    localStorageKeys: Object.keys(localStorage).filter(key => 
      key.includes('auth') || key.includes('token') || key.includes('user')
    )
  };
  
  console.log('Auth Data:', authData);
  
  // Check token format
  if (authData.userToken) {
    const isValidFormat = authData.userToken.startsWith('eyJ');
    console.log('Token Format Valid:', isValidFormat);
    console.log('Token Preview:', authData.userToken.substring(0, 50) + '...');
  }
  
  return authData;
};

// Clear all authentication data (for testing)
export const clearAuthForTest = () => {
  console.log('=== Clearing Authentication Data ===');
  
  const keysToRemove = [
    'userToken', 'userRole', 'userData', 'lastLogin',
    'sidebarPermissions', 'userPermissions', 'authState'
  ];
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
  
  sessionStorage.clear();
  console.log('Authentication data cleared');
};

// Test protected route access
export const testProtectedRoute = (route = '/procurement') => {
  console.log(`=== Testing Protected Route: ${route} ===`);
  
  const authStatus = testAuthStatus();
  
  if (!authStatus.userToken || !authStatus.userToken.startsWith('eyJ')) {
    console.log('❌ No valid Firebase token found');
    console.log('Expected: Token starting with "eyJ"');
    console.log('Action: Please sign in with Firebase authentication');
    return false;
  }
  
  if (!authStatus.userRole || authStatus.userRole === 'none') {
    console.log('❌ No valid role found');
    console.log('Expected: Valid role (user, admin, etc.)');
    return false;
  }
  
  console.log('✅ Authentication appears valid');
  console.log('You should be able to access protected routes');
  return true;
};

// Instructions for manual testing
export const testInstructions = () => {
  console.log(`
=== Authentication Testing Instructions ===

1. TEST LOGOUT FUNCTIONALITY:
   - Sign in to your account
   - Click the logout button
   - Verify you're redirected to /sign-in
   - Check console for "LOGOUT_SUCCESS" event
   - Try accessing /procurement - should redirect to /sign-in

2. TEST PROTECTED ROUTES:
   - While signed out, try accessing:
     - /procurement (should redirect to /sign-in)
     - /user-management (should redirect to /sign-in)
     - /dashboard (should redirect to /sign-in)

3. TEST AUTHENTICATION PERSISTENCE:
   - Sign in with valid Firebase account
   - Refresh the page
   - Should stay signed in
   - Token should start with "eyJ"

4. TEST INVALID TOKEN CLEANUP:
   - In console, run: localStorage.setItem('userToken', 'invalid-token')
   - Refresh page
   - Should clear invalid token and redirect to /sign-in

5. VERIFY SECURITY:
   - Check that bypass tokens are rejected
   - Check that expired tokens are handled
   - Check that all auth data is cleared on logout

Run testAuthStatus() to check current authentication state
Run clearAuthForTest() to clear authentication data
Run testProtectedRoute() to test route protection
  `);
};

// Make functions available globally for console testing
if (typeof window !== 'undefined') {
  window.testAuthStatus = testAuthStatus;
  window.clearAuthForTest = clearAuthForTest;
  window.testProtectedRoute = testProtectedRoute;
  window.testInstructions = testInstructions;
}
