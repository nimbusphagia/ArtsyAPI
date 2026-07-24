import z from "zod";
import { LikeResponseSchema } from "../likes/likes.validators";
import * as ProfileValidators from "../../profiles/profiles.validators";

export const CommentResponseSchema = z.object({
  publicId: z.uuidv7(),
  get author() {
    return { select: ProfileValidators.ProfileLazySelect };
  },
  text: z.string(),
  createdAt: z.coerce.date(),
  likes: LikeResponseSchema.array(),
});
export type CommentRes = z.infer<typeof CommentResponseSchema>;

//Prisma
export const CommentLazySelect = {
  publicId: true,
  get author() {
    return { select: ProfileValidators.ProfileLazySelect };
  },
  text: true,
  createdAt: true,
  _count: { select: { likes: true } },
};
