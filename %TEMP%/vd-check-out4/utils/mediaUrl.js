export const resolveMediaUrl = (item) => {
  if (!item)
    return "";
  if (typeof item === "string")
    return item;
  if (item instanceof File || item instanceof Blob) {
    try {
      return URL.createObjectURL(item);
    } catch {
      return "";
    }
  }
  return item.url || item.signedUrl || item.s3Url || "";
};
