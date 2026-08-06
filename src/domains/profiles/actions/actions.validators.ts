import z from "zod";
import * as ProfileValidators from "../profiles.validators";

export const FollowResSchema = z.object({
  profile: z.lazy(() => ProfileValidators.ProfileLazyResponseSchema),
  createdAt: z.coerce.date(),
});

export const BlockResSchema = z.object({
  profile: z.lazy(() => ProfileValidators.ProfileLazyResponseSchema),
  createdAt: z.coerce.date(),
});
