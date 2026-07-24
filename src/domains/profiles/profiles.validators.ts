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
  MulterFileSchema,
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
  pictureFile: MulterFileSchema.optional(),
  bannerFile: MulterFileSchema.optional(),
});

export type ProfileReq = z.infer<typeof ProfileRequestSchema>;

// Prisma
export function ProfileIsNotBlocked(profileId: number) {
  return {
    is: {
      blocking: {
        none: {
          blockedId: profileId,
        },
      },
    },
  };
}

export const ProfileOmit = {
  id: true,
  userId: true,
  pictureId: true,
};
export const ProfileLazySelect = {
  publicId: true,
  nickname: true,
  createdAt: true,
  picture: { select: AssetSelect },
  banner: { select: AssetSelect },
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

// Derive Private Profile Prisma Select
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

// Map PrismaProfile to ProfileRes
type ProfileWithRelations = Prisma.ProfileGetPayload<{
  select: typeof ProfileSelect;
}>;

export function mapProfileToRes(profile: ProfileWithRelations): ProfileRes {
  const parsedPosts = PostValidators.PostLazyResponseSchema.array().parse(
    profile.posts.map((p) => ({
      ...p,
      thumbnails: p.media,
      stats: p._count,
    })),
  );

  const parsedReposts = RepostLazyResponseSchema.array().parse(
    profile.reposts.map((r) => ({
      ...r,
      post: {
        thumbnails: r.post.media,
        stats: r.post._count,
      },
    })),
  );

  const parsedCollections = CollectionLazyResponseSchema.array().parse(
    profile.collections.map((c) => ({
      ...c,
      thumbnails: c.posts.flatMap((p) => p.media).slice(0, 10),
      likes: c._count.likes,
    })),
  );

  return ProfileResponseSchema.parse({
    ...profile,
    followerCount: profile._count.followers,
    followingCount: profile._count.following,
    posts: parsedPosts,
    reposts: parsedReposts,
    collections: parsedCollections,
  });
}
