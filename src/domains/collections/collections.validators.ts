import z from "zod";
import { PostLazySelect, PostResponseSchema } from "../posts/posts.validators";
import { MediaSelect } from "../media/media.validators";
import { LikeResponseSchema } from "./likes/likes.validators";
import * as ProfileValidators from "../profiles/profiles.validators";
import { PostSlideLazySchema } from "../posts/slides/slides.validators";

const CollectionBasicSchema = z.object({
  publicId: z.uuidv7(),
  owner: z.lazy(() => ProfileValidators.ProfileLazyResponseSchema),
  name: z.string(),
  description: z.string(),
  active: z.boolean().default(false),
  createdAt: z.coerce.date(),
});

// Lazy
export const CollectionLazyResponseSchema = CollectionBasicSchema.extend({
  slides: PostSlideLazySchema.array(),
  likes: z.number(),
});
export type CollectionLazyRes = z.infer<typeof CollectionLazyResponseSchema>;

// With relations
export const CollectionResponseSchema = CollectionBasicSchema.extend({
  posts: PostResponseSchema,
  likes: LikeResponseSchema.array(),
});
export type CollectionRes = z.infer<typeof CollectionResponseSchema>;

// Prisma
export const CollectionLazySelect = {
  publicId: true,
  name: true,
  createdAt: true,
  posts: { select: PostLazySelect },
  _count: {
    select: {
      likes: true,
    },
  },
  private: true,
};
