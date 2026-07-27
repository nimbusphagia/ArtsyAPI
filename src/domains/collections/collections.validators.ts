import { Prisma } from "../../generated/prisma/client";
import z from "zod";
import * as ProfileValidators from "../profiles/profiles.validators";
import { PostSlideLazySchema } from "../posts/slides/slides.validators";
import * as ColPostsValidators from "./collectionPosts/collectionPosts.validators";

// Basic schema
const CollectionBasicSchema = z.object({
  publicId: z.uuidv7(),
  owner: z.lazy(() => ProfileValidators.ProfileLazyResponseSchema),
  name: z.string(),
  description: z.string().nullable(),
  private: z.boolean(),
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
  posts: ColPostsValidators.ColPostResponseSchema.array(),
  likes: z.number(),
});
export type CollectionRes = z.infer<typeof CollectionResponseSchema>;

// Create Request
export const CollectionCreateReqSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  private: z.boolean(),
  posts: z
    .array(
      z.object({
        publicId: z.uuidv7(),
        position: z.number(),
      }),
    )
    .nonempty()
    .refine(
      (posts) => {
        const positions = posts.map((p) => p.position).sort((a, b) => a - b);
        return positions.every((pos, i) => pos === i + 1);
      },
      {
        message:
          "Positions must be sequential starting at 1 with no duplicates or gaps",
      },
    ),
});
export type CollectionCreateReq = z.infer<typeof CollectionCreateReqSchema>;

// Prisma
export const CollectionLazySelect = {
  publicId: true,
  name: true,
  description: true,
  createdAt: true,
  get posts() {
    return { select: ColPostsValidators.ColPostLazySelect };
  },
  _count: {
    select: {
      likes: true,
    },
  },
  private: true,
} satisfies Prisma.CollectionSelect;

export const CollectionSelect = {
  ...CollectionLazySelect,
  get owner() {
    return { select: ProfileValidators.ProfileLazySelect };
  },
  get posts() {
    return {
      select: ColPostsValidators.ColPostSelect,
    };
  },
} satisfies Prisma.CollectionSelect;
