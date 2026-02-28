export type AllowedFileType = "image" | "video" | "file";

interface ValidationResult {
  valid: boolean;
  error?: string;
  type?: AllowedFileType;
}

// ── SIZE LIMITS ──
const LIMITS = {
  image: 15 * 1024 * 1024, // 15MB
  video: 20 * 1024 * 1024, // 20MB
  file: 15 * 1024 * 1024,  // 15MB
};

// ── ALLOWED MIME TYPES ──
const IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

const VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "video/x-msvideo", // .avi
];

const FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "text/plain",
  "text/csv",
];

// ── DETECT FILE TYPE ──
export function detectFileType(file: File): AllowedFileType | null {
  if (IMAGE_TYPES.includes(file.type)) return "image";
  if (VIDEO_TYPES.includes(file.type)) return "video";
  if (FILE_TYPES.includes(file.type)) return "file";
  return null;
}

// ── FORMAT FILE SIZE ──
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── VALIDATE FILE ──
export function validateFile(file: File): ValidationResult {
  const type = detectFileType(file);

  if (!type) {
    return {
      valid: false,
      error: `File type not supported. Allowed: Images, Videos, PDF, Word, Excel, PowerPoint, ZIP, TXT`,
    };
  }

  const limit = LIMITS[type];
  if (file.size > limit) {
    const limitMB = limit / (1024 * 1024);
    return {
      valid: false,
      error: `${type === "video" ? "Video" : type === "image" ? "Image" : "File"} size must be under ${limitMB}MB. Your file is ${formatFileSize(file.size)}.`,
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: "File is empty.",
    };
  }

  return { valid: true, type };
}