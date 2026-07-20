import z from "zod";
import { ProfilePictureResSchema } from "./profilePictures/profilePictures.validators";
import * as PostValidators from "../posts/posts.validators";
import { RepostLazyResponseSchema } from "../posts/reposts/reposts.validators";
import { CollectionLazyResponseSchema } from "../collections/collections.validators";
import {
  BlockResSchema,
  FollowResSchema,
} from "./relations/relations.validators";

// Profile List Query
export const ProfileQuerySchema = z.object({
  nickname: z.string().optional(),
  createdAt: z.enum(["asc", "desc"]).default("desc"),
  follow: z.enum(["followers", "following", "any"]).default("any"),
});

export type ProfileListQuery = z.infer<typeof ProfileQuerySchema>;

// Lazy
export const ProfileLazyResponseSchema = z.object({
  publicId: z.uuidv7(),
  nickname: z.string().optional(),
  picture: ProfilePictureResSchema,
  createdAt: z.coerce.date(),
});

export type ProfileLazyRes = z.infer<typeof ProfileLazyResponseSchema>;

// With relations(loaded lazily)
export const ProfileResponseSchema = ProfileLazyResponseSchema.extend({
  followers: FollowResSchema.array(),
  following: FollowResSchema.array(),
  blocking: BlockResSchema.array(),
  blockedBy: BlockResSchema.array(),
  posts: z.lazy(() => PostValidators.PostLazyResponseSchema.array()),
  reposts: RepostLazyResponseSchema.array(),
  collections: CollectionLazyResponseSchema.array(),
});
export type ProfileRes = z.infer<typeof ProfileResponseSchema>;

// Prisma
export const ProfileOmit = {
  id: true,
  userId: true,
  pictureId: true,
};
