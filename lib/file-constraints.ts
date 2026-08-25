export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/zip",
] as const;
export const ALLOWED_FILE_ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf,.zip";
export const ALLOWED_FILE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf", ".zip"]);

export function isAllowedFile(file: File) {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  return ALLOWED_FILE_TYPES.includes(file.type as (typeof ALLOWED_FILE_TYPES)[number]) && ALLOWED_FILE_EXTENSIONS.has(extension);
}
