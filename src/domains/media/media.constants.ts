export const IMAGE_MIMETYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const VIDEO_MIMETYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;

export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 95 * 1024 * 1024;

export type ImageMimetype = (typeof IMAGE_MIMETYPES)[number];
export type VideoMimetype = (typeof VIDEO_MIMETYPES)[number];

export function isImageMimetype(mimetype: string): mimetype is ImageMimetype {
  return (IMAGE_MIMETYPES as readonly string[]).includes(mimetype);
}
export function isVideoMimetype(mimetype: string): mimetype is VideoMimetype {
  return (VIDEO_MIMETYPES as readonly string[]).includes(mimetype);
}
