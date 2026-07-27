import { Prisma } from "../../generated/prisma/client";
import z from "zod";
import { LikeResponseSchema } from "./likes/likes.validators";
import * as ProfileValidators from "../profiles/profiles.validators";
import { PostSlideLazySchema } from "../posts/slides/slides.validators";
import * as ColPostsValidators from "./collectionPosts/collectionPosts.validators";

// Basic schema
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

// Fully loaded
export const CollectionResponseSchema = CollectionBasicSchema.extend({
  posts: ColPostsValidators.ColPostResponseSchema,
  likes: LikeResponseSchema.array(),
});
export type CollectionRes = z.infer<typeof CollectionResponseSchema>;

// Prisma
export const CollectionLazySelect = {
  publicId: true,
  name: true,
  createdAt: true,
  get posts() {
    return { select: ColPostsValidators.ColPostSelect };
  },
  _count: {
    select: {
      likes: true,
    },
  },
  private: true,
} satisfies Prisma.CollectionSelect;
