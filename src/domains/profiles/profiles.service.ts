import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "../../config/errors/errors";

import { prisma } from "../../config/prisma";
import {
  mapProfileToRes,
  PrivateProfileSelect,
  ProfileIsNotBlocked,
  ProfileLazyRes,
  ProfileListQuery,
  ProfileOmit,
  ProfileReq,
  ProfileRes,
  ProfileSelect,
} from "./profiles.validators";
import { AssetSelect } from "../media/media.validators";
import { uploadProfileAsset } from "../media/media.service";

// List profiles with query
export async function listProfiles(
  query: ProfileListQuery,
  currentUserId: string,
): Promise<ProfileLazyRes[]> {
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");

  const nicknameFilter =
    query.nickname !== undefined
      ? { startsWith: query.nickname, mode: "insensitive" as const }
      : undefined;

  if (query.follow === "following") {
    const profile = await prisma.profile.findUnique({
      where: {
        id: currentUser.profile!.id,
        profile: ProfileIsNotBlocked(currentUser.profile!.id),
      },
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
      where: {
        id: currentUser.profile!.id,
        profile: ProfileIsNotBlocked(currentUser.profile!.id),
      },
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
    ...(nicknameFilter && {
      where: {
        nickname: nicknameFilter,
        profile: ProfileIsNotBlocked(currentUser.profile!.id),
      },
    }),
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
  const { pictureFile, bannerFile } = data;
  const [pictureId, bannerId] = await uploadProfileAssets(
    { pictureFile, bannerFile },
    true,
  );
  const profile = await prisma.profile.create({
    data: {
      userId: user.id,
      pictureId: pictureId!,
      bannerId: bannerId!,
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
    },
    select: ProfileSelect,
  });
  if (!profile) throw new NotFoundError("User not found.");

  return mapProfileToRes(profile);
}

// Get My Profile
export async function getCurrentProfile(
  currentUserId: string,
): Promise<ProfileRes> {
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");

  const profile = await prisma.profile.findUnique({
    where: { id: currentUser.profile!.id },
    select: PrivateProfileSelect,
  });
  if (!profile) throw new NotFoundError("Profile not found.");

  return mapProfileToRes(profile);
}
// Edit My Profile
export async function editProfile(
  data: ProfileReq,
  currentUserId: string,
): Promise<ProfileRes> {
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");
  const { nickname, pictureFile, bannerFile } = data;
  const [pictureId, bannerId] = await uploadProfileAssets(
    { pictureFile, bannerFile },
    false,
  );
  const profile = await prisma.profile.update({
    where: { id: currentUser.profile!.id },
    data: {
      ...(pictureId && { pictureId }),
      ...(bannerId && { bannerId }),
      ...(nickname?.trim() && { nickname: nickname.trim() }),
    },
    select: ProfileSelect,
  });

  if (!profile) throw new NotFoundError("Profile not found.");

  return mapProfileToRes(profile);
}

/* Utils */
async function uploadProfileAssets(
  { pictureFile, bannerFile }: ProfileReq,
  strictUpload?: boolean,
) {
  if (!strictUpload) {
    const pictureId = pictureFile
      ? await uploadProfileAsset("PROFILE_PICTURE", pictureFile)
      : null;
    const bannerId = bannerFile
      ? await uploadProfileAsset("PROFILE_BANNER", bannerFile)
      : null;
    return [pictureId, bannerId];
  }
  return Promise.all([
    uploadProfileAsset("PROFILE_PICTURE", pictureFile),
    uploadProfileAsset("PROFILE_BANNER", bannerFile),
  ]);
}
