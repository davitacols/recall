const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const getAvatarUrl = (avatarPath) => {
  if (!avatarPath) return null;

  if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
    return avatarPath;
  }

  if (avatarPath.startsWith('data:')) {
    return avatarPath;
  }

  const cleanBase = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
  const cleanPath = avatarPath.startsWith('/') ? avatarPath : `/${avatarPath}`;

  return `${cleanBase}${cleanPath}`;
};
