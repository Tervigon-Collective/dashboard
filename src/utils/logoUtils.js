import config from "@/config";

/**
 * Normalize logo URL for display
 * Prefers logo_url if available, otherwise constructs from logo_path
 * @param {Object} brandkit - Brandkit object with logo_url or logo_path
 * @returns {string|null} - Normalized logo URL or null
 */
export const normalizeLogoUrl = (brandkit) => {
  if (!brandkit) return null;

  // Prefer logo_url if available (from backend API)
  if (brandkit.logo_url) {
    const logoUrl = brandkit.logo_url;
    
    // If it's already a full URL, return as is
    if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
      return logoUrl;
    }
    
    // If it starts with /create-content or any route path, remove the route prefix
    // This handles cases where paths were incorrectly resolved relative to routes
    let cleanUrl = logoUrl;
    if (cleanUrl.startsWith('/create-content/')) {
      cleanUrl = cleanUrl.replace('/create-content', '');
    }
    
    // If it's a relative URL, prepend the Python API base URL
    if (cleanUrl.startsWith('/')) {
      return `${config.pythonApi.baseURL}${cleanUrl}`;
    }
    
    // Otherwise, try to construct full URL
    const cleanedPath = cleanUrl.replace(/^\/+/, ''); // Remove leading slashes
    return `${config.pythonApi.baseURL}/${cleanedPath}`;
  }

  // Fallback to logo_path if logo_url not available
  if (brandkit.logo_path) {
    let logoPath = brandkit.logo_path;
    
    // If it's already a full URL (data URL or http), return as is
    if (logoPath.startsWith('http://') || 
        logoPath.startsWith('https://') || 
        logoPath.startsWith('data:')) {
      return logoPath;
    }
    
    // If it starts with /create-content or any route path, remove the route prefix
    // This handles cases where paths were incorrectly resolved relative to routes
    if (logoPath.startsWith('/create-content/')) {
      logoPath = logoPath.replace('/create-content', '');
    }
    
    // If it's a relative path starting with /, construct full URL
    if (logoPath.startsWith('/')) {
      return `${config.pythonApi.baseURL}${logoPath}`;
    }
    
    // If path doesn't start with /, ensure it's treated as a path from root
    const cleanPath = logoPath.replace(/^\/+/, ''); // Remove leading slashes
    return `${config.pythonApi.baseURL}/${cleanPath}`;
  }

  return null;
};

/**
 * Normalize logo URL from a string (for form data)
 * @param {string|null} logoPath - Logo path or URL string
 * @returns {string|null} - Normalized logo URL or null
 */
export const normalizeLogoUrlFromString = (logoPath) => {
  if (!logoPath) return null;

  // If it's already a full URL (data URL or http), return as is
  if (logoPath.startsWith('http://') || 
      logoPath.startsWith('https://') || 
      logoPath.startsWith('data:')) {
    return logoPath;
  }

  // If it starts with /create-content or any route path, remove the route prefix
  // This handles cases where paths were incorrectly resolved relative to routes
  let cleanPath = logoPath;
  if (cleanPath.startsWith('/create-content/')) {
    cleanPath = cleanPath.replace('/create-content', '');
  }

  // If it's a relative path starting with /, construct full URL
  if (cleanPath.startsWith('/')) {
    return `${config.pythonApi.baseURL}${cleanPath}`;
  }

  // If path doesn't start with /, ensure it's treated as a path from root
  // Remove any leading slashes and prepend properly
  const normalizedPath = cleanPath.replace(/^\/+/, ''); // Remove leading slashes
  return `${config.pythonApi.baseURL}/${normalizedPath}`;
};

