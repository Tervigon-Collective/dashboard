/**
 * Prepare invoice/PO files before GRN upload.
 * - Images: resize and re-encode as JPEG when large (reduces payload size).
 * - PDFs: sent as-is; use multipart upload to avoid base64 overhead.
 */

const MAX_IMAGE_DIMENSION = 2200;
const JPEG_QUALITY = 0.82;
/** Compress images above this size (bytes). */
const IMAGE_COMPRESS_THRESHOLD = 350 * 1024;

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

function canvasToJpegBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Image compression failed"));
        else resolve(blob);
      },
      "image/jpeg",
      quality
    );
  });
}

async function compressImageFile(file) {
  const img = await loadImageFromFile(file);
  let { width, height } = img;
  const maxSide = Math.max(width, height);

  if (maxSide > MAX_IMAGE_DIMENSION) {
    const scale = MAX_IMAGE_DIMENSION / maxSide;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await canvasToJpegBlob(canvas, JPEG_QUALITY);
  const baseName = file.name.replace(/\.[^.]+$/i, "") || "document";
  return new File([blob], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: file.lastModified,
  });
}

/**
 * @param {File} file
 * @returns {Promise<File>}
 */
export async function prepareReceivingDocumentFile(file) {
  if (!file || typeof File === "undefined") return file;

  const type = file.type || "";
  if (type === "application/pdf" || type.includes("pdf")) {
    return file;
  }

  if (!type.startsWith("image/")) {
    return file;
  }

  if (file.size < IMAGE_COMPRESS_THRESHOLD) {
    return file;
  }

  try {
    const compressed = await compressImageFile(file);
    if (compressed.size < file.size) {
      return compressed;
    }
    return file;
  } catch (err) {
    console.warn("Image compression skipped:", err);
    return file;
  }
}

/** Rough JSON+base64 payload size (for diagnostics). */
export function estimateBase64JsonBytes(fileSize) {
  return Math.ceil(fileSize / 3) * 4 + 400;
}
