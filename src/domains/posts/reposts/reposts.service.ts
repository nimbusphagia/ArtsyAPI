import {
  NotFoundError,
  UnauthorizedError,
} from "../../../config/errors/errors";
import { prisma } from "../../../config/prisma";
import { createNotification } from "../../notifications/notifications.service";
import {
  ProfileIsNotBlocked,
  ProfileLazySelect,
} from "../../profiles/profiles.validators";
import { PostLazySelect } from "../posts.validators";
import { RepostLazyRes, RepostLazyResponseSchema } from "./reposts.validators";

// Get all reposts by user
export async function getRepostsByUser(
  currentUserId: string,
): Promise<RepostLazyRes[]> {
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");

  const rawReposts = await prisma.repost.findMany({
    where: {
      reposterId: currentUser.profile!.id,
      post: {
        author: ProfileIsNotBlocked(currentUser.profile!.id),
        private: false,
      },
    },
    select: {
      publicId: true,
      post: {
        select: { ...PostLazySelect, author: { select: ProfileLazySelect } },
      },
    },
  });
  return RepostLazyResponseSchema.array().parse(
    rawReposts.map((r) => {
      return {
        ...r,
        post: { ...r.post, stats: r.post._count },
      };
    }),
  );
}

// Create a repost
export async function createRepost(postId: string, currentUserId: string) {
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");
  const currentProfileId = currentUser.profile!.id;

  const post = await prisma.post.findUnique({
    where: {
      publicId: postId,
      private: false,
      author: ProfileIsNotBlocked(currentProfileId),
    },
    select: { id: true, authorId: true },
  });
  if (!post) throw new NotFoundError("Post not found");

  const rawRepost = await prisma.repost.create({
    data: { reposterId: currentProfileId, postId: post.id },
    select: {
      publicId: true,
      post: {
        select: { ...PostLazySelect, author: { select: ProfileLazySelect } },
      },
    },
  });

  await createNotification({
    recipientId: post.authorId,
    actorId: currentProfileId,
    type: "REPOST",
    postId: post.id,
  });

  return RepostLazyResponseSchema.parse({
    ...rawRepost,
    post: {
      ...rawRepost.post,
      stats: rawRepost.post._count,
    },
  });
}

// Remove a repost
export async function deleteRepostById(
  postId: string,
  currentUserId: string,
): Promise<void> {
  const currentUser = await prisma.user.findUnique({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");

  const repost = await prisma.repost.findFirst({
    where: {
      post: { publicId: postId },
      reposterId: currentUser.profile!.id,
    },
  });
  if (!repost) throw new NotFoundError("Repost not found");
  await prisma.repost.delete({
    where: {
      reposterId_postId: {
        reposterId: repost.reposterId,
        postId: repost.postId,
      },
    },
  });
}
