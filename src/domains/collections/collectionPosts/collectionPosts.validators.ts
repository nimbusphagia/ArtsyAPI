import { Prisma } from "../../../generated/prisma/client";
import z from "zod";
import * as PostValidators from "../../posts/posts.validators";
import * as ProfileValidators from "../../profiles/profiles.validators";
import { PostSlideSelect } from "../../posts/slides/slides.validators";

export const ColPostResponseSchema = z.object({
  publicId: z.uuidv7(),
  position: z.number().nonnegative(),
  post: z.lazy(() => PostValidators.PostLazyResponseSchema),
});

export type ColPost = z.infer<typeof ColPostResponseSchema>;

// Extra lazy
export const ColPostExtraLazySchema = z.object({
  publicId: z.uuidv7(),
  position: z.number().nonnegative(),
  post: z.object({
    publicId: z.uuidv7(),
    createdAt: z.coerce.date(),
    author: z.object({
      publicId: z.uuidv7(),
      nickname: z.string(),
    }),
  }),
});

export type ColPostExtraLazy = z.infer<typeof ColPostExtraLazySchema>;

export const ColPostReqSchema = z.object({
  postId: z.uuidv7(),
  collectionId: z.uuidv7(),
});
export type ColPostReq = z.infer<typeof ColPostReqSchema>;

//Prisma
export const ColPostSelect = {
  publicId: true,
  position: true,
  get post() {
    return {
      select: {
        ...PostValidators.PostLazySelect,
        author: { select: ProfileValidators.ProfileLazySelect },
      },
    };
  },
} satisfies Prisma.CollectionPostSelect;

export const ColPostLazySelect = {
  publicId: true,
  position: true,
  get post() {
    return {
      select: {
        slides: { select: PostSlideSelect },
        author: { select: ProfileValidators.ProfileLazySelect },
      },
    };
  },
} satisfies Prisma.CollectionPostSelect;

export const ColPostExtraLazySelect = {
  publicId: true,
  position: true,
  get post() {
    return {
      select: {
        publicId: true,
        createdAt: true,
        author: { select: { publicId: true, nickname: true } },
      },
    };
  },
} satisfies Prisma.CollectionPostSelect;
