import z from "zod";
import { PostResponseSchema } from "../posts/posts.validators";
import { MediaResponseSchema } from "../media/media.validators";
import { LikeResponseSchema } from "./likes/likes.validators";

const CollectionBasicSchema = z.object({
  publicId: z.uuidv7(),
  name: z.string(),
  description: z.string(),
  active: z.boolean().default(false),
  createdAt: z.coerce.date(),
});

// Lazy
export const CollectionLazyResponseSchema = CollectionBasicSchema.extend({
  thumbnails: MediaResponseSchema.array(),
  likes: z.number(),
});
export type CollectionLazyRes = z.infer<typeof CollectionLazyResponseSchema>;

// With relations
export const CollectionResponseSchema = CollectionBasicSchema.extend({
  posts: PostResponseSchema,
  likes: LikeResponseSchema.array(),
});
export type CollectionRes = z.infer<typeof CollectionResponseSchema>;
