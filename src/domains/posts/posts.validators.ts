import z from "zod";
import { MulterFileSchema } from "../media/media.validators";
import * as CommentValidators from "./comments/comments.validators";
import * as ProfileValidators from "../profiles/profiles.validators";
import { Prisma } from "../../generated/prisma/client";
import {
  PostSlideLazySchema,
  PostSlideResponseSchema,
  PostSlideSelect,
} from "./slides/slides.validators";

const PostBasicSchema = z.object({
  description: z.string().nullable(),
  createdAt: z.coerce.date(),
  publicId: z.uuidv7(),
  author: z.lazy(() => ProfileValidators.ProfileLazyResponseSchema),
  private: z.boolean(),
  views: z.number().nonnegative(),
});

// With relations
export const PostResponseSchema = PostBasicSchema.extend({
  slides: PostSlideResponseSchema.array(),
  comments: z.lazy(() => CommentValidators.CommentResponseSchema.array()),
  likes: z.number(),
});
export type PostRes = z.infer<typeof PostResponseSchema>;

// Lazy
export const PostLazyResponseSchema = PostBasicSchema.extend({
  slides: PostSlideLazySchema.array(),
  stats: z.object({
    comments: z.number().nonnegative(),
    likes: z.number().nonnegative(),
  }),
});
export type PostLazyRes = z.infer<typeof PostLazyResponseSchema>;

// Post Create
export const PostCreateRequestSchema = z.object({
  description: z.string().optional(),
  files: MulterFileSchema.array().nonempty(),
});
export type PostCreateReq = z.infer<typeof PostCreateRequestSchema>;

// Post Edit
export const PostEditRequestSchema = z.object({
  postPublicId: z.uuidv7(),
  description: z.string().optional(),
  isPrivate: z.boolean().optional(),
});
export type PostEditReq = z.infer<typeof PostEditRequestSchema>;

// Prisma
export const PostLazySelect = {
  createdAt: true,
  publicId: true,
  description: true,
  slides: { select: PostSlideSelect },
  private: true,
  views: true,
  _count: {
    select: {
      comments: true,
      likes: true,
    },
  },
} satisfies Prisma.PostSelect;

export const PostSelect = {
  createdAt: true,
  get author() {
    return { select: ProfileValidators.ProfileLazySelect };
  },
  publicId: true,
  description: true,
  slides: { select: PostSlideSelect },
  private: true,
  views: true,
  get comments() {
    return { select: CommentValidators.CommentLazySelect };
  },
  _count: { select: { likes: true } },
} satisfies Prisma.PostSelect;
