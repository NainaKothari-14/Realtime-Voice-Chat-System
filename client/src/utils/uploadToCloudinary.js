// ✅ Cloudinary Upload Utility
// Usage: import { uploadToCloudinary } from "../utils/uploadToCloudinary";

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024, // 10MB
  video: 100 * 1024 * 1024, // 100MB
  audio: 50 * 1024 * 1024, // 50MB
  document: 25 * 1024 * 1024, // 25MB
  default: 10 * 1024 * 1024, // 10MB
};

// Allowed MIME types
const ALLOWED_TYPES = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  video: ["video/mp4", "video/webm", "video/quicktime"],
  audio: ["audio/mpeg", "audio/wav", "audio/ogg"],
  document: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
};

/**
 * Determine file type category
 */
const getFileCategory = (mimeType) => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
};

/**
 * Validate file before upload
 */
const validateFile = (file) => {
  if (!file) {
    throw new Error("No file selected");
  }

  const category = getFileCategory(file.type);
  const limit = FILE_SIZE_LIMITS[category] || FILE_SIZE_LIMITS.default;

  // Check file size
  if (file.size > limit) {
    const limitMB = Math.floor(limit / 1024 / 1024);
    throw new Error(`File too large. Max ${limitMB}MB for ${category}s`);
  }

  // Optional: Check MIME type whitelist
  const allowed = ALLOWED_TYPES[category] || [];
  if (allowed.length > 0 && !allowed.includes(file.type)) {
    throw new Error(`File type not supported: ${file.type}`);
  }

  return category;
};

/**
 * Upload file to Cloudinary
 * @param {File} file - File object from input
 * @param {Function} onProgress - Callback for upload progress (0-100)
 * @returns {Promise} { secure_url, public_id, original_filename, resource_type }
 */
export const uploadToCloudinary = async (file, onProgress) => {
  try {
    // Validate environment variables
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      throw new Error(
        "Cloudinary credentials not configured. Set REACT_APP_CLOUDINARY_CLOUD_NAME and REACT_APP_CLOUDINARY_UPLOAD_PRESET"
      );
    }

    // Validate file
    const category = validateFile(file);

    // Prepare FormData
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("cloud_name", CLOUDINARY_CLOUD_NAME);
    
    // Optional: Add tags for organization
    formData.append("tags", `chat,${category}`);

    // Optional: Set folder structure
    formData.append("folder", `chat-files/${category}`);

    // Upload with progress tracking
    const xhr = new XMLHttpRequest();

    const uploadPromise = new Promise((resolve, reject) => {
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          if (onProgress) onProgress(percentComplete);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve({
              secure_url: response.secure_url,
              public_id: response.public_id,
              original_filename: response.original_filename,
              resource_type: response.resource_type,
              size: response.bytes,
              width: response.width,
              height: response.height,
              category,
            });
          } catch (err) {
            reject(new Error("Failed to parse Cloudinary response"));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Upload error. Check your internet connection"));
      });

      xhr.addEventListener("abort", () => {
        reject(new Error("Upload cancelled"));
      });

      const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;
      xhr.open("POST", url);
      xhr.send(formData);
    });

    return uploadPromise;
  } catch (err) {
    console.error("❌ Upload validation error:", err.message);
    throw err;
  }
};

/**
 * Delete file from Cloudinary (requires authentication)
 * Only use if you have a backend endpoint handling this
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    const response = await fetch("/api/cloudinary/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId }),
    });

    if (!response.ok) throw new Error("Delete failed");
    return await response.json();
  } catch (err) {
    console.error("❌ Delete error:", err);
    throw err;
  }
};