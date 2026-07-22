import z from "zod";
import { optionalToNull } from "../../config/utils/validationUtils";

// Asset types
export const AssetTypes = [
  "DEFAULT_PROFILE_PICTURE",
  "DEFAULT_PROFILE_BANNER",
  "PROFILE_PICTURE",
  "PROFILE_BANNER",
] as const;
export const AssetTypeSchema = z.enum(AssetTypes);
export type AssetType = z.infer<typeof AssetTypeSchema>;

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
  postId: z.number().nullable(),
});

export type MediaRes = z.infer<typeof MediaResponseSchema>;

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
  postId: true,
};
