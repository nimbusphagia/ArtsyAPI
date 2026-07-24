import z from "zod";
import * as ProfileValidators from "../../profiles/profiles.validators";

export const LikeResponseSchema = z.object({
  get owner() {
    return ProfileValidators.ProfileLazyResponseSchema;
  },
  createdAt: z.coerce.date(),
});
export type LikeRes = z.infer<typeof LikeResponseSchema>;
