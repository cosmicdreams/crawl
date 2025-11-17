/**
 * URL utilities for the site crawler
 */

/**
 * Checks if a URL is internal to the base URL
 * @param {string} url - URL to check
 * @param {string} baseUrl - Base URL of the site
 * @returns {boolean} - True if URL is internal
 */
function isInternalUrl(url, baseUrl) {
  try {
    const urlObj = new URL(url);
    const baseUrlObj = new URL(baseUrl);
    return urlObj.hostname === baseUrlObj.hostname;
  } catch (e) {
    return false;
  }
}

/**
 * Checks if a URL points to a file (has a file extension)
 * @param {string} url - URL to check
 * @returns {boolean} - True if URL appears to be a file
 */
function isFileUrl(url) {
  try {
    // Extract the pathname from the URL
    const pathname = new URL(url).pathname;

    // Common file extensions to exclude
    const fileExtensions = [
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      '.zip', '.rar', '.tar', '.gz', '.7z',
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp',
      '.mp3', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.wav',
      '.txt', '.csv', '.xml', '.json', '.rtf'
    ];

    // Check if the URL ends with any of the file extensions
    const hasFileExtension = fileExtensions.some(ext => pathname.toLowerCase().endsWith(ext));

    // Also check for paths that contain /files/ or /sites/default/files/ which are common in Drupal
    const isDrupalFile = pathname.includes('/sites/default/files/') ||
                         pathname.includes('/files/') ||
                         pathname.match(/\/download\/\w+\/\w+/);

    return hasFileExtension || isDrupalFile;
  } catch (e) {
    return false;
  }
}

/**
 * Normalizes a URL by removing fragments and query parameters
 * @param {string} url - URL to normalize
 * @returns {string} - Normalized URL
 */
function normalizeUrl(url) {
  try {
    const urlObj = new URL(url);
    urlObj.hash = '';
    // Optionally, remove query parameters to urlObj.search = '';
    return urlObj.toString();
  } catch (e) {
    return url;
  }
}

/**
 * Gets the depth of a URL path (number of segments)
 * @param {string} url - URL to check
 * @returns {number} - Depth of the path
 */
function getUrlDepth(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.split('/').filter(segment => segment.length > 0).length;
  } catch (e) {
    return 0;
  }
}

export {
  isInternalUrl,
  isFileUrl,
  normalizeUrl,
  getUrlDepth
};
