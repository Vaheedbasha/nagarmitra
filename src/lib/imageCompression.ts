/**
 * High-performance client-side image compression.
 * Converts multi-megabyte raw camera captures (12-48MP, 8-25MB)
 * into crisp, optimized Web/Mobile JPEG images (~100-200KB) in ~30-50ms
 * using native browser HTMLCanvasElement.
 */
export async function compressImage(
  file: File | Blob,
  maxDimension = 1280,
  quality = 0.82
): Promise<{ file: File; dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    // If it's not an image (e.g. video/audio), pass through
    if (file.type && !file.type.startsWith("image/")) {
      reject(new Error("File is not an image"));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to decode image"));
      img.onload = () => {
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) {
          reject(new Error("Could not initialize canvas"));
          return;
        }

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Image compression failed"));
              return;
            }
            const originalName = (file as File).name || "live-photo.jpg";
            const baseName = originalName.replace(/\.[^/.]+$/, "");
            const compressedFile = new File([blob], `${baseName}.jpg`, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });

            resolve({ file: compressedFile, dataUrl, width, height });
          },
          "image/jpeg",
          quality
        );
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
