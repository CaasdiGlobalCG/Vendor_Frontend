/**
 * Resolve a displayable URL for a media item stored on a vendor record.
 * Handles:
 *  - plain URL strings (e.g. product images)
 *  - backend file objects: { url, signedUrl, s3Url } (project photos, service images)
 *  - File/Blob (local upload previews)
 */
export const resolveMediaUrl = (item) => {
  if (!item) return '';

  if (typeof item === 'string') return item;

  if (item instanceof File || item instanceof Blob) {
    try {
      return URL.createObjectURL(item);
    } catch {
      return '';
    }
  }

  return item.url || item.signedUrl || item.s3Url || '';
};
