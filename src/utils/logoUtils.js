import config from "@/config";

/**
 * Helper function to normalize a single logo URL string
 * @param {string} logoPath - Logo path or URL string
 * @returns {string|null} - Normalized logo URL or null
 */
const normalizeSingleLogoUrl = (logoPath) => {
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
  const normalizedPath = cleanPath.replace(/^\/+/, ''); // Remove leading slashes
  return `${config.pythonApi.baseURL}/${normalizedPath}`;
};

/**
 * Get logos array from brandkit (handles both old and new format)
 * @param {Object} brandkit - Brandkit object
 * @returns {string[]} - Array of logo URLs
 */
export const getLogos = (brandkit) => {
  if (!brandkit) return [];

  // Prefer logo_urls array (new format)
  if (brandkit.logo_urls && Array.isArray(brandkit.logo_urls) && brandkit.logo_urls.length > 0) {
    return brandkit.logo_urls.map(url => normalizeSingleLogoUrl(url)).filter(Boolean);
  }

  // Fallback to logo_paths array
  if (brandkit.logo_paths && Array.isArray(brandkit.logo_paths) && brandkit.logo_paths.length > 0) {
    return brandkit.logo_paths.map(path => normalizeSingleLogoUrl(path)).filter(Boolean);
  }

  // Fallback to legacy logo_url (single)
  if (brandkit.logo_url) {
    const normalized = normalizeSingleLogoUrl(brandkit.logo_url);
    return normalized ? [normalized] : [];
  }

  // Fallback to legacy logo_path (single)
  if (brandkit.logo_path) {
    const normalized = normalizeSingleLogoUrl(brandkit.logo_path);
    return normalized ? [normalized] : [];
  }

  return [];
};

/**
 * Normalize logo URL for display (backward compatibility)
 * Prefers logo_url if available, otherwise constructs from logo_path
 * Returns the first logo from arrays if available
 * @param {Object} brandkit - Brandkit object with logo_url or logo_path
 * @returns {string|null} - Normalized logo URL or null
 */
export const normalizeLogoUrl = (brandkit) => {
  if (!brandkit) return null;

  const logos = getLogos(brandkit);
  return logos.length > 0 ? logos[0] : null;
};

/**
 * Normalize logo URL from a string (for form data)
 * @param {string|null} logoPath - Logo path or URL string
 * @returns {string|null} - Normalized logo URL or null
 */
export const normalizeLogoUrlFromString = (logoPath) => {
  return normalizeSingleLogoUrl(logoPath);
};

/**
 * Normalize multiple logo URLs from an array
 * @param {string[]|null} logoPaths - Array of logo paths or URLs
 * @returns {string[]} - Array of normalized logo URLs
 */
export const normalizeLogoUrlsFromArray = (logoPaths) => {
  if (!logoPaths || !Array.isArray(logoPaths)) return [];
  return logoPaths.map(path => normalizeSingleLogoUrl(path)).filter(Boolean);
};

