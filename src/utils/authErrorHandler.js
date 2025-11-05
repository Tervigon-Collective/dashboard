/**
 * Centralized Authentication Error Handler
 * Handles all edge cases for token refresh failures
 */

/**
 * Handle authentication errors with appropriate recovery strategies
 * @param {Error} error - The error that occurred
 * @param {Object} options - Handler options
 * @returns {Promise<boolean>} - Returns true if error was handled, false otherwise
 */
export const handleAuthError = async (error, options = {}) => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    enableRedirect = true,
    showNotification = true,
  } = options;

  // Network failure detection
  const isNetworkError =
    error.message?.includes("network") ||
    error.message?.includes("fetch") ||
    error.code === "ECONNABORTED" ||
    error.code === "ERR_NETWORK";

  // Authentication failure detection
  const isAuthError =
    error.message?.includes("No authenticated user") ||
    error.message?.includes("auth/id-token-expired") ||
    error.code === "auth/id-token-expired" ||
    error.code === "auth/user-disabled" ||
    error.code === "auth/user-not-found";

  // Handle network failures with retry
  if (isNetworkError && options.retryCount < maxRetries) {
    const delay = retryDelay * Math.pow(2, options.retryCount || 0); // Exponential backoff

    await new Promise((resolve) => setTimeout(resolve, delay));

    // Return signal to retry
    return { shouldRetry: true, delay };
  }

  // Handle authentication failures
  if (isAuthError) {
    console.error("🚫 Authentication error:", error.message);

    // Clear all auth data
    if (typeof window !== "undefined") {
      clearAuthData();

      // Show user-friendly notification
      if (showNotification) {
        showAuthErrorNotification(error);
      }

      // Redirect to sign-in if enabled
      if (enableRedirect) {
        // Small delay to ensure notification is seen
        setTimeout(() => {
          window.location.href = "/sign-in";
        }, 1500);
      }
    }

    return { shouldRetry: false, handled: true };
  }

  return { shouldRetry: false, handled: false };
};

/**
 * Clear all authentication data
 */
const clearAuthData = () => {
  if (typeof window === "undefined") return;

  // Clear localStorage
  const authKeys = [
    "idToken",
    "firebaseToken",
    "userRole",
    "userData",
    "userPermissions",
    "authState",
    "bypass-token",
    "temp-token",
    "refresh-token",
  ];

  authKeys.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });

  // Clear Firebase auth state
  try {
    const { getAuth, signOut } = require("firebase/auth");
    const auth = getAuth();
    if (auth.currentUser) {
      signOut(auth).catch(() => {
        // Ignore signOut errors
      });
    }
  } catch (e) {
    // Firebase not available
  }
};

/**
 * Show user-friendly error notification
 */
const showAuthErrorNotification = (error) => {
  if (typeof window === "undefined") return;

  let message = "Your session has expired. Please sign in again.";

  if (error.message?.includes("No authenticated user")) {
    message = "You are not signed in. Redirecting to sign in...";
  } else if (error.code === "auth/user-disabled") {
    message = "Your account has been disabled. Please contact support.";
  } else if (
    error.message?.includes("network") ||
    error.message?.includes("fetch")
  ) {
    message = "Network error. Please check your connection and try again.";
  }

  // Try to use a notification system if available
  // Otherwise, use browser alert as fallback
  if (window.showNotification) {
    window.showNotification(message, "error");
  } else if (window.toast) {
    window.toast.error(message);
  } else {
    // Create a temporary notification element
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #dc3545;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      max-width: 400px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Remove after 5 seconds
    setTimeout(() => {
      notification.style.opacity = "0";
      notification.style.transition = "opacity 0.3s";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 5000);
  }
};

/**
 * Check if user is online
 */
export const isOnline = () => {
  if (typeof window === "undefined") return true;
  return navigator.onLine;
};

/**
 * Wait for network to come back online
 */
export const waitForOnline = (timeout = 30000) => {
  return new Promise((resolve, reject) => {
    if (isOnline()) {
      resolve(true);
      return;
    }

    const timeoutId = setTimeout(() => {
      window.removeEventListener("online", onlineHandler);
      reject(new Error("Network timeout: Unable to connect"));
    }, timeout);

    const onlineHandler = () => {
      clearTimeout(timeoutId);
      window.removeEventListener("online", onlineHandler);
      resolve(true);
    };

    window.addEventListener("online", onlineHandler);
  });
};

/**
 * Retry a function with exponential backoff
 */
export const retryWithBackoff = async (
  fn,
  options = { maxRetries: 3, initialDelay: 1000 }
) => {
  const { maxRetries = 3, initialDelay = 1000 } = options;
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on auth errors
      if (
        error.message?.includes("No authenticated user") ||
        error.code === "auth/id-token-expired" ||
        error.code === "auth/user-disabled"
      ) {
        throw error;
      }

      // Calculate delay for exponential backoff
      const delay = initialDelay * Math.pow(2, attempt);

      if (attempt < maxRetries - 1) {
        // Wait for network if offline
        if (!isOnline()) {
          await waitForOnline();
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
};
