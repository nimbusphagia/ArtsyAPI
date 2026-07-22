import { ConflictError, NotFoundError } from "../../config/errors/errors";
import { prisma } from "../../config/prisma";
import { ProfilePictureSelect } from "./profilePictures/profilePictures.validators";
import {
  ProfileLazyRes,
  ProfileListQuery,
  ProfileOmit,
  ProfileReq,
} from "./profiles.validators";
import { MediaReq } from "../media/media.validators";

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
                picture: { select: ProfilePictureSelect },
                banner: { select: ProfilePictureSelect },
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
                picture: { select: ProfilePictureSelect },
                banner: { select: ProfilePictureSelect },
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
      picture: { select: ProfilePictureSelect },
      banner: { select: ProfilePictureSelect },
    },
    omit: ProfileOmit,
    orderBy: { createdAt: query.createdAt },
    take: 20,
  });
}

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

  // Create Asset first
  const pictureId = data.media
    ? (await createProfilePicture(data.media)).id
    : (
        await prisma.asset.findFirst({
          where: { type: "DEFAULT_PROFILE_PICTURE" },
          select: { id: true },
        })
      )?.id;

  const banner = await prisma.asset.findFirst({
    where: { type: "DEFAULT_PROFILE_BANNER" },
    select: { id: true },
  });
  if (!pictureId || !banner) throw new NotFoundError("Assets are missing");

  const profile = await prisma.profile.create({
    data: {
      userId: user.id,
      pictureId,
      bannerId: banner.id,
      nickname: data.nickname ?? `${user.firstName} ${user.lastName}`,
    },
    omit: ProfileOmit,
    include: {
      picture: { select: ProfilePictureSelect },
      banner: { select: ProfilePictureSelect },
    },
  });
  return profile;
}

// Create Asset
async function createProfilePicture(media: MediaReq) {
  return prisma.asset.create({
    data: {
      type: "PROFILE_PICTURE" as const,
      media: {
        create: { ...media },
      },
    },
  });
}
