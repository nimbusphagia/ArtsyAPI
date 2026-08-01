import {
  NotFoundError,
  UnauthorizedError,
} from "../../../config/errors/errors";
import { prisma } from "../../../config/prisma";
import { ProfileLazyRes, ProfileLazySelect } from "../profiles.validators";

// Follow
export async function followProfileById(
  profileId: string,
  currentUserId: string,
) {
  if (profileId === currentUserId) {
    throw new UnauthorizedError("Cannot follow yourself");
  }
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");

  const currentProfileId = currentUser.profile!.id;

  const targetProfile = await prisma.profile.findUnique({
    where: {
      publicId: profileId,
      blocking: { none: { blockedId: currentProfileId } },
      blockedBy: { none: { blockerId: currentProfileId } },
      user: {
        active: true,
      },
    },
    select: { id: true },
  });

  if (!targetProfile) throw new NotFoundError("Profile not found");
  await prisma.follow.create({
    data: {
      followerId: currentProfileId,
      followingId: targetProfile.id,
    },
  });
}

// Unfollow
export async function unfollowProfileById(
  profileId: string,
  currentUserId: string,
) {
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");

  const currentProfileId = currentUser.profile!.id;

  const targetProfile = await prisma.profile.findUnique({
    where: {
      publicId: profileId,
      user: {
        active: true,
      },
    },
    select: { id: true },
  });

  if (!targetProfile) throw new NotFoundError("Profile not found");
  await prisma.follow.delete({
    where: {
      followerId_followingId: {
        followerId: currentProfileId,
        followingId: targetProfile.id,
      },
    },
  });
}

// Get followers by profile
export async function getFollowersByProfile(
  profileId: string,
  currentUserId: string,
): Promise<ProfileLazyRes[]> {
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: {
      profile: {
        select: { id: true },
      },
    },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");

  const currentProfileId = currentUser.profile!.id;

  const targetProfile = await prisma.profile.findUnique({
    where: {
      publicId: profileId,
      blocking: { none: { blockedId: currentProfileId } },
      blockedBy: { none: { blockerId: currentProfileId } },
      user: {
        active: true,
      },
    },
    select: {
      followers: { select: { follower: { select: ProfileLazySelect } } },
    },
  });

  if (!targetProfile) throw new NotFoundError("Profile not found");

  return targetProfile.followers.map((row) => row.follower) ?? [];
}

// Get profiles you follow
export async function getFollowedProfilesById(
  profileId: string,
  currentUserId: string,
): Promise<ProfileLazyRes[]> {
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: {
      profile: {
        select: { id: true },
      },
    },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");

  const currentProfileId = currentUser.profile!.id;

  const targetProfile = await prisma.profile.findUnique({
    where: {
      publicId: profileId,
      blocking: { none: { blockedId: currentProfileId } },
      blockedBy: { none: { blockerId: currentProfileId } },
      user: {
        active: true,
      },
    },
    select: {
      following: { select: { following: { select: ProfileLazySelect } } },
    },
  });

  if (!targetProfile) throw new NotFoundError("Profile not found");

  return targetProfile.following.map((row) => row.following) ?? [];
}

// Block
export async function blockProfileById(
  profileId: string,
  currentUserId: string,
) {
  if (profileId === currentUserId) {
    throw new UnauthorizedError("Cannot block yourself");
  }
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");

  const currentProfileId = currentUser.profile!.id;

  const targetProfile = await prisma.profile.findUnique({
    where: {
      publicId: profileId,
      blockedBy: { none: { blockerId: currentProfileId } },
      user: {
        active: true,
      },
    },
    select: { id: true },
  });

  if (!targetProfile) throw new NotFoundError("Profile not found");
  await prisma.block.create({
    data: {
      blockerId: currentProfileId,
      blockedId: targetProfile.id,
    },
  });
}

// Unblock
export async function unblockProfileById(
  profileId: string,
  currentUserId: string,
) {
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");

  const currentProfileId = currentUser.profile!.id;

  const targetProfile = await prisma.profile.findUnique({
    where: {
      publicId: profileId,
      user: {
        active: true,
      },
      blockedBy: {
        some: {
          blockerId: currentProfileId,
        },
      },
    },
    select: { id: true },
  });

  if (!targetProfile) throw new NotFoundError("Profile not found");
  await prisma.block.delete({
    where: {
      blockerId_blockedId: {
        blockerId: currentProfileId,
        blockedId: targetProfile.id,
      },
    },
  });
}

// List blocked
export async function getBlockedByProfile(
  currentUserId: string,
): Promise<ProfileLazyRes[]> {
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: {
      profile: {
        select: {
          id: true,
          blocking: {
            select: {
              blocked: { select: ProfileLazySelect },
            },
          },
        },
      },
    },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");

  return currentUser.profile?.blocking.map((row) => row.blocked) ?? [];
}
