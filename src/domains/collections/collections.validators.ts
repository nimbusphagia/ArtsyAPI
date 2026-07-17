import z from "zod";
import { PostResponseSchema } from "../posts/posts.validators";
import { MediaResponseSchema } from "../media/media.validators";

export const CollectionResponseSchema = z.object({
  publicId: z.uuidv7(),
  name: z.string(),
  description: z.string(),
  active: z.boolean().default(false),
  createdAt: z.coerce.date(),
  posts: PostResponseSchema,
});
export type CollectionRes = z.infer<typeof CollectionResponseSchema>;

// Lazy
export const CollectionLazyResponseSchema = z.object({
  publicId: z.uuidv7(),
  name: z.string(),
  description: z.string(),
  active: z.boolean().default(false),
  createdAt: z.coerce.date(),
  thumbnails: MediaResponseSchema.array(),
});
export type CollectionLazyRes = z.infer<typeof CollectionLazyResponseSchema>;
