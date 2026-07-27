import { Prisma } from "../../generated/prisma/client";
import z from "zod";
import * as ProfileValidators from "../profiles/profiles.validators";
import { PostSlideLazySchema } from "../posts/slides/slides.validators";
import * as ColPostsValidators from "./collectionPosts/collectionPosts.validators";

// Basic schema
const CollectionBasicSchema = z.object({
  publicId: z.uuidv7(),
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
  owner: z.lazy(() => ProfileValidators.ProfileLazyResponseSchema),
  posts: ColPostsValidators.ColPostResponseSchema.array(),
  likes: z.number(),
});
export type CollectionRes = z.infer<typeof CollectionResponseSchema>;

// Create Request
export const CollectionCreateReqSchema = z.object({
  name: z.string().nonempty(),
  description: z.string().optional(),
  isPrivate: z.boolean().optional(),
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

// Edit Request
export const CollectionEditReqSchema = z
  .object({
    publicId: z.uuidv7(),
    name: z.string().trim().min(1, "Name cannot be empty").optional(),
    description: z
      .string()
      .trim()
      .min(1, "Description cannot be empty")
      .optional(),
    isPrivate: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.description !== undefined ||
      data.isPrivate !== undefined,
    {
      message:
        "At least one of name, description, or isPrivate must be provided",
    },
  );
export type CollectionEditReq = z.infer<typeof CollectionEditReqSchema>;

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

// Parse
type CollectionRaw = Prisma.CollectionGetPayload<{
  select: typeof CollectionSelect;
}>;
type CollectionLazyRaw = Prisma.CollectionGetPayload<{
  select: typeof CollectionLazySelect;
}>;

export function parseCollectionLazyRes(
  collection: CollectionLazyRaw,
): CollectionLazyRes {
  return CollectionLazyResponseSchema.parse({
    ...collection,
    slides: collection.posts.flatMap((p) => p.post.slides).slice(0, 10),
    likes: collection._count.likes,
  });
}

export function parseCollectionRes(collection: CollectionRaw): CollectionRes {
  return CollectionResponseSchema.parse({
    ...collection,
    likes: collection._count.likes,
    posts: collection.posts.map((colPost) => ({
      ...colPost,
      post: {
        ...colPost.post,
        stats: colPost.post._count,
      },
    })),
  });
}
