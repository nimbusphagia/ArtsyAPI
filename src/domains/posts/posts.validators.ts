import z from "zod";
import {
  MediaResponseSchema,
  MediaSelect,
  MulterFileSchema,
} from "../media/media.validators";
import * as CommentValidators from "./comments/comments.validators";
import * as ProfileValidators from "../profiles/profiles.validators";
import { Prisma } from "../../generated/prisma/client";

const PostBasicSchema = z.object({
  description: z.string().optional(),
  createdAt: z.coerce.date(),
  publicId: z.uuidv7(),
  author: z.lazy(() => ProfileValidators.ProfileLazyResponseSchema),
  private: z.boolean(),
  views: z.number().nonnegative(),
});

// With relations
export const PostResponseSchema = PostBasicSchema.extend({
  media: MediaResponseSchema.array(),
  comments: z.lazy(() => CommentValidators.CommentResponseSchema.array()),
  likes: z.number().nonnegative(),
});
export type PostRes = z.infer<typeof PostResponseSchema>;

// Lazy
export const PostLazyResponseSchema = PostBasicSchema.extend({
  thumbnails: MediaResponseSchema.array(),
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
  media: { select: MediaSelect },
  private: true,
  views: true,
  _count: {
    select: {
      comments: true,
      likes: true,
    },
  },
};
export const PostSelect = {
  createdAt: true,
  get author() {
    return { select: ProfileValidators.ProfileLazySelect };
  },
  publicId: true,
  description: true,
  media: { select: MediaSelect },
  private: true,
  views: true,
  get comments() {
    return { select: CommentValidators.CommentLazySelect };
  },
  _count: { select: { likes: true } },
} satisfies Prisma.PostSelect;
