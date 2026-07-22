import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "../../config/errors/errors";

import { prisma } from "../../config/prisma";
import {
  ProfileLazyRes,
  ProfileListQuery,
  ProfileOmit,
  ProfileReq,
  ProfileRes,
  ProfileResponseSchema,
  ProfileSelect,
} from "./profiles.validators";
import {
  AssetSelect,
  AssetType,
  AssetTypeSchema,
  MulterFile,
} from "../media/media.validators";
import { toMediaData, uploadImage } from "../media/media.service";
import { PostLazyResponseSchema } from "../posts/posts.validators";
import { RepostLazyResponseSchema } from "../posts/reposts/reposts.validators";
import { CollectionLazyResponseSchema } from "../collections/collections.validators";
import { omitUserPassword } from "../auth/auth.validators";

// List profiles with query
export async function listProfiles(
  query: ProfileListQuery,
  currentUserId: string,
): Promise<ProfileLazyRes[]> {
  const nicknameFilter =
    query.nickname !== undefined
      ? { startsWith: query.nickname, mode: "insensitive" as const }
      : undefined;

  if (query.follow === "following") {
    const profile = await prisma.profile.findUnique({
      where: { publicId: currentUserId },
      select: {
        following: {
          ...(nicknameFilter && {
            where: { following: { nickname: nicknameFilter } },
          }),
          orderBy: { createdAt: query.createdAt },
          take: 20,
          select: {
            following: {
              include: {
                picture: { select: AssetSelect },
                banner: { select: AssetSelect },
              },
              omit: ProfileOmit,
            },
          },
        },
      },
    });
    return profile?.following.map((row) => row.following) ?? [];
  }

  if (query.follow === "followers") {
    const profile = await prisma.profile.findUnique({
      where: { publicId: currentUserId },
      select: {
        followers: {
          ...(nicknameFilter && {
            where: { follower: { nickname: nicknameFilter } },
          }),
          orderBy: { createdAt: query.createdAt },
          take: 20,
          select: {
            follower: {
              include: {
                picture: { select: AssetSelect },
                banner: { select: AssetSelect },
              },
              omit: ProfileOmit,
            },
          },
        },
      },
    });
    return profile?.followers.map((row) => row.follower) ?? [];
  }

  return prisma.profile.findMany({
    ...(nicknameFilter && { where: { nickname: nicknameFilter } }),
    include: {
      picture: { select: AssetSelect },
      banner: { select: AssetSelect },
    },
    omit: ProfileOmit,
    orderBy: { createdAt: query.createdAt },
    take: 20,
  });
}

// Create Profile
export async function createProfile(
  data: ProfileReq,
  currentUserId: string,
): Promise<ProfileLazyRes> {
  const user = await prisma.user.findUnique({
    where: { publicId: currentUserId, active: true },
    select: { id: true, profile: true, firstName: true, lastName: true },
  });
  if (!user) throw new NotFoundError();
  if (user.profile) throw new ConflictError();

  const pictureId = await uploadProfileAsset(
    "PROFILE_PICTURE",
    data.pictureFile,
  );
  const bannerId = await uploadProfileAsset("PROFILE_BANNER", data.bannerFile);

  const profile = await prisma.profile.create({
    data: {
      userId: user.id,
      pictureId,
      bannerId,
      nickname: data.nickname ?? `${user.firstName} ${user.lastName}`,
    },
    omit: ProfileOmit,
    include: {
      picture: { select: AssetSelect },
      banner: { select: AssetSelect },
    },
  });
  return profile;
}

// Get Profile by id
export async function getProfileById(
  publicId: string,
  currentUserId: string,
): Promise<ProfileRes> {
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");

  const profile = await prisma.profile.findUnique({
    where: {
      publicId,
      user: { active: true },
      blocking: { none: { blockedId: currentUser.profile!.id } },
      blockedBy: { none: { blockerId: currentUser.profile!.id } },
    },
    select: ProfileSelect,
  });
  if (!profile) throw new NotFoundError("User not found.");

  const parsedPosts = PostLazyResponseSchema.array().parse(
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

  const parsedProfile = ProfileResponseSchema.parse({
    ...profile,
    followerCount: profile._count.followers,
    followingCount: profile._count.following,
    posts: parsedPosts,
    reposts: parsedReposts,
    collections: parsedCollections,
  });
  return parsedProfile;
}

// Create Asset from imageFile
async function uploadProfileAsset(
  assetType: AssetType,
  imageFile?: MulterFile,
): Promise<number> {
  if (!imageFile) {
    const defaultType = AssetTypeSchema.parse("DEFAULT_" + assetType);
    if (!defaultType) throw new Error("Invalid asset type");

    const defaultAsset = await prisma.asset.findFirst({
      where: { type: defaultType },
      select: { id: true },
    });
    if (!defaultAsset) {
      throw new Error("Default profile picture asset not found");
    }
    return defaultAsset.id;
  }

  const uploadedImage = await uploadImage(imageFile.buffer, "artsy");

  const profilePicture = await prisma.asset.create({
    data: {
      type: assetType,
      media: {
        create: toMediaData(uploadedImage),
      },
    },
    select: { id: true },
  });

  return profilePicture.id;
}
