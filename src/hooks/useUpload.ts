import { uploadToSeaweedFS } from '@/lib/seaweedfs';

const MAX_IMAGE_BYTES = 1 * 1024 * 1024;
const MAX_VIDEO_BYTES = 15 * 1024 * 1024;

export async function uploadMediaFile(file: File, folder: string): Promise<string> {
  const isVideo = file.type.startsWith("video/");
  const maxSize = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  const limitLabel = isVideo ? "15 Mo" : "1 Mo";
  const actualSizeMB = (file.size / (1024 * 1024)).toFixed(1);

  if (file.size > maxSize) {
    throw new Error(
      `${isVideo ? "La video" : "L'image"} depasse la limite de ${limitLabel} (${actualSizeMB} Mo)`
    );
  }

  const start = Date.now();

  console.log("[uploadMediaFile] Envoi direct vers SeaweedFS:", {
    fileName: file.name,
    fileSize: `${(file.size / 1024).toFixed(1)} Ko`,
    fileType: file.type,
    folder,
  });

  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  const publicUrl = await uploadToSeaweedFS(uint8, file.name, file.type, folder);

  const duration = Date.now() - start;
  console.log("[uploadMediaFile] Succes:", { url: publicUrl, duration: `${duration}ms` });

  return publicUrl;
}

export { formatFileSize } from '@/lib/seaweedfs';

export const MEDIA_LIMITS = {
  image: { maxBytes: MAX_IMAGE_BYTES, label: "1 Mo", accept: "image/jpeg,image/png,image/webp,image/gif" },
  video: { maxBytes: MAX_VIDEO_BYTES, label: "15 Mo", accept: "video/mp4,video/webm" },
};