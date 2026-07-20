import z from "zod";

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
