/**
 * Converts a relative avatar URL to an absolute URL
 * @param {string} avatarPath - The avatar path from the API (could be relative or absolute)
 * @returns {string|null} - The absolute URL or null if no avatar
 */
export const getAvatarUrl = (avatarPath) => {
  if (!avatarPath) return null;
  
  // If it's already an absolute URL (starts with http:// or https://), return as is
  if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
    return avatarPath;
  }
  
  // If it's a data URL (base64), return as is
  if (avatarPath.startsWith('data:')) {
    return avatarPath;
  }
  
  // If it's a relative path, prepend the API base URL
  const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  
  // Remove trailing slash from baseURL if present
  const cleanBaseURL = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
  
  // Ensure path starts with slash
  const cleanPath = avatarPath.startsWith('/') ? avatarPath : `/${avatarPath}`;
  
  const fullUrl = `${cleanBaseURL}${cleanPath}`;
  
  // Debug log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Avatar] Original:', avatarPath, '→ Full URL:', fullUrl);
  }
  
  return fullUrl;
};
