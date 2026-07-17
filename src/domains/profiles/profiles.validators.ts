import z from "zod";
import { ProfilePictureSchema } from "./profilePictures/profilePictures.validators";
import { PostLazyResponseSchema } from "../posts/posts.validators";
import { RepostLazyResponseSchema } from "../reposts/reposts.validators";
import { CollectionLazyResponseSchema } from "../collections/collections.validators";
// Lazy
export const ProfileLazyResponseSchema = z.object({
  publicId: z.uuidv7(),
  nickname: z.string().optional(),
  picture: ProfilePictureSchema,
  createdAt: z.coerce.date(),
});
export type ProfileLazyRes = z.infer<typeof ProfileLazyResponseSchema>;

// Profile
export const ProfileResponseSchema = ProfileLazyResponseSchema.extend({
  // Loaded Lazily
  followedBy: ProfileLazyResponseSchema.array(),
  following: ProfileLazyResponseSchema.array(),
  blocking: ProfileLazyResponseSchema.array(),
  blockedBy: ProfileLazyResponseSchema.array(),
  posts: PostLazyResponseSchema.array(),
  reposts: RepostLazyResponseSchema.array(),
  collections: CollectionLazyResponseSchema.array(),
});
export type ProfileRes = z.infer<typeof ProfileResponseSchema>;
