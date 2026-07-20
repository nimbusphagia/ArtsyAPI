import { prisma } from "../../config/prisma";
import { ProfilePictureSelect } from "./profilePictures/profilePictures.validators";
import {
  ProfileLazyRes,
  ProfileListQuery,
  ProfileOmit,
} from "./profiles.validators";

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
              include: { picture: { select: ProfilePictureSelect } },
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
              include: { picture: { select: ProfilePictureSelect } },
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
    include: { picture: { select: ProfilePictureSelect } },
    omit: ProfileOmit,
    orderBy: { createdAt: query.createdAt },
    take: 20,
  });
}
