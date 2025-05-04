/**
 * Format a percentage value for display
 */
// export function formatPercentage(value) {
//   return `${Math.round(value)}%`;
// }
export function formatPercentage(value) {
  // Handle undefined, null, or NaN values
  if (value === undefined || value === null || isNaN(value)) {
    return '0%';
  }
  return `${Math.round(parseFloat(value))}%`;
}

/**
 * Format a date string for display
 */
export function formatDate(dateStr) {
  if (!dateStr) return 'N/A';

  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch (e) {
    console.error('Error formatting date:', e);
    return dateStr;
  }
}

/**
 * Extract filename from a file path
 */
export function getFileName(filePath) {
  if (!filePath) return '';
  const parts = filePath.split('/');
  return parts[parts.length - 1];
}

/**
 * Get app name from a file path
 */
export function getAppName(filePath) {
  if (!filePath) return '';
  const parts = filePath.split('/');
  const appsIndex = parts.indexOf('apps');
  if (appsIndex !== -1 && parts.length > appsIndex + 1) {
    return parts[appsIndex + 1];
  }
  return '';
}

/**
 * Truncate a string if it's too long
 */
export function truncate(str, maxLength = 50) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}

/**
 * Generate a unique key for React elements
 */
export function generateKey(prefix) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 11)}`;
}
