import z from "zod";

export const MediaResponseSchema = z.object({
  publicId: z.uuidv7(),
  cloudinaryId: z.string(),
  assetId: z.string(),
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
