import z from "zod";
import * as ProfileValidators from "../../profiles/profiles.validators";

export const LikeResponseSchema = z.object({
  get owner() {
    return { select: ProfileValidators.ProfileLazySelect };
  },
  createdAt: z.coerce.date(),
});
export type LikeRes = z.infer<typeof LikeResponseSchema>;
