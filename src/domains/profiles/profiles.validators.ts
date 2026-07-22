import z from "zod";
import { Prisma } from "../../generated/prisma/client";
import * as PostValidators from "../posts/posts.validators";
import {
  RepostLazyResponseSchema,
  RepostLazySelect,
} from "../posts/reposts/reposts.validators";
import {
  CollectionLazyResponseSchema,
  CollectionLazySelect,
} from "../collections/collections.validators";
import {
  AssetResSchema,
  AssetSelect,
  multerFileSchema,
} from "../media/media.validators";
import { ItemPublicSchema } from "../../config/utils/validationUtils";

// Lazy
export const ProfileLazyResponseSchema = z.object({
  publicId: z.uuidv7(),
  nickname: z.string().optional(),
  picture: AssetResSchema,
  banner: AssetResSchema,
  createdAt: z.coerce.date(),
});

export type ProfileLazyRes = z.infer<typeof ProfileLazyResponseSchema>;

// With relations(loaded lazily)
export const ProfileResponseSchema = ProfileLazyResponseSchema.extend({
  followerCount: z.number(),
  followingCount: z.number(),
  blocking: ItemPublicSchema.array(),
  blockedBy: ItemPublicSchema.array(),
  posts: z.lazy(() =>
    PostValidators.PostLazyResponseSchema.omit({
      author: true,
      description: true,
    }).array(),
  ),
  reposts: RepostLazyResponseSchema.array(),
  collections: CollectionLazyResponseSchema.omit({ owner: true }).array(),
});
export type ProfileRes = z.infer<typeof ProfileResponseSchema>;

// Profile List Query
export const ProfileQuerySchema = z.object({
  nickname: z.string().optional(),
  createdAt: z.enum(["asc", "desc"]).default("desc"),
  follow: z.enum(["followers", "following", "any"]).default("any"),
});

export type ProfileListQuery = z.infer<typeof ProfileQuerySchema>;

// Profile Create Request
export const ProfileRequestSchema = z.object({
  nickname: z.string().optional(),
  pictureFile: multerFileSchema.optional(),
  bannerFile: multerFileSchema.optional(),
});

export type ProfileReq = z.infer<typeof ProfileRequestSchema>;

// Prisma
export const ProfileOmit = {
  id: true,
  userId: true,
  pictureId: true,
};
export const ProfileSelect = {
  publicId: true,
  nickname: true,
  createdAt: true,
  picture: { select: AssetSelect },
  banner: { select: AssetSelect },
  blocking: { select: { publicId: true } },
  blockedBy: { select: { publicId: true } },
  posts: {
    select: PostValidators.PostLazySelect,
  },
  reposts: { select: RepostLazySelect },
  collections: { select: CollectionLazySelect },
  _count: {
    select: {
      followers: true,
      following: true,
    },
  },
} satisfies Prisma.ProfileSelect;

export const PrivateProfileSelect = buildProfileSelect({
  includeInactive: true,
});
export function buildProfileSelect(opts: { includeInactive?: boolean } = {}) {
  return {
    ...ProfileSelect,
    collections: {
      ...ProfileSelect.collections,
      where: opts.includeInactive ? {} : { private: false },
    },
    posts: {
      ...ProfileSelect.posts,
      where: opts.includeInactive ? {} : { private: false },
    },
  } satisfies Prisma.ProfileSelect;
}
