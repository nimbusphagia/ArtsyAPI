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
