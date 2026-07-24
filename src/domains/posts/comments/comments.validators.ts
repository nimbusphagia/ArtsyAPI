import z from "zod";
import * as ProfileValidators from "../../profiles/profiles.validators";

export const CommentResponseSchema = z.object({
  publicId: z.uuidv7(),
  get author() {
    return ProfileValidators.ProfileLazyResponseSchema;
  },
  text: z.string(),
  createdAt: z.coerce.date(),
  likes: z.number(),
});
export type CommentRes = z.infer<typeof CommentResponseSchema>;

export const CommentRequestSchema = z.object({
  postId: z.uuidv7(),
  text: z.string().nonempty(),
});
export type CommentReq = z.infer<typeof CommentRequestSchema>;

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
