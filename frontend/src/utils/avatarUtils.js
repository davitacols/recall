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
  
  // If it's a relative path, prepend the API base URL
  const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  
  // Remove leading slash if present to avoid double slashes
  const cleanPath = avatarPath.startsWith('/') ? avatarPath.slice(1) : avatarPath;
  
  return `${baseURL}/${cleanPath}`;
};
