import z from "zod";
import { optionalToNull } from "../../config/utils/validationUtils";
import {
  IMAGE_MAX_BYTES,
  IMAGE_MIMETYPES,
  isImageMimetype,
  VIDEO_MAX_BYTES,
  VIDEO_MIMETYPES,
} from "./media.constants";

// Response
export const MediaResponseSchema = z.object({
  publicId: z.uuidv7(),
  cloudinaryId: z.string(),
  cloudinaryAssetId: z.string(),
  resourceType: z.string(),
  format: z.string(),
  url: z.url(),
  thumbnail: z.url().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  bytes: z.number(),
  duration: z.number().nullable(),
  createdAt: z.coerce.date(),
});

export type MediaRes = z.infer<typeof MediaResponseSchema>;

// Lazy
export const MediaLazyResponseSchema = z.object({
  publicId: z.uuidv7(),
  resourceType: z.string(),
  format: z.string(),
  url: z.url(),
  thumbnail: z.url().nullable(),
  bytes: z.number(),
  duration: z.number().nullable(),
  createdAt: z.coerce.date(),
});

export type MediaLazyRes = z.infer<typeof MediaLazyResponseSchema>;

// Request
export const MediaRequestSchema = z.object({
  cloudinaryId: z.string(),
  cloudinaryAssetId: z.string(),
  resourceType: z.string(),
  format: z.string(),
  url: z.url(),
  thumbnail: optionalToNull(z.url()),
  width: optionalToNull(z.number()),
  height: optionalToNull(z.number()),
  bytes: z.number(),
  duration: optionalToNull(z.number()),
});

export type MediaReq = z.infer<typeof MediaRequestSchema>;

// Prisma
export const MediaSelect = {
  publicId: true,
  cloudinaryId: true,
  cloudinaryAssetId: true,
  resourceType: true,
  format: true,
  url: true,
  thumbnail: true,
  width: true,
  height: true,
  bytes: true,
  duration: true,
  createdAt: true,
};

// Multer
export const MulterFileSchema = z
  .object({
    fieldname: z.string(),
    originalname: z.string(),
    encoding: z.string(),
    mimetype: z.enum([...IMAGE_MIMETYPES, ...VIDEO_MIMETYPES]),
    size: z.number(),
    buffer: z.instanceof(Buffer),
    destination: z.string().optional(),
    filename: z.string().optional(),
    path: z.string().optional(),
  })
  .superRefine((file, ctx) => {
    const isImage = isImageMimetype(file.mimetype);
    const max = isImage ? IMAGE_MAX_BYTES : VIDEO_MAX_BYTES;
    if (file.size > max) {
      ctx.addIssue({
        code: "custom",
        path: ["size"],
        message: `File must be smaller than ${max / (1024 * 1024)}MB for ${
          isImage ? "images" : "videos"
        }`,
      });
    }
  });
export type MulterFile = z.infer<typeof MulterFileSchema>;

// Profile Assets
export const ProfileImageFileSchema = MulterFileSchema.refine(
  (file) => isImageMimetype(file.mimetype),
  { message: "Profile pictures and banners must be an image" },
);
export type ProfileImageFile = z.infer<typeof ProfileImageFileSchema>;
